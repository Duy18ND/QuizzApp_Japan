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
  /** Last push time (epoch ms) of each custom slot today, keyed "<dateKey>|<slotId>|<HH:MM>" */
  slot_last_sent: Record<string, number> | null;
  /** Last time the user had the app open on this device (reported by the client every minute) */
  last_app_open_at: string | null;
}

/** One entry of user_reminders.time_slots (see StudyTimeSlot in the client). */
interface StudySlot {
  id?: string;
  scheduleType?: 'recurring' | 'once';
  time?: string;
  label?: string;
  daysOfWeek?: number[];
  date?: string;
  /** Re-notify every N minutes until the app is opened; 0/undefined = notify once */
  repeatMinutes?: number;
}

interface ReminderRow {
  user_id: string;
  enabled: boolean | null;
  time_slots: unknown;
}

type LocalParts = ReturnType<typeof getLocalParts>;

/** The first notification of a slot still goes out if the cron run is up to this late. */
const SLOT_CATCH_UP_MINUTES = 30;
/** "Nhắc lại đến khi mở app" gives up this long after the slot time. */
const SLOT_REPEAT_MAX_MINUTES = 180;
/** Having the app open this recently counts as "already studying": no first notification. */
const APP_ACTIVE_WINDOW_MS = 150_000;
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

function sanitizeRepeatMinutes(value: unknown): number {
  const n = Number(value);
  return n === 1 || n === 5 || n === 10 || n === 15 ? n : 0;
}

/** Valid slots scheduled for today whose time has already come. */
function getStartedSlotsToday(rawSlots: unknown, local: LocalParts, completedToday: boolean): StudySlot[] {
  if (!Array.isArray(rawSlots)) return [];
  return (rawSlots as StudySlot[]).filter((slot) => {
    if (!slot || typeof slot !== 'object') return false;
    const slotMinutes = parseHourMinute(slot.time);
    if (slotMinutes === null || slotMinutes > local.totalMinutes) return false;

    if (slot.scheduleType === 'once') {
      // One-off appointment: fires on its date even if today's Stage is already done.
      return slot.date === local.dateKey;
    }
    if (completedToday) return false;
    const days =
      Array.isArray(slot.daysOfWeek) && slot.daysOfWeek.length > 0 ? slot.daysOfWeek : ALL_WEEKDAYS;
    return days.includes(local.weekday);
  });
}

function hasValidSlots(rawSlots: unknown): boolean {
  return Array.isArray(rawSlots) && rawSlots.some((slot) => parseHourMinute(slot?.time) !== null);
}

function slotKey(dateKey: string, slot: StudySlot): string {
  return `${dateKey}|${slot.id ?? ''}|${slot.time ?? ''}`;
}

function keepTodaySends(raw: unknown, dateKey: string): Record<string, number> {
  const result: Record<string, number> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key.startsWith(`${dateKey}|`) && typeof value === 'number' && Number.isFinite(value)) {
      result[key] = value;
    }
  }
  return result;
}

type SlotDecision = 'first' | 'repeat' | 'skip-active' | 'none';

function decideSlot(
  slot: StudySlot,
  local: LocalParts,
  nowMs: number,
  lastSentMs: number | undefined,
  lastAppOpenMs: number,
): SlotDecision {
  const minutesLate = local.totalMinutes - (parseHourMinute(slot.time) ?? 0);
  // Cron runs on the minute: the slot started at the beginning of the current local minute minus minutesLate.
  const slotStartMs = Math.floor(nowMs / 60_000) * 60_000 - minutesLate * 60_000;

  if (lastSentMs === undefined) {
    if (minutesLate >= SLOT_CATCH_UP_MINUTES) return 'none';
    return nowMs - lastAppOpenMs < APP_ACTIVE_WINDOW_MS ? 'skip-active' : 'first';
  }

  const repeatMinutes = sanitizeRepeatMinutes(slot.repeatMinutes);
  if (repeatMinutes === 0 || minutesLate >= SLOT_REPEAT_MAX_MINUTES) return 'none';
  if (lastAppOpenMs >= slotStartMs) return 'none'; // opened the app since the slot started: stop
  return nowMs - lastSentMs >= repeatMinutes * 60_000 - 20_000 ? 'repeat' : 'none';
}

