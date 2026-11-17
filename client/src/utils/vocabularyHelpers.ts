import { allVocabularyData } from '../data';
import type { VocabularyItem } from '../types/vocabulary';

export interface WordDisplayParts {
  primaryText: string;
  hasKanji: boolean;
  hiragana: string;
  hanViet: string;
}

export function getVocabularyDisplay(word: {
  kanji?: string | null;
  hiragana?: string | null;
  hanViet?: string | null;
  hanviet?: string | null;
}): WordDisplayParts {
  const trimmedKanji = word.kanji?.trim() || '';
  const trimmedHiragana = word.hiragana?.trim() || '';
  const hasKanji = Boolean(trimmedKanji && trimmedKanji !== trimmedHiragana);

  return {
    primaryText: hasKanji ? trimmedKanji : trimmedHiragana,
    hasKanji,
    hiragana: trimmedHiragana,
    hanViet: (word.hanViet ?? word.hanviet ?? '')?.trim() || '',
  };
}

export function normalizeVocabularyInput(text: string): string {
  return text
    .trim()
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ')
    .replace(/\s+/g, '')
    .replace(/[。、.,!?！？〜～~「」]/g, '')
    .toLowerCase();
}

export function matchesVocabularyAnswer(userInput: string, word: Pick<VocabularyItem, 'kanji' | 'hiragana'>): boolean {
  const normalizedInput = normalizeVocabularyInput(userInput);
  if (!normalizedInput) return false;

  const accepted = [word.hiragana, word.kanji]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map(normalizeVocabularyInput);

  return accepted.includes(normalizedInput);
}

export function getAllLoadedVocabulary(): VocabularyItem[] {
  const items: VocabularyItem[] = [];
  for (const levelUnits of Object.values(allVocabularyData)) {
    for (const unitList of Object.values(levelUnits)) {
      if (Array.isArray(unitList)) {
        items.push(...unitList);
      }
    }
  }
  return items;
}
