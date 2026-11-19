import { useEffect, useState } from 'react';
import type { GrammarBook } from '../types/grammarEngine';
import type { VocabularyItem } from '../types/vocabulary';
import {
  getInMemoryMistakeResolutions,
  setInMemoryMistakeResolutions,
  writeMistakeResolutionsDirectToSupabase,
  type AttemptMistakeResolutions,
} from './cloudProgressWriter';
import { appendRetryAttemptParam, resolveAttemptRedoTarget } from './lastPracticeService';
import type { QuizAttemptRecord } from './quizHistoryService';
import { getActiveAuthenticatedUserId, onActiveSessionUserChange } from './sessionScope';

export const MISTAKE_RESOLUTIONS_SYNC_EVENT = 'nihonmaster:mistake-resolutions-sync';

export interface AttemptMistakeRecord {
  id: string;
  attemptId: string;
  questionId: string;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
  options?: string[];
  level?: string;
  wordId?: number;
  grammarId?: string;
  categoryLabel?: string;
  practicePath?: string;
}

export interface AttemptMistakeGroup {
  attemptId: string;
  title: string;
  quizType: string;
  level: string;
  score: number;
  totalQuestions: number;
  percent: number;
  durationSeconds: number;
  createdAt: string;
  redoPath: string;
  mistakes: AttemptMistakeRecord[];
}

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

const isPlainObject = (val: unknown): val is Record<string, unknown> =>
  Boolean(val) && typeof val === 'object' && !Array.isArray(val);

export function loadAttemptMistakeResolutions(
  explicitUserId?: string | null,
): AttemptMistakeResolutions {
  const uid = explicitUserId === undefined ? getActiveAuthenticatedUserId() : explicitUserId;
  if (!uid) return { resolvedItemKeys: [], clearedAttemptIds: [] };
  return getInMemoryMistakeResolutions(uid);
}

function commitResolutions(
  next: AttemptMistakeResolutions,
  explicitUserId?: string | null,
  persistCloud = true,
): AttemptMistakeResolutions {
  const uid = explicitUserId === undefined ? getActiveAuthenticatedUserId() : explicitUserId;
  if (!uid) return { resolvedItemKeys: [], clearedAttemptIds: [] };

  const clean: AttemptMistakeResolutions = {
    resolvedItemKeys: Array.from(new Set(next.resolvedItemKeys)).slice(-500),
    clearedAttemptIds: Array.from(new Set(next.clearedAttemptIds)).slice(-100),
  };
  setInMemoryMistakeResolutions(uid, clean);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<AttemptMistakeResolutions>(MISTAKE_RESOLUTIONS_SYNC_EVENT, { detail: clean }),
    );
  }
  if (persistCloud) {
    void writeMistakeResolutionsDirectToSupabase(uid, clean);
  }
  return clean;
}

export function hydrateAttemptMistakeResolutions(
  resolutions: AttemptMistakeResolutions,
  userId: string,
): void {
  commitResolutions(resolutions, userId, false);
}

export function resolveAttemptMistakeItem(
  attemptId: string,
  mistakeId: string,
  explicitUserId?: string | null,
): void {
  const current = loadAttemptMistakeResolutions(explicitUserId);
  const key = `${attemptId}::${mistakeId}`;
  if (current.resolvedItemKeys.includes(key)) return;
  commitResolutions(
    {
      ...current,
      resolvedItemKeys: [...current.resolvedItemKeys, key],
    },
    explicitUserId,
  );
}

export function clearAttemptMistakeGroup(
  attemptId: string,
  explicitUserId?: string | null,
): void {
  const current = loadAttemptMistakeResolutions(explicitUserId);
  if (current.clearedAttemptIds.includes(attemptId)) return;
  commitResolutions(
    {
      ...current,
      clearedAttemptIds: [...current.clearedAttemptIds, attemptId],
    },
    explicitUserId,
  );
}

export function clearAllAttemptMistakes(
  attemptIds: string[],
  explicitUserId?: string | null,
): void {
  const current = loadAttemptMistakeResolutions(explicitUserId);
  commitResolutions(
    {
      ...current,
      clearedAttemptIds: [...current.clearedAttemptIds, ...attemptIds],
    },
    explicitUserId,
  );
}

