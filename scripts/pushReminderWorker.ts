/**
 * Nihongo 問 — RFC 8291 (aes128gcm) + RFC 8292 (VAPID ES256) Web Push Engine
 * Supports Apple APNs (web.push.apple.com for iOS/iPadOS 16.4+ Home Screen Web Apps),
 * Google FCM (Android & Desktop Chrome), and Microsoft WNS (Desktop Edge).
 *
 * Usage:
 *   1. Generate VAPID keypair:
 *      node --experimental-strip-types scripts/pushReminderWorker.ts --generate-vapid
 *
 *   2. Run background schedule evaluation & Web Push dispatch once:
 *      node --experimental-strip-types scripts/pushReminderWorker.ts --run-once
 */

import crypto from 'node:crypto';

export interface VapidKeyPair {
  publicKey: string;
  privateKey: string;
}

export interface WebPushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface WebPushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  deliveryKey?: string;
  slotId?: string;
  slotTime?: string;
  snoozeMinutes?: number;
  requireInteraction?: boolean;
}

export function generateVapidKeys(): VapidKeyPair {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    publicKey: ecdh.getPublicKey().toString('base64url'),
    privateKey: ecdh.getPrivateKey().toString('base64url'),
  };
}

function hmacSha256(key: Buffer, data: Buffer): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function hkdfExtract(salt: Buffer, ikm: Buffer): Buffer {
  return hmacSha256(salt.length > 0 ? salt : Buffer.alloc(32, 0), ikm);
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number): Buffer {
  const block = hmacSha256(prk, Buffer.concat([info, Buffer.from([0x01])]));
  return block.subarray(0, length);
}

/**
 * Encrypts a UTF-8 JSON string using RFC 8291 (`aes128gcm` content encoding)
 * required by Apple APNs (`web.push.apple.com`), FCM, and WNS for Web Push payloads.
 */
export function encryptWebPushPayloadAes128Gcm(
  plaintextUtf8: string,
  uaPublicBase64Url: string,
  authSecretBase64Url: string,
): Buffer {
  const uaPublic = Buffer.from(uaPublicBase64Url, 'base64url');
  const authSecret = Buffer.from(authSecretBase64Url, 'base64url');
  if (uaPublic.length !== 65 || uaPublic[0] !== 0x04) {
    throw new Error('Invalid subscriber p256dh public key (expected 65-byte uncompressed P-256 key)');
  }
  if (authSecret.length < 16) {
    throw new Error('Invalid subscriber auth secret (expected 16-byte secret)');
  }

  const asEcdh = crypto.createECDH('prime256v1');
  asEcdh.generateKeys();
  const asPublic = asEcdh.getPublicKey(); // 65 bytes uncompressed
  const ecdhSecret = asEcdh.computeSecret(uaPublic); // 32 bytes

  const salt = crypto.randomBytes(16);

  // RFC 8291 Section 3.3 / 3.4 Key Derivation
  const prkKey = hkdfExtract(authSecret, ecdhSecret);
  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0', 'ascii'),
    uaPublic,
    asPublic,
  ]);
  const ikm = hkdfExpand(prkKey, keyInfo, 32);

  const prk = hkdfExtract(salt, ikm);
  const cekInfo = Buffer.from('Content-Encoding: aes128gcm\0', 'ascii');
  const cek = hkdfExpand(prk, cekInfo, 16);

  const nonceInfo = Buffer.from('Content-Encoding: nonce\0', 'ascii');
  const nonce = hkdfExpand(prk, nonceInfo, 12);

  // Pad plaintext with RFC 8188 final-record delimiter 0x02
  const plaintextBytes = Buffer.from(plaintextUtf8, 'utf8');
  const paddedPlaintext = Buffer.concat([plaintextBytes, Buffer.from([0x02])]);

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const encrypted = Buffer.concat([cipher.update(paddedPlaintext), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16 bytes

  // RFC 8188 86-byte binary header: salt (16B) || rs (4B uint32BE = 4096) || idlen (1B = 65) || asPublic (65B)
  const header = Buffer.alloc(16 + 4 + 1 + asPublic.length);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(asPublic.length, 20);
  asPublic.copy(header, 21);

  return Buffer.concat([header, encrypted, authTag]);
}

/**
 * Decrypts an RFC 8291 (`aes128gcm`) payload (used in automated verification tests
 * to prove byte-for-byte compatibility with iOS/Android/Desktop Web Push receivers).
 */
export function decryptWebPushPayloadAes128Gcm(
  body: Buffer,
  uaPrivateKeyBase64Url: string,
  uaPublicBase64Url: string,
  authSecretBase64Url: string,
): string {
  const salt = body.subarray(0, 16);
  const idlen = body.readUInt8(20);
  const asPublic = body.subarray(21, 21 + idlen);
  const ciphertextAndTag = body.subarray(21 + idlen);
  const ciphertext = ciphertextAndTag.subarray(0, ciphertextAndTag.length - 16);
  const authTag = ciphertextAndTag.subarray(ciphertextAndTag.length - 16);

  const uaPublic = Buffer.from(uaPublicBase64Url, 'base64url');
  const authSecret = Buffer.from(authSecretBase64Url, 'base64url');
  const uaEcdh = crypto.createECDH('prime256v1');
  uaEcdh.setPrivateKey(Buffer.from(uaPrivateKeyBase64Url, 'base64url'));
  const ecdhSecret = uaEcdh.computeSecret(asPublic);

  const prkKey = hkdfExtract(authSecret, ecdhSecret);
  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0', 'ascii'),
    uaPublic,
    asPublic,
  ]);
  const ikm = hkdfExpand(prkKey, keyInfo, 32);
  const prk = hkdfExtract(salt, ikm);
  const cek = hkdfExpand(prk, Buffer.from('Content-Encoding: aes128gcm\0', 'ascii'), 16);
  const nonce = hkdfExpand(prk, Buffer.from('Content-Encoding: nonce\0', 'ascii'), 12);

  const decipher = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
  decipher.setAuthTag(authTag);
  const padded = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  // Strip trailing padding zeros and 0x02 delimiter
  let end = padded.length - 1;
  while (end >= 0 && padded[end] === 0x00) end--;
  if (end < 0 || padded[end] !== 0x02) {
    throw new Error('Malformed RFC 8291 padding delimiter');
  }
  return padded.subarray(0, end).toString('utf8');
}

