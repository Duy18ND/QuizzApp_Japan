import { grammarBooks } from '../data/grammar';
import { lesson01Sentences } from '../data/grammar/shinkanzen-n3/lesson01Sentences';
import { lesson02Sentences } from '../data/grammar/shinkanzen-n3/lesson02Sentences';
import {
  getJLPTListeningItems,
  getJLPTMcqQuestions,
  getJLPTReadingPassages,
  getJLPTStarQuestions,
} from '../data/jlpt/jlptDataset';
import kanjiDatasetRaw from '../data/kanji/kanjiDataset.json';
import { UNIT_DATA } from '../data/unitData';
import type { AuthUser, AccountRole } from '../store/slices/authSlice';
import type {
  AdminGrammarExample,
  AdminGrammarRecord,
  AdminJlptModuleId,
  AdminJlptRecord,
  AdminKanjiRecord,
  AdminVocabRecord,
  BatchExecutionSummary,
  BatchImportMode,
  CmsEntityType,
  ManagedUserProfile,
} from '../types/admin';
import type { KanjiItem } from '../types/kanji';
import type { JLPTLevel } from '../types/quiz';
import {
  validateBatchImport,
  type ExistingCmsLookup,
} from '../utils/batchImportUtils';
import { getAllLoadedVocabulary } from '../utils/vocabularyHelpers';
import { supabase } from './supabaseClient';

const CMS_STORAGE_KEY = 'nihonmaster_admin_cms_v1';
const CMS_SYNC_EVENT = 'nihonmaster:cms-sync';
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export interface CmsSnapshot extends ExistingCmsLookup {
  source: 'supabase' | 'local';
}

interface LocalCmsOverlay {
  vocabOverrides: Record<string, AdminVocabRecord>;
  vocabDeletedIds: number[];
  kanjiOverrides: Record<string, AdminKanjiRecord>;
  kanjiDeletedIds: string[];
  grammarOverrides: Record<string, AdminGrammarRecord>;
  grammarDeletedIds: string[];
  jlptOverrides: Record<string, AdminJlptRecord>;
  jlptDeletedIds: string[];
  demoUsers: ManagedUserProfile[];
}

const DEFAULT_DEMO_USERS: ManagedUserProfile[] = [
  {
    id: 'demo-super-admin',
    email: 'superadmin@nihongo.local',
    displayName: 'Trưởng nhóm nội dung',
    role: 'SUPER_ADMIN',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-admin-01',
    email: 'editor@nihongo.local',
    displayName: 'Biên tập viên N3',
    role: 'ADMIN',
    createdAt: '2026-01-05T08:30:00.000Z',
  },
  {
    id: 'demo-user-01',
    email: 'hocvien01@nihongo.local',
    displayName: 'Minh Anh',
    role: 'USER',
    createdAt: '2026-01-10T14:15:00.000Z',
  },
  {
    id: 'demo-user-02',
    email: 'hocvien02@nihongo.local',
    displayName: 'Hoàng Nam',
    role: 'USER',
    createdAt: '2026-01-12T09:45:00.000Z',
  },
];

const emptyOverlay = (): LocalCmsOverlay => ({
  vocabOverrides: {},
  vocabDeletedIds: [],
  kanjiOverrides: {},
  kanjiDeletedIds: [],
  grammarOverrides: {},
  grammarDeletedIds: [],
  jlptOverrides: {},
  jlptDeletedIds: [],
  demoUsers: [...DEFAULT_DEMO_USERS],
});

const sanitizeRecordMap = <T,>(raw: unknown): Record<string, T> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, T> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (UNSAFE_KEYS.has(k) || !v || typeof v !== 'object') continue;
    result[k] = v as T;
  }
  return result;
};

