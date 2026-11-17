import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { Button, Card, Field, Notice, Textarea } from '../ui';

export interface ImportedData {
  vocabularies: Record<string, unknown>[];
}

interface CustomDataImportProps {
  onDataImported: (data: ImportedData) => void;
}

const PROMPT_TEXT =
  'Hãy trích xuất và chuẩn hóa danh sách từ vựng tiếng Nhật lộn xộn dưới đây thành một mảng JSON.\nCấu trúc bắt buộc: [{"kanji": "", "hiragana": "", "hanViet": "", "meaning": "", "wordType": ""}].\nNếu không có Kanji thì để rỗng. Chỉ trả về duy nhất mảng JSON, không giải thích.\nDữ liệu của tôi: [DÁN TỪ VỰNG VÀO ĐÂY]';

export const CustomDataImport: React.FC<CustomDataImportProps> = ({ onDataImported }) => {
  const [aiText, setAiText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState<{ vocabCount: number } | null>(null);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(PROMPT_TEXT);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleImport = () => {
    setError('');
    setSuccessMsg(null);

    if (!aiText.trim()) return;

    try {
      const parsedData: unknown = JSON.parse(aiText);
      if (!Array.isArray(parsedData)) {
        throw new Error('Dữ liệu không phải là mảng JSON.');
      }

      const vocabularies = parsedData.map((item, index) => {
        const record =
          typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : {};
        return {
          ...record,
          id: record.id ?? `V${Date.now()}_${index}`,
        };
      });

      onDataImported({ vocabularies });
      setSuccessMsg({ vocabCount: vocabularies.length });
      setAiText('');
    } catch (err) {
      console.error('Lỗi parse JSON:', err);
      setError('Dữ liệu JSON không hợp lệ, vui lòng kiểm tra lại!');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card tone="muted" padding="md" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-fg">Hướng dẫn nhập dữ liệu</h3>
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
        <Field label="Dữ liệu JSON từ vựng" htmlFor="custom-json-input">
          <Textarea
            id="custom-json-input"
            rows={5}
            className="font-mono text-sm"
            placeholder="Dán mảng JSON từ vựng vào đây..."
            value={aiText}
            invalid={Boolean(error)}
            onChange={(e) => setAiText(e.target.value)}
          />
        </Field>

        {error && <Notice tone="danger">{error}</Notice>}
        {successMsg && (
          <Notice tone="success">
            Import thành công {successMsg.vocabCount} từ vựng.
          </Notice>
        )}

        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={!aiText.trim()}
            leftIcon={<Download className="size-4" aria-hidden />}
          >
            Nhập dữ liệu
          </Button>
        </div>
      </div>
    </div>
  );
};
