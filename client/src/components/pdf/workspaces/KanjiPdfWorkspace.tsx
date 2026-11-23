import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CheckSquare, Printer, RefreshCw, Star } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { KanjiPdfBuilder } from './KanjiPdfBuilder';
import { useAuth } from '../../../context/auth-context';
import { getPreferredVocabLevel } from '../../../data/vocabTextbooks';
import { useCurriculumSnapshot } from '../../../hooks/useCurriculumData';
import { cn } from '../../../lib/cn';
import { getLiveKanjis } from '../../../services/curriculumStore';
import {
  loadSavedKanjiIds,
  SAVED_KANJI_SYNC_EVENT,
  toggleSavedKanjiId,
} from '../../../services/kanjiBookmarkService';
import { useAppSelector } from '../../../store/hooks';
import { FontManager } from '../../../utils/fontManager';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  SearchInput,
  Select,
  buttonStyles,
} from '../../ui';

type KanjiPdfMode = 'mode1' | 'mode2' | 'mode3';
type KanjiSourceMode = 'by_lesson' | 'custom' | 'saved' | 'random';

export const KanjiPdfWorkspace: React.FC = () => {
  const { user, studyLevel } = useAuth();
  const cmsSnapshot = useCurriculumSnapshot();
  const kanjiList = useMemo(() => getLiveKanjis(cmsSnapshot), [cmsSnapshot]);
  const kanjiProgress = useAppSelector((state) => state.kanji.progress);

  const [sourceMode, setSourceMode] = useState<KanjiSourceMode>('by_lesson');
  const [level, setLevel] = useState<string>(
    () => studyLevel ?? getPreferredVocabLevel(user?.id) ?? 'N5',
  );
  const [lessonSize, setLessonSize] = useState<number>(5);
  const [lessonNumber, setLessonNumber] = useState<number>(1);
  const [count, setCount] = useState<number>(10);
  const [mode, setMode] = useState<KanjiPdfMode>('mode1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [seed, setSeed] = useState(0);
  const [customSearch, setCustomSearch] = useState('');
  const [customPickedIds, setCustomPickedIds] = useState<string[]>([]);
  const [savedFilter, setSavedFilter] = useState<'starred' | 'learned' | 'practiced'>('starred');
  const [savedKanjiIds, setSavedKanjiIds] = useState<string[]>(() => loadSavedKanjiIds(user?.id));
  const isExportingRef = useRef(false);

  useEffect(() => {
    const sync = () => setSavedKanjiIds(loadSavedKanjiIds(user?.id));
    sync();
    window.addEventListener(SAVED_KANJI_SYNC_EVENT, sync);
    return () => window.removeEventListener(SAVED_KANJI_SYNC_EVENT, sync);
  }, [user?.id]);

  const levelKanji = useMemo(
    () => kanjiList.filter((k) => level === 'All' || k.jlptLevel === level),
    [kanjiList, level],
  );

  // Build Lesson Groups (Bài 1, Bài 2, ...) for `by_lesson` mode
  const lessonGroups = useMemo(() => {
    const groups: Array<{ lessonNum: number; label: string; items: typeof levelKanji }> = [];
    const safeSize = Math.max(5, lessonSize);
    for (let i = 0; i < levelKanji.length; i += safeSize) {
      const slice = levelKanji.slice(i, i + safeSize);
      const num = Math.floor(i / safeSize) + 1;
      const previewChars = slice
        .slice(0, 5)
        .map((k) => k.kanji)
        .join(' · ');
      groups.push({
        lessonNum: num,
        label: `Bài ${num} (${slice.length} chữ: ${previewChars}${slice.length > 5 ? '…' : ''})`,
        items: slice,
      });
    }
    return groups;
  }, [lessonSize, levelKanji]);

  const effectiveLessonNum =
    lessonNumber >= 1 && lessonNumber <= lessonGroups.length ? lessonNumber : 1;

  const customFilteredPool = useMemo(() => {
    const q = customSearch.trim().toLowerCase();
    if (!q) return levelKanji;
    return levelKanji.filter(
      (k) =>
        k.kanji.includes(customSearch.trim()) ||
        (k.hanViet && k.hanViet.toLowerCase().includes(q)) ||
        k.meanings.some((m) => m.toLowerCase().includes(q)) ||
        k.onReadings.some((r) => r.includes(customSearch.trim())) ||
        k.kunReadings.some((r) => r.includes(customSearch.trim())),
    );
  }, [customSearch, levelKanji]);

  const selectedKanji = useMemo(() => {
    if (sourceMode === 'by_lesson') {
      return lessonGroups[effectiveLessonNum - 1]?.items ?? [];
    }

    if (sourceMode === 'custom') {
      const idSet = new Set(customPickedIds);
      return kanjiList.filter((k) => idSet.has(k.id));
    }

    if (sourceMode === 'saved') {
      if (savedFilter === 'starred') {
        const starSet = new Set(savedKanjiIds);
        return levelKanji.filter((k) => starSet.has(k.id));
      }
      if (savedFilter === 'learned') {
        return levelKanji.filter((k) => Boolean(kanjiProgress[k.id]?.learned));
      }
      return levelKanji.filter(
        (k) => Boolean(kanjiProgress[k.id] && kanjiProgress[k.id].writingAttempts > 0),
      );
    }

    // Random mode
    let currentIndex = levelKanji.length;
    let randomIndex = 0;
    const array = [...levelKanji];

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
  }, [
    count,
    customPickedIds,
    effectiveLessonNum,
    kanjiList,
    kanjiProgress,
    lessonGroups,
    levelKanji,
    savedFilter,
    savedKanjiIds,
    seed,
    sourceMode,
  ]);

  const toggleCustomPick = (kanjiId: string) => {
    setCustomPickedIds((prev) =>
      prev.includes(kanjiId) ? prev.filter((id) => id !== kanjiId) : [...prev, kanjiId],
    );
  };

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
      {/* Source Mode Switcher */}
      <Card padding="md" className="space-y-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line pb-3">
          <span className="mr-1 text-xs font-semibold tracking-wide text-muted uppercase">
            Nguồn Kanji:
          </span>
          <Chip selected={sourceMode === 'by_lesson'} onClick={() => setSourceMode('by_lesson')}>
            <BookOpen className="size-3.5" aria-hidden />
            Theo Bài / Nhóm
          </Chip>
          <Chip selected={sourceMode === 'custom'} onClick={() => setSourceMode('custom')}>
            <CheckSquare className="size-3.5" aria-hidden />
            Tự chọn chữ ({customPickedIds.length})
          </Chip>
          <Chip selected={sourceMode === 'saved'} onClick={() => setSourceMode('saved')}>
            <Star className="size-3.5" aria-hidden />
            Kanji đã lưu ({savedKanjiIds.length})
          </Chip>
          <Chip selected={sourceMode === 'random'} onClick={() => setSourceMode('random')}>
            <RefreshCw className="size-3.5" aria-hidden />
            Ngẫu nhiên
          </Chip>
        </div>

        <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Cấp độ" htmlFor="pdf-kanji-level">
            <Select
              id="pdf-kanji-level"
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                setLessonNumber(1);
              }}
            >
              <option value="N5">N5 ({kanjiList.filter((k) => k.jlptLevel === 'N5').length} chữ)</option>
              <option value="N4">N4 ({kanjiList.filter((k) => k.jlptLevel === 'N4').length} chữ)</option>
              <option value="N3">N3 ({kanjiList.filter((k) => k.jlptLevel === 'N3').length} chữ)</option>
              <option value="All">Tất cả ({kanjiList.length} chữ)</option>
            </Select>
          </Field>

          {sourceMode === 'by_lesson' && (
            <>
              <Field label="Số chữ mỗi Bài" htmlFor="pdf-kanji-lesson-size">
                <Select
                  id="pdf-kanji-lesson-size"
                  value={lessonSize}
                  onChange={(e) => {
                    setLessonSize(Number(e.target.value));
                    setLessonNumber(1);
                  }}
                >
                  <option value={5}>5 chữ / bài (Chuẩn Màn học)</option>
                  <option value={10}>10 chữ / bài</option>
                  <option value={15}>15 chữ / bài</option>
                  <option value={20}>20 chữ / bài</option>
                </Select>
              </Field>
              <Field label="Chọn Bài" htmlFor="pdf-kanji-lesson-num">
                <Select
                  id="pdf-kanji-lesson-num"
                  value={effectiveLessonNum}
                  onChange={(e) => setLessonNumber(Number(e.target.value))}
                >
                  {lessonGroups.map((g) => (
                    <option key={g.lessonNum} value={g.lessonNum}>
                      {g.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}

          {sourceMode === 'saved' && (
            <Field label="Nhóm Kanji đã lưu" htmlFor="pdf-kanji-saved-filter" className="lg:col-span-2">
              <Select
                id="pdf-kanji-saved-filter"
                value={savedFilter}
                onChange={(e) =>
                  setSavedFilter(e.target.value as 'starred' | 'learned' | 'practiced')
                }
              >
                <option value="starred">Kanji đã đánh dấu lưu ★ ({savedKanjiIds.length} chữ)</option>
                <option value="learned">Kanji đã đánh dấu thuộc</option>
                <option value="practiced">Kanji đã từng tập viết nét</option>
              </Select>
            </Field>
          )}

          {sourceMode === 'random' && (
            <Field label="Số lượng" htmlFor="pdf-kanji-count" className="lg:col-span-2">
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
          )}

          <Field label="Chế độ in" htmlFor="pdf-kanji-mode">
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

          {sourceMode === 'custom' && (
            <div className="flex flex-wrap gap-2 lg:col-span-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setCustomPickedIds(customFilteredPool.slice(0, 10).map((k) => k.id))
                }
              >
                Chọn nhanh 10 chữ
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setCustomPickedIds(customFilteredPool.map((k) => k.id))}
              >
                Chọn tất cả ({customFilteredPool.length})
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCustomPickedIds([])}
              >
                Bỏ chọn
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
          {sourceMode === 'random' && (
            <Button
              variant="secondary"
              onClick={() => setSeed((s) => s + 1)}
              leftIcon={<RefreshCw className="size-4" aria-hidden />}
            >
              Trộn lại
            </Button>
          )}
          <Button
            variant="primary"
            loading={isGenerating}
            disabled={selectedKanji.length === 0}
            onClick={handlePrint}
            leftIcon={<Printer className="size-4" aria-hidden />}
          >
            In PDF ({selectedKanji.length} chữ Kanji)
          </Button>
        </div>
      </Card>

      {/* Interactive Custom Kanji Picker (when sourceMode === 'custom') */}
      {sourceMode === 'custom' && (
        <Card padding="md" className="space-y-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SearchInput
              value={customSearch}
              onChange={setCustomSearch}
              placeholder="Tìm chữ Kanji, Hán Việt, nghĩa hoặc âm đọc để tích chọn..."
              className="w-full sm:max-w-md"
            />
            <Badge tone="primary" className="tabular">
              Đã chọn {customPickedIds.length} chữ
            </Badge>
          </div>

          <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto rounded-xl border border-line bg-surface-2 p-3 sm:grid-cols-6 md:grid-cols-8">
            {customFilteredPool.map((k) => {
              const picked = customPickedIds.includes(k.id);
              const isStarred = savedKanjiIds.includes(k.id);
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => toggleCustomPick(k.id)}
                  className={cn(
                    'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border p-2 text-center transition-all',
                    picked
                      ? 'border-primary bg-primary-soft text-primary-fg ring-2 ring-primary/25'
                      : 'border-line bg-surface text-fg hover:border-primary/60',
                  )}
                >
                  {isStarred && (
                    <Star className="absolute top-1 right-1 size-3 fill-current text-warning-fg" aria-hidden />
                  )}
                  <span lang="ja" className="text-xl font-bold leading-none">
                    {k.kanji}
                  </span>
                  <span className="mt-1 truncate text-[10px] font-medium opacity-80">
                    {k.hanViet || k.meanings[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Preview Area */}
      <Card padding="lg" className="space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-fg">Bản xem trước</h2>
            <p className="text-sm text-muted">
              Bấm vào chữ Kanji bất kỳ bên dưới để đánh dấu lưu ★ nhanh. Khi in sẽ ra định dạng chuẩn A4.
            </p>
          </div>
          <Badge tone="primary" className="tabular">
            {selectedKanji.length} chữ Kanji
          </Badge>
        </div>

        {selectedKanji.length === 0 ? (
          <EmptyState
            title={
              sourceMode === 'saved'
                ? 'Bạn chưa có chữ Kanji nào trong mục đã lưu'
                : 'Chưa chọn chữ Kanji nào để in'
            }
            description={
              sourceMode === 'saved'
                ? 'Hãy vào bảng Kanji (hoặc bấm dấu ★ ở trang chi tiết chữ Kanji) để lưu những chữ muốn luyện viết lại.'
                : 'Hãy chọn các chữ Kanji ở bảng bên trên hoặc đổi sang chế độ Theo Bài / Ngẫu nhiên.'
            }
            action={
              <Link to="/kanji" className={buttonStyles({ variant: 'primary', size: 'sm' })}>
                Mở bảng chữ Kanji →
              </Link>
            }
          />
        ) : (
          <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-line-strong bg-surface-2 p-4">
            {selectedKanji.map((k) => {
              const isStarred = savedKanjiIds.includes(k.id);
              return (
                <button
                  key={k.id}
                  type="button"
                  title={`${k.kanji} (${k.hanViet}) — ${k.meanings.join(', ')}. Bấm để ${isStarred ? 'bỏ lưu ★' : 'lưu ★'}`}
                  onClick={() => {
                    const res = toggleSavedKanjiId(k.id, user?.id);
                    setSavedKanjiIds(res.ids);
                  }}
                  className={cn(
                    'relative grid size-12 cursor-pointer place-items-center rounded-lg border text-xl font-bold shadow-card transition-colors',
                    isStarred
                      ? 'border-warning-line bg-warning-soft/50 text-fg'
                      : 'border-line bg-surface text-fg hover:border-primary',
                  )}
                >
                  {isStarred && (
                    <Star className="absolute top-0.5 right-0.5 size-3 fill-current text-warning-fg" aria-hidden />
                  )}
                  <span lang="ja">{k.kanji}</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Hidden PDF Builder Container via Portal (Only visible during print) */}
      {createPortal(
        <KanjiPdfBuilder kanjiList={selectedKanji} mode={mode} isGenerating={isGenerating} />,
        document.body,
      )}
    </div>
  );
};
