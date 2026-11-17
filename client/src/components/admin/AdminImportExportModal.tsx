import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Sparkles,
  Upload,
  XCircle,
} from 'lucide-react';
import { executeBatchImport, type CmsSnapshot } from '../../services/adminCmsService';
import type {
  BatchExecutionSummary,
  BatchImportMode,
  BatchRowStatus,
  CmsEntityType,
} from '../../types/admin';
import type { AuthUser } from '../../store/slices/authSlice';
import {
  BATCH_SAMPLE_TEMPLATES,
  downloadJsonFile,
  validateBatchImport,
} from '../../utils/batchImportUtils';
import {
  Badge,
  Button,
  Chip,
  Field,
  Modal,
  Notice,
  Select,
  Stat,
  Textarea,
} from '../ui';

const ENTITY_LABEL: Record<CmsEntityType, string> = {
  vocabulary: 'Từ vựng',
  kanji: 'Kanji',
  grammar: 'Ngữ pháp',
  jlpt: 'Câu hỏi JLPT',
};

const MODE_DESCRIPTIONS: Record<BatchImportMode, { label: string; desc: string }> = {
  insert_only: {
    label: 'Insert Only (Bỏ qua trùng lặp)',
    desc: 'Chỉ thêm các dòng mới hợp lệ; tự động bỏ qua bản ghi trùng lặp và dòng lỗi.',
  },
  upsert: {
    label: 'Upsert (Cập nhật bản ghi trùng)',
    desc: 'Thêm bản ghi mới và cập nhật đè lên các bản ghi trùng ID hoặc khóa.',
  },
  all_or_nothing: {
    label: 'Validate All-or-Nothing (Toàn vẹn tuyệt đối)',
    desc: 'Hủy bỏ / rollback toàn bộ lô nếu bất kỳ dòng nào không hợp lệ.',
  },
};

interface AdminImportExportModalProps {
  open: boolean;
  onClose: () => void;
  entityType: CmsEntityType;
  snapshot: CmsSnapshot;
  actor: AuthUser | null;
  onCommitted: () => Promise<void> | void;
  filteredExportData?: unknown[];
  filteredExportLabel?: string;
}

