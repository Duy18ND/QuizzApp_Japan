import type { JLPTLevel } from '../types/quiz';
import type { VocabularyItem } from '../types/vocabulary';
import {
  setInMemoryCustomStudio,
  getInMemoryCustomStudio,
  writeCustomStudioDirectToSupabase,
} from './cloudProgressWriter';
import { getActiveAuthenticatedUserId } from './sessionScope';

export type CustomLessonKind = 'vocab' | 'grammar' | 'kanji';

export interface CustomVocabEntry {
  id: string;
  kanji: string;
  hiragana: string;
  hanViet?: string;
  meaning: string;
  example?: string;
}

export interface CustomGrammarEntry {
  id: string;
  structure: string;
  meaning: string;
  usage?: string;
  exampleJp?: string;
  exampleVi?: string;
}

export interface CustomKanjiEntry {
  id: string;
  kanji: string;
  hanViet: string;
  meaning: string;
  reading?: string;
  mnemonic?: string;
}

export interface CustomLesson {
  id: string;
  kind: CustomLessonKind;
  title: string;
  level: JLPTLevel;
  description?: string;
  vocabItems?: CustomVocabEntry[];
  grammarItems?: CustomGrammarEntry[];
  kanjiItems?: CustomKanjiEntry[];
  createdAt: string;
  updatedAt: string;
}

export type VisualRoadmapNodeKind = 'vocab' | 'grammar' | 'kanji' | 'minigame' | 'boss';

export interface VisualRoadmapNode {
  id: string;
  title: string;
  subtitle?: string;
  kind: VisualRoadmapNodeKind;
  xPct: number; // 10 .. 90
  yPct: number; // 10 .. 90
  customLessonId?: string;
  targetPath?: string;
}

export interface VisualRoadmapEdge {
  id: string;
  fromId: string;
  toId: string;
}

export interface VisualRoadmap {
  id: string;
  name: string;
  level: JLPTLevel;
  description?: string;
  nodes: VisualRoadmapNode[];
  edges: VisualRoadmapEdge[];
  completedNodeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomStudioState {
  lessons: CustomLesson[];
  visualRoadmaps: VisualRoadmap[];
  updatedAt: string;
}

export const CUSTOM_STUDIO_SYNC_EVENT = 'nihonmaster:custom-studio-sync';
const STUDIO_STORAGE_PREFIX = 'nihonmaster_custom_studio_v1:';

function scopeKey(userId?: string | null): string {
  const uid = userId === undefined ? getActiveAuthenticatedUserId() : userId;
  return uid || 'guest';
}

export function createEmptyStudioState(): CustomStudioState {
  return {
    lessons: [],
    visualRoadmaps: [],
    updatedAt: new Date(0).toISOString(),
  };
}

function sanitizeStudioState(raw: unknown): CustomStudioState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return createEmptyStudioState();
  }
  const obj = raw as Partial<CustomStudioState>;
  const lessons = Array.isArray(obj.lessons)
    ? obj.lessons.filter(
        (l): l is CustomLesson =>
          Boolean(l) &&
          typeof l === 'object' &&
          typeof l.id === 'string' &&
          typeof l.title === 'string' &&
          (l.kind === 'vocab' || l.kind === 'grammar' || l.kind === 'kanji'),
      )
    : [];
  const visualRoadmaps = Array.isArray(obj.visualRoadmaps)
    ? obj.visualRoadmaps.filter(
        (r): r is VisualRoadmap =>
          Boolean(r) &&
          typeof r === 'object' &&
          typeof r.id === 'string' &&
          typeof r.name === 'string' &&
          Array.isArray(r.nodes) &&
          Array.isArray(r.edges),
      )
    : [];

  return {
    lessons,
    visualRoadmaps,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
  };
}

export function loadCustomStudioState(userId?: string | null): CustomStudioState {
  const key = scopeKey(userId);
  const inRam = getInMemoryCustomStudio(key);
  if (inRam) {
    return sanitizeStudioState(inRam);
  }
  if (typeof window === 'undefined') return createEmptyStudioState();
  try {
    const raw = window.localStorage.getItem(`${STUDIO_STORAGE_PREFIX}${key}`);
    if (!raw) return createEmptyStudioState();
    const parsed = sanitizeStudioState(JSON.parse(raw));
    setInMemoryCustomStudio(key, parsed as unknown as Record<string, unknown>);
    return parsed;
  } catch {
    return createEmptyStudioState();
  }
}

