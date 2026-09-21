export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface Unit {
  id: number;
  level: JLPTLevel;
  title: string;
  totalWords: number;
}

export interface UserProgress {
  starredWords: number[];
  wrongWords: Record<number, number>;
}

export type QuizSource = 'all' | 'starred' | 'wrong';
export type QuizRangeType = 'fixed' | 'custom';

export interface QuizConfig {
  level: JLPTLevel;
  unitId: number | 'all';
  source: QuizSource;
  wordType: string;
  rangeType: QuizRangeType;
  questionCount: number | 'all';
  customRange: { start: number; end: number };
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showHanVietHint: boolean;
  isCustom?: boolean;
  customData?: any[];
  questionType?: string;
}

export type WordType = 
  | 'noun' 
  | 'i_adj' 
  | 'na_adj' 
  | 'verb' 
  | 'vi' 
  | 'vt' 
  | 'adv' 
  | 'other';

export interface AnswerOption {
  id: string;
  text: string;
}

export type QuestionType =
  | "vi_to_hiragana"
  | "kanji_to_hiragana"
  | "kanji_to_vi"
  | "hiragana_to_kanji"
  | "hiragana_to_vi";

export interface Question {
  id: string;
  wordId: number;
  type: QuestionType;
  question: string;
  answers: AnswerOption[];
}

export interface QuestionAnswer {
  questionId: string;
  correctAnswerId: string;
  kanji: string;
  hiragana: string;
  hanViet?: string;
  hanviet?: string;
  meaning: string;
  wordType?: WordType;
  hint: {
    kanji?: string;
    hiragana?: string;
    meaning?: string;
  };
  explanation: string;
}

export interface QuizState {
  currentIndex: number;
  userAnswers: Record<number, string>;
  score: {
    correct: number;
    wrong: number;
  };
  isFinished: boolean;
}
