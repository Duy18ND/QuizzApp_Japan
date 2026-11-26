import { stableJson } from './deviceSyncMerge';
import { isSupabaseAccountUuid } from './sessionScope';
import { supabase } from './supabaseClient';
import type { JLPTLevel } from '../types/quiz';
import type { VocabularyItem } from '../types/vocabulary';
import {
  setInMemoryCustomStudio,
  getInMemoryCustomStudio,
  writeCustomStudioDirectToSupabase,
  USER_CUSTOM_STUDIO_ITEM_ID,
} from './cloudProgressWriter';
import { getActiveAuthenticatedUserId } from './sessionScope';

export type CustomLessonKind = 'vocab' | 'grammar' | 'kanji' | 'quiz';
export type CustomLessonRole = 'vocab' | 'kanji' | 'grammar' | 'reading' | 'listening' | 'mixed';

export const CUSTOM_ROLE_META: Record<
  CustomLessonRole,
  {
    label: string;
    tone: 'primary' | 'sakura' | 'success' | 'warning' | 'neutral';
    stageSkill: 'vocab' | 'kanji' | 'grammar' | 'reading' | 'listening' | 'quiz';
  }
> = {
  vocab: { label: 'Từ vựng', tone: 'primary', stageSkill: 'vocab' },
  kanji: { label: 'Chữ Hán', tone: 'warning', stageSkill: 'kanji' },
  grammar: { label: 'Ngữ pháp', tone: 'sakura', stageSkill: 'grammar' },
  reading: { label: 'Đọc hiểu', tone: 'sakura', stageSkill: 'reading' },
  listening: { label: 'Nghe hiểu', tone: 'primary', stageSkill: 'listening' },
  mixed: { label: 'Tổng hợp', tone: 'success', stageSkill: 'quiz' },
};

export function resolveLessonRole(lesson: CustomLesson): CustomLessonRole {
  if (
    lesson.role === 'vocab' ||
    lesson.role === 'kanji' ||
    lesson.role === 'grammar' ||
    lesson.role === 'reading' ||
    lesson.role === 'listening' ||
    lesson.role === 'mixed'
  ) {
    return lesson.role;
  }
  if (lesson.kind === 'vocab') return 'vocab';
  if (lesson.kind === 'kanji') return 'kanji';
  if (lesson.kind === 'grammar') return 'grammar';
  return 'mixed';
}

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

export interface CustomQuizEntry {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  /** Japanese audio script read aloud via TTS (especially for Listening role). */
  speakText?: string;
  /** Optional uploaded audio clip (Data URL, e.g. mp3/m4a/wav). */
  audioDataUrl?: string;
  audioFileName?: string;
}

export interface CustomLesson {
  id: string;
  kind: CustomLessonKind;
  /** Skill/topic role attached to a custom Quiz or Lesson (e.g. Từ vựng, Chữ Hán, Ngữ pháp...). */
  role?: CustomLessonRole;
  title: string;
  level: JLPTLevel;
  description?: string;
  vocabItems?: CustomVocabEntry[];
  grammarItems?: CustomGrammarEntry[];
  kanjiItems?: CustomKanjiEntry[];
  quizItems?: CustomQuizEntry[];
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
  /** id → time it was deleted, so another device's old copy does not bring it back */
  deleted?: Record<string, number>;
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
          (l.kind === 'vocab' ||
            l.kind === 'grammar' ||
            l.kind === 'kanji' ||
            l.kind === 'quiz'),
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
    deleted: sanitizeDeleted(obj.deleted),
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : new Date().toISOString(),
  };
}

function sanitizeDeleted(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter((e): e is [string, number] => typeof e[1] === 'number'),
  );
}

/** Both copies' items, newest version of each, minus those deleted after their last edit. */
function mergeItems<T extends { id: string; updatedAt: string }>(
  first: T[],
  second: T[],
  deleted: Record<string, number>,
): T[] {
  const byId = new Map(first.map((item) => [item.id, item]));
  for (const item of second) {
    const existing = byId.get(item.id);
    if (!existing || (Date.parse(item.updatedAt) || 0) > (Date.parse(existing.updatedAt) || 0)) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values()).filter(
    (item) => !deleted[item.id] || (Date.parse(item.updatedAt) || 0) > deleted[item.id],
  );
}

