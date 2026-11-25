// Supabase Edge Function: send-study-reminders
// Fires VAPID Web Push notifications every 10–15 min for users who have reached their
// daily reminder time and have NOT completed today's Stage + 10–15 min target yet.
// Works even when the user swipes the PWA closed from Recent Apps!

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

// Provided by the Supabase Edge Runtime: keeps a background task alive after the response.
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

interface PushRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  notifications_enabled: boolean;
  reminder_time: string;
  repeat_interval_minutes: number;
  study_weekdays: number[] | null;
  daily_minutes_target: number;
  timezone: string;
  last_completed_date: string | null;
  active_stage_label: string | null;
  last_notified_at: string | null;
  /** "<dateKey>|<slotId>|<HH:MM>" of the custom slots already pushed today */
  sent_slot_keys: string[] | null;
}

/** One entry of user_reminders.time_slots (see StudyTimeSlot in the client). */
interface StudySlot {
  id?: string;
  scheduleType?: 'recurring' | 'once';
  time?: string;
  label?: string;
  daysOfWeek?: number[];
  date?: string;
}

interface ReminderRow {
  user_id: string;
  enabled: boolean | null;
  time_slots: unknown;
}

type LocalParts = ReturnType<typeof getLocalParts>;

/** A slot still fires if the cron run happens up to this many minutes late. */
const SLOT_CATCH_UP_MINUTES = 30;
const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

function parseHourMinute(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function getDueSlots(rawSlots: unknown, local: LocalParts, completedToday: boolean): StudySlot[] {
  if (!Array.isArray(rawSlots)) return [];
  return (rawSlots as StudySlot[]).filter((slot) => {
    if (!slot || typeof slot !== 'object') return false;
    const slotMinutes = parseHourMinute(slot.time);
    if (slotMinutes === null) return false;

    if (slot.scheduleType === 'once') {
      // One-off appointment: fires on its date even if today's Stage is already done.
      if (slot.date !== local.dateKey) return false;
    } else {
      if (completedToday) return false;
      const days =
        Array.isArray(slot.daysOfWeek) && slot.daysOfWeek.length > 0 ? slot.daysOfWeek : ALL_WEEKDAYS;
      if (!days.includes(local.weekday)) return false;
    }

    const minutesLate = local.totalMinutes - slotMinutes;
    return minutesLate >= 0 && minutesLate < SLOT_CATCH_UP_MINUTES;
  });
}

function slotKey(dateKey: string, slot: StudySlot): string {
  return `${dateKey}|${slot.id ?? ''}|${slot.time ?? ''}`;
}

function keepTodaySlotKeys(raw: unknown, dateKey: string): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((key): key is string => typeof key === 'string' && key.startsWith(`${dateKey}|`));
}

function isMainReminderDue(row: PushRow, local: LocalParts, now: Date): boolean {
  const allowedDays =
    Array.isArray(row.study_weekdays) && row.study_weekdays.length > 0 ? row.study_weekdays : ALL_WEEKDAYS;
  if (!allowedDays.includes(local.weekday)) return false;

  const reminderMinutes = parseHourMinute(row.reminder_time) ?? 20 * 60;
  if (local.totalMinutes < reminderMinutes) return false;

  const repeatMs = Math.max(5, Number(row.repeat_interval_minutes) || 10) * 60_000;
  const lastNotifiedMs = row.last_notified_at ? Date.parse(row.last_notified_at) : 0;
  return !(lastNotifiedMs > 0 && now.getTime() - lastNotifiedMs < repeatMs - 30_000);
}

interface PushMessage {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** 'gone' = the browser dropped this subscription (404/410): the caller should delete it. */
async function sendPush(
  client: typeof webpush,
  row: PushRow,
  message: PushMessage,
): Promise<'sent' | 'gone' | 'failed'> {
  try {
    await client.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify(message),
    );
    return 'sent';
  } catch (pushErr: unknown) {
    const statusCode =
      typeof pushErr === 'object' && pushErr !== null && 'statusCode' in pushErr
        ? Number((pushErr as { statusCode?: number }).statusCode)
        : 0;
    if (statusCode === 404 || statusCode === 410) return 'gone';
    console.error('push failed', row.id, statusCode, pushErr);
    return 'failed';
  }
}

