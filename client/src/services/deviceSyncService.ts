/**
 * Keeps the learning data that is cached in this browser (daily activity, stage tests,
 * saved Kanji, textbook choice, mini-game high scores) the same on every device of an
 * account. Stored as one reserved `user_progress` row; guests are never uploaded.
 */
import { VOCAB_TEXTBOOK_PREFERENCES_KEY, VOCAB_TEXTBOOK_SYNC_EVENT } from '../data/vocabTextbooks';
import { HIGH_SCORE_KEY, HIGH_SCORE_SYNC_EVENT } from './deviceSyncEvents';
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
