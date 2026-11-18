// Supabase Edge Function: send-study-reminders
// Full RFC 8291 (aes128gcm) + RFC 8292 (VAPID ES256) Web Push Delivery for iOS/iPadOS 16.4+ APNs
// (https://web.push.apple.com), Android/Desktop Chrome FCM, and Edge WNS.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface ScheduleSlot {
  id: string;
  scheduleType: 'recurring' | 'once';
  time: string;
  label: string;
  daysOfWeek?: number[];
  date?: string;
}

interface TimezoneParts {
  dateKey: string;
  timeKey: string;
  weekday: number;
  totalMinutes: number;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((sum, a) => sum + a.byteLength, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.byteLength;
  }
  return out;
}

async function hmacSha256(keyBytes: Uint8Array, dataBytes: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, dataBytes);
  return new Uint8Array(sig);
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const effectiveSalt = salt.byteLength > 0 ? salt : new Uint8Array(32);
  return hmacSha256(effectiveSalt, ikm);
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const block = await hmacSha256(prk, concatBytes(info, new Uint8Array([0x01])));
  return block.subarray(0, length);
}

async function createVapidJwtWebCrypto(
  audienceOrigin: string,
  subject: string,
  publicKeyBase64Url: string,
  privateKeyBase64Url: string,
): Promise<string> {
  const enc = new TextEncoder();
  const header = toBase64Url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const payload = toBase64Url(
    enc.encode(JSON.stringify({ aud: audienceOrigin, exp, sub: subject })),
  );
  const unsignedToken = `${header}.${payload}`;

  const pubBytes = fromBase64Url(publicKeyBase64Url);
  const x = toBase64Url(pubBytes.subarray(1, 33));
  const y = toBase64Url(pubBytes.subarray(33, 65));

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      x,
      y,
      d: privateKeyBase64Url,
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    enc.encode(unsignedToken),
  );
  return `${unsignedToken}.${toBase64Url(new Uint8Array(signature))}`;
}

async function encryptWebPushAes128GcmWebCrypto(
  plaintextUtf8: string,
  uaPublicBase64Url: string,
  authSecretBase64Url: string,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const uaPublic = fromBase64Url(uaPublicBase64Url);
  const authSecret = fromBase64Url(authSecretBase64Url);

  const asKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey));
  const uaCryptoKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: uaCryptoKey },
      asKeyPair.privateKey,
      256,
    ),
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prkKey = await hkdfExtract(authSecret, ecdhSecret);
  const keyInfo = concatBytes(enc.encode('WebPush: info\0'), uaPublic, asPublicRaw);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);

  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(prk, enc.encode('Content-Encoding: nonce\0'), 12);

  const paddedPlaintext = concatBytes(enc.encode(plaintextUtf8), new Uint8Array([0x02]));
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const encryptedWithTag = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPlaintext),
  );

  const header = new Uint8Array(21 + asPublicRaw.byteLength);
  header.set(salt, 0);
  const view = new DataView(header.buffer);
  view.setUint32(16, 4096, false);
  view.setUint8(20, asPublicRaw.byteLength);
  header.set(asPublicRaw, 21);

  return concatBytes(header, encryptedWithTag);
}

async function dispatchEncryptedWebPush(params: {
  endpoint: string;
  p256dh: string;
  auth: string;
  payload: Record<string, unknown>;
  vapidSubject: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
}): Promise<{ ok: boolean; status: number; expired: boolean; errorText?: string }> {
  const parsedUrl = new URL(params.endpoint);
  const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
  const jwt = await createVapidJwtWebCrypto(
    origin,
    params.vapidSubject,
    params.vapidPublicKey,
    params.vapidPrivateKey,
  );
  const encryptedBody = await encryptWebPushAes128GcmWebCrypto(
    JSON.stringify(params.payload),
    params.p256dh,
    params.auth,
  );

  const response = await fetch(params.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${params.vapidPublicKey}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': String(encryptedBody.byteLength),
      TTL: '86400',
      Urgency: 'high',
    },
    body: encryptedBody,
  });

  const expired = response.status === 404 || response.status === 410;
  const ok = response.status >= 200 && response.status < 300;
  const errorText = ok ? undefined : await response.text().catch(() => '');
  return { ok, status: response.status, expired, errorText };
}

