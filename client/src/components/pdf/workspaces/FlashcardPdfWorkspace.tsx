import React, { useMemo, useRef, useState } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/auth-context';
import { getPreferredVocabLevel } from '../../../data/vocabTextbooks';
import { useCurriculumSnapshot } from '../../../hooks/useCurriculumData';
import { getLiveUnitsForLevel, getLiveVocabForUnit } from '../../../services/curriculumStore';
import { useUserProgress } from '../../../hooks/useUserProgress';
import type { JLPTLevel, QuizSource } from '../../../types/quiz';
import { FontManager } from '../../../utils/fontManager';
import { getVocabularyDisplay } from '../../../utils/vocabularyHelpers';
import { Badge, Button, Card, Field, Notice, Select } from '../../ui';
import { FlashcardPdfBuilder, type FlashcardPdfLayout } from './FlashcardPdfBuilder';

const LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const FlashcardPdfWorkspace: React.FC = () => {
  const { user, studyLevel } = useAuth();
  const { progress } = useUserProgress();

  const [level, setLevel] = useState<JLPTLevel>(
    () => studyLevel ?? getPreferredVocabLevel(user?.id) ?? 'N3',
  );
  const [unitId, setUnitId] = useState<number>(1);
  const [source, setSource] = useState<QuizSource>('all');
  const [count, setCount] = useState<number>(16);
  const [layout, setLayout] = useState<FlashcardPdfLayout>('foldable');
  const [seed, setSeed] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const isExportingRef = useRef(false);
  const cmsSnapshot = useCurriculumSnapshot();

  const activeUnits = getLiveUnitsForLevel(cmsSnapshot, level);

  const selectedCards = useMemo(() => {
    const rawList = getLiveVocabForUnit(cmsSnapshot, level, unitId);
    let filtered = [...rawList];

    if (source === 'starred') {
      const starredSet = new Set(progress.starredWords);
      filtered = filtered.filter((w) => starredSet.has(w.id));
    } else if (source === 'wrong') {
      const wrongSet = new Set(Object.keys(progress.wrongWords).map(Number));
      filtered = filtered.filter((w) => wrongSet.has(w.id));
    }

    if (seed > 0) {
      for (let i = filtered.length - 1; i > 0; i--) {
        const x = Math.sin(seed + i) * 10000;
        const j = Math.floor((x - Math.floor(x)) * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
      }
    }

    return count > 0 ? filtered.slice(0, count) : filtered;
  }, [cmsSnapshot, count, level, progress.starredWords, progress.wrongWords, seed, source, unitId]);

  const handleLevelChange = (nextLevel: JLPTLevel) => {
    setLevel(nextLevel);
    setUnitId(getLiveUnitsForLevel(cmsSnapshot, nextLevel)[0]?.id || 1);
  };

  const handlePrint = async () => {
    if (selectedCards.length === 0 || isExportingRef.current) return;
    isExportingRef.current = true;
    setIsGenerating(true);

    let fallbackTimer = 0;
    const finishPrint = () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('afterprint', finishPrint);
      setIsGenerating(false);
      isExportingRef.current = false;
    };

    try {
      await FontManager.ensureReady();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });

      window.addEventListener('afterprint', finishPrint, { once: true });
      fallbackTimer = window.setTimeout(finishPrint, 1500);
      window.print();
    } catch (error) {
      console.error('Lỗi khi in PDF Flashcard:', error);
      finishPrint();
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card padding="md" className="print:hidden">
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Trình độ" htmlFor="pdf-fc-level">
            <Select
              id="pdf-fc-level"
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

          <Field label="Bài học" htmlFor="pdf-fc-unit">
            <Select
              id="pdf-fc-unit"
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

          <Field label="Nguồn thẻ" htmlFor="pdf-fc-source">
            <Select
              id="pdf-fc-source"
              value={source}
              onChange={(e) => setSource(e.target.value as QuizSource)}
            >
              <option value="all">Tất cả trong Unit</option>
              <option value="starred">Chỉ từ đã lưu (★)</option>
              <option value="wrong">Từ hay sai</option>
            </Select>
          </Field>

          <Field label="Số lượng" htmlFor="pdf-fc-count">
            <Select
              id="pdf-fc-count"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              <option value={8}>8 thẻ (1 tờ 2 mặt)</option>
              <option value={16}>16 thẻ</option>
              <option value={24}>24 thẻ</option>
              <option value={0}>Tất cả</option>
            </Select>
          </Field>

          <Field label="Kiểu dàn trang A4" htmlFor="pdf-fc-layout">
            <Select
              id="pdf-fc-layout"
              value={layout}
              onChange={(e) => setLayout(e.target.value as FlashcardPdfLayout)}
            >
              <option value="foldable">Thẻ gập đôi (1 mặt)</option>
              <option value="double-sided">In 2 mặt chuẩn A4</option>
            </Select>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="size-4" aria-hidden />}
            onClick={() => setSeed((s) => s + 1)}
            disabled={selectedCards.length === 0}
          >
            Trộn thứ tự
          </Button>
          <Button
            variant="primary"
            loading={isGenerating}
            disabled={selectedCards.length === 0}
            leftIcon={<Printer className="size-4" aria-hidden />}
            onClick={handlePrint}
          >
            In PDF Flashcard
          </Button>
        </div>
      </Card>

      <Card padding="lg" className="space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-fg">Bản xem trước Flashcard</h2>
            <p className="text-sm text-muted">
              Mặt trước: Kanji + Cấp độ · Mặt sau: Hiragana + Hán Việt + Nghĩa.
            </p>
          </div>
          <Badge tone="primary" className="tabular">
            {selectedCards.length} thẻ
          </Badge>
        </div>

        {selectedCards.length === 0 ? (
          <Notice tone="warning">
            Không có từ vựng nào khớp với bộ lọc hiện tại. Vui lòng chọn Unit N3 Unit 1 hoặc đổi nguồn thẻ.
          </Notice>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {selectedCards.slice(0, 8).map((card) => {
              const display = getVocabularyDisplay(card);
              return (
                <div
                  key={card.id}
                  className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-surface-2/60"
                >
                  <div className="flex flex-col justify-between border-r border-dashed border-line-strong p-3">
                    <Badge tone="primary" className="self-start">
                      {card.level}
                    </Badge>
                    <p lang="ja" className="py-2 text-center text-xl font-bold text-fg">
                      {display.primaryText}
                    </p>
                    <span className="text-right text-[11px] text-muted">{card.wordType}</span>
                  </div>
                  <div className="flex flex-col justify-center gap-0.5 p-3 text-center">
                    <p lang="ja" className="text-sm font-semibold text-primary-fg">
                      {display.hiragana}
                    </p>
                    {display.hasKanji && display.hanViet && (
                      <p className="text-[11px] font-medium text-muted uppercase">{display.hanViet}</p>
                    )}
                    <p className="mt-1 text-xs font-medium text-fg">{card.meaning}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {createPortal(
        <FlashcardPdfBuilder cards={selectedCards} layout={layout} isGenerating={isGenerating} />,
        document.body,
      )}
    </div>
  );
};