function getLocalParts(now: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  const hour = Number(map.hour) === 24 ? 0 : Number(map.hour || 0);
  const minute = Number(map.minute || 0);
  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    weekday: WEEKDAY_MAP[map.weekday || 'Mon'] ?? 1,
    totalMinutes: hour * 60 + minute,
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  // web-push requires a URL subject: accept a bare email in the secret and prefix `mailto:`.
  const rawVapidSubject = (Deno.env.get('VAPID_SUBJECT') ?? '').trim();
  const vapidSubject = !rawVapidSubject
    ? 'mailto:admin@nihongo-app.local'
    : /^(mailto:|https?:\/\/)/i.test(rawVapidSubject)
      ? rawVapidSubject
      : `mailto:${rawVapidSubject}`;
  const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://duy18nd.github.io/QuizzApp_Japan';

  if (!supabaseUrl || !serviceKey || !vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse({ error: 'Missing SUPABASE or VAPID environment secrets' }, 500);
  }

  let body: Record<string, unknown> = {};
  try {
    const rawText = await req.text();
    if (rawText.trim()) {
      const parsed = JSON.parse(rawText);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    }
  } catch {
    body = {};
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (vapidErr: unknown) {
    const detail = vapidErr instanceof Error ? vapidErr.message : String(vapidErr);
    console.error('invalid VAPID config', detail);
    return jsonResponse(
      {
        ok: false,
        reason: 'invalid-vapid',
        error:
          'Cấu hình VAPID trên Supabase không hợp lệ (xem log Edge Function để biết chi tiết).',
      },
      500,
    );
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  // Mode 1: Authenticated user self-test push (supports server-side delay so user can exit & swipe app away)
  if (body.mode === 'self-test') {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) {
      return jsonResponse({ ok: false, reason: 'unauthorized', error: 'Missing Bearer token' }, 401);
    }

    const verifyClient = createClient(supabaseUrl, anonKey || serviceKey);
    const { data: userData, error: userError } = await verifyClient.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return jsonResponse({ ok: false, reason: 'unauthorized', error: 'Invalid session token' }, 401);
    }

    const delaySeconds = Math.max(0, Math.min(25, Math.round(Number(body.delaySeconds) || 0)));
    const stageLabel =
      typeof body.stageLabel === 'string' && body.stageLabel.trim()
        ? body.stageLabel.trim()
        : 'Màn hôm nay';

    const { data: userSubs, error: subsErr } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .eq('user_id', userData.user.id);

    if (subsErr) {
      return jsonResponse({ ok: false, reason: 'db-error', error: subsErr.message }, 500);
    }
    if (!userSubs || userSubs.length === 0) {
      return jsonResponse(
        {
          ok: false,
          reason: 'no-subscription',
          error: 'Thiết bị chưa đăng ký Web Push với máy chủ.',
        },
        404,
      );
    }

    const nowTag = Date.now();
    const title =
      delaySeconds > 0
        ? `Nihongo 問 · Nảy chuông sau ${delaySeconds}s (App đã đóng)!`
        : 'Nihongo 問 · Test Server Web Push thành công!';
    const notifBody =
      delaySeconds > 0
        ? `Thông báo đẩy từ Server Cloud vẫn hoạt động dù bạn đã thoát màn hình chính & xóa app khỏi đa nhiệm (${stageLabel}).`
        : `Đường truyền Server Push → điện thoại hoạt động bình thường (${stageLabel}).`;

    const sendToAllSubs = async () => {
      let sentCount = 0;
      let prunedCount = 0;
      let failedCount = 0;
      for (const row of userSubs as PushRow[]) {
        try {
          await webpush.sendNotification(
            {
              endpoint: row.endpoint,
              keys: { p256dh: row.p256dh, auth: row.auth },
            },
            JSON.stringify({
              title,
              body: notifBody,
              url: `${appBaseUrl.replace(/\/$/, '')}/#/settings`,
              tag: `nihongo-self-test-${nowTag}`,
            }),
          );
          sentCount += 1;
        } catch (pushErr: unknown) {
          failedCount += 1;
          const statusCode =
            typeof pushErr === 'object' && pushErr !== null && 'statusCode' in pushErr
              ? Number((pushErr as { statusCode?: number }).statusCode)
              : 0;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from('user_push_subscriptions').delete().eq('id', row.id);
            prunedCount += 1;
          } else {
            console.error('self-test push failed', statusCode, pushErr);
          }
        }
      }
      return { sentCount, prunedCount, failedCount };
    };

    // With a delay, answer the client right away and send in the background.
    // Otherwise iOS closing the app (swipe from Recent Apps) drops the HTTP
    // connection and the runtime may cancel a request that is still sleeping.
    if (delaySeconds > 0 && typeof EdgeRuntime !== 'undefined') {
      EdgeRuntime.waitUntil(
        (async () => {
          await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
          const result = await sendToAllSubs();
          console.log('self-test delayed push result', result);
        })(),
      );
      return jsonResponse({
        ok: true,
        mode: 'self-test',
        scheduled: true,
        delaySeconds,
        subscriptionCount: userSubs.length,
      });
    }

    if (delaySeconds > 0) {
      await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
    }
    const { sentCount, prunedCount, failedCount } = await sendToAllSubs();

    if (sentCount === 0) {
      return jsonResponse(
        {
          ok: false,
          reason: 'push-failed',
          error:
            'Gửi Push thất bại tới mọi thiết bị (kiểm tra VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY trên Supabase có khớp VITE_VAPID_PUBLIC_KEY không).',
          prunedCount,
          failedCount,
        },
        502,
      );
    }

    return jsonResponse({
      ok: sentCount > 0,
      mode: 'self-test',
      delaySeconds,
      sentCount,
      prunedCount,
      failedCount,
    });
  }

  // Mode 2: Cron reminder sweep (x-cron-secret required when CRON_SECRET is configured)
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret) {
    const provided = req.headers.get('x-cron-secret');
    if (provided !== cronSecret) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
  }

  const { data: rows, error } = await supabase
    .from('user_push_subscriptions')
    .select('*')
    .eq('notifications_enabled', true);

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const subs = (rows ?? []) as PushRow[];

  // Every time slot the user set up (Settings → Lịch nhắc học) lives in user_reminders.
  const remindersByUser = new Map<string, ReminderRow>();
  const userIds = [...new Set(subs.map((row) => row.user_id))];
  if (userIds.length > 0) {
    const { data: reminderRows, error: remindersErr } = await supabase
      .from('user_reminders')
      .select('user_id, enabled, time_slots')
      .in('user_id', userIds);
    if (remindersErr) {
      console.error('load user_reminders failed', remindersErr.message);
    }
    for (const reminder of (reminderRows ?? []) as ReminderRow[]) {
      remindersByUser.set(reminder.user_id, reminder);
    }
  }

  const now = new Date();
  const baseUrl = appBaseUrl.replace(/\/$/, '');
  let sentCount = 0;
  let slotSentCount = 0;
  let prunedCount = 0;
  let skippedCount = 0;

  for (const row of subs) {
    const local = getLocalParts(now, row.timezone || 'Asia/Ho_Chi_Minh');
    const completedToday = row.last_completed_date === local.dateKey;
    const reminders = remindersByUser.get(row.user_id);

    let notifiedThisRun = false;
    let subscriptionGone = false;

    // A) Each custom time slot fires once on its day (recurring weekdays or one-off date).
    const previousKeys = keepTodaySlotKeys(row.sent_slot_keys, local.dateKey);
    const sentKeys = [...previousKeys];
    const dueSlots =
      reminders && reminders.enabled !== false
        ? getDueSlots(reminders.time_slots, local, completedToday).filter(
            (slot) => !sentKeys.includes(slotKey(local.dateKey, slot)),
          )
        : [];

    for (const slot of dueSlots) {
      const label = typeof slot.label === 'string' ? slot.label.trim() : '';
      const result = await sendPush(webpush, row, {
        title: `Nihongo 問 · Đến giờ học ${slot.time}!`,
        body: label || 'Mở app để vào bài học hôm nay nhé.',
        url: `${baseUrl}/#/roadmap`,
        tag: `nihongo-slot-${local.dateKey}-${slot.id ?? slot.time}`,
      });
      if (result === 'gone') {
        subscriptionGone = true;
        break;
      }
      if (result === 'sent') {
        sentKeys.push(slotKey(local.dateKey, slot));
        notifiedThisRun = true;
        slotSentCount += 1;
      }
    }

    // B) Main daily reminder: from reminder_time, repeat until today's Stage is done.
    if (!subscriptionGone && !notifiedThisRun && !completedToday && isMainReminderDue(row, local, now)) {
      const stageLabel = row.active_stage_label || 'Màn hôm nay';
      const targetMins = row.daily_minutes_target || 10;
      const result = await sendPush(webpush, row, {
        title: `Nihongo 問 · ${stageLabel} đang chờ bạn!`,
        body: `Online tối thiểu ${targetMins} phút và hoàn thành ${stageLabel} để mở khóa Màn kế tiếp & tắt nhắc hôm nay.`,
        url: `${baseUrl}/#/roadmap`,
        tag: `nihongo-stage-${local.dateKey}`,
      });
      if (result === 'gone') {
        subscriptionGone = true;
      } else if (result === 'sent') {
        notifiedThisRun = true;
        sentCount += 1;
      }
    }

    if (subscriptionGone) {
      await supabase.from('user_push_subscriptions').delete().eq('id', row.id);
      prunedCount += 1;
      continue;
    }

    const keysChanged =
      sentKeys.length !== previousKeys.length ||
      (Array.isArray(row.sent_slot_keys) ? row.sent_slot_keys.length : 0) !== previousKeys.length;
    if (notifiedThisRun || keysChanged) {
      const patch: Record<string, unknown> = { sent_slot_keys: sentKeys };
      if (notifiedThisRun) patch.last_notified_at = now.toISOString();
      await supabase.from('user_push_subscriptions').update(patch).eq('id', row.id);
    }
    if (!notifiedThisRun) skippedCount += 1;
  }

  return jsonResponse({ ok: true, sentCount, slotSentCount, prunedCount, skippedCount });
}

Deno.serve(async (req) => {
  try {
    return await handleRequest(req);
  } catch (err: unknown) {
    // Never answer with a bare 500 + no CORS: the browser would only report "failed to fetch".
    console.error('send-study-reminders crashed', err);
    return jsonResponse(
      { ok: false, reason: 'crash', error: 'Edge Function gặp lỗi nội bộ (xem log trên Supabase).' },
      500,
    );
  }
});
