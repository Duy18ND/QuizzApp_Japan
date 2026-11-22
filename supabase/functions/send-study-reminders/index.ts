// Supabase Edge Function: send-study-reminders
// Fires VAPID Web Push notifications every 10–15 min for users who have reached their
// daily reminder time and have NOT completed today's Stage + 10–15 min target yet.
// Works even when the user swipes the PWA closed from Recent Apps!

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

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

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret) {
    const provided = req.headers.get('x-cron-secret');
    if (provided !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@nihongo-app.local';
  const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://duy18nd.github.io/QuizzApp_Japan';

  if (!supabaseUrl || !serviceKey || !vapidPublicKey || !vapidPrivateKey) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE or VAPID environment secrets' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: rows, error } = await supabase
    .from('user_push_subscriptions')
    .select('*')
    .eq('notifications_enabled', true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = new Date();
  let sentCount = 0;
  let prunedCount = 0;
  let skippedCount = 0;

  for (const row of (rows ?? []) as PushRow[]) {
    const local = getLocalParts(now, row.timezone || 'Asia/Ho_Chi_Minh');

    // Already completed today's Stage + 10-15m gate -> stay silent!
    if (row.last_completed_date === local.dateKey) {
      skippedCount += 1;
      continue;
    }

    const allowedDays = Array.isArray(row.study_weekdays) && row.study_weekdays.length > 0
      ? row.study_weekdays
      : [1, 2, 3, 4, 5, 6, 0];
    if (!allowedDays.includes(local.weekday)) {
      skippedCount += 1;
      continue;
    }

    const [rh, rm] = (row.reminder_time || '20:00').split(':').map(Number);
    const reminderMinutes = (rh || 20) * 60 + (rm || 0);
    if (local.totalMinutes < reminderMinutes) {
      skippedCount += 1;
      continue;
    }

    const repeatMs = Math.max(5, Number(row.repeat_interval_minutes) || 10) * 60_000;
    const lastNotifiedMs = row.last_notified_at ? Date.parse(row.last_notified_at) : 0;
    if (lastNotifiedMs > 0 && now.getTime() - lastNotifiedMs < repeatMs - 30_000) {
      skippedCount += 1;
      continue;
    }

    const stageLabel = row.active_stage_label || 'Màn hôm nay';
    const targetMins = row.daily_minutes_target || 10;

    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: {
            p256dh: row.p256dh,
            auth: row.auth,
          },
        },
        JSON.stringify({
          title: `Nihongo 問 · ${stageLabel} đang chờ bạn!`,
          body: `Online tối thiểu ${targetMins} phút và hoàn thành ${stageLabel} để mở khóa Màn kế tiếp & tắt nhắc hôm nay.`,
          url: `${appBaseUrl.replace(/\/$/, '')}/#/roadmap`,
          tag: `nihongo-stage-${local.dateKey}`,
        }),
      );

      await supabase
        .from('user_push_subscriptions')
        .update({ last_notified_at: now.toISOString() })
        .eq('id', row.id);
      sentCount += 1;
    } catch (pushErr: unknown) {
      const statusCode =
        typeof pushErr === 'object' && pushErr !== null && 'statusCode' in pushErr
          ? Number((pushErr as { statusCode?: number }).statusCode)
          : 0;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('user_push_subscriptions').delete().eq('id', row.id);
        prunedCount += 1;
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sentCount, prunedCount, skippedCount }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
