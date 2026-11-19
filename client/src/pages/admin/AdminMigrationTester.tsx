import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  FlaskConical,
  RefreshCw,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Field,
  Notice,
  ProgressBar,
  Select,
  Textarea,
} from '../../components/ui';
import {
  importUniversalJsonArray,
  runAdminCrudAutoTest,
  type CmsSnapshot,
  type CrudAutoTestResult,
} from '../../services/adminCmsService';
import {
  fetchSupabaseTableCounts,
  getLocalStaticCounts,
  mapGrammarToDb,
  mapJlptToDb,
  mapKanjiToDb,
  mapUnitToDb,
  mapVocabToDb,
  migrateAllStaticDataToSupabase,
  migrateSingleTableToSupabase,
  type MigrationProgressUpdate,
  type StaticDatasetCounts,
} from '../../services/migrationService';
import type { AuthUser } from '../../store/slices/authSlice';
import type { CmsTableName } from '../../types/admin';
import { downloadJsonFile } from '../../utils/batchImportUtils';

const TABLE_ROWS: Array<{
  table: CmsTableName;
  label: string;
  countKey: keyof Omit<StaticDatasetCounts, 'profiles'>;
}> = [
  { table: 'units', label: 'Học phần (units)', countKey: 'units' },
  { table: 'vocabularies', label: 'Từ vựng (vocabularies)', countKey: 'vocabularies' },
  { table: 'kanjis', label: 'Chữ Hán (kanjis)', countKey: 'kanjis' },
  { table: 'grammar_rules', label: 'Ngữ pháp (grammar_rules)', countKey: 'grammarRules' },
  { table: 'jlpt_questions', label: 'Đề JLPT (jlpt_questions)', countKey: 'jlptQuestions' },
];

interface AdminMigrationTesterProps {
  snapshot: CmsSnapshot;
  actor: AuthUser | null;
  onRefresh: () => Promise<void> | void;
}

