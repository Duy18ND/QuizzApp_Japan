import { minnaN5Book } from './minna-n5/allLessons';
import {
  minnaN5Sentences,
  soumatomeN5Book,
  soumatomeN5Sentences,
} from './minna-n5/minnaN5Sentences';
import {
  allN4GrammarSentences,
  minnaN4Book,
  shinkanzenN4Book,
} from './n4/allGrammarN4';
import {
  allN3ExtraGrammarSentences,
  minnaN3GrammarBook,
  shinkanzenN3ExtraChapters,
  soumatomeN3Book,
} from './shinkanzen-n3/extraLessonsN3';
import { shinkanzenN3Lesson01 } from './shinkanzen-n3/lesson01';
import { lesson01Sentences, type GrammarSentence } from './shinkanzen-n3/lesson01Sentences';
import { shinkanzenN3Lesson02 } from './shinkanzen-n3/lesson02';
import { lesson02Sentences } from './shinkanzen-n3/lesson02Sentences';
import type { GrammarBook } from '../../types/grammarEngine';

export { minnaN5Book, soumatomeN5Book, minnaN4Book, shinkanzenN4Book, soumatomeN3Book, minnaN3GrammarBook };

export const shinkanzenN3Book: GrammarBook = {
  id: 'SHINKANZEN_N3',
  title: 'Shin Kanzen Master Ngữ pháp N3',
  level: 'N3',
  chapters: [
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
  ],
};

export const grammarBooks: GrammarBook[] = [
  minnaN5Book,
  soumatomeN5Book,
  minnaN4Book,
  shinkanzenN4Book,
  shinkanzenN3Book,
  soumatomeN3Book,
  minnaN3GrammarBook,
];

export const allGrammarSentencesBank: GrammarSentence[] = [
  ...minnaN5Sentences,
  ...soumatomeN5Sentences,
  ...allN4GrammarSentences,
  ...lesson01Sentences,
  ...lesson02Sentences,
  ...allN3ExtraGrammarSentences,
];
