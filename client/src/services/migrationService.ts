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
import type { AuthUser } from '../store/slices/authSlice';
import type {
  AdminGrammarExample,
  AdminGrammarRecord,
  AdminJlptModuleId,
  AdminJlptRecord,
  AdminKanjiRecord,
  AdminUnitRecord,
  AdminVocabRecord,
  CmsTableName,
} from '../types/admin';
import type { KanjiItem } from '../types/kanji';
import type { JLPTLevel } from '../types/quiz';
import { getAllLoadedVocabulary } from '../utils/vocabularyHelpers';
import { supabase } from './supabaseClient';

export interface StaticDatasetCounts {
  units: number;
  vocabularies: number;
  kanjis: number;
  grammarRules: number;
  jlptQuestions: number;
  profiles?: number;
}

export interface MigrationProgressUpdate {
  completedSteps: number;
  totalSteps: number;
  currentTable: CmsTableName;
  label: string;
}

export interface MigrationResult {
  ok: boolean;
  error?: string;
  counts: StaticDatasetCounts;
}

export interface SupabaseUnitRow {
  id: string;
  level: JLPTLevel;
  unit_number: number;
  textbook_id: string | null;
  title: string;
  description: string;
  order_index: number;
  is_published: boolean;
}

const MIGRATION_BATCH_SIZE = 50;

export const toDbUnitId = (level: JLPTLevel, unitId: number, textbookId?: string): string => {
  const bookSuffix = textbookId
    ? `-${textbookId.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toUpperCase()}`
    : '';
  return `${level.toUpperCase()}${bookSuffix}-U${Math.max(1, unitId)}`;
};

export const parseDbUnitNumber = (unitKey: string | null | undefined): number => {
  if (!unitKey) return 1;
  const match = unitKey.match(/(?:-|u)(\d+)$/i);
  return match ? Math.max(1, Number(match[1])) : 1;
};

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function buildStaticUnits(): AdminUnitRecord[] {
  const unitRows: AdminUnitRecord[] = [];
  let orderCounter = 1;
  for (const [level, list] of Object.entries(UNIT_DATA)) {
    for (const u of list) {
      unitRows.push({
        id: toDbUnitId(level as JLPTLevel, u.id),
        level: level as JLPTLevel,
        unitNumber: u.id,
        textbookId:
          level === 'N5'
            ? 'minna-n5'
            : level === 'N4'
              ? 'minna-n4'
              : level === 'N3'
                ? 'mimi-n3'
                : null,
        title: u.name,
        description: u.totalWords > 0 ? `${u.totalWords} từ vựng chuẩn JLPT ${level}` : 'Sắp ra mắt',
        orderIndex: orderCounter++,
        isPublished: u.totalWords > 0,
      });
    }
  }
  return unitRows;
}

export function buildStaticVocab(): AdminVocabRecord[] {
  return getAllLoadedVocabulary().map((v) => ({
    id: v.id,
    unitId: v.unitId,
    dbUnitId: toDbUnitId(v.level, v.unitId),
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
    tags: Array.isArray(v.tags) ? v.tags : [],
    semanticRoles: Array.isArray(v.semanticRoles) ? v.semanticRoles : [],
  }));
}

export function buildStaticKanji(): AdminKanjiRecord[] {
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

export function buildStaticGrammar(): AdminGrammarRecord[] {
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
            jp: s.japanese,
            vi: s.vietnamese,
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

export function buildStaticJlpt(): AdminJlptRecord[] {
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
      prompt: l.questionPrompt,
      passage: l.situation,
      options: [...l.options],
      correctIndex: l.correctIndex,
      explanation: l.explanation,
      audioText: l.dialogue.map((line) => `${line.speaker}: ${line.plainText}`).join('\n'),
    });
  }
  return items;
}

export const mapUnitToDb = (r: AdminUnitRecord): SupabaseUnitRow => ({
  id: r.id,
  level: r.level,
  unit_number: r.unitNumber,
  textbook_id: r.textbookId ?? null,
  title: r.title,
  description: r.description ?? '',
  order_index: r.orderIndex,
  is_published: Boolean(r.isPublished),
});

export const mapUnitFromDb = (r: Record<string, unknown>): AdminUnitRecord => ({
  id: String(r.id),
  level: (r.level ?? 'N3') as JLPTLevel,
  unitNumber: Number(r.unit_number ?? parseDbUnitNumber(String(r.id))),
  textbookId: typeof r.textbook_id === 'string' ? r.textbook_id : null,
  title: String(r.title ?? ''),
  description: String(r.description ?? ''),
  orderIndex: Number(r.order_index ?? 0),
  isPublished: r.is_published !== false,
  createdAt: r.created_at ? String(r.created_at) : undefined,
});

