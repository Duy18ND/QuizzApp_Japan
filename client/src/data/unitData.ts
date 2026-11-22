import type { JLPTLevel } from '../types/quiz';
import { allVocabularyData } from './index';
import { MINNA_N5_UNIT_IDS, MINNA_N5_UNIT_TITLES } from './n5/minnaAllUnits';

export interface UnitMeta {
  id: number;
  name: string;
  totalWords: number;
  dbUnitId?: string;
  textbookId?: string | null;
}

const countLoadedWords = (level: JLPTLevel, unitId: number): number =>
  (allVocabularyData[level.toLowerCase()]?.[String(unitId)] ?? []).length;

export const UNIT_DATA: Record<JLPTLevel, UnitMeta[]> = {
  N5: MINNA_N5_UNIT_IDS.map((id) => ({
    id,
    name: MINNA_N5_UNIT_TITLES[id] ?? `Bài ${id} (Minna I)`,
    totalWords: countLoadedWords('N5', id),
  })),
  N4: [{ id: 1, name: 'Unit 1 (N4)', totalWords: countLoadedWords('N4', 1) }],
  N3: [
    { id: 1, name: 'Unit 1 (N3 - Mimi kara Oboeru)', totalWords: countLoadedWords('N3', 1) },
    { id: 2, name: 'Unit 2 (N3)', totalWords: countLoadedWords('N3', 2) },
  ],
  N2: [{ id: 1, name: 'Unit 1 (N2)', totalWords: countLoadedWords('N2', 1) }],
  N1: [{ id: 1, name: 'Unit 1 (N1)', totalWords: countLoadedWords('N1', 1) }],
};
