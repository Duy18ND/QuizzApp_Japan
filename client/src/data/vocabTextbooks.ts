import type { CmsSnapshot } from '../services/adminCmsService';
import { getLiveAllVocabulary, getLiveUnitsForLevel } from '../services/curriculumStore';
import type { JLPTLevel } from '../types/quiz';
import type { VocabularyItem } from '../types/vocabulary';
import type { UnitMeta } from './unitData';

export interface VocabTextbookSpec {
  id: string;
  level: JLPTLevel;
  title: string;
  shortTitle: string;
  japaneseTitle: string;
  description: string;
  /** Default unit numbers mapped to this textbook within its JLPT level */
  unitIds: number[];
  /** Optional lowercase keywords to match dynamically created Admin CMS units */
  matchKeywords: string[];
}

export const VOCAB_TEXTBOOKS: Record<JLPTLevel, VocabTextbookSpec[]> = {
  N5: [
    {
      id: 'minna-n5',
      level: 'N5',
      title: 'Minna no Nihongo I',
      shortTitle: 'Minna I',
      japaneseTitle: 'みんなの日本語 初級I',
      description: 'Giáo trình nhập môn kinh điển (Bài 1–25), từ vựng giao tiếp đời sống cơ bản.',
      unitIds: [1],
      matchKeywords: ['minna', 'mina'],
    },
    {
      id: 'shinkanzen-n5',
      level: 'N5',
      title: 'Shin Kanzen Master N5',
      shortTitle: 'Shin Kanzen N5',
      japaneseTitle: '新完全マスター N5',
      description: 'Từ vựng trọng tâm bám sát cấu trúc đề thi JLPT N5.',
      unitIds: [],
      matchKeywords: ['kanzen', 'shinkanzen'],
    },
    {
      id: 'mimi-n5',
      level: 'N5',
      title: 'Mimi kara Oboeru N5',
      shortTitle: 'Mimi kara N5',
      japaneseTitle: '耳から覚える N5',
      description: 'Luyện nhớ từ vựng sơ cấp qua âm thanh và câu ví dụ ngắn.',
      unitIds: [],
      matchKeywords: ['mimi'],
    },
    {
      id: 'soumatome-n5',
      level: 'N5',
      title: 'Nihongo Sou Matome N5',
      shortTitle: 'Sou Matome N5',
      japaneseTitle: '日本語総まとめ N5',
      description: 'Hệ thống từ vựng N5 chia nhỏ theo từng ngày, dễ ôn tập nhanh.',
      unitIds: [],
      matchKeywords: ['matome', 'soumatome'],
    },
  ],
  N4: [
    {
      id: 'minna-n4',
      level: 'N4',
      title: 'Minna no Nihongo II',
      shortTitle: 'Minna II',
      japaneseTitle: 'みんなの日本語 初級II',
      description: 'Tiếp nối sơ cấp (Bài 26–50), mở rộng động từ và mẫu giao tiếp hằng ngày.',
      unitIds: [1],
      matchKeywords: ['minna', 'mina'],
    },
    {
      id: 'shinkanzen-n4',
      level: 'N4',
      title: 'Shin Kanzen Master N4',
      shortTitle: 'Shin Kanzen N4',
      japaneseTitle: '新完全マスター N4',
      description: 'Giáo trình từ vựng chuyên sâu chuẩn bị trực tiếp cho kỳ thi JLPT N4.',
      unitIds: [],
      matchKeywords: ['kanzen', 'shinkanzen'],
    },
    {
      id: 'mimi-n4',
      level: 'N4',
      title: 'Mimi kara Oboeru N4',
      shortTitle: 'Mimi kara N4',
      japaneseTitle: '耳から覚える N4',
      description: 'Học từ vựng N4 theo chủ đề kết hợp luyện phản xạ nghe phát âm.',
      unitIds: [],
      matchKeywords: ['mimi'],
    },
    {
      id: 'soumatome-n4',
      level: 'N4',
      title: 'Nihongo Sou Matome N4',
      shortTitle: 'Sou Matome N4',
      japaneseTitle: '日本語総まとめ N4',
      description: 'Tổng ôn từ vựng sơ trung cấp theo lộ trình từng tuần.',
      unitIds: [],
      matchKeywords: ['matome', 'soumatome'],
    },
  ],
  N3: [
    {
      id: 'mimi-n3',
      level: 'N3',
      title: 'Mimi kara Oboeru N3',
      shortTitle: 'Mimi kara N3',
      japaneseTitle: '耳から覚える N3',
      description: 'Giáo trình từ vựng N3 phổ biến nhất kèm phân loại từ loại, Hán Việt và phát âm.',
      unitIds: [1, 2],
      matchKeywords: ['mimi'],
    },
    {
      id: 'shinkanzen-n3',
      level: 'N3',
      title: 'Shin Kanzen Master N3',
      shortTitle: 'Shin Kanzen N3',
      japaneseTitle: '新完全マスター N3',
      description: 'Từ vựng luyện thi trung cấp theo ngữ cảnh, đồng nghĩa và cụm từ cố định.',
      unitIds: [],
      matchKeywords: ['kanzen', 'shinkanzen'],
    },
    {
      id: 'minna-n3',
      level: 'N3',
      title: 'Minna no Nihongo Chuukyuu I',
      shortTitle: 'Minna Trung cấp I',
      japaneseTitle: 'みんなの日本語 中級I',
      description: 'Từ vựng giáo trình Minna trung cấp I cho người học chuyển tiếp từ N4 lên N3.',
      unitIds: [],
      matchKeywords: ['minna', 'mina'],
    },
    {
      id: 'soumatome-n3',
      level: 'N3',
      title: 'Nihongo Sou Matome N3',
      shortTitle: 'Sou Matome N3',
      japaneseTitle: '日本語総まとめ N3',
      description: 'Tổng hợp từ vựng N3 theo chủ đề trong 6 tuần luyện thi.',
      unitIds: [],
      matchKeywords: ['matome', 'soumatome'],
    },
  ],
  N2: [
    {
      id: 'shinkanzen-n2',
      level: 'N2',
      title: 'Shin Kanzen Master N2',
      shortTitle: 'Shin Kanzen N2',
      japaneseTitle: '新完全マスター N2',
      description: 'Từ vựng học thuật, công sở và phân biệt sắc thái từ gần nghĩa cấp N2.',
      unitIds: [1],
      matchKeywords: ['kanzen', 'shinkanzen'],
    },
    {
      id: 'mimi-n2',
      level: 'N2',
      title: 'Mimi kara Oboeru N2',
      shortTitle: 'Mimi kara N2',
      japaneseTitle: '耳から覚える N2',
      description: 'Từ vựng trọng tâm JLPT N2 kèm từ đồng nghĩa, trái nghĩa và ví dụ thực tế.',
      unitIds: [],
      matchKeywords: ['mimi'],
    },
    {
      id: 'minna-n2',
      level: 'N2',
      title: 'Minna no Nihongo Chuukyuu II',
      shortTitle: 'Minna Trung cấp II',
      japaneseTitle: 'みんなの日本語 中級II',
      description: 'Giáo trình Minna trung cấp II mở rộng vốn từ giao tiếp và đọc hiểu.',
      unitIds: [],
      matchKeywords: ['minna', 'mina'],
    },
    {
      id: 'soumatome-n2',
      level: 'N2',
      title: 'Nihongo Sou Matome N2',
      shortTitle: 'Sou Matome N2',
      japaneseTitle: '日本語総まとめ N2',
      description: 'Hệ thống hóa từ vựng N2 theo lộ trình 8 tuần dễ ghi nhớ.',
      unitIds: [],
      matchKeywords: ['matome', 'soumatome'],
    },
  ],
  N1: [
    {
      id: 'shinkanzen-n1',
      level: 'N1',
      title: 'Shin Kanzen Master N1',
      shortTitle: 'Shin Kanzen N1',
      japaneseTitle: '新完全マスター N1',
      description: 'Từ vựng cao cấp, văn viết học thuật và phân biệt sắc thái tinh tế chuẩn N1.',
      unitIds: [1],
      matchKeywords: ['kanzen', 'shinkanzen'],
    },
    {
      id: 'mimi-n1',
      level: 'N1',
      title: 'Mimi kara Oboeru N1',
      shortTitle: 'Mimi kara N1',
      japaneseTitle: '耳から覚える N1',
      description: 'Từ vựng trọng tâm kỳ thi N1 kèm cách dùng tự nhiên trong văn cảnh.',
      unitIds: [],
      matchKeywords: ['mimi'],
    },
    {
      id: 'soumatome-n1',
      level: 'N1',
      title: 'Nihongo Sou Matome N1',
      shortTitle: 'Sou Matome N1',
      japaneseTitle: '日本語総まとめ N1',
      description: 'Tổng hợp từ vựng báo chí, kinh tế và đời sống cao cấp cấp độ N1.',
      unitIds: [],
      matchKeywords: ['matome', 'soumatome'],
    },
  ],
};

