import type { PracticeQuestion } from '../../types/grammar';
import { tokenizeJapanese } from './tokenizer';
import type { SmartGrammarRule } from '../../types/grammarEngine';
import type { GrammarSentence } from '../../data/grammar/shinkanzen-n3/lesson01Sentences';

interface GeneratorRng {
  next(): number;
  shuffle<T>(arr: T[]): T[];
}

interface GeneratorContext {
  baseQuestion: {
    id: string;
    grammarId: string;
    hint?: string;
    explanation?: string;
    metadata?: Record<string, unknown>;
  };
  grammarRule: SmartGrammarRule;
  sentenceRecord: GrammarSentence;
  rng: GeneratorRng;
}

const GRAMMAR_POOL_BY_LEVEL: Record<string, string[]> = {
  N5: ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'から', 'まで', 'てください', 'てもいいです', 'てはいけません', 'たいです', 'つもりです'],
  N4: ['んです', 'ながら', 'し', 'てあります', 'ておきます', 'てしまいます', 'ほうがいいです', 'ように', 'のに', 'ために', 'そうです', 'ようです', 'らしいです', 'はず', 'おかげで', 'せいで'],
  N3: [
    'うちに',
    '間',
    '間に',
    'てからでないと',
    'ところ',
    'とおりに',
    'どおりに',
    'によって',
    'によっては',
    'たびに',
    'ついでに',
    'ほど',
    'ばかりに',
    'ことから',
    'だけに',
    'としたら',
    'くせに',
    'にもかかわらず',
    'がち',
    'ぎみ',
    'っぱなし',
    'にとって',
    'に対して',
    'をめぐって',
    'をもとに',
    'を通じて',
    'に違いない',
    'わけにはいかない',
  ],
};

const RULE_SYNONYM_EXCLUSIONS: Record<string, string[]> = {
  'N3-SKZ-L01-UCHINI-01': ['うちに'],
  'N3-SKZ-L01-UCHINI-02': ['うちに'],
  'N3-SKZ-L01-AIDA': ['間'],
  'N3-SKZ-L01-AIDANI': ['間に'],
  'N3-SKZ-L01-TEKARA-DENAITO': ['てからでないと', 'でからでないと'],
  'N3-SKZ-L01-TOKORO': ['ところ', 'ところだ'],
  N3_L02_G001: [
    'とおり',
    'とおりに',
    'とおりだ',
    'とおりの',
    'とおりでした',
    'どおり',
    'どおりに',
    'どおりの',
    'のとおりに',
    'のとおりでした',
  ],
  N3_L02_G002: ['によって', 'によっては'],
  N3_L02_G003: ['たびに', 'のたびに'],
  N3_L02_G004: ['ほど'],
  N3_L02_G005: ['ついでに'],
};

const buildGrammarDistractors = (
  target: string,
  grammarId: string,
  rng: GeneratorRng,
  level?: string,
): string[] => {
  const levelPool =
    GRAMMAR_POOL_BY_LEVEL[level ?? 'N3'] ?? GRAMMAR_POOL_BY_LEVEL.N3;
  const excluded = new Set<string>([target, ...(RULE_SYNONYM_EXCLUSIONS[grammarId] || [])]);
  const candidates: string[] = [];

  if (target.endsWith('ほど')) {
    const hodoMatch = target.match(/^(.+?)(?:ば|ければ|なら)(.+?)ほど$/);
    if (hodoMatch) {
      const tail = hodoMatch[2];
      candidates.push(`${tail}たびに`, `${tail}うちに`, `${tail}ばかりに`, `${tail}とおりに`);
    } else if (target.endsWith('人ほど')) {
      candidates.push('人によって', '人ばかり', '人のたびに', '人のように');
    }
  } else if (target.endsWith('ついでに')) {
    const prefix = target.slice(0, -'ついでに'.length);
    if (prefix === 'の') {
      candidates.push('のたびに', 'のとおりに', 'の間に', 'のかわりに');
    } else if (prefix.endsWith('た')) {
      candidates.push(`${prefix}とおりに`, `${prefix}あとで`, `${prefix}ばかりに`, `${prefix}まま`);
    } else if (prefix) {
      candidates.push(`${prefix}たびに`, `${prefix}うちに`, `${prefix}前に`, `${prefix}ために`);
    }
  } else if (target.endsWith('でした')) {
    const stem = target.replace(/^の/, '').replace(/でした$/, '');
    candidates.push(`の${stem}ではなくて`, 'の間でした', 'のようでした', 'の予定でした');
  } else if (target.startsWith('の')) {
    candidates.push('のたびに', 'のとおりに', 'の間に', 'のついでに', 'のおかげで');
  }

  const picked: string[] = [];
  const addCandidate = (item: string) => {
    if (!item || excluded.has(item) || picked.includes(item)) return;
    picked.push(item);
  };

  for (const c of rng.shuffle(candidates)) {
    if (picked.length >= 3) break;
    addCandidate(c);
  }

  for (const g of rng.shuffle(levelPool)) {
    if (picked.length >= 3) break;
    addCandidate(g);
  }

  for (const g of rng.shuffle(GRAMMAR_POOL_BY_LEVEL.N3)) {
    if (picked.length >= 3) break;
    addCandidate(g);
  }

  return picked.slice(0, 3);
};

