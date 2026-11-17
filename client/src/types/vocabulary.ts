import type { JLPTLevel } from './quiz';

export interface VocabularyItem {
  id: number;
  unitId: number;
  level: JLPTLevel;
  wordNumber: number;
  kanji: string | null;
  hiragana: string;
  hanViet: string | null;
  meaning: string;
  wordType: string;
  exampleSentence: string | null;
  exampleMeaning: string | null;
  notes: string | null;
  tags?: string[];
  semanticRoles?: string[];
}
