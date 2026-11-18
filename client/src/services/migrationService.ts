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
  AdminJlptRecord,
  AdminKanjiRecord,
  AdminVocabRecord,
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
}

export interface MigrationProgressUpdate {
  completedSteps: number;
  totalSteps: number;
  currentTable: 'units' | 'vocabularies' | 'kanjis' | 'grammar_rules' | 'jlpt_questions';
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
  title: string;
  description: string;
  order_index: number;
  is_published: boolean;
}

const MIGRATION_BATCH_SIZE = 50;

export const toDbUnitId = (level: JLPTLevel, unitId: number): string =>
  `${level.toLowerCase()}-unit-${Math.max(1, unitId)}`;

export const parseDbUnitNumber = (unitKey: string | null | undefined): number => {
  if (!unitKey) return 1;
  const match = unitKey.match(/-(\d+)$/);
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

export function buildStaticUnits(): SupabaseUnitRow[] {
  const unitRows: SupabaseUnitRow[] = [];
  let orderCounter = 1;
  for (const [level, list] of Object.entries(UNIT_DATA)) {
    for (const u of list) {
      unitRows.push({
        id: toDbUnitId(level as JLPTLevel, u.id),
        level: level as JLPTLevel,
        unit_number: u.id,
        title: u.name,
        description: u.totalWords > 0 ? `${u.totalWords} từ vựng chuẩn JLPT ${level}` : 'Sắp ra mắt',
        order_index: orderCounter++,
        is_published: u.totalWords > 0,
      });
    }
  }
  return unitRows;
}

export function buildStaticVocab(): Array<
  AdminVocabRecord & { tags?: string[]; semanticRoles?: string[] }
> {
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
    tags: v.tags,
    semanticRoles: v.semanticRoles,
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

export const mapVocabToDb = (
  r: AdminVocabRecord & { tags?: string[]; semanticRoles?: string[] },
) => ({
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
  tags: Array.isArray(r.tags) ? r.tags : [],
  semantic_roles: Array.isArray(r.semanticRoles) ? r.semanticRoles : [],
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
  examples: r.examples,
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

export async function writeAuditLog(
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

export async function migrateAllStaticDataToSupabase(params: {
  actor: AuthUser | null;
  onProgress?: (progress: MigrationProgressUpdate) => void;
}): Promise<MigrationResult> {
  const { actor, onProgress } = params;

  const emptyCounts: StaticDatasetCounts = {
    units: 0,
    vocabularies: 0,
    kanjis: 0,
    grammarRules: 0,
    jlptQuestions: 0,
  };

  if (!supabase) {
    return {
      ok: false,
      error: 'Chưa cấu hình kết nối Supabase Cloud (kiểm tra client/.env).',
      counts: emptyCounts,
    };
  }

  if (actor && actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
    return {
      ok: false,
      error: 'Chỉ tài khoản ADMIN hoặc SUPER_ADMIN mới có quyền Migrate dữ liệu lên Cloud.',
      counts: emptyCounts,
    };
  }

  const unitRows = buildStaticUnits();
  const vocabRows = buildStaticVocab().map((r) => mapVocabToDb(r));
  const kanjiRows = buildStaticKanji().map((r) => mapKanjiToDb(r));
  const grammarRows = buildStaticGrammar().map((r) => mapGrammarToDb(r));
  const jlptRows = buildStaticJlpt().map((r) => mapJlptToDb(r));

  const stages: Array<{
    table: MigrationProgressUpdate['currentTable'];
    label: string;
    chunks: Array<Array<Record<string, unknown>>>;
  }> = [
    {
      table: 'units',
      label: 'Units bài học',
      chunks: chunkArray(unitRows as unknown as Array<Record<string, unknown>>, MIGRATION_BATCH_SIZE),
    },
    {
      table: 'vocabularies',
      label: 'Từ vựng N3',
      chunks: chunkArray(vocabRows, MIGRATION_BATCH_SIZE),
    },
    {
      table: 'kanjis',
      label: 'Chữ Hán (Kanji)',
      chunks: chunkArray(kanjiRows as unknown as Array<Record<string, unknown>>, MIGRATION_BATCH_SIZE),
    },
    {
      table: 'grammar_rules',
      label: 'Ngữ pháp',
      chunks: chunkArray(grammarRows as unknown as Array<Record<string, unknown>>, MIGRATION_BATCH_SIZE),
    },
    {
      table: 'jlpt_questions',
      label: 'Câu hỏi JLPT',
      chunks: chunkArray(jlptRows as unknown as Array<Record<string, unknown>>, MIGRATION_BATCH_SIZE),
    },
  ];

  const totalSteps = Math.max(
    1,
    stages.reduce((sum, s) => sum + s.chunks.length, 0),
  );
  let completedSteps = 0;

  for (const stage of stages) {
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
          counts: emptyCounts,
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
  }

  const finalCounts: StaticDatasetCounts = {
    units: unitRows.length,
    vocabularies: vocabRows.length,
    kanjis: kanjiRows.length,
    grammarRules: grammarRows.length,
    jlptQuestions: jlptRows.length,
  };

  await writeAuditLog(
    actor,
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
