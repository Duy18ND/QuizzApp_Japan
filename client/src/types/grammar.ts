export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type PracticeType = 
  | 'multiple_choice'
  | 'fill_blank'
  | 'conjugation' 
  | 'sentence_ordering'
  | 'ja_to_vi'
  | 'vi_to_ja'
  | 'sentence_transformation'
  | 'grammar_selection'
  | 'text_input'
  | 'free_writing'
  | 'example'
  | 'mixed';

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

export interface BasePracticeQuestion {
  id: string;
  grammarId: string;
  lessonId?: string;
  japanese?: string;
  hiragana?: string;
  vietnamese?: string;
  vocabularyIds?: string[];
  topic?: string;
  scenarioId?: string;
  explanation?: string;
  seed?: number;
  // Compatibility fields for the union
  question?: string;
  instruction?: string;
  correctAnswer?: any;
  answers?: string[];
  parts?: string[];
}

export interface MultipleChoiceQuestion extends BasePracticeQuestion {
  type: 'multiple_choice' | 'grammar_selection';
  question: string;
  instruction: string;
  answers: string[];
  correctAnswer: string;
}

export interface FillBlankQuestion extends BasePracticeQuestion {
  type: 'fill_blank';
  question: string;
  instruction: string;
  correctAnswer: string;
}

export interface ConjugationQuestion extends BasePracticeQuestion {
  type: 'conjugation';
  question: string;
  instruction: string;
  correctAnswer: string;
}

export interface WordOrderQuestion extends BasePracticeQuestion {
  type: 'sentence_ordering';
  question: string;
  instruction: string;
  parts: string[];
  correctAnswer: string;
  metadata?: {
    originalSentence?: string;
    tokens?: any[];
  };
}

export interface JaToViQuestion extends BasePracticeQuestion {
  type: 'ja_to_vi';
  question: string;
  instruction: string;
  correctAnswer: string | string[];
}

export interface ViToJaQuestion extends BasePracticeQuestion {
  type: 'vi_to_ja';
  question: string;
  instruction: string;
  correctAnswer: string | string[];
}

export interface TransformationQuestion extends BasePracticeQuestion {
  type: 'sentence_transformation';
  question: string;
  instruction: string;
  correctAnswer: string | string[];
}

export interface FreeWritingQuestion extends BasePracticeQuestion {
  type: 'free_writing' | 'text_input';
  question: string;
  instruction: string;
  correctAnswer: string | string[];
}

export interface ExampleQuestion extends BasePracticeQuestion {
  type: 'example';
  metadata?: {
    japanese?: string;
    hiragana?: string;
    vietnamese?: string;
    conjugation?: any;
    pattern?: string;
    slotValues?: any;
    grammarName?: string;
    grammarHiragana?: string;
    vocabulary?: any[];
  };
}

export type PracticeQuestion =
  | MultipleChoiceQuestion
  | FillBlankQuestion
  | ConjugationQuestion
  | WordOrderQuestion
  | JaToViQuestion
  | ViToJaQuestion
  | TransformationQuestion
  | FreeWritingQuestion
  | ExampleQuestion;

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
  multiple_choice?: number;
  fill_blank?: number;
  conjugation?: number;
  sentence_ordering?: number;
  ja_to_vi?: number;
  vi_to_ja?: number;
  sentence_transformation?: number;
  grammar_selection?: number;
  text_input?: number;
  free_writing?: number;
  mixed?: number;
  example?: number;
}

export interface PDFSettings {
  grammars: string[]; // grammar IDs
  difficulty: 'easy' | 'normal' | 'hard' | 'mixed';
  questionCount: number;
  vocabularySource: 'current_chapter' | 'selected_chapters' | 'all' | 'weak';
  generateAnswerKey: boolean;
  worksheetTypes: Array<'quick' | 'conjugation' | 'sentence_builder' | 'translation' | 'full'>;
}
