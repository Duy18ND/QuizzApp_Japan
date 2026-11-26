/**
 * Shin Kanzen Master N3 Ngữ pháp — chapters laid out after the book's table of contents
 * (第1部 1–12課, 文法形式の整理 A–J, 第2部 1–4課, 第3部 1–10課).
 *
 * Existing grammar points keep their ids (user progress stays valid) and are moved into the
 * matching chapter; points the book lists but the app lacked are written in book*.ts.
 * Points the app already had that the book does not list go to a final "Bổ sung" chapter.
 * All explanations and examples are written for this app — nothing is copied from the book.
 */
import type { GrammarChapter, SmartGrammarRule } from '../../../types/grammarEngine';
import type { GrammarSentence } from './lesson01Sentences';
import { SKZ_BOOK_AJ } from './bookAJ';
import { SKZ_BOOK_P1A } from './bookP1a';
import { SKZ_BOOK_P1B } from './bookP1b';
import { SKZ_BOOK_P23 } from './bookP23';
import { buildN3FromCompact } from './extraLessonsN3';

const BOOK_ID = 'SHINKANZEN_N3';

/** Ordered refs per chapter: an existing grammar id, or `+CODE` for a point from book*.ts. */
const CHAPTERS: Array<{ id: string; title: string; topics: string[]; refs: string[] }> = [
  { id: 'L01', title: 'Bài 1 · Thời điểm', topics: ['time'], refs: ['N3-SKZ-L01-UCHINI-01', 'N3-SKZ-L01-UCHINI-02', 'N3-SKZ-L01-AIDA', 'N3-SKZ-L01-AIDANI', 'N3-SKZ-L01-TEKARA-DENAITO', 'N3-SKZ-L01-TOKORO'] },
  { id: 'L02', title: 'Bài 2 · Liên quan & Tùy theo', topics: ['relation'], refs: ['N3_L02_G001', 'N3_L02_G002', 'N3_L02_G003', 'N3_L02_G004', 'N3_L02_G005'] },
  { id: 'P1-03', title: 'Bài 3 · So sánh & Mức độ', topics: ['degree'], refs: ['+KURAI-HODO', '+KURAI-WANAI', '+KURAINARA', '+NIKAGIRU'] },
  { id: 'P1-04', title: 'Bài 4 · Đối chiếu', topics: ['contrast'], refs: ['N3-SKZ-L08-NITAISHITE', '+HANMEN', '+IPPOUDE', '+TOIUYORI', '+KAWARINI'] },
  { id: 'P1-05', title: 'Bài 5 · Nguyên nhân & Lý do', topics: ['cause'], refs: ['N3-SKZ-L03-TAME-GEN', '+NIYOTTE-GEN', 'N3-SKZ-L03-KOTO-KARA', 'N3-SKZ-L03-OKAGEDE', 'N3-SKZ-L03-SEIDE', '+NODAKARA'] },
  { id: 'P1-06', title: 'Bài 6 · Điều kiện & Giả định', topics: ['condition'], refs: ['+NONARA', '+TEWA', 'N3-SKZ-L04-SAE-BA', 'N3-SKZ-L04-TATOE-TEMO', 'N3-SKZ-L04-BA-NONI', 'N3-SKZ-L04-TO-SHITARA'] },
  { id: 'P1-07', title: 'Bài 7 · Truyền đạt, nghe nói', topics: ['hearsay'], refs: ['+TOIUKOTODA', '+TOIWARETEIRU', '+TOKA', '+TTE', '+TOIU'] },
  { id: 'P1-08', title: 'Bài 8 · Phủ định', topics: ['negation'], refs: ['N3-SKZ-L08-WAKE-GA-NAI', '+TOWAKAGIRANAI', '+WAKEDEWANAI', '+NAIKOTOWANAI', '+KOTOWA-GA'] },
  { id: 'P1-09', title: 'Bài 9 · Mong muốn', topics: ['desire'], refs: ['+TEMORAITAI', '+SASETEMORAITAI', '+TOII'] },
  { id: 'P1-10', title: 'Bài 10 · Khuyên bảo & Mệnh lệnh', topics: ['advice'], refs: ['+MEIREI-KINSHI', '+KOTO-SHIJI', 'N3-SKZ-L08-BEKIDA', '+TARADOUKA'] },
  { id: 'P1-11', title: 'Bài 11 · Ý định & Nỗ lực', topics: ['intention'], refs: ['+KOTONISURU', '+YOUNISURU', '+YOUTOSURU', '+TSUMORIDA'] },
  { id: 'P1-12', title: 'Bài 12 · Kính ngữ', topics: ['keigo'], refs: ['+SONKEIGO', '+KENJOUGO1', '+KENJOUGO2', '+TEINEIGO'] },
  { id: 'AJ-A', title: 'Bài 13 · Trợ từ nhiều chức năng', topics: ['particle'], refs: ['+MO-SHIKA', '+GURAI-JOSHI', '+MADE-JOSHI'] },
  { id: 'AJ-B', title: 'Bài 14 · Cụm làm chức năng trợ từ', topics: ['particle'], refs: ['N3-SKZ-L02-NIKANSHITE', '+NIYOTTE-SHUDAN', 'N3-SKZ-L08-NI-TOTTE', '+TOSHITE'] },
  { id: 'AJ-C', title: 'Bài 15 · Cách dùng こと・の', topics: ['nominalizer'], refs: ['+KOTO-NO'] },
  { id: 'AJ-D', title: 'Bài 16 · Cách dùng よう', topics: ['you'], refs: ['+YOUDA-NOYOUNI', '+YOUNI-MOKUTEKI', '+YOUNI-IRAI'] },
  { id: 'AJ-E', title: 'Bài 17 · Cách dùng わけ', topics: ['wake'], refs: ['+WAKEDA', 'N3-SKZ-L08-WAKENIWAIKANAI', '+NAIWAKENIWA'] },
  { id: 'AJ-F', title: 'Bài 18 · Cách dùng ばかり', topics: ['bakari'], refs: ['+BAKARI-N', 'N3-SKZ-L06-BAKARIDA', '+BAKARIDENAKU', '+BAKARIDA-HENKA', '+TABAKARI'] },
  { id: 'AJ-G', title: 'Bài 19 · Phân biệt する・なる', topics: ['suru-naru'], refs: ['+SURU-NARU'] },
  { id: 'AJ-H', title: 'Bài 20 · Cách dùng đặc biệt của たら・ば・と・なら', topics: ['condition'], refs: ['+TO-TA', '+MO-BA-MO'] },
  { id: 'AJ-I', title: 'Bài 21 · Phó từ đi với đuôi cố định', topics: ['adverb'], refs: ['+FUKUSHI-KOOU'] },
  { id: 'AJ-J', title: 'Bài 22 · Mở rộng nghĩa động từ & danh từ', topics: ['suffix'], refs: ['N3-SKZ-L06-GACHI', 'N3-SKZ-L06-GIMI', 'N3-SKZ-L06-KAKERU', 'N3-SKZ-L06-PPOI', 'N3-SKZ-L07-PPANASHI', 'N3-SKZ-L07-KIRI', 'N3-SKZ-L07-DARAKE', '+RASHII'] },
  { id: 'P2-01', title: 'Bài 23 · Câu trích dẫn', topics: ['sentence'], refs: ['+INYOU'] },
  { id: 'P2-02', title: 'Bài 24 · Bổ nghĩa cho danh từ', topics: ['sentence'], refs: ['+MEISHI-SETSUMEI'] },
  { id: 'P2-03', title: 'Bài 25 · ～という・～といった', topics: ['sentence'], refs: ['+TOIU-TOITTA'] },
  { id: 'P2-04', title: 'Bài 26 · Khung câu cố định', topics: ['sentence'], refs: ['+KIMATTA-KATACHI'] },
  { id: 'P3-01', title: 'Bài 27 · Đầu câu – cuối câu tương ứng', topics: ['text'], refs: ['+HAJIME-OWARI'] },
  { id: 'P3-02', title: 'Bài 28 · Thì & ～ている', topics: ['text'], refs: ['+JISEI-TEIRU'] },
  { id: 'P3-03', title: 'Bài 29 · Tự động từ & Tha động từ', topics: ['text'], refs: ['+TADOUSHI-JIDOUSHI'] },
  { id: 'P3-04', title: 'Bài 30 · ～てくる・～ていく', topics: ['text'], refs: ['+TEKURU-TEIKU'] },
  { id: 'P3-05', title: 'Bài 31 · Bị động & Sai khiến', topics: ['text'], refs: ['+UKEMI-SHIEKI'] },
  { id: 'P3-06', title: 'Bài 32 · Cho – nhận hành động', topics: ['text'], refs: ['+AGERU-MORAU-KURERU'] },
  { id: 'P3-07', title: 'Bài 33 · Từ chỉ thị こ・そ・あ', topics: ['text'], refs: ['+KOSOA'] },
  { id: 'P3-08', title: 'Bài 34 · Phân biệt は・が', topics: ['text'], refs: ['+WA-GA'] },
  { id: 'P3-09', title: 'Bài 35 · Từ nối', topics: ['text'], refs: ['+SETSUZOKU'] },
  { id: 'P3-10', title: 'Bài 36 · Thống nhất văn phong', topics: ['text'], refs: ['+FUNIKI-TOUITSU'] },
];