function loadLocalOverlay(): LocalCmsOverlay {
  if (typeof window === 'undefined') return emptyOverlay();
  try {
    const raw = window.localStorage.getItem(CMS_STORAGE_KEY);
    if (!raw) return emptyOverlay();
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyOverlay();
    const obj = parsed as Record<string, unknown>;
    return {
      vocabOverrides: sanitizeRecordMap<AdminVocabRecord>(obj.vocabOverrides),
      vocabDeletedIds: Array.isArray(obj.vocabDeletedIds)
        ? obj.vocabDeletedIds.filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
        : [],
      kanjiOverrides: sanitizeRecordMap<AdminKanjiRecord>(obj.kanjiOverrides),
      kanjiDeletedIds: Array.isArray(obj.kanjiDeletedIds)
        ? obj.kanjiDeletedIds.filter((s): s is string => typeof s === 'string')
        : [],
      grammarOverrides: sanitizeRecordMap<AdminGrammarRecord>(obj.grammarOverrides),
      grammarDeletedIds: Array.isArray(obj.grammarDeletedIds)
        ? obj.grammarDeletedIds.filter((s): s is string => typeof s === 'string')
        : [],
      jlptOverrides: sanitizeRecordMap<AdminJlptRecord>(obj.jlptOverrides),
      jlptDeletedIds: Array.isArray(obj.jlptDeletedIds)
        ? obj.jlptDeletedIds.filter((s): s is string => typeof s === 'string')
        : [],
      demoUsers: Array.isArray(obj.demoUsers)
        ? (obj.demoUsers as ManagedUserProfile[]).filter(
            (u) => u && typeof u.id === 'string' && typeof u.email === 'string',
          )
        : [...DEFAULT_DEMO_USERS],
    };
  } catch {
    return emptyOverlay();
  }
}

function saveLocalOverlay(overlay: LocalCmsOverlay): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(overlay));
  } catch {
    // ignore storage quota errors
  }
  window.dispatchEvent(new CustomEvent(CMS_SYNC_EVENT));
}

function buildStaticVocab(): AdminVocabRecord[] {
  return getAllLoadedVocabulary().map((v) => ({
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
  }));
}

function buildStaticKanji(): AdminKanjiRecord[] {
  return ((kanjiDatasetRaw || []) as KanjiItem[]).map((k) => ({
    id: k.id,
    kanji: k.kanji,
    hanViet: k.hanViet ?? '',
    meanings: Array.isArray(k.meanings) ? k.meanings : [],
    onReadings: Array.isArray(k.onReadings) ? k.onReadings : [],
    kunReadings: Array.isArray(k.kunReadings) ? k.kunReadings : [],
    strokeCount: typeof k.strokeCount === 'number' ? k.strokeCount : 0,
    jlptLevel: (k.jlptLevel ?? 'N3') as JLPTLevel,
    examples: Array.isArray(k.examples) ? k.examples : [],
  }));
}

function buildStaticGrammar(): AdminGrammarRecord[] {
  const allSentences = [...lesson01Sentences, ...lesson02Sentences];
  const rules: AdminGrammarRecord[] = [];
  for (const book of grammarBooks) {
    for (const ch of book.chapters) {
      for (const g of ch.grammars) {
        const examples: AdminGrammarExample[] = allSentences
          .filter((s) => s.grammarId === g.id)
          .slice(0, 5)
          .map((s) => ({
            japanese: s.japanese,
            hiragana: s.hiragana,
            vietnamese: s.vietnamese,
          }));
        const structure =
          Array.isArray(g.patterns) && g.patterns.length > 0
            ? g.patterns.map((p) => p.pattern).filter(Boolean).join(' / ')
            : g.hiragana || g.name;
        rules.push({
          id: g.id,
          bookId: g.bookId || book.id,
          chapterId: g.chapterId || ch.id,
          level: g.level,
          title: g.name,
          structure,
          meaning: g.meaning,
          explanation: g.explanation || '',
          notes: g.notes || '',
          examples,
        });
      }
    }
  }
  return rules;
}