export const generateMultipleChoiceQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const target = ctx.sentenceRecord.target || ctx.grammarRule.hiragana;
  const distractors = buildGrammarDistractors(
    target,
    ctx.grammarRule.id,
    ctx.rng,
    ctx.grammarRule.level,
  );
  const allAnswers = ctx.rng.shuffle([target, ...distractors]);
  const blanked = ctx.sentenceRecord.japanese.replace(target, '＿＿＿＿＿');

  return {
    ...ctx.baseQuestion,
    type: 'multiple_choice',
    instruction: 'Chọn đáp án đúng điền vào chỗ trống:',
    question: blanked,
    answers: allAnswers,
    correctAnswer: target,
  } as PracticeQuestion;
};

export const generateFillBlankQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const target = ctx.sentenceRecord.target || ctx.grammarRule.hiragana;
  const blanked = ctx.sentenceRecord.japanese.replace(target, '＿＿＿＿＿');

  return {
    ...ctx.baseQuestion,
    type: 'fill_blank',
    instruction: 'Điền từ thích hợp vào chỗ trống:',
    question: blanked,
    correctAnswer: target,
  } as PracticeQuestion;
};

export const generateConjugationQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const conjugation = ctx.sentenceRecord.analysis?.conjugation;
  if (conjugation?.conjugated && conjugation?.base) {
    const blanked = ctx.sentenceRecord.japanese.replace(conjugation.conjugated, '＿＿＿＿＿');
    return {
      ...ctx.baseQuestion,
      type: 'conjugation',
      instruction: 'Chia động từ / từ trong ngoặc cho đúng:',
      question: `${blanked}（${conjugation.base}）`,
      correctAnswer: conjugation.conjugated,
    } as PracticeQuestion;
  }

  const target = ctx.sentenceRecord.target || ctx.grammarRule.hiragana;
  const blanked = ctx.sentenceRecord.japanese.replace(target, '＿＿＿＿＿');

  return {
    ...ctx.baseQuestion,
    type: 'conjugation',
    instruction: 'Điền dạng chia / cấu trúc ngữ pháp phù hợp vào chỗ trống:',
    question: `${blanked}（Nghĩa: ${ctx.sentenceRecord.vietnamese}）`,
    correctAnswer: target,
  } as PracticeQuestion;
};

const getMergedTokens = (
  sentence: string,
  grammarKeywords: string[],
  splitParticles: boolean = false,
): string[] => {
  const tokenObjects = tokenizeJapanese(sentence, {
    grammarKeywords,
    splitParticles,
    splitGrammarParticle: false,
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
  const keyword = ctx.sentenceRecord.target || ctx.grammarRule.hiragana;

  const rawObjs = tokenizeJapanese(sentence, {
    grammarKeywords: [keyword, ctx.grammarRule.hiragana].filter(Boolean),
    splitParticles: true,
    splitGrammarParticle: false,
  });
  const cleanTokens = rawObjs
    .map((t) => t.text)
    .filter((t) => !['、', '。', '？', '！', '「', '」'].includes(t));

  let keywordIdx = cleanTokens.findIndex((t) => t.includes(keyword));
  if (keywordIdx === -1) {
    keywordIdx = cleanTokens.findIndex((t) => t.includes(ctx.grammarRule.hiragana));
  }
  if (keywordIdx === -1) keywordIdx = Math.floor(cleanTokens.length / 2);

  const beforeTokens = cleanTokens.slice(0, keywordIdx);
  const afterTokens = cleanTokens.slice(keywordIdx + 1);

  let numBeforeChunks = Math.floor(ctx.rng.next() * 4);
  if (numBeforeChunks > beforeTokens.length) numBeforeChunks = beforeTokens.length;

  let numAfterChunks = 3 - numBeforeChunks;
  if (numAfterChunks > afterTokens.length) {
    numAfterChunks = afterTokens.length;
    numBeforeChunks = Math.min(3 - numAfterChunks, beforeTokens.length);
  }

  const TOKENS_PER_CHUNK = 2;
  const beforeTokensToUseCount = Math.min(
    beforeTokens.length,
    numBeforeChunks * TOKENS_PER_CHUNK,
  );
  const afterTokensToUseCount = Math.min(afterTokens.length, numAfterChunks * TOKENS_PER_CHUNK);

  const prefixTokens = beforeTokens.slice(0, beforeTokens.length - beforeTokensToUseCount);
  const beforeTokensToUse = beforeTokens.slice(beforeTokens.length - beforeTokensToUseCount);

  const afterTokensToUse = afterTokens.slice(0, afterTokensToUseCount);
  const suffixTokens = afterTokens.slice(afterTokensToUseCount);

  const prefix = prefixTokens.join('');
  const suffix = suffixTokens.join('') + (sentence.endsWith('。') ? '。' : '');

  const buildChunks = (tokens: string[], numChunks: number): string[] => {
    if (numChunks === 0) return [];
    const res: string[] = Array(numChunks).fill('');
    for (let i = 0; i < tokens.length; i++) {
      const c = Math.floor((i * numChunks) / tokens.length);
      res[c] += tokens[i];
    }
    return res;
  };

  const beforeChunks = buildChunks(beforeTokensToUse, numBeforeChunks);
  const afterChunks = buildChunks(afterTokensToUse, numAfterChunks);

  const rawSlots = [...beforeChunks, cleanTokens[keywordIdx] || keyword, ...afterChunks];
  let starIndex = numBeforeChunks;

  // If a very short sentence still has fewer than 4 slots, split the longest non-star chunk.
  while (rawSlots.length < 4) {
    let splitIdx = -1;
    let bestLen = 1;
    for (let i = 0; i < rawSlots.length; i++) {
      if (i !== starIndex && rawSlots[i].length > bestLen) {
        bestLen = rawSlots[i].length;
        splitIdx = i;
      }
    }
    if (splitIdx === -1) {
      splitIdx = rawSlots.findIndex((s) => s.length > 1);
    }
    if (splitIdx === -1) break;

    const text = rawSlots[splitIdx];
    const mid = Math.ceil(text.length / 2);
    rawSlots.splice(splitIdx, 1, text.slice(0, mid), text.slice(mid));
    if (splitIdx < starIndex) starIndex += 1;
  }

  const chunks = rawSlots.map((text, idx) => ({
    id: `chunk_${idx}`,
    text,
    originalIndex: idx,
  }));

  const shuffledChunks = ctx.rng.shuffle([...chunks]);
  const correctChunk = chunks[starIndex];

  return {
    ...ctx.baseQuestion,
    type: 'star_question',
    instruction:
      'Sắp xếp các từ sau thành câu hoàn chỉnh và chọn đáp án cho vị trí có ngôi sao (★):',
    question: '',
    sentenceParts: {
      prefix,
      suffix,
    },
    chunks,
    shuffledChunks,
    starIndex,
    correctAnswer: correctChunk?.text || keyword,
    metadata: {
      originalSentence: sentence,
    },
  } as PracticeQuestion;
};

export const generateWordOrderQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const keywords = [
    ctx.sentenceRecord.target || '',
    ctx.grammarRule.hiragana,
    ctx.grammarRule.name,
  ].filter(Boolean);
  const tokens = getMergedTokens(ctx.sentenceRecord.japanese, keywords, true);

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
    metadata: {
      originalSentence: ctx.sentenceRecord.japanese,
    },
  } as PracticeQuestion;
};

