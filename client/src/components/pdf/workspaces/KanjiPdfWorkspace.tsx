import React, { useMemo, useRef, useState } from 'react';
import { Printer, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { KanjiPdfBuilder } from './KanjiPdfBuilder';
import { useAuth } from '../../../context/auth-context';
import { getPreferredVocabLevel } from '../../../data/vocabTextbooks';
import { useCurriculumSnapshot } from '../../../hooks/useCurriculumData';
import { getLiveKanjis } from '../../../services/curriculumStore';
import { FontManager } from '../../../utils/fontManager';
import { Badge, Button, Card, Field, Select } from '../../ui';

type KanjiPdfMode = 'mode1' | 'mode2' | 'mode3';

export const KanjiPdfWorkspace: React.FC = () => {
  const { user, studyLevel } = useAuth();
  const cmsSnapshot = useCurriculumSnapshot();
  const kanjiList = useMemo(() => getLiveKanjis(cmsSnapshot), [cmsSnapshot]);
  const [level, setLevel] = useState<string>(
    () => studyLevel ?? getPreferredVocabLevel(user?.id) ?? 'N3',
  );
  const [count, setCount] = useState<number>(20);
  const [mode, setMode] = useState<KanjiPdfMode>('mode1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState(0);
  const isExportingRef = useRef(false);

  const selectedKanji = useMemo(() => {
    const filtered = kanjiList.filter((k) => level === 'All' || k.jlptLevel === level);

    let currentIndex = filtered.length;
    let randomIndex = 0;
    const array = [...filtered];

    const random = () => {
      const x = Math.sin(seed + currentIndex) * 10000;
      return x - Math.floor(x);
    };

    while (currentIndex !== 0) {
      randomIndex = Math.floor(random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array.slice(0, count);
  }, [kanjiList, level, count, seed]);

  const handlePrint = async () => {
    if (selectedKanji.length === 0 || isExportingRef.current) return;
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
      console.error('Lỗi khi in PDF Kanji:', error);
      finishPrint();
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Controls Bar */}
      <Card padding="md" className="print:hidden">
        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Cấp độ" htmlFor="pdf-kanji-level">
            <Select
              id="pdf-kanji-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="All">Tất cả Level</option>
              <option value="N5">N5</option>
              <option value="N4">N4</option>
              <option value="N3">N3</option>
              <option value="N2">N2</option>
              <option value="N1">N1</option>
            </Select>
          </Field>

          <Field label="Số lượng" htmlFor="pdf-kanji-count">
            <Select
              id="pdf-kanji-count"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              <option value={10}>10 chữ</option>
              <option value={20}>20 chữ</option>
              <option value={30}>30 chữ</option>
              <option value={50}>50 chữ</option>
            </Select>
          </Field>

          <Field label="Chế độ" htmlFor="pdf-kanji-mode">
            <Select
              id="pdf-kanji-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as KanjiPdfMode)}
            >
              <option value="mode1">Đầy đủ (Học + Viết)</option>
              <option value="mode2">Luyện viết nhanh</option>
              <option value="mode3">Kiểm tra trí nhớ</option>
            </Select>
          </Field>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setSeed((s) => s + 1)}
              leftIcon={<RefreshCw className="size-4" aria-hidden />}
              className="flex-1"
            >
              Trộn lại
            </Button>
            <Button
              variant="primary"
              loading={isGenerating}
              onClick={handlePrint}
              leftIcon={<Printer className="size-4" aria-hidden />}
              className="flex-1"
            >
              In PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Preview Area */}
      <Card padding="lg" className="space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-fg">Bản xem trước</h2>
            <p className="text-sm text-muted">
              Chỉ hiển thị tóm tắt. Khi in sẽ ra định dạng chuẩn A4.
            </p>
          </div>
          <Badge tone="primary" className="tabular">
            {selectedKanji.length} chữ Kanji
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-line-strong bg-surface-2 p-4">
          {selectedKanji.map((k) => (
            <span
              key={k.id}
              lang="ja"
              className="grid size-11 place-items-center rounded-lg border border-line bg-surface text-xl font-bold text-fg shadow-card"
            >
              {k.kanji}
            </span>
          ))}
        </div>
      </Card>

      {/* Hidden PDF Builder Container via Portal (Only visible during print) */}
      {createPortal(
        <KanjiPdfBuilder kanjiList={selectedKanji} mode={mode} isGenerating={isGenerating} />,
        document.body,
      )}
    </div>
  );
};