function getNowInTimezone(date = new Date(), timeZone = 'Asia/Ho_Chi_Minh'): TimezoneParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }
  const year = map.year;
  const month = map.month.padStart(2, '0');
  const day = map.day.padStart(2, '0');
  const rawHour = Number(map.hour ?? 0);
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(map.minute ?? 0);
  const weekday = map.weekday in WEEKDAY_MAP ? WEEKDAY_MAP[map.weekday] : date.getUTCDay();
  return {
    dateKey: `${year}-${month}-${day}`,
    timeKey: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    weekday,
    totalMinutes: hour * 60 + minute,
  };
}

function evaluateDueSlotForDevice(
  slots: ScheduleSlot[],
  tzParts: TimezoneParts,
  continuousRepeatMinutes: number,
  completedToday: boolean,
): { deliveryKey: string; title: string; body: string; slotTime: string } | null {
  for (const slot of slots) {
    if (!slot || typeof slot.time !== 'string') continue;

    if (slot.scheduleType === 'once') {
      if (!slot.date || slot.date !== tzParts.dateKey) continue;
    } else {
      const days = Array.isArray(slot.daysOfWeek) ? slot.daysOfWeek : [1, 2, 3, 4, 5, 6, 0];
      if (!days.includes(tzParts.weekday)) continue;
    }

    const [hh, mm] = slot.time.split(':').map(Number);
    const slotMinutes = hh * 60 + mm;
    if (!Number.isFinite(slotMinutes)) continue;

    const diff = tzParts.totalMinutes - slotMinutes;
    if (diff === 0) {
      return {
        deliveryKey: `${tzParts.dateKey}::${slot.id}::${slot.time}::0`,
        title: `⏰ Đến giờ học: ${slot.label} (${slot.time})`,
        body:
          slot.scheduleType === 'once'
            ? `Lịch hẹn 1 lần ngày ${slot.date}: Bấm để bắt đầu ôn tập ngay!`
            : 'Dành 15 phút ôn Từ vựng, Kanji & Ngữ pháp ngay nhé!',
        slotTime: slot.time,
      };
    }

    if (
      slot.scheduleType === 'recurring' &&
      !completedToday &&
      continuousRepeatMinutes > 0 &&
      diff > 0 &&
      diff <= continuousRepeatMinutes * 5 &&
      diff % continuousRepeatMinutes === 0
    ) {
      const repeatAttempt = diff / continuousRepeatMinutes;
      return {
        deliveryKey: `${tzParts.dateKey}::${slot.id}::${slot.time}::repeat-${repeatAttempt}`,
        title: `🔁 Nhắc lần ${repeatAttempt}/5: Chưa hoàn thành bài học (${slot.time})`,
        body: `Khung giờ "${slot.label}" đã qua ${diff} phút. Vào học ngay để giữ chuỗi Streak!`,
        slotTime: slot.time,
      };
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@nihongo.vn';

  // Handle on-demand Test Push Notification (supports delaySeconds so user can lock iPhone screen)
  if (req.method === 'POST') {
    try {
      const body = await req.json().catch(() => null);
      if (body && body.action === 'test_push' && body.subscription) {
        if (!vapidPublicKey || !vapidPrivateKey) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: 'Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY in Edge Function secrets.',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const delaySec = Math.max(0, Math.min(10, Number(body.delaySeconds) || 0));
        if (delaySec > 0) {
          await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
        }

        const pushRes = await dispatchEncryptedWebPush({
          endpoint: String(body.subscription.endpoint),
          p256dh: String(body.subscription.p256dh),
          auth: String(body.subscription.auth),
          payload: {
            title: body.title || '📲 Test Background Web Push — Nihongo 問',
            body:
              body.body ||
              'Thông báo đẩy từ máy chủ Web Push (APNs / FCM / WNS) đã hoạt động trên thiết bị của bạn!',
            url: './#/vocabulary/review',
            deliveryKey: `test-push-${Date.now()}`,
            requireInteraction: true,
          },
          vapidSubject,
          vapidPublicKey,
          vapidPrivateKey,
        });

        return new Response(JSON.stringify(pushRes), {
          status: pushRes.ok ? 200 : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch {
      // Proceed to scheduled cron evaluation below
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: subscriptions, error } = await admin
    .from('push_subscriptions')
    .select('*')
    .eq('enabled', true);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let sentCount = 0;
  let expiredCleaned = 0;
  let expiredSubscriptionsRemoved = 0;

  for (const sub of subscriptions ?? []) {
    const tz = sub.timezone || 'Asia/Ho_Chi_Minh';
    const tzParts = getNowInTimezone(new Date(), tz);
    const snap = (sub.schedule_snapshot ?? {}) as Record<string, unknown>;
    if (snap.enabled === false) continue;

    const rawSlots = Array.isArray(snap.timeSlots) ? (snap.timeSlots as ScheduleSlot[]) : [];
    const activeSlots = rawSlots.filter(
      (s) => !(s.scheduleType === 'once' && s.date && s.date < tzParts.dateKey),
    );
    if (activeSlots.length !== rawSlots.length) {
      expiredCleaned += rawSlots.length - activeSlots.length;
      await admin
        .from('push_subscriptions')
        .update({
          schedule_snapshot: { ...snap, timeSlots: activeSlots },
          updated_at: new Date().toISOString(),
        })
        .eq('id', sub.id);
    }

    const completedDates = Array.isArray(snap.completedDates)
      ? (snap.completedDates as string[])
      : [];
    const completedToday = completedDates.includes(tzParts.dateKey);
    const repeatMins = Number(snap.continuousRepeatMinutes) || 0;

    const due = evaluateDueSlotForDevice(activeSlots, tzParts, repeatMins, completedToday);
    if (!due) continue;

    if (sub.last_notified_key === due.deliveryKey) continue;

    const { error: logErr } = await admin.from('push_delivery_logs').insert({
      subscription_id: sub.id,
      delivery_key: due.deliveryKey,
    });
    if (logErr) continue;

    if (
      String(sub.platform || '') === 'ios-ntfy' ||
      String(sub.p256dh || '') === 'ntfy'
    ) {
      try {
        const endpointUrl = new URL(String(sub.endpoint));
        const segments = endpointUrl.pathname.split('/').filter(Boolean);
        const topic = segments.pop() ?? '';
        const basePath = segments.length > 0 ? `/${segments.join('/')}` : '';
        const rootUrl = `${endpointUrl.protocol}//${endpointUrl.host}${basePath}/`;
        if (topic) {
          await fetch(rootUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topic,
              title: due.title,
              message: due.body,
              priority: 4,
              tags: ['alarm_clock', 'jp'],
              click: 'https://duy18nd.github.io/QuizzApp_Japan/#/vocabulary/review',
            }),
          });
        }
      } catch (err) {
        console.warn(`ntfy delivery failed for subscription ${sub.id}:`, err);
      }
    } else if (vapidPublicKey && vapidPrivateKey && sub.endpoint && sub.p256dh && sub.auth) {
      try {
        const pushRes = await dispatchEncryptedWebPush({
          endpoint: String(sub.endpoint),
          p256dh: String(sub.p256dh),
          auth: String(sub.auth),
          payload: {
            title: due.title,
            body: due.body,
            url: './#/vocabulary/review',
            deliveryKey: due.deliveryKey,
            slotTime: due.slotTime,
            requireInteraction: true,
          },
          vapidSubject,
          vapidPublicKey,
          vapidPrivateKey,
        });

        if (pushRes.expired) {
          expiredSubscriptionsRemoved += 1;
          await admin.from('push_subscriptions').delete().eq('id', sub.id);
          continue;
        }
      } catch (err) {
        console.warn(`Web Push delivery failed for subscription ${sub.id}:`, err);
      }
    }

    await admin
      .from('push_subscriptions')
      .update({
        last_notified_key: due.deliveryKey,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sub.id);

    sentCount += 1;
  }

  return new Response(
    JSON.stringify({
      ok: true,
      evaluatedDevices: (subscriptions ?? []).length,
      sentCount,
      expiredCleaned,
      expiredSubscriptionsRemoved,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
