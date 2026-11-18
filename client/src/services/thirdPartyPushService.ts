/**
 * Nihongo 問 — 3rd-Party iOS / Android Push Integration (`ntfy.sh`)
 *
 * Allows iPhone users to install the free official `ntfy` app from the Apple App Store
 * and receive real Apple APNs background notifications even when:
 * - QuizzApp has NO icon on the iPhone Home Screen
 * - Safari is closed / screen is locked / offline WebView is not running
 *
 * Security:
 * - Generates high-entropy random topics (prefix `nihongo-` + 24 hex chars = 96 bits of entropy)
 *   so outsiders cannot guess or intercept notification topics.
 * - Enforces strict HTTPS server URLs (only `https://`, or `http://localhost` for local testing).
 * - Uses JSON root POST (`POST https://ntfy.sh/`) with UTF-8 `application/json` so Vietnamese/Japanese
 *   characters and emojis work cleanly without browser HTTP header ByteString limitations.
 */

import { supabase } from './supabaseClient';
import type { StudyScheduleConfig, StudyTimeSlot } from './notificationService';

export const NTFY_CONFIG_STORAGE_KEY = 'nihonmaster_ntfy_config_v1';
export const NTFY_DISPATCHED_KEYS_STORAGE_KEY = 'nihonmaster_ntfy_dispatched_v1';
export const DEFAULT_NTFY_SERVER_URL = 'https://ntfy.sh';
export const DEFAULT_REVIEW_CLICK_URL =
  'https://duy18nd.github.io/QuizzApp_Japan/#/vocabulary/review';

const VALID_TOPIC_REGEX = /^[a-zA-Z0-9_-]{8,80}$/;
const VALID_TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const VALID_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VN_UTC_OFFSET_MINUTES = 7 * 60;

export interface NtfyChannelConfig {
  enabled: boolean;
  serverUrl: string;
  topic: string;
  lastPushedAt: string | null;
  lastScheduledCount: number;
}

export interface PlannedNtfyReminder {
  dedupeKey: string;
  slotId: string;
  dateKey: string;
  timeStr: string;
  fireAtMs: number;
  unixDelayStr: string;
  title: string;
  message: string;
  clickUrl: string;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates an unguessable private ntfy topic (`nihongo-` + 24 random hex chars).
 */
export function generateSecureNtfyTopic(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      return `nihongo-${toHex(bytes)}`;
    }
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `nihongo-${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    }
  } catch {
    // Fallback below if crypto unavailable
  }
  const rand = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  return `nihongo-${rand.replace(/[^a-z0-9]/gi, '').slice(0, 20).padEnd(20, '0')}`;
}

export function sanitizeNtfyServerUrl(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_NTFY_SERVER_URL;
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return DEFAULT_NTFY_SERVER_URL;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      return `${parsed.protocol}//${parsed.host}${parsed.pathname === '/' ? '' : parsed.pathname}`.replace(
        /\/+$/,
        '',
      );
    }
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return `${parsed.protocol}//${parsed.host}`;
    }
  } catch {
    return DEFAULT_NTFY_SERVER_URL;
  }
  return DEFAULT_NTFY_SERVER_URL;
}

export function isValidNtfyTopic(topic: string): boolean {
  return VALID_TOPIC_REGEX.test(topic.trim());
}

export function sanitizeNtfyConfig(raw: unknown): NtfyChannelConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      enabled: false,
      serverUrl: DEFAULT_NTFY_SERVER_URL,
      topic: '',
      lastPushedAt: null,
      lastScheduledCount: 0,
    };
  }
  const obj = raw as Record<string, unknown>;
  const rawTopic = typeof obj.topic === 'string' ? obj.topic.trim().slice(0, 80) : '';
  return {
    enabled: Boolean(obj.enabled) && isValidNtfyTopic(rawTopic),
    serverUrl: sanitizeNtfyServerUrl(obj.serverUrl),
    topic: rawTopic,
    lastPushedAt: typeof obj.lastPushedAt === 'string' ? obj.lastPushedAt : null,
    lastScheduledCount: Math.max(0, Number(obj.lastScheduledCount) || 0),
  };
}

export function loadNtfyConfig(): NtfyChannelConfig {
  if (typeof window === 'undefined' || !window.localStorage) {
    return sanitizeNtfyConfig(null);
  }
  try {
    const raw = window.localStorage.getItem(NTFY_CONFIG_STORAGE_KEY);
    if (!raw) return sanitizeNtfyConfig(null);
    return sanitizeNtfyConfig(JSON.parse(raw));
  } catch {
    return sanitizeNtfyConfig(null);
  }
}

