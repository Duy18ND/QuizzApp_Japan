/**
 * Nihongo 問 — Reading / Listening "đã làm" (✓) progress.
 *
 * Signed-in users: one reserved `user_progress` row (`item_type = 'mistake'`,
 * `item_id = JLPT_PROGRESS_ITEM_ID`, payload in `metadata_json.jlptDone`), cached in memory per
 * account and written back (debounced) to Supabase. Guests keep it for the current session only.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { JLPT_PROGRESS_ITEM_ID } from './cloudProgressWriter';
import { isSupabaseAccountUuid } from './sessionScope';
import { supabase } from './supabaseClient';

export type JlptDoneKind = 'reading' | 'listening';

export interface JlptDoneState {
  reading: string[];
  listening: string[];
}

const EMPTY: JlptDoneState = { reading: [], listening: [] };
const GUEST_KEY = '__guest__';
const MAX_IDS_PER_KIND = 2000;

const cache = new Map<string, JlptDoneState>();
const loading = new Set<string>();
const listeners = new Set<() => void>();
const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

function keyFor(userId: string | null | undefined): string {
  return isSupabaseAccountUuid(userId) ? userId : GUEST_KEY;
}

function emit(): void {
  for (const fn of listeners) fn();
}

function sanitize(raw: unknown): JlptDoneState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY;
  const obj = raw as Record<string, unknown>;
  const ids = (v: unknown) =>
    Array.isArray(v)
      ? Array.from(new Set(v.filter((x): x is string => typeof x === 'string'))).slice(-MAX_IDS_PER_KIND)
      : [];
  return { reading: ids(obj.reading), listening: ids(obj.listening) };
}

async function loadFromCloud(userId: string): Promise<void> {
  if (!supabase || loading.has(userId) || cache.has(userId)) return;
  loading.add(userId);
  try {
    const { data } = await supabase
      .from('user_progress')
      .select('metadata_json')
      .eq('user_id', userId)
      .eq('item_type', 'mistake')
      .eq('item_id', JLPT_PROGRESS_ITEM_ID)
      .maybeSingle();
    const meta = (data?.metadata_json ?? null) as Record<string, unknown> | null;
    const remote = sanitize(meta?.jlptDone);
    // Merge with anything marked while the request was in flight
    const local = cache.get(userId) ?? EMPTY;
    cache.set(userId, {
      reading: Array.from(new Set([...remote.reading, ...local.reading])),
      listening: Array.from(new Set([...remote.listening, ...local.listening])),
    });
    emit();
  } catch {
    // Offline: keep what we have in memory
  } finally {
    loading.delete(userId);
  }
}

function schedulePersist(userId: string): void {
  if (!supabase) return;
  const existing = persistTimers.get(userId);
  if (existing) clearTimeout(existing);
  persistTimers.set(
    userId,
    setTimeout(() => {
      persistTimers.delete(userId);
      const state = cache.get(userId);
      if (!state || !supabase) return;
      void supabase
        .from('user_progress')
        .upsert(
          {
            user_id: userId,
            item_type: 'mistake',
            item_id: JLPT_PROGRESS_ITEM_ID,
            status: 'learning',
            score: state.reading.length + state.listening.length,
            attempts: 0,
            starred: false,
            wrong_count: 0,
            metadata_json: { jlptDone: state },
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,item_type,item_id' },
        )
        .then(({ error }) => {
          if (error) console.warn('Could not save reading/listening progress:', error.message);
        });
    }, 500),
  );
}

/** Marks a reading passage / listening item as done (✓). */
export function markJlptItemDone(userId: string | null | undefined, kind: JlptDoneKind, itemId: string): void {
  const key = keyFor(userId);
  const current = cache.get(key) ?? EMPTY;
  if (current[kind].includes(itemId)) return;
  cache.set(key, { ...current, [kind]: [...current[kind], itemId].slice(-MAX_IDS_PER_KIND) });
  emit();
  if (key !== GUEST_KEY) schedulePersist(key);
}

/** Done ids of the current account (loads them from the cloud the first time). */
export function useJlptDone(userId: string | null | undefined): JlptDoneState {
  const key = keyFor(userId);
  const state = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => cache.get(key) ?? EMPTY,
    () => EMPTY,
  );
  useEffect(() => {
    if (key !== GUEST_KEY) void loadFromCloud(key);
  }, [key]);
  return state;
}

/** Wipes cached progress on logout / account switch. */
export function clearJlptProgressCache(): void {
  cache.clear();
  emit();
}