export function useAttemptMistakeResolutions(): AttemptMistakeResolutions {
  const [resolutions, setResolutions] = useState<AttemptMistakeResolutions>(() =>
    loadAttemptMistakeResolutions(),
  );

  useEffect(() => {
    const onSync = (event: Event) => {
      const custom = event as CustomEvent<AttemptMistakeResolutions>;
      if (custom.detail) {
        setResolutions(custom.detail);
      } else {
        setResolutions(loadAttemptMistakeResolutions());
      }
    };
    const unsubSession = onActiveSessionUserChange(() => {
      setResolutions(loadAttemptMistakeResolutions());
    });
    window.addEventListener(MISTAKE_RESOLUTIONS_SYNC_EVENT, onSync);
    return () => {
      unsubSession();
      window.removeEventListener(MISTAKE_RESOLUTIONS_SYNC_EVENT, onSync);
    };
  }, []);

  return resolutions;
}

function normalizeRawMistakeItem(
  raw: unknown,
  idx: number,
  attempt: QuizAttemptRecord,
  vocabById: Map<number, VocabularyItem>,
  grammarNameById: Map<string, string>,
): AttemptMistakeRecord | null {
  if (!isPlainObject(raw)) return null;

  const baseId =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : `${attempt.id}-m-${idx}`;
  const questionId =
    typeof raw.questionId === 'string' && raw.questionId.trim()
      ? raw.questionId.trim()
      : baseId;
  const wordId =
    typeof raw.wordId === 'number' && Number.isFinite(raw.wordId) ? raw.wordId : undefined;
  const grammarId = typeof raw.grammarId === 'string' ? raw.grammarId : undefined;
  const options =
    Array.isArray(raw.options) && raw.options.every((o) => typeof o === 'string')
      ? (raw.options as string[])
      : undefined;

  // Case 1: Full structured AttemptMistakeRecord (all newly recorded attempts)
  if (
    typeof raw.prompt === 'string' &&
    raw.prompt.trim() &&
    typeof raw.correctAnswer === 'string' &&
    raw.correctAnswer.trim()
  ) {
    return {
      id: baseId,
      attemptId: attempt.id,
      questionId,
      prompt: raw.prompt.trim(),
      userAnswer:
        typeof raw.userAnswer === 'string' && raw.userAnswer.trim()
          ? raw.userAnswer.trim()
          : '(bỏ trống)',
      correctAnswer: raw.correctAnswer.trim(),
      explanation: typeof raw.explanation === 'string' ? raw.explanation : undefined,
      options,
      level: typeof raw.level === 'string' ? raw.level : attempt.level,
      wordId,
      grammarId,
      categoryLabel: typeof raw.categoryLabel === 'string' ? raw.categoryLabel : undefined,
      practicePath: typeof raw.practicePath === 'string' ? raw.practicePath : undefined,
    };
  }

  // Case 2: Legacy Vocabulary Quiz / Writing mistake ({ questionId, wordId, chosen, correct })
  if (wordId !== undefined) {
    const word = vocabById.get(wordId);
    if (word) {
      const jpDisplay = word.kanji ? `${word.kanji}（${word.hiragana}）` : word.hiragana;
      const chosenRaw =
        typeof raw.userAnswer === 'string'
          ? raw.userAnswer
          : typeof raw.chosen === 'string'
            ? `Chọn sai (Đáp án ${raw.chosen})`
            : 'Trả lời sai';
      return {
        id: baseId,
        attemptId: attempt.id,
        questionId,
        prompt: `Từ vựng: ${jpDisplay}`,
        userAnswer: chosenRaw,
        correctAnswer: `${jpDisplay} — ${word.meaning}`,
        explanation: `${jpDisplay}${word.hanViet ? ` [${word.hanViet}]` : ''} (${word.wordType}) — ${word.meaning}`,
        options,
        level: word.level || attempt.level,
        wordId,
        categoryLabel: `${QUIZ_TYPE_LABELS[attempt.quizType] ?? attempt.quizType} · ${word.level} · Unit ${word.unitId}`,
        practicePath: `/vocabulary/quiz?level=${word.level}&unit=${word.unitId}&autoStart=1`,
      };
    }
  }

  // Case 3: Legacy Grammar / JLPT compact mistake ({ grammarId, questionId, userAnswer/chosen, correct })
  const chosenText =
    typeof raw.userAnswer === 'string'
      ? raw.userAnswer
      : typeof raw.chosen === 'string'
        ? raw.chosen
        : '';
  const correctText =
    typeof raw.correctAnswer === 'string'
      ? raw.correctAnswer
      : typeof raw.correct === 'string'
        ? raw.correct
        : '';

  if (chosenText || correctText) {
    const ruleLabel = grammarId ? grammarNameById.get(grammarId) || grammarId : undefined;
    return {
      id: baseId,
      attemptId: attempt.id,
      questionId,
      prompt: ruleLabel ? `Ngữ pháp ${ruleLabel} (${questionId})` : `Câu hỏi ${questionId}`,
      userAnswer: chosenText || 'Trả lời sai',
      correctAnswer: correctText || 'Xem lại trong bài luyện',
      explanation: typeof raw.explanation === 'string' ? raw.explanation : undefined,
      options,
      level: attempt.level,
      grammarId,
      categoryLabel: ruleLabel,
    };
  }

  return null;
}