function buildStaticJlpt(): AdminJlptRecord[] {
  const items: AdminJlptRecord[] = [];
  for (const mod of ['kanji', 'vocab', 'grammar'] as const) {
    for (const q of getJLPTMcqQuestions(mod, 'ALL')) {
      items.push({
        id: q.id,
        moduleId: q.moduleId,
        level: q.level,
        questionType: 'mcq',
        prompt: q.prompt,
        passage: null,
        options: [...q.options],
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        audioText: null,
      });
    }
  }
  for (const s of getJLPTStarQuestions('ALL')) {
    items.push({
      id: s.id,
      moduleId: 'star',
      level: s.level,
      questionType: 'star',
      prompt: `${s.prefix} ____ ____ ★ ____ ${s.suffix}`.trim(),
      passage: s.fullSentence,
      options: s.chunks.map((c) => c.text),
      correctIndex: s.starIndex,
      explanation: s.explanation,
      audioText: null,
    });
  }
  for (const rMod of ['reading-short', 'reading-medium', 'reading-long'] as const) {
    for (const passage of getJLPTReadingPassages(rMod, 'ALL')) {
      const passageText = passage.paragraphs
        .map((p) => p.segments.map((seg) => seg.text).join(''))
        .join('\n');
      for (const q of passage.questions) {
        items.push({
          id: `${passage.id}_${q.id}`,
          moduleId: passage.moduleId,
          level: passage.level,
          questionType: 'reading',
          prompt: q.prompt,
          passage: `${passage.title}\n${passageText}`,
          options: [...q.options],
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          audioText: null,
        });
      }
    }
  }
  for (const l of getJLPTListeningItems('ALL')) {
    items.push({
      id: l.id,
      moduleId: 'listening',
      level: l.level,
      questionType: 'listening',
      prompt: `${l.situation} — ${l.questionPrompt}`,
      passage: null,
      options: [...l.options],
      correctIndex: l.correctIndex,
      explanation: l.explanation,
      audioText: l.dialogue.map((line) => `${line.speaker}: ${line.plainText}`).join('\n'),
    });
  }
  return items;
}

function mergeByKey<K extends string | number, T extends object>(
  base: T[],
  keyName: keyof T,
  overrides: Record<string, T>,
  deleted: K[],
): T[] {
  const deletedSet = new Set(deleted.map(String));
  const merged = new Map<string, T>();
  for (const item of base) {
    const key = String(item[keyName]);
    if (!deletedSet.has(key)) merged.set(key, item);
  }
  for (const [k, item] of Object.entries(overrides)) {
    if (!deletedSet.has(k)) merged.set(k, item);
  }
  return Array.from(merged.values());
}

export function getCmsSnapshotSync(): CmsSnapshot {
  const overlay = loadLocalOverlay();
  return {
    source: 'local',
    vocabularies: mergeByKey<number, AdminVocabRecord>(
      buildStaticVocab(),
      'id',
      overlay.vocabOverrides,
      overlay.vocabDeletedIds,
    ),
    kanjis: mergeByKey<string, AdminKanjiRecord>(
      buildStaticKanji(),
      'id',
      overlay.kanjiOverrides,
      overlay.kanjiDeletedIds,
    ),
    grammars: mergeByKey<string, AdminGrammarRecord>(
      buildStaticGrammar(),
      'id',
      overlay.grammarOverrides,
      overlay.grammarDeletedIds,
    ),
    jlptQuestions: mergeByKey<string, AdminJlptRecord>(
      buildStaticJlpt(),
      'id',
      overlay.jlptOverrides,
      overlay.jlptDeletedIds,
    ),
  };
}

const toDbUnitId = (level: JLPTLevel, unitId: number): string =>
  `${level.toLowerCase()}-unit-${Math.max(1, unitId)}`;

const parseDbUnitNumber = (unitKey: string | null | undefined): number => {
  if (!unitKey) return 1;
  const match = unitKey.match(/-(\d+)$/);
  return match ? Math.max(1, Number(match[1])) : 1;
};

async function writeAuditLog(
  actor: AuthUser | null | undefined,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  if (!supabase || !actor) return;
  try {
    await supabase.from('audit_logs').insert({
      actor_id: actor.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details_json: details,
    });
  } catch {
    // audit log failure should not block primary workflow
  }
}

async function ensureUnitsExist(records: AdminVocabRecord[]): Promise<void> {
  if (!supabase || records.length === 0) return;
  const unitRows = new Map<string, Record<string, unknown>>();
  for (const r of records) {
    const dbUnitId = toDbUnitId(r.level, r.unitId);
    if (unitRows.has(dbUnitId)) continue;
    const meta = UNIT_DATA[r.level]?.find((u) => u.id === r.unitId);
    unitRows.set(dbUnitId, {
      id: dbUnitId,
      level: r.level,
      unit_number: r.unitId,
      title: meta?.name ?? `Unit ${r.unitId} (${r.level})`,
      description: meta ? `${meta.totalWords} từ vựng ${r.level}` : `Unit ${r.unitId}`,
      order_index: r.unitId,
      is_published: true,
    });
  }
  await supabase.from('units').upsert(Array.from(unitRows.values()), { onConflict: 'id' });
}