export async function saveNtfyConfig(
  patch: Partial<NtfyChannelConfig>,
  options: { userId?: string | null; deviceId?: string; schedule?: StudyScheduleConfig } = {},
): Promise<NtfyChannelConfig> {
  const current = loadNtfyConfig();
  const next = sanitizeNtfyConfig({ ...current, ...patch });

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(NTFY_CONFIG_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  }

  // Sync to Supabase push_subscriptions (uses existing schema without needing SQL migrations)
  const userId = options.userId;
  if (supabase && userId && !userId.startsWith('quick-test-')) {
    const ntfyDeviceId = `ntfy-${options.deviceId || 'default'}`;
    try {
      if (next.enabled && isValidNtfyTopic(next.topic)) {
        const endpoint = `${next.serverUrl}/${next.topic}`;
        await supabase.from('push_subscriptions').upsert(
          {
            user_id: userId,
            device_id: ntfyDeviceId,
            device_label: 'App Thứ 3 (ntfy iOS / Android)',
            platform: 'ios-ntfy',
            browser: 'ntfy-app',
            endpoint,
            p256dh: 'ntfy',
            auth: 'ntfy',
            enabled: true,
            timezone: options.schedule?.timezone || 'Asia/Ho_Chi_Minh',
            schedule_snapshot: options.schedule
              ? {
                  enabled: options.schedule.enabled,
                  timeSlots: options.schedule.timeSlots,
                  continuousRepeatMinutes: options.schedule.continuousRepeatEnabled
                    ? options.schedule.continuousRepeatMinutes
                    : 0,
                  completedDates: options.schedule.completedDates,
                }
              : {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,device_id' },
        );
      } else {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId)
          .eq('device_id', ntfyDeviceId);
      }
    } catch {
      // Offline / RLS fallback — localStorage stays valid
    }
  }

  return next;
}

function getCurrentReviewClickUrl(): string {
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.protocol.startsWith('http')
  ) {
    return `${window.location.origin}${window.location.pathname}#/vocabulary/review`;
  }
  return DEFAULT_REVIEW_CLICK_URL;
}

function getVnDatePartsSimple(date: Date): {
  dateKey: string;
  weekday: number;
} {
  const vnMs = date.getTime() + VN_UTC_OFFSET_MINUTES * 60_000;
  const vn = new Date(vnMs);
  const y = vn.getUTCFullYear();
  const m = String(vn.getUTCMonth() + 1).padStart(2, '0');
  const d = String(vn.getUTCDate()).padStart(2, '0');
  return {
    dateKey: `${y}-${m}-${d}`,
    weekday: vn.getUTCDay(),
  };
}

function addDaysToDateKeyVn(dateKey: string, days: number): { dateKey: string; weekday: number } {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  return {
    dateKey: `${ny}-${nm}-${nd}`,
    weekday: dt.getUTCDay(),
  };
}

/**
 * Pure planner returning upcoming notifications within ntfy.sh's 72-hour delayed-delivery window
 * (`[now + 15s, now + 71h]`) in `Asia/Ho_Chi_Minh`.
 */
