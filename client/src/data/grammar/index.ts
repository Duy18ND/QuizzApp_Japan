import { shinkanzenN3Lesson01 } from './shinkanzen-n3/lesson01';
import { shinkanzenN3Lesson02 } from './shinkanzen-n3/lesson02';
import type { GrammarBook } from '../../types/grammarEngine';

export const shinkanzenN3Book: GrammarBook = {
  id: 'SHINKANZEN_N3',
  title: 'Shin Kanzen Master Ngữ pháp N3',
  level: 'N3',
  chapters: [
    {
      id: 'L01',
      bookId: 'SHINKANZEN_N3',
      chapterNumber: 1,
      title: 'Bài 1: Thời gian (～とき)',
      topics: ['time', 'condition'],
      grammars: shinkanzenN3Lesson01
    },
    {
      id: 'L02',
      bookId: 'SHINKANZEN_N3',
      chapterNumber: 2,
      title: 'Bài 2: Liên quan đến (～と関係して)',
      topics: ['time', 'comparison', 'condition', 'degree'],
      grammars: shinkanzenN3Lesson02
    }
  ]
};

export const grammarBooks: GrammarBook[] = [
  shinkanzenN3Book
];
