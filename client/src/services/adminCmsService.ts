import { UNIT_DATA } from '../data/unitData';
import type { AuthUser, AccountRole } from '../store/slices/authSlice';
import type {
  AccountProviderSummary,
  AdminGrammarRecord,
  AdminJlptRecord,
  AdminKanjiRecord,
  AdminUnitRecord,
  AdminVocabRecord,
  AuditLogRecord,
  BatchExecutionSummary,
  BatchImportMode,
  CmsEntityType,
  CmsTableName,
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
  buildStaticUnits,
  buildStaticVocab,
  getLocalAuditLogs,
  mapGrammarFromDb,
  mapGrammarToDb,
  mapJlptFromDb,
  mapJlptToDb,
  mapKanjiFromDb,
  mapKanjiToDb,
  mapUnitFromDb,
  mapUnitToDb,
  mapVocabFromDb,
  mapVocabToDb,
  migrateAllStaticDataToSupabase,
  toDbUnitId,
  writeAuditLog,
  type MigrationProgressUpdate,
  type MigrationResult,
} from './migrationService';
import { supabase } from './supabaseClient';

export const CMS_STORAGE_KEY = 'nihonmaster_admin_cms_v1';
export const CMS_SYNC_EVENT = 'nihonmaster:cms-sync';
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const canWriteCloud = (actor: AuthUser | null): boolean => Boolean(supabase && actor);

export interface CmsSnapshot extends ExistingCmsLookup {
  units: AdminUnitRecord[];
  source: 'supabase' | 'local';
  remoteError?: string;
}

interface LocalCmsOverlay {
  unitOverrides: Record<string, AdminUnitRecord>;
  unitDeletedIds: string[];
  vocabOverrides: Record<string, AdminVocabRecord>;
  vocabDeletedIds: number[];
  kanjiOverrides: Record<string, AdminKanjiRecord>;
  kanjiDeletedIds: string[];
  grammarOverrides: Record<string, AdminGrammarRecord>;
  grammarDeletedIds: string[];
  jlptOverrides: Record<string, AdminJlptRecord>;
  jlptDeletedIds: string[];
}

const emptyOverlay = (): LocalCmsOverlay => ({
  unitOverrides: {},
  unitDeletedIds: [],
  vocabOverrides: {},
  vocabDeletedIds: [],
  kanjiOverrides: {},
  kanjiDeletedIds: [],
  grammarOverrides: {},
  grammarDeletedIds: [],
  jlptOverrides: {},
  jlptDeletedIds: [],
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
      unitOverrides: sanitizeRecordMap<AdminUnitRecord>(obj.unitOverrides),
      unitDeletedIds: Array.isArray(obj.unitDeletedIds)
        ? obj.unitDeletedIds.filter((s): s is string => typeof s === 'string')
        : [],
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
    };
  } catch {
    return emptyOverlay();
  }
}

export function invalidateCmsQueries(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CMS_SYNC_EVENT));
}

