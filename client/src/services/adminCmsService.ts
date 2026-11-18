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
import type { JLPTLevel } from '../types/quiz';
import {
  validateBatchImport,
  type ExistingCmsLookup,
} from '../utils/batchImportUtils';
import {
  buildStaticGrammar,
  buildStaticJlpt,
  buildStaticKanji,
  buildStaticVocab,
  mapGrammarToDb,
  mapJlptToDb,
  mapKanjiToDb,
  mapVocabToDb,
  migrateAllStaticDataToSupabase,
  parseDbUnitNumber,
  toDbUnitId,
  writeAuditLog,
  type MigrationProgressUpdate,
  type MigrationResult,
} from './migrationService';
import { supabase } from './supabaseClient';

const CMS_STORAGE_KEY = 'nihonmaster_admin_cms_v1';
const CMS_SYNC_EVENT = 'nihonmaster:cms-sync';
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export interface CmsSnapshot extends ExistingCmsLookup {
  source: 'supabase' | 'local';
  remoteError?: string;
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

async function ensureUnitsExist(records: AdminVocabRecord[]): Promise<{ ok: boolean; error?: string }> {
  if (!supabase || records.length === 0) return { ok: true };
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
  const { error } = await supabase.from('units').upsert(Array.from(unitRows.values()), { onConflict: 'id' });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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

    const queryError = vocabRes.error || kanjiRes.error || grammarRes.error || jlptRes.error;
    if (queryError) {
      return {
        ...local,
        source: 'local',
        remoteError: queryError.message,
      };
    }

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
      vocabularies: remoteVocabs,
      kanjis: remoteKanjis,
      grammars: remoteGrammars,
      jlptQuestions: remoteJlpt,
    };
  } catch (err) {
    return {
      ...local,
      source: 'local',
      remoteError: err instanceof Error ? err.message : 'Lỗi kết nối Supabase.',
    };
  }
}