export function getAttemptReviewMistakes(
  attempt: QuizAttemptRecord,
  allVocab: VocabularyItem[],
  liveGrammarBooks: GrammarBook[],
): AttemptMistakeRecord[] {
  const rawList = Array.isArray(attempt.mistakesJson) ? attempt.mistakesJson : [];
  if (rawList.length === 0) return [];

  const vocabById = new Map<number, VocabularyItem>();
  for (const w of allVocab) {
    vocabById.set(w.id, w);
  }

  const grammarNameById = new Map<string, string>();
  for (const book of liveGrammarBooks) {
    for (const ch of book.chapters) {
      for (const g of ch.grammars) {
        grammarNameById.set(g.id, g.name);
      }
    }
  }

  const normalized: AttemptMistakeRecord[] = [];
  for (let idx = 0; idx < rawList.length; idx += 1) {
    const parsed = normalizeRawMistakeItem(
      rawList[idx],
      idx,
      attempt,
      vocabById,
      grammarNameById,
    );
    if (parsed) normalized.push(parsed);
  }
  return normalized;
}

/**
 * Builds 1-to-1 per-attempt mistake groups directly from `quizHistory`,
 * preserving every separate attempt cleanly without overwriting or merging sessions.
 */
export function buildAttemptMistakeGroups(
  history: QuizAttemptRecord[],
  allVocab: VocabularyItem[],
  liveGrammarBooks: GrammarBook[],
  resolutions: AttemptMistakeResolutions,
): AttemptMistakeGroup[] {
  const vocabById = new Map<number, VocabularyItem>();
  for (const w of allVocab) {
    vocabById.set(w.id, w);
  }

  const grammarNameById = new Map<string, string>();
  for (const book of liveGrammarBooks) {
    for (const ch of book.chapters) {
      for (const g of ch.grammars) {
        grammarNameById.set(g.id, g.name);
      }
    }
  }

  const clearedSet = new Set(resolutions.clearedAttemptIds);
  const resolvedKeySet = new Set(resolutions.resolvedItemKeys);

  const groups: AttemptMistakeGroup[] = [];

  for (const attempt of history) {
    if (clearedSet.has(attempt.id)) continue;
    const rawList = Array.isArray(attempt.mistakesJson) ? attempt.mistakesJson : [];
    if (rawList.length === 0) continue;

    const normalizedItems: AttemptMistakeRecord[] = [];
    for (let idx = 0; idx < rawList.length; idx += 1) {
      const parsed = normalizeRawMistakeItem(
        rawList[idx],
        idx,
        attempt,
        vocabById,
        grammarNameById,
      );
      if (!parsed) continue;
      if (resolvedKeySet.has(`${attempt.id}::${parsed.id}`)) continue;
      normalizedItems.push(parsed);
    }

    if (normalizedItems.length === 0) continue;

    const total = Math.max(1, attempt.totalQuestions);
    const percent = Math.round((attempt.score / total) * 100);
    const baseLabel = QUIZ_TYPE_LABELS[attempt.quizType] ?? attempt.quizType;
    const firstCategory = normalizedItems[0]?.categoryLabel;
    const title = firstCategory || (attempt.level && attempt.level !== 'ALL' ? `${baseLabel} · ${attempt.level}` : baseLabel);
    const baseRedoPath =
      normalizedItems[0]?.practicePath || resolveAttemptRedoTarget(attempt, []).path;
    let redoPath = appendRetryAttemptParam(baseRedoPath, attempt.id);
    if (attempt.quizType === 'vocabulary' && attempt.totalQuestions > 0) {
      const [pathname, rawQuery = ''] = redoPath.split('?');
      const params = new URLSearchParams(rawQuery);
      if (!params.has('count')) {
        params.set('count', String(attempt.totalQuestions));
      }
      redoPath = `${pathname}?${params.toString()}`;
    }

    groups.push({
      attemptId: attempt.id,
      title,
      quizType: attempt.quizType,
      level: attempt.level,
      score: attempt.score,
      totalQuestions: total,
      percent,
      durationSeconds: attempt.durationSeconds,
      createdAt: attempt.createdAt,
      redoPath,
      mistakes: normalizedItems,
    });
  }

  return groups;
}
