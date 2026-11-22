import type { VocabularyItem } from '../types/vocabulary';
import { unit1Data } from './n3/unit1';
import { n5AllUnitsMap } from './n5/minnaAllUnits';

export const allVocabularyData: Record<string, Record<string, VocabularyItem[]>> = {
  n5: n5AllUnitsMap,
  n3: {
    '1': unit1Data,
  },
};
