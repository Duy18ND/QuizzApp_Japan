import { commitUserProgress, loadUserProgress } from '../hooks/useUserProgress';
import type { AppDispatch } from '../store';
import { hydrateGrammarProgress } from '../store/slices/grammarProgressSlice';
import { hydrateKanjiState, type KanjiProgress } from '../store/slices/kanjiSlice';
import { hydrateMistakes } from '../store/slices/mistakeSlice';
import type { GrammarMistake, GrammarProgress, PracticeType } from '../types/grammar';
import type { UserProgress } from '../types/quiz';
import {
  bulkUpsertProgressDirectToSupabase,
  deleteAllAccountProgressDirectFromSupabase,
  getInMemoryGrammarMap,
  getInMemoryKanjiState,
  getInMemoryMistakes,
  PRACTICE_TYPE_KEYS,
  serializeToCloudRows,
} from './cloudProgressWriter';
import { syncStudyScheduleFromCloud } from './notificationService';
import {
  saveQuizHistory,
  type QuizAttemptRecord,
} from './quizHistoryService';
import { isSupabaseAccountUuid } from './sessionScope';
import { supabase } from './supabaseClient';

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export interface CloudProgressRow {
  item_type: 'vocab' | 'kanji' | 'grammar' | 'mistake';
  item_id: string;
  status: string;
  score: number;
  attempts: number;
  starred: boolean;
  wrong_count: number;
  metadata_json: Record<string, unknown> | null;
  updated_at?: string;
}

export function mergeUserProgressRecords(local: UserProgress, remote: UserProgress): UserProgress {
  const starredSet = new Set<number>([...local.starredWords, ...remote.starredWords]);
  const wrongWords: Record<number, number> = { ...local.wrongWords };

  for (const [idStr, remoteCount] of Object.entries(remote.wrongWords)) {
    const id = Number(idStr);
    if (!Number.isFinite(id) || typeof remoteCount !== 'number') continue;
    wrongWords[id] = Math.max(wrongWords[id] || 0, Math.max(0, Math.floor(remoteCount)));
  }

  return {
    starredWords: Array.from(starredSet),
    wrongWords,
  };
}

export function mergeKanjiProgressRecords(
  local: Record<string, KanjiProgress>,
  remote: Record<string, KanjiProgress>,
): Record<string, KanjiProgress> {
  const merged: Record<string, KanjiProgress> = { ...local };

  for (const [kanjiId, r] of Object.entries(remote)) {
    if (UNSAFE_KEYS.has(kanjiId)) continue;
    const l = merged[kanjiId];
    if (!l) {
      merged[kanjiId] = r;
      continue;
    }

    const lTime = Date.parse(l.lastPracticedAt || '') || 0;
    const rTime = Date.parse(r.lastPracticedAt || '') || 0;
    const latestAt = rTime > lTime ? r.lastPracticedAt : l.lastPracticedAt;

    merged[kanjiId] = {
      kanjiId,
      learned: Boolean(l.learned || r.learned),
      tutorialSeen: Boolean(l.tutorialSeen || r.tutorialSeen),
      writingAttempts: Math.max(l.writingAttempts || 0, r.writingAttempts || 0),
      correctAttempts: Math.max(l.correctAttempts || 0, r.correctAttempts || 0),
      lastPracticedAt: latestAt || new Date().toISOString(),
    };
  }

  return merged;
}

export function mergeGrammarProgressRecords(
  local: Record<string, GrammarProgress>,
  remote: Record<string, GrammarProgress>,
): Record<string, GrammarProgress> {
  const merged: Record<string, GrammarProgress> = { ...local };

  for (const [grammarId, r] of Object.entries(remote)) {
    if (UNSAFE_KEYS.has(grammarId)) continue;
    const l = merged[grammarId];
    if (!l) {
      merged[grammarId] = { ...r };
      continue;
    }

    const next = { ...l };
    for (const key of PRACTICE_TYPE_KEYS) {
      next[key] = Math.max(Number(l[key] ?? 0), Number(r[key] ?? 0));
    }
    merged[grammarId] = next;
  }

  return merged;
}

