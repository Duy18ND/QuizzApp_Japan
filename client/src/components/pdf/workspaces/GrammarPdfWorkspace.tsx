import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Book, Download } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/auth-context';
import { useCurriculumSnapshot } from '../../../hooks/useCurriculumData';
import { getLiveGrammarBooks } from '../../../services/curriculumStore';
import { GrammarPdfBuilder } from './GrammarPdfBuilder';
import { FontManager } from '../../../utils/fontManager';
import { generateGrammarPdfDataset } from '../../../data/pdf/grammarPdfGenerator';
import type { GrammarPdfConfig, GrammarPdfSet, PdfMode } from '../../../data/pdf/grammarPdfGenerator';
import { Button, Card, Checkbox, Chip, Field, Input, Select } from '../../ui';

type CountOption = number | 'all' | 'custom';
const COUNT_OPTIONS: (number | 'all')[] = [2, 3, 5, 10, 'all'];

export const GrammarPdfWorkspace: React.FC = () => {
  const { studyLevel } = useAuth();
  const [searchParams] = useSearchParams();
  const cmsSnapshot = useCurriculumSnapshot();
  const grammarBooks = useMemo(() => getLiveGrammarBooks(cmsSnapshot), [cmsSnapshot]);
  const preferredLevelBook = studyLevel
    ? grammarBooks.find((b) => b.level === studyLevel)
    : undefined;
  const initBookId =
    searchParams.get('bookId') || preferredLevelBook?.id || grammarBooks[0]?.id || '';
  const initChapterId =
    searchParams.get('chapterId') ||
    grammarBooks.find((b) => b.id === initBookId)?.chapters[0]?.id ||
    '';
  const initGrammarId = searchParams.get('grammarId') || '';

  const [selectedBookId, setSelectedBookId] = useState<string>(initBookId);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(initChapterId);

  const selectedBook = useMemo(
    () => grammarBooks.find((b) => b.id === selectedBookId),
    [grammarBooks, selectedBookId],
  );
  const selectedChapter = useMemo(
    () => selectedBook?.chapters.find((c) => c.id === selectedChapterId),
    [selectedBook, selectedChapterId],
  );

  const rules = useMemo(() => selectedChapter?.grammars || [], [selectedChapter]);

  const [selectedRules, setSelectedRules] = useState<string[]>(() => {
    if (initGrammarId) return [initGrammarId];
    const initialBook = grammarBooks.find((b) => b.id === initBookId);
    const initialChapter = initialBook?.chapters.find((c) => c.id === initChapterId);
    return initialChapter ? initialChapter.grammars.map((g) => g.id) : [];
  });

  const [pdfMode, setPdfMode] = useState<PdfMode>('vi_to_ja');
  const [questionCount, setQuestionCount] = useState<CountOption>(5);
  const [customCount, setCustomCount] = useState<number | ''>('');
  const [showHiragana, setShowHiragana] = useState<boolean>(false);
  const [generateAnswer, setGenerateAnswer] = useState(true);

  const [generatedSets, setGeneratedSets] = useState<GrammarPdfSet[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const lastConfigRef = useRef<string>('');
  const isExportingRef = useRef(false);

  const getConfigFingerprint = useCallback(() => {
    return JSON.stringify({
      rules: [...selectedRules].sort(),
      mode: pdfMode,
      count: questionCount === 'custom' ? customCount : questionCount,
      showHiragana,
    });
  }, [selectedRules, pdfMode, questionCount, customCount, showHiragana]);

  const handleToggleRule = (id: string) => {
    setSelectedRules((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const handleExport = async () => {
    if (selectedRules.length === 0) return;
    if (isExportingRef.current) return;

    isExportingRef.current = true;
    setIsGenerating(true);

    try {
      await FontManager.ensureReady();

      const currentConfig = getConfigFingerprint();
      const needsRegenerate =
        currentConfig !== lastConfigRef.current || generatedSets.length === 0;

      if (needsRegenerate) {
        let finalCount: number | 'all' = 10;
        if (questionCount === 'all') finalCount = 'all';
        else if (questionCount === 'custom') finalCount = customCount === '' ? 10 : customCount;
        else finalCount = questionCount;

        const config: GrammarPdfConfig = {
          mode: pdfMode,
          scope: 'grammar',
          count: finalCount,
          grammarIds: selectedRules,
          showHiragana,
        };

        const sets = generateGrammarPdfDataset(config);
        setGeneratedSets(sets);
        lastConfigRef.current = currentConfig;

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });
      }

      window.print();
    } finally {
      setIsGenerating(false);
      isExportingRef.current = false;
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Giáo trình & Ngữ pháp */}
        <Card padding="lg" className="space-y-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
            <Book className="size-4 text-primary-fg" aria-hidden />
            Chọn giáo trình
          </h2>

          <Field label="Giáo trình" htmlFor="pdf-grammar-book">
            <Select
              id="pdf-grammar-book"
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
            >
              {grammarBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.level})
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Chương / Bài" htmlFor="pdf-grammar-chapter">
            <Select
              id="pdf-grammar-chapter"
              value={selectedChapterId}
              onChange={(e) => {
                setSelectedChapterId(e.target.value);
                setSelectedRules([]);
              }}
            >
              {selectedBook?.chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          </Field>

          <div className="space-y-2 border-t border-line pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-fg">Chọn ngữ pháp</p>
              <div className="flex gap-3 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setSelectedRules(rules.map((r) => r.id))}
                  className="text-primary-fg hover:underline"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRules([])}
                  className="text-danger-fg hover:underline"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            <div className="max-h-64 divide-y divide-line overflow-y-auto rounded-lg border border-line bg-surface-2">
              {rules.map((rule) => (
                <div key={rule.id} className="px-3.5 py-2.5">
                  <Checkbox
                    checked={selectedRules.includes(rule.id)}
                    onChange={() => handleToggleRule(rule.id)}
                    label={
                      <span>
                        <span lang="ja" className="font-semibold text-fg">
                          {rule.name}
                        </span>
                        <span className="block text-xs text-muted">{rule.meaning}</span>
                      </span>
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Cấu hình PDF */}
        <div className="flex flex-col gap-6">
          <Card padding="lg" className="space-y-5">
            <h2 className="text-base font-semibold text-fg">Cấu hình bài tập PDF</h2>

            <div className="space-y-2">
              <p className="text-sm font-medium text-fg">Chiều dịch</p>
              <div className="flex flex-wrap gap-2">
                <Chip selected={pdfMode === 'vi_to_ja'} onClick={() => setPdfMode('vi_to_ja')}>
                  Việt → Nhật
                </Chip>
                <Chip selected={pdfMode === 'ja_to_vi'} onClick={() => setPdfMode('ja_to_vi')}>
                  Nhật → Việt
                </Chip>
              </div>
            </div>

            <div className="space-y-2 border-t border-line pt-4">
              <p className="text-sm font-medium text-fg">Số câu hỏi (mỗi ngữ pháp)</p>
              <div className="flex flex-wrap items-center gap-2">
                {COUNT_OPTIONS.map((num) => (
                  <Chip
                    key={num}
                    selected={questionCount === num}
                    onClick={() => {
                      setQuestionCount(num);
                      setCustomCount('');
                    }}
                  >
                    {num === 'all' ? 'Tất cả' : num}
                  </Chip>
                ))}
                <Chip
                  selected={questionCount === 'custom'}
                  onClick={() => setQuestionCount('custom')}
                >
                  Tự nhập
                </Chip>
                {questionCount === 'custom' && (
                  <Input
                    type="number"
                    min={1}
                    aria-label="Số câu hỏi tùy chỉnh"
                    value={customCount}
                    onChange={(e) =>
                      setCustomCount(e.target.value ? parseInt(e.target.value, 10) : '')
                    }
                    placeholder="VD: 15"
                    className="w-24"
                  />
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-line pt-4">
              <Checkbox
                checked={showHiragana}
                onChange={setShowHiragana}
                label={
                  <span>
                    <span className="font-medium text-fg">Hiển thị Hiragana hỗ trợ</span>
                    <span className="block text-xs text-muted">
                      In thêm dòng Hiragana gợi ý (chỉ áp dụng cho loại Việt → Nhật).
                    </span>
                  </span>
                }
              />

              <Checkbox
                checked={generateAnswer}
                onChange={setGenerateAnswer}
                label={<span className="font-medium text-fg">Tạo kèm Answer Key (Đáp án)</span>}
              />
            </div>
          </Card>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isGenerating}
            disabled={selectedRules.length === 0}
            leftIcon={<Download className="size-5" aria-hidden />}
            onClick={handleExport}
          >
            {isGenerating ? 'Đang tạo PDF...' : 'Xuất PDF Worksheet'}
          </Button>
        </div>
      </div>

      {/* Hidden Print Container via Portal */}
      {createPortal(
        <GrammarPdfBuilder
          bookId={selectedBookId}
          chapterId={selectedChapterId}
          generatedSets={generatedSets}
          generateAnswer={generateAnswer}
          linesCount={1}
          pdfMode={pdfMode}
        />,
        document.body,
      )}
    </div>
  );
};
