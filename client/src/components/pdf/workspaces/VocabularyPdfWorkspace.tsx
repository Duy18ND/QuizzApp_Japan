import React, { useRef, useState } from 'react';
import { CheckCircle2, FileDown, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { DraggableColumnList, type ColumnOption } from '../DraggableColumnList';
import { CustomDataImport } from '../../common/CustomDataImport';
import { VocabularyPdfBuilder } from './VocabularyPdfBuilder';
import { useCurriculumSnapshot } from '../../../hooks/useCurriculumData';
import { getLiveUnitsForLevel, getLiveVocabForUnit } from '../../../services/curriculumStore';
import { useUserProgress } from '../../../hooks/useUserProgress';
import { FontManager } from '../../../utils/fontManager';
import type { JLPTLevel, QuizRangeType, QuizSource } from '../../../types/quiz';
import { Button, Card, Field, Input, Notice, Select, Tabs, useToast } from '../../ui';

interface ExportWord {
  id: string;
  kanji: string;
  hanViet: string;
  hiragana: string;
  meaning: string;
}

const DEFAULT_COLUMNS: ColumnOption[] = [
  { id: 'kanji', label: 'Kanji', showContent: false },
  { id: 'hanviet', label: 'Âm Hán Việt', showContent: false },
  { id: 'hiragana', label: 'Hiragana', showContent: false },
  { id: 'meaning', label: 'Nghĩa', showContent: false },
];

const LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const VocabularyPdfWorkspace: React.FC = () => {
  const { toast } = useToast();
  const { progress } = useUserProgress();
  const [columns, setColumns] = useState<ColumnOption[]>(DEFAULT_COLUMNS);
  const [isExporting, setIsExporting] = useState(false);
  const [exportWords, setExportWords] = useState<ExportWord[]>([]);
  const [exportError, setExportError] = useState<string | null>(null);
  const isExportingRef = useRef(false);

  const [tab, setTab] = useState<'system' | 'custom'>('system');
  const [level, setLevel] = useState<JLPTLevel>('N3');
  const [unitId, setUnitId] = useState<number>(1);
  const [source, setSource] = useState<QuizSource>('all');
  const [rangeType, setRangeType] = useState<QuizRangeType>('fixed');
  const [customRange, setCustomRange] = useState({ start: 1, end: 20 });
  const [manualWords, setManualWords] = useState<Record<string, unknown>[]>([]);
  const cmsSnapshot = useCurriculumSnapshot();

  const activeUnits = getLiveUnitsForLevel(cmsSnapshot, level);

  const handleLevelChange = (newLevel: JLPTLevel) => {
    const defaultUnitId = getLiveUnitsForLevel(cmsSnapshot, newLevel)[0]?.id || 1;
    setLevel(newLevel);
    setUnitId(defaultUnitId);
  };

  const handleExport = async () => {
    setExportError(null);

    if (!columns.some((col) => col.showContent)) {
      const msg = 'Vui lòng tích chọn hiển thị nội dung cho ít nhất 1 cột trước khi xuất PDF.';
      setExportError(msg);
      toast({ title: 'Chưa chọn nội dung cột', description: msg, tone: 'warning' });
      return;
    }

    if (isExportingRef.current) return;
    isExportingRef.current = true;
    setIsExporting(true);

    try {
      await FontManager.ensureReady();

      let exportWordsArr: ExportWord[] = [];

      if (tab === 'system') {
        const targetWordIds =
          source === 'starred'
            ? progress.starredWords
            : source === 'wrong'
              ? Object.keys(progress.wrongWords).map(Number)
              : [];

        let words = getLiveVocabForUnit(cmsSnapshot, level, unitId);

        if (words.length === 0) {
          throw new Error(`Dữ liệu cho ${level} - Unit ${unitId} chưa được nạp sẵn offline.`);
        }

        if (source !== 'all') {
          words =
            targetWordIds.length > 0
              ? words.filter((w) => targetWordIds.includes(Number(w.id)))
              : [];
        }

        if (rangeType === 'custom') {
          const startIdx = Math.max(0, customRange.start - 1);
          const endIdx = customRange.end;
          words = words.slice(startIdx, endIdx);
        }

        exportWordsArr = words.map((w) => ({
          id: String(w.id),
          kanji: String(w.kanji || ''),
          hanViet: String(w.hanViet || ''),
          hiragana: String(w.hiragana || ''),
          meaning: String(w.meaning || ''),
        }));
      } else {
        const validManual = manualWords.filter(
          (w) => Boolean(w.kanji || w.hiragana || w.meaning),
        );
        if (validManual.length === 0) {
          throw new Error('Vui lòng thêm ít nhất một từ vựng.');
        }

        exportWordsArr = validManual.map((w, idx) => ({
          id: String(w.id ?? idx),
          kanji: String(w.kanji || ''),
          hanViet: String(w.hanViet || w.hanviet || ''),
          hiragana: String(w.hiragana || ''),
          meaning: String(w.meaning || ''),
        }));
      }

      setExportWords(exportWordsArr);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });

      window.print();
    } catch (error: unknown) {
      console.error('Lỗi khi xuất PDF:', error);
      const msg =
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi xuất PDF. Vui lòng thử lại.';
      setExportError(msg);
      toast({ title: 'Không thể xuất PDF', description: msg, tone: 'danger' });
    } finally {
      setIsExporting(false);
      isExportingRef.current = false;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Nguồn dữ liệu */}
        <Card padding="lg" className="space-y-5">
          <h2 className="text-base font-semibold text-fg">Nguồn dữ liệu</h2>

          <Tabs
            aria-label="Nguồn từ vựng"
            variant="pill"
            items={[
              { value: 'system', label: 'Hệ thống' },
              { value: 'custom', label: 'Tùy chỉnh' },
            ]}
            value={tab}
            onChange={setTab}
            className="border-b border-line pb-3"
          />

          {tab === 'system' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[112px_1fr]">
                <Field label="Trình độ" htmlFor="pdf-vocab-level">
                  <Select
                    id="pdf-vocab-level"
                    value={level}
                    onChange={(e) => handleLevelChange(e.target.value as JLPTLevel)}
                  >
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Bài học" htmlFor="pdf-vocab-unit">
                  <Select
                    id="pdf-vocab-unit"
                    value={unitId}
                    onChange={(e) => setUnitId(Number(e.target.value))}
                  >
                    {activeUnits.map((unit) => (
                      <option key={unit.id} value={unit.id} disabled={unit.totalWords === 0}>
                        {unit.name} ({unit.totalWords > 0 ? `${unit.totalWords} từ` : 'Sắp ra mắt'})
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field label="Phạm vi từ vựng" htmlFor="pdf-vocab-source">
                <Select
                  id="pdf-vocab-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value as QuizSource)}
                >
                  <option value="all">Tất cả từ vựng trong Unit</option>
                  <option value="starred">Chỉ từ đã lưu (★)</option>
                  <option value="wrong">Từ làm sai</option>
                </Select>
              </Field>

              <div className="space-y-3">
                <Field label="STT (Bắt đầu – Kết thúc)" htmlFor="pdf-vocab-range">
                  <Select
                    id="pdf-vocab-range"
                    value={rangeType}
                    onChange={(e) => setRangeType(e.target.value as QuizRangeType)}
                  >
                    <option value="fixed">Tất cả</option>
                    <option value="custom">Tùy chỉnh</option>
                  </Select>
                </Field>

                {rangeType === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      min={1}
                      aria-label="STT bắt đầu"
                      value={customRange.start}
                      onChange={(e) =>
                        setCustomRange({
                          ...customRange,
                          start: parseInt(e.target.value, 10) || 1,
                        })
                      }
                    />
                    <Input
                      type="number"
                      min={1}
                      aria-label="STT kết thúc"
                      value={customRange.end}
                      onChange={(e) =>
                        setCustomRange({
                          ...customRange,
                          end: parseInt(e.target.value, 10) || 1,
                        })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <CustomDataImport onDataImported={(data) => setManualWords(data.vocabularies)} />
              {manualWords.length > 0 && (
                <Notice tone="success" className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 font-medium">
                    <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                    Đã tải {manualWords.length} từ vựng
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 className="size-3.5" aria-hidden />}
                    onClick={() => setManualWords([])}
                  >
                    Xóa
                  </Button>
                </Notice>
              )}
            </div>
          )}
        </Card>

        {/* Cấu hình cột */}
        <div className="flex flex-col gap-6">
          <Card padding="lg" className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-fg">Cấu hình cột</h2>
              <p className="mt-1 text-sm text-muted">
                Kéo thả để sắp xếp vị trí các cột. Bỏ chọn nội dung nếu muốn chừa khoảng trống để
                luyện viết.
              </p>
            </div>
            <DraggableColumnList columns={columns} onColumnsChange={setColumns} />
          </Card>

          {exportError && <Notice tone="danger">{exportError}</Notice>}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isExporting}
            leftIcon={<FileDown className="size-5" aria-hidden />}
            onClick={handleExport}
          >
            {isExporting ? 'Đang tạo PDF...' : 'Xuất PDF'}
          </Button>
        </div>
      </div>

      {/* Hidden Print Container via Portal */}
      {createPortal(
        <VocabularyPdfBuilder words={exportWords} columns={columns} isGenerating={true} />,
        document.body,
      )}
    </div>
  );
};