export function mergeStudioStates(a: CustomStudioState, b: CustomStudioState): CustomStudioState {
  const [newer, older] = (Date.parse(b.updatedAt) || 0) > (Date.parse(a.updatedAt) || 0) ? [b, a] : [a, b];
  const deleted: Record<string, number> = { ...older.deleted };
  for (const [id, at] of Object.entries(newer.deleted ?? {})) {
    deleted[id] = Math.max(at, deleted[id] ?? 0);
  }
  return {
    lessons: mergeItems(newer.lessons, older.lessons, deleted),
    visualRoadmaps: mergeItems(newer.visualRoadmaps, older.visualRoadmaps, deleted),
    deleted,
    updatedAt: newer.updatedAt,
  };
}

/** Records what this save removes; an item added again counts as edited now. */
function withDeletions(previous: CustomStudioState, next: CustomStudioState): CustomStudioState {
  const now = Date.now();
  const deleted: Record<string, number> = { ...previous.deleted, ...next.deleted };
  const apply = <T extends { id: string; updatedAt: string }>(before: T[], after: T[]): T[] => {
    const kept = new Set(after.map((i) => i.id));
    for (const item of before) if (!kept.has(item.id)) deleted[item.id] = now;
    const had = new Set(before.map((i) => i.id));
    return after.map((item) =>
      !had.has(item.id) && deleted[item.id]
        ? { ...item, updatedAt: new Date(Math.max(now, deleted[item.id] + 1)).toISOString() }
        : item,
    );
  };
  return {
    ...next,
    lessons: apply(previous.lessons, next.lessons),
    visualRoadmaps: apply(previous.visualRoadmaps, next.visualRoadmaps),
    deleted,
  };
}

let studioUploadQueue: Promise<void> = Promise.resolve();

/** Reads the account copy first, so one device never overwrites another's lessons. */
function uploadCustomStudio(userId: string): void {
  const client = supabase;
  if (!client || !isSupabaseAccountUuid(userId)) return;
  studioUploadQueue = studioUploadQueue
    .then(async () => {
      const { data, error } = await client
        .from('user_progress')
        .select('metadata_json')
        .eq('user_id', userId)
        .eq('item_type', 'mistake')
        .eq('item_id', USER_CUSTOM_STUDIO_ITEM_ID)
        .maybeSingle();
      if (error) return;
      const meta = (data?.metadata_json ?? null) as { studio?: unknown } | null;
      const remote = meta?.studio ? sanitizeStudioState(meta.studio) : null;
      const local = loadCustomStudioState(userId);
      const merged = remote ? mergeStudioStates(local, remote) : local;
      if (stableJson(merged) !== stableJson(local)) cacheCustomStudio(userId, merged);
      if (!remote || stableJson(merged) !== stableJson(remote)) {
        await writeCustomStudioDirectToSupabase(userId, merged as unknown as Record<string, unknown>);
      }
    })
    .catch((err: unknown) => {
      console.warn('Could not upload custom lessons:', err);
    });
}

