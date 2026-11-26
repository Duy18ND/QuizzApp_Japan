import type { JLPTLevel } from '../types/quiz';
import { allVocabularyData } from './index';
import { N3_EXTRA_TEXTBOOK_UNITS } from './n3/extraTextbooksN3';
import { MIMI_N3_UNIT_IDS, MIMI_N3_UNIT_TITLES } from './n3/mimiBook';
import { N4_ALL_TEXTBOOK_UNITS } from './n4/allTextbooksN4';
import { N5_EXTRA_TEXTBOOK_UNITS } from './n5/extraTextbooksN5';
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

/** "Bài 1 (… — Giới thiệu bản thân)" → "Bài 1 · Giới thiệu bản thân" */
const cleanUnitName = (name: string): string =>
  name.replace(/^(Bài \d+) \([^—)]*— (.*)\)$/, '$1 · $2');

const SHOWN_COURSES = new Set(['minna-n5', 'minna-n4', 'mimi-n3', 'shinkanzen-n2', 'shinkanzen-n1']);

const ALL_UNIT_DATA: Record<JLPTLevel, UnitMeta[]> = {
  N5: [
    ...MINNA_N5_UNIT_IDS.map((id) => ({
      id,
      name: MINNA_N5_UNIT_TITLES[id] ?? `Bài ${id} (Minna I)`,
      totalWords: countLoadedWords('N5', id),
      textbookId: 'minna-n5',
    })),
    ...N5_EXTRA_TEXTBOOK_UNITS.map((def) => ({
      id: def.unitId,
      name: def.title,
      totalWords: countLoadedWords('N5', def.unitId),
      textbookId: def.textbookId,
    })),
  ],
  N4: N4_ALL_TEXTBOOK_UNITS.map((def) => ({
    id: def.unitId,
    name: def.title,
    totalWords: countLoadedWords('N4', def.unitId),
    textbookId: def.textbookId,
  })),
  N3: [
    ...MIMI_N3_UNIT_IDS.map((id) => ({
      id,
      name: MIMI_N3_UNIT_TITLES[id],
      totalWords: countLoadedWords('N3', id),
      textbookId: 'mimi-n3',
    })),
    ...N3_EXTRA_TEXTBOOK_UNITS.filter((def) => def.textbookId !== 'mimi-n3').map((def) => ({
      id: def.unitId,
      name: def.title,
      totalWords: countLoadedWords('N3', def.unitId),
      textbookId: def.textbookId,
    })),
  ],
  N2: [{ id: 1, name: 'Unit 1 (N2)', totalWords: countLoadedWords('N2', 1), textbookId: 'shinkanzen-n2' }],
  N1: [{ id: 1, name: 'Unit 1 (N1)', totalWords: countLoadedWords('N1', 1), textbookId: 'shinkanzen-n1' }],
};

export const UNIT_DATA: Record<JLPTLevel, UnitMeta[]> = Object.fromEntries(
  Object.entries(ALL_UNIT_DATA).map(([level, units]) => [
    level,
    units
      .filter((u) => SHOWN_COURSES.has(u.textbookId ?? ''))
      .map((u) => ({ ...u, name: cleanUnitName(u.name) })),
  ]),
) as Record<JLPTLevel, UnitMeta[]>;