export const generateJaToViQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  return {
    ...ctx.baseQuestion,
    type: 'ja_to_vi',
    instruction: 'Dịch câu sau sang tiếng Việt:',
    question: ctx.sentenceRecord.japanese,
    correctAnswer: ctx.sentenceRecord.vietnamese,
  } as PracticeQuestion;
};

export const generateViToJaQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  return {
    ...ctx.baseQuestion,
    type: 'vi_to_ja',
    instruction: 'Dịch câu sau sang tiếng Nhật:',
    question: ctx.sentenceRecord.vietnamese,
    correctAnswer: ctx.sentenceRecord.japanese,
  } as PracticeQuestion;
};

export const generateTransformationQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const target = ctx.sentenceRecord.target || ctx.grammarRule.hiragana;
  return {
    ...ctx.baseQuestion,
    type: 'sentence_transformation',
    instruction: `Biến đổi câu sau sử dụng ngữ pháp ${ctx.grammarRule.name}:`,
    question: ctx.sentenceRecord.japanese.replace(target, ''),
    correctAnswer: ctx.sentenceRecord.japanese,
  } as PracticeQuestion;
};

export const generateGrammarSelectionQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  const target = ctx.sentenceRecord.target || ctx.grammarRule.hiragana;
  const distractors = buildGrammarDistractors(
    target,
    ctx.grammarRule.id,
    ctx.rng,
    ctx.grammarRule.level,
  );
  const allAnswers = ctx.rng.shuffle([target, ...distractors]);
  const blanked = ctx.sentenceRecord.japanese.replace(target, '＿＿＿＿＿');

  return {
    ...ctx.baseQuestion,
    type: 'grammar_selection',
    instruction: 'Chọn cấu trúc ngữ pháp đúng:',
    question: blanked,
    answers: allAnswers,
    correctAnswer: target,
  } as PracticeQuestion;
};

export const generateFreeWritingQuestion = (ctx: GeneratorContext): PracticeQuestion => {
  return {
    ...ctx.baseQuestion,
    type: 'free_writing',
    instruction: `Tự đặt một câu sử dụng ngữ pháp ${ctx.grammarRule.name}:`,
    question: `Từ gợi ý: ${ctx.sentenceRecord.target || ctx.grammarRule.hiragana}`,
    correctAnswer: ctx.sentenceRecord.japanese,
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
          Clause: after,
        },
        conjugation: {
          base,
          conjugated: before,
          rule,
        },
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
      conjugation: analysis?.conjugation,
    },
  } as PracticeQuestion;
};
