import type { PracticeQuestion } from '../../types/grammar';
import { tokenizeJapanese } from './tokenizer';
import type { SmartGrammarRule } from '../../types/grammarEngine';

interface GeneratorContext {
  baseQuestion: any;
  sentence: string;
  hiraganaSentence: string;
  vietnameseSentence: string;
  targetVocab: any;
  targetConjugated: string;
  targetHint: string;
  blankedSentence: string;
  grammarRule: SmartGrammarRule;
  rng: any;
  slotValues: Record<string, any>;
  conjugatedSlotValues: Record<string, string>;
  chosenForms: Record<string, string>;
  targetSlotName: string;
  template: any;
}

export const generateMultipleChoiceQuestion = (ctx: GeneratorContext, distractors: string[]): PracticeQuestion => {
  const allAnswers = ctx.rng.shuffle([ctx.targetConjugated, ...distractors]);
  return {
    ...ctx.baseQuestion,
    type: 'multiple_choice',
    instruction: `Chọn đáp án đúng điền vào chỗ trống:`,
    question: `${ctx.blankedSentence}（${ctx.targetHint}）`,
    answers: allAnswers,
    correctAnswer: ctx.targetConjugated
  } as PracticeQuestion;
};

export const generateFillBlankQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  return {
    ...ctx.baseQuestion,
    type: 'fill_blank',
    instruction: `Điền từ thích hợp vào chỗ trống:`,
    question: `${ctx.blankedSentence}（${ctx.targetHint}）`,
    correctAnswer: ctx.targetConjugated
  } as PracticeQuestion;
};

export const generateConjugationQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  return {
    ...ctx.baseQuestion,
    type: 'conjugation',
    instruction: `Chia động từ trong ngoặc cho đúng:`,
    question: `${ctx.blankedSentence}（${ctx.targetHint}）`,
    correctAnswer: ctx.targetConjugated
  } as PracticeQuestion;
};

export const generateWordOrderQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const tokenObjects = tokenizeJapanese(ctx.sentence, {
    grammarKeywords: [ctx.grammarRule.hiragana, ctx.grammarRule.name],
    splitParticles: true,
    splitGrammarParticle: false
  });
  const parts = tokenObjects.map(t => t.text);
  return {
    ...ctx.baseQuestion,
    type: 'sentence_ordering',
    instruction: 'Sắp xếp các từ sau thành câu hoàn chỉnh:',
    question: '', // Handled by UI parts
    parts: ctx.rng.shuffle(parts),
    correctAnswer: ctx.sentence,
    metadata: { originalSentence: ctx.sentence }
  } as PracticeQuestion;
};

export const generateJaToViQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  return {
    ...ctx.baseQuestion,
    type: 'ja_to_vi',
    instruction: `Dịch câu sau sang tiếng Việt:`,
    question: ctx.sentence,
    correctAnswer: ctx.vietnameseSentence
  } as PracticeQuestion;
};

export const generateViToJaQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  return {
    ...ctx.baseQuestion,
    type: 'vi_to_ja',
    instruction: `Dịch câu sau sang tiếng Nhật:`,
    question: ctx.vietnameseSentence,
    correctAnswer: ctx.sentence
  } as PracticeQuestion;
};

export const generateTransformationQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  return {
    ...ctx.baseQuestion,
    type: 'sentence_transformation',
    instruction: `Biến đổi câu sau sử dụng ngữ pháp ${ctx.grammarRule.name}:`,
    question: ctx.sentence.replace(ctx.grammarRule.hiragana, ''), // naive fallback
    correctAnswer: ctx.sentence
  } as PracticeQuestion;
};

export const generateGrammarSelectionQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const distractors = ctx.rng.shuffle(['間に', 'てからでないと', 'ところだ']).slice(0, 3);
  const allAnswers = ctx.rng.shuffle([ctx.grammarRule.hiragana, ...distractors]);
  return {
    ...ctx.baseQuestion,
    type: 'grammar_selection',
    instruction: `Chọn cấu trúc ngữ pháp đúng:`,
    question: ctx.sentence.replace(ctx.grammarRule.hiragana, '＿＿＿＿＿'),
    answers: allAnswers,
    correctAnswer: ctx.grammarRule.hiragana
  } as PracticeQuestion;
};

export const generateFreeWritingQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  return {
    ...ctx.baseQuestion,
    type: 'free_writing',
    instruction: `Tự đặt một câu sử dụng ngữ pháp ${ctx.grammarRule.name}:`,
    question: `Từ gợi ý: ${ctx.targetHint}`,
    correctAnswer: ctx.sentence
  } as PracticeQuestion;
};

export const generateExampleQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const formApplied = ctx.chosenForms[ctx.targetSlotName] || 'Vる';
  const appliedPatternObj = ctx.grammarRule.patterns?.find(p => p.target === formApplied);
  
  return {
    ...ctx.baseQuestion,
    type: 'example',
    instruction: '',
    question: ctx.sentence,
    correctAnswer: ctx.vietnameseSentence,
    metadata: {
      japanese: ctx.sentence,
      hiragana: ctx.hiraganaSentence,
      vietnamese: ctx.vietnameseSentence,
      vocabulary: Object.values(ctx.slotValues).map(v => ({ kanji: v.kanji, hiragana: v.hiragana, meaning: v.meaning })),
      conjugation: {
        base: ctx.targetVocab.kanji || ctx.targetVocab.hiragana,
        conjugated: ctx.targetConjugated,
        rule: appliedPatternObj?.pattern || `${formApplied} + ${ctx.grammarRule.hiragana}`
      },
      pattern: ctx.template.pattern,
      slotValues: ctx.conjugatedSlotValues,
      grammarName: ctx.grammarRule.name,
      grammarHiragana: ctx.grammarRule.hiragana
    }
  } as PracticeQuestion;
};
