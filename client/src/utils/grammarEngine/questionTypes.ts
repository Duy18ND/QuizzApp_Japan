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

const getMergedTokens = (sentence: string, grammarKeywords: string[], splitParticles: boolean = false): string[] => {
  const tokenObjects = tokenizeJapanese(sentence, {
    grammarKeywords,
    splitParticles,
    splitGrammarParticle: false
  });
  
  const merged: string[] = [];
  for (const t of tokenObjects) {
    if (t.type === 'punctuation' && merged.length > 0) {
      merged[merged.length - 1] += t.text;
    } else {
      merged.push(t.text);
    }
  }
  return merged;
};


export const generateStarQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const sentence = ctx.sentenceRecord.japanese;
  const keyword = ctx.grammarRule.hiragana;
  
  // 1. Get fine-grained tokens and remove punctuation to prevent awkward chunks
  const rawObjs = tokenizeJapanese(sentence, { grammarKeywords: [keyword], splitParticles: true, splitGrammarParticle: false });
  const cleanTokens = rawObjs.map(t => t.text).filter(t => !['、', '。', '？', '！', '「', '」'].includes(t));
  
  let keywordIdx = cleanTokens.findIndex(t => t.includes(keyword));
  if (keywordIdx === -1) keywordIdx = Math.floor(cleanTokens.length / 2);
  
  const beforeTokens = cleanTokens.slice(0, keywordIdx);
  const afterTokens = cleanTokens.slice(keywordIdx + 1);
  
  // 2. Decide how many chunks to take from before and after
  let numBeforeChunks = Math.floor(ctx.rng.next() * 4); // 0, 1, 2, 3
  if (numBeforeChunks > beforeTokens.length) numBeforeChunks = beforeTokens.length;
  
  let numAfterChunks = 3 - numBeforeChunks;
  if (numAfterChunks > afterTokens.length) {
    numAfterChunks = afterTokens.length;
    numBeforeChunks = Math.min(3 - numAfterChunks, beforeTokens.length);
  }
  
  // 3. Extract tokens for chunks (approx 2 tokens per chunk for good sizing)
  const TOKENS_PER_CHUNK = 2;
  const beforeTokensToUseCount = Math.min(beforeTokens.length, numBeforeChunks * TOKENS_PER_CHUNK);
  const afterTokensToUseCount = Math.min(afterTokens.length, numAfterChunks * TOKENS_PER_CHUNK);
  
  const prefixTokens = beforeTokens.slice(0, beforeTokens.length - beforeTokensToUseCount);
  const beforeTokensToUse = beforeTokens.slice(beforeTokens.length - beforeTokensToUseCount);
  
  const afterTokensToUse = afterTokens.slice(0, afterTokensToUseCount);
  const suffixTokens = afterTokens.slice(afterTokensToUseCount);
  
  const prefix = prefixTokens.join('');
  const suffix = suffixTokens.join('') + (sentence.endsWith('。') ? '。' : ''); // Restore trailing period if needed
  
  // 4. Group tokens into the exact number of chunks
  const buildChunks = (tokens: string[], numChunks: number) => {
    if (numChunks === 0) return [];
    const res = Array(numChunks).fill('');
    for(let i = 0; i < tokens.length; i++) {
       const c = Math.floor((i * numChunks) / tokens.length);
       res[c] += tokens[i];
    }
    return res;
  };
  
  const beforeChunks = buildChunks(beforeTokensToUse, numBeforeChunks);
  const afterChunks = buildChunks(afterTokensToUse, numAfterChunks);
  
  const rawSlots = [...beforeChunks, cleanTokens[keywordIdx], ...afterChunks];
  
  // Pad if we somehow have fewer than 4 slots (very short sentences)
  while (rawSlots.length < 4) rawSlots.push('...');
  
  const chunks = rawSlots.map((text, idx) => ({
    id: `chunk_${idx}`,
    text,
    originalIndex: idx
  }));

  const shuffledChunks = ctx.rng.shuffle([...chunks]);
  const starIndex = numBeforeChunks; // The keyword is placed exactly after numBeforeChunks
  const correctChunk = chunks[starIndex];

  return {
    ...ctx.baseQuestion,
    type: 'star_question',
    instruction: 'Sắp xếp các từ sau thành câu hoàn chỉnh và chọn đáp án cho vị trí có ngôi sao (★):',
    question: '',
    sentenceParts: {
      prefix,
      suffix
    },
    chunks,
    shuffledChunks,
    starIndex,
    correctAnswer: correctChunk.text,
    metadata: { 
      originalSentence: sentence
    }
  } as PracticeQuestion;
};

export const generateWordOrderQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const tokens = getMergedTokens(ctx.sentenceRecord.japanese, [ctx.grammarRule.hiragana, ctx.grammarRule.name], true);
  
  const targetChunks = Math.min(tokens.length, 6);
  const parts: string[] = Array(targetChunks).fill('');
  for (let i = 0; i < tokens.length; i++) {
    const chunkIdx = Math.floor((i * targetChunks) / tokens.length);
    parts[chunkIdx] += tokens[i];
  }
  
  return {
    ...ctx.baseQuestion,
    type: 'sentence_ordering',
    instruction: 'Sắp xếp các phần sau thành câu hoàn chỉnh:',
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
  let analysis = ctx.sentenceRecord.analysis;
  
  if (!analysis) {
    const target = ctx.sentenceRecord.target || ctx.grammarRule.hiragana;
    const sentence = ctx.sentenceRecord.japanese;
    const parts = sentence.split(target);
    
    if (parts.length >= 2) {
      const before = parts[0];
      const after = parts.slice(1).join(target);
      
      let type = 'Vる';
      let rule = 'Vる';
      let base = before;
      
      if (before.endsWith('な')) {
        type = 'Aな';
        base = before.slice(0, -1) + '（だ）';
        rule = 'Aな + な';
      } else if (before.endsWith('い')) {
        type = 'Aい';
        rule = 'Aい';
      } else if (before.endsWith('の')) {
        type = 'N';
        base = before.slice(0, -1);
        rule = 'N + の';
      } else if (before.endsWith('ている')) {
        type = 'Vている';
        base = before.slice(0, -3) + 'る';
        rule = 'Vている';
      } else if (before.endsWith('ない')) {
        type = 'Vない';
        base = before.slice(0, -2) + 'る';
        rule = 'Vない';
      } else if (before.endsWith('た')) {
        type = 'Vた';
        base = before.slice(0, -1) + 'る';
        rule = 'Vた';
      }
      
      analysis = {
        pattern: `{${type}}${target}{Clause}`,
        slotValues: {
          [type]: before,
          "Clause": after
        },
        conjugation: {
          base,
          conjugated: before,
          rule
        }
      };
    }
  }

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
      grammarHiragana: ctx.grammarRule.hiragana,
      pattern: analysis?.pattern,
      slotValues: analysis?.slotValues,
      conjugation: analysis?.conjugation
    }
  } as PracticeQuestion;
};
