import type { VocabularyItem } from '../types/vocabulary';
import { MIMI_N3_UNITS } from './n3/mimiBook';
import { N3_EXTRA_TEXTBOOK_UNITS } from './n3/extraTextbooksN3';
import { N4_ALL_TEXTBOOK_UNITS } from './n4/allTextbooksN4';
import { n5AllUnitsMap } from './n5/minnaAllUnits';
import { buildUnitDefVocab, N5_EXTRA_TEXTBOOK_UNITS } from './n5/extraTextbooksN5';

const buildUnitsMap = (
  level: 'N5' | 'N4' | 'N3',
  defs: typeof N5_EXTRA_TEXTBOOK_UNITS,
): Record<string, VocabularyItem[]> =>
  Object.fromEntries(
    defs.map((def) => [String(def.unitId), buildUnitDefVocab(level, def)]),
  );

const allUnitsByLevel: Record<string, Record<string, VocabularyItem[]>> = {
  n5: {
    ...n5AllUnitsMap,
    ...buildUnitsMap('N5', N5_EXTRA_TEXTBOOK_UNITS),
  },
  n4: buildUnitsMap('N4', N4_ALL_TEXTBOOK_UNITS),
  n3: {
    ...buildUnitsMap(
      'N3',
      N3_EXTRA_TEXTBOOK_UNITS.filter((d) => d.textbookId !== 'mimi-n3'),
    ),
    // Mimi kara N3: laid out after the book (see n3/mimiBook)
    ...Object.fromEntries(Object.entries(MIMI_N3_UNITS).map(([u, words]) => [u, words])),
  },
};

/** Unit numbers of the one course shown per level (other courses stay in the repo, hidden). */
const SHOWN_UNITS: Record<string, (unit: number) => boolean> = {
  n5: (u) => u >= 1 && u <= 25,
  n4: (u) => u >= 26 && u <= 50,
  n3: (u) => u >= 1 && u <= 13,
};

export const allVocabularyData: Record<string, Record<string, VocabularyItem[]>> = Object.fromEntries(
  Object.entries(allUnitsByLevel).map(([level, units]) => [
    level,
    Object.fromEntries(
      Object.entries(units).filter(([unit]) => SHOWN_UNITS[level]?.(Number(unit)) ?? true),
    ),
  ]),
);