const VALID_LEVELS = new Set<JLPTLevel>(['N5', 'N4', 'N3', 'N2', 'N1']);

export function parseVocabLevelParam(raw: string | null | undefined): JLPTLevel | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase() as JLPTLevel;
  return VALID_LEVELS.has(upper) ? upper : null;
}

export function getVocabTextbooksForLevel(level: JLPTLevel): VocabTextbookSpec[] {
  return VOCAB_TEXTBOOKS[level] ?? [];
}

export function findVocabTextbook(
  level: JLPTLevel | null | undefined,
  bookId: string | null | undefined,
): VocabTextbookSpec | undefined {
  if (!bookId) return undefined;
  const normalizedId = bookId.trim().toLowerCase();
  if (level) {
    const exact = getVocabTextbooksForLevel(level).find((b) => b.id === normalizedId);
    if (exact) return exact;
  }
  for (const list of Object.values(VOCAB_TEXTBOOKS)) {
    const found = list.find((b) => b.id === normalizedId);
    if (found) return found;
  }
  return undefined;
}

export function getUnitsForVocabTextbook(
  snapshot: CmsSnapshot,
  level: JLPTLevel,
  book: VocabTextbookSpec,
): UnitMeta[] {
  const allLevelUnits = getLiveUnitsForLevel(snapshot, level);
  const allBooksOfLevel = getVocabTextbooksForLevel(level);

  return allLevelUnits.filter((unit) => {
    const lowerName = unit.name.toLowerCase();
    // If a unit title explicitly mentions another textbook in this level, bind strictly to that textbook
    const matchedByKeyword = allBooksOfLevel.find((candidate) =>
      candidate.matchKeywords.some((kw) => lowerName.includes(kw)),
    );
    if (matchedByKeyword) {
      return matchedByKeyword.id === book.id;
    }
    return book.unitIds.includes(unit.id);
  });
}

export function getWordsForVocabTextbook(
  snapshot: CmsSnapshot,
  level: JLPTLevel,
  book: VocabTextbookSpec,
): VocabularyItem[] {
  const bookUnits = getUnitsForVocabTextbook(snapshot, level, book);
  if (bookUnits.length === 0) return [];
  const unitIdSet = new Set(bookUnits.map((u) => u.id));
  return getLiveAllVocabulary(snapshot).filter(
    (w) => w.level === level && unitIdSet.has(w.unitId),
  );
}

export function buildVocabToolQuery(level: JLPTLevel, bookId?: string): string {
  const params = new URLSearchParams();
  params.set('level', level);
  if (bookId) params.set('book', bookId);
  return `?${params.toString()}`;
}