function cacheCustomStudio(key: string, state: CustomStudioState): void {
  setInMemoryCustomStudio(key, state as unknown as Record<string, unknown>);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${STUDIO_STORAGE_PREFIX}${key}`, JSON.stringify(state));
  } catch {
    // ignore storage quota errors
  }
  window.dispatchEvent(new CustomEvent<CustomStudioState>(CUSTOM_STUDIO_SYNC_EVENT, { detail: state }));
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
    ...withDeletions(loadCustomStudioState(effectiveUid), next),
    updatedAt: new Date().toISOString(),
  };

  cacheCustomStudio(key, stamped);
  if (effectiveUid) uploadCustomStudio(effectiveUid);

  return stamped;
}

export function hydrateCustomStudioFromCloud(
  remoteRaw: Record<string, unknown> | null,
  userId?: string | null,
): CustomStudioState {
  const local = loadCustomStudioState(userId);
  const key = scopeKey(userId);
  if (!remoteRaw) {
    if (userId && (local.lessons.length > 0 || local.visualRoadmaps.length > 0)) {
      uploadCustomStudio(userId);
    }
    return local;
  }
  const remote = sanitizeStudioState(remoteRaw);
  const merged = mergeStudioStates(local, remote);
  cacheCustomStudio(key, merged);
  if (userId && stableJson(merged) !== stableJson(remote)) uploadCustomStudio(userId);
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
  const ts = Date.now();
  const n1 = `node-${ts}-1`;
  const n2 = `node-${ts}-2`;
  const n3 = `node-${ts}-3`;
  const n4 = `node-${ts}-4`;
  return {
    id: `vmap-${ts}`,
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

/**
 * Generates a ready-to-play 7-node Visual Roadmap balancing all 5 JLPT skills
 * (Vocab, Kanji, Grammar, Reading, Listening) + Dojo Mini-game + Full Test Boss.
 */
export function createFiveSkillPresetVisualRoadmap(name: string, level: JLPTLevel): VisualRoadmap {
  const now = new Date().toISOString();
  const ts = Date.now();
  const lvlLower = level.toLowerCase();
  const jlptQuery = level === 'N5' || level === 'N4' || level === 'N3' ? `?level=${level}` : '';
  const ids = Array.from({ length: 7 }, (_, idx) => `node-${ts}-5k-${idx + 1}`);

  const rawNodes: VisualRoadmapNode[] = [
    {
      id: ids[0],
      title: 'Ngày 1: Từ vựng nền & Flashcard',
      kind: 'vocab',
      xPct: 20,
      yPct: 16,
      targetPath: `/vocabulary/${lvlLower}`,
    },
    {
      id: ids[1],
      title: `Ngày 2: Kanji ${level} & Trắc nghiệm chữ Hán`,
      kind: 'kanji',
      xPct: 50,
      yPct: 16,
      targetPath: `/jlpt/kanji${jlptQuery}`,
    },
    {
      id: ids[2],
      title: 'Ngày 3: Ngữ pháp & Hái sao ★',
      kind: 'grammar',
      xPct: 80,
      yPct: 16,
      targetPath: '/grammar',
    },
    {
      id: ids[3],
      title: 'Ngày 4: Nghe hiểu hội thoại & Transcript',
      kind: 'minigame',
      xPct: 80,
      yPct: 50,
      targetPath: `/jlpt/listening${jlptQuery}`,
    },
    {
      id: ids[4],
      title:
        level === 'N5'
          ? 'Ngày 5: Đọc hiểu Đoản văn N5'
          : `Ngày 5: Đọc hiểu Đoản & Trung văn ${level}`,
      kind: 'grammar',
      xPct: 50,
      yPct: 50,
      targetPath:
        level === 'N5'
          ? `/jlpt/reading-short${jlptQuery}`
          : `/jlpt/reading-medium${jlptQuery}`,
    },
    {
      id: ids[5],
      title: 'Ngày 6: Dojo Mini-game phản xạ 5 kỹ năng',
      kind: 'minigame',
      xPct: 20,
      yPct: 50,
      targetPath: `/games?game=slash&level=${level}`,
    },
    {
      id: ids[6],
      title: `Ngày 7 (Boss): Tổng ôn & Full Test ${level}`,
      kind: 'boss',
      xPct: 50,
      yPct: 84,
      targetPath: `/jlpt/full-test${jlptQuery}`,
    },
  ];

  const nodes = autoArrangeSnakeLayout(rawNodes);
  return {
    id: `vmap-${ts}`,
    name: name.trim() || `Lộ trình Chuẩn 5 Kỹ năng · ${level}`,
    level,
    description:
      'Chu kỳ 7 ngày cân đối Từ vựng · Kanji · Ngữ pháp · Nghe hiểu · Đọc hiểu · Dojo Mini-game & Full Test.',
    nodes,
    edges: [
      { id: `edge-${ids[0]}-${ids[1]}`, fromId: ids[0], toId: ids[1] },
      { id: `edge-${ids[1]}-${ids[2]}`, fromId: ids[1], toId: ids[2] },
      { id: `edge-${ids[2]}-${ids[3]}`, fromId: ids[2], toId: ids[3] },
      { id: `edge-${ids[3]}-${ids[4]}`, fromId: ids[3], toId: ids[4] },
      { id: `edge-${ids[4]}-${ids[5]}`, fromId: ids[4], toId: ids[5] },
      { id: `edge-${ids[5]}-${ids[6]}`, fromId: ids[5], toId: ids[6] },
      // Bonus shortcut branch: mastering Grammar unlocks direct Dojo practice
      { id: `edge-${ids[2]}-${ids[5]}`, fromId: ids[2], toId: ids[5] },
    ],
    completedNodeIds: [],
    createdAt: now,
    updatedAt: now,
  };
}
