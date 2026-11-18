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

const MAX_MISTAKES = 200;
const MAX_FIELD_LEN = 600;
const UNSAFE_JSON_PATTERN = /"(__proto__|constructor|prototype)"\s*:/;

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

const loadInitialMistakes = (): GrammarMistake[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > 262_144 || UNSAFE_JSON_PATTERN.test(raw)) return [];
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
      return deduped.slice(-MAX_MISTAKES);
    }
  } catch {
    // ignore corrupted localStorage data
  }
  return [];
};

const saveMistakes = (mistakes: GrammarMistake[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mistakes.slice(-MAX_MISTAKES)));
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
    removeMistake(state, action: PayloadAction<string>) {
      state.mistakes = state.mistakes.filter((m) => m.id !== action.payload);
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
    hydrateMistakes(state, action: PayloadAction<unknown>) {
      if (!Array.isArray(action.payload)) return;
      const deduped: GrammarMistake[] = [];
      for (const item of action.payload) {
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
      state.mistakes = deduped;
      saveMistakes(state.mistakes);
    },
  },
});

export const { addMistake, removeMistake, removeMistakesByGrammar, clearMistakes, hydrateMistakes } =
  mistakeSlice.actions;
export default mistakeSlice.reducer;