export const mapVocabToDb = (r: AdminVocabRecord) => ({
  id: r.id,
  unit_id: r.dbUnitId || toDbUnitId(r.level, r.unitId),
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
  tags: Array.isArray(r.tags) ? r.tags : [],
  semantic_roles: Array.isArray(r.semanticRoles) ? r.semanticRoles : [],
});

export const mapVocabFromDb = (r: Record<string, unknown>): AdminVocabRecord => ({
  id: Number(r.id),
  unitId: parseDbUnitNumber(String(r.unit_id ?? '')),
  dbUnitId: String(r.unit_id ?? ''),
  level: (r.level ?? 'N3') as JLPTLevel,
  wordNumber: Number(r.word_number ?? r.id),
  kanji: r.kanji == null ? null : String(r.kanji),
  hiragana: String(r.hiragana ?? ''),
  hanViet: r.han_viet == null ? null : String(r.han_viet),
  meaning: String(r.meaning ?? ''),
  wordType: String(r.word_type ?? 'Danh từ'),
  exampleSentence: r.example_sentence == null ? null : String(r.example_sentence),
  exampleMeaning: r.example_meaning == null ? null : String(r.example_meaning),
  notes: r.notes == null ? null : String(r.notes),
  tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
  semanticRoles: Array.isArray(r.semantic_roles) ? r.semantic_roles.map(String) : [],
});

