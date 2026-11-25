/**
 * Nihongo 問 — Direct-to-Supabase Progress Persistence & Per-Account In-Memory Cache
 *
 * Replaces localStorage-based progress caching:
 * - Every authenticated user action (wrong quiz answer, star toggle, grammar mistake, Kanji practice,
 *   grammar score, reset) writes immediately to Supabase (`public.user_progress` / `public.quiz_attempts`)
 *   scoped by `user_id` (`auth.uid() = user_id` RLS).
 * - In-memory per-account maps hold hydrated cloud state for 0ms UI updates while signed in
 *   and are wiped cleanly on explicit logout.
 */

import type { GrammarMistake, GrammarProgress, PracticeType } from '../types/grammar';
import type { UserProgress } from '../types/quiz';
import { isSupabaseAccountUuid } from './sessionScope';
import { supabase } from './supabaseClient';

export interface KanjiProgressEntry {
  kanjiId: string;
  learned: boolean;
  tutorialSeen: boolean;
  writingAttempts: number;
  correctAttempts: number;
  lastPracticedAt: string;
}

export interface QuizHistoryAttemptEntry {
  id: string;
  quizType: string;
  level: string;
  score: number;
  totalQuestions: number;
  durationSeconds: number;
  mistakesJson: unknown[];
  createdAt: string;
}

export const PRACTICE_TYPE_KEYS: Array<keyof GrammarProgress> = [
  'multiple_choice',
  'fill_blank',
  'star_question',
  'conjugation',
  'sentence_ordering',
  'ja_to_vi',
  'vi_to_ja',
  'sentence_transformation',
  'grammar_selection',
  'text_input',
  'free_writing',
  'mixed',
];

export const MISTAKE_RESOLUTIONS_ITEM_ID = '__attempt_mistake_resolutions__';
export const ONLINE_TIME_CLOUD_ITEM_ID = '__daily_online_study_time__';
export const USER_CUSTOM_STUDIO_ITEM_ID = '__user_custom_studio__';
/** Mini-game Ninja belt XP + daily challenge dates (see miniGameProfileService.ts) */
export const MINIGAME_PROFILE_ITEM_ID = '__minigame_profile__';
/** Reading / Listening items marked done (see jlptProgressService.ts) */
export const JLPT_PROGRESS_ITEM_ID = '__jlpt_done_items__';
/** Best JLPT mock-exam result per preset (see JlptFullTestView.tsx) */
export const JLPT_EXAM_RESULTS_ITEM_ID = '__jlpt_exam_results__';

export interface AttemptMistakeResolutions {
  resolvedItemKeys: string[];
  clearedAttemptIds: string[];
}

const ramVocabProgress = new Map<string, UserProgress>();
const ramKanjiState = new Map<string, { progress: Record<string, KanjiProgressEntry>; tutorialSeen: boolean }>();
const ramGrammarRecords = new Map<string, Record<string, GrammarProgress>>();
const ramMistakes = new Map<string, GrammarMistake[]>();
const ramMistakeResolutions = new Map<string, AttemptMistakeResolutions>();
const ramQuizHistory = new Map<string, QuizHistoryAttemptEntry[]>();
const ramStudySchedules = new Map<string, Record<string, unknown>>();
const ramOnlineTime = new Map<string, Record<string, number>>();
const ramCustomStudio = new Map<string, Record<string, unknown>>();

export function getInMemoryUserProgress(uid: string): UserProgress {
  return ramVocabProgress.get(uid) ?? { starredWords: [], wrongWords: {} };
}

export function setInMemoryUserProgress(uid: string, value: UserProgress): void {
  ramVocabProgress.set(uid, value);
}

export function getInMemoryKanjiState(uid: string): {
  progress: Record<string, KanjiProgressEntry>;
  tutorialSeen: boolean;
} {
  return ramKanjiState.get(uid) ?? { progress: {}, tutorialSeen: false };
}

export function setInMemoryKanjiState(
  uid: string,
  value: { progress: Record<string, KanjiProgressEntry>; tutorialSeen: boolean },
): void {
  ramKanjiState.set(uid, value);
}

export function getInMemoryGrammarMap(uid: string): Record<string, GrammarProgress> {
  return ramGrammarRecords.get(uid) ?? {};
}

export function setInMemoryGrammarMap(uid: string, value: Record<string, GrammarProgress>): void {
  ramGrammarRecords.set(uid, value);
}

export function getInMemoryMistakes(uid: string): GrammarMistake[] {
  return ramMistakes.get(uid) ?? [];
}

export function setInMemoryMistakes(uid: string, value: GrammarMistake[]): void {
  ramMistakes.set(uid, value);
}

