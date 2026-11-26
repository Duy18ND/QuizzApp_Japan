import { notifyDeviceDataChanged } from './deviceSyncEvents';

const SAVED_KANJI_KEY_PREFIX = 'nihonmaster_saved_kanji_v1:';
const SAVED_KANJI_MARKS_PREFIX = 'nihonmaster_saved_kanji_marks_v1:';
export const SAVED_KANJI_SYNC_EVENT = 'nihonmaster:saved-kanji-sync';

export function loadSavedKanjiIds(userId?: string | null): string[] {
  if (typeof window === 'undefined') return [];
  const owner = userId || 'guest';
  try {
    const raw = window.localStorage.getItem(`${SAVED_KANJI_KEY_PREFIX}${owner}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter((x): x is string => typeof x === 'string' && x.length > 0)));
  } catch {
    return [];
  }
}

export function saveSavedKanjiIds(ids: string[], userId?: string | null): string[] {
  const unique = Array.from(new Set(ids.filter((x) => typeof x === 'string' && x.length > 0)));
  if (typeof window === 'undefined') return unique;
  const owner = userId || 'guest';
  try {
    window.localStorage.setItem(`${SAVED_KANJI_KEY_PREFIX}${owner}`, JSON.stringify(unique));
    window.dispatchEvent(
      new CustomEvent(SAVED_KANJI_SYNC_EVENT, { detail: { ids: unique, userId: owner } }),
    );
  } catch {
    // Ignore storage errors
  }
  return unique;
}

export function toggleSavedKanjiId(kanjiId: string, userId?: string | null): {
  saved: boolean;
  ids: string[];
} {
  const current = loadSavedKanjiIds(userId);
  const exists = current.includes(kanjiId);
  const next = exists ? current.filter((id) => id !== kanjiId) : [...current, kanjiId];
  try {
    const key = `${SAVED_KANJI_MARKS_PREFIX}${userId || 'guest'}`;
    const marks = JSON.parse(window.localStorage.getItem(key) ?? '{}') as Record<string, unknown>;
    marks[kanjiId] = { on: !exists, at: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(marks));
  } catch {
    // Ignore storage errors
  }
  const stored = saveSavedKanjiIds(next, userId);
  notifyDeviceDataChanged();
  return { saved: !exists, ids: stored };
}