export const mapKanjiToDb = (r: AdminKanjiRecord) => ({
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

export const mapKanjiFromDb = (r: Record<string, unknown>): AdminKanjiRecord => ({
  id: String(r.id),
  kanji: String(r.character ?? r.kanji ?? r.id),
  hanViet: String(r.han_viet ?? r.hanViet ?? ''),
  meanings: Array.isArray(r.meanings) ? r.meanings.map(String) : [],
  onReadings: Array.isArray(r.onyomi)
    ? r.onyomi.map(String)
    : Array.isArray(r.onReadings)
      ? r.onReadings.map(String)
      : [],
  kunReadings: Array.isArray(r.kunyomi)
    ? r.kunyomi.map(String)
    : Array.isArray(r.kunReadings)
      ? r.kunReadings.map(String)
      : [],
  strokeCount: Number(r.stroke_count ?? r.strokeCount ?? 0),
  jlptLevel: (r.jlpt_level ?? r.jlptLevel ?? 'N3') as JLPTLevel,
  examples: Array.isArray(r.examples) ? (r.examples as AdminKanjiRecord['examples']) : [],
});

export const mapGrammarToDb = (r: AdminGrammarRecord) => ({
  id: r.id,
  book_id: r.bookId,
  chapter_id: r.chapterId,
  level: r.level,
  title: r.title,
  structure: r.structure,
  meaning: r.meaning,
  explanation: r.explanation,
  notes: r.notes,
  examples: (r.examples ?? []).map((ex) => {
    const japanese = ex.japanese || ex.jp || '';
    const vietnamese = ex.vietnamese || ex.vi || '';
    return {
      jp: japanese,
      vi: vietnamese,
      japanese,
      hiragana: ex.hiragana ?? '',
      vietnamese,
    };
  }),
});

export const mapGrammarFromDb = (r: Record<string, unknown>): AdminGrammarRecord => ({
  id: String(r.id),
  bookId: String(r.book_id ?? r.bookId ?? 'SHINKANZEN_N3'),
  chapterId: String(r.chapter_id ?? r.chapterId ?? 'L01'),
  level: (r.level ?? 'N3') as JLPTLevel,
  title: String(r.title ?? ''),
  structure: String(r.structure ?? ''),
  meaning: String(r.meaning ?? ''),
  explanation: String(r.explanation ?? ''),
  notes: String(r.notes ?? ''),
  examples: Array.isArray(r.examples)
    ? r.examples.map((raw) => {
        const ex = (raw ?? {}) as Record<string, unknown>;
        const japanese = String(ex.japanese ?? ex.jp ?? '');
        const vietnamese = String(ex.vietnamese ?? ex.vi ?? '');
        return {
          japanese,
          hiragana: String(ex.hiragana ?? ''),
          vietnamese,
          jp: japanese,
          vi: vietnamese,
        };
      })
    : [],
});

export const mapJlptToDb = (r: AdminJlptRecord) => ({
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

export const mapJlptFromDb = (r: Record<string, unknown>): AdminJlptRecord => ({
  id: String(r.id),
  moduleId: (r.module_id ?? r.moduleId ?? 'vocab') as AdminJlptModuleId,
  level: (r.level ?? 'N3') as JLPTLevel,
  questionType: (r.question_type ?? r.questionType ?? 'mcq') as AdminJlptRecord['questionType'],
  prompt: String(r.prompt ?? ''),
  passage: r.passage == null ? null : String(r.passage),
  options: Array.isArray(r.options) ? r.options.map(String) : [],
  correctIndex: Number(r.correct_index ?? r.correctIndex ?? 0),
  explanation: String(r.explanation ?? ''),
  audioText: r.audio_text == null ? (r.audioText == null ? null : String(r.audioText)) : String(r.audio_text),
});

export function getLocalStaticCounts(): StaticDatasetCounts {
  return {
    units: buildStaticUnits().length,
    vocabularies: buildStaticVocab().length,
    kanjis: buildStaticKanji().length,
    grammarRules: buildStaticGrammar().length,
    jlptQuestions: buildStaticJlpt().length,
  };
}

export async function fetchSupabaseTableCounts(): Promise<{
  ok: boolean;
  counts: StaticDatasetCounts;
  error?: string;
}> {
  const emptyCounts: StaticDatasetCounts = {
    units: 0,
    vocabularies: 0,
    kanjis: 0,
    grammarRules: 0,
    jlptQuestions: 0,
  };

  if (!supabase) {
    return { ok: false, counts: emptyCounts, error: 'Chưa cấu hình kết nối Supabase.' };
  }

  try {
    const [uRes, vRes, kRes, gRes, jRes] = await Promise.all([
      supabase.from('units').select('*', { count: 'exact', head: true }),
      supabase.from('vocabularies').select('*', { count: 'exact', head: true }),
      supabase.from('kanjis').select('*', { count: 'exact', head: true }),
      supabase.from('grammar_rules').select('*', { count: 'exact', head: true }),
      supabase.from('jlpt_questions').select('*', { count: 'exact', head: true }),
    ]);

    const firstError = uRes.error || vRes.error || kRes.error || gRes.error || jRes.error;
    if (firstError) {
      return { ok: false, counts: emptyCounts, error: firstError.message };
    }

    return {
      ok: true,
      counts: {
        units: uRes.count ?? 0,
        vocabularies: vRes.count ?? 0,
        kanjis: kRes.count ?? 0,
        grammarRules: gRes.count ?? 0,
        jlptQuestions: jRes.count ?? 0,
      },
    };
  } catch (err) {
    return {
      ok: false,
      counts: emptyCounts,
      error: err instanceof Error ? err.message : 'Không thể truy vấn số liệu từ Supabase.',
    };
  }
}

export async function fetchSupabaseProfilesCount(): Promise<number | null> {
  if (!supabase) return null;
  try {
    const res = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (res.error) return null;
    return res.count ?? 0;
  } catch {
    return null;
  }
}

const LOCAL_AUDIT_BUFFER_KEY = 'nihonmaster_local_audit_logs_v1';
const LOCAL_AUDIT_LIMIT = 50;

export function getLocalAuditLogs(): Array<{
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  detailsJson: Record<string, unknown>;
  createdAt: string;
}> {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_AUDIT_BUFFER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeAuditLog(
  actor: AuthUser | null | undefined,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  if (!actor) return;
  const createdAt = new Date().toISOString();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const next = [
        {
          id: `local-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          actorId: actor.id,
          action,
          entityType,
          entityId,
          detailsJson: details,
          createdAt,
        },
        ...getLocalAuditLogs(),
      ].slice(0, LOCAL_AUDIT_LIMIT);
      window.localStorage.setItem(LOCAL_AUDIT_BUFFER_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actor.id);
  if (!supabase || !isUuid) return;
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

interface MigrationStageSpec {
  table: CmsTableName;
  label: string;
  rows: Array<Record<string, unknown>>;
}

function buildMigrationStages(): Record<CmsTableName, MigrationStageSpec> {
  return {
    units: {
      table: 'units',
      label: 'Units bài học',
      rows: buildStaticUnits().map((u) => mapUnitToDb(u) as unknown as Record<string, unknown>),
    },
    vocabularies: {
      table: 'vocabularies',
      label: 'Từ vựng N3',
      rows: buildStaticVocab().map((r) => mapVocabToDb(r) as unknown as Record<string, unknown>),
    },
    kanjis: {
      table: 'kanjis',
      label: 'Chữ Hán (Kanji)',
      rows: buildStaticKanji().map((r) => mapKanjiToDb(r) as unknown as Record<string, unknown>),
    },
    grammar_rules: {
      table: 'grammar_rules',
      label: 'Ngữ pháp',
      rows: buildStaticGrammar().map((r) => mapGrammarToDb(r) as unknown as Record<string, unknown>),
    },
    jlpt_questions: {
      table: 'jlpt_questions',
      label: 'Câu hỏi JLPT',
      rows: buildStaticJlpt().map((r) => mapJlptToDb(r) as unknown as Record<string, unknown>),
    },
  };
}

async function runMigrationStages(params: {
  actor: AuthUser | null;
  stages: MigrationStageSpec[];
  onProgress?: (progress: MigrationProgressUpdate) => void;
}): Promise<{ ok: boolean; error?: string; syncedCounts: Record<CmsTableName, number> }> {
  const { actor, stages, onProgress } = params;
  const syncedCounts: Record<CmsTableName, number> = {
    units: 0,
    vocabularies: 0,
    kanjis: 0,
    grammar_rules: 0,
    jlpt_questions: 0,
  };

  if (!supabase) {
    return {
      ok: false,
      error: 'Chưa cấu hình kết nối Supabase Cloud (kiểm tra client/.env).',
      syncedCounts,
    };
  }

  if (actor && actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
    return {
      ok: false,
      error: 'Chỉ tài khoản ADMIN hoặc SUPER_ADMIN mới có quyền Migrate dữ liệu lên Cloud.',
      syncedCounts,
    };
  }

  const chunkedStages = stages.map((stage) => ({
    ...stage,
    chunks: chunkArray(stage.rows, MIGRATION_BATCH_SIZE),
  }));
  const totalSteps = Math.max(
    1,
    chunkedStages.reduce((sum, s) => sum + s.chunks.length, 0),
  );
  let completedSteps = 0;

  for (const stage of chunkedStages) {
    for (let idx = 0; idx < stage.chunks.length; idx += 1) {
      onProgress?.({
        completedSteps,
        totalSteps,
        currentTable: stage.table,
        label: `Đang chuyển ${stage.label} (lô ${idx + 1}/${stage.chunks.length})...`,
      });

      const { error } = await supabase
        .from(stage.table)
        .upsert(stage.chunks[idx], { onConflict: 'id' });

      if (error) {
        const isRls = error.code === '42501' || error.message.toLowerCase().includes('row-level security');
        return {
          ok: false,
          error: isRls
            ? `[${stage.table}] Bị từ chối bởi RLS: hãy đảm bảo tài khoản đang đăng nhập có role ADMIN / SUPER_ADMIN trong bảng public.profiles.`
            : `[${stage.table}] ${error.message}`,
          syncedCounts,
        };
      }

      completedSteps += 1;
      onProgress?.({
        completedSteps,
        totalSteps,
        currentTable: stage.table,
        label: `Đã chuyển ${stage.label} (lô ${idx + 1}/${stage.chunks.length})`,
      });
    }
    syncedCounts[stage.table] = stage.rows.length;
  }

  return { ok: true, syncedCounts };
}

export async function migrateSingleTableToSupabase(params: {
  table: CmsTableName;
  actor: AuthUser | null;
  onProgress?: (progress: MigrationProgressUpdate) => void;
}): Promise<{ ok: boolean; count: number; error?: string }> {
  const stageMap = buildMigrationStages();
  const stage = stageMap[params.table];
  const stages = params.table === 'vocabularies' ? [stageMap.units, stage] : [stage];
  const res = await runMigrationStages({
    actor: params.actor,
    stages,
    onProgress: params.onProgress,
  });
  if (!res.ok) {
    return { ok: false, count: 0, error: res.error };
  }
  await writeAuditLog(params.actor, 'MIGRATE_SINGLE_TABLE', params.table, params.table, {
    count: stage.rows.length,
  });
  return { ok: true, count: stage.rows.length };
}

export async function migrateAllStaticDataToSupabase(params: {
  actor: AuthUser | null;
  onProgress?: (progress: MigrationProgressUpdate) => void;
}): Promise<MigrationResult> {
  const emptyCounts: StaticDatasetCounts = {
    units: 0,
    vocabularies: 0,
    kanjis: 0,
    grammarRules: 0,
    jlptQuestions: 0,
  };
  const stageMap = buildMigrationStages();
  const res = await runMigrationStages({
    actor: params.actor,
    stages: [
      stageMap.units,
      stageMap.vocabularies,
      stageMap.kanjis,
      stageMap.grammar_rules,
      stageMap.jlpt_questions,
    ],
    onProgress: params.onProgress,
  });
  if (!res.ok) {
    return { ok: false, error: res.error, counts: emptyCounts };
  }

  const finalCounts: StaticDatasetCounts = {
    units: res.syncedCounts.units,
    vocabularies: res.syncedCounts.vocabularies,
    kanjis: res.syncedCounts.kanjis,
    grammarRules: res.syncedCounts.grammar_rules,
    jlptQuestions: res.syncedCounts.jlpt_questions,
  };

  await writeAuditLog(
    params.actor,
    'MIGRATE_ALL_STATIC_DATA',
    'database',
    'all',
    finalCounts as unknown as Record<string, unknown>,
  );

  return {
    ok: true,
    counts: finalCounts,
  };
}
