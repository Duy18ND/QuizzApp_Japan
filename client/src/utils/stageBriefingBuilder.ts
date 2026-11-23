import type { CmsSnapshot } from '../services/adminCmsService';
import { getLiveGrammarBooks, getLiveKanjis, getLiveVocabForUnit } from '../services/curriculumStore';
import type { RoadmapStage, StageTask } from '../services/stageRoadmapService';
import type { StudyLevel } from '../services/userLevelService';
import { getUnitsForVocabTextbook, resolveActiveVocabTextbook } from '../data/vocabTextbooks';
import { buildGrammarDeepInsight } from './grammarEngine/grammarInsightEngine';

export interface BriefingVocabItem {
  id: string;
  japanese: string;
  hiragana: string;
  hanviet?: string;
  meaning: string;
}

export interface BriefingGrammarItem {
  id: string;
  name: string;
  meaning: string;
  whenToUse: string;
  memoryTip: string;
}

export interface BriefingKanjiItem {
  id: string;
  kanji: string;
  hanViet: string;
  meaning: string;
}

export interface BriefingQuickCheck {
  prompt: string;
  options: [string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface StageBriefingData {
  stageId: string;
  headline: string;
  vocabItems: BriefingVocabItem[];
  grammarItems: BriefingGrammarItem[];
  kanjiItems: BriefingKanjiItem[];
  quickCheck: BriefingQuickCheck | null;
}

export type StageTaskPhase = 'study' | 'practice';

const BRIEFING_UNDERSTOOD_KEY_PREFIX = 'nihonmaster_stage_briefing_ok_v1:';
const BRIEFING_SKIPPED_KEY_PREFIX = 'nihonmaster_stage_gate_skip_v1:';

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

export function buildStageBriefing(
  stage: RoadmapStage,
  cmsSnapshot: CmsSnapshot,
  level: StudyLevel,
  textbookId?: string | null,
): StageBriefingData {
  const resolvedBook = resolveActiveVocabTextbook(level, null, textbookId);
  const units = getUnitsForVocabTextbook(cmsSnapshot, level, resolvedBook);

  // 1. Detect targeted Vocabulary Unit from stage tasks (or fallback by stageNumber)
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

  // Fallback unit index mapped deterministically from stage number
  const targetUnit =
    (detectedUnitNum !== null
      ? units.find((u) => u.id === detectedUnitNum || u.dbUnitId === String(detectedUnitNum))
      : undefined) ??
    (units.length > 0 ? units[(Math.max(1, stage.stageNumber) - 1) % units.length] : undefined);

  const unitWords = targetUnit
    ? getLiveVocabForUnit(cmsSnapshot, level, targetUnit.dbUnitId ?? targetUnit.id)
    : [];

  const vocabItems: BriefingVocabItem[] = unitWords.slice(0, 6).map((w) => ({
    id: String(w.id),
    japanese: w.kanji?.trim() ? w.kanji.trim() : w.hiragana.trim(),
    hiragana: w.hiragana.trim(),
    hanviet: w.hanViet?.trim() || undefined,
    meaning: w.meaning.trim(),
  }));

  // 2. Detect targeted Grammar Rules
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

  const grammarItems: BriefingGrammarItem[] = (targetChapter?.grammars ?? [])
    .slice(0, 2)
    .map((rule) => {
      const insight = buildGrammarDeepInsight(rule, targetChapter?.grammars ?? [], allLevelGrammar);
      return {
        id: rule.id,
        name: rule.name,
        meaning: rule.meaning,
        whenToUse: insight.whenToUse[0] ?? rule.explanation,
        memoryTip: insight.mnemonicTip,
      };
    });

  // 3. Detect targeted Kanji Group
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
      });
    }
  }

  // 4. Build 1 deterministic Quick Comprehension Check right from the briefing items
  const seed = hashString(stage.id);
  let quickCheck: BriefingQuickCheck | null = null;

  const hasGrammarTask = stage.tasks.some((t) => t.skill === 'grammar');

  if (hasGrammarTask && grammarItems.length > 0) {
    const target = grammarItems[0];
    const distractors = allLevelGrammar
      .filter((r) => r.id !== target.id && r.meaning !== target.meaning)
      .map((r) => r.meaning);
    const d1 = distractors[seed % Math.max(1, distractors.length)] ?? 'Biểu thị giả định trái sự thật';
    const d2 =
      distractors[(seed + 3) % Math.max(1, distractors.length)] ?? 'Diễn tả hành động đã hoàn tất';
    const rawOptions = [target.meaning, d1, d2];
    const correctIndex = seed % 3;
    const rotated = [0, 1, 2].map((pos) => rawOptions[(pos - correctIndex + 3) % 3]) as [
      string,
      string,
      string,
    ];
    quickCheck = {
      prompt: `Mẫu ngữ pháp 「${target.name}」 trong bài hôm nay dùng để diễn đạt ý nào?`,
      options: rotated,
      correctIndex,
      explanation: `${target.name} = ${target.meaning}. ${target.whenToUse}`,
    };
  } else if (vocabItems.length >= 3) {
    const targetIdx = seed % Math.min(vocabItems.length, 4);
    const target = vocabItems[targetIdx];
    const others = vocabItems.filter((v) => v.id !== target.id && v.meaning !== target.meaning);
    const d1 = others[0]?.meaning ?? 'đi học / đến trường';
    const d2 = others[1]?.meaning ?? 'mua sắm cuối tuần';
    const rawOptions = [target.meaning, d1, d2];
    const correctIndex = (seed + 1) % 3;
    const rotated = [0, 1, 2].map((pos) => rawOptions[(pos - correctIndex + 3) % 3]) as [
      string,
      string,
      string,
    ];
    quickCheck = {
      prompt: `Từ vựng 「${target.japanese}${target.japanese !== target.hiragana ? ` (${target.hiragana})` : ''}」 trong tóm tắt phía trên có nghĩa là gì?`,
      options: rotated,
      correctIndex,
      explanation: `「${target.japanese}」 (${target.hiragana}) nghĩa là "${target.meaning}".`,
    };
  } else if (kanjiItems.length >= 3) {
    const target = kanjiItems[seed % kanjiItems.length];
    const others = kanjiItems.filter((k) => k.id !== target.id);
    const labelOf = (k: BriefingKanjiItem) =>
      k.hanViet ? `${k.hanViet.toUpperCase()} — ${k.meaning}` : k.meaning;
    const rawOptions = [
      labelOf(target),
      others[0] ? labelOf(others[0]) : 'THỜI — thời gian',
      others[1] ? labelOf(others[1]) : 'NHẬT — mặt trời / ngày',
    ];
    const correctIndex = (seed + 2) % 3;
    const rotated = [0, 1, 2].map((pos) => rawOptions[(pos - correctIndex + 3) % 3]) as [
      string,
      string,
      string,
    ];
    quickCheck = {
      prompt: `Chữ Hán 「${target.kanji}」 thuộc nhóm bài hôm nay có Hán Việt & nghĩa là gì?`,
      options: rotated,
      correctIndex,
      explanation: `「${target.kanji}」 (${target.hanViet || 'Kanji'}) mang nghĩa "${target.meaning}".`,
    };
  }

  return {
    stageId: stage.id,
    headline: targetUnit ? targetUnit.name : stage.title,
    vocabItems,
    grammarItems,
    kanjiItems,
    quickCheck,
  };
}
