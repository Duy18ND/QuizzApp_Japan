import type { SmartGrammarRule } from '../../../types/grammarEngine';
import { buildN3FromCompact } from './extraLessonsN3';
import { SKZ_N3_MORE_A } from './moreLessonsA';
import { SKZ_N3_MORE_B } from './moreLessonsB';

const MORE = { ...SKZ_N3_MORE_A, ...SKZ_N3_MORE_B };

const BUILT = buildN3FromCompact(
  'SHINKANZEN_N3',
  'N3-SKZ',
  Object.entries(MORE).map(([id, rules]) => ({
    id,
    number: Number(id.slice(1)),
    title: id,
    topics: [],
    rules,
  })),
);

/** Extra Shin Kanzen N3 grammar points, keyed by chapter id (L01–L08). */
export const SKZ_N3_MORE_GRAMMARS: Record<string, SmartGrammarRule[]> = Object.fromEntries(
  BUILT.chapters.map((c) => [c.id, c.grammars]),
);

export const SKZ_N3_MORE_SENTENCES = BUILT.sentences;
