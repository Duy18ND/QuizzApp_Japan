import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const questionsPath = path.resolve(__dirname, '../../client/src/data/questions.json');
  const answersPath = path.resolve(__dirname, '../../client/src/data/answers.json');

  const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
  const answers = JSON.parse(fs.readFileSync(answersPath, 'utf8'));

  // Ensure Book exists
  let book = await prisma.book.findFirst({ where: { title: 'Mimi kara Oboeru N3' } });
  if (!book) {
    book = await prisma.book.create({
      data: {
        title: 'Mimi kara Oboeru N3',
        level: 'N3',
        description: 'Vocabulary'
      }
    });
  }

  // Ensure Unit exists
  let unit = await prisma.unit.findFirst({ where: { bookId: book.id, unitNumber: 1 } });
  if (!unit) {
    unit = await prisma.unit.create({
      data: {
        bookId: book.id,
        unitNumber: 1,
        title: 'Unit 1'
      }
    });
  }

  // Extract unique words
  const wordsMap = new Map<number, any>();
  for (const q of questions) {
    if (!wordsMap.has(q.wordId)) {
      const a = answers.find((ans: any) => ans.questionId === q.id);
      if (a) {
        wordsMap.set(q.wordId, {
          wordNumber: q.wordId,
          kanji: a.kanji || '',
          hiragana: a.hiragana || '',
          meaning: a.meaning || '',
        });
      }
    }
  }

  const wordsToInsert = Array.from(wordsMap.values());
  console.log(`Found ${wordsToInsert.length} unique words.`);

  for (const w of wordsToInsert) {
    await prisma.word.upsert({
      where: {
        unitId_wordNumber: {
          unitId: unit.id,
          wordNumber: w.wordNumber
        }
      },
      update: {
        kanji: w.kanji,
        hiragana: w.hiragana,
        meaning: w.meaning
      },
      create: {
        unitId: unit.id,
        wordNumber: w.wordNumber,
        kanji: w.kanji,
        hiragana: w.hiragana,
        meaning: w.meaning
      }
    });
  }

  console.log('Migration complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
