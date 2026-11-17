import type { PracticeQuestion, PracticeType } from '../../types/grammar';
import type { SmartGrammarRule } from '../../types/grammarEngine';
import { lesson01Sentences } from '../../data/grammar/shinkanzen-n3/lesson01Sentences';
import { lesson02Sentences } from '../../data/grammar/shinkanzen-n3/lesson02Sentences';
import {
  generateConjugationQuestion,
  generateExampleQuestion,
  generateFillBlankQuestion,
  generateFreeWritingQuestion,
  generateGrammarSelectionQuestion,
  generateJaToViQuestion,
  generateMultipleChoiceQuestion,
  generateStarQuestion,
  generateTransformationQuestion,
  generateViToJaQuestion,
  generateWordOrderQuestion,
} from './questionTypes';

const allGrammarSentences = [...lesson01Sentences, ...lesson02Sentences];

const DEFAULT_MIXED_TYPES: PracticeType[] = [
  'multiple_choice',
  'grammar_selection',
  'sentence_ordering',
  'star_question',
  'fill_blank',
];

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
  rawVocabulary?: unknown[];
  topicScope?: string[];
  requestedPracticeTypes?: PracticeType[];
}

export interface QuestionSet {
  id: string;
  seed: number;
  grammarId: string;
  questions: PracticeQuestion[];
}

export const generateSmartQuestionSet = (options: SmartGeneratorOptions): QuestionSet => {
  const { grammarRule, count, seed, requestedPracticeTypes } = options;
  const rng = new SeededRandom(seed);

  const questions: PracticeQuestion[] = [];
  const usedFingerprints = new Set<string>();

  const availableSentences = allGrammarSentences.filter((s) => s.grammarId === grammarRule.id);
  const shuffledSentences = rng.shuffle(availableSentences);

  if (shuffledSentences.length === 0) {
    return { id: `set-${seed}`, seed, grammarId: grammarRule.id, questions: [] };
  }

  let typesToUse: PracticeType[];
  if (requestedPracticeTypes && requestedPracticeTypes.length > 0) {
    if (requestedPracticeTypes.includes('mixed')) {
      const explicitNonMixed = requestedPracticeTypes.filter((t) => t !== 'mixed');
      const ruleMixedTypes = grammarRule.practiceTypes.filter((t) =>
        DEFAULT_MIXED_TYPES.includes(t),
      );
      typesToUse =
        explicitNonMixed.length > 0
          ? explicitNonMixed
          : ruleMixedTypes.length > 0
            ? ruleMixedTypes
            : DEFAULT_MIXED_TYPES;
    } else {
      typesToUse = requestedPracticeTypes;
    }
  } else {
    const ruleMixedTypes = grammarRule.practiceTypes.filter((t) =>
      DEFAULT_MIXED_TYPES.includes(t),
    );
    typesToUse = ruleMixedTypes.length > 0 ? ruleMixedTypes : DEFAULT_MIXED_TYPES;
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

    if (usedFingerprints.has(sentenceRecord.id)) {
      continue;
    }
    usedFingerprints.add(sentenceRecord.id);

    const pType = shuffledTypes[questions.length % shuffledTypes.length] || 'fill_blank';

    const baseQuestion = {
      id: `${sentenceRecord.id}-${seed}`,
      grammarId: grammarRule.id,
      hint: grammarRule.meaning,
      explanation: `Câu gốc: ${sentenceRecord.japanese}\nDịch: ${sentenceRecord.vietnamese}\nNgữ pháp: ${grammarRule.name} - ${grammarRule.meaning}\nGiải thích: ${grammarRule.explanation}`,
      metadata: {
        japanese: sentenceRecord.japanese,
        vietnamese: sentenceRecord.vietnamese,
        grammarName: grammarRule.name,
        grammarMeaning: grammarRule.meaning,
        grammarExplanation: grammarRule.explanation,
      },
    };

    const generatorCtx = {
      baseQuestion,
      grammarRule,
      sentenceRecord,
      rng,
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
      case 'star_question':
        questions.push(generateStarQuestion(generatorCtx));
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
    questions,
  };
};
