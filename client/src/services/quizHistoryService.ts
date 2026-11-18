import { useEffect, useState } from 'react';
import { getInMemoryQuizHistory, setInMemoryQuizHistory } from './cloudProgressWriter';
import { recordStudyCompletion } from './notificationService';
import {
  getActiveAuthenticatedUserId,
  isSupabaseAccountUuid,
  onActiveSessionUserChange,
} from './sessionScope';
import { supabase } from './supabaseClient';

export const QUIZ_HISTORY_STORAGE_KEY = 'nihonmaster_quiz_history';
const QUIZ_HISTORY_SYNC_EVENT = 'nihonmaster:quiz-history-sync';
const MAX_HISTORY_ITEMS = 50;

export interface QuizAttemptInput {
  quizType: string;
  level: string;
  score: number;
  totalQuestions: number;
  durationSeconds?: number;
  mistakesJson?: unknown[];
}

export interface QuizAttemptRecord {
  id: string;
  quizType: string;
  level: string;
  score: number;
  totalQuestions: number;
  durationSeconds: number;
  mistakesJson: unknown[];
  createdAt: string;
}

const isValidAttemptRecord = (raw: unknown): raw is QuizAttemptRecord => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.quizType === 'string' &&
    typeof r.level === 'string' &&
    typeof r.score === 'number' &&
    Number.isFinite(r.score) &&
    typeof r.totalQuestions === 'number' &&
    Number.isFinite(r.totalQuestions) &&
    typeof r.createdAt === 'string'
  );
};

export function loadQuizHistory(explicitUserId?: string | null): QuizAttemptRecord[] {
  const uid = explicitUserId === undefined ? getActiveAuthenticatedUserId() : explicitUserId;
  if (!uid) return [];
  return getInMemoryQuizHistory(uid)
    .filter(isValidAttemptRecord)
    .map((item) => ({
      ...item,
      durationSeconds:
        typeof item.durationSeconds === 'number' && Number.isFinite(item.durationSeconds)
          ? Math.max(0, Math.round(item.durationSeconds))
          : 0,
      mistakesJson: Array.isArray(item.mistakesJson) ? item.mistakesJson : [],
    }))
    .slice(0, MAX_HISTORY_ITEMS);
}

export function saveQuizHistory(
  records: QuizAttemptRecord[],
  explicitUserId?: string | null,
): void {
  const uid = explicitUserId === undefined ? getActiveAuthenticatedUserId() : explicitUserId;
  if (!uid) return;
  const clean = records.slice(0, MAX_HISTORY_ITEMS);
  setInMemoryQuizHistory(uid, clean);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<QuizAttemptRecord[]>(QUIZ_HISTORY_SYNC_EVENT, { detail: clean }));
  }
}

export function mergeQuizHistoryRecords(
  local: QuizAttemptRecord[],
  remote: QuizAttemptRecord[],
): QuizAttemptRecord[] {
  const byKey = new Map<string, QuizAttemptRecord>();

  const addAll = (list: QuizAttemptRecord[]) => {
    for (const item of list) {
      if (!isValidAttemptRecord(item)) continue;
      const dedupeKey = item.id || `${item.quizType}:${item.level}:${item.createdAt}`;
      if (!byKey.has(dedupeKey)) {
        byKey.set(dedupeKey, item);
      }
    }
  };

  addAll(remote);
  addAll(local);

  return Array.from(byKey.values())
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, MAX_HISTORY_ITEMS);
}

/**
 * Records a completed quiz attempt directly into Supabase (`public.quiz_attempts`) per account
 * and updates active session memory (never writes to `localStorage`).
 */
export async function recordQuizAttempt(
  input: QuizAttemptInput,
  userId?: string | null,
): Promise<QuizAttemptRecord | null> {
  const effectiveUid = userId === undefined ? getActiveAuthenticatedUserId() : userId;
  if (!effectiveUid) {
    return null;
  }

  const record: QuizAttemptRecord = {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    quizType: input.quizType,
    level: input.level,
    score: Math.max(0, Math.round(input.score)),
    totalQuestions: Math.max(1, Math.round(input.totalQuestions)),
    durationSeconds: Math.max(0, Math.round(input.durationSeconds ?? 0)),
    mistakesJson: Array.isArray(input.mistakesJson) ? input.mistakesJson : [],
    createdAt: new Date().toISOString(),
  };

  const current = loadQuizHistory(effectiveUid);
  saveQuizHistory([record, ...current], effectiveUid);
  void recordStudyCompletion(undefined, effectiveUid);

  if (supabase && isSupabaseAccountUuid(effectiveUid)) {
    try {
      await supabase.from('quiz_attempts').insert({
        id: record.id,
        user_id: effectiveUid,
        quiz_type: record.quizType,
        level: record.level,
        score: record.score,
        total_questions: record.totalQuestions,
        duration_seconds: record.durationSeconds,
        mistakes_json: record.mistakesJson,
        created_at: record.createdAt,
      });
    } catch (err) {
      console.warn('Could not persist quiz attempt to Supabase:', err);
    }
  }

  return record;
}

export function useQuizHistory(): QuizAttemptRecord[] {
  const [history, setHistory] = useState<QuizAttemptRecord[]>(() => loadQuizHistory());

  useEffect(() => {
    const onSync = (event: Event) => {
      if (!getActiveAuthenticatedUserId()) {
        setHistory([]);
        return;
      }
      const custom = event as CustomEvent<QuizAttemptRecord[]>;
      setHistory(Array.isArray(custom.detail) ? custom.detail : loadQuizHistory());
    };
    const unsubSession = onActiveSessionUserChange(() => {
      setHistory(loadQuizHistory());
    });

    window.addEventListener(QUIZ_HISTORY_SYNC_EVENT, onSync);
    return () => {
      unsubSession();
      window.removeEventListener(QUIZ_HISTORY_SYNC_EVENT, onSync);
    };
  }, []);

  return history;
}
