import type { CmsSnapshot } from '../services/adminCmsService';
import {
  getLiveGrammarBooks,
  getLiveJlptListeningItems,
  getLiveJlptReadingPassages,
  getLiveKanjis,
  getLiveVocabForUnit,
} from '../services/curriculumStore';
import { allGrammarSentencesBank } from '../data/grammar';
import type {
  JLPTLevelFilter,
  JLPTListeningItem,
  JLPTReadingPassage,
} from '../data/jlpt/jlptDataset';
import type { RoadmapStage, StageTask } from '../services/stageRoadmapService';
import type { StudyLevel } from '../services/userLevelService';
import { getUnitsForVocabTextbook, resolveActiveVocabTextbook } from '../data/vocabTextbooks';
import {
  buildGrammarDeepInsight,
  type ConfusableGrammarItem,
  type GrammarRightVsWrong,
} from './grammarEngine/grammarInsightEngine';

export interface BriefingVocabItem {
  id: string;
  japanese: string;
  hiragana: string;
  hanviet?: string;
  meaning: string;
}

export interface BriefingGrammarExample {
  japanese: string;
  hiragana?: string;
  vietnamese: string;
}

export interface BriefingGrammarItem {
  id: string;
  name: string;
  meaning: string;
  level: string;
  formula: string;
  whenToUse: string[];
  triggerWords: string[];
  memoryTip: string;
  examples: BriefingGrammarExample[];
  rightVsWrong: GrammarRightVsWrong;
  confusableTitle: string;
  confusableItems: ConfusableGrammarItem[];
}

export interface BriefingKanjiItem {
  id: string;
  kanji: string;
  hanViet: string;
  meaning: string;
  strokeCount?: number;
  radical?: string;
  onReading?: string;
  kunReading?: string;
  onReadings: string[];
  kunReadings: string[];
  compounds: Array<{ word: string; hiragana: string; meaning: string }>;
}