const NEW_SPECS = { ...SKZ_BOOK_P1A, ...SKZ_BOOK_P1B, ...SKZ_BOOK_AJ, ...SKZ_BOOK_P23 };

const BUILT_NEW = buildN3FromCompact(
  BOOK_ID,
  'N3-SKZ',
  Object.entries(NEW_SPECS).map(([id, rules]) => ({ id, number: 0, title: id, topics: [], rules })),
);

const newByChapterCode = new Map<string, SmartGrammarRule>();
for (const ch of BUILT_NEW.chapters) {
  for (const g of ch.grammars) newByChapterCode.set(`${ch.id}|${g.id.slice(`N3-SKZ-${ch.id}-`.length)}`, g);
}

export const SKZ_BOOK_NEW_SENTENCES: GrammarSentence[] = BUILT_NEW.sentences;

/** Lay out the book: `existing` = every Shin Kanzen N3 point the app already had. */
export function buildShinkanzenN3BookChapters(existing: SmartGrammarRule[]): GrammarChapter[] {
  const byId = new Map(existing.map((g) => [g.id, g]));
  const used = new Set<string>();
  const chapters: GrammarChapter[] = CHAPTERS.map((ch, idx) => {
    const grammars: SmartGrammarRule[] = [];
    for (const ref of ch.refs) {
      const rule = ref.startsWith('+') ? newByChapterCode.get(`${ch.id}|${ref.slice(1)}`) : byId.get(ref);
      if (!rule) continue;
      used.add(rule.id);
      grammars.push({ ...rule, chapterId: ch.id });
    }
    return { id: ch.id, bookId: BOOK_ID, chapterNumber: idx + 1, title: ch.title, topics: ch.topics, grammars };
  });
  const leftovers = existing.filter((g) => !used.has(g.id));
  if (leftovers.length > 0) {
    chapters.push({
      id: 'EXTRA',
      bookId: BOOK_ID,
      chapterNumber: chapters.length + 1,
      title: 'Bổ sung: mẫu N3 thường gặp',
      topics: ['extra'],
      grammars: leftovers.map((g) => ({ ...g, chapterId: 'EXTRA' })),
    });
  }
  return chapters;
}

/** Refs that point at nothing (for checks). */
export function findMissingBookRefs(existing: SmartGrammarRule[]): string[] {
  const ids = new Set(existing.map((g) => g.id));
  return CHAPTERS.flatMap((ch) =>
    ch.refs.filter((r) => (r.startsWith('+') ? !newByChapterCode.has(`${ch.id}|${r.slice(1)}`) : !ids.has(r))).map((r) => `${ch.id}:${r}`),
  );
}
