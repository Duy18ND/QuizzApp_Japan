import type { CmsSnapshot } from '../services/adminCmsService';
import { getLiveUnitsForLevel } from '../services/curriculumStore';
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

const ALL_VOCAB_TEXTBOOKS: Record<JLPTLevel, VocabTextbookSpec[]> = {
  N5: [
    {
      id: 'minna-n5',
      level: 'N5',
      title: 'Minna no Nihongo I',
      shortTitle: 'Minna I',
      japaneseTitle: 'みんなの日本語 初級I',
      description: 'Giáo trình nhập môn kinh điển (Đủ 25 bài: Bài 1–25), từ vựng giao tiếp đời sống cơ bản.',
      unitIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
      matchKeywords: ['minna', 'mina'],
    },
    {
      id: 'shinkanzen-n5',
      level: 'N5',
      title: 'Shin Kanzen Master N5',
      shortTitle: 'Shin Kanzen N5',
      japaneseTitle: '新完全マスター N5',
      description: 'Từ vựng trọng tâm bám sát cấu trúc đề thi JLPT N5 (6 chuyên đề cốt lõi).',
      unitIds: [101, 102, 103, 104, 105, 106],
      matchKeywords: ['kanzen', 'shinkanzen'],
    },
    {
      id: 'mimi-n5',
      level: 'N5',
      title: 'Mimi kara Oboeru N5',
      shortTitle: 'Mimi kara N5',
      japaneseTitle: '耳から覚える N5',
      description: 'Luyện nhớ từ vựng sơ cấp theo 6 chủ đề quen thuộc kèm câu ví dụ thực tế.',
      unitIds: [201, 202, 203, 204, 205, 206],
      matchKeywords: ['mimi'],
    },
    {
      id: 'soumatome-n5',
      level: 'N5',
      title: 'Nihongo Sou Matome N5',
      shortTitle: 'Sou Matome N5',
      japaneseTitle: '日本語総まとめ N5',
      description: 'Hệ thống từ vựng N5 chia nhỏ theo 6 tuần ôn tập nhanh và dễ nhớ.',
      unitIds: [301, 302, 303, 304, 305, 306],
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
      description: 'Trọn bộ 25 bài (Bài 26–50) sơ cấp II, mỗi bài ~20 từ theo đúng mẫu ngữ pháp của bài.',
      unitIds: Array.from({ length: 25 }, (_, i) => 26 + i),
      matchKeywords: ['minna', 'mina'],
    },
    {
      id: 'shinkanzen-n4',
      level: 'N4',
      title: 'Shin Kanzen Master N4',
      shortTitle: 'Shin Kanzen N4',
      japaneseTitle: '新完全マスター N4',
      description: 'Giáo trình từ vựng chuyên sâu 6 chủ đề chuẩn bị trực tiếp cho kỳ thi JLPT N4.',
      unitIds: [101, 102, 103, 104, 105, 106],
      matchKeywords: ['kanzen', 'shinkanzen'],
    },
    {
      id: 'mimi-n4',
      level: 'N4',
      title: 'Mimi kara Oboeru N4',
      shortTitle: 'Mimi kara N4',
      japaneseTitle: '耳から覚える N4',
      description: 'Học từ vựng N4 theo 6 chủ đề: Tự-tha động từ, cảm xúc, y tế, nhà ở & phản xạ nghe.',
      unitIds: [201, 202, 203, 204, 205, 206],
      matchKeywords: ['mimi'],
    },
    {
      id: 'soumatome-n4',
      level: 'N4',
      title: 'Nihongo Sou Matome N4',
      shortTitle: 'Sou Matome N4',
      japaneseTitle: '日本語総まとめ N4',
      description: 'Tổng ôn từ vựng sơ trung cấp theo lộ trình 6 tuần bám sát đời sống Nhật.',
      unitIds: [301, 302, 303, 304, 305, 306],
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
      description: 'Theo mục lục sách: 12 Unit chia theo từ loại (Danh từ, Động từ, Tính từ, Katakana, Phó từ) + Unit 13 bổ sung cụm từ.',
      unitIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      matchKeywords: ['mimi'],
    },
    {
      id: 'shinkanzen-n3',
      level: 'N3',
      title: 'Shin Kanzen Master N3',
      shortTitle: 'Shin Kanzen N3',
      japaneseTitle: '新完全マスター N3',
      description: 'Từ vựng luyện thi trung cấp theo sắc thái, collocations, động từ ghép và đọc hiểu.',
      unitIds: [101, 102, 103, 104, 105, 106],
      matchKeywords: ['kanzen', 'shinkanzen'],
    },
    {
      id: 'minna-n3',
      level: 'N3',
      title: 'Minna no Nihongo Chuukyuu I',
      shortTitle: 'Minna Trung cấp I',
      japaneseTitle: 'みんなの日本語 中級I',
      description: 'Từ vựng trọn bộ Bài 1–12 giáo trình Minna Trung cấp I chuyển tiếp từ N4 lên N3.',
      unitIds: Array.from({ length: 12 }, (_, k) => 201 + k),
      matchKeywords: ['minna', 'mina'],
    },
    {
      id: 'soumatome-n3',
      level: 'N3',
      title: 'Nihongo Sou Matome N3',
      shortTitle: 'Sou Matome N3',
      japaneseTitle: '日本語総まとめ N3',
      description: 'Tổng hợp từ vựng N3 theo chủ đề trong 6 tuần luyện thi cấp tốc.',
      unitIds: [301, 302, 303, 304, 305, 306],
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

/** One course per level is shown, under a neutral name. Ids are internal and unchanged. */
const NEUTRAL_COURSES: Record<JLPTLevel, [id: string, title: string, description: string]> = {
  N5: ['minna-n5', 'Từ vựng N5', '25 bài theo chủ đề đời sống cơ bản.'],
  N4: ['minna-n4', 'Từ vựng N4', '25 bài (Bài 26–50), nối tiếp N5.'],
  N3: ['mimi-n3', 'Từ vựng N3', '13 bài chia theo từ loại.'],
  N2: ['shinkanzen-n2', 'Từ vựng N2', 'Từ vựng trọng tâm N2.'],
  N1: ['shinkanzen-n1', 'Từ vựng N1', 'Từ vựng trọng tâm N1.'],
};

export const VOCAB_TEXTBOOKS = Object.fromEntries(
  (Object.keys(NEUTRAL_COURSES) as JLPTLevel[]).map((level) => {
    const [id, title, description] = NEUTRAL_COURSES[level];
    const base = ALL_VOCAB_TEXTBOOKS[level].find((b) => b.id === id)!;
    return [level, [{ ...base, title, shortTitle: title, japaneseTitle: `${level} 語彙`, description }]];
  }),
) as Record<JLPTLevel, VocabTextbookSpec[]>;

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
    if (unit.textbookId) return unit.textbookId === book.id;
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

export const VOCAB_TEXTBOOK_SYNC_EVENT = 'nihonmaster:vocab-textbook-sync';

export function getDefaultVocabTextbook(level: JLPTLevel): VocabTextbookSpec {
  const list = getVocabTextbooksForLevel(level);
  return list[0] ?? VOCAB_TEXTBOOKS.N3[0];
}

export function resolveActiveVocabTextbook(
  level: JLPTLevel,
  userId?: string | null,
  explicitBookId?: string | null,
): VocabTextbookSpec {
  const levelBooks = getVocabTextbooksForLevel(level);
  if (explicitBookId) {
    const exact = levelBooks.find((book) => book.id === explicitBookId.trim().toLowerCase());
    if (exact) return exact;
  }
  const preferredId = getPreferredVocabTextbookId(level, userId);
  if (preferredId) {
    const preferred = levelBooks.find((book) => book.id === preferredId);
    if (preferred) return preferred;
  }
  return getDefaultVocabTextbook(level);
}

const VOCAB_TEXTBOOK_PREFERENCES_KEY = 'nihonmaster_vocab_textbook_preferences_v1';

function readVocabTextbookPreferences(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(VOCAB_TEXTBOOK_PREFERENCES_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

export function getPreferredVocabTextbookId(
  level: JLPTLevel,
  userId?: string | null,
): string | null {
  const owner = userId || 'guest';
  const candidate = readVocabTextbookPreferences()[`${owner}:${level}`];
  return getVocabTextbooksForLevel(level).some((book) => book.id === candidate)
    ? candidate
    : null;
}

export function savePreferredVocabTextbookId(
  level: JLPTLevel,
  bookId: string,
  userId?: string | null,
): void {
  if (typeof window === 'undefined') return;
  if (!getVocabTextbooksForLevel(level).some((book) => book.id === bookId)) {
    return;
  }
  try {
    const owner = userId || 'guest';
    const preferences = readVocabTextbookPreferences();
    preferences[`${owner}:${level}`] = bookId;
    window.localStorage.setItem(VOCAB_TEXTBOOK_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Keep the current selection usable if browser storage is unavailable.
  }
  try {
    window.dispatchEvent(
      new CustomEvent<{ level: JLPTLevel; bookId: string; userId?: string | null }>(
        VOCAB_TEXTBOOK_SYNC_EVENT,
        { detail: { level, bookId, userId } },
      ),
    );
  } catch {
    // Ignore event dispatch issues in non-DOM environments.
  }
}

export function getPreferredVocabLevel(userId?: string | null): JLPTLevel | null {
  const owner = userId || 'guest';
  const candidate = readVocabTextbookPreferences()[`${owner}:level`];
  return parseVocabLevelParam(candidate);
}

export function savePreferredVocabLevel(level: JLPTLevel, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const owner = userId || 'guest';
    const preferences = readVocabTextbookPreferences();
    preferences[`${owner}:level`] = level;
    window.localStorage.setItem(VOCAB_TEXTBOOK_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Keep the current selection usable if browser storage is unavailable.
  }
  try {
    window.dispatchEvent(
      new CustomEvent<{ level: JLPTLevel; userId?: string | null }>(VOCAB_TEXTBOOK_SYNC_EVENT, {
        detail: { level, userId },
      }),
    );
  } catch {
    // Ignore event dispatch issues in non-DOM environments.
  }
}

export function getWordsForVocabTextbook(
  snapshot: CmsSnapshot,
  level: JLPTLevel,
  book: VocabTextbookSpec,
): VocabularyItem[] {
  const bookUnits = getUnitsForVocabTextbook(snapshot, level, book);
  if (bookUnits.length === 0) return [];
  const unitDbIds = new Set(bookUnits.map((unit) => unit.dbUnitId).filter(Boolean));
  const unitNumbers = new Set(bookUnits.map((unit) => unit.id));
  const unambiguousUnitNumbers = new Set(
    Array.from(unitNumbers).filter(
      (unitNumber) =>
        snapshot.units.filter((unit) => unit.level === level && unit.unitNumber === unitNumber).length === 1,
    ),
  );
  return snapshot.vocabularies
    .filter(
      (word) =>
        word.level === level &&
        (word.dbUnitId
          ? unitDbIds.has(word.dbUnitId)
          : unambiguousUnitNumbers.has(word.unitId)),
    )
    .map((word) => ({
      id: word.id,
      unitId: word.unitId,
      level: word.level,
      wordNumber: word.wordNumber,
      kanji: word.kanji,
      hiragana: word.hiragana,
      hanViet: word.hanViet,
      meaning: word.meaning,
      wordType: word.wordType,
      exampleSentence: word.exampleSentence,
      exampleMeaning: word.exampleMeaning,
      notes: word.notes,
      tags: word.tags,
      semanticRoles: word.semanticRoles,
    }));
}

export function buildVocabToolQuery(level: JLPTLevel, bookId?: string): string {
  const params = new URLSearchParams();
  params.set('level', level);
  if (bookId) params.set('book', bookId);
  return `?${params.toString()}`;
}
