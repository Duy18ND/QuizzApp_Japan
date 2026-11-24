import {
  DEFAULT_TIMEZONE,
  addDaysToDateKey,
  getLocalDateKey,
} from './notificationService';
import type { DailyMinutesTarget, RoadmapStage } from './stageRoadmapService';
import {
  clearSavedOAuthProviderToken,
  getSavedOAuthProviderToken,
  markOAuthLoginPending,
  supabase,
} from './supabaseClient';

const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const GCAL_SYNC_PENDING_KEY = 'nihongo_gcal_sync_pending_v1';
const GCAL_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export interface GoogleCalendarSyncResult {
  ok: boolean;
  needsReauth?: boolean;
  apiDisabled?: boolean;
  created: number;
  updated: number;
  failed: number;
  total: number;
  errorMessage?: string;
}

export function markGoogleCalendarSyncPending(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(GCAL_SYNC_PENDING_KEY, '1');
  } catch {
    // Ignore storage errors
  }
}

export function hasGoogleCalendarSyncPending(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(GCAL_SYNC_PENDING_KEY) === '1';
  } catch {
    return false;
  }
}

export function consumeGoogleCalendarSyncPending(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = window.sessionStorage.getItem(GCAL_SYNC_PENDING_KEY);
    if (val === '1') {
      window.sessionStorage.removeItem(GCAL_SYNC_PENDING_KEY);
      return true;
    }
  } catch {
    // Ignore storage errors
  }
  return false;
}

/**
 * Initiates Google OAuth with `calendar.events` permission so the app can write
 * each daily roadmap stage directly to the user's Google Calendar (1-tap on mobile & desktop).
 */