export async function loadCmsSnapshot(): Promise<CmsSnapshot> {
  const local = getCmsSnapshotSync();
  if (!supabase) return local;

  try {
    const [vocabRes, kanjiRes, grammarRes, jlptRes] = await Promise.all([
      supabase.from('vocabularies').select('*').order('id', { ascending: true }),
      supabase.from('kanjis').select('*').order('id', { ascending: true }),
      supabase.from('grammar_rules').select('*').order('id', { ascending: true }),
      supabase.from('jlpt_questions').select('*').order('id', { ascending: true }),
    ]);

    const hasRemoteData =
      (vocabRes.data?.length ?? 0) > 0 ||
      (kanjiRes.data?.length ?? 0) > 0 ||
      (grammarRes.data?.length ?? 0) > 0 ||
      (jlptRes.data?.length ?? 0) > 0;

    if (!hasRemoteData) return local;

    const remoteVocabs: AdminVocabRecord[] = (vocabRes.data ?? []).map((r) => ({
      id: Number(r.id),
      unitId: parseDbUnitNumber(r.unit_id),
      level: (r.level ?? 'N3') as JLPTLevel,
      wordNumber: Number(r.word_number ?? r.id),
      kanji: r.kanji ?? null,
      hiragana: String(r.hiragana ?? ''),
      hanViet: r.han_viet ?? null,
      meaning: String(r.meaning ?? ''),
      wordType: String(r.word_type ?? 'Danh từ'),
      exampleSentence: r.example_sentence ?? null,
      exampleMeaning: r.example_meaning ?? null,
      notes: r.notes ?? null,
    }));

    const remoteKanjis: AdminKanjiRecord[] = (kanjiRes.data ?? []).map((r) => ({
      id: String(r.id),
      kanji: String(r.character),
      hanViet: String(r.han_viet ?? ''),
      meanings: Array.isArray(r.meanings) ? r.meanings.map(String) : [],
      onReadings: Array.isArray(r.onyomi) ? r.onyomi.map(String) : [],
      kunReadings: Array.isArray(r.kunyomi) ? r.kunyomi.map(String) : [],
      strokeCount: Number(r.stroke_count ?? 0),
      jlptLevel: (r.jlpt_level ?? 'N3') as JLPTLevel,
      examples: Array.isArray(r.examples) ? (r.examples as AdminKanjiRecord['examples']) : [],
    }));

    const remoteGrammars: AdminGrammarRecord[] = (grammarRes.data ?? []).map((r) => ({
      id: String(r.id),
      bookId: String(r.book_id ?? 'SHINKANZEN_N3'),
      chapterId: String(r.chapter_id ?? 'L01'),
      level: (r.level ?? 'N3') as JLPTLevel,
      title: String(r.title ?? ''),
      structure: String(r.structure ?? ''),
      meaning: String(r.meaning ?? ''),
      explanation: String(r.explanation ?? ''),
      notes: String(r.notes ?? ''),
      examples: Array.isArray(r.examples) ? (r.examples as AdminGrammarExample[]) : [],
    }));

    const remoteJlpt: AdminJlptRecord[] = (jlptRes.data ?? []).map((r) => ({
      id: String(r.id),
      moduleId: (r.module_id ?? 'vocab') as AdminJlptModuleId,
      level: (r.level ?? 'N3') as JLPTLevel,
      questionType: (r.question_type ?? 'mcq') as AdminJlptRecord['questionType'],
      prompt: String(r.prompt ?? ''),
      passage: r.passage ?? null,
      options: Array.isArray(r.options) ? r.options.map(String) : [],
      correctIndex: Number(r.correct_index ?? 0),
      explanation: String(r.explanation ?? ''),
      audioText: r.audio_text ?? null,
    }));

    return {
      source: 'supabase',
      vocabularies: remoteVocabs.length > 0 ? remoteVocabs : local.vocabularies,
      kanjis: remoteKanjis.length > 0 ? remoteKanjis : local.kanjis,
      grammars: remoteGrammars.length > 0 ? remoteGrammars : local.grammars,
      jlptQuestions: remoteJlpt.length > 0 ? remoteJlpt : local.jlptQuestions,
    };
  } catch {
    return local;
  }
}