export function getInMemoryMistakeResolutions(uid: string): AttemptMistakeResolutions {
  return ramMistakeResolutions.get(uid) ?? { resolvedItemKeys: [], clearedAttemptIds: [] };
}

export function setInMemoryMistakeResolutions(uid: string, value: AttemptMistakeResolutions): void {
  ramMistakeResolutions.set(uid, value);
}

export async function writeMistakeResolutionsDirectToSupabase(
  userId: string,
  resolutions: AttemptMistakeResolutions,
): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(userId)) return;
  try {
    await supabase.from('user_progress').upsert(
      {
        user_id: userId,
        item_type: 'mistake',
        item_id: MISTAKE_RESOLUTIONS_ITEM_ID,
        status: 'resolved',
        score: 0,
        attempts: 0,
        starred: false,
        wrong_count: 0,
        metadata_json: {
          resolvedItemKeys: resolutions.resolvedItemKeys.slice(-500),
          clearedAttemptIds: resolutions.clearedAttemptIds.slice(-100),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,item_type,item_id' },
    );
  } catch (err) {
    console.warn('Could not persist mistake resolutions to Supabase:', err);
  }
}

export function getInMemoryQuizHistory(uid: string): QuizHistoryAttemptEntry[] {
  return ramQuizHistory.get(uid) ?? [];
}

export function setInMemoryQuizHistory(uid: string, value: QuizHistoryAttemptEntry[]): void {
  ramQuizHistory.set(uid, value);
}

export function getInMemoryStudySchedule(uid: string): Record<string, unknown> | null {
  return ramStudySchedules.get(uid) ?? null;
}

export function setInMemoryStudySchedule(uid: string, value: Record<string, unknown>): void {
  ramStudySchedules.set(uid, value);
}

export function getInMemoryOnlineTime(uid: string): Record<string, number> {
  return ramOnlineTime.get(uid) ?? {};
}

export function setInMemoryOnlineTime(uid: string, value: Record<string, number>): void {
  ramOnlineTime.set(uid, value);
}

export async function writeOnlineTimeDirectToSupabase(
  userId: string,
  onlineMap: Record<string, number>,
): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(userId)) return;
  const trimmedEntries = Object.entries(onlineMap)
    .filter(([, secs]) => typeof secs === 'number' && Number.isFinite(secs) && secs > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-90);
  if (trimmedEntries.length === 0) return;

  const dailySeconds: Record<string, number> = {};
  let totalSeconds = 0;
  for (const [dateKey, secs] of trimmedEntries) {
    const clean = Math.min(86_400, Math.floor(secs));
    dailySeconds[dateKey] = clean;
    totalSeconds += clean;
  }

  try {
    await supabase.from('user_progress').upsert(
      {
        user_id: userId,
        item_type: 'mistake',
        item_id: ONLINE_TIME_CLOUD_ITEM_ID,
        status: 'learning',
        score: totalSeconds,
        attempts: trimmedEntries.length,
        starred: false,
        wrong_count: 0,
        metadata_json: { dailySeconds },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,item_type,item_id' },
    );
  } catch (err) {
    console.warn('Could not persist online study time to Supabase:', err);
  }
}

export function getInMemoryCustomStudio(uid: string): Record<string, unknown> | null {
  return ramCustomStudio.get(uid) ?? null;
}

export function setInMemoryCustomStudio(uid: string, value: Record<string, unknown>): void {
  ramCustomStudio.set(uid, value);
}

export async function writeCustomStudioDirectToSupabase(
  userId: string,
  studioPayload: Record<string, unknown>,
): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(userId)) return;
  try {
    await supabase.from('user_progress').upsert(
      {
        user_id: userId,
        item_type: 'mistake',
        item_id: USER_CUSTOM_STUDIO_ITEM_ID,
        status: 'learning',
        score: 0,
        attempts: 0,
        starred: false,
        wrong_count: 0,
        metadata_json: { studio: studioPayload },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,item_type,item_id' },
    );
  } catch (err) {
    console.warn('Could not persist custom studio to Supabase:', err);
  }
}

export function clearInMemoryAccountData(uid?: string | null): void {
  if (uid) {
    ramVocabProgress.delete(uid);
    ramKanjiState.delete(uid);
    ramGrammarRecords.delete(uid);
    ramMistakes.delete(uid);
    ramMistakeResolutions.delete(uid);
    ramQuizHistory.delete(uid);
    ramStudySchedules.delete(uid);
    ramOnlineTime.delete(uid);
    ramCustomStudio.delete(uid);
    return;
  }
  ramVocabProgress.clear();
  ramKanjiState.clear();
  ramGrammarRecords.clear();
  ramMistakes.clear();
  ramMistakeResolutions.clear();
  ramQuizHistory.clear();
  ramStudySchedules.clear();
  ramOnlineTime.clear();
  ramCustomStudio.clear();
}