export function AdminMigrationTester({
  snapshot,
  actor,
  onRefresh,
}: AdminMigrationTesterProps) {
  const staticCounts = useMemo(() => getLocalStaticCounts(), []);
  const [cloudCounts, setCloudCounts] = useState<StaticDatasetCounts | null>(null);
  const [cloudCountError, setCloudCountError] = useState<string | null>(null);
  const [checkingCounts, setCheckingCounts] = useState(false);

  const [migratingAll, setMigratingAll] = useState(false);
  const [migratingTable, setMigratingTable] = useState<CmsTableName | null>(null);
  const [progress, setProgress] = useState<MigrationProgressUpdate | null>(null);
  const [migrationBanner, setMigrationBanner] = useState<{
    tone: 'success' | 'danger' | 'warning';
    text: string;
  } | null>(null);

  const [autoTesting, setAutoTesting] = useState(false);
  const [autoTestResult, setAutoTestResult] = useState<CrudAutoTestResult | null>(null);

  const [jsonTable, setJsonTable] = useState<CmsTableName>('units');
  const [jsonInput, setJsonInput] = useState('');
  const [jsonBusy, setJsonBusy] = useState(false);
  const [jsonBanner, setJsonBanner] = useState<{
    tone: 'success' | 'danger';
    text: string;
  } | null>(null);

  const refreshCloudCounts = useCallback(async () => {
    setCheckingCounts(true);
    setCloudCountError(null);
    const res = await fetchSupabaseTableCounts();
    setCheckingCounts(false);
    if (!res.ok) {
      setCloudCountError(res.error ?? 'Không thể đọc số liệu bảng trên Supabase.');
      return;
    }
    setCloudCounts(res.counts);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchSupabaseTableCounts().then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setCloudCountError(res.error ?? 'Không thể đọc số liệu bảng trên Supabase.');
        return;
      }
      setCloudCountError(null);
      setCloudCounts(res.counts);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleMigrateAll = async () => {
    setMigratingAll(true);
    setMigrationBanner(null);
    setProgress({
      completedSteps: 0,
      totalSteps: 5,
      currentTable: 'units',
      label: 'Đang chuẩn bị đồng bộ toàn bộ 5 bảng lên Supabase...',
    });
    const res = await migrateAllStaticDataToSupabase({
      actor,
      onProgress: (upd) => setProgress(upd),
    });
    setMigratingAll(false);
    if (!res.ok) {
      setMigrationBanner({
        tone: 'danger',
        text: res.error ?? 'Migration thất bại.',
      });
      return;
    }
    setMigrationBanner({
      tone: 'success',
      text: `Đã đồng bộ thành công: ${res.counts.units} units, ${res.counts.vocabularies} từ vựng, ${res.counts.kanjis} kanji, ${res.counts.grammarRules} ngữ pháp, ${res.counts.jlptQuestions} câu JLPT.`,
    });
    await refreshCloudCounts();
    await onRefresh();
  };

  const handleMigrateSingle = async (table: CmsTableName) => {
    setMigratingTable(table);
    setMigrationBanner(null);
    const res = await migrateSingleTableToSupabase({
      table,
      actor,
      onProgress: (upd) => setProgress(upd),
    });
    setMigratingTable(null);
    if (!res.ok) {
      setMigrationBanner({
        tone: 'danger',
        text: res.error ?? `Không thể đồng bộ bảng ${table}.`,
      });
      return;
    }
    setMigrationBanner({
      tone: 'success',
      text: `Đã upsert ${res.count} dòng vào bảng ${table} trên Supabase.`,
    });
    await refreshCloudCounts();
    await onRefresh();
  };

  const handleRunAutoTest = async () => {
    setAutoTesting(true);
    const result = await runAdminCrudAutoTest(actor);
    setAutoTesting(false);
    setAutoTestResult(result);
    await refreshCloudCounts();
    await onRefresh();
  };

  const handleExportTableJson = (mode: 'camelCase' | 'snake_case') => {
    let payload: unknown[] = [];
    if (jsonTable === 'units') {
      payload = mode === 'snake_case' ? snapshot.units.map(mapUnitToDb) : snapshot.units;
    } else if (jsonTable === 'vocabularies') {
      payload =
        mode === 'snake_case' ? snapshot.vocabularies.map(mapVocabToDb) : snapshot.vocabularies;
    } else if (jsonTable === 'kanjis') {
      payload = mode === 'snake_case' ? snapshot.kanjis.map(mapKanjiToDb) : snapshot.kanjis;
    } else if (jsonTable === 'grammar_rules') {
      payload = mode === 'snake_case' ? snapshot.grammars.map(mapGrammarToDb) : snapshot.grammars;
    } else {
      payload =
        mode === 'snake_case' ? snapshot.jlptQuestions.map(mapJlptToDb) : snapshot.jlptQuestions;
    }
    downloadJsonFile(`nihongo-${jsonTable}-${mode}-${new Date().toISOString().slice(0, 10)}.json`, payload);
  };

  const handleImportUniversalJson = async () => {
    if (!jsonInput.trim()) {
      setJsonBanner({ tone: 'danger', text: 'Vui lòng dán mảng JSON ([...]) trước khi import.' });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonInput);
    } catch (err) {
      setJsonBanner({
        tone: 'danger',
        text: err instanceof Error ? `JSON không hợp lệ: ${err.message}` : 'JSON không hợp lệ.',
      });
      return;
    }
    if (!Array.isArray(parsed)) {
      setJsonBanner({ tone: 'danger', text: 'Dữ liệu JSON phải là một mảng ([...]).' });
      return;
    }

    setJsonBusy(true);
    setJsonBanner(null);
    const res = await importUniversalJsonArray({
      table: jsonTable,
      rawItems: parsed,
      actor,
    });
    setJsonBusy(false);

    if (!res.ok) {
      setJsonBanner({ tone: 'danger', text: res.error ?? 'Import thất bại.' });
      return;
    }

    setJsonBanner({
      tone: 'success',
      text: `Đã upsert ${res.count} bản ghi vào bảng ${jsonTable} và đồng bộ Live Client.`,
    });
    await refreshCloudCounts();
    await onRefresh();
  };

  return (
    <div className="space-y-5">
      {/* Panel 1: Static vs Live Supabase Migration */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
              <Database className="h-4 w-4 text-primary" />
              1. Đồng bộ dữ liệu gốc lên Supabase
            </h2>
            <p className="mt-1 text-xs text-muted">
              So sánh số dòng Static Dataset với PostgreSQL Supabase thực tế và đồng bộ toàn bộ hoặc từng bảng (upsert an toàn 50 dòng/lô).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={checkingCounts}
              onClick={() => void refreshCloudCounts()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Làm mới số liệu Cloud
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="h-auto min-h-8 whitespace-normal py-1.5 text-center"
              loading={migratingAll}
              disabled={migratingTable !== null}
              onClick={() => void handleMigrateAll()}
            >
              Chuyển toàn bộ dữ liệu hiện tại lên Supabase (Migrate All)
            </Button>
          </div>
        </div>

        {cloudCountError && <Notice tone="warning">{cloudCountError}</Notice>}
        {migrationBanner && <Notice tone={migrationBanner.tone}>{migrationBanner.text}</Notice>}

        {progress && (
          <ProgressBar
            value={progress.completedSteps}
            max={Math.max(1, progress.totalSteps)}
            label={progress.label}
            tone="primary"
          />
        )}

        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2.5">Bảng PostgreSQL</th>
                <th className="px-4 py-2.5 text-right">Static Gốc</th>
                <th className="px-4 py-2.5 text-right">CMS Hiện tại</th>
                <th className="px-4 py-2.5 text-right">Live Supabase</th>
                <th className="px-4 py-2.5">Trạng thái</th>
                <th className="px-4 py-2.5 text-right">Đồng bộ lẻ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {TABLE_ROWS.map((row) => {
                const localStatic = staticCounts[row.countKey];
                const cmsCount =
                  row.table === 'units'
                    ? snapshot.units.length
                    : row.table === 'vocabularies'
                      ? snapshot.vocabularies.length
                      : row.table === 'kanjis'
                        ? snapshot.kanjis.length
                        : row.table === 'grammar_rules'
                          ? snapshot.grammars.length
                          : snapshot.jlptQuestions.length;
                const cloudVal = cloudCounts ? cloudCounts[row.countKey] : null;
                const synced = cloudVal !== null && cloudVal >= localStatic;
                return (
                  <tr key={row.table} className="hover:bg-glass-soft">
                    <td className="px-4 py-2.5 font-medium text-fg">{row.label}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                      {localStatic}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-fg">
                      {cmsCount}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-fg">
                      {cloudVal === null ? '—' : cloudVal}
                    </td>
                    <td className="px-4 py-2.5">
                      {cloudVal === null ? (
                        <Badge tone="neutral">Chưa kết nối</Badge>
                      ) : synced ? (
                        <Badge tone="success">Đã đồng bộ</Badge>
                      ) : (
                        <Badge tone="warning">Thiếu {Math.max(0, localStatic - cloudVal)}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={migratingTable === row.table}
                        disabled={migratingAll}
                        onClick={() => void handleMigrateSingle(row.table)}
                      >
                        Đồng bộ {row.table}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Panel 2: Automated 5-table E2E CRUD Tester */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-fg">
              <FlaskConical className="h-4 w-4 text-sakura" />
              2. Auto-Test CRUD 5 Bảng Supabase &amp; Audit Logs
            </h3>
            <p className="mt-1 text-xs text-muted">
              Tự động thực thi chu trình <code>INSERT → SELECT → UPDATE → DELETE</code> trên cả 5 bảng (<code>units</code>, <code>vocabularies</code>, <code>kanjis</code>, <code>grammar_rules</code>, <code>jlpt_questions</code>) và ghi nhận kết quả vào <code>audit_logs</code>.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="h-auto min-h-8 whitespace-normal py-1.5 text-center"
            loading={autoTesting}
            onClick={() => void handleRunAutoTest()}
          >
            <FlaskConical className="h-4 w-4 shrink-0" />
            Chạy Auto-Test Thêm / Sửa / Xóa (E2E CRUD Test)
          </Button>
        </div>

        {autoTestResult && (
          <div className="space-y-3">
            <Notice tone={autoTestResult.ok ? 'success' : 'danger'}>
              {autoTestResult.summary}
            </Notice>
            <div className="grid gap-2 md:grid-cols-2">
              {autoTestResult.steps.map((step, idx) => (
                <div
                  key={`${step.name}-${idx}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs"
                >
                  <div className="flex items-start gap-2">
                    {step.status === 'PASS' ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    )}
                    <div>
                      <div className="font-semibold text-fg">{step.name}</div>
                      <div className="text-muted">{step.detail}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-mono text-muted">
                    {step.durationMs}ms
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Panel 3: Universal JSON Import / Export */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-fg">
              3. Universal JSON Import &amp; Export (Chấp nhận cả <code>snake_case</code> &amp; <code>camelCase</code>)
            </h3>
            <p className="mt-1 text-xs text-muted">
              Chọn bảng đích để tải xuống bản sao lưu JSON đầy đủ hoặc dán mảng JSON <code>[...]</code> để upsert hàng loạt và đồng bộ Live Client.
            </p>
          </div>
        </div>

        {jsonBanner && <Notice tone={jsonBanner.tone}>{jsonBanner.text}</Notice>}

        <div className="grid gap-3 md:grid-cols-[260px_1fr]">
          <Field label="Bảng dữ liệu mục tiêu">
            <Select
              value={jsonTable}
              onChange={(e) => setJsonTable(e.target.value as CmsTableName)}
            >
              {TABLE_ROWS.map((row) => (
                <option key={row.table} value={row.table}>
                  {row.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-wrap items-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExportTableJson('snake_case')}
            >
              <Download className="h-4 w-4" />
              Export DB JSON (snake_case)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExportTableJson('camelCase')}
            >
              <Download className="h-4 w-4" />
              Export App JSON (camelCase)
            </Button>
          </div>
        </div>

        <Field label={`Dán mảng JSON cho bảng "${jsonTable}"`}>
          <Textarea
            rows={5}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='[{"id": "...", ...}]'
            className="font-mono text-xs"
          />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg hover:bg-glass-soft">
            <Upload className="h-3.5 w-3.5" />
            Nạp từ file .json
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === 'string') setJsonInput(reader.result);
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
          </label>

          <Button
            variant="primary"
            size="sm"
            loading={jsonBusy}
            onClick={() => void handleImportUniversalJson()}
          >
            <Upload className="h-4 w-4" />
            Upsert mảng JSON vào {jsonTable}
          </Button>
        </div>
      </Card>
    </div>
  );
}
