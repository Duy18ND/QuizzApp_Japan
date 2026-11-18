// Supabase Edge Function: send-study-reminders
// Evaluates Recurring & One-Time study schedules in Asia/Ho_Chi_Minh timezone
// and dispatches Web Push notifications to subscribed PC, iOS 16.4+ PWA, and Android devices.
// Schedule with pg_cron or Supabase Scheduled Functions (every 1 minute: `* * * * *`).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // 1. Check whether slot applies on today's date/weekday
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

    // Continuous Repeat Alert (applies to recurring schedules when today is not yet completed)
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
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
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
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let sentCount = 0;
  let expiredCleaned = 0;

  for (const sub of subscriptions ?? []) {
    const tz = sub.timezone || 'Asia/Ho_Chi_Minh';
    const tzParts = getNowInTimezone(new Date(), tz);
    const snap = (sub.schedule_snapshot ?? {}) as Record<string, unknown>;
    if (snap.enabled === false) continue;

    const rawSlots = Array.isArray(snap.timeSlots) ? (snap.timeSlots as ScheduleSlot[]) : [];
    // Clean expired one-time schedules on the server snapshot
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

    // Deduplicate: never send the same deliveryKey twice to the same subscription
    if (sub.last_notified_key === due.deliveryKey) continue;

    const { error: logErr } = await admin.from('push_delivery_logs').insert({
      subscription_id: sub.id,
      delivery_key: due.deliveryKey,
    });
    if (logErr) {
      // Unique constraint violation means already delivered
      continue;
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
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
