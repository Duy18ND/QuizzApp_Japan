export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type PracticeType = 
  | 'recognition'
  | 'conjugation' 
  | 'sentence_transformation'
  | 'word_order'
  | 'fill_blank'
  | 'translation'
  | 'free_writing'
  | 'mix_review';

export type GrammarCategory = 
  | 'conjugation'
export interface TransformationRule {
  type: string;
  rules?: Record<string, unknown>;
}

export interface GrammarRule {
  id: string;
  name: string;
  hiragana: string;
  meaning: string;
  level: JLPTLevel;
  category?: 'conjugation' | 'particle' | 'sentence_pattern' | 'expression' | 'comparison' | 'condition';
  target?: 'verb' | 'adjective' | 'noun' | 'sentence';
  transformation?: TransformationRule;
  templates?: string[];
  example?: string;
  exampleMeaning?: string;
  practiceTypes: PracticeType[];
}

export interface SentenceTemplateSlot {
  name: string;
  type: 'person' | 'agent' | 'verb' | 'noun' | 'place' | 'object' | 'time' | 'adjective';
  required?: boolean;
}

export interface SentenceTemplate {
  id: string;
  grammarId: string;
  level: JLPTLevel;
  pattern: string;
  slots: SentenceTemplateSlot[];
  contextTags?: string[];
}

export interface PracticeQuestion {
  id: string;
  grammarId: string;
  type: PracticeType;
  question: string;
  correctAnswer: string | string[];
  explanation?: string;
  metadata?: {
    originalSentence?: string;
    targetGrammar?: string;
    expectedStructure?: string;
    tokens?: string[];
    correctOrder?: number[];
  };
}

export interface PracticeResult {
  grammarId: string;
  type: PracticeType;
  score: number;
  totalQuestions: number;
  completedAt: string;
}

export interface GrammarMistake {
  id: string;
  grammarId: string;
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  errorType: 'wrong_conjugation' | 'wrong_particle' | 'wrong_word_order' | 'wrong_grammar' | 'missing_word';
  createdAt: string;
}

export interface GrammarProgress {
  recognition: number;
  conjugation: number;
  sentence_transformation: number;
  word_order: number;
  fill_blank: number;
  translation: number;
  free_writing: number;
  mix_review: number;
}

export interface PracticeQuestion {
  id: string;
  grammarId: string;
  type: PracticeType;
  question: string; // the prompt (e.g. "先生は私をほめました。")
  instruction?: string; // e.g. "受身形に変えてください。"
  answers?: string[]; // for multiple choice
  correctAnswer: string | string[]; // can be multiple acceptable answers
  explanation?: string;
  hintWords?: string[];
  parts?: string[]; // for word order
}

export interface PracticeResult {
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
}

export interface PDFSettings {
  grammars: string[]; // grammar IDs
  difficulty: 'easy' | 'normal' | 'hard' | 'mixed';
  questionCount: number;
  vocabularySource: 'current_chapter' | 'selected_chapters' | 'all' | 'weak';
  generateAnswerKey: boolean;
  worksheetTypes: Array<'quick' | 'conjugation' | 'sentence_builder' | 'translation' | 'full'>;
}
