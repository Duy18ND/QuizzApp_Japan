import type { VocabularyItem } from '../types/vocabulary';
import { unit1Data } from './n3/unit1';
import { N3_EXTRA_TEXTBOOK_UNITS } from './n3/extraTextbooksN3';
import { N4_ALL_TEXTBOOK_UNITS } from './n4/allTextbooksN4';
import { n5AllUnitsMap } from './n5/minnaAllUnits';
import { buildMultiUnitVocab, N5_EXTRA_TEXTBOOK_UNITS } from './n5/extraTextbooksN5';

const buildUnitsMap = (
  level: 'N5' | 'N4' | 'N3',
  defs: typeof N5_EXTRA_TEXTBOOK_UNITS,
): Record<string, VocabularyItem[]> =>
  Object.fromEntries(
    defs.map((def) => [
      String(def.unitId),
      buildMultiUnitVocab(level, def.unitId, def.startId, def.words),
    ]),
  );

export const allVocabularyData: Record<string, Record<string, VocabularyItem[]>> = {
  n5: {
    ...n5AllUnitsMap,
    ...buildUnitsMap('N5', N5_EXTRA_TEXTBOOK_UNITS),
  },
  n4: buildUnitsMap('N4', N4_ALL_TEXTBOOK_UNITS),
  n3: {
    '1': unit1Data,
    ...buildUnitsMap('N3', N3_EXTRA_TEXTBOOK_UNITS),
  },
};
