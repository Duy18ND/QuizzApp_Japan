import { grammarBooks } from '../data/grammar';
import {
  getJLPTListeningItems,
  getJLPTMcqQuestions,
  getJLPTReadingPassages,
  getJLPTStarQuestions,
  type JLPTExamLevel,
  type JLPTLevelFilter,
  type JLPTListeningItem,
  type JLPTMcqItem,
  type JLPTReadingPassage,
  type JLPTStarItem,
} from '../data/jlpt/jlptDataset';
import type { UnitMeta } from '../data/unitData';
import type { AdminJlptRecord } from '../types/admin';
import type { GrammarBook, SmartGrammarRule } from '../types/grammarEngine';
import type { KanjiItem } from '../types/kanji';
import type { JLPTLevel } from '../types/quiz';
import type { VocabularyItem } from '../types/vocabulary';
import {
  CMS_SYNC_EVENT,
  getCmsSnapshotSync,
  loadCmsSnapshot,
  type CmsSnapshot,
} from './adminCmsService';
import { supabase } from './supabaseClient';

type Listener = () => void;

let currentSnapshot: CmsSnapshot | null = null;
let cloudHydratedOnce = false;
let cloudFetchInFlight: Promise<CmsSnapshot> | null = null;
const listeners = new Set<Listener>();

function ensureInitSnapshot(): CmsSnapshot {
  if (!currentSnapshot) {
    currentSnapshot = getCmsSnapshotSync();
  }
  return currentSnapshot;
}

