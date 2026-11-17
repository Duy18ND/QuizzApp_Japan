import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSmartQuestionSet } from '../utils/grammarEngine/questionGenerator.ts';
import { shinkanzenN3Lesson01 } from '../data/grammar/shinkanzen-n3/lesson01.ts';
import { shinkanzenN3Lesson02 } from '../data/grammar/shinkanzen-n3/lesson02.ts';
import type { PracticeQuestion } from '../types/grammar.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bank: Record<string, PracticeQuestion[]> = {};

[...shinkanzenN3Lesson01, ...shinkanzenN3Lesson02].forEach((rule) => {
  const qSet = generateSmartQuestionSet({
    grammarRule: rule,
    count: 20,
    seed: 12345,
    rawVocabulary: [],
    requestedPracticeTypes: ['mixed'],
  });
  bank[rule.id] = qSet.questions;
});

const output = `// Auto-generated file
import type { PracticeQuestion } from '../../../types/grammar';
import { shinkanzenN3Lesson01 } from './lesson01';
import { shinkanzenN3Lesson02 } from './lesson02';

export const lesson01PracticeBank: Record<string, PracticeQuestion[]> = ${JSON.stringify(bank, null, 2)};

export const validateGrammarPracticeBanks = () => {
  const expectedIds = [...shinkanzenN3Lesson01, ...shinkanzenN3Lesson02].map((r) => r.id);
  expectedIds.forEach((id) => {
    const qs = lesson01PracticeBank[id];
    if (!qs || qs.length !== 20) {
      console.error(\`Chưa có bộ câu luyện cho grammar này hoặc không đủ 20 câu: \${id}\`);
    }
  });
};
`;

const targetPath = path.resolve(
  __dirname,
  '../data/grammar/shinkanzen-n3/lesson01PracticeBank.ts',
);
fs.writeFileSync(targetPath, output, 'utf8');
console.log(`Generated ${Object.keys(bank).length} grammar rule banks (${Object.values(bank).reduce((sum, list) => sum + list.length, 0)} questions).`);