export function buildVocabCloudRow(
  userId: string,
  wordId: number,
  starred: boolean,
  wrongCount: number,
  now = new Date().toISOString(),
) {
  return {
    user_id: userId,
    item_type: 'vocab' as const,
    item_id: String(wordId),
    status: starred && wrongCount === 0 ? 'starred' : wrongCount > 0 ? 'needs_review' : 'learning',
    score: starred ? 100 : 0,
    attempts: wrongCount,
    starred,
    wrong_count: wrongCount,
    metadata_json: {},
    updated_at: now,
  };
}

export function buildKanjiCloudRow(
  userId: string,
  kanjiId: string,
  entry: KanjiProgressEntry,
  now = new Date().toISOString(),
) {
  return {
    user_id: userId,
    item_type: 'kanji' as const,
    item_id: kanjiId,
    status: entry.learned ? 'mastered' : 'learning',
    score: entry.correctAttempts,
    attempts: entry.writingAttempts,
    starred: false,
    wrong_count: Math.max(0, entry.writingAttempts - entry.correctAttempts),
    metadata_json: {
      tutorialSeen: entry.tutorialSeen,
      correctAttempts: entry.correctAttempts,
      lastPracticedAt: entry.lastPracticedAt,
    },
    updated_at: now,
  };
}

export function buildGrammarCloudRow(
  userId: string,
  grammarId: string,
  rec: GrammarProgress,
  now = new Date().toISOString(),
) {
  const bestScore = Math.max(0, ...PRACTICE_TYPE_KEYS.map((k) => Number(rec[k] ?? 0)));
  return {
    user_id: userId,
    item_type: 'grammar' as const,
    item_id: grammarId,
    status: bestScore >= 80 ? 'mastered' : bestScore > 0 ? 'learning' : 'new',
    score: bestScore,
    attempts: bestScore > 0 ? 1 : 0,
    starred: false,
    wrong_count: 0,
    metadata_json: { scores: rec },
    updated_at: now,
  };
}

export function buildMistakeCloudRow(
  userId: string,
  mistake: GrammarMistake,
  now = new Date().toISOString(),
) {
  const normalizedQid = mistake.questionId.trim().replace(/-\d{10,}$/, '');
  return {
    user_id: userId,
    item_type: 'mistake' as const,
    item_id: `${mistake.grammarId}::${normalizedQid}`,
    status: 'needs_review',
    score: 0,
    attempts: 1,
    starred: false,
    wrong_count: 1,
    metadata_json: { mistake: { ...mistake, questionId: normalizedQid } },
    updated_at: now,
  };
}

export function serializeToCloudRows(
  userId: string,
  userProgress: UserProgress,
  kanjiMap: Record<string, KanjiProgressEntry>,
  grammarMap: Record<string, GrammarProgress>,
  mistakes: GrammarMistake[],
): Array<Record<string, unknown>> {
  const now = new Date().toISOString();
  const rows: Array<Record<string, unknown>> = [];

  const vocabIds = new Set<number>([
    ...userProgress.starredWords,
    ...Object.keys(userProgress.wrongWords).map(Number).filter(Number.isFinite),
  ]);
  for (const wordId of vocabIds) {
    const starred = userProgress.starredWords.includes(wordId);
    const wrongCount = userProgress.wrongWords[wordId] || 0;
    rows.push(buildVocabCloudRow(userId, wordId, starred, wrongCount, now));
  }

  for (const [kanjiId, entry] of Object.entries(kanjiMap)) {
    rows.push(buildKanjiCloudRow(userId, kanjiId, entry, now));
  }

  for (const [grammarId, rec] of Object.entries(grammarMap)) {
    rows.push(buildGrammarCloudRow(userId, grammarId, rec, now));
  }

  for (const m of mistakes) {
    rows.push(buildMistakeCloudRow(userId, m, now));
  }

  return rows;
}

export async function writeVocabItemDirectToSupabase(
  uid: string,
  wordId: number,
  starred: boolean,
  wrongCount: number,
): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(uid)) return;
  try {
    if (!starred && wrongCount <= 0) {
      await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', uid)
        .eq('item_type', 'vocab')
        .eq('item_id', String(wordId));
      return;
    }
    await supabase
      .from('user_progress')
      .upsert(buildVocabCloudRow(uid, wordId, starred, wrongCount), {
        onConflict: 'user_id,item_type,item_id',
      });
  } catch (err) {
    console.warn('Direct vocab progress write failed:', err);
  }
}