export function AdminImportExportModal({
  open,
  onClose,
  entityType,
  snapshot,
  actor,
  onCommitted,
  filteredExportData,
  filteredExportLabel,
}: AdminImportExportModalProps) {
  const [activeEntity, setActiveEntity] = useState<CmsEntityType>(entityType);
  const [rawText, setRawText] = useState('');
  const [formatHint, setFormatHint] = useState<'auto' | 'json' | 'csv'>('auto');
  const [importMode, setImportMode] = useState<BatchImportMode>('insert_only');
  const [statusFilter, setStatusFilter] = useState<'all' | BatchRowStatus>('all');
  const [executing, setExecuting] = useState(false);
  const [summary, setSummary] = useState<BatchExecutionSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncEntityFromProp = (next: CmsEntityType) => {
    setActiveEntity(next);
    setSummary(null);
  };

  const report = useMemo(() => {
    if (!rawText.trim()) return null;
    return validateBatchImport(rawText, activeEntity, snapshot, formatHint);
  }, [rawText, activeEntity, snapshot, formatHint]);

  const filteredPreviewRows = useMemo(() => {
    if (!report) return [];
    if (statusFilter === 'all') return report.rows;
    return report.rows.filter((r) => r.status === statusFilter);
  }, [report, statusFilter]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    setFormatHint(isCsv ? 'csv' : file.name.toLowerCase().endsWith('.json') ? 'json' : 'auto');
    setRawText(text);
    setSummary(null);
    event.target.value = '';
  };

  const handleExecuteImport = async () => {
    if (!rawText.trim()) return;
    setExecuting(true);
    try {
      const result = await executeBatchImport({
        rawText,
        entityType: activeEntity,
        mode: importMode,
        existing: snapshot,
        actor,
        formatHint,
      });
      setSummary(result);
      if (!result.aborted && result.inserted + result.updated > 0) {
        await onCommitted();
      }
    } finally {
      setExecuting(false);
    }
  };

  const handleExportCurrentEntity = () => {
    const dateSlug = new Date().toISOString().slice(0, 10);
    const dataset =
      activeEntity === 'vocabulary'
        ? snapshot.vocabularies
        : activeEntity === 'kanji'
          ? snapshot.kanjis
          : activeEntity === 'grammar'
            ? snapshot.grammars
            : snapshot.jlptQuestions;

    downloadJsonFile(`nihonmaster-${activeEntity}-${dateSlug}.json`, dataset);
  };

  const handleExportFiltered = () => {
    if (!filteredExportData) return;
    const dateSlug = new Date().toISOString().slice(0, 10);
    downloadJsonFile(`nihonmaster-${entityType}-filtered-${dateSlug}.json`, filteredExportData);
  };

  const handleExportFullBackup = () => {
    const dateSlug = new Date().toISOString().slice(0, 10);
    downloadJsonFile(`nihonmaster-full-backup-${dateSlug}.json`, {
      exportedAt: new Date().toISOString(),
      counts: {
        vocabularies: snapshot.vocabularies.length,
        kanjis: snapshot.kanjis.length,
        grammars: snapshot.grammars.length,
        jlptQuestions: snapshot.jlptQuestions.length,
      },
      vocabularies: snapshot.vocabularies,
      kanjis: snapshot.kanjis,
      grammar_rules: snapshot.grammars,
      jlpt_questions: snapshot.jlptQuestions,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={`Import / Export hàng loạt — ${ENTITY_LABEL[activeEntity]}`}
      description="Kiểm tra hợp lệ từng dòng, phát hiện trùng lặp, xem trước bảng trạng thái trước khi ghi và xuất sao lưu JSON."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          <Button
            variant="primary"
            loading={executing}
            disabled={!report || Boolean(report.parseError) || report.counts.total === 0}
            onClick={() => void handleExecuteImport()}
            leftIcon={<Upload className="size-4" aria-hidden />}
          >
            Thực thi Import ({report?.counts.total ?? 0} dòng)
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* One-Click Backup Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 p-3">
          <div className="text-xs text-muted">
            <span className="font-semibold text-fg">Sao lưu nhanh (.json):</span> Tải toàn bộ học liệu hoặc dữ liệu đang lọc để lưu trữ / commit về repo.
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredExportData && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportFiltered}
                leftIcon={<Download className="size-3.5" aria-hidden />}
              >
                {filteredExportLabel ?? `Xuất bộ lọc (${filteredExportData.length})`}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCurrentEntity}
              leftIcon={<Download className="size-3.5" aria-hidden />}
            >
              Xuất {ENTITY_LABEL[activeEntity]}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportFullBackup}
              leftIcon={<Download className="size-3.5" aria-hidden />}
            >
              Xuất toàn bộ DB (.json)
            </Button>
          </div>
        </div>

        {/* Entity + Input Controls */}
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Loại học liệu" htmlFor="batch-entity-select">
            <Select
              id="batch-entity-select"
              value={activeEntity}
              onChange={(e) => syncEntityFromProp(e.target.value as CmsEntityType)}
            >
              <option value="vocabulary">Từ vựng (Vocabulary)</option>
              <option value="kanji">Chữ Hán (Kanji)</option>
              <option value="grammar">Ngữ pháp (Grammar Rules)</option>
              <option value="jlpt">Câu hỏi JLPT</option>
            </Select>
          </Field>

          <Field label="Định dạng đầu vào" htmlFor="batch-format-select">
            <Select
              id="batch-format-select"
              value={formatHint}
              onChange={(e) => setFormatHint(e.target.value as 'auto' | 'json' | 'csv')}
            >
              <option value="auto">Tự động nhận diện (JSON / CSV)</option>
              <option value="json">JSON Array</option>
              <option value="csv">CSV (có dòng tiêu đề)</option>
            </Select>
          </Field>

          <Field label="Chế độ ghi dữ liệu" htmlFor="batch-mode-select">
            <Select
              id="batch-mode-select"
              value={importMode}
              onChange={(e) => {
                setImportMode(e.target.value as BatchImportMode);
                setSummary(null);
              }}
            >
              <option value="insert_only">Insert Only (bỏ qua trùng)</option>
              <option value="upsert">Upsert (cập nhật trùng)</option>
              <option value="all_or_nothing">Validate All-or-Nothing</option>
            </Select>
          </Field>
        </div>

        <p className="text-xs text-muted">
          <strong className="text-fg">{MODE_DESCRIPTIONS[importMode].label}:</strong>{' '}
          {MODE_DESCRIPTIONS[importMode].desc}
        </p>

        {/* File Upload + Sample Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              className="sr-only"
              onChange={(e) => void handleFileChange(e)}
            />
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileUp className="size-3.5" aria-hidden />}
              onClick={() => fileInputRef.current?.click()}
            >
              Tải tệp .JSON / .CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Sparkles className="size-3.5" aria-hidden />}
              onClick={() => {
                setFormatHint('json');
                setRawText(BATCH_SAMPLE_TEMPLATES[activeEntity].json);
                setSummary(null);
              }}
            >
              Mẫu JSON
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<FileSpreadsheet className="size-3.5" aria-hidden />}
              onClick={() => {
                setFormatHint('csv');
                setRawText(BATCH_SAMPLE_TEMPLATES[activeEntity].csv);
                setSummary(null);
              }}
            >
              Mẫu CSV
            </Button>
          </div>
          {rawText && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRawText('');
                setSummary(null);
              }}
            >
              Xóa nội dung
            </Button>
          )}
        </div>

        <Field
          label="Dán dữ liệu JSON hoặc CSV để kiểm tra trước khi Import"
          htmlFor="batch-raw-input"
        >
          <Textarea
            id="batch-raw-input"
            rows={5}
            className="font-mono text-xs"
            placeholder="Dán mảng JSON ([{...}]) hoặc nội dung CSV kèm dòng tiêu đề..."
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setSummary(null);
            }}
          />
        </Field>

        {/* Parse Error Banner */}
        {report?.parseError && <Notice tone="danger">{report.parseError}</Notice>}

        {/* Execution Summary Banner */}
        {summary && (
          <Notice tone={summary.aborted ? 'danger' : 'success'} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {summary.aborted
                  ? 'Import bị hủy (Rollback an toàn)'
                  : 'Hoàn tất thực thi Import hàng loạt'}
              </p>
              <Badge tone={summary.aborted ? 'danger' : 'success'}>
                {summary.storage === 'supabase' ? 'Supabase DB' : 'Local CMS'}
              </Badge>
            </div>
            {summary.abortReason && <p className="text-sm">{summary.abortReason}</p>}
            <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4">
              <Stat label="Đã thêm (Inserted)" value={summary.inserted} />
              <Stat label="Đã cập nhật (Updated)" value={summary.updated} />
              <Stat label="Bỏ qua (Skipped)" value={summary.skipped} />
              <Stat label="Thất bại (Failed)" value={summary.failed} />
            </div>
          </Notice>
        )}

        {/* Interactive Validation Preview Table */}
        {report && !report.parseError && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Chip selected={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>
                  Tất cả ({report.counts.total})
                </Chip>
                <Chip selected={statusFilter === 'valid'} onClick={() => setStatusFilter('valid')}>
                  <CheckCircle2 className="size-3.5 text-success-fg" aria-hidden />
                  Hợp lệ ({report.counts.valid})
                </Chip>
                <Chip
                  selected={statusFilter === 'duplicate'}
                  onClick={() => setStatusFilter('duplicate')}
                >
                  <AlertTriangle className="size-3.5 text-warning-fg" aria-hidden />
                  Trùng lặp ({report.counts.duplicate})
                </Chip>
                <Chip
                  selected={statusFilter === 'invalid'}
                  onClick={() => setStatusFilter('invalid')}
                >
                  <XCircle className="size-3.5 text-danger-fg" aria-hidden />
                  Lỗi ({report.counts.invalid})
                </Chip>
              </div>
              <Badge tone="neutral">{report.sourceFormat.toUpperCase()}</Badge>
            </div>

            <div className="max-h-64 overflow-auto rounded-xl border border-line bg-surface">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 border-b border-line bg-surface-2 text-fg">
                  <tr>
                    <th className="w-14 px-3 py-2 font-semibold">Dòng</th>
                    <th className="w-32 px-3 py-2 font-semibold">Trạng thái</th>
                    <th className="px-3 py-2 font-semibold">Nội dung chính</th>
                    <th className="px-3 py-2 font-semibold">Chi tiết kiểm tra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredPreviewRows.map((row) => {
                    const rowToneClass =
                      row.status === 'valid'
                        ? 'bg-success-soft'
                        : row.status === 'duplicate'
                          ? 'bg-warning-soft'
                          : 'bg-danger-soft';
                    return (
                      <tr key={row.rowNumber} className={rowToneClass}>
                        <td className="tabular px-3 py-2 font-mono font-semibold text-fg">
                          #{row.rowNumber}
                        </td>
                        <td className="px-3 py-2">
                          {row.status === 'valid' && (
                            <Badge tone="success">
                              <CheckCircle2 className="size-3" aria-hidden />
                              Hợp lệ
                            </Badge>
                          )}
                          {row.status === 'duplicate' && (
                            <Badge tone="warning">
                              <AlertTriangle className="size-3" aria-hidden />
                              Trùng lặp
                            </Badge>
                          )}
                          {row.status === 'invalid' && (
                            <Badge tone="danger">
                              <XCircle className="size-3" aria-hidden />
                              Lỗi
                            </Badge>
                          )}
                        </td>
                        <td className="max-w-xs truncate px-3 py-2 font-medium text-fg">
                          {row.summaryLabel}
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {row.status === 'valid' && (
                            <span className="text-success-fg">Sẵn sàng ghi vào hệ thống</span>
                          )}
                          {row.status === 'duplicate' && (
                            <span className="text-warning-fg">
                              {row.duplicateOf}{' '}
                              {importMode === 'upsert' ? '→ Sẽ cập nhật' : '→ Sẽ bỏ qua'}
                            </span>
                          )}
                          {row.status === 'invalid' && (
                            <span className="text-danger-fg">{row.errors.join(' · ')}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
