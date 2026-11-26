import type { GrammarMistake } from '../types/grammar';
import type { QuizConfig } from '../types/quiz';
import type { VocabularyItem } from '../types/vocabulary';
import type { QuizAttemptRecord } from './quizHistoryService';
import { getActiveAuthenticatedUserId } from './sessionScope';

export const LAST_PRACTICE_SYNC_EVENT = 'nihonmaster:last-practice-sync';

export interface LastPracticeTarget {
  path: string;
  label: string;
  level?: string;
  quizType: string;
  quizConfig?: QuizConfig;
  updatedAt: string;
}

const ramLastPractice = new Map<string, LastPracticeTarget>();

const QUIZ_TYPE_LABELS: Record<string, string> = {
  vocabulary: 'Quiz Từ vựng',
  writing: 'Luyện gõ Từ vựng',
  grammar: 'Luyện Ngữ pháp',
  'jlpt-full': 'Thi thử JLPT',
  'jlpt-full-test': 'Thi thử JLPT',
  'jlpt-kanji': 'JLPT Chữ Hán',
  'jlpt-vocab': 'JLPT Từ vựng',
  'jlpt-grammar': 'JLPT Ngữ pháp',
  'jlpt-star': 'JLPT Hái sao (★)',
  'jlpt-listening': 'JLPT Nghe hiểu',
  'jlpt-reading-short': 'JLPT Đọc hiểu ngắn',
  'jlpt-reading-medium': 'JLPT Đọc hiểu trung',
  'jlpt-reading-long': 'JLPT Đọc hiểu dài',
};

export function saveLastPracticeTarget(
  target: Omit<LastPracticeTarget, 'updatedAt'>,
  explicitUserId?: string | null,
): void {
  const uid = explicitUserId === undefined ? getActiveAuthenticatedUserId() : explicitUserId;
  const scopeKey = uid || '__guest__';
  const entry: LastPracticeTarget = {
    ...target,
    updatedAt: new Date().toISOString(),
  };
  ramLastPractice.set(scopeKey, entry);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<LastPracticeTarget>(LAST_PRACTICE_SYNC_EVENT, { detail: entry }));
  }
}

export function getStoredLastPracticeTarget(explicitUserId?: string | null): LastPracticeTarget | null {
  const uid = explicitUserId === undefined ? getActiveAuthenticatedUserId() : explicitUserId;
  const scopeKey = uid || '__guest__';
  return ramLastPractice.get(scopeKey) ?? null;
}

export function clearLastPracticeTarget(explicitUserId?: string | null): void {
  if (explicitUserId) {
    ramLastPractice.delete(explicitUserId);
    return;
  }
  ramLastPractice.clear();
}