function isMainReminderDue(
  row: PushRow,
  local: LocalParts,
  now: Date,
  lastAppOpenMs: number,
): boolean {
  const allowedDays =
    Array.isArray(row.study_weekdays) && row.study_weekdays.length > 0 ? row.study_weekdays : ALL_WEEKDAYS;
  if (!allowedDays.includes(local.weekday)) return false;

  const reminderMinutes = parseHourMinute(row.reminder_time) ?? 20 * 60;
  if (local.totalMinutes < reminderMinutes) return false;

  // Opening the app after today's reminder time stops the repeats until tomorrow.
  const reminderStartMs =
    Math.floor(now.getTime() / 60_000) * 60_000 - (local.totalMinutes - reminderMinutes) * 60_000;
  if (lastAppOpenMs >= reminderStartMs) return false;

  const repeatMs = Math.max(5, Number(row.repeat_interval_minutes) || 10) * 60_000;
  const lastNotifiedMs = row.last_notified_at ? Date.parse(row.last_notified_at) : 0;
  return !(lastNotifiedMs > 0 && now.getTime() - lastNotifiedMs < repeatMs - 30_000);
}

/** Lock screens show about two short lines: cut long user-written labels. */
function shortText(value: unknown, max = 60): string {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
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
    const title = '✅ Thông báo hoạt động';
    const notifBody =
      delaySeconds > 0 ? 'Đã nhận được dù app đang đóng.' : 'Điện thoại đã nhận được nhắc học.';

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

  // Opening the app on any device of the user counts (phone, laptop…).
  const lastAppOpenByUser = new Map<string, number>();
  for (const row of subs) {
    const openedMs = row.last_app_open_at ? Date.parse(row.last_app_open_at) : 0;
    if (Number.isFinite(openedMs) && openedMs > (lastAppOpenByUser.get(row.user_id) ?? 0)) {
      lastAppOpenByUser.set(row.user_id, openedMs);
    }
  }

  for (const row of subs) {
    const local = getLocalParts(now, row.timezone || 'Asia/Ho_Chi_Minh');
    const completedToday = row.last_completed_date === local.dateKey;
    const reminders = remindersByUser.get(row.user_id);
    const slotsActive = !!reminders && reminders.enabled !== false;
    const lastAppOpenMs = lastAppOpenByUser.get(row.user_id) ?? 0;
    const nowMs = now.getTime();

    let notifiedThisRun = false;
    let subscriptionGone = false;

    // A) Custom time slots: first push at the slot time, then (if enabled) every N minutes
    //    until the user opens the app.
    const previousSends = keepTodaySends(row.slot_last_sent, local.dateKey);
    const sends = { ...previousSends };
    let sendsChanged =
      Object.keys(previousSends).length !==
      Object.keys((row.slot_last_sent as Record<string, number> | null) ?? {}).length;

    const startedSlots = slotsActive
      ? getStartedSlotsToday(reminders?.time_slots, local, completedToday)
      : [];

    for (const slot of startedSlots) {
      const key = slotKey(local.dateKey, slot);
      const decision = decideSlot(slot, local, nowMs, sends[key], lastAppOpenMs);
      if (decision === 'none') continue;
      if (decision === 'skip-active') {
        // Already in the app: count it as delivered so no repeat starts.
        sends[key] = nowMs;
        sendsChanged = true;
        continue;
      }

      const result = await sendPush(webpush, row, {
        // No app name in the title: the phone already shows it above the notification.
        title: decision === 'repeat' ? `⏰ ${slot.time} · Bạn chưa vào học` : `⏰ ${slot.time} · Đến giờ học`,
        body: shortText(slot.label) || 'Chạm để vào bài hôm nay.',
        url: `${baseUrl}/#/roadmap`,
        tag: `nihongo-slot-${local.dateKey}-${slot.id ?? slot.time}`,
      });
      if (result === 'gone') {
        subscriptionGone = true;
        break;
      }
      if (result === 'sent') {
        sends[key] = nowMs;
        sendsChanged = true;
        notifiedThisRun = true;
        slotSentCount += 1;
      }
    }

    // B) Users without their own time slots keep the roadmap reminder: from reminder_time,
    //    repeat until the app is opened (or today's Stage is done).
    const hasOwnSlots = slotsActive && hasValidSlots(reminders?.time_slots);
    if (
      !subscriptionGone &&
      !hasOwnSlots &&
      !notifiedThisRun &&
      !completedToday &&
      isMainReminderDue(row, local, now, lastAppOpenMs)
    ) {
      // active_stage_label holds the roadmap's name, not a stage
      const roadmapName = shortText(row.active_stage_label, 30);
      const targetMins = row.daily_minutes_target || 10;
      const task = `Học ${targetMins} phút để xong bài hôm nay.`;
      const result = await sendPush(webpush, row, {
        title: '⏰ Đến giờ học tiếng Nhật',
        body: roadmapName && roadmapName !== 'Giáo trình chuẩn' ? `${roadmapName}\n${task}` : task,
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

    if (notifiedThisRun || sendsChanged) {
      const patch: Record<string, unknown> = { slot_last_sent: sends };
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
