import type { JLPTLevel, PracticeType } from './grammar';

export type SemanticRole = 
  | 'person' 
  | 'place' 
  | 'object' 
  | 'activity' 
  | 'food' 
  | 'school' 
  | 'work' 
  | 'time' 
  | 'event' 
  | 'emotion' 
  | 'transportation'
  | 'weather'
  | 'family'
  | 'travel'
  | 'shopping'
  | 'daily life'
  | 'health'
  | 'prerequisite_candidate'
  | 'result_candidate'
  | 'prerequisite_object'
  | 'preparation'
  | 'prerequisite_action'
  | 'travel_action'
  | 'result_action'
  | 'task'
  | 'free_time'
  | 'subject'
  | 'agent';

export type VerbForm = 'Vる' | 'Vている' | 'Vた' | 'Vない' | 'Vて' | 'Noun+の' | 'Noun' | 'Na-adj+な' | 'I-adj' | 'Vてきた' | 'Vようになった' | 'Vていた' | 'Vられない';

export interface GrammarSlotConstraint {
  name: string;
  allowedSemanticRoles?: SemanticRole[];
  allowedTypes?: ('verb' | 'noun' | 'adjective' | 'adverb')[];
  allowedForms?: VerbForm[];
  required?: boolean;
}

export interface SmartGrammarTemplate {
  id: string;
  grammarId: string;
  pattern: string; // e.g. "{A}うちに、{B}。"
  vietnamesePattern?: string; // e.g. "Trong lúc {A}, {B}."
  slots: GrammarSlotConstraint[];
  supportedTopics?: string[];
}

export interface TransformationRule {
  type: string;
  rules?: Record<string, unknown>;
}

export interface SmartGrammarRule {
  id: string;
  bookId: string;
  chapterId: string;
  level: JLPTLevel;
  name: string;
  hiragana: string;
  meaning: string;
  explanation?: string; // Dịch/giải thích chi tiết
  usage?: string; // Cách dùng, ngữ cảnh
  notes?: string; // Lưu ý
  category?: string;
  functions?: string[];
  practiceTypes: PracticeType[];
  templates: SmartGrammarTemplate[];
  semanticConstraints?: Record<string, any>;
  transformation?: TransformationRule;
  patterns?: Array<{ pattern: string; target: string }>;
  semanticFunction?: string;
  allowedRelationTypes?: string[];
}

export interface GrammarChapter {
  id: string;
  bookId: string;
  chapterNumber: number;
  title: string;
  topics: string[];
  grammars: SmartGrammarRule[];
}

export interface GrammarBook {
  id: string;
  title: string;
  level: JLPTLevel;
  chapters: GrammarChapter[];
}

export interface VerbCollocation {
  verb: string; // e.g. '食べる'
  compatibleObjects: string[]; // e.g. ['ご飯', 'パン']
}

export interface SemanticRelation {
  left: string;
  right: string;
}

export interface SemanticConstraint {
  role: SemanticRole;
  required: boolean;
}

export interface GrammarSemanticRule {
  grammarId: string;
  semanticFunction: 
    | "prerequisite"
    | "simultaneous"
    | "sequence"
    | "condition"
    | "cause"
    | "purpose"
    | "contrast"
    | "change"
    | "habit"
    | "possibility"
    | "obligation"
    | "passive"
    | "comparison"
    | "time"
    | "other";
  relations: SemanticRelation[];
  constraints: SemanticConstraint[];
}

export interface GrammarScenario {
  id: string;
  topic: 
    | "school"
    | "work"
    | "family"
    | "travel"
    | "shopping"
    | "daily_life"
    | "health"
    | "transportation"
    | "restaurant"
    | "study"
    | "technology"
    | "event"
    | "other";
  description: string;
  roles: SemanticRole[];
  validRelations: SemanticRelation[];
  vocabularyTags: string[];
  templates: string[];
}

export interface ValidationScore {
  grammarScore: number;
  semanticScore: number;
  collocationScore: number;
  topicScore: number;
  levelScore: number;
  naturalnessScore: number;
  diversityScore: number;
}

export interface SemanticSignature {
  subject?: string;
  verb?: string;
  object?: string;
  place?: string;
  grammarId: string;
  templateId: string;
}

export interface SentenceValidationResult {
  valid: boolean;
  reasons: string[];
  signature?: SemanticSignature;
}
