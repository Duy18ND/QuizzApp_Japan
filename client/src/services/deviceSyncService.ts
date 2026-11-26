/**
 * Keeps the learning data that is cached in this browser (daily activity, stage tests,
 * saved Kanji, textbook choice, mini-game high scores) and the app settings the same on
 * every device of an account. Stored as one reserved `user_progress` row; guests are never uploaded.
 */
import { VOCAB_TEXTBOOK_PREFERENCES_KEY, VOCAB_TEXTBOOK_SYNC_EVENT } from '../data/vocabTextbooks';
import { loadAppSettings, saveAppSettings, SETTINGS_STORAGE_KEY } from '../hooks/useAppSettings';
import { applyStoredTheme, THEME_STORAGE_KEY } from '../hooks/useTheme';
import { VOICE_PREFS_STORAGE_KEY } from '../utils/dialogueAudioEngine';
import { HIGH_SCORE_KEY, HIGH_SCORE_SYNC_EVENT, UI_MARKS_KEY } from './deviceSyncEvents';
import {
  mergeDeviceData,
  sanitizeDeviceData,
  stableJson,
  type DeviceData,
} from './deviceSyncMerge';
import { SAVED_KANJI_SYNC_EVENT } from './kanjiBookmarkService';
import { isSupabaseAccountUuid } from './sessionScope';
import { DAILY_STAGE_ACTIVITY_SYNC_EVENT } from './stageRoadmapService';
import { supabase } from './supabaseClient';

const DEVICE_SYNC_ITEM_ID = '__device_sync__';

const keys = (uid: string) => ({
  boss: `nihonmaster_stage_boss_pass_v1:${uid}`,
  understood: `nihonmaster_stage_briefing_ok_v1:${uid}`,
  skipped: `nihonmaster_stage_gate_skip_v1:${uid}`,
  activity: `nihonmaster_daily_stage_activity_v1:${uid}:`,
  metrics: `nihonmaster_daily_stage_metrics_v1:${uid}:`,
  kanji: `nihonmaster_saved_kanji_v1:${uid}`,
  kanjiMarks: `nihonmaster_saved_kanji_marks_v1:${uid}`,
  prefMarks: `nihonmaster_vocab_pref_marks_v1:${uid}`,
  highScores: `${HIGH_SCORE_KEY}:${uid}`,
});

function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the account copy is still correct
  }
}

/**
 * Voices are installed per operating system (a PC voice rarely exists on a phone), so the
 * chosen voice stays on each device; everything else is shared.
 */
const DEVICE_ONLY_FIELDS = { app: 'ttsVoiceUri', voice: 'archetypeVoiceUriOverrides' } as const;
const OBJECT_SETTINGS = [
  ['app', SETTINGS_STORAGE_KEY],
  ['voice', VOICE_PREFS_STORAGE_KEY],
] as const;

function readTheme(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function readUi(): DeviceData['ui'] {
  const marks = (readJson(UI_MARKS_KEY) ?? {}) as Record<string, number>;
  const ui: DeviceData['ui'] = {};
  const theme = readTheme();
  if (theme) ui.theme = { value: theme, at: marks.theme ?? 0 };
  for (const [name, key] of OBJECT_SETTINGS) {
    const stored = readJson(key);
    if (!stored || typeof stored !== 'object') continue;
    const shared = { ...(stored as Record<string, unknown>) };
    delete shared[DEVICE_ONLY_FIELDS[name]];
    ui[name] = { value: shared, at: marks[name] ?? 0 };
  }
  return ui;
}

function writeUi(ui: DeviceData['ui']): void {
  const current = readUi();
  const marks = (readJson(UI_MARKS_KEY) ?? {}) as Record<string, number>;
  for (const [name, choice] of Object.entries(ui)) {
    marks[name] = choice.at;
    if (current[name] && stableJson(current[name].value) === stableJson(choice.value)) continue;
    if (name === 'theme') {
      if (choice.value !== 'light' && choice.value !== 'dark') continue;
      window.localStorage.setItem(THEME_STORAGE_KEY, choice.value);
      applyStoredTheme();
    } else if (name === 'app' || name === 'voice') {
      const key = name === 'app' ? SETTINGS_STORAGE_KEY : VOICE_PREFS_STORAGE_KEY;
      const field = DEVICE_ONLY_FIELDS[name];
      const own = (readJson(key) as Record<string, unknown> | undefined)?.[field];
      const next = {
        ...(choice.value as Record<string, unknown>),
        ...(own === undefined ? {} : { [field]: own }),
      };
      writeJson(key, next);
      // announces the change to open screens
      if (name === 'app') saveAppSettings(loadAppSettings());
    }
  }
  writeJson(UI_MARKS_KEY, marks);
}

function readLocal(uid: string): DeviceData {
  const k = keys(uid);
  const activity: Record<string, unknown> = {};
  const metrics: Record<string, unknown> = {};
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(k.activity)) activity[key.slice(k.activity.length)] = readJson(key);
    if (key?.startsWith(k.metrics)) metrics[key.slice(k.metrics.length)] = readJson(key);
  }
  const allPrefs = (readJson(VOCAB_TEXTBOOK_PREFERENCES_KEY) ?? {}) as Record<string, unknown>;
  const prefs = Object.fromEntries(
    Object.entries(allPrefs)
      .filter(([key]) => key.startsWith(`${uid}:`))
      .map(([key, value]) => [key.slice(uid.length + 1), value]),
  );
  return sanitizeDeviceData({
    boss: readJson(k.boss),
    understood: readJson(k.understood),
    skipped: readJson(k.skipped),
    activity,
    metrics,
    kanji: readJson(k.kanji),
    kanjiMarks: readJson(k.kanjiMarks),
    prefs,
    prefMarks: readJson(k.prefMarks),
    // scores saved before they were per-account live under the shared key
    highScores: readJson(k.highScores) ?? readJson(HIGH_SCORE_KEY),
    ui: readUi(),
  });
}