export function mergeMistakeRecords(
  local: GrammarMistake[],
  remote: GrammarMistake[],
): GrammarMistake[] {
  const map = new Map<string, GrammarMistake>();
  const add = (m: GrammarMistake) => {
    const key = `${m.grammarId}::${m.questionId.replace(/-\d{10,}$/, '')}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, m);
      return;
    }
    const existingTime = Date.parse(existing.createdAt) || 0;
    const incomingTime = Date.parse(m.createdAt) || 0;
    if (incomingTime >= existingTime) {
      map.set(key, m);
    }
  };

  remote.forEach(add);
  local.forEach(add);
  return Array.from(map.values());
}

function parseRemoteRows(rows: CloudProgressRow[]) {
  const remoteUser: UserProgress = { starredWords: [], wrongWords: {} };
  const remoteKanji: Record<string, KanjiProgress> = {};
  const remoteGrammar: Record<string, GrammarProgress> = {};
  const remoteMistakes: GrammarMistake[] = [];

  for (const row of rows) {
    if (!row || UNSAFE_KEYS.has(row.item_id)) continue;
    const meta = row.metadata_json && typeof row.metadata_json === 'object' ? row.metadata_json : {};

    if (row.item_type === 'vocab') {
      const wordId = Number(row.item_id);
      if (!Number.isFinite(wordId)) continue;
      if (row.starred) remoteUser.starredWords.push(wordId);
      if (row.wrong_count > 0) remoteUser.wrongWords[wordId] = row.wrong_count;
    } else if (row.item_type === 'kanji') {
      remoteKanji[row.item_id] = {
        kanjiId: row.item_id,
        learned: row.status === 'mastered',
        tutorialSeen: Boolean(meta.tutorialSeen ?? true),
        writingAttempts: Math.max(0, Number(row.attempts || 0)),
        correctAttempts: Math.max(0, Number(meta.correctAttempts ?? row.score ?? 0)),
        lastPracticedAt: String(meta.lastPracticedAt || row.updated_at || new Date().toISOString()),
      };
    } else if (row.item_type === 'grammar') {
      const scoresMeta =
        meta.scores && typeof meta.scores === 'object' ? (meta.scores as Partial<GrammarProgress>) : {};
      const record: GrammarProgress = {
        multiple_choice: 0,
        fill_blank: 0,
        star_question: 0,
        conjugation: 0,
        sentence_ordering: 0,
        ja_to_vi: 0,
        vi_to_ja: 0,
        sentence_transformation: 0,
        grammar_selection: 0,
        text_input: 0,
        free_writing: 0,
        mixed: 0,
      };
      for (const k of PRACTICE_TYPE_KEYS) {
        const val = scoresMeta[k as PracticeType];
        if (typeof val === 'number' && Number.isFinite(val)) {
          record[k] = val;
        }
      }
      if (typeof row.score === 'number' && Number.isFinite(row.score)) {
        record.mixed = Math.max(record.mixed ?? 0, row.score);
      }
      remoteGrammar[row.item_id] = record;
    } else if (row.item_type === 'mistake' && meta.mistake && typeof meta.mistake === 'object') {
      remoteMistakes.push(meta.mistake as GrammarMistake);
    }
  }

  return { remoteUser, remoteKanji, remoteGrammar, remoteMistakes };
}

/**
 * Fetches all progress, wrong answers, Kanji, Grammar, Quiz history, and Study schedule
 * straight from Supabase for the active account into RAM stores & Redux (zero `localStorage` usage).
 */
export async function syncLocalProgressWithCloud(
  userId: string,
  dispatch: AppDispatch,
): Promise<{ ok: boolean; syncedAt?: string; reason?: string }> {
  if (!supabase || !userId || !isSupabaseAccountUuid(userId)) {
    return { ok: false, reason: 'offline_or_local_preview_mode' };
  }

  const [{ data: remoteRows, error: progressErr }, { data: attemptRows, error: attemptsErr }] =
    await Promise.all([
      supabase
        .from('user_progress')
        .select('item_type, item_id, status, score, attempts, starred, wrong_count, metadata_json, updated_at')
        .eq('user_id', userId),
      supabase
        .from('quiz_attempts')
        .select('id, quiz_type, level, score, total_questions, duration_seconds, mistakes_json, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

  if (progressErr) {
    throw progressErr;
  }

  const { remoteUser, remoteKanji, remoteGrammar, remoteMistakes } = parseRemoteRows(
    (remoteRows || []) as CloudProgressRow[],
  );

  commitUserProgress(remoteUser, userId);
  dispatch(
    hydrateKanjiState({
      progress: remoteKanji,
      tutorialSeen: Object.keys(remoteKanji).length > 0,
    }),
  );
  dispatch(hydrateGrammarProgress(remoteGrammar));
  dispatch(hydrateMistakes(remoteMistakes));

  if (!attemptsErr && Array.isArray(attemptRows)) {
    const remoteAttempts: QuizAttemptRecord[] = attemptRows.map((r) => ({
      id: String(r.id),
      quizType: String(r.quiz_type),
      level: String(r.level),
      score: Number(r.score || 0),
      totalQuestions: Number(r.total_questions || 1),
      durationSeconds: Number(r.duration_seconds || 0),
      mistakesJson: Array.isArray(r.mistakes_json) ? r.mistakes_json : [],
      createdAt: String(r.created_at),
    }));
    saveQuizHistory(remoteAttempts, userId);
  }

  await syncStudyScheduleFromCloud(userId);

  return { ok: true, syncedAt: new Date().toISOString() };
}

/**
 * Persists a full restored backup (e.g. from SettingsPage JSON import) straight to Supabase.
 */
export async function pushRestoredProgressToCloud(userId: string): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(userId)) return;
  const userProg = loadUserProgress(userId);
  const kanjiProg = getInMemoryKanjiState(userId).progress;
  const grammarProg = getInMemoryGrammarMap(userId);
  const mistakes = getInMemoryMistakes(userId);

  const rows = serializeToCloudRows(userId, userProg, kanjiProg, grammarProg, mistakes);
  if (rows.length > 0) {
    await bulkUpsertProgressDirectToSupabase(userId, rows);
  }
}

export async function clearAllCloudAccountData(userId: string): Promise<void> {
  await deleteAllAccountProgressDirectFromSupabase(userId);
  saveQuizHistory([], userId);
}