const mapVocabToDb = (r: AdminVocabRecord) => ({
  id: r.id,
  unit_id: toDbUnitId(r.level, r.unitId),
  word_number: r.wordNumber,
  kanji: r.kanji,
  hiragana: r.hiragana,
  han_viet: r.hanViet,
  meaning: r.meaning,
  word_type: r.wordType,
  example_sentence: r.exampleSentence,
  example_meaning: r.exampleMeaning,
  notes: r.notes,
  level: r.level,
});

const mapKanjiToDb = (r: AdminKanjiRecord) => ({
  id: r.id,
  character: r.kanji,
  han_viet: r.hanViet,
  meanings: r.meanings,
  onyomi: r.onReadings,
  kunyomi: r.kunReadings,
  stroke_count: r.strokeCount,
  jlpt_level: r.jlptLevel,
  examples: r.examples,
});

const mapGrammarToDb = (r: AdminGrammarRecord) => ({
  id: r.id,
  book_id: r.bookId,
  chapter_id: r.chapterId,
  level: r.level,
  title: r.title,
  structure: r.structure,
  meaning: r.meaning,
  explanation: r.explanation,
  notes: r.notes,
  examples: r.examples,
});

const mapJlptToDb = (r: AdminJlptRecord) => ({
  id: r.id,
  module_id: r.moduleId,
  level: r.level,
  question_type: r.questionType,
  prompt: r.prompt,
  passage: r.passage,
  options: r.options,
  correct_index: r.correctIndex,
  explanation: r.explanation,
  audio_text: r.audioText,
});

export async function saveVocabItem(
  record: AdminVocabRecord,
  actor: AuthUser | null,
): Promise<{ ok: boolean; error?: string }> {
  if (supabase && actor) {
    await ensureUnitsExist([record]);
    const { error } = await supabase
      .from('vocabularies')
      .upsert(mapVocabToDb(record), { onConflict: 'id' });
    if (error) return { ok: false, error: error.message };
    await writeAuditLog(actor, 'UPSERT_VOCAB', 'vocabulary', String(record.id), {
      hiragana: record.hiragana,
      level: record.level,
    });
  }

  const overlay = loadLocalOverlay();
  overlay.vocabOverrides[String(record.id)] = record;
  overlay.vocabDeletedIds = overlay.vocabDeletedIds.filter((id) => id !== record.id);
  saveLocalOverlay(overlay);
  return { ok: true };
}

export async function deleteVocabItem(
  id: number,
  actor: AuthUser | null,
): Promise<{ ok: boolean; error?: string }> {
  if (supabase && actor) {
    const { error } = await supabase.from('vocabularies').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    await writeAuditLog(actor, 'DELETE_VOCAB', 'vocabulary', String(id));
  }

  const overlay = loadLocalOverlay();
  delete overlay.vocabOverrides[String(id)];
  if (!overlay.vocabDeletedIds.includes(id)) overlay.vocabDeletedIds.push(id);
  saveLocalOverlay(overlay);
  return { ok: true };
}

export async function saveKanjiItem(
  record: AdminKanjiRecord,
  actor: AuthUser | null,
): Promise<{ ok: boolean; error?: string }> {
  if (supabase && actor) {
    const { error } = await supabase.from('kanjis').upsert(mapKanjiToDb(record), { onConflict: 'id' });
    if (error) return { ok: false, error: error.message };
    await writeAuditLog(actor, 'UPSERT_KANJI', 'kanji', record.id, { kanji: record.kanji });
  }

  const overlay = loadLocalOverlay();
  overlay.kanjiOverrides[record.id] = record;
  overlay.kanjiDeletedIds = overlay.kanjiDeletedIds.filter((id) => id !== record.id);
  saveLocalOverlay(overlay);
  return { ok: true };
}

