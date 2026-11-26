/**
 * Pure merge rules for the small learning data that lives in a per-device cache
 * (see deviceSyncService.ts). Everything here only ever combines two copies, so a
 * device with old data cannot erase what another device added.
 */

/** A yes/no choice with the time it was made: the latest choice wins. */
export interface Mark {
  on: boolean;
  at: number;
}

export interface BossRecord {
  accuracyPct: number;
  [key: string]: unknown;
}

export interface DailyMetrics {
  vocabIds: string[];
  kanjiIds: string[];
  grammarIds: string[];
}

export interface DeviceData {
  boss: Record<string, BossRecord>;
  understood: string[];
  skipped: string[];
  /** dateKey → skills practised that day */
  activity: Record<string, string[]>;
  metrics: Record<string, DailyMetrics>;
  kanji: string[];
  kanjiMarks: Record<string, Mark>;
  /** "N5" → textbook id, "level" → preferred level */
  prefs: Record<string, string>;
  prefMarks: Record<string, number>;
  highScores: Record<string, number>;
}

const KEEP_DAYS = 14;

const isObject = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === 'object' && !Array.isArray(v);

export const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : [];

const asObject = <T>(v: unknown, keep: (value: unknown) => boolean): Record<string, T> =>
  isObject(v)
    ? (Object.fromEntries(Object.entries(v).filter(([, value]) => keep(value))) as Record<string, T>)
    : {};

const union = (a: string[], b: string[]) => Array.from(new Set([...a, ...b])).sort();

const mergeKeys = <T>(
  a: Record<string, T>,
  b: Record<string, T>,
  both: (x: T, y: T) => T,
): Record<string, T> => {
  const out: Record<string, T> = { ...a };
  for (const [key, value] of Object.entries(b)) {
    out[key] = key in out ? both(out[key], value) : value;
  }
  return out;
};

const latestDays = <T>(map: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.keys(map).sort().slice(-KEEP_DAYS).map((k) => [k, map[k]]));

export function sanitizeDeviceData(raw: unknown): DeviceData {
  const o = isObject(raw) ? raw : {};
  const metrics = asObject<Record<string, unknown>>(o.metrics, isObject);
  return {
    boss: asObject<BossRecord>(o.boss, (v) => isObject(v) && typeof v.accuracyPct === 'number'),
    understood: asStrings(o.understood),
    skipped: asStrings(o.skipped),
    activity: Object.fromEntries(
      Object.entries(asObject<unknown>(o.activity, Array.isArray)).map(([k, v]) => [k, asStrings(v)]),
    ),
    metrics: Object.fromEntries(
      Object.entries(metrics).map(([k, v]) => [
        k,
        {
          vocabIds: asStrings(v.vocabIds),
          kanjiIds: asStrings(v.kanjiIds),
          grammarIds: asStrings(v.grammarIds),
        },
      ]),
    ),
    kanji: asStrings(o.kanji),
    kanjiMarks: asObject<Mark>(
      o.kanjiMarks,
      (v) => isObject(v) && typeof v.on === 'boolean' && typeof v.at === 'number',
    ),
    prefs: asObject<string>(o.prefs, (v) => typeof v === 'string'),
    prefMarks: asObject<number>(o.prefMarks, (v) => typeof v === 'number'),
    highScores: asObject<number>(o.highScores, (v) => typeof v === 'number'),
  };
}

export function mergeDeviceData(local: DeviceData, remote: DeviceData): DeviceData {
  const kanjiMarks = mergeKeys(local.kanjiMarks, remote.kanjiMarks, (a, b) => (b.at > a.at ? b : a));
  const kanji = union(
    union(local.kanji, remote.kanji),
    Object.keys(kanjiMarks).filter((id) => kanjiMarks[id].on),
  ).filter((id) => kanjiMarks[id]?.on !== false);

  // Preferences: the later choice wins; with no timestamps the account's value wins.
  const prefs: Record<string, string> = { ...local.prefs };
  for (const [key, value] of Object.entries(remote.prefs)) {
    if (!(key in prefs) || (remote.prefMarks[key] ?? 0) >= (local.prefMarks[key] ?? 0)) {
      prefs[key] = value;
    }
  }

  return {
    boss: mergeKeys(local.boss, remote.boss, (a, b) => (b.accuracyPct > a.accuracyPct ? b : a)),
    understood: union(local.understood, remote.understood),
    skipped: union(local.skipped, remote.skipped),
    activity: latestDays(mergeKeys(local.activity, remote.activity, union)),
    metrics: latestDays(
      mergeKeys(local.metrics, remote.metrics, (a, b) => ({
        vocabIds: union(a.vocabIds, b.vocabIds),
        kanjiIds: union(a.kanjiIds, b.kanjiIds),
        grammarIds: union(a.grammarIds, b.grammarIds),
      })),
    ),
    kanji,
    kanjiMarks,
    prefs,
    prefMarks: mergeKeys(local.prefMarks, remote.prefMarks, Math.max),
    highScores: mergeKeys(local.highScores, remote.highScores, Math.max),
  };
}

/** JSON with sorted keys: Postgres jsonb does not keep key order. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (isObject(value)) {
    return `{${Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