export function appendRetryAttemptParam(path: string, attemptId: string): string {
  if (!attemptId) return path;
  const [pathname, rawQuery = ''] = path.split('?');
  const params = new URLSearchParams(rawQuery);
  params.set('retryAttemptId', attemptId);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function resolveAttemptRedoTarget(
  attempt: QuizAttemptRecord,
  mistakes: GrammarMistake[] = [],
): LastPracticeTarget {
  const level = attempt.level && attempt.level !== 'ALL' ? attempt.level.toUpperCase() : '';
  const baseLabel = QUIZ_TYPE_LABELS[attempt.quizType] ?? attempt.quizType;
  const label = level ? `${baseLabel} · ${level}` : baseLabel;

  if (attempt.quizType === 'vocabulary') {
    const params = new URLSearchParams();
    if (level) params.set('level', level);
    if (attempt.totalQuestions > 0) params.set('count', String(attempt.totalQuestions));
    params.set('autoStart', '1');
    params.set('retryAttemptId', attempt.id);
    return {
      path: `/vocabulary/quiz?${params.toString()}`,
      label,
      level: level || undefined,
      quizType: attempt.quizType,
      updatedAt: attempt.createdAt,
    };
  }

  if (attempt.quizType === 'writing') {
    return {
      path: appendRetryAttemptParam('/games?game=shooter', attempt.id),
      label,
      level: level || undefined,
      quizType: attempt.quizType,
      updatedAt: attempt.createdAt,
    };
  }

  if (attempt.quizType === 'grammar') {
    const latestGrammarMistake = [...mistakes]
      .reverse()
      .find((m) => m.practicePath && m.practicePath.startsWith('/grammar/'));
    return {
      path: appendRetryAttemptParam(latestGrammarMistake?.practicePath || '/grammar', attempt.id),
      label,
      level: level || undefined,
      quizType: attempt.quizType,
      updatedAt: attempt.createdAt,
    };
  }

  if (attempt.quizType === 'jlpt-full' || attempt.quizType === 'jlpt-full-test') {
    const qs = level ? `?level=${encodeURIComponent(level)}` : '';
    return {
      path: appendRetryAttemptParam(`/jlpt/full-test${qs}`, attempt.id),
      label,
      level: level || undefined,
      quizType: attempt.quizType,
      updatedAt: attempt.createdAt,
    };
  }

  if (attempt.quizType.startsWith('jlpt-')) {
    const mod = attempt.quizType.replace(/^jlpt-/, '');
    const qs = level ? `?level=${encodeURIComponent(level)}` : '';
    return {
      path: appendRetryAttemptParam(`/jlpt/${mod}${qs}`, attempt.id),
      label,
      level: level || undefined,
      quizType: attempt.quizType,
      updatedAt: attempt.createdAt,
    };
  }

  return {
    path: appendRetryAttemptParam('/vocabulary/quiz', attempt.id),
    label,
    level: level || undefined,
    quizType: attempt.quizType,
    updatedAt: attempt.createdAt,
  };
}

export function getLastPracticeTarget(
  history: QuizAttemptRecord[],
  mistakes: GrammarMistake[],
  explicitUserId?: string | null,
): LastPracticeTarget | null {
  const stored = getStoredLastPracticeTarget(explicitUserId);
  const latestHistory = history[0];

  if (stored) {
    if (!latestHistory) return stored;
    const storedTime = Date.parse(stored.updatedAt) || 0;
    const historyTime = Date.parse(latestHistory.createdAt) || 0;
    if (storedTime >= historyTime - 5000) {
      return stored;
    }
  }

  if (latestHistory) {
    return resolveAttemptRedoTarget(latestHistory, mistakes);
  }

  if (mistakes.length > 0) {
    const newest = mistakes[mistakes.length - 1];
    if (newest?.practicePath) {
      return {
        path: newest.practicePath,
        label: newest.categoryLabel || newest.grammarId,
        level: newest.level,
        quizType: newest.grammarId,
        updatedAt: newest.createdAt,
      };
    }
  }

  return null;
}

export function extractMistakeWordId(mistake: GrammarMistake): number | null {
  if (typeof mistake.wordId === 'number' && Number.isFinite(mistake.wordId)) {
    return mistake.wordId;
  }
  const match = mistake.questionId.match(/^vocab-(?:quiz|writing|legacy)-(\d+)/);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Unifies Redux mistakes with any legacy vocabulary wrongWords (e.g. from attempts recorded
 * before vocabulary quizzes wrote directly to mistakeSlice) without double-counting.
 */
export function buildUnifiedMistakes(
  mistakes: GrammarMistake[],
  wrongWords: Record<number, number>,
  allVocab: VocabularyItem[],
): GrammarMistake[] {
  const coveredWordIds = new Set<number>();
  for (const m of mistakes) {
    const wid = extractMistakeWordId(m);
    if (wid !== null) coveredWordIds.add(wid);
  }

  const vocabById = new Map<number, VocabularyItem>();
  for (const w of allVocab) {
    vocabById.set(w.id, w);
  }

  const legacyVocabMistakes: GrammarMistake[] = [];
  for (const [idStr, count] of Object.entries(wrongWords)) {
    const wordId = Number(idStr);
    if (!Number.isFinite(wordId) || count <= 0 || coveredWordIds.has(wordId)) continue;
    const word = vocabById.get(wordId);
    if (!word) continue;

    const jpDisplay = word.kanji ? `${word.kanji}（${word.hiragana}）` : word.hiragana;
    legacyVocabMistakes.push({
      id: `vocab-legacy-${word.id}`,
      grammarId: `VOCAB_QUIZ_${word.level}_U${word.unitId}`,
      questionId: `vocab-legacy-${word.id}`,
      userAnswer: `Đã làm sai ${count} lần`,
      correctAnswer: `${jpDisplay} — ${word.meaning}`,
      errorType: 'missing_word',
      createdAt: new Date(0).toISOString(),
      prompt: `Từ vựng cần ôn lại: ${jpDisplay}`,
      categoryLabel: `Quiz Từ vựng · ${word.level} · Unit ${word.unitId}`,
      practicePath: `/vocabulary/quiz?level=${word.level}&unit=${word.unitId}&source=wrong&autoStart=1`,
      explanation: `${jpDisplay}${word.hanViet ? ` [${word.hanViet}]` : ''} (${word.wordType}) — ${word.meaning}`,
      level: word.level,
      wordId: word.id,
    });
  }

  // Show newest mistakes first
  return [...mistakes].reverse().concat(legacyVocabMistakes);
}