export async function deleteKanjiItem(
  id: string,
  actor: AuthUser | null,
): Promise<{ ok: boolean; error?: string }> {
  if (supabase && actor) {
    const { error } = await supabase.from('kanjis').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    await writeAuditLog(actor, 'DELETE_KANJI', 'kanji', id);
  }

  const overlay = loadLocalOverlay();
  delete overlay.kanjiOverrides[id];
  if (!overlay.kanjiDeletedIds.includes(id)) overlay.kanjiDeletedIds.push(id);
  saveLocalOverlay(overlay);
  return { ok: true };
}

export async function saveGrammarRule(
  record: AdminGrammarRecord,
  actor: AuthUser | null,
): Promise<{ ok: boolean; error?: string }> {
  if (supabase && actor) {
    const { error } = await supabase
      .from('grammar_rules')
      .upsert(mapGrammarToDb(record), { onConflict: 'id' });
    if (error) return { ok: false, error: error.message };
    await writeAuditLog(actor, 'UPSERT_GRAMMAR', 'grammar_rule', record.id, {
      title: record.title,
    });
  }

  const overlay = loadLocalOverlay();
  overlay.grammarOverrides[record.id] = record;
  overlay.grammarDeletedIds = overlay.grammarDeletedIds.filter((id) => id !== record.id);
  saveLocalOverlay(overlay);
  return { ok: true };
}

export async function deleteGrammarRule(
  id: string,
  actor: AuthUser | null,
): Promise<{ ok: boolean; error?: string }> {
  if (supabase && actor) {
    const { error } = await supabase.from('grammar_rules').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    await writeAuditLog(actor, 'DELETE_GRAMMAR', 'grammar_rule', id);
  }

  const overlay = loadLocalOverlay();
  delete overlay.grammarOverrides[id];
  if (!overlay.grammarDeletedIds.includes(id)) overlay.grammarDeletedIds.push(id);
  saveLocalOverlay(overlay);
  return { ok: true };
}

export async function saveJlptQuestion(
  record: AdminJlptRecord,
  actor: AuthUser | null,
): Promise<{ ok: boolean; error?: string }> {
  if (supabase && actor) {
    const { error } = await supabase
      .from('jlpt_questions')
      .upsert(mapJlptToDb(record), { onConflict: 'id' });
    if (error) return { ok: false, error: error.message };
    await writeAuditLog(actor, 'UPSERT_JLPT', 'jlpt_question', record.id, {
      moduleId: record.moduleId,
    });
  }

  const overlay = loadLocalOverlay();
  overlay.jlptOverrides[record.id] = record;
  overlay.jlptDeletedIds = overlay.jlptDeletedIds.filter((id) => id !== record.id);
  saveLocalOverlay(overlay);
  return { ok: true };
}

export async function deleteJlptQuestion(
  id: string,
  actor: AuthUser | null,
): Promise<{ ok: boolean; error?: string }> {
  if (supabase && actor) {
    const { error } = await supabase.from('jlpt_questions').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    await writeAuditLog(actor, 'DELETE_JLPT', 'jlpt_question', id);
  }

  const overlay = loadLocalOverlay();
  delete overlay.jlptOverrides[id];
  if (!overlay.jlptDeletedIds.includes(id)) overlay.jlptDeletedIds.push(id);
  saveLocalOverlay(overlay);
  return { ok: true };
}