export async function requestGoogleCalendarConsent(): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) {
    return {
      ok: false,
      error: 'Chưa cấu hình Supabase OAuth để kết nối Google Calendar API.',
    };
  }
  const redirectTo =
    typeof window !== 'undefined' && window.location
      ? `${window.location.origin}${window.location.pathname}`
      : undefined;

  markOAuthLoginPending();
  markGoogleCalendarSyncPending();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes: GOOGLE_CALENDAR_SCOPE,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent select_account',
      },
    },
  });

  if (error) {
    consumeGoogleCalendarSyncPending();
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

function buildIsoLocalDateTime(dateKey: string, hh: number, mm: number): string {
  const hStr = String(hh).padStart(2, '0');
  const mStr = String(mm).padStart(2, '0');
  return `${dateKey}T${hStr}:${mStr}:00`;
}

async function fetchExistingRoadmapEventMap(
  token: string,
): Promise<{ ok: true; map: Map<string, string> } | { ok: false; status: number; message: string }> {
  const map = new Map<string, string>();
  try {
    const url = new URL(GCAL_API_BASE);
    url.searchParams.set('privateExtendedProperty', 'nihongoApp=roadmap-v1');
    url.searchParams.set('maxResults', '250');
    url.searchParams.set('singleEvents', 'true');

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      return { ok: false, status: res.status, message: bodyText };
    }
    const json = (await res.json()) as {
      items?: Array<{
        id?: string;
        extendedProperties?: { private?: Record<string, string> };
      }>;
    };
    for (const item of json.items ?? []) {
      const stId = item.extendedProperties?.private?.stageId;
      if (stId && item.id) {
        map.set(stId, item.id);
      }
    }
    return { ok: true, map };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/**
 * Writes every uncompleted stage of the user's roadmap into their Google Calendar
 * with exact date, time, task checklist, deep link, and native phone popup alarms (10m before + at start).
 */
export async function syncRoadmapStagesToGoogleCalendar(options: {
  stages: RoadmapStage[];
  completedStageIds: Set<string>;
  level: string;
  bookTitle: string;
  reminderTime: string;
  dailyMinutesTarget: DailyMinutesTarget;
  onProgress?: (done: number, total: number) => void;
}): Promise<GoogleCalendarSyncResult> {
  if (!supabase) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      failed: 0,
      total: 0,
      errorMessage: 'Chưa kết nối Supabase để lấy token Google.',
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const providerToken = sessionData.session?.provider_token || getSavedOAuthProviderToken();

  if (!providerToken) {
    return {
      ok: false,
      needsReauth: true,
      created: 0,
      updated: 0,
      failed: 0,
      total: 0,
      errorMessage: 'Cần cấp quyền Google Calendar 1 lần để tự động đồng bộ lịch học.',
    };
  }

  const todayKey = getLocalDateKey();
  const targetStages = options.stages
    .filter((s) => !options.completedStageIds.has(s.id) && s.scheduledDate >= todayKey)
    .slice(0, 60);

  if (targetStages.length === 0) {
    return {
      ok: true,
      created: 0,
      updated: 0,
      failed: 0,
      total: 0,
    };
  }

  // Preflight check & existing event map (prevents duplicates on re-sync!)
  const existingCheck = await fetchExistingRoadmapEventMap(providerToken);
  if (!existingCheck.ok) {
    if (existingCheck.status === 401) {
      clearSavedOAuthProviderToken();
      return {
        ok: false,
        needsReauth: true,
        created: 0,
        updated: 0,
        failed: 0,
        total: targetStages.length,
        errorMessage: 'Phiên cấp quyền Google Calendar đã hết hạn — vui lòng xác nhận lại.',
      };
    }
    if (existingCheck.status === 403) {
      const lower = existingCheck.message.toLowerCase();
      if (lower.includes('accessnotconfigured') || lower.includes('has not been used in project')) {
        return {
          ok: false,
          apiDisabled: true,
          created: 0,
          updated: 0,
          failed: 0,
          total: targetStages.length,
          errorMessage:
            'Google Calendar API chưa được bật trong Google Cloud Console của dự án. Hãy bật "Google Calendar API" trong Google Cloud Console rồi thử lại.',
        };
      }
      return {
        ok: false,
        needsReauth: true,
        created: 0,
        updated: 0,
        failed: 0,
        total: targetStages.length,
        errorMessage: 'Tài khoản Google chưa cấp quyền ghi Google Calendar — vui lòng bấm cấp quyền.',
      };
    }
    return {
      ok: false,
      created: 0,
      updated: 0,
      failed: targetStages.length,
      total: targetStages.length,
      errorMessage: 'Không kết nối được tới Google Calendar API. Vui lòng thử lại.',
    };
  }

  const [rawH, rawM] = (options.reminderTime || '20:00').split(':').map(Number);
  const hh = Number.isFinite(rawH) && rawH >= 0 && rawH <= 23 ? rawH : 20;
  const mm = Number.isFinite(rawM) && rawM >= 0 && rawM <= 59 ? rawM : 0;
  const durationMin = Math.max(15, options.dailyMinutesTarget || 25);
  const startTotal = hh * 60 + mm;
  const endTotal = startTotal + durationMin;
  const endH = Math.floor((endTotal % 1440) / 60);
  const endM = endTotal % 60;

  const baseOrigin =
    typeof window !== 'undefined' && window.location
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://duy18nd.github.io/QuizzApp_Japan/';

  let created = 0;
  let updated = 0;
  let failed = 0;
  let processed = 0;

  // Batch 4 concurrent requests at a time to stay well within Google Calendar API rate limits
  const BATCH_SIZE = 4;
  for (let i = 0; i < targetStages.length; i += BATCH_SIZE) {
    const batch = targetStages.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (stage) => {
        const endDateKey =
          endTotal >= 1440 ? addDaysToDateKey(stage.scheduledDate, 1) : stage.scheduledDate;
        const stageLink = `${baseOrigin}#/roadmap?stage=${encodeURIComponent(stage.id)}`;
        const taskLines = stage.tasks
          .map((t, idx) => `${idx + 1}. ${t.title.replace(/\s*\([^)]*\)/g, '').trim()} (~${t.minutes}p)`)
          .join('\n');

        const eventBody = {
          summary: `🇯🇵 Ngày ${stage.stageNumber} (${options.level}): ${stage.title.replace(/\s*\([^)]*\)/g, '').trim()}`,
          description: [
            `Lộ trình ${options.level} · ${options.bookTitle}`,
            `Chủ đề: ${stage.theme}`,
            '',
            'Nhiệm vụ hôm nay (đúng 100% qua bài):',
            taskLines,
            '• Chặng cuối: Mini-Test Chốt Màn (100%)',
            '',
            `👉 Vào học ngay: ${stageLink}`,
          ].join('\n'),
          start: {
            dateTime: buildIsoLocalDateTime(stage.scheduledDate, hh, mm),
            timeZone: DEFAULT_TIMEZONE,
          },
          end: {
            dateTime: buildIsoLocalDateTime(endDateKey, endH, endM),
            timeZone: DEFAULT_TIMEZONE,
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 10 },
              { method: 'popup', minutes: 0 },
            ],
          },
          extendedProperties: {
            private: {
              nihongoApp: 'roadmap-v1',
              stageId: stage.id,
            },
          },
        };

        const existingEventId = existingCheck.map.get(stage.id);
        const endpoint = existingEventId
          ? `${GCAL_API_BASE}/${encodeURIComponent(existingEventId)}`
          : GCAL_API_BASE;
        const method = existingEventId ? 'PATCH' : 'POST';

        try {
          const res = await fetch(endpoint, {
            method,
            headers: {
              Authorization: `Bearer ${providerToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventBody),
          });
          if (res.ok) {
            if (existingEventId) updated += 1;
            else created += 1;
          } else {
            failed += 1;
          }
        } catch {
          failed += 1;
        } finally {
          processed += 1;
          options.onProgress?.(processed, targetStages.length);
        }
      }),
    );
  }

  return {
    ok: failed < targetStages.length,
    created,
    updated,
    failed,
    total: targetStages.length,
    errorMessage:
      failed > 0
        ? `Đồng bộ thành công ${created + updated}/${targetStages.length} ngày (${failed} ngày lỗi mạng).`
        : undefined,
  };
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldIcsLine(line: string): string {
  // Wrap long lines cleanly on codepoint boundaries so emoji/CJK characters are never split
  const chars = Array.from(line);
  if (chars.length <= 70) return line;
  const parts: string[] = [chars.slice(0, 70).join('')];
  for (let i = 70; i < chars.length; i += 69) {
    parts.push(` ${chars.slice(i, i + 69).join('')}`);
  }
  return parts.join('\r\n');
}

function formatIcsLocalStamp(dateKey: string, hh: number, mm: number): string {
  const ymd = dateKey.replace(/-/g, '');
  const hStr = String(hh).padStart(2, '0');
  const mStr = String(mm).padStart(2, '0');
  return `${ymd}T${hStr}${mStr}00`;
}

/**
 * Generates and downloads an RFC 5545 `.ics` calendar file containing every remaining
 * daily stage (with stage tasks, deep link, and 10m + 0m VALARM notifications).
 * Opens natively in 1 tap on iPhone/Mac Apple Calendar, or via Import on PC Google Calendar.
 */
export function downloadRoadmapIcsFile(options: {
  stages: RoadmapStage[];
  completedStageIds: Set<string>;
  level: string;
  bookTitle: string;
  reminderTime: string;
  dailyMinutesTarget: DailyMinutesTarget;
}): { count: number; filename: string } {
  const todayKey = getLocalDateKey();
  const targetStages = options.stages
    .filter((s) => !options.completedStageIds.has(s.id) && s.scheduledDate >= todayKey)
    .slice(0, 60);

  if (targetStages.length === 0) {
    return { count: 0, filename: '' };
  }

  const [rawH, rawM] = (options.reminderTime || '20:00').split(':').map(Number);
  const hh = Number.isFinite(rawH) && rawH >= 0 && rawH <= 23 ? rawH : 20;
  const mm = Number.isFinite(rawM) && rawM >= 0 && rawM <= 59 ? rawM : 0;
  const durationMin = Math.max(15, options.dailyMinutesTarget || 25);
  const startTotal = hh * 60 + mm;
  const endTotal = startTotal + durationMin;
  const endH = Math.floor((endTotal % 1440) / 60);
  const endM = endTotal % 60;

  const baseOrigin =
    typeof window !== 'undefined' && window.location
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://duy18nd.github.io/QuizzApp_Japan/';

  const now = new Date();
  const dtStamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}${String(now.getUTCSeconds()).padStart(2, '0')}Z`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nihongo Toi//Stage Roadmap//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Nihongo ${options.level} (${options.bookTitle})`,
    `X-WR-TIMEZONE:${DEFAULT_TIMEZONE}`,
  ];

  for (const stage of targetStages) {
    const endDateKey =
      endTotal >= 1440 ? addDaysToDateKey(stage.scheduledDate, 1) : stage.scheduledDate;
    const stageLink = `${baseOrigin}#/roadmap?stage=${encodeURIComponent(stage.id)}`;
    const taskLines = stage.tasks
      .map((t, idx) => `${idx + 1}. ${t.title.replace(/\s*\([^)]*\)/g, '').trim()} (~${t.minutes}p)`)
      .join('\n');
    const summary = `🇯🇵 Ngày ${stage.stageNumber} (${options.level}): ${stage.title.replace(/\s*\([^)]*\)/g, '').trim()}`;
    const desc = [
      `Lộ trình ${options.level} · ${options.bookTitle}`,
      `Chủ đề: ${stage.theme}`,
      '',
      'Nhiệm vụ hôm nay:',
      taskLines,
      '• Chốt Màn (100%)',
      '',
      `Vào học ngay: ${stageLink}`,
    ].join('\n');

    lines.push(
      'BEGIN:VEVENT',
      foldIcsLine(`UID:${stage.id}@nihongo-toi.local`),
      `DTSTAMP:${dtStamp}`,
      `DTSTART;TZID=${DEFAULT_TIMEZONE}:${formatIcsLocalStamp(stage.scheduledDate, hh, mm)}`,
      `DTEND;TZID=${DEFAULT_TIMEZONE}:${formatIcsLocalStamp(endDateKey, endH, endM)}`,
      foldIcsLine(`SUMMARY:${escapeIcsText(summary)}`),
      foldIcsLine(`DESCRIPTION:${escapeIcsText(desc)}`),
      foldIcsLine(`URL:${stageLink}`),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:-PT10M',
      foldIcsLine(`DESCRIPTION:${escapeIcsText(`Còn 10 phút tới giờ học ${summary}`)}`),
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:PT0M',
      foldIcsLine(`DESCRIPTION:${escapeIcsText(`Đến giờ học ngay: ${summary}`)}`),
      'END:VALARM',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  const icsContent = `${lines.join('\r\n')}\r\n`;
  const filename = `nihongo-lotrinh-${options.level.toLowerCase()}.ics`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
  }

  return { count: targetStages.length, filename };
}