export async function deleteAllVocabDirectFromSupabase(uid: string): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(uid)) return;
  try {
    await supabase.from('user_progress').delete().eq('user_id', uid).eq('item_type', 'vocab');
  } catch (err) {
    console.warn('Direct vocab progress reset failed:', err);
  }
}

export async function writeKanjiItemDirectToSupabase(
  uid: string,
  kanjiId: string,
  entry: KanjiProgressEntry,
): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(uid)) return;
  try {
    await supabase
      .from('user_progress')
      .upsert(buildKanjiCloudRow(uid, kanjiId, entry), {
        onConflict: 'user_id,item_type,item_id',
      });
  } catch (err) {
    console.warn('Direct kanji progress write failed:', err);
  }
}

export async function deleteAllKanjiDirectFromSupabase(uid: string): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(uid)) return;
  try {
    await supabase.from('user_progress').delete().eq('user_id', uid).eq('item_type', 'kanji');
  } catch (err) {
    console.warn('Direct kanji progress reset failed:', err);
  }
}

export async function writeGrammarItemDirectToSupabase(
  uid: string,
  grammarId: string,
  rec: GrammarProgress,
): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(uid)) return;
  try {
    await supabase
      .from('user_progress')
      .upsert(buildGrammarCloudRow(uid, grammarId, rec), {
        onConflict: 'user_id,item_type,item_id',
      });
  } catch (err) {
    console.warn('Direct grammar progress write failed:', err);
  }
}

export async function deleteAllGrammarDirectFromSupabase(uid: string): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(uid)) return;
  try {
    await supabase.from('user_progress').delete().eq('user_id', uid).eq('item_type', 'grammar');
  } catch (err) {
    console.warn('Direct grammar progress reset failed:', err);
  }
}

export async function writeMistakeItemDirectToSupabase(
  uid: string,
  mistake: GrammarMistake,
): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(uid)) return;
  try {
    await supabase
      .from('user_progress')
      .upsert(buildMistakeCloudRow(uid, mistake), {
        onConflict: 'user_id,item_type,item_id',
      });
  } catch (err) {
    console.warn('Direct mistake write failed:', err);
  }
}

export async function deleteMistakeItemDirectFromSupabase(
  uid: string,
  grammarId: string,
  questionId: string,
): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(uid)) return;
  const normalizedQid = questionId.trim().replace(/-\d{10,}$/, '');
  try {
    await supabase
      .from('user_progress')
      .delete()
      .eq('user_id', uid)
      .eq('item_type', 'mistake')
      .eq('item_id', `${grammarId}::${normalizedQid}`);
  } catch (err) {
    console.warn('Direct mistake delete failed:', err);
  }
}

export async function deleteMistakesByGrammarDirectFromSupabase(
  uid: string,
  grammarId: string,
): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(uid)) return;
  try {
    await supabase
      .from('user_progress')
      .delete()
      .eq('user_id', uid)
      .eq('item_type', 'mistake')
      .like('item_id', `${grammarId}::%`);
  } catch (err) {
    console.warn('Direct mistake group delete failed:', err);
  }
}

export async function deleteAllMistakesDirectFromSupabase(uid: string): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(uid)) return;
  try {
    await supabase
      .from('user_progress')
      .delete()
      .eq('user_id', uid)
      .eq('item_type', 'mistake')
      .neq('item_id', MISTAKE_RESOLUTIONS_ITEM_ID)
      .neq('item_id', ONLINE_TIME_CLOUD_ITEM_ID)
      .neq('item_id', USER_CUSTOM_STUDIO_ITEM_ID)
      .neq('item_id', MINIGAME_PROFILE_ITEM_ID)
      .neq('item_id', JLPT_PROGRESS_ITEM_ID)
      .neq('item_id', JLPT_EXAM_RESULTS_ITEM_ID);
  } catch (err) {
    console.warn('Direct mistakes reset failed:', err);
  }
}

export async function bulkUpsertProgressDirectToSupabase(
  uid: string,
  rows: Array<Record<string, unknown>>,
): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(uid) || rows.length === 0) return;
  const { error } = await supabase
    .from('user_progress')
    .upsert(rows, { onConflict: 'user_id,item_type,item_id' });
  if (error) {
    throw error;
  }
}

export async function deleteAllAccountProgressDirectFromSupabase(uid: string): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(uid)) return;
  try {
    await Promise.all([
      supabase.from('user_progress').delete().eq('user_id', uid),
      supabase.from('quiz_attempts').delete().eq('user_id', uid),
    ]);
  } catch (err) {
    console.warn('Direct full cloud reset failed:', err);
  }
}

export type GrammarPracticeKey = PracticeType;