function emitChange(): void {
  for (const fn of listeners) {
    fn();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener(CMS_SYNC_EVENT, () => {
    currentSnapshot = getCmsSnapshotSync();
    emitChange();
    if (supabase) {
      void refreshCurriculumFromCloud();
    }
  });
}

export function getCurriculumSnapshotSync(): CmsSnapshot {
  return ensureInitSnapshot();
}

export function subscribeCurriculum(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function refreshCurriculumFromCloud(): Promise<CmsSnapshot> {
  if (cloudFetchInFlight) return cloudFetchInFlight;
  cloudFetchInFlight = loadCmsSnapshot()
    .then((snap) => {
      currentSnapshot = snap;
      cloudHydratedOnce = true;
      emitChange();
      return snap;
    })
    .finally(() => {
      cloudFetchInFlight = null;
    });
  return cloudFetchInFlight;
}

export function ensureCurriculumHydrated(): void {
  if (cloudHydratedOnce || cloudFetchInFlight || !supabase) return;
  void refreshCurriculumFromCloud();
}

export function getLiveUnitsForLevel(snap: CmsSnapshot, level: JLPTLevel): UnitMeta[] {
  const levelUnits = snap.units
    .filter((u) => u.level === level && u.isPublished)
    .sort((a, b) => a.orderIndex - b.orderIndex || a.unitNumber - b.unitNumber);
  const unitsByNumber = new Map<number, number>();
  for (const unit of snap.units.filter((item) => item.level === level)) {
    unitsByNumber.set(unit.unitNumber, (unitsByNumber.get(unit.unitNumber) ?? 0) + 1);
  }

  return levelUnits.map((u) => {
    const wordCount = snap.vocabularies.filter(
      (v) =>
        v.level === level &&
        (v.dbUnitId
          ? v.dbUnitId === u.id
          : unitsByNumber.get(u.unitNumber) === 1 && v.unitId === u.unitNumber),
    ).length;
    return {
      id: u.unitNumber,
      name: u.title,
      totalWords: wordCount,
      dbUnitId: u.id,
      textbookId: u.textbookId,
    };
  });
}

export function getLiveVocabForUnit(
  snap: CmsSnapshot,
  level: JLPTLevel,
  unitKey: number | string,
): VocabularyItem[] {
  const unitRecord =
    typeof unitKey === 'string'
      ? snap.units.find((u) => u.level === level && u.id === unitKey)
      : snap.units.find((u) => u.level === level && u.unitNumber === unitKey);
  const unitNumber = unitRecord?.unitNumber ?? (typeof unitKey === 'number' ? unitKey : -1);
  const isUniqueUnitNumber =
    unitRecord &&
    snap.units.filter((unit) => unit.level === level && unit.unitNumber === unitNumber).length === 1;
  return snap.vocabularies
    .filter((v) => {
      if (v.level !== level) return false;
      if (typeof unitKey === 'string') {
        return v.dbUnitId === unitKey || (!v.dbUnitId && isUniqueUnitNumber && v.unitId === unitNumber);
      }
      if (unitRecord && v.dbUnitId) {
        return v.dbUnitId === unitRecord.id || v.unitId === unitNumber;
      }
      return v.unitId === unitNumber;
    })
    .sort((a, b) => a.wordNumber - b.wordNumber || a.id - b.id)
    .map((v) => ({
      id: v.id,
      unitId: v.unitId,
      level: v.level,
      wordNumber: v.wordNumber,
      kanji: v.kanji,
      hiragana: v.hiragana,
      hanViet: v.hanViet,
      meaning: v.meaning,
      wordType: v.wordType,
      exampleSentence: v.exampleSentence,
      exampleMeaning: v.exampleMeaning,
      notes: v.notes,
      tags: v.tags,
      semanticRoles: v.semanticRoles,
    }));
}

export function getLiveAllVocabulary(snap: CmsSnapshot): VocabularyItem[] {
  return snap.vocabularies.map((v) => ({
    id: v.id,
    unitId: v.unitId,
    level: v.level,
    wordNumber: v.wordNumber,
    kanji: v.kanji,
    hiragana: v.hiragana,
    hanViet: v.hanViet,
    meaning: v.meaning,
    wordType: v.wordType,
    exampleSentence: v.exampleSentence,
    exampleMeaning: v.exampleMeaning,
    notes: v.notes,
    tags: v.tags,
    semanticRoles: v.semanticRoles,
  }));
}

export function getLiveKanjis(snap: CmsSnapshot): KanjiItem[] {
  return snap.kanjis.map((k) => ({
    id: k.id,
    kanji: k.kanji,
    hanViet: k.hanViet,
    meanings: k.meanings,
    onReadings: k.onReadings,
    kunReadings: k.kunReadings,
    strokeCount: k.strokeCount,
    jlptLevel: k.jlptLevel,
    vocabularyIds: (k.examples ?? []).map((ex) => ex.vocabularyId),
    examples: k.examples ?? [],
  }));
}

export function getLiveGrammarBooks(snap: CmsSnapshot): GrammarBook[] {
  const staticBookMap = new Map(grammarBooks.map((b) => [b.id, b]));
  const staticRuleMap = new Map<string, SmartGrammarRule>();
  for (const b of grammarBooks) {
    for (const c of b.chapters) {
      for (const g of c.grammars) {
        staticRuleMap.set(g.id, g);
      }
    }
  }

  const booksById = new Map<string, GrammarBook>();

  for (const rule of snap.grammars) {
    const baseRule = staticRuleMap.get(rule.id);
    const staticBook = staticBookMap.get(rule.bookId);
    let book = booksById.get(rule.bookId);
    if (!book) {
      book = {
        id: rule.bookId,
        title: staticBook?.title ?? `${rule.bookId} (${rule.level})`,
        level: (staticBook?.level ?? rule.level) as GrammarBook['level'],
        chapters: [],
      };
      booksById.set(rule.bookId, book);
    }

    let chapter = book.chapters.find((c) => c.id === rule.chapterId);
    if (!chapter) {
      const staticChapter = staticBook?.chapters.find((c) => c.id === rule.chapterId);
      const numMatch = rule.chapterId.match(/\d+/);
      chapter = {
        id: rule.chapterId,
        bookId: rule.bookId,
        chapterNumber: staticChapter?.chapterNumber ?? (numMatch ? Number(numMatch[0]) : book.chapters.length + 1),
        title: staticChapter?.title ?? `Bài ${rule.chapterId}`,
        topics: staticChapter?.topics ?? ['time'],
        grammars: [],
      };
      book.chapters.push(chapter);
    }

    const patterns = rule.structure
      ? rule.structure
          .split('/')
          .map((p) => p.trim())
          .filter(Boolean)
          .map((pattern) => ({ pattern, target: pattern }))
      : baseRule?.patterns ?? [];

    const smartRule: SmartGrammarRule = {
      ...(baseRule ?? {
        practiceTypes: ['multiple_choice', 'fill_blank', 'ja_to_vi', 'vi_to_ja', 'text_input', 'mixed'],
        templates: [],
      }),
      id: rule.id,
      bookId: rule.bookId,
      chapterId: rule.chapterId,
      level: rule.level as SmartGrammarRule['level'],
      name: rule.title,
      hiragana: baseRule?.hiragana ?? rule.title,
      meaning: rule.meaning,
      explanation: rule.explanation,
      notes: rule.notes,
      patterns,
    };

    chapter.grammars.push(smartRule);
  }

  for (const book of booksById.values()) {
    book.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
  }

  return Array.from(booksById.values());
}

const normalizeExamLevel = (level: JLPTLevel): JLPTExamLevel =>
  level === 'N5' || level === 'N4' || level === 'N3' ? level : 'N3';

const padFourOptions = (opts: string[]): [string, string, string, string] => [
  opts[0] ?? 'A',
  opts[1] ?? 'B',
  opts[2] ?? 'C',
  opts[3] ?? 'D',
];

const matchesJlptLevel = (level: JLPTLevel, filter: JLPTLevelFilter): boolean =>
  filter === 'ALL' || level === filter;

export function getLiveJlptMcqQuestions(
  snap: CmsSnapshot,
  moduleId: 'kanji' | 'vocab' | 'grammar',
  levelFilter: JLPTLevelFilter = 'ALL',
): JLPTMcqItem[] {
  const staticMap = new Map(
    getJLPTMcqQuestions(moduleId, 'ALL').map((item) => [item.id, item]),
  );
  return snap.jlptQuestions
    .filter((q) => q.moduleId === moduleId && matchesJlptLevel(q.level, levelFilter))
    .map((q) => {
      const base = staticMap.get(q.id);
      return {
        id: q.id,
        moduleId,
        level: normalizeExamLevel(q.level),
        mondaiLabel: base?.mondaiLabel ?? `JLPT ${q.level} · ${moduleId.toUpperCase()}`,
        prompt: q.prompt,
        highlight: base?.highlight,
        options: padFourOptions(q.options),
        correctIndex: Math.min(3, Math.max(0, q.correctIndex)),
        explanation: q.explanation,
      };
    });
}

export function getLiveJlptStarQuestions(
  snap: CmsSnapshot,
  levelFilter: JLPTLevelFilter = 'ALL',
): JLPTStarItem[] {
  const staticMap = new Map(getJLPTStarQuestions('ALL').map((s) => [s.id, s]));
  return snap.jlptQuestions
    .filter((q) => q.moduleId === 'star' && matchesJlptLevel(q.level, levelFilter))
    .map((q) => {
      const base = staticMap.get(q.id);
      const chunksTexts = padFourOptions(q.options);
      const starIdx = Math.min(3, Math.max(0, q.correctIndex));
      return {
        id: q.id,
        level: normalizeExamLevel(q.level),
        mondaiLabel: base?.mondaiLabel ?? `Mondai ★ · ${q.level}`,
        prefix: base?.prefix ?? '',
        suffix: base?.suffix ?? '',
        chunks: chunksTexts.map((text, idx) => ({
          id: `chunk_${idx}`,
          text,
          originalIndex: idx,
        })),
        starIndex: starIdx,
        correctAnswer: chunksTexts[starIdx],
        fullSentence: q.passage || base?.fullSentence || chunksTexts.join(' '),
        meaning: base?.meaning ?? q.explanation,
        explanation: q.explanation,
      };
    });
}

function splitReadingPassageParagraphs(passageText: string): Array<{ segments: Array<{ text: string }> }> {
  const lines = passageText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return (lines.length > 0 ? lines : [passageText]).map((line) => ({
    segments: [{ text: line }],
  }));
}

export function getLiveJlptReadingPassages(
  snap: CmsSnapshot,
  moduleId: 'reading-short' | 'reading-medium' | 'reading-long',
  levelFilter: JLPTLevelFilter = 'ALL',
): JLPTReadingPassage[] {
  const staticPassages = getJLPTReadingPassages(moduleId, 'ALL');
  const cmsItems = snap.jlptQuestions.filter(
    (q) => q.moduleId === moduleId && matchesJlptLevel(q.level, levelFilter),
  );
  const cmsById = new Map<string, AdminJlptRecord>(cmsItems.map((q) => [q.id, q]));
  const consumedIds = new Set<string>();
  const result: JLPTReadingPassage[] = [];

  for (const p of staticPassages) {
    if (!matchesJlptLevel(p.level, levelFilter)) continue;
    const questions = p.questions
      .map((q) => {
        const compositeId = `${p.id}_${q.id}`;
        const cmsMatch = cmsById.get(compositeId) ?? cmsById.get(q.id);
        if (!cmsMatch) return null;
        consumedIds.add(cmsMatch.id);
        return {
          id: q.id,
          prompt: cmsMatch.prompt,
          options: padFourOptions(cmsMatch.options),
          correctIndex: Math.min(3, Math.max(0, cmsMatch.correctIndex)),
          explanation: cmsMatch.explanation,
        };
      })
      .filter((q): q is NonNullable<typeof q> => q !== null);

    if (questions.length > 0) {
      result.push({ ...p, questions });
    }
  }

  for (const custom of cmsItems) {
    if (consumedIds.has(custom.id)) continue;
    const rawPassage = custom.passage || custom.prompt;
    const [firstLine, ...rest] = rawPassage.split('\n');
    const bodyText = rest.length > 0 ? rest.join('\n') : rawPassage;
    result.push({
      id: custom.id,
      moduleId,
      level: normalizeExamLevel(custom.level),
      title: rest.length > 0 ? firstLine : `Bài đọc ${custom.level}`,
      genre: 'CMS Đọc hiểu',
      paragraphs: splitReadingPassageParagraphs(bodyText),
      translation: custom.explanation,
      vocabNotes: [],
      questions: [
        {
          id: `${custom.id}_q1`,
          prompt: custom.prompt,
          options: padFourOptions(custom.options),
          correctIndex: Math.min(3, Math.max(0, custom.correctIndex)),
          explanation: custom.explanation,
        },
      ],
    });
  }

  return result;
}

export function getLiveJlptListeningItems(
  snap: CmsSnapshot,
  levelFilter: JLPTLevelFilter = 'ALL',
): JLPTListeningItem[] {
  const staticMap = new Map(getJLPTListeningItems('ALL').map((l) => [l.id, l]));
  return snap.jlptQuestions
    .filter((q) => q.moduleId === 'listening' && matchesJlptLevel(q.level, levelFilter))
    .map((q) => {
      const base = staticMap.get(q.id);
      const dialogueLines = (q.audioText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const sepIdx = line.indexOf(':');
          const speaker = sepIdx > 0 && sepIdx < 16 ? line.slice(0, sepIdx).trim() : '話者';
          const plainText = sepIdx > 0 && sepIdx < 16 ? line.slice(sepIdx + 1).trim() : line;
          return {
            speaker,
            plainText,
            segments: [{ text: plainText }],
          };
        });

      return {
        id: q.id,
        level: normalizeExamLevel(q.level),
        mondaiLabel: base?.mondaiLabel ?? `Choukai · ${q.level}`,
        situation: q.passage || base?.situation || 'Nghe đoạn hội thoại và chọn đáp án đúng.',
        questionPrompt: q.prompt,
        dialogue: base && !q.audioText ? base.dialogue : dialogueLines.length > 0 ? dialogueLines : base?.dialogue ?? [],
        options: padFourOptions(q.options),
        correctIndex: Math.min(3, Math.max(0, q.correctIndex)),
        translation: base?.translation ?? q.audioText ?? '',
        explanation: q.explanation,
      };
    });
}