export function planUpcomingNtfyBatch(
  schedule: Pick<StudyScheduleConfig, 'enabled' | 'timeSlots'>,
  topic: string,
  options: { now?: Date; clickUrl?: string; maxBatchCount?: number } = {},
): PlannedNtfyReminder[] {
  if (!schedule.enabled || !isValidNtfyTopic(topic)) return [];
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const minFireMs = nowMs + 15_000;
  const maxFireMs = nowMs + 71 * 3600 * 1000; // Inside ntfy.sh 72h cap with 1h margin
  const clickUrl = options.clickUrl ?? getCurrentReviewClickUrl();
  const maxBatch = Math.max(1, Math.min(30, options.maxBatchCount ?? 20));
  const todayVn = getVnDatePartsSimple(now);

  const candidates: PlannedNtfyReminder[] = [];
  const seenKeys = new Set<string>();

  for (let offset = 0; offset <= 3; offset++) {
    const dayInfo = addDaysToDateKeyVn(todayVn.dateKey, offset);
    for (const slot of (schedule.timeSlots ?? []) as StudyTimeSlot[]) {
      if (!slot || !VALID_TIME_REGEX.test(slot.time)) continue;

      if (slot.scheduleType === 'once') {
        if (!VALID_DATE_REGEX.test(slot.date) || slot.date !== dayInfo.dateKey) continue;
      } else {
        const days =
          Array.isArray(slot.daysOfWeek) && slot.daysOfWeek.length > 0
            ? slot.daysOfWeek
            : [1, 2, 3, 4, 5, 6, 0];
        if (!days.includes(dayInfo.weekday)) continue;
      }

      const fireAt = new Date(`${dayInfo.dateKey}T${slot.time}:00+07:00`);
      const fireAtMs = fireAt.getTime();
      if (!Number.isFinite(fireAtMs) || fireAtMs <= minFireMs || fireAtMs > maxFireMs) {
        continue;
      }

      const dedupeKey = `${topic.trim()}::${dayInfo.dateKey}::${slot.id}::${slot.time}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      const unixSeconds = Math.floor(fireAtMs / 1000);
      candidates.push({
        dedupeKey,
        slotId: slot.id,
        dateKey: dayInfo.dateKey,
        timeStr: slot.time,
        fireAtMs,
        unixDelayStr: String(unixSeconds),
        title: `⏰ Đến giờ học: ${slot.label} (${slot.time})`,
        message:
          slot.scheduleType === 'once'
            ? `Lịch hẹn ngày ${dayInfo.dateKey.split('-').reverse().join('/')}: Bấm vào đây để mở Nihongo 問 ôn tập ngay!`
            : 'Dành 15 phút ôn Từ vựng, Kanji & Ngữ pháp ngay! Bấm vào thông báo để mở bài học.',
        clickUrl,
      });
    }
  }

  return candidates.sort((a, b) => a.fireAtMs - b.fireAtMs).slice(0, maxBatch);
}

export async function sendNtfyNotification(params: {
  serverUrl?: string;
  topic: string;
  title: string;
  message: string;
  delay?: string;
  clickUrl?: string;
  priority?: 1 | 2 | 3 | 4 | 5;
}): Promise<{ ok: boolean; error?: string }> {
  const cleanTopic = params.topic.trim();
  if (!isValidNtfyTopic(cleanTopic)) {
    return {
      ok: false,
      error: 'Tên kênh ntfy cần dài tối thiểu 8 ký tự (chữ, số, "-" hoặc "_"). Hãy bấm "Tạo kênh bảo mật".',
    };
  }

  const serverUrl = sanitizeNtfyServerUrl(params.serverUrl);
  const clickUrl = params.clickUrl || getCurrentReviewClickUrl();

  try {
    const bodyPayload: Record<string, unknown> = {
      topic: cleanTopic,
      title: params.title,
      message: params.message,
      priority: params.priority ?? 4,
      tags: ['alarm_clock', 'jp'],
      click: clickUrl,
      ...(params.delay ? { delay: params.delay } : {}),
    };

    const res = await fetch(`${serverUrl}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        ok: false,
        error: `Máy chủ ntfy trả về lỗi HTTP ${res.status}${errText ? `: ${errText.slice(0, 120)}` : ''}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Không thể kết nối máy chủ ntfy.',
    };
  }
}

function loadDispatchedNtfyKeys(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) return new Set();
  try {
    const raw = window.localStorage.getItem(NTFY_DISPATCHED_KEYS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((k): k is string => typeof k === 'string'));
  } catch {
    return new Set();
  }
}

function saveDispatchedNtfyKeys(keys: Set<string>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const trimmed = Array.from(keys).slice(-120);
    window.localStorage.setItem(NTFY_DISPATCHED_KEYS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

export async function pushUpcomingSchedulesToNtfy(
  config: NtfyChannelConfig,
  schedule: StudyScheduleConfig,
  options: { userId?: string | null; deviceId?: string } = {},
): Promise<{
  ok: boolean;
  scheduledCount: number;
  skippedAlreadyQueued: number;
  totalInWindow: number;
  error?: string;
}> {
  if (!isValidNtfyTopic(config.topic)) {
    return {
      ok: false,
      scheduledCount: 0,
      skippedAlreadyQueued: 0,
      totalInWindow: 0,
      error: 'Vui lòng tạo hoặc nhập kênh ntfy hợp lệ trước.',
    };
  }

  const planned = planUpcomingNtfyBatch(schedule, config.topic);
  if (planned.length === 0) {
    return {
      ok: true,
      scheduledCount: 0,
      skippedAlreadyQueued: 0,
      totalInWindow: 0,
    };
  }

  const dispatched = loadDispatchedNtfyKeys();
  let scheduledCount = 0;
  let skippedAlreadyQueued = 0;

  for (const item of planned) {
    if (dispatched.has(item.dedupeKey)) {
      skippedAlreadyQueued += 1;
      continue;
    }

    const res = await sendNtfyNotification({
      serverUrl: config.serverUrl,
      topic: config.topic,
      title: item.title,
      message: item.message,
      delay: item.unixDelayStr,
      clickUrl: item.clickUrl,
      priority: 4,
    });

    if (!res.ok) {
      return {
        ok: false,
        scheduledCount,
        skippedAlreadyQueued,
        totalInWindow: planned.length,
        error: res.error,
      };
    }

    dispatched.add(item.dedupeKey);
    scheduledCount += 1;
  }

  saveDispatchedNtfyKeys(dispatched);
  await saveNtfyConfig(
    {
      enabled: true,
      lastPushedAt: new Date().toISOString(),
      lastScheduledCount: planned.length,
    },
    {
      userId: options.userId,
      deviceId: options.deviceId,
      schedule,
    },
  );

  return {
    ok: true,
    scheduledCount,
    skippedAlreadyQueued,
    totalInWindow: planned.length,
  };
}
