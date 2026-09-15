import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const questionsPath = path.join(__dirname, '../../client/src/data/questions.json');
  const data = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

  console.log(`Loaded ${data.length} questions from JSON.`);

  let updated = 0;
  // Deduplicate by wordId
  const wordsMap = new Map();
  for (const item of data) {
    if (item.wordId && (item.hanviet || item.wordType)) {
      wordsMap.set(item.wordId, {
        hanViet: item.hanviet || null,
        wordType: item.wordType || null,
      });
    }
  }

  for (const [wordId, fields] of wordsMap.entries()) {
    try {
      await prisma.word.update({
        where: { id: wordId },
        data: {
          hanViet: fields.hanViet,
          wordType: fields.wordType
        }
      });
      updated++;
    } catch (e) {
      console.log(`Word ID ${wordId} not found in DB`);
    }
  }

  console.log(`Successfully updated ${updated} words in the database.`);
}

main().catch(console.error);