export function createVapidJwt(
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

export async function sendWebPushNotification(params: {
  subscription: WebPushSubscriptionKeys;
  payload: WebPushNotificationPayload;
  vapidSubject: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
  ttlSeconds?: number;
}): Promise<{ ok: boolean; status: number; expired: boolean; errorText?: string }> {
  const parsedUrl = new URL(params.subscription.endpoint);
  const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
  const jwt = createVapidJwt(
    origin,
    params.vapidSubject,
    params.vapidPublicKey,
    params.vapidPrivateKey,
  );

  const encryptedBody = encryptWebPushPayloadAes128Gcm(
    JSON.stringify(params.payload),
    params.subscription.p256dh,
    params.subscription.auth,
  );

  const response = await fetch(params.subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${params.vapidPublicKey}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': String(encryptedBody.byteLength),
      TTL: String(params.ttlSeconds ?? 86400),
      Urgency: params.urgency ?? 'high',
    },
    body: new Uint8Array(encryptedBody),
  });

  const expired = response.status === 404 || response.status === 410;
  const ok = response.status >= 200 && response.status < 300;
  const errorText = ok ? undefined : await response.text().catch(() => '');
  return { ok, status: response.status, expired, errorText };
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

  const supabaseMod = await import('../client/node_modules/@supabase/supabase-js/dist/index.mjs');
  const client = supabaseMod.createClient(supabaseUrl, serviceKey);
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
      const res = await sendWebPushNotification({
        subscription: {
          endpoint: String(sub.endpoint),
          p256dh: String(sub.p256dh),
          auth: String(sub.auth),
        },
        payload: {
          title: '⏰ Đến giờ học tiếng Nhật (Nihongo 問)',
          body: 'Dành 15 phút ôn Từ vựng, Kanji & Ngữ pháp ngay nhé!',
          url: './#/vocabulary/review',
        },
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
