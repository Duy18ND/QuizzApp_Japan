import type { JLPTLevel } from '../types/quiz';

export const UNIT_DATA: Record<JLPTLevel, { id: number, name: string, totalWords: number }[]> = {
  N5: [{ id: 1, name: 'Unit 1 (N5)', totalWords: 100 }],
  N4: [{ id: 1, name: 'Unit 1 (N4)', totalWords: 110 }],
  N3: [{ id: 1, name: 'Unit 1 (N3 - Mimi kara Oboeru)', totalWords: 120 }, { id: 2, name: 'Unit 2 (N3)', totalWords: 120 }],
  N2: [{ id: 1, name: 'Unit 1 (N2)', totalWords: 150 }],
  N1: [{ id: 1, name: 'Unit 1 (N1)', totalWords: 200 }],
};
