/**
 * Mimi kara Oboeru N3 (Từ vựng) laid out after the book's table of contents:
 * Unit 01–12 by word class (名詞A/動詞A/形容詞A/名詞B/動詞B/カタカナA/形容詞B/副詞A/名詞C/動詞C/
 * カタカナB/副詞B・連体詞・接続詞) + Unit 13 "Bổ sung" (set phrases the book does not list).
 *
 * Words the app already had keep their ids (learning progress stays valid) and are moved into the
 * unit of their word class. New words are compiled for this app (not copied from the book).
 */
import type { VocabularyItem } from '../../../types/vocabulary';
import { buildMultiUnitVocab, buildUnitDefVocab, type MultiBookVocabTuple } from '../../n5/extraTextbooksN5';
import { unit1Data } from '../unit1';
import { N3_EXTRA_TEXTBOOK_UNITS } from '../extraTextbooksN3';
import { MIMI_ADJ_B, MIMI_ADV_A, MIMI_ADV_B, MIMI_KATA_A, MIMI_KATA_B } from './misc';
import { MIMI_NOUNS_B, MIMI_NOUNS_C } from './nouns';
import { MIMI_VERBS_A } from './verbsA';
import { MIMI_VERBS_B } from './verbsB';
import { MIMI_VERBS_C } from './verbsC';

export const MIMI_N3_UNIT_TITLES: Record<number, string> = {
  1: 'Bài 1 · Danh từ (phần 1)',
  2: 'Bài 2 · Động từ (phần 1)',
  3: 'Bài 3 · Tính từ (phần 1)',
  4: 'Bài 4 · Danh từ (phần 2)',
  5: 'Bài 5 · Động từ (phần 2)',
  6: 'Bài 6 · Katakana (phần 1)',
  7: 'Bài 7 · Tính từ (phần 2)',
  8: 'Bài 8 · Phó từ',
  9: 'Bài 9 · Danh từ (phần 3)',
  10: 'Bài 10 · Động từ (phần 3)',
  11: 'Bài 11 · Katakana (phần 2)',
  12: 'Bài 12 · Phó từ, Liên thể từ & Liên từ',
  13: 'Bài 13 · Cụm từ cố định',
};

export const MIMI_N3_UNIT_IDS = Object.keys(MIMI_N3_UNIT_TITLES).map(Number);

/** Where each old app unit's words go, by word class. */
const OLD_UNIT_TARGET: Record<number, (w: VocabularyItem) => number> = {
  2: () => 4,
  3: () => 2,
  4: () => 3,
  5: () => 8,
  6: (w) => (isKatakana(w) ? 6 : 4),
  7: (w) => (w.wordType === 'Trạng từ' ? 8 : 12),
  8: () => 6,
  9: () => 4,
  10: () => 2,
  11: () => 3,
  12: () => 13,
};

/** New words per unit (ids 340000 + unit × 1000 + n). */
const NEW_WORDS: Record<number, MultiBookVocabTuple[]> = {
  2: MIMI_VERBS_A,
  3: [],
  4: MIMI_NOUNS_B,
  5: MIMI_VERBS_B,
  6: MIMI_KATA_A,
  7: MIMI_ADJ_B,
  8: MIMI_ADV_A,
  9: MIMI_NOUNS_C,
  10: MIMI_VERBS_C,
  11: MIMI_KATA_B,
  12: MIMI_ADV_B,
};

function isKatakana(w: Pick<VocabularyItem, 'hiragana' | 'kanji'>): boolean {
  return /^[ァ-ヶー・]+$/.test(w.hiragana) && !/[一-龯]/.test(w.kanji ?? '');
}

const wordKey = (w: Pick<VocabularyItem, 'kanji' | 'hiragana'>) => (w.kanji || w.hiragana).trim();

function buildMimiN3Units(): Record<number, VocabularyItem[]> {
  const units: Record<number, VocabularyItem[]> = Object.fromEntries(MIMI_N3_UNIT_IDS.map((u) => [u, []]));
  const seen = new Set<string>();
  const push = (unitId: number, w: VocabularyItem) => {
    seen.add(wordKey(w));
    units[unitId].push({ ...w, unitId, wordNumber: units[unitId].length + 1 });
  };

  for (const w of unit1Data) push(1, w);
  for (const def of N3_EXTRA_TEXTBOOK_UNITS) {
    if (def.textbookId !== 'mimi-n3') continue;
    const target = OLD_UNIT_TARGET[def.unitId];
    for (const w of buildUnitDefVocab('N3', def)) push(target ? target(w) : def.unitId, w);
  }
  for (const [unit, rows] of Object.entries(NEW_WORDS)) {
    const unitId = Number(unit);
    // id from the row's own position, so fixing one row never shifts the others
    rows.forEach((row, i) => {
      if (seen.has((row[0] || row[1]).trim())) return;
      const [w] = buildMultiUnitVocab('N3', unitId, 340000 + unitId * 1000 + 1 + i, [row]);
      push(unitId, w);
    });
  }
  return units;
}

export const MIMI_N3_UNITS: Record<number, VocabularyItem[]> = buildMimiN3Units();
