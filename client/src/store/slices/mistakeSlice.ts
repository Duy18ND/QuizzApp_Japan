import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GrammarMistake } from '../../types/grammar';

const STORAGE_KEY = 'nihonmaster_grammar_mistakes';

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

const isValidMistake = (item: unknown): item is GrammarMistake => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const m = item as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    typeof m.grammarId === 'string' &&
    typeof m.questionId === 'string' &&
    typeof m.userAnswer === 'string' &&
    typeof m.correctAnswer === 'string' &&
    typeof m.errorType === 'string' &&
    typeof m.createdAt === 'string'
  );
};

const loadInitialMistakes = (): GrammarMistake[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const deduped: GrammarMistake[] = [];
      for (const item of parsed) {
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
      return deduped;
    }
  } catch {
    // ignore corrupted localStorage data
  }
  return [];
};

const saveMistakes = (mistakes: GrammarMistake[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mistakes));
  } catch {
    // ignore quota / private-mode storage errors
  }
};

const initialState: MistakeState = {
  mistakes: loadInitialMistakes(),
};

const mistakeSlice = createSlice({
  name: 'mistake',
  initialState,
  reducers: {
    addMistake(state, action: PayloadAction<GrammarMistake>) {
      const normalizedIncoming: GrammarMistake = {
        ...action.payload,
        questionId: stripSeedSuffix(action.payload.questionId),
      };
      const existingIndex = state.mistakes.findIndex((m) => isSameMistake(m, normalizedIncoming));
      if (existingIndex >= 0) {
        state.mistakes.splice(existingIndex, 1);
      }
      state.mistakes.push(normalizedIncoming);
      saveMistakes(state.mistakes);
    },
    removeMistakesByGrammar(state, action: PayloadAction<string>) {
      state.mistakes = state.mistakes.filter((m) => m.grammarId !== action.payload);
      saveMistakes(state.mistakes);
    },
    clearMistakes(state) {
      state.mistakes = [];
      saveMistakes(state.mistakes);
    },
  },
});

export const { addMistake, removeMistakesByGrammar, clearMistakes } = mistakeSlice.actions;
export default mistakeSlice.reducer;