function saveLocalOverlay(overlay: LocalCmsOverlay): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CMS_STORAGE_KEY, JSON.stringify(overlay));
  } catch {
    // ignore storage quota errors
  }
  invalidateCmsQueries();
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
    units: mergeByKey<string, AdminUnitRecord>(
      buildStaticUnits(),
      'id',
      overlay.unitOverrides,
      overlay.unitDeletedIds,
    ),
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
  const overlay = loadLocalOverlay();
  const unitRows = new Map<string, Record<string, unknown>>();
  for (const r of records) {
    const dbUnitId = r.dbUnitId || toDbUnitId(r.level, r.unitId);
    if (unitRows.has(dbUnitId)) continue;
    const customUnit = overlay.unitOverrides[dbUnitId];
    const meta = UNIT_DATA[r.level]?.find((u) => u.id === r.unitId);
    unitRows.set(dbUnitId, {
      id: dbUnitId,
      level: r.level,
      unit_number: customUnit?.unitNumber ?? r.unitId,
      title: customUnit?.title ?? meta?.name ?? `Unit ${r.unitId} (${r.level})`,
      description: customUnit?.description ?? (meta ? `${meta.totalWords} từ vựng ${r.level}` : `Unit ${r.unitId}`),
      order_index: customUnit?.orderIndex ?? r.unitId,
      is_published: customUnit?.isPublished ?? true,
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
    const [unitRes, vocabRes, kanjiRes, grammarRes, jlptRes] = await Promise.all([
      supabase.from('units').select('*').order('order_index', { ascending: true }),
      supabase.from('vocabularies').select('*').order('id', { ascending: true }),
      supabase.from('kanjis').select('*').order('id', { ascending: true }),
      supabase.from('grammar_rules').select('*').order('id', { ascending: true }),
      supabase.from('jlpt_questions').select('*').order('id', { ascending: true }),
    ]);

    const queryError =
      unitRes.error || vocabRes.error || kanjiRes.error || grammarRes.error || jlptRes.error;
    if (queryError) {
      return {
        ...local,
        source: 'local',
        remoteError: queryError.message,
      };
    }

    const remoteUnits = (unitRes.data ?? []).map((r) => mapUnitFromDb(r as Record<string, unknown>));
    const remoteVocabs = (vocabRes.data ?? []).map((r) => mapVocabFromDb(r as Record<string, unknown>));
    const remoteKanjis = (kanjiRes.data ?? []).map((r) => mapKanjiFromDb(r as Record<string, unknown>));
    const remoteGrammars = (grammarRes.data ?? []).map((r) => mapGrammarFromDb(r as Record<string, unknown>));
    const remoteJlpt = (jlptRes.data ?? []).map((r) => mapJlptFromDb(r as Record<string, unknown>));

    const baseUnits = remoteUnits.length > 0 ? remoteUnits : local.units;
    const baseVocabs = remoteVocabs.length > 0 ? remoteVocabs : local.vocabularies;
    const baseKanjis = remoteKanjis.length > 0 ? remoteKanjis : local.kanjis;
    const baseGrammars = remoteGrammars.length > 0 ? remoteGrammars : local.grammars;
    const baseJlpt = remoteJlpt.length > 0 ? remoteJlpt : local.jlptQuestions;

    return {
      source: 'supabase',
      units: baseUnits,
      vocabularies: baseVocabs,
      kanjis: baseKanjis,
      grammars: baseGrammars,
      jlptQuestions: baseJlpt,
    };
  } catch (err) {
    return {
      ...local,
      source: 'local',
      remoteError: err instanceof Error ? err.message : 'Lỗi kết nối Supabase.',
    };
  }
}

export async function saveUnitItem(
  record: AdminUnitRecord,
  actor: AuthUser | null,
  options?: { isNew?: boolean },
): Promise<{ ok: boolean; error?: string; item?: AdminUnitRecord }> {
  const cleanRecord: AdminUnitRecord = {
    ...record,
    id: record.id.trim() || toDbUnitId(record.level, record.unitNumber),
  };

  if (supabase && canWriteCloud(actor)) {
    const dbRow = mapUnitToDb(cleanRecord);
    const { error } = options?.isNew
      ? await supabase.from('units').insert(dbRow)
      : await supabase.from('units').update(dbRow).eq('id', cleanRecord.id);
    if (error) return { ok: false, error: error.message };
    await writeAuditLog(
      actor,
      options?.isNew ? 'INSERT_UNIT' : 'UPDATE_UNIT',
      'unit',
      cleanRecord.id,
      { level: cleanRecord.level, title: cleanRecord.title },
    );
  }

  const overlay = loadLocalOverlay();
  overlay.unitOverrides[cleanRecord.id] = cleanRecord;
  overlay.unitDeletedIds = overlay.unitDeletedIds.filter((id) => id !== cleanRecord.id);
  saveLocalOverlay(overlay);
  return { ok: true, item: cleanRecord };
}

export async function deleteUnitItem(
  id: string,
  actor: AuthUser | null,
): Promise<{ ok: boolean; error?: string }> {
  if (supabase && canWriteCloud(actor)) {
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    await writeAuditLog(actor, 'DELETE_UNIT', 'unit', id);
  }

  const overlay = loadLocalOverlay();
  delete overlay.unitOverrides[id];
  if (!overlay.unitDeletedIds.includes(id)) overlay.unitDeletedIds.push(id);
  saveLocalOverlay(overlay);
  return { ok: true };
}

export async function saveVocabItem(
  record: AdminVocabRecord,
  actor: AuthUser | null,
  options?: { isNew?: boolean },
): Promise<{ ok: boolean; error?: string; item?: AdminVocabRecord }> {
  let finalRecord = record;

  if (supabase && canWriteCloud(actor)) {
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
  } else if (options?.isNew && (!finalRecord.id || finalRecord.id <= 0)) {
    const maxLocalId = Math.max(130, ...getCmsSnapshotSync().vocabularies.map((v) => v.id));
    finalRecord = {
      ...finalRecord,
      id: maxLocalId + 1,
      wordNumber: finalRecord.wordNumber || maxLocalId + 1,
    };
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
  if (supabase && canWriteCloud(actor)) {
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

export async function bulkDeleteVocabItems(
  ids: number[],
  actor: AuthUser | null,
): Promise<{ ok: boolean; error?: string; count: number }> {
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return { ok: true, count: 0 };

  if (supabase && canWriteCloud(actor)) {
    const { error } = await supabase.from('vocabularies').delete().in('id', uniqueIds);
    if (error) return { ok: false, error: error.message, count: 0 };
    await writeAuditLog(actor, 'BULK_DELETE_VOCAB', 'vocabulary', `bulk-${uniqueIds.length}`, {
      ids: uniqueIds,
    });
  }

  const overlay = loadLocalOverlay();
  for (const id of uniqueIds) {
    delete overlay.vocabOverrides[String(id)];
    if (!overlay.vocabDeletedIds.includes(id)) overlay.vocabDeletedIds.push(id);
  }
  saveLocalOverlay(overlay);
  return { ok: true, count: uniqueIds.length };
}

export async function bulkUpdateVocabItems(
  items: AdminVocabRecord[],
  patch: {
    level?: JLPTLevel;
    unitId?: number;
    dbUnitId?: string;
    wordType?: string;
  },
  actor: AuthUser | null,
): Promise<{ ok: boolean; error?: string; count: number }> {
  if (items.length === 0) return { ok: true, count: 0 };
  const updatedList = items.map((item) => {
    const nextLevel = patch.level ?? item.level;
    const nextUnitId = patch.unitId ?? item.unitId;
    const nextDbUnitId =
      patch.dbUnitId ??
      (patch.unitId !== undefined || patch.level !== undefined
        ? toDbUnitId(nextLevel, nextUnitId)
        : item.dbUnitId || toDbUnitId(nextLevel, nextUnitId));
    return {
      ...item,
      level: nextLevel,
      unitId: nextUnitId,
      dbUnitId: nextDbUnitId,
      wordType: patch.wordType ?? item.wordType,
    };
  });

  if (supabase && canWriteCloud(actor)) {
    const unitRes = await ensureUnitsExist(updatedList);
    if (!unitRes.ok) return { ok: false, error: unitRes.error, count: 0 };
    const { error } = await supabase
      .from('vocabularies')
      .upsert(updatedList.map((r) => mapVocabToDb(r)), { onConflict: 'id' });
    if (error) return { ok: false, error: error.message, count: 0 };
    await writeAuditLog(actor, 'BULK_UPDATE_VOCAB', 'vocabulary', `bulk-${updatedList.length}`, {
      patch,
    });
  }

  const overlay = loadLocalOverlay();
  for (const item of updatedList) {
    overlay.vocabOverrides[String(item.id)] = item;
  }
  saveLocalOverlay(overlay);
  return { ok: true, count: updatedList.length };
}

export async function saveKanjiItem(
  record: AdminKanjiRecord,
  actor: AuthUser | null,
  options?: { isNew?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  if (supabase && canWriteCloud(actor)) {
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
  if (supabase && canWriteCloud(actor)) {
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
  if (supabase && canWriteCloud(actor)) {
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
  if (supabase && canWriteCloud(actor)) {
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
  if (supabase && canWriteCloud(actor)) {
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
  if (supabase && canWriteCloud(actor)) {
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

  if (supabase && canWriteCloud(actor) && commitBatch.length > 0) {
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

function summarizeManagedUsers(users: ManagedUserProfile[]): AccountProviderSummary {
  return users.reduce<AccountProviderSummary>(
    (acc, user) => {
      acc.total += 1;
      if (user.authProvider === 'google') acc.google += 1;
      else acc.email += 1;
      if (user.hasClientHash) acc.hashed += 1;
      return acc;
    },
    { total: 0, google: 0, email: 0, hashed: 0 },
  );
}

export async function fetchManagedUsers(actor: AuthUser | null): Promise<{
  ok: boolean;
  users: ManagedUserProfile[];
  summary: AccountProviderSummary;
  source: 'supabase' | 'local';
  error?: string;
}> {
  if (!actor || actor.role !== 'SUPER_ADMIN') {
    return {
      ok: false,
      users: [],
      summary: { total: 0, google: 0, email: 0, hashed: 0 },
      source: supabase ? 'supabase' : 'local',
      error: 'Forbidden: chỉ tài khoản SUPER_ADMIN mới được xem danh sách phân quyền người dùng.',
    };
  }

  if (supabase) {
    const res = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (res.error) {
      return {
        ok: false,
        users: [],
        summary: { total: 0, google: 0, email: 0, hashed: 0 },
        source: 'supabase',
        error: res.error.message,
      };
    }

    const rows = (res.data ?? []) as Array<Record<string, unknown>>;
    const users: ManagedUserProfile[] = rows.map((row) => {
      const rawProv = String(row.auth_provider ?? 'email').toLowerCase();
      const authProvider: ManagedUserProfile['authProvider'] =
        rawProv === 'google' ? 'google' : rawProv === 'email' || !row.auth_provider ? 'email' : 'other';
      return {
        id: String(row.id),
        email: String(row.email ?? ''),
        displayName: String(row.display_name || String(row.email ?? '').split('@')[0] || 'Học viên'),
        role: (row.role === 'SUPER_ADMIN' || row.role === 'ADMIN' ? row.role : 'USER') as AccountRole,
        authProvider,
        hasClientHash: Boolean(row.has_client_hash),
        createdAt: String(row.created_at ?? new Date().toISOString()),
      };
    });

    let summary = summarizeManagedUsers(users);
    const hasExtendedSchema = rows.length > 0 && 'auth_provider' in rows[0];
    if (hasExtendedSchema) {
      try {
        const rpcRes = await supabase.rpc('get_admin_account_summary');
        if (!rpcRes.error && rpcRes.data && typeof rpcRes.data === 'object') {
          const d = rpcRes.data as Record<string, unknown>;
          summary = {
            total: Number(d.total ?? users.length),
            google: Number(d.google ?? summary.google),
            email: Number(d.email ?? summary.email),
            hashed: Number(d.hashed ?? summary.hashed),
          };
        }
      } catch {
        // Fall back cleanly to mapped profile counts
      }
    }

    return { ok: true, users, summary, source: 'supabase' };
  }

  return {
    ok: false,
    users: [],
    summary: { total: 0, google: 0, email: 0, hashed: 0 },
    source: 'local',
    error: 'Chưa kết nối cơ sở dữ liệu người dùng.',
  };
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

  return {
    ok: false,
    error: 'Chưa kết nối cơ sở dữ liệu để cập nhật phân quyền.',
  };
}

export async function fetchAuditLogs(actor: AuthUser | null, limit = 50): Promise<{
  ok: boolean;
  logs: AuditLogRecord[];
  source: 'supabase' | 'local';
  error?: string;
}> {
  if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN')) {
    return {
      ok: false,
      logs: [],
      source: supabase ? 'supabase' : 'local',
      error: 'Forbidden: chỉ ADMIN hoặc SUPER_ADMIN mới xem được nhật ký hệ thống.',
    };
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, actor_id, action, entity_type, entity_id, details_json, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!error && data) {
      return {
        ok: true,
        source: 'supabase',
        logs: data.map((r) => ({
          id: String(r.id),
          actorId: r.actor_id ? String(r.actor_id) : null,
          action: String(r.action),
          entityType: String(r.entity_type),
          entityId: String(r.entity_id),
          detailsJson: (r.details_json ?? {}) as Record<string, unknown>,
          createdAt: String(r.created_at),
        })),
      };
    }
  }

  return {
    ok: true,
    source: 'local',
    logs: getLocalAuditLogs().slice(0, limit),
  };
}

export async function importUniversalJsonArray(params: {
  table: CmsTableName;
  rawItems: unknown[];
  actor: AuthUser | null;
}): Promise<{ ok: boolean; count: number; error?: string }> {
  const { table, rawItems, actor } = params;
  if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN')) {
    return { ok: false, count: 0, error: 'Chỉ ADMIN hoặc SUPER_ADMIN mới được nhập dữ liệu JSON.' };
  }
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { ok: false, count: 0, error: 'Dữ liệu JSON phải là mảng khác rỗng ([...]).' };
  }

  const normalizedRecords = rawItems
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
    .map((row) => {
      if (table === 'units') return mapUnitFromDb(row);
      if (table === 'vocabularies') return mapVocabFromDb(row);
      if (table === 'kanjis') return mapKanjiFromDb(row);
      if (table === 'grammar_rules') return mapGrammarFromDb(row);
      return mapJlptFromDb(row);
    });

  if (normalizedRecords.length === 0) {
    return { ok: false, count: 0, error: 'Không tìm thấy bản ghi hợp lệ trong mảng JSON.' };
  }

  const dbPayload = normalizedRecords.map((rec) => {
    if (table === 'units') return mapUnitToDb(rec as AdminUnitRecord);
    if (table === 'vocabularies') return mapVocabToDb(rec as AdminVocabRecord);
    if (table === 'kanjis') return mapKanjiToDb(rec as AdminKanjiRecord);
    if (table === 'grammar_rules') return mapGrammarToDb(rec as AdminGrammarRecord);
    return mapJlptToDb(rec as AdminJlptRecord);
  });

  if (supabase && canWriteCloud(actor)) {
    if (table === 'vocabularies') {
      await ensureUnitsExist(normalizedRecords as AdminVocabRecord[]);
    }
    const { error } = await supabase.from(table).upsert(dbPayload, { onConflict: 'id' });
    if (error) return { ok: false, count: 0, error: error.message };
    await writeAuditLog(actor, 'UNIVERSAL_JSON_UPSERT', table, `json-${normalizedRecords.length}`, {
      count: normalizedRecords.length,
    });
  }

  const overlay = loadLocalOverlay();
  for (const rec of normalizedRecords) {
    if (table === 'units') {
      const u = rec as AdminUnitRecord;
      overlay.unitOverrides[u.id] = u;
      overlay.unitDeletedIds = overlay.unitDeletedIds.filter((id) => id !== u.id);
    } else if (table === 'vocabularies') {
      const v = rec as AdminVocabRecord;
      overlay.vocabOverrides[String(v.id)] = v;
      overlay.vocabDeletedIds = overlay.vocabDeletedIds.filter((id) => id !== v.id);
    } else if (table === 'kanjis') {
      const k = rec as AdminKanjiRecord;
      overlay.kanjiOverrides[k.id] = k;
      overlay.kanjiDeletedIds = overlay.kanjiDeletedIds.filter((id) => id !== k.id);
    } else if (table === 'grammar_rules') {
      const g = rec as AdminGrammarRecord;
      overlay.grammarOverrides[g.id] = g;
      overlay.grammarDeletedIds = overlay.grammarDeletedIds.filter((id) => id !== g.id);
    } else {
      const j = rec as AdminJlptRecord;
      overlay.jlptOverrides[j.id] = j;
      overlay.jlptDeletedIds = overlay.jlptDeletedIds.filter((id) => id !== j.id);
    }
  }
  saveLocalOverlay(overlay);
  return { ok: true, count: normalizedRecords.length };
}

export type SeedProgressUpdate = MigrationProgressUpdate;
export type SeedCloudResult = MigrationResult;

export const seedStaticDataToSupabase = migrateAllStaticDataToSupabase;

export interface CrudAutoTestStep {
  name: string;
  target: CmsTableName;
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

  const sb = supabase;
  const suffix = String(Date.now()).slice(-6);
  const testUnitId = `N3-U999${suffix.slice(-2)}`;
  let testVocabId: number | null = null;
  const testKanjiId = `__autotest_k_${suffix}__`;
  const testGrammarId = `__autotest_g_${suffix}__`;
  const testJlptId = `__autotest_j_${suffix}__`;

  const runStep = async (
    name: string,
    target: CmsTableName,
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

  const runLifecycle = async (params: {
    prefix: string;
    table: CmsTableName;
    checkCol: string;
    expectedUpdated: unknown;
    insertRow: () => Promise<{ id: string | number; label: string }>;
    updatePatch: Record<string, unknown>;
    cleanupId: () => string | number | null;
  }) => {
    const { prefix, table, checkCol, expectedUpdated, insertRow, updatePatch, cleanupId } = params;
    let idVal: string | number | null = null;
    const inserted = await runStep(`${prefix} INSERT`, table, async () => {
      const res = await insertRow();
      idVal = res.id;
      return res.label;
    });
    if (!inserted || idVal === null) return;

    await runStep(`${prefix} SELECT`, table, async () => {
      const { data, error } = await sb.from(table).select(`id, ${checkCol}`).eq('id', idVal!).single();
      if (error) throw new Error(error.message);
      const val = (data as unknown as Record<string, unknown>)[checkCol];
      return `Selected ${checkCol}=${JSON.stringify(val)}`;
    });

    await runStep(`${prefix} UPDATE`, table, async () => {
      const { data, error } = await sb
        .from(table)
        .update(updatePatch)
        .eq('id', idVal!)
        .select(checkCol)
        .single();
      if (error) throw new Error(error.message);
      const val = (data as unknown as Record<string, unknown>)[checkCol];
      if (val !== expectedUpdated) throw new Error(`Update không khớp: ${String(val)}`);
      return `Updated ${checkCol}=${JSON.stringify(val)}`;
    });

    await runStep(`${prefix} DELETE`, table, async () => {
      const targetId = cleanupId() ?? idVal!;
      const { error } = await sb.from(table).delete().eq('id', targetId);
      if (error) throw new Error(error.message);
      const { data: gone } = await sb.from(table).select('id').eq('id', targetId).maybeSingle();
      if (gone) throw new Error('Bản ghi vẫn tồn tại sau khi DELETE.');
      return `Deleted & verified gone (id=${targetId})`;
    });
  };

  try {
    // Prepare parent test Unit first cleanly so vocabulary FK succeeds
    await runLifecycle({
      prefix: '1. UNIT',
      table: 'units',
      checkCol: 'title',
      expectedUpdated: `AutoTest Unit Updated ${suffix}`,
      insertRow: async () => {
        const { data, error } = await sb
          .from('units')
          .upsert({
            id: testUnitId,
            level: 'N3',
            unit_number: 999,
            title: `AutoTest Unit ${suffix}`,
            description: 'Temp E2E Unit',
            order_index: 999,
            is_published: false,
          }, { onConflict: 'id' })
          .select('id, title')
          .single();
        if (error) throw new Error(error.message);
        return { id: String(data.id), label: `Inserted unit id=${data.id}` };
      },
      updatePatch: { title: `AutoTest Unit Updated ${suffix}` },
      cleanupId: () => testUnitId,
    });

    // Re-ensure unit temporarily while vocab test runs, then clean up unit at very end
    await sb.from('units').upsert({
      id: testUnitId,
      level: 'N3',
      unit_number: 999,
      title: `Temp FK Unit ${suffix}`,
      description: 'Temp E2E FK Unit',
      order_index: 999,
      is_published: false,
    }, { onConflict: 'id' });

    await runLifecycle({
      prefix: '2. VOCAB',
      table: 'vocabularies',
      checkCol: 'meaning',
      expectedUpdated: 'AutoTest Updated Meaning',
      insertRow: async () => {
        const { data: maxRow } = await sb
          .from('vocabularies')
          .select('id')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();
        const candidateId = Math.max(900000, Number(maxRow?.id ?? 0) + 1);
        const { data, error } = await sb
          .from('vocabularies')
          .insert({
            id: candidateId,
            unit_id: testUnitId,
            word_number: candidateId,
            kanji: `自動試${suffix}`,
            hiragana: `じどうし${suffix}`,
            han_viet: 'TỰ ĐỘNG THÍ',
            meaning: 'AutoTest Initial Meaning',
            word_type: 'Danh từ',
            level: 'N3',
            tags: ['autotest'],
            semantic_roles: ['task'],
          })
          .select('id, meaning')
          .single();
        if (error) throw new Error(error.message);
        testVocabId = Number(data.id);
        return { id: testVocabId, label: `Inserted vocab id=${testVocabId}` };
      },
      updatePatch: { meaning: 'AutoTest Updated Meaning' },
      cleanupId: () => {
        const id = testVocabId;
        testVocabId = null;
        return id;
      },
    });

    await runLifecycle({
      prefix: '3. KANJI',
      table: 'kanjis',
      checkCol: 'han_viet',
      expectedUpdated: 'ĐÃ CẬP NHẬT',
      insertRow: async () => {
        const { data, error } = await sb
          .from('kanjis')
          .insert({
            id: testKanjiId,
            character: `試${suffix}`,
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
        return { id: String(data.id), label: `Inserted kanji id=${data.id}` };
      },
      updatePatch: { han_viet: 'ĐÃ CẬP NHẬT', meanings: ['Kiểm thử sau cập nhật'] },
      cleanupId: () => testKanjiId,
    });

    await runLifecycle({
      prefix: '4. GRAMMAR',
      table: 'grammar_rules',
      checkCol: 'meaning',
      expectedUpdated: 'AutoTest Grammar Updated',
      insertRow: async () => {
        const { data, error } = await sb
          .from('grammar_rules')
          .insert({
            id: testGrammarId,
            book_id: 'SHINKANZEN_N3',
            chapter_id: 'L01',
            level: 'N3',
            title: `～テスト${suffix}`,
            structure: 'Vる + テスト',
            meaning: 'AutoTest Grammar Initial',
            explanation: 'Giải thích test',
            notes: '',
            examples: [{ jp: 'テストする。', vi: 'Kiểm thử.' }],
          })
          .select('id, title')
          .single();
        if (error) throw new Error(error.message);
        return { id: String(data.id), label: `Inserted grammar id=${data.id}` };
      },
      updatePatch: { meaning: 'AutoTest Grammar Updated' },
      cleanupId: () => testGrammarId,
    });

    await runLifecycle({
      prefix: '5. JLPT',
      table: 'jlpt_questions',
      checkCol: 'prompt',
      expectedUpdated: `AutoTest JLPT Updated ${suffix}`,
      insertRow: async () => {
        const { data, error } = await sb
          .from('jlpt_questions')
          .insert({
            id: testJlptId,
            module_id: 'vocab',
            level: 'N3',
            question_type: 'mcq',
            prompt: `AutoTest JLPT Prompt ${suffix}`,
            passage: null,
            options: ['A', 'B', 'C', 'D'],
            correct_index: 0,
            explanation: 'AutoTest',
            audio_text: null,
          })
          .select('id')
          .single();
        if (error) throw new Error(error.message);
        return { id: String(data.id), label: `Inserted jlpt id=${data.id}` };
      },
      updatePatch: { prompt: `AutoTest JLPT Updated ${suffix}` },
      cleanupId: () => testJlptId,
    });
  } finally {
    if (testVocabId !== null) await sb.from('vocabularies').delete().eq('id', testVocabId);
    await sb.from('kanjis').delete().eq('id', testKanjiId);
    await sb.from('grammar_rules').delete().eq('id', testGrammarId);
    await sb.from('jlpt_questions').delete().eq('id', testJlptId);
    await sb.from('units').delete().eq('id', testUnitId);
  }

  const passed = steps.filter((s) => s.status === 'PASS').length;
  const totalDurationMs = Date.now() - startedAt;
  const allPassed = passed === steps.length && steps.length > 0;

  await writeAuditLog(actor, 'CRUD_AUTO_TEST', 'database', 'all', {
    passed,
    total: steps.length,
    durationMs: totalDurationMs,
    ok: allPassed,
  });

  return {
    ok: allPassed,
    summary: allPassed
      ? `Tất cả ${passed}/${steps.length} bước CRUD 5 bảng Supabase (INSERT → SELECT → UPDATE → DELETE) đều PASS trong ${totalDurationMs}ms!`
      : `${passed}/${steps.length} bước PASS (${steps.length - passed} bước FAIL). Kiểm tra RLS hoặc kết nối Supabase.`,
    totalDurationMs,
    steps,
  };
}
