import type { JLPTLevel } from '../types/quiz';
import { allVocabularyData } from './index';

export interface UnitMeta {
  id: number;
  name: string;
  totalWords: number;
}

const countLoadedWords = (level: JLPTLevel, unitId: number): number =>
  (allVocabularyData[level.toLowerCase()]?.[String(unitId)] ?? []).length;

export const UNIT_DATA: Record<JLPTLevel, UnitMeta[]> = {
  N5: [{ id: 1, name: 'Unit 1 (N5)', totalWords: countLoadedWords('N5', 1) }],
  N4: [{ id: 1, name: 'Unit 1 (N4)', totalWords: countLoadedWords('N4', 1) }],
  N3: [
    { id: 1, name: 'Unit 1 (N3 - Mimi kara Oboeru)', totalWords: countLoadedWords('N3', 1) },
    { id: 2, name: 'Unit 2 (N3)', totalWords: countLoadedWords('N3', 2) },
  ],
  N2: [{ id: 1, name: 'Unit 1 (N2)', totalWords: countLoadedWords('N2', 1) }],
  N1: [{ id: 1, name: 'Unit 1 (N1)', totalWords: countLoadedWords('N1', 1) }],
};