function writeLocal(uid: string, data: DeviceData): void {
  const k = keys(uid);
  writeJson(k.boss, data.boss);
  writeJson(k.understood, data.understood);
  writeJson(k.skipped, data.skipped);
  for (const [date, skills] of Object.entries(data.activity)) writeJson(k.activity + date, skills);
  for (const [date, value] of Object.entries(data.metrics)) writeJson(k.metrics + date, value);
  writeJson(k.kanji, data.kanji);
  writeJson(k.kanjiMarks, data.kanjiMarks);
  writeJson(k.prefMarks, data.prefMarks);
  writeJson(k.highScores, data.highScores);
  writeUi(data.ui);
  const allPrefs = (readJson(VOCAB_TEXTBOOK_PREFERENCES_KEY) ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(data.prefs)) allPrefs[`${uid}:${key}`] = value;
  writeJson(VOCAB_TEXTBOOK_PREFERENCES_KEY, allPrefs);
}

function announce(uid: string): void {
  for (const name of [
    DAILY_STAGE_ACTIVITY_SYNC_EVENT,
    SAVED_KANJI_SYNC_EVENT,
    VOCAB_TEXTBOOK_SYNC_EVENT,
    HIGH_SCORE_SYNC_EVENT,
  ]) {
    window.dispatchEvent(new CustomEvent(name, { detail: { userId: uid } }));
  }
}

async function runSync(uid: string): Promise<void> {
  if (!supabase) return;
  const { data: row, error } = await supabase
    .from('user_progress')
    .select('metadata_json')
    .eq('user_id', uid)
    .eq('item_type', 'mistake')
    .eq('item_id', DEVICE_SYNC_ITEM_ID)
    .maybeSingle();
  // Never upload without having read the account copy: it could be overwritten
  if (error) return;

  const meta = (row?.metadata_json ?? null) as Record<string, unknown> | null;
  const remote = sanitizeDeviceData(meta?.device);
  const local = readLocal(uid);
  const merged = mergeDeviceData(local, remote);

  if (stableJson(merged) !== stableJson(local)) {
    writeLocal(uid, merged);
    announce(uid);
  }
  if (!row || stableJson(merged) !== stableJson(remote)) {
    const { error: writeError } = await supabase.from('user_progress').upsert(
      {
        user_id: uid,
        item_type: 'mistake',
        item_id: DEVICE_SYNC_ITEM_ID,
        status: 'learning',
        score: 0,
        attempts: 0,
        starred: false,
        wrong_count: 0,
        metadata_json: { device: merged },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,item_type,item_id' },
    );
    if (writeError) console.warn('Could not upload device data:', writeError.message);
  }
}

let queue: Promise<void> = Promise.resolve();

/** Pull, merge and push. Calls run one after another. */
export function syncDeviceData(uid: string): Promise<void> {
  if (!supabase || typeof window === 'undefined' || !isSupabaseAccountUuid(uid)) {
    return Promise.resolve();
  }
  queue = queue.then(() => runSync(uid)).catch((err: unknown) => {
    console.warn('Device data sync failed:', err);
  });
  return queue;
}