export async function executeBatchImport(params: {
  rawText: string;
  entityType: CmsEntityType;
  mode: BatchImportMode;
  existing: ExistingCmsLookup;
  actor: AuthUser | null;
  formatHint?: 'auto' | 'json' | 'csv';
}): Promise<BatchExecutionSummary> {
  const { rawText, entityType, mode, existing, actor, formatHint = 'auto' } = params;
  const storage: 'supabase' | 'local' = supabase ? 'supabase' : 'local';
  const report = validateBatchImport(rawText, entityType, existing, formatHint);

  if (report.parseError) {
    return {
      aborted: true,
      abortReason: report.parseError,
      mode,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: report.counts.total,
      storage,
    };
  }

  if (mode === 'all_or_nothing' && report.counts.invalid > 0) {
    return {
      aborted: true,
      abortReason: `Validate All-or-Nothing: đã hủy toàn bộ lô vì phát hiện ${report.counts.invalid} dòng lỗi.`,
      mode,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: report.counts.invalid,
      storage,
    };
  }

  const toInsert = report.rows
    .filter((r) => r.status === 'valid' && r.normalized !== null)
    .map((r) => r.normalized!);
  const toUpdate =
    mode === 'upsert'
      ? report.rows
          .filter((r) => r.status === 'duplicate' && r.normalized !== null)
          .map((r) => r.normalized!)
      : [];

  const commitBatch = [...toInsert, ...toUpdate];

  if (supabase && actor && commitBatch.length > 0) {
    if (entityType === 'vocabulary') {
      const vocabRows = commitBatch as AdminVocabRecord[];
      await ensureUnitsExist(vocabRows);
      const { error } = await supabase
        .from('vocabularies')
        .upsert(vocabRows.map(mapVocabToDb), { onConflict: 'id' });
      if (error) {
        return {
          aborted: true,
          abortReason: `Supabase rollback batch: ${error.message}`,
          mode,
          inserted: 0,
          updated: 0,
          skipped: 0,
          failed: commitBatch.length,
          storage,
        };
      }
    } else if (entityType === 'kanji') {
      const kanjiRows = commitBatch as AdminKanjiRecord[];
      const { error } = await supabase
        .from('kanjis')
        .upsert(kanjiRows.map(mapKanjiToDb), { onConflict: 'id' });
      if (error) {
        return {
          aborted: true,
          abortReason: `Supabase rollback batch: ${error.message}`,
          mode,
          inserted: 0,
          updated: 0,
          skipped: 0,
          failed: commitBatch.length,
          storage,
        };
      }
    } else if (entityType === 'grammar') {
      const grammarRows = commitBatch as AdminGrammarRecord[];
      const { error } = await supabase
        .from('grammar_rules')
        .upsert(grammarRows.map(mapGrammarToDb), { onConflict: 'id' });
      if (error) {
        return {
          aborted: true,
          abortReason: `Supabase rollback batch: ${error.message}`,
          mode,
          inserted: 0,
          updated: 0,
          skipped: 0,
          failed: commitBatch.length,
          storage,
        };
      }
    } else {
      const jlptRows = commitBatch as AdminJlptRecord[];
      const { error } = await supabase
        .from('jlpt_questions')
        .upsert(jlptRows.map(mapJlptToDb), { onConflict: 'id' });
      if (error) {
        return {
          aborted: true,
          abortReason: `Supabase rollback batch: ${error.message}`,
          mode,
          inserted: 0,
          updated: 0,
          skipped: 0,
          failed: commitBatch.length,
          storage,
        };
      }
    }

    await writeAuditLog(actor, 'BATCH_IMPORT', entityType, `batch-${Date.now()}`, {
      mode,
      inserted: toInsert.length,
      updated: toUpdate.length,
      skipped: mode === 'upsert' ? 0 : report.counts.duplicate,
    });
  }

  // Commit cleanly into Local CMS store (atomic array commit after remote success)
  const overlay = loadLocalOverlay();
  if (entityType === 'vocabulary') {
    for (const item of commitBatch as AdminVocabRecord[]) {
      overlay.vocabOverrides[String(item.id)] = item;
      overlay.vocabDeletedIds = overlay.vocabDeletedIds.filter((id) => id !== item.id);
    }
  } else if (entityType === 'kanji') {
    for (const item of commitBatch as AdminKanjiRecord[]) {
      overlay.kanjiOverrides[item.id] = item;
      overlay.kanjiDeletedIds = overlay.kanjiDeletedIds.filter((id) => id !== item.id);
    }
  } else if (entityType === 'grammar') {
    for (const item of commitBatch as AdminGrammarRecord[]) {
      overlay.grammarOverrides[item.id] = item;
      overlay.grammarDeletedIds = overlay.grammarDeletedIds.filter((id) => id !== item.id);
    }
  } else {
    for (const item of commitBatch as AdminJlptRecord[]) {
      overlay.jlptOverrides[item.id] = item;
      overlay.jlptDeletedIds = overlay.jlptDeletedIds.filter((id) => id !== item.id);
    }
  }
  saveLocalOverlay(overlay);

  return {
    aborted: false,
    mode,
    inserted: toInsert.length,
    updated: toUpdate.length,
    skipped: mode === 'upsert' ? 0 : report.counts.duplicate,
    failed: report.counts.invalid,
    storage,
  };
}

