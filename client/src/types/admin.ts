import type { AccountRole } from '../store/slices/authSlice';
import type { JLPTLevel } from './quiz';

export type CmsEntityType = 'vocabulary' | 'kanji' | 'grammar' | 'jlpt';

export type CmsTableName =
  | 'units'
  | 'vocabularies'
  | 'kanjis'
  | 'grammar_rules'
  | 'jlpt_questions';

export type BatchImportMode = 'insert_only' | 'upsert' | 'all_or_nothing';

export type BatchRowStatus = 'valid' | 'duplicate' | 'invalid';

export interface AdminUnitRecord {
  id: string;
  level: JLPTLevel;
  unitNumber: number;
  textbookId?: string | null;
  title: string;
  description: string;
  orderIndex: number;
  isPublished: boolean;
  createdAt?: string;
}

export interface AdminVocabRecord {
  id: number;
  unitId: number;
  dbUnitId?: string;
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

export interface AdminKanjiExample {
  vocabularyId: number | string;
  word: string;
  hiragana: string;
  meaning: string;
}

export interface AdminKanjiRecord {
  id: string;
  kanji: string;
  hanViet: string;
  meanings: string[];
  onReadings: string[];
  kunReadings: string[];
  strokeCount: number;
  jlptLevel: JLPTLevel;
  examples: AdminKanjiExample[];
}

export interface AdminGrammarExample {
  japanese: string;
  hiragana?: string;
  vietnamese: string;
  jp?: string;
  vi?: string;
}

export interface AdminGrammarRecord {
  id: string;
  bookId: string;
  chapterId: string;
  level: JLPTLevel;
  title: string;
  structure: string;
  meaning: string;
  explanation: string;
  notes: string;
  examples: AdminGrammarExample[];
}

export type AdminJlptModuleId =
  | 'kanji'
  | 'vocab'
  | 'grammar'
  | 'star'
  | 'reading-short'
  | 'reading-medium'
  | 'reading-long'
  | 'listening';

export interface AdminJlptRecord {
  id: string;
  moduleId: AdminJlptModuleId;
  level: JLPTLevel;
  questionType: 'mcq' | 'star' | 'reading' | 'listening';
  prompt: string;
  passage: string | null;
  options: string[];
  correctIndex: number;
  explanation: string;
  audioText: string | null;
}

export interface BatchValidatedRow<T = unknown> {
  rowNumber: number;
  status: BatchRowStatus;
  errors: string[];
  duplicateOf?: string;
  duplicateMatchId?: string | number;
  normalized: T | null;
  raw: Record<string, unknown>;
  summaryLabel: string;
}

export interface BatchValidationReport<T = unknown> {
  entityType: CmsEntityType;
  sourceFormat: 'json' | 'csv';
  parseError: string | null;
  rows: BatchValidatedRow<T>[];
  counts: {
    total: number;
    valid: number;
    duplicate: number;
    invalid: number;
  };
}

export interface BatchExecutionSummary {
  aborted: boolean;
  abortReason?: string;
  mode: BatchImportMode;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  storage: 'supabase' | 'local';
}

export interface AccountProviderSummary {
  total: number;
  google: number;
  email: number;
  hashed: number;
}

export interface ManagedUserProfile {
  id: string;
  email: string;
  displayName: string;
  role: AccountRole;
  authProvider?: 'google' | 'email' | 'other';
  hasClientHash?: boolean;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  detailsJson: Record<string, unknown>;
  createdAt: string;
}