export interface BriefingQuickCheck {
  id: string;
  category: 'Dấu hiệu & Sắc thái' | 'Từ vựng trọng tâm' | 'Chữ Hán (Kanji)';
  prompt: string;
  options: [string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface StageMasteryQuestion {
  id: string;
  category: 'Từ vựng' | 'Chữ Hán' | 'Ngữ pháp · Dấu hiệu';
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  reviewHint: string;
}

export interface StageBriefingData {
  stageId: string;
  headline: string;
  vocabItems: BriefingVocabItem[];
  grammarItems: BriefingGrammarItem[];
  kanjiItems: BriefingKanjiItem[];
  /** 3 comprehension & trigger-word checks for Phase 2 (100% retry-until-correct) */
  quickChecks: BriefingQuickCheck[];
  /** Targeted Vocab Quiz questions built directly from today's flipcard deck */
  vocabQuizQuestions: StageMasteryQuestion[];
  /** Targeted Kanji Quiz questions built directly from today's 5-Kanji deck */
  kanjiQuizQuestions: StageMasteryQuestion[];
  /** Targeted Reading passages for Mokumoku Reading mode */
  readingPassages: JLPTReadingPassage[];
  /** Targeted Listening dialogues for Active Listening mode (hide -> reveal script) */
  listeningItems: JLPTListeningItem[];
  /** Mastery question pool for Phase 4 (up to 20; pick 10/15/20 with pickMasteryQuestions) */
  masteryQuestions: StageMasteryQuestion[];
}

export interface StageBossRecord {
  stageId: string;
  score: number;
  total: number;
  accuracyPct: number;
  isJumpPass: boolean;
  passedAt: string;
}

export interface StoredStageSessionPayload {
  stage: RoadmapStage;
  level: StudyLevel;
  textbookId: string;
}

const ACTIVE_STAGE_SESSION_STORAGE_KEY = 'nihongo-active-stage-session-v1';

export function persistActiveStageSession(payload: StoredStageSessionPayload): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(ACTIVE_STAGE_SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage write errors
  }
}

export function readStoredStageSession(
  stageId: string | undefined,
): StoredStageSessionPayload | null {
  if (!stageId || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(ACTIVE_STAGE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredStageSessionPayload;
    if (parsed?.stage?.id === stageId) return parsed;
  } catch {
    // Ignore storage read errors
  }
  return null;
}

export type StageTaskPhase = 'study' | 'practice';

const BRIEFING_UNDERSTOOD_KEY_PREFIX = 'nihonmaster_stage_briefing_ok_v1:';
const BRIEFING_SKIPPED_KEY_PREFIX = 'nihonmaster_stage_gate_skip_v1:';
const STAGE_BOSS_PASSED_KEY_PREFIX = 'nihonmaster_stage_boss_pass_v1:';

export function getStageTaskPhase(task: StageTask): StageTaskPhase {
  const path = (task.to || '').toLowerCase();
  if (
    task.skill === 'quiz' ||
    task.skill === 'reading' ||
    task.skill === 'listening' ||
    task.skill === 'review'
  ) {
    return 'practice';
  }
  if (
    path.startsWith('/quiz') ||
    path.startsWith('/writing') ||
    path.startsWith('/minigames') ||
    path.startsWith('/jlpt') ||
    path.startsWith('/review') ||
    path.includes('/practice')
  ) {
    return 'practice';
  }
  return 'study';
}

function readIdList(prefix: string, userId?: string | null): string[] {
  if (typeof window === 'undefined') return [];
  const owner = userId || 'guest';
  try {
    const raw = window.localStorage.getItem(`${prefix}${owner}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      : [];
  } catch {
    return [];
  }
}

function addIdToList(prefix: string, stageId: string, userId?: string | null): string[] {
  const existing = readIdList(prefix, userId);
  if (existing.includes(stageId)) return existing;
  const next = [...existing, stageId];
  if (typeof window !== 'undefined') {
    const owner = userId || 'guest';
    try {
      window.localStorage.setItem(`${prefix}${owner}`, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }
  return next;
}

export function loadUnderstoodStageIds(userId?: string | null): string[] {
  return readIdList(BRIEFING_UNDERSTOOD_KEY_PREFIX, userId);
}

export function markStageBriefingUnderstood(stageId: string, userId?: string | null): string[] {
  return addIdToList(BRIEFING_UNDERSTOOD_KEY_PREFIX, stageId, userId);
}

export function loadSkippedGateStageIds(userId?: string | null): string[] {
  return readIdList(BRIEFING_SKIPPED_KEY_PREFIX, userId);
}

export function markStageGateSkipped(stageId: string, userId?: string | null): string[] {
  return addIdToList(BRIEFING_SKIPPED_KEY_PREFIX, stageId, userId);
}

export function loadPassedBossStages(userId?: string | null): Record<string, StageBossRecord> {
  if (typeof window === 'undefined') return {};
  const owner = userId || 'guest';
  try {
    const raw = window.localStorage.getItem(`${STAGE_BOSS_PASSED_KEY_PREFIX}${owner}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, StageBossRecord>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveStageBossPassed(
  record: StageBossRecord,
  userId?: string | null,
): Record<string, StageBossRecord> {
  const map = loadPassedBossStages(userId);
  const existing = map[record.stageId];
  const next: Record<string, StageBossRecord> = {
    ...map,
    [record.stageId]:
      existing && existing.accuracyPct > record.accuracyPct ? existing : record,
  };
  if (typeof window !== 'undefined') {
    const owner = userId || 'guest';
    try {
      window.localStorage.setItem(`${STAGE_BOSS_PASSED_KEY_PREFIX}${owner}`, JSON.stringify(next));
    } catch {
      // Ignore storage errors
    }
  }
  return next;
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function parseQueryParams(to: string): URLSearchParams {
  const qIdx = to.indexOf('?');
  return new URLSearchParams(qIdx >= 0 ? to.slice(qIdx + 1) : '');
}

function rotate3(items: [string, string, string], targetIndex: number): [string, string, string] {
  return [0, 1, 2].map((pos) => items[(pos - targetIndex + 3) % 3]) as [string, string, string];
}

function rotate4(
  items: [string, string, string, string],
  targetIndex: number,
): [string, string, string, string] {
  return [0, 1, 2, 3].map((pos) => items[(pos - targetIndex + 4) % 4]) as [
    string,
    string,
    string,
    string,
  ];
}

function uniqueStrings(list: string[], exclude: string, needed: number, fallbacks: string[]): string[] {
  const seen = new Set<string>([exclude.trim().toLowerCase()]);
  const result: string[] = [];
  for (const item of [...list, ...fallbacks]) {
    const clean = item.trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
    if (result.length >= needed) break;
  }
  return result;
}

export function buildStageBriefing(
  stage: RoadmapStage,
  cmsSnapshot: CmsSnapshot,
  level: StudyLevel,
  textbookId?: string | null,
): StageBriefingData {
  const resolvedBook = resolveActiveVocabTextbook(level, null, textbookId);
  const units = getUnitsForVocabTextbook(cmsSnapshot, level, resolvedBook);

  let detectedUnitNum: number | null = null;
  let detectedGrammarBookId: string | null = null;
  let detectedGrammarChapterId: string | null = null;
  let detectedKanjiGroup: number | null = null;
  let detectedKanjiSize = 5;

  for (const task of stage.tasks) {
    const to = task.to || '';
    const params = parseQueryParams(to);

    if (detectedUnitNum === null) {
      const unitPathMatch = to.match(/\/unit\/(\d+)/i);
      const unitQuery = params.get('unit');
      if (unitPathMatch) {
        detectedUnitNum = Number(unitPathMatch[1]);
      } else if (unitQuery && Number.isFinite(Number(unitQuery))) {
        detectedUnitNum = Number(unitQuery);
      }
    }

    if (!detectedGrammarBookId) {
      const grammarMatch = to.match(/\/grammar\/book\/([^/]+)\/chapter\/([^/?]+)/i);
      if (grammarMatch) {
        detectedGrammarBookId = decodeURIComponent(grammarMatch[1]);
        detectedGrammarChapterId = decodeURIComponent(grammarMatch[2]);
      }
    }

    if (detectedKanjiGroup === null && to.startsWith('/kanji')) {
      const grp = Number(params.get('group') ?? '0');
      const sz = Number(params.get('size') ?? '5');
      if (Number.isFinite(grp) && grp > 0) {
        detectedKanjiGroup = grp;
        if (Number.isFinite(sz) && sz > 0) detectedKanjiSize = sz;
      }
    }
  }

  const targetUnit =
    (detectedUnitNum !== null
      ? units.find((u) => u.id === detectedUnitNum || u.dbUnitId === String(detectedUnitNum))
      : undefined) ??
    (units.length > 0 ? units[(Math.max(1, stage.stageNumber) - 1) % units.length] : undefined);

  const unitWords = targetUnit
    ? getLiveVocabForUnit(cmsSnapshot, level, targetUnit.dbUnitId ?? targetUnit.id)
    : [];

  const vocabItems: BriefingVocabItem[] = unitWords.slice(0, 8).map((w) => ({
    id: String(w.id),
    japanese: w.kanji?.trim() ? w.kanji.trim() : w.hiragana.trim(),
    hiragana: w.hiragana.trim(),
    hanviet: w.hanViet?.trim() || undefined,
    meaning: w.meaning.trim(),
  }));

  // 2. Targeted Grammar Rules with full Tips, Trigger Words, Right vs Wrong & Confusable Pairs
  const allBooks = getLiveGrammarBooks(cmsSnapshot);
  const targetGrammarBook =
    (detectedGrammarBookId ? allBooks.find((b) => b.id === detectedGrammarBookId) : undefined) ??
    allBooks.find((b) => b.level === level) ??
    allBooks[0];

  const targetChapter =
    (detectedGrammarChapterId
      ? targetGrammarBook?.chapters.find((c) => c.id === detectedGrammarChapterId)
      : undefined) ??
    (targetGrammarBook && targetGrammarBook.chapters.length > 0
      ? targetGrammarBook.chapters[(Math.max(1, stage.stageNumber) - 1) % targetGrammarBook.chapters.length]
      : undefined);

  const allLevelGrammar = allBooks
    .filter((b) => b.level === (targetGrammarBook?.level ?? level))
    .flatMap((b) => b.chapters.flatMap((c) => c.grammars));

  const chapterRules = targetChapter?.grammars ?? [];
  const grammarItems: BriefingGrammarItem[] = chapterRules.slice(0, 4).map((rule) => {
    const insight = buildGrammarDeepInsight(rule, chapterRules, allLevelGrammar);
    const bankExamples = allGrammarSentencesBank
      .filter((s) => s.grammarId === rule.id)
      .slice(0, 3)
      .map((s) => ({
        japanese: s.japanese,
        hiragana: s.hiragana,
        vietnamese: s.vietnamese,
      }));
    const usageMatch = rule.usage?.match(/Ví dụ:\s*([^(\n]+?)\s*\(([^)\n]+)\)/i);
    const examples: BriefingGrammarExample[] =
      bankExamples.length > 0
        ? bankExamples
        : usageMatch
          ? [{ japanese: usageMatch[1].trim(), vietnamese: usageMatch[2].trim() }]
          : [
              {
                japanese: insight.rightVsWrong.rightSentence,
                vietnamese: insight.rightVsWrong.rightMeaning,
              },
            ];
    const formula =
      rule.patterns && rule.patterns.length > 0
        ? rule.patterns.map((p) => p.pattern).join('  /  ')
        : rule.templates?.[0]?.pattern || rule.name;

    return {
      id: rule.id,
      name: rule.name,
      meaning: rule.meaning,
      level: rule.level,
      formula,
      whenToUse: insight.whenToUse.slice(0, 2),
      triggerWords: insight.triggerWords.slice(0, 5),
      memoryTip: insight.mnemonicTip,
      examples,
      rightVsWrong: insight.rightVsWrong,
      confusableTitle: insight.confusableGroup.groupTitle,
      confusableItems: insight.confusableGroup.items.slice(0, 3),
    };
  });

  // 3. Targeted Kanji Group (5 chars)
  const allKanjis = getLiveKanjis(cmsSnapshot);
  const levelKanjis = allKanjis.filter((k) => k.jlptLevel === level);
  const effectiveKanjis = levelKanjis.length > 0 ? levelKanjis : allKanjis;
  const kanjiGroupNum = detectedKanjiGroup ?? Math.max(1, stage.stageNumber);
  const kanjiItems: BriefingKanjiItem[] = [];
  if (effectiveKanjis.length > 0) {
    const startIdx = ((kanjiGroupNum - 1) * detectedKanjiSize) % effectiveKanjis.length;
    const count = Math.min(detectedKanjiSize, effectiveKanjis.length);
    for (let i = 0; i < count; i += 1) {
      const k = effectiveKanjis[(startIdx + i) % effectiveKanjis.length];
      kanjiItems.push({
        id: k.id,
        kanji: k.kanji,
        hanViet: k.hanViet || '',
        meaning: k.meanings.slice(0, 2).join(', '),
        strokeCount: k.strokeCount,
        radical: k.radical,
        onReading: k.onReadings[0],
        kunReading: k.kunReadings[0],
        onReadings: k.onReadings.slice(0, 3),
        kunReadings: k.kunReadings.slice(0, 3),
        compounds: (k.examples ?? []).slice(0, 3).map((ex) => ({
          word: ex.word,
          hiragana: ex.hiragana,
          meaning: ex.meaning,
        })),
      });
    }
  }

  // 4. Build 3 Comprehension & Trigger-Word Checks for Phase 2 (need >= 2/3)
  const seed = hashString(stage.id);
  const quickChecks: BriefingQuickCheck[] = [];

  if (grammarItems.length > 0) {
    const g = grammarItems[0];
    const otherMeanings = allLevelGrammar
      .filter((r) => r.id !== g.id)
      .map((r) => r.meaning);
    const [d1, d2] = uniqueStrings(otherMeanings, g.meaning, 2, [
      'Diễn tả giả định trái thực tế',
      'Chỉ hành động đã hoàn tất hoàn toàn',
    ]);
    const correctIdx = seed % 3;
    quickChecks.push({
      id: `${stage.id}-qc-gram`,
      category: 'Dấu hiệu & Sắc thái',
      prompt: `Khi thấy dấu hiệu ${g.triggerWords.length > 0 ? `「${g.triggerWords.slice(0, 2).join(' / ')}」` : `mẫu 「${g.name}」`}, cấu trúc 「${g.name}」 diễn đạt sắc thái nào?`,
      options: rotate3([g.meaning, d1, d2], correctIdx),
      correctIndex: correctIdx,
      explanation: `${g.name} = ${g.meaning}. ${g.memoryTip}`,
    });
  }

  if (vocabItems.length >= 3) {
    const v = vocabItems[seed % Math.min(vocabItems.length, 5)];
    const otherMeanings = vocabItems.filter((x) => x.id !== v.id).map((x) => x.meaning);
    const [d1, d2] = uniqueStrings(otherMeanings, v.meaning, 2, [
      'đi du lịch cuối tuần',
      'họp nhóm ở công ty',
    ]);
    const correctIdx = (seed + 1) % 3;
    quickChecks.push({
      id: `${stage.id}-qc-vocab`,
      category: 'Từ vựng trọng tâm',
      prompt: `Từ 「${v.japanese}${v.japanese !== v.hiragana ? ` (${v.hiragana})` : ''}」 trong bài hôm nay mang nghĩa nào?`,
      options: rotate3([v.meaning, d1, d2], correctIdx),
      correctIndex: correctIdx,
      explanation: `「${v.japanese}」 (${v.hiragana}) nghĩa là "${v.meaning}".`,
    });
  }

  if (kanjiItems.length >= 3) {
    const k = kanjiItems[(seed + 2) % kanjiItems.length];
    const fmt = (x: BriefingKanjiItem) =>
      x.hanViet ? `${x.hanViet.toUpperCase()} — ${x.meaning}` : x.meaning;
    const targetLabel = fmt(k);
    const others = kanjiItems.filter((x) => x.id !== k.id).map(fmt);
    const [d1, d2] = uniqueStrings(others, targetLabel, 2, [
      'NHẬT — mặt trời, ngày',
      'THỜI — thời gian, giờ',
    ]);
    const correctIdx = (seed + 2) % 3;
    quickChecks.push({
      id: `${stage.id}-qc-kanji`,
      category: 'Chữ Hán (Kanji)',
      prompt: `Chữ Hán 「${k.kanji}」 trong nhóm 5 chữ hôm nay có âm Hán Việt & nghĩa là gì?`,
      options: rotate3([targetLabel, d1, d2], correctIdx),
      correctIndex: correctIdx,
      explanation: `「${k.kanji}」 (${k.hanViet || 'Kanji'}) mang nghĩa "${k.meaning}".`,
    });
  } else if (grammarItems.length > 1) {
    const g2 = grammarItems[1];
    const otherMeanings = allLevelGrammar
      .filter((r) => r.id !== g2.id)
      .map((r) => r.meaning);
    const [d1, d2] = uniqueStrings(otherMeanings, g2.meaning, 2, [
      'Biểu thị sự cho phép',
      'Diễn tả sự tiếc nuối',
    ]);
    const correctIdx = (seed + 2) % 3;
    quickChecks.push({
      id: `${stage.id}-qc-gram2`,
      category: 'Dấu hiệu & Sắc thái',
      prompt: `Mẫu ngữ pháp thứ 2 hôm nay 「${g2.name}」 dùng để nói về điều gì?`,
      options: rotate3([g2.meaning, d1, d2], correctIdx),
      correctIndex: correctIdx,
      explanation: `${g2.name} = ${g2.meaning}. ${g2.memoryTip}`,
    });
  }

  // 5. Build the Mastery question pool for Phase 4 (up to 10 Vocab + 4 Kanji + 6 Grammar);
  //    the learner then picks 10 / 15 / 20 of them (see pickMasteryQuestions)
  const masteryQuestions: StageMasteryQuestion[] = [];
  const allVocabMeanings = unitWords.map((w) => w.meaning.trim()).filter(Boolean);
  const allVocabHiragana = unitWords.map((w) => w.hiragana.trim()).filter(Boolean);

  // Up to 10 Vocab Mastery Questions (distinct words; every 3rd asks the reading)
  const vocabPool = unitWords.slice(0, 16);
  const vocabCount = Math.min(10, vocabPool.length);
  const vocabStep = vocabPool.length % 3 === 0 ? 1 : 3;
  for (let i = 0; i < vocabCount; i += 1) {
    const w = vocabPool[(seed + i * vocabStep) % vocabPool.length];
    const kanjiStr = w.kanji?.trim() ?? '';
    const jp = kanjiStr || w.hiragana.trim();
    const askReading = i % 3 === 1 && Boolean(kanjiStr) && kanjiStr !== w.hiragana.trim();

    if (askReading) {
      const distractors = uniqueStrings(allVocabHiragana, w.hiragana.trim(), 3, [
        'せんせい',
        'がくせい',
        'かいしゃいん',
      ]);
      const cIdx = (seed + i) % 4;
      masteryQuestions.push({
        id: `${stage.id}-m-v${i}`,
        category: 'Từ vựng',
        prompt: `Cách đọc Hiragana chuẩn của từ 「${jp}」 (${w.meaning}) là gì?`,
        options: rotate4([w.hiragana.trim(), distractors[0], distractors[1], distractors[2]], cIdx),
        correctIndex: cIdx,
        explanation: `「${jp}」 đọc là 「${w.hiragana.trim()}」 — nghĩa: ${w.meaning}.`,
        reviewHint: 'Ôn lại Chặng 1 · Bảng Từ vựng bài hôm nay',
      });
    } else {
      const distractors = uniqueStrings(allVocabMeanings, w.meaning.trim(), 3, [
        'nhân viên công ty',
        'bệnh viện / phòng khám',
        'siêu thị gần nhà ga',
      ]);
      const cIdx = (seed + i + 1) % 4;
      masteryQuestions.push({
        id: `${stage.id}-m-v${i}`,
        category: 'Từ vựng',
        prompt: `Nghĩa chính xác của từ 「${jp}${jp !== w.hiragana.trim() ? ` (${w.hiragana.trim()})` : ''}」 là gì?`,
        options: rotate4([w.meaning.trim(), distractors[0], distractors[1], distractors[2]], cIdx),
        correctIndex: cIdx,
        explanation: `「${jp}」 (${w.hiragana.trim()}) = ${w.meaning.trim()}.`,
        reviewHint: 'Ôn lại Chặng 1 · Bảng Từ vựng bài hôm nay',
      });
    }
  }

  // Up to 4 Kanji Mastery Questions (distinct characters)
  for (let i = 0; i < Math.min(4, kanjiItems.length); i += 1) {
    const k = kanjiItems[(seed + i) % kanjiItems.length];
    const fmt = (x: BriefingKanjiItem) =>
      x.hanViet ? `${x.hanViet.toUpperCase()} (${x.meaning})` : x.meaning;
    const correctLabel = fmt(k);
    const kanjiDistractorPool = effectiveKanjis
      .filter((x) => x.id !== k.id)
      .slice(0, 12)
      .map((x) =>
        x.hanViet ? `${x.hanViet.toUpperCase()} (${x.meanings.slice(0, 2).join(', ')})` : x.meanings[0] || '',
      );
    const distractors = uniqueStrings(kanjiDistractorPool, correctLabel, 3, [
      'THỦY (nước)',
      'HỎA (lửa)',
      'MỘC (cây gỗ)',
    ]);
    const cIdx = (seed + i + 2) % 4;
    masteryQuestions.push({
      id: `${stage.id}-m-k${i}`,
      category: 'Chữ Hán',
      prompt: `Chữ Hán 「${k.kanji}」${k.onReading ? ` (âm On: ${k.onReading})` : ''} có Hán Việt & nghĩa nào?`,
      options: rotate4([correctLabel, distractors[0], distractors[1], distractors[2]], cIdx),
      correctIndex: cIdx,
      explanation: `「${k.kanji}」 = ${correctLabel}.`,
      reviewHint: 'Ôn lại Chặng 1 · 5 chữ Kanji nhóm bài này',
    });
  }

  // Up to 6 Grammar & Trigger-Word Mastery Questions: one scenario per rule,
  // then a second scenario of the same rules when the chapter has few rules
  const grammarRulesForTest = chapterRules.slice(0, 6);
  const grammarSlots: Array<{ ruleIdx: number; scenarioIdx: number }> = grammarRulesForTest.map(
    (_, ruleIdx) => ({ ruleIdx, scenarioIdx: 0 }),
  );
  for (let ruleIdx = 0; grammarSlots.length < 6 && ruleIdx < grammarRulesForTest.length; ruleIdx += 1) {
    grammarSlots.push({ ruleIdx, scenarioIdx: 1 });
  }
  for (let slotIdx = 0; slotIdx < grammarSlots.length; slotIdx += 1) {
    const { ruleIdx, scenarioIdx } = grammarSlots[slotIdx];
    const i = slotIdx;
    const rule = grammarRulesForTest[ruleIdx];
    const insight = buildGrammarDeepInsight(rule, chapterRules, allLevelGrammar);
    const sc = insight.scenarioQuestions[scenarioIdx];
    if (scenarioIdx > 0 && !(sc && sc.options.length >= 4)) continue;
    if (sc && sc.options.length >= 4) {
      const cIdx = sc.options.indexOf(sc.correctAnswer);
      masteryQuestions.push({
        id: `${stage.id}-m-g${i}`,
        category: 'Ngữ pháp · Dấu hiệu',
        prompt: sc.prompt,
        options: [sc.options[0], sc.options[1], sc.options[2], sc.options[3]],
        correctIndex: cIdx >= 0 ? cIdx : 0,
        explanation: `${sc.explanation} (Mẹo: ${insight.mnemonicTip})`,
        reviewHint: `Ôn lại Chặng 2 · Tips & Dấu hiệu mẫu 「${rule.name}」`,
      });
    } else {
      const distractors = uniqueStrings(
        allLevelGrammar.filter((r) => r.id !== rule.id).map((r) => r.meaning),
        rule.meaning,
        3,
        ['Chỉ nguyên nhân ngoài ý muốn', 'Yêu cầu lịch sự', 'Giả định điều kiện'],
      );
      const cIdx = (seed + i) % 4;
      masteryQuestions.push({
        id: `${stage.id}-m-g${i}`,
        category: 'Ngữ pháp · Dấu hiệu',
        prompt: `Mẫu ngữ pháp 「${rule.name}」 dùng trong tình huống nào?`,
        options: rotate4([rule.meaning, distractors[0], distractors[1], distractors[2]], cIdx),
        correctIndex: cIdx,
        explanation: `${rule.name} = ${rule.meaning}. ${insight.mnemonicTip}`,
        reviewHint: `Ôn lại Chặng 2 · Tips & Dấu hiệu mẫu 「${rule.name}」`,
      });
    }
  }

  // 6. Dedicated Flipcard -> 100% Quiz Decks (Vocab & Kanji)
  const vocabQuizQuestions: StageMasteryQuestion[] = vocabItems.map((v, idx) => {
    const hasDistinctKanji = v.japanese !== v.hiragana;
    const askReading = idx % 2 === 1 && hasDistinctKanji;
    if (askReading) {
      const distractors = uniqueStrings(allVocabHiragana, v.hiragana, 3, [
        'せんせい',
        'がくせい',
        'かいしゃいん',
      ]);
      const cIdx = (seed + idx) % 4;
      return {
        id: `${stage.id}-vq-${idx}`,
        category: 'Từ vựng',
        prompt: `Cách đọc Hiragana của từ 「${v.japanese}」 (${v.meaning}) là gì?`,
        options: rotate4([v.hiragana, distractors[0], distractors[1], distractors[2]], cIdx),
        correctIndex: cIdx,
        explanation: `「${v.japanese}」 đọc là 「${v.hiragana}」 — nghĩa: ${v.meaning}.`,
        reviewHint: 'Lật lại thẻ Từ vựng vừa học để ghi nhớ mặt chữ và cách đọc.',
      };
    }
    const distractors = uniqueStrings(allVocabMeanings, v.meaning, 3, [
      'nhân viên công ty',
      'bệnh viện / phòng khám',
      'nhà ga gần đây',
    ]);
    const cIdx = (seed + idx + 1) % 4;
    return {
      id: `${stage.id}-vq-${idx}`,
      category: 'Từ vựng',
      prompt: `Từ 「${v.japanese}${hasDistinctKanji ? ` (${v.hiragana})` : ''}」 mang nghĩa nào?`,
      options: rotate4([v.meaning, distractors[0], distractors[1], distractors[2]], cIdx),
      correctIndex: cIdx,
      explanation: `「${v.japanese}」 (${v.hiragana}) = ${v.meaning}.`,
      reviewHint: 'Lật lại thẻ Từ vựng để nhớ rõ nghĩa tiếng Việt.',
    };
  });

  const kanjiQuizQuestions: StageMasteryQuestion[] = kanjiItems.map((k, idx) => {
    const fmt = (x: BriefingKanjiItem) =>
      x.hanViet ? `${x.hanViet.toUpperCase()} — ${x.meaning}` : x.meaning;
    const correctLabel = fmt(k);
    const pool = effectiveKanjis
      .filter((x) => x.id !== k.id)
      .slice(0, 15)
      .map((x) =>
        x.hanViet
          ? `${x.hanViet.toUpperCase()} — ${x.meanings.slice(0, 2).join(', ')}`
          : x.meanings[0] || '',
      );
    const distractors = uniqueStrings(pool, correctLabel, 3, [
      'NHẬT — mặt trời, ngày',
      'NGUYỆT — mặt trăng, tháng',
      'THỦY — nước',
    ]);
    const cIdx = (seed + idx) % 4;
    return {
      id: `${stage.id}-kq-${idx}`,
      category: 'Chữ Hán',
      prompt: `Chữ Hán 「${k.kanji}」${k.onReading ? ` (On: ${k.onReading})` : ''} có âm Hán Việt & nghĩa là gì?`,
      options: rotate4([correctLabel, distractors[0], distractors[1], distractors[2]], cIdx),
      correctIndex: cIdx,
      explanation: `「${k.kanji}」 = ${correctLabel}${k.kunReading ? ` · Kun: ${k.kunReading}` : ''}.`,
      reviewHint: 'Xem lại thẻ chữ Kanji này để nhớ âm Hán Việt & bộ thủ.',
    };
  });

  // 7. Targeted Reading Passages & Listening Dialogues for this Stage
  const jlptFilter: JLPTLevelFilter =
    level === 'N5' || level === 'N4' || level === 'N3' ? level : 'N3';
  const shortPassages = getLiveJlptReadingPassages(cmsSnapshot, 'reading-short', jlptFilter);
  const mediumPassages = getLiveJlptReadingPassages(cmsSnapshot, 'reading-medium', jlptFilter);
  const allPassages = shortPassages.length > 0 ? shortPassages : mediumPassages;
  const readingPassages: JLPTReadingPassage[] = [];
  if (allPassages.length > 0) {
    const pStart = (Math.max(1, stage.stageNumber) - 1) % allPassages.length;
    readingPassages.push(allPassages[pStart]);
    if (allPassages.length > 1) {
      readingPassages.push(allPassages[(pStart + 1) % allPassages.length]);
    }
  }

  const allListening = getLiveJlptListeningItems(cmsSnapshot, jlptFilter);
  const listeningItems: JLPTListeningItem[] = [];
  if (allListening.length > 0) {
    const lStart = ((Math.max(1, stage.stageNumber) - 1) * 2) % allListening.length;
    listeningItems.push(allListening[lStart]);
    if (allListening.length > 1) {
      listeningItems.push(allListening[(lStart + 1) % allListening.length]);
    }
  }

  return {
    stageId: stage.id,
    headline: targetUnit ? targetUnit.name : stage.title,
    vocabItems,
    grammarItems,
    kanjiItems,
    quickChecks,
    vocabQuizQuestions,
    kanjiQuizQuestions,
    readingPassages,
    listeningItems,
    // Same prompt can come from two generators (e.g. a 2nd grammar scenario): keep the first
    masteryQuestions: masteryQuestions.filter(
      (q, idx) => masteryQuestions.findIndex((other) => other.prompt === q.prompt) === idx,
    ),
  };
}

export const MASTERY_LENGTH_OPTIONS = [10, 15, 20] as const;

/**
 * Picks `count` questions from the Mastery pool, interleaving categories
 * (Từ vựng → Chữ Hán → Ngữ pháp → …) so every test stays mixed.
 */
export function pickMasteryQuestions(
  pool: StageMasteryQuestion[],
  count: number,
): StageMasteryQuestion[] {
  const buckets = new Map<string, StageMasteryQuestion[]>();
  for (const q of pool) {
    const list = buckets.get(q.category) ?? [];
    list.push(q);
    buckets.set(q.category, list);
  }
  const lists = Array.from(buckets.values());
  const picked: StageMasteryQuestion[] = [];
  for (let round = 0; picked.length < count; round += 1) {
    let addedThisRound = false;
    for (const list of lists) {
      if (round < list.length && picked.length < count) {
        picked.push(list[round]);
        addedThisRound = true;
      }
    }
    if (!addedThisRound) break;
  }
  return picked;
}
