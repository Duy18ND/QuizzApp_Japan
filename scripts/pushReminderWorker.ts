/**
 * Nihongo 問 — Server-Side Web Push Dispatcher & VAPID Key Generator
 *
 * Usage:
 *   1. Generate VAPID keypair (Public key for client/.env, Private key for server env):
 *      node --experimental-strip-types scripts/pushReminderWorker.ts --generate-vapid
 *
 *   2. Run background schedule evaluation & Web Push dispatch once (e.g. via Cron / CI):
 *      node --experimental-strip-types scripts/pushReminderWorker.ts --run-once
 */

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export interface VapidKeyPair {
  publicKey: string;
  privateKey: string;
}

export function generateVapidKeys(): VapidKeyPair {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    publicKey: ecdh.getPublicKey().toString('base64url'),
    privateKey: ecdh.getPrivateKey().toString('base64url'),
  };
}

function createVapidJwt(
  audienceOrigin: string,
  subject: string,
  publicKeyBase64Url: string,
  privateKeyBase64Url: string,
): string {
  const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const payload = Buffer.from(
    JSON.stringify({
      aud: audienceOrigin,
      exp,
      sub: subject,
    }),
  ).toString('base64url');

  const unsignedToken = `${header}.${payload}`;
  const pubRaw = Buffer.from(publicKeyBase64Url, 'base64url');
  const x = pubRaw.subarray(1, 33).toString('base64url');
  const y = pubRaw.subarray(33, 65).toString('base64url');

  const jwkKey = crypto.createPrivateKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      x,
      y,
      d: privateKeyBase64Url,
    },
    format: 'jwk',
  });

  const signature = crypto
    .sign('sha256', Buffer.from(unsignedToken), {
      key: jwkKey,
      dsaEncoding: 'ieee-p1363',
    })
    .toString('base64url');

  return `${unsignedToken}.${signature}`;
}

export async function sendWebPushRequest(params: {
  endpoint: string;
  vapidSubject: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  ttlSeconds?: number;
}): Promise<{ status: number; expired: boolean }> {
  const parsedUrl = new URL(params.endpoint);
  const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
  const jwt = createVapidJwt(
    origin,
    params.vapidSubject,
    params.vapidPublicKey,
    params.vapidPrivateKey,
  );

  const response = await fetch(params.endpoint, {
    method: 'POST',
    headers: {
      TTL: String(params.ttlSeconds ?? 3600),
      Urgency: params.urgency ?? 'high',
      Authorization: `vapid t=${jwt}, k=${params.vapidPublicKey}`,
      'Content-Length': '0',
    },
  });

  const expired = response.status === 404 || response.status === 410;
  return { status: response.status, expired };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--generate-vapid')) {
    const keys = generateVapidKeys();
    console.log('=== GENERATED P-256 VAPID KEYS ===');
    console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}  # Keep secret on server/Edge Function only!`);
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const vapidPublicKey = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || '';
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@nihongo.vn';

  if (!supabaseUrl || !serviceKey) {
    console.log('Missing SUPABASE_URL or key in environment.');
    return;
  }

  const client = createClient(supabaseUrl, serviceKey);
  const { data: subs, error } = await client
    .from('push_subscriptions')
    .select('*')
    .eq('enabled', true);

  if (error) {
    console.error('Failed to query push_subscriptions:', error.message);
    return;
  }

  console.log(`Loaded ${(subs ?? []).length} active push subscription(s).`);

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set; skipping network push dispatch.');
    return;
  }

  for (const sub of subs ?? []) {
    try {
      const res = await sendWebPushRequest({
        endpoint: String(sub.endpoint),
        vapidSubject,
        vapidPublicKey,
        vapidPrivateKey,
      });
      if (res.expired) {
        await client.from('push_subscriptions').delete().eq('id', sub.id);
        console.log(`Removed expired subscription ${sub.id} (HTTP ${res.status}).`);
      }
    } catch (err) {
      console.warn(`Push dispatch error for ${sub.id}:`, err);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  void main();
}
