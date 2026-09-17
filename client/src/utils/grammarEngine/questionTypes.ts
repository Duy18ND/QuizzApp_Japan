import type { PracticeQuestion } from '../../types/grammar';
import { tokenizeJapanese } from './tokenizer';
import type { SmartGrammarRule } from '../../types/grammarEngine';
import type { GrammarSentence } from '../../data/grammar/shinkanzen-n3/lesson01Sentences';

interface GeneratorContext {
  baseQuestion: any;
  grammarRule: SmartGrammarRule;
  sentenceRecord: GrammarSentence;
  rng: any;
}

const generateDistractors = (target: string): string[] => {
  if (!target) return ['A', 'B', 'C'];
  // Very naive distractor generation based on string endings
  if (target.endsWith('ている')) return [target.replace('ている', 'た'), target.replace('ている', 'て'), target.replace('ている', 'ない')];
  if (target.endsWith('た')) return [target.replace('た', 'ている'), target.replace('た', 'て'), target.replace('た', 'ない')];
  if (target.endsWith('て')) return [target.replace('て', 'た'), target.replace('て', 'ている'), target.replace('て', 'ない')];
  if (target.endsWith('ない')) return [target.replace('ない', 'た'), target.replace('ない', 'ている'), target.replace('ない', 'て')];
  return [target + 'た', target + 'ている', target + 'ない'];
};

export const generateMultipleChoiceQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const target = ctx.sentenceRecord.target || ctx.grammarRule.hiragana;
  const distractors = generateDistractors(target);
  const allAnswers = ctx.rng.shuffle([target, ...distractors]);
  const blanked = ctx.sentenceRecord.japanese.replace(target, '＿＿＿＿＿');
  
  return {
    ...ctx.baseQuestion,
    type: 'multiple_choice',
    instruction: `Chọn đáp án đúng điền vào chỗ trống:`,
    question: blanked,
    answers: allAnswers,
    correctAnswer: target
  } as PracticeQuestion;
};

export const generateFillBlankQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const target = ctx.sentenceRecord.target || ctx.grammarRule.hiragana;
  const blanked = ctx.sentenceRecord.japanese.replace(target, '＿＿＿＿＿');
  
  return {
    ...ctx.baseQuestion,
    type: 'fill_blank',
    instruction: `Điền từ thích hợp vào chỗ trống:`,
    question: blanked,
    correctAnswer: target
  } as PracticeQuestion;
};

export const generateConjugationQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const target = ctx.sentenceRecord.target || ctx.grammarRule.hiragana;
  const blanked = ctx.sentenceRecord.japanese.replace(target, '＿＿＿＿＿');
  
  return {
    ...ctx.baseQuestion,
    type: 'conjugation',
    instruction: `Chia động từ trong ngoặc cho đúng:`,
    question: `${blanked}（${target}）`,
    correctAnswer: target
  } as PracticeQuestion;
};

export const generateWordOrderQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const tokenObjects = tokenizeJapanese(ctx.sentenceRecord.japanese, {
    grammarKeywords: [ctx.grammarRule.hiragana, ctx.grammarRule.name],
    splitParticles: true,
    splitGrammarParticle: false
  });
  const parts = tokenObjects.map(t => t.text);
  
  return {
    ...ctx.baseQuestion,
    type: 'sentence_ordering',
    instruction: 'Sắp xếp các từ sau thành câu hoàn chỉnh:',
    question: '',
    parts: ctx.rng.shuffle(parts),
    correctAnswer: ctx.sentenceRecord.japanese,
    metadata: { originalSentence: ctx.sentenceRecord.japanese }
  } as PracticeQuestion;
};

export const generateJaToViQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  return {
    ...ctx.baseQuestion,
    type: 'ja_to_vi',
    instruction: `Dịch câu sau sang tiếng Việt:`,
    question: ctx.sentenceRecord.japanese,
    correctAnswer: ctx.sentenceRecord.vietnamese
  } as PracticeQuestion;
};

export const generateViToJaQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  return {
    ...ctx.baseQuestion,
    type: 'vi_to_ja',
    instruction: `Dịch câu sau sang tiếng Nhật:`,
    question: ctx.sentenceRecord.vietnamese,
    correctAnswer: ctx.sentenceRecord.japanese
  } as PracticeQuestion;
};

export const generateTransformationQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  return {
    ...ctx.baseQuestion,
    type: 'sentence_transformation',
    instruction: `Biến đổi câu sau sử dụng ngữ pháp ${ctx.grammarRule.name}:`,
    question: ctx.sentenceRecord.japanese.replace(ctx.grammarRule.hiragana, ''), // naive fallback
    correctAnswer: ctx.sentenceRecord.japanese
  } as PracticeQuestion;
};

export const generateGrammarSelectionQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const distractors = ctx.rng.shuffle(['間に', 'てからでないと', 'ところだ']).slice(0, 3);
  const target = ctx.grammarRule.hiragana;
  const allAnswers = ctx.rng.shuffle([target, ...distractors]);
  const blanked = ctx.sentenceRecord.japanese.replace(target, '＿＿＿＿＿');
  
  return {
    ...ctx.baseQuestion,
    type: 'grammar_selection',
    instruction: `Chọn cấu trúc ngữ pháp đúng:`,
    question: blanked,
    answers: allAnswers,
    correctAnswer: target
  } as PracticeQuestion;
};

export const generateFreeWritingQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  return {
    ...ctx.baseQuestion,
    type: 'free_writing',
    instruction: `Tự đặt một câu sử dụng ngữ pháp ${ctx.grammarRule.name}:`,
    question: `Từ gợi ý: ${ctx.sentenceRecord.target || ctx.grammarRule.hiragana}`,
    correctAnswer: ctx.sentenceRecord.japanese
  } as PracticeQuestion;
};

export const generateExampleQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  return {
    ...ctx.baseQuestion,
    type: 'example',
    instruction: '',
    question: ctx.sentenceRecord.japanese,
    correctAnswer: ctx.sentenceRecord.vietnamese,
    metadata: {
      japanese: ctx.sentenceRecord.japanese,
      hiragana: ctx.sentenceRecord.hiragana,
      vietnamese: ctx.sentenceRecord.vietnamese,
      grammarName: ctx.grammarRule.name,
      grammarHiragana: ctx.grammarRule.hiragana
    }
  } as PracticeQuestion;
};
