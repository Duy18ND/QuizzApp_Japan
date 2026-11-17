import { commitUserProgress, loadUserProgress } from '../hooks/useUserProgress';
import type { AppDispatch } from '../store';
import { hydrateGrammarProgress } from '../store/slices/grammarProgressSlice';
import { hydrateKanjiState, type KanjiProgress } from '../store/slices/kanjiSlice';
import { hydrateMistakes } from '../store/slices/mistakeSlice';
import type { GrammarMistake, GrammarProgress, PracticeType } from '../types/grammar';
import type { UserProgress } from '../types/quiz';
import {
  loadQuizHistory,
  mergeQuizHistoryRecords,
  saveQuizHistory,
  type QuizAttemptRecord,
} from './quizHistoryService';
import { supabase } from './supabaseClient';

const KANJI_STORAGE_KEY = 'nihonmaster_kanji_progress';
const GRAMMAR_STORAGE_KEY = 'nihonmaster_grammar_progress';
const MISTAKES_STORAGE_KEY = 'nihonmaster_grammar_mistakes';
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

const PRACTICE_KEYS: Array<keyof GrammarProgress> = [
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
    for (const key of PRACTICE_KEYS) {
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

function readLocalJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
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
      for (const k of PRACTICE_KEYS) {
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

function serializeToCloudRows(
  userId: string,
  userProgress: UserProgress,
  kanjiMap: Record<string, KanjiProgress>,
  grammarMap: Record<string, GrammarProgress>,
  mistakes: GrammarMistake[],
) {
  const now = new Date().toISOString();
  const rows: Array<Record<string, unknown>> = [];

  const vocabIds = new Set<number>([
    ...userProgress.starredWords,
    ...Object.keys(userProgress.wrongWords).map(Number).filter(Number.isFinite),
  ]);
  for (const wordId of vocabIds) {
    const starred = userProgress.starredWords.includes(wordId);
    const wrongCount = userProgress.wrongWords[wordId] || 0;
    rows.push({
      user_id: userId,
      item_type: 'vocab',
      item_id: String(wordId),
      status: starred && wrongCount === 0 ? 'starred' : wrongCount > 0 ? 'needs_review' : 'learning',
      score: starred ? 100 : 0,
      attempts: wrongCount,
      starred,
      wrong_count: wrongCount,
      metadata_json: {},
      updated_at: now,
    });
  }

  for (const [kanjiId, k] of Object.entries(kanjiMap)) {
    rows.push({
      user_id: userId,
      item_type: 'kanji',
      item_id: kanjiId,
      status: k.learned ? 'mastered' : 'learning',
      score: k.correctAttempts,
      attempts: k.writingAttempts,
      starred: false,
      wrong_count: Math.max(0, k.writingAttempts - k.correctAttempts),
      metadata_json: {
        tutorialSeen: k.tutorialSeen,
        correctAttempts: k.correctAttempts,
        lastPracticedAt: k.lastPracticedAt,
      },
      updated_at: now,
    });
  }

  for (const [grammarId, rec] of Object.entries(grammarMap)) {
    const bestScore = Math.max(0, ...PRACTICE_KEYS.map((k) => Number(rec[k] ?? 0)));
    rows.push({
      user_id: userId,
      item_type: 'grammar',
      item_id: grammarId,
      status: bestScore >= 80 ? 'mastered' : bestScore > 0 ? 'learning' : 'new',
      score: bestScore,
      attempts: bestScore > 0 ? 1 : 0,
      starred: false,
      wrong_count: 0,
      metadata_json: { scores: rec },
      updated_at: now,
    });
  }

  for (const m of mistakes) {
    rows.push({
      user_id: userId,
      item_type: 'mistake',
      item_id: `${m.grammarId}::${m.questionId}`,
      status: 'needs_review',
      score: 0,
      attempts: 1,
      starred: false,
      wrong_count: 1,
      metadata_json: { mistake: m },
      updated_at: now,
    });
  }

  return rows;
}

export async function syncLocalProgressWithCloud(
  userId: string,
  dispatch: AppDispatch,
): Promise<{ ok: boolean; syncedAt?: string; reason?: string }> {
  if (!supabase || !userId) {
    return { ok: false, reason: 'offline_guest_mode' };
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

  const localUser = loadUserProgress();
  const localKanjiRaw = readLocalJson<{ progress?: Record<string, KanjiProgress>; tutorialSeen?: boolean }>(
    KANJI_STORAGE_KEY,
    { progress: {}, tutorialSeen: false },
  );
  const localKanji = localKanjiRaw?.progress && typeof localKanjiRaw.progress === 'object' ? localKanjiRaw.progress : {};
  const localGrammar = readLocalJson<Record<string, GrammarProgress>>(GRAMMAR_STORAGE_KEY, {});
  const localMistakes = readLocalJson<GrammarMistake[]>(MISTAKES_STORAGE_KEY, []);

  const mergedUser = mergeUserProgressRecords(localUser, remoteUser);
  const mergedKanji = mergeKanjiProgressRecords(localKanji, remoteKanji);
  const mergedGrammar = mergeGrammarProgressRecords(localGrammar, remoteGrammar);
  const mergedMistakes = mergeMistakeRecords(localMistakes, remoteMistakes);

  commitUserProgress(mergedUser);
  dispatch(
    hydrateKanjiState({
      progress: mergedKanji,
      tutorialSeen: Boolean(localKanjiRaw?.tutorialSeen || Object.keys(mergedKanji).length > 0),
    }),
  );
  dispatch(hydrateGrammarProgress(mergedGrammar));
  dispatch(hydrateMistakes(mergedMistakes));

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
    const mergedHistory = mergeQuizHistoryRecords(loadQuizHistory(), remoteAttempts);
    saveQuizHistory(mergedHistory);
  }

  const upsertRows = serializeToCloudRows(
    userId,
    mergedUser,
    mergedKanji,
    mergedGrammar,
    mergedMistakes,
  );
  if (upsertRows.length > 0) {
    const { error: upsertErr } = await supabase
      .from('user_progress')
      .upsert(upsertRows, { onConflict: 'user_id,item_type,item_id' });
    if (upsertErr) {
      throw upsertErr;
    }
  }

  return { ok: true, syncedAt: new Date().toISOString() };
}