export async function fetchManagedUsers(actor: AuthUser | null): Promise<{
  ok: boolean;
  users: ManagedUserProfile[];
  source: 'supabase' | 'local';
  error?: string;
}> {
  if (!actor || actor.role !== 'SUPER_ADMIN') {
    return {
      ok: false,
      users: [],
      source: supabase ? 'supabase' : 'local',
      error: 'Forbidden: chỉ tài khoản SUPER_ADMIN mới được xem danh sách phân quyền người dùng.',
    };
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, role, created_at')
      .order('created_at', { ascending: true });

    if (error) {
      return { ok: false, users: [], source: 'supabase', error: error.message };
    }

    const users: ManagedUserProfile[] = (data ?? []).map((row) => ({
      id: String(row.id),
      email: String(row.email ?? ''),
      displayName: String(row.display_name || String(row.email ?? '').split('@')[0] || 'Học viên'),
      role: (row.role === 'SUPER_ADMIN' || row.role === 'ADMIN' ? row.role : 'USER') as AccountRole,
      createdAt: String(row.created_at ?? new Date().toISOString()),
    }));

    return { ok: true, users, source: 'supabase' };
  }

  const overlay = loadLocalOverlay();
  const list = [...overlay.demoUsers];
  if (!list.some((u) => u.id === actor.id || u.email === actor.email)) {
    list.unshift({
      id: actor.id,
      email: actor.email,
      displayName: actor.displayName,
      role: actor.role,
      createdAt: new Date().toISOString(),
    });
  }
  return { ok: true, users: list, source: 'local' };
}

export async function updateManagedUserRole(params: {
  actor: AuthUser | null;
  targetUserId: string;
  nextRole: Extract<AccountRole, 'ADMIN' | 'USER'>;
  currentUsers: ManagedUserProfile[];
}): Promise<{ ok: boolean; error?: string; users?: ManagedUserProfile[] }> {
  const { actor, targetUserId, nextRole, currentUsers } = params;

  if (!actor || actor.role !== 'SUPER_ADMIN') {
    return {
      ok: false,
      error: 'Forbidden: chỉ tài khoản SUPER_ADMIN mới có quyền cấp hoặc thu hồi quyền ADMIN.',
    };
  }

  if (targetUserId === actor.id) {
    return {
      ok: false,
      error: 'Khóa an toàn: SUPER_ADMIN không thể tự thay đổi hoặc tự hạ quyền của chính mình.',
    };
  }

  const targetUser = currentUsers.find((u) => u.id === targetUserId);
  if (!targetUser) {
    return { ok: false, error: 'Không tìm thấy tài khoản mục tiêu.' };
  }

  if (targetUser.role === 'SUPER_ADMIN') {
    const superAdminCount = currentUsers.filter((u) => u.role === 'SUPER_ADMIN').length;
    if (superAdminCount <= 1) {
      return {
        ok: false,
        error: 'Khóa an toàn: không thể hạ quyền SUPER_ADMIN cuối cùng của hệ thống.',
      };
    }
  }

  if (supabase) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: nextRole })
      .eq('id', targetUserId);

    if (error) {
      return { ok: false, error: error.message };
    }
    await writeAuditLog(actor, 'UPDATE_USER_ROLE', 'profile', targetUserId, {
      previousRole: targetUser.role,
      nextRole,
    });
    const refreshed = await fetchManagedUsers(actor);
    return { ok: true, users: refreshed.users };
  }

  const overlay = loadLocalOverlay();
  const baseList =
    overlay.demoUsers.length > 0 ? overlay.demoUsers : [...DEFAULT_DEMO_USERS];
  const updated = baseList.map((u) =>
    u.id === targetUserId ? { ...u, role: nextRole } : u,
  );
  overlay.demoUsers = updated;
  saveLocalOverlay(overlay);
  return { ok: true, users: updated };
}
