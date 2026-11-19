import React, { useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileUp,
  XCircle,
} from 'lucide-react';
import { validateBatchImport } from '../../utils/batchImportUtils';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { getLiveAllVocabulary } from '../../services/curriculumStore';
import { Badge, Button, Card, Field, Notice, Textarea } from '../ui';

export interface ImportedData {
  vocabularies: Record<string, unknown>[];
}

interface CustomDataImportProps {
  onDataImported: (data: ImportedData) => void;
}

const PROMPT_TEXT =
  'Hãy trích xuất và chuẩn hóa danh sách từ vựng tiếng Nhật lộn xộn dưới đây thành một mảng JSON.\nCấu trúc bắt buộc: [{"kanji": "", "hiragana": "", "hanViet": "", "meaning": "", "wordType": ""}].\nNếu không có Kanji thì để rỗng. Chỉ trả về duy nhất mảng JSON, không giải thích.\nDữ liệu của tôi: [DÁN TỪ VỰNG VÀO ĐÂY]';

export const CustomDataImport: React.FC<CustomDataImportProps> = ({ onDataImported }) => {
  const [rawText, setRawText] = useState('');
  const [formatHint, setFormatHint] = useState<'auto' | 'json' | 'csv'>('auto');
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState<{ vocabCount: number; skippedInvalid: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cmsSnapshot = useCurriculumSnapshot();
  const existingVocab = useMemo(
    () => ({
      vocabularies: getLiveAllVocabulary(cmsSnapshot),
      kanjis: [],
      grammars: [],
      jlptQuestions: [],
    }),
    [cmsSnapshot],
  );

  const report = useMemo(() => {
    if (!rawText.trim()) return null;
    return validateBatchImport(rawText, 'vocabulary', existingVocab, formatHint);
  }, [rawText, existingVocab, formatHint]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(PROMPT_TEXT);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    setFormatHint(isCsv ? 'csv' : file.name.toLowerCase().endsWith('.json') ? 'json' : 'auto');
    setRawText(text);
    setError('');
    setSuccessMsg(null);
    event.target.value = '';
  };

  const handleImport = () => {
    setError('');
    setSuccessMsg(null);
    if (!rawText.trim() || !report) return;

    if (report.parseError) {
      setError(report.parseError);
      return;
    }

    const acceptedRows = report.rows
      .filter((r) => (r.status === 'valid' || r.status === 'duplicate') && r.normalized !== null)
      .map((r) => r.normalized as unknown as Record<string, unknown>);

    if (acceptedRows.length === 0) {
      setError('Không có dòng từ vựng nào hợp lệ để nhập. Vui lòng kiểm tra cột lỗi bên dưới.');
      return;
    }

    onDataImported({ vocabularies: acceptedRows });
    setSuccessMsg({
      vocabCount: acceptedRows.length,
      skippedInvalid: report.counts.invalid,
    });
    setRawText('');
  };

  return (
    <div className="flex flex-col gap-4">
      <Card tone="muted" padding="md" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-fg">Hướng dẫn nhập dữ liệu (JSON / CSV)</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyPrompt}
            leftIcon={
              isCopied ? (
                <Check className="size-3.5 text-success-fg" aria-hidden />
              ) : (
                <Copy className="size-3.5" aria-hidden />
              )
            }
          >
            {isCopied ? 'Đã copy' : 'Copy prompt'}
          </Button>
        </div>

        <pre className="rounded-lg border border-line bg-surface p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted">
          {PROMPT_TEXT}
        </pre>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,application/json,text/csv"
            className="sr-only"
            onChange={(e) => void handleFileUpload(e)}
          />
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FileUp className="size-3.5" aria-hidden />}
            onClick={() => fileInputRef.current?.click()}
          >
            Tải tệp .JSON / .CSV
          </Button>
          {report && !report.parseError && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="success">
                <CheckCircle2 className="size-3" aria-hidden />
                {report.counts.valid} hợp lệ
              </Badge>
              {report.counts.duplicate > 0 && (
                <Badge tone="warning">
                  <AlertTriangle className="size-3" aria-hidden />
                  {report.counts.duplicate} trùng kho
                </Badge>
              )}
              {report.counts.invalid > 0 && (
                <Badge tone="danger">
                  <XCircle className="size-3" aria-hidden />
                  {report.counts.invalid} lỗi
                </Badge>
              )}
            </div>
          )}
        </div>

        <Field label="Dữ liệu JSON hoặc CSV từ vựng" htmlFor="custom-json-input">
          <Textarea
            id="custom-json-input"
            rows={5}
            className="font-mono text-xs"
            placeholder="Dán mảng JSON hoặc CSV từ vựng vào đây..."
            value={rawText}
            invalid={Boolean(error || report?.parseError)}
            onChange={(e) => {
              setRawText(e.target.value);
              setError('');
            }}
          />
        </Field>

        {report?.parseError && <Notice tone="danger">{report.parseError}</Notice>}

        {report && !report.parseError && report.counts.invalid > 0 && (
          <Notice tone="warning" className="text-xs">
            Phát hiện {report.counts.invalid} dòng thiếu dữ liệu:{' '}
            {report.rows
              .filter((r) => r.status === 'invalid')
              .slice(0, 3)
              .map((r) => `Dòng #${r.rowNumber} (${r.errors.join(', ')})`)
              .join('; ')}
          </Notice>
        )}

        {error && <Notice tone="danger">{error}</Notice>}
        {successMsg && (
          <Notice tone="success">
            Import thành công {successMsg.vocabCount} từ vựng
            {successMsg.skippedInvalid > 0
              ? ` (đã bỏ qua ${successMsg.skippedInvalid} dòng lỗi).`
              : '.'}
          </Notice>
        )}

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={!rawText.trim() || Boolean(report?.parseError)}
            leftIcon={<Download className="size-4" aria-hidden />}
          >
            Nhập dữ liệu ({report && !report.parseError ? report.counts.valid + report.counts.duplicate : 0})
          </Button>
        </div>
      </div>
    </div>
  );
};