export function saveCustomStudioState(
  next: CustomStudioState,
  userId?: string | null,
): CustomStudioState {
  const effectiveUid = userId === undefined ? getActiveAuthenticatedUserId() : userId;
  const key = effectiveUid || 'guest';
  const stamped: CustomStudioState = {
    ...next,
    updatedAt: new Date().toISOString(),
  };

  setInMemoryCustomStudio(key, stamped as unknown as Record<string, unknown>);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${STUDIO_STORAGE_PREFIX}${key}`, JSON.stringify(stamped));
    } catch {
      // ignore storage quota errors
    }
    window.dispatchEvent(new CustomEvent<CustomStudioState>(CUSTOM_STUDIO_SYNC_EVENT, { detail: stamped }));
  }

  if (effectiveUid) {
    void writeCustomStudioDirectToSupabase(effectiveUid, stamped as unknown as Record<string, unknown>);
  }

  return stamped;
}

export function hydrateCustomStudioFromCloud(
  remoteRaw: Record<string, unknown> | null,
  userId?: string | null,
): CustomStudioState {
  const local = loadCustomStudioState(userId);
  if (!remoteRaw) return local;
  const remote = sanitizeStudioState(remoteRaw);
  const localTs = Date.parse(local.updatedAt) || 0;
  const remoteTs = Date.parse(remote.updatedAt) || 0;

  // Merge lessons & roadmaps by ID so neither local nor cloud creations are lost
  const lessonMap = new Map<string, CustomLesson>();
  for (const item of remote.lessons) lessonMap.set(item.id, item);
  for (const item of local.lessons) {
    const existing = lessonMap.get(item.id);
    if (!existing || (Date.parse(item.updatedAt) || 0) >= (Date.parse(existing.updatedAt) || 0)) {
      lessonMap.set(item.id, item);
    }
  }

  const roadmapMap = new Map<string, VisualRoadmap>();
  for (const r of remote.visualRoadmaps) roadmapMap.set(r.id, r);
  for (const r of local.visualRoadmaps) {
    const existing = roadmapMap.get(r.id);
    if (!existing || (Date.parse(r.updatedAt) || 0) >= (Date.parse(existing.updatedAt) || 0)) {
      roadmapMap.set(r.id, r);
    }
  }

  const merged: CustomStudioState = {
    lessons: Array.from(lessonMap.values()),
    visualRoadmaps: Array.from(roadmapMap.values()),
    updatedAt: remoteTs >= localTs ? remote.updatedAt : local.updatedAt,
  };

  const key = scopeKey(userId);
  setInMemoryCustomStudio(key, merged as unknown as Record<string, unknown>);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${STUDIO_STORAGE_PREFIX}${key}`, JSON.stringify(merged));
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent<CustomStudioState>(CUSTOM_STUDIO_SYNC_EVENT, { detail: merged }));
  }
  return merged;
}

/**
 * Bulk parser for pasting vocab rows from Excel/Google Sheets/text:
 * Supports formats:
 * - "食べる | たべる | ăn" (or tab-separated)
 * - "食べる | たべる | THỰC | ăn"
 * - "たべる | ăn"
 */
export function parseBulkVocabText(rawText: string): CustomVocabEntry[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const results: CustomVocabEntry[] = [];

  lines.forEach((line, idx) => {
    const parts = line
      .split(/\t|\s*\|\s*|\s*;\s*/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 2) return;

    if (parts.length === 2) {
      results.push({
        id: `cv-${Date.now()}-${idx}`,
        kanji: parts[0],
        hiragana: parts[0],
        meaning: parts[1],
      });
    } else if (parts.length === 3) {
      results.push({
        id: `cv-${Date.now()}-${idx}`,
        kanji: parts[0],
        hiragana: parts[1],
        meaning: parts[2],
      });
    } else {
      results.push({
        id: `cv-${Date.now()}-${idx}`,
        kanji: parts[0],
        hiragana: parts[1],
        hanViet: parts[2],
        meaning: parts[3],
        example: parts[4] || undefined,
      });
    }
  });

  return results;
}

