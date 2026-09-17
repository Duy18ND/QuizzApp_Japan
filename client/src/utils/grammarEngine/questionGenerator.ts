import type { SmartGrammarRule } from '../../types/grammarEngine';
import type { PracticeType } from '../../types/grammar';
import { lesson01Sentences } from '../../data/grammar/shinkanzen-n3/lesson01Sentences';


import {
  generateMultipleChoiceQuestion,
  generateFillBlankQuestion,
  generateConjugationQuestion,
  generateWordOrderQuestion,
  generateJaToViQuestion,
  generateViToJaQuestion,
  generateTransformationQuestion,
  generateGrammarSelectionQuestion,
  generateFreeWritingQuestion,
  generateExampleQuestion
} from './questionTypes';

class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

export interface SmartGeneratorOptions {
  grammarRule: SmartGrammarRule;
  count: number;
  seed: number;
  rawVocabulary: any[];
  topicScope?: string[];
  requestedPracticeTypes?: PracticeType[]; // Array of types to generate
}

export interface QuestionSet {
  id: string;
  seed: number;
  grammarId: string;
  questions: any[];
}

export const generateSmartQuestionSet = (options: SmartGeneratorOptions): QuestionSet => {
  const { grammarRule, count, seed, requestedPracticeTypes } = options;
  const rng = new SeededRandom(seed);
  
  const questions: any[] = [];
  const usedFingerprints = new Set<string>();
  
  // Lấy các câu cố định cho grammar hiện tại từ Sentence Bank
  const availableSentences = lesson01Sentences.filter(s => s.grammarId === grammarRule.id);
  const shuffledSentences = rng.shuffle(availableSentences);
  
  if (shuffledSentences.length === 0) {
    return { id: `set-${seed}`, seed, grammarId: grammarRule.id, questions: [] };
  }

  let typesToUse = requestedPracticeTypes && requestedPracticeTypes.length > 0 
      ? requestedPracticeTypes 
      : grammarRule.practiceTypes.filter(t => t !== 'mixed' && t !== 'text_input');

  if (typesToUse.includes('mixed')) {
    typesToUse = grammarRule.practiceTypes.filter(t => t !== 'mixed' && t !== 'text_input');
  }

  const typeDistribution: PracticeType[] = [];
  const baseCount = Math.floor(count / typesToUse.length);
  const remainder = count % typesToUse.length;

  typesToUse.forEach((t, i) => {
    const c = baseCount + (i < remainder ? 1 : 0);
    for (let j = 0; j < c; j++) typeDistribution.push(t);
  });

  const shuffledTypes = rng.shuffle(typeDistribution);

  for (const sentenceRecord of shuffledSentences) {
    if (questions.length >= count) break;
    
    // Duplicate check bằng ID cố định
    if (usedFingerprints.has(sentenceRecord.id)) {
      continue;
    }
    usedFingerprints.add(sentenceRecord.id);
    
    const pType = shuffledTypes[questions.length % shuffledTypes.length] || 'fill_blank';
    
    // Tạo baseQuestion và truyền GrammarSentence sang questionTypes
    const baseQuestion = {
      id: `${sentenceRecord.id}-${seed}`,
      grammarId: grammarRule.id,
      explanation: `Dịch: ${sentenceRecord.vietnamese}\nNgữ pháp: ${grammarRule.name}`
    };

    const generatorCtx = {
      baseQuestion,
      grammarRule,
      sentenceRecord,
      rng
    };

    switch (pType) {
      case 'multiple_choice':
        questions.push(generateMultipleChoiceQuestion(generatorCtx));
        break;
      case 'fill_blank':
        questions.push(generateFillBlankQuestion(generatorCtx));
        break;
      case 'conjugation':
        questions.push(generateConjugationQuestion(generatorCtx));
        break;
      case 'sentence_ordering':
        questions.push(generateWordOrderQuestion(generatorCtx));
        break;
      case 'ja_to_vi':
        questions.push(generateJaToViQuestion(generatorCtx));
        break;
      case 'vi_to_ja':
        questions.push(generateViToJaQuestion(generatorCtx));
        break;
      case 'sentence_transformation':
        questions.push(generateTransformationQuestion(generatorCtx));
        break;
      case 'grammar_selection':
        questions.push(generateGrammarSelectionQuestion(generatorCtx));
        break;
      case 'free_writing':
        questions.push(generateFreeWritingQuestion(generatorCtx));
        break;
      case 'example':
        questions.push(generateExampleQuestion(generatorCtx));
        break;
      default:
        questions.push(generateFillBlankQuestion(generatorCtx));
    }
  }

  return {
    id: `set-${seed}-${Date.now()}`,
    seed,
    grammarId: grammarRule.id,
    questions
  };
};