export async function saveVocabItem(
  record: AdminVocabRecord,
  actor: AuthUser | null,
  options?: { isNew?: boolean },
): Promise<{ ok: boolean; error?: string; item?: AdminVocabRecord }> {
  let finalRecord = record;

  if (supabase && actor) {
    const unitRes = await ensureUnitsExist([record]);
    if (!unitRes.ok) {
      return { ok: false, error: `[units] ${unitRes.error}` };
    }

    if (options?.isNew) {
      const { data: maxRow } = await supabase
        .from('vocabularies')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      const safeId = Math.max(131, Number(maxRow?.id ?? 0) + 1, record.id);
      finalRecord = { ...record, id: safeId, wordNumber: record.wordNumber || safeId };

      const { error } = await supabase.from('vocabularies').insert(mapVocabToDb(finalRecord));
      if (error) return { ok: false, error: error.message };
      await writeAuditLog(actor, 'INSERT_VOCAB', 'vocabulary', String(finalRecord.id), {
        hiragana: finalRecord.hiragana,
        level: finalRecord.level,
      });
    } else {
      const { error } = await supabase
        .from('vocabularies')
        .update(mapVocabToDb(finalRecord))
        .eq('id', finalRecord.id);
      if (error) return { ok: false, error: error.message };
      await writeAuditLog(actor, 'UPDATE_VOCAB', 'vocabulary', String(finalRecord.id), {
        hiragana: finalRecord.hiragana,
        level: finalRecord.level,
      });
    }
  }

  const overlay = loadLocalOverlay();
  overlay.vocabOverrides[String(finalRecord.id)] = finalRecord;
  overlay.vocabDeletedIds = overlay.vocabDeletedIds.filter((id) => id !== finalRecord.id);
  saveLocalOverlay(overlay);
  return { ok: true, item: finalRecord };
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
  options?: { isNew?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  if (supabase && actor) {
    const { error } = options?.isNew
      ? await supabase.from('kanjis').insert(mapKanjiToDb(record))
      : await supabase.from('kanjis').update(mapKanjiToDb(record)).eq('id', record.id);
    if (error) return { ok: false, error: error.message };
    await writeAuditLog(
      actor,
      options?.isNew ? 'INSERT_KANJI' : 'UPDATE_KANJI',
      'kanji',
      record.id,
      { kanji: record.kanji },
    );
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
  options?: { isNew?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  if (supabase && actor) {
    const { error } = options?.isNew
      ? await supabase.from('grammar_rules').insert(mapGrammarToDb(record))
      : await supabase.from('grammar_rules').update(mapGrammarToDb(record)).eq('id', record.id);
    if (error) return { ok: false, error: error.message };
    await writeAuditLog(
      actor,
      options?.isNew ? 'INSERT_GRAMMAR' : 'UPDATE_GRAMMAR',
      'grammar_rule',
      record.id,
      { title: record.title },
    );
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
  options?: { isNew?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  if (supabase && actor) {
    const { error } = options?.isNew
      ? await supabase.from('jlpt_questions').insert(mapJlptToDb(record))
      : await supabase.from('jlpt_questions').update(mapJlptToDb(record)).eq('id', record.id);
    if (error) return { ok: false, error: error.message };
    await writeAuditLog(
      actor,
      options?.isNew ? 'INSERT_JLPT' : 'UPDATE_JLPT',
      'jlpt_question',
      record.id,
      { moduleId: record.moduleId },
    );
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
        .upsert(vocabRows.map((r) => mapVocabToDb(r)), { onConflict: 'id' });
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

export type SeedProgressUpdate = MigrationProgressUpdate;
export type SeedCloudResult = MigrationResult;

export const seedStaticDataToSupabase = migrateAllStaticDataToSupabase;

export interface CrudAutoTestStep {
  name: string;
  target: 'vocabularies' | 'kanjis';
  status: 'PASS' | 'FAIL';
  durationMs: number;
  detail: string;
}

export interface CrudAutoTestResult {
  ok: boolean;
  summary: string;
  totalDurationMs: number;
  steps: CrudAutoTestStep[];
}

export async function runAdminCrudAutoTest(actor: AuthUser | null): Promise<CrudAutoTestResult> {
  const startedAt = Date.now();
  const steps: CrudAutoTestStep[] = [];

  if (!supabase) {
    return {
      ok: false,
      summary: 'Chưa cấu hình Supabase Cloud (kiểm tra client/.env).',
      totalDurationMs: 0,
      steps: [
        {
          name: 'SUPABASE_INIT',
          target: 'vocabularies',
          status: 'FAIL',
          durationMs: 0,
          detail: 'supabase client là null (thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).',
        },
      ],
    };
  }

  if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN')) {
    return {
      ok: false,
      summary: 'Cần đăng nhập tài khoản quyền ADMIN hoặc SUPER_ADMIN để chạy E2E CRUD Test.',
      totalDurationMs: 0,
      steps: [
        {
          name: 'ROLE_CHECK',
          target: 'vocabularies',
          status: 'FAIL',
          durationMs: 0,
          detail: `Vai trò hiện tại (${actor?.role ?? 'GUEST'}) không đủ quyền ghi bảng nội dung.`,
        },
      ],
    };
  }

  const uniqueSuffix = String(Date.now()).slice(-6);
  let createdVocabId: number | null = null;
  const createdKanjiId = `__autotest_k_${uniqueSuffix}__`;
  const testKanjiChar = `試${uniqueSuffix}`;

  const runStep = async (
    name: string,
    target: 'vocabularies' | 'kanjis',
    fn: () => Promise<string>,
  ): Promise<boolean> => {
    const t0 = Date.now();
    try {
      const detail = await fn();
      steps.push({ name, target, status: 'PASS', durationMs: Date.now() - t0, detail });
      return true;
    } catch (err) {
      steps.push({
        name,
        target,
        status: 'FAIL',
        durationMs: Date.now() - t0,
        detail: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  };

  try {
    // Prepare unit FK
    const unitCheck = await ensureUnitsExist([
      {
        id: 1,
        unitId: 1,
        level: 'N3',
        wordNumber: 1,
        kanji: null,
        hiragana: 'test',
        hanViet: null,
        meaning: 'test',
        wordType: 'Danh từ',
        exampleSentence: null,
        exampleMeaning: null,
        notes: null,
      },
    ]);
    if (!unitCheck.ok) {
      steps.push({
        name: 'PREPARE_UNIT',
        target: 'vocabularies',
        status: 'FAIL',
        durationMs: Date.now() - startedAt,
        detail: unitCheck.error ?? 'Không thể chuẩn bị unit n3-unit-1.',
      });
      return {
        ok: false,
        summary: 'Auto-Test thất bại ở bước chuẩn bị Unit.',
        totalDurationMs: Date.now() - startedAt,
        steps,
      };
    }

    // Vocab: INSERT -> SELECT -> UPDATE -> DELETE
    const vInsertOk = await runStep('1. VOCAB INSERT', 'vocabularies', async () => {
      const { data: maxRow } = await supabase!
        .from('vocabularies')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      const testId = Math.max(900000, Number(maxRow?.id ?? 0) + 1);
      const { data, error } = await supabase!
        .from('vocabularies')
        .insert({
          id: testId,
          unit_id: 'n3-unit-1',
          word_number: testId,
          kanji: `自動試${uniqueSuffix}`,
          hiragana: `じどうし${uniqueSuffix}`,
          han_viet: 'TỰ ĐỘNG THÍ',
          meaning: 'AutoTest Initial Meaning',
          word_type: 'Danh từ',
          level: 'N3',
        })
        .select('id, meaning')
        .single();
      if (error) throw new Error(error.message);
      createdVocabId = Number(data.id);
      return `Inserted vocab id=${createdVocabId}`;
    });

    if (vInsertOk && createdVocabId !== null) {
      await runStep('2. VOCAB SELECT', 'vocabularies', async () => {
        const { data, error } = await supabase!
          .from('vocabularies')
          .select('id, meaning')
          .eq('id', createdVocabId!)
          .single();
        if (error) throw new Error(error.message);
        if (data.meaning !== 'AutoTest Initial Meaning') {
          throw new Error(`Sai giá trị meaning: ${data.meaning}`);
        }
        return `Selected meaning="${data.meaning}"`;
      });

      await runStep('3. VOCAB UPDATE', 'vocabularies', async () => {
        const { data, error } = await supabase!
          .from('vocabularies')
          .update({ meaning: 'AutoTest Updated Meaning' })
          .eq('id', createdVocabId!)
          .select('meaning')
          .single();
        if (error) throw new Error(error.message);
        if (data.meaning !== 'AutoTest Updated Meaning') {
          throw new Error(`Update không phản ánh: ${data.meaning}`);
        }
        return `Updated meaning="${data.meaning}"`;
      });

      await runStep('4. VOCAB DELETE', 'vocabularies', async () => {
        const { error } = await supabase!.from('vocabularies').delete().eq('id', createdVocabId!);
        if (error) throw new Error(error.message);
        const { data: verifyGone } = await supabase!
          .from('vocabularies')
          .select('id')
          .eq('id', createdVocabId!)
          .maybeSingle();
        if (verifyGone) throw new Error('Row vẫn tồn tại sau khi xóa.');
        const deletedId = createdVocabId;
        createdVocabId = null;
        return `Deleted & verified gone (id=${deletedId})`;
      });
    }

    // Kanji: INSERT -> SELECT -> UPDATE -> DELETE
    const kInsertOk = await runStep('5. KANJI INSERT', 'kanjis', async () => {
      const { data, error } = await supabase!
        .from('kanjis')
        .insert({
          id: createdKanjiId,
          character: testKanjiChar,
          han_viet: 'THÍ TEST',
          meanings: ['Kiểm thử ban đầu'],
          onyomi: ['シ'],
          kunyomi: ['ため.す'],
          stroke_count: 13,
          jlpt_level: 'N3',
          examples: [],
        })
        .select('id, character')
        .single();
      if (error) throw new Error(error.message);
      return `Inserted kanji id=${data.id} (${data.character})`;
    });

    if (kInsertOk) {
      await runStep('6. KANJI SELECT', 'kanjis', async () => {
        const { data, error } = await supabase!
          .from('kanjis')
          .select('id, han_viet')
          .eq('id', createdKanjiId)
          .single();
        if (error) throw new Error(error.message);
        return `Selected han_viet="${data.han_viet}"`;
      });

      await runStep('7. KANJI UPDATE', 'kanjis', async () => {
        const { data, error } = await supabase!
          .from('kanjis')
          .update({ han_viet: 'ĐÃ CẬP NHẬT', meanings: ['Kiểm thử sau cập nhật'] })
          .eq('id', createdKanjiId)
          .select('han_viet')
          .single();
        if (error) throw new Error(error.message);
        if (data.han_viet !== 'ĐÃ CẬP NHẬT') throw new Error('Update Kanji không khớp.');
        return `Updated han_viet="${data.han_viet}"`;
      });

      await runStep('8. KANJI DELETE', 'kanjis', async () => {
        const { error } = await supabase!.from('kanjis').delete().eq('id', createdKanjiId);
        if (error) throw new Error(error.message);
        const { data: verifyGone } = await supabase!
          .from('kanjis')
          .select('id')
          .eq('id', createdKanjiId)
          .maybeSingle();
        if (verifyGone) throw new Error('Kanji vẫn tồn tại sau khi xóa.');
        return `Deleted & verified gone (id=${createdKanjiId})`;
      });
    }
  } finally {
    if (createdVocabId !== null && supabase) {
      await supabase.from('vocabularies').delete().eq('id', createdVocabId);
    }
    if (supabase) {
      await supabase.from('kanjis').delete().eq('id', createdKanjiId);
    }
  }

  const passed = steps.filter((s) => s.status === 'PASS').length;
  const totalDurationMs = Date.now() - startedAt;
  const allPassed = passed === steps.length && steps.length > 0;

  return {
    ok: allPassed,
    summary: allPassed
      ? `Tất cả ${passed}/${steps.length} bước CRUD Supabase (INSERT → SELECT → UPDATE → DELETE) đều PASS trong ${totalDurationMs}ms!`
      : `${passed}/${steps.length} bước PASS (${steps.length - passed} bước FAIL). Kiểm tra RLS hoặc kết nối Supabase.`,
    totalDurationMs,
    steps,
  };
}
