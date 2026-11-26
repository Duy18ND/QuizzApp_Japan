import { minnaN5Book } from './minna-n5/allLessons';
import {
  minnaN5Sentences,
  soumatomeN5Book,
  soumatomeN5Sentences,
} from './minna-n5/minnaN5Sentences';
import {
  allN4GrammarSentences,
  minnaN4Book as minnaN4SourceBook,
  shinkanzenN4Book,
} from './n4/allGrammarN4';
import { buildN4LessonChapters, getN4LessonNewSentences } from './n4/n4LessonLayout';
import {
  allN3ExtraGrammarSentences,
  minnaN3GrammarBook,
  shinkanzenN3ExtraChapters,
  soumatomeN3Book,
} from './shinkanzen-n3/extraLessonsN3';
import { shinkanzenN3Lesson01 } from './shinkanzen-n3/lesson01';
import { SKZ_N3_MORE_GRAMMARS, SKZ_N3_MORE_SENTENCES } from './shinkanzen-n3/moreLessons';
import { buildShinkanzenN3BookChapters, SKZ_BOOK_NEW_SENTENCES } from './shinkanzen-n3/bookStructure';
import { lesson01Sentences, type GrammarSentence } from './shinkanzen-n3/lesson01Sentences';
import { shinkanzenN3Lesson02 } from './shinkanzen-n3/lesson02';
import { lesson02Sentences } from './shinkanzen-n3/lesson02Sentences';
import type { GrammarBook } from '../../types/grammarEngine';

// N4: one chapter per lesson (Bài 26–50), built from both older N4 sets plus new points
const minnaN4Book: GrammarBook = {
  ...minnaN4SourceBook,
  chapters: buildN4LessonChapters(
    [...minnaN4SourceBook.chapters, ...shinkanzenN4Book.chapters].flatMap((c) => c.grammars),
  ),
};

export { minnaN5Book, soumatomeN5Book, minnaN4Book, shinkanzenN4Book, soumatomeN3Book, minnaN3GrammarBook };

const shinkanzenN3BaseChapters: GrammarBook['chapters'] = [
    {
      id: 'L01',
      bookId: 'SHINKANZEN_N3',
      chapterNumber: 1,
      title: 'Bài 1: Thời gian (～とき・～うちに・～間)',
      topics: ['time', 'condition'],
      grammars: shinkanzenN3Lesson01,
    },
    {
      id: 'L02',
      bookId: 'SHINKANZEN_N3',
      chapterNumber: 2,
      title: 'Bài 2: Liên quan & Tùy theo (～とおり・～によって・～たびに)',
      topics: ['time', 'comparison', 'condition', 'degree'],
      grammars: shinkanzenN3Lesson02,
    },
    ...shinkanzenN3ExtraChapters,
];

export const shinkanzenN3Book: GrammarBook = {
  id: 'SHINKANZEN_N3',
  title: 'Ngữ pháp N3',
  level: 'N3',
  // Laid out after the book's table of contents (see shinkanzen-n3/bookStructure.ts)
  chapters: buildShinkanzenN3BookChapters([
    ...shinkanzenN3BaseChapters.flatMap((ch) => ch.grammars),
    ...Object.values(SKZ_N3_MORE_GRAMMARS).flat(),
  ]),
};

export const grammarBooks: GrammarBook[] = [
  { ...minnaN5Book, title: 'Ngữ pháp N5' },
  { ...minnaN4Book, title: 'Ngữ pháp N4' },
  shinkanzenN3Book,
];

export const allGrammarSentencesBank: GrammarSentence[] = [
  ...minnaN5Sentences,
  ...soumatomeN5Sentences,
  ...allN4GrammarSentences,
  ...getN4LessonNewSentences(),
  ...lesson01Sentences,
  ...lesson02Sentences,
  ...allN3ExtraGrammarSentences,
  ...SKZ_N3_MORE_SENTENCES,
  ...SKZ_BOOK_NEW_SENTENCES,
];
