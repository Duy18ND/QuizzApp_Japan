import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  deleteAllMistakesDirectFromSupabase,
  deleteMistakeItemDirectFromSupabase,
  deleteMistakesByGrammarDirectFromSupabase,
  getInMemoryMistakes,
  setInMemoryMistakes,
  writeMistakeItemDirectToSupabase,
} from '../../services/cloudProgressWriter';
import { getActiveAuthenticatedUserId } from '../../services/sessionScope';
import type { GrammarMistake } from '../../types/grammar';

interface MistakeState {
  mistakes: GrammarMistake[];
}

const stripSeedSuffix = (questionId: string): string =>
  questionId.trim().replace(/-\d{10,}$/, '');

const normalizePrompt = (prompt?: string): string =>
  (prompt ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

const isSameMistake = (existing: GrammarMistake, incoming: GrammarMistake): boolean => {
  if (existing.questionId === incoming.questionId) return true;
  if (existing.grammarId !== incoming.grammarId) return false;
  if (stripSeedSuffix(existing.questionId) === stripSeedSuffix(incoming.questionId)) return true;
  const incomingPrompt = normalizePrompt(incoming.prompt);
  const existingPrompt = normalizePrompt(existing.prompt);
  return Boolean(incomingPrompt && existingPrompt && incomingPrompt === existingPrompt);
};

const MAX_MISTAKES = 200;
const MAX_FIELD_LEN = 600;

const isValidMistake = (item: unknown): item is GrammarMistake => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const m = item as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    m.id.length <= 120 &&
    typeof m.grammarId === 'string' &&
    m.grammarId.length <= 120 &&
    typeof m.questionId === 'string' &&
    m.questionId.length <= 120 &&
    typeof m.userAnswer === 'string' &&
    m.userAnswer.length <= MAX_FIELD_LEN &&
    typeof m.correctAnswer === 'string' &&
    m.correctAnswer.length <= MAX_FIELD_LEN &&
    typeof m.errorType === 'string' &&
    m.errorType.length <= 80 &&
    typeof m.createdAt === 'string' &&
    m.createdAt.length <= 64
  );
};

const dedupeMistakes = (items: unknown[]): GrammarMistake[] => {
  const deduped: GrammarMistake[] = [];
  for (const item of items) {
    if (!isValidMistake(item)) continue;
    const normalizedItem: GrammarMistake = {
      ...item,
      questionId: stripSeedSuffix(item.questionId),
    };
    const idx = deduped.findIndex((m) => isSameMistake(m, normalizedItem));
    if (idx >= 0) {
      deduped[idx] = normalizedItem;
    } else {
      deduped.push(normalizedItem);
    }
  }
  return deduped.slice(-MAX_MISTAKES);
};

const loadInitialMistakes = (): GrammarMistake[] => {
  const uid = getActiveAuthenticatedUserId();
  if (!uid) return [];
  return dedupeMistakes(getInMemoryMistakes(uid));
};

const cacheMistakesInSession = (mistakes: GrammarMistake[]) => {
  const uid = getActiveAuthenticatedUserId();
  if (!uid) return;
  setInMemoryMistakes(uid, mistakes.slice(-MAX_MISTAKES));
};

const initialState: MistakeState = {
  mistakes: loadInitialMistakes(),
};

const mistakeSlice = createSlice({
  name: 'mistake',
  initialState,
  reducers: {
    addMistake(state, action: PayloadAction<GrammarMistake>) {
      const uid = getActiveAuthenticatedUserId();
      if (!uid) return;
      const normalizedIncoming: GrammarMistake = {
        ...action.payload,
        questionId: stripSeedSuffix(action.payload.questionId),
      };
      const existingIndex = state.mistakes.findIndex((m) => isSameMistake(m, normalizedIncoming));
      if (existingIndex >= 0) {
        state.mistakes.splice(existingIndex, 1);
      }
      state.mistakes.push(normalizedIncoming);
      state.mistakes = state.mistakes.slice(-MAX_MISTAKES);
      cacheMistakesInSession(state.mistakes);
      void writeMistakeItemDirectToSupabase(uid, normalizedIncoming);
    },
    removeMistake(state, action: PayloadAction<string>) {
      const uid = getActiveAuthenticatedUserId();
      if (!uid) return;
      const target = state.mistakes.find((m) => m.id === action.payload);
      state.mistakes = state.mistakes.filter((m) => m.id !== action.payload);
      cacheMistakesInSession(state.mistakes);
      if (target) {
        void deleteMistakeItemDirectFromSupabase(uid, target.grammarId, target.questionId);
      }
    },
    removeMistakesByGrammar(state, action: PayloadAction<string>) {
      const uid = getActiveAuthenticatedUserId();
      if (!uid) return;
      state.mistakes = state.mistakes.filter((m) => m.grammarId !== action.payload);
      cacheMistakesInSession(state.mistakes);
      void deleteMistakesByGrammarDirectFromSupabase(uid, action.payload);
    },
    clearMistakes(state) {
      const uid = getActiveAuthenticatedUserId();
      state.mistakes = [];
      if (!uid) return;
      cacheMistakesInSession([]);
      void deleteAllMistakesDirectFromSupabase(uid);
    },
    hydrateMistakes(state, action: PayloadAction<unknown>) {
      if (!Array.isArray(action.payload)) return;
      state.mistakes = dedupeMistakes(action.payload);
      cacheMistakesInSession(state.mistakes);
    },
    reloadMistakesFromSession(state) {
      state.mistakes = loadInitialMistakes();
    },
  },
});

export const {
  addMistake,
  removeMistake,
  removeMistakesByGrammar,
  clearMistakes,
  hydrateMistakes,
  reloadMistakesFromSession,
} = mistakeSlice.actions;
export default mistakeSlice.reducer;