/**
 * Converts a user-created Custom Vocab Lesson into standard VocabularyItem[]
 * so it works seamlessly with all 6 Mini-games, Flashcards, and Quizzes!
 */
export function customVocabToVocabularyItems(lesson: CustomLesson): VocabularyItem[] {
  const list = lesson.vocabItems ?? [];
  return list.map((item, idx) => ({
    id: 900_000 + idx + Math.abs(hashString(lesson.id) % 50_000),
    unitId: 900,
    level: lesson.level,
    wordNumber: idx + 1,
    kanji: item.kanji || item.hiragana,
    hiragana: item.hiragana || item.kanji,
    hanViet: item.hanViet || null,
    meaning: item.meaning,
    wordType: 'Danh từ',
    exampleSentence: item.example ?? null,
    exampleMeaning: null,
    notes: null,
  }));
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Auto-arranges visual roadmap nodes into a clean winding S-curve path
 * (like a Duolingo / Sakura Bridge stage map).
 */
export function autoArrangeSnakeLayout(nodes: VisualRoadmapNode[]): VisualRoadmapNode[] {
  if (nodes.length === 0) return [];
  const cols = 3;
  const rows = Math.max(1, Math.ceil(nodes.length / cols));
  const colPositions = [20, 50, 80];

  return nodes.map((node, idx) => {
    const row = Math.floor(idx / cols);
    const colInRow = idx % cols;
    const visualCol = row % 2 === 0 ? colInRow : cols - 1 - colInRow;
    const yPct =
      rows === 1 ? 50 : Math.round(16 + (row / Math.max(1, rows - 1)) * 68);
    return {
      ...node,
      xPct: colPositions[visualCol] ?? 50,
      yPct: Math.min(86, Math.max(14, yPct)),
    };
  });
}

export function isVisualNodeUnlocked(roadmap: VisualRoadmap, nodeId: string): boolean {
  const incoming = roadmap.edges.filter((e) => e.toId === nodeId);
  if (incoming.length === 0) return true;
  return incoming.some((e) => roadmap.completedNodeIds.includes(e.fromId));
}

export function createStarterVisualRoadmap(name: string, level: JLPTLevel): VisualRoadmap {
  const now = new Date().toISOString();
  const n1 = `node-${Date.now()}-1`;
  const n2 = `node-${Date.now()}-2`;
  const n3 = `node-${Date.now()}-3`;
  const n4 = `node-${Date.now()}-4`;
  return {
    id: `vmap-${Date.now()}`,
    name: name.trim() || `Lộ trình ${level} tự vẽ`,
    level,
    description: 'Kéo thả các điểm bài học, nối dây mở khóa hoặc rẽ nhánh theo ý thích.',
    nodes: [
      { id: n1, title: 'Chặng 1: Từ vựng nền', kind: 'vocab', xPct: 20, yPct: 22, targetPath: `/vocabulary/${level.toLowerCase()}` },
      { id: n2, title: 'Chặng 2: Ngữ pháp cốt lõi', kind: 'grammar', xPct: 50, yPct: 36, targetPath: '/grammar' },
      { id: n3, title: 'Chặng 3: Mini-game phản xạ', kind: 'minigame', xPct: 80, yPct: 54, targetPath: '/games' },
      { id: n4, title: 'Boss: Tổng ôn & Thi thử', kind: 'boss', xPct: 48, yPct: 78, targetPath: `/jlpt/full-test?level=${level}` },
    ],
    edges: [
      { id: `edge-${n1}-${n2}`, fromId: n1, toId: n2 },
      { id: `edge-${n2}-${n3}`, fromId: n2, toId: n3 },
      { id: `edge-${n3}-${n4}`, fromId: n3, toId: n4 },
    ],
    completedNodeIds: [],
    createdAt: now,
    updatedAt: now,
  };
}
