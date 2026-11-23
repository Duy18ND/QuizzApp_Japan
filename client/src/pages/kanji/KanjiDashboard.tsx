import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CircleCheck, Edit3 } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { getPreferredVocabLevel } from '../../data/vocabTextbooks';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { getLiveKanjis } from '../../services/curriculumStore';
import { useAppSelector } from '../../store/hooks';
import {
  Badge,
  Button,
  Card,
  CardLink,
  Chip,
  EmptyState,
  PageContainer,
  PageHeader,
  ProgressBar,
  SearchInput,
  buttonStyles,
} from '../../components/ui';
import { cn } from '../../lib/cn';

const LEVELS = ['All', 'N5', 'N4', 'N3', 'N2', 'N1'];

export const KanjiDashboard: React.FC = () => {
  const { studyLevel, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const cmsSnapshot = useCurriculumSnapshot();
  const kanjiList = useMemo(() => getLiveKanjis(cmsSnapshot), [cmsSnapshot]);
  const progress = useAppSelector((state) => state.kanji.progress);

  const urlLevelParam = (searchParams.get('level') || '').toUpperCase();
  const validUrlLevel = LEVELS.includes(urlLevelParam) && urlLevelParam !== 'All' ? urlLevelParam : null;
  const groupParam = Math.max(0, Number(searchParams.get('group')) || 0);
  const sizeParam = Math.max(1, Math.min(20, Number(searchParams.get('size')) || 5));

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevelOverride, setSelectedLevelOverride] = useState<string | null>(null);
  const selectedLevel =
    selectedLevelOverride ??
    validUrlLevel ??
    studyLevel ??
    getPreferredVocabLevel(user?.id) ??
    'All';

  const learnedCount = kanjiList.filter((k) => progress[k.id]?.learned).length;

  const baseLevelKanji = kanjiList.filter((k) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      k.kanji.includes(searchTerm.trim()) ||
      (k.hanViet && k.hanViet.toLowerCase().includes(q)) ||
      k.meanings.some((m) => m.toLowerCase().includes(q)) ||
      k.kunReadings.some((r) => r.includes(searchTerm.trim())) ||
      k.onReadings.some((r) => r.includes(searchTerm.trim()));

    const matchesLevel = selectedLevel === 'All' || k.jlptLevel === selectedLevel;

    return matchesSearch && matchesLevel;
  });

  const filteredKanji = useMemo(() => {
    if (groupParam <= 0 || searchTerm.trim().length > 0 || baseLevelKanji.length === 0) {
      return baseLevelKanji;
    }
    const startIdx = ((groupParam - 1) * sizeParam) % baseLevelKanji.length;
    const picked = [];
    const count = Math.min(sizeParam, baseLevelKanji.length);
    for (let i = 0; i < count; i += 1) {
      picked.push(baseLevelKanji[(startIdx + i) % baseLevelKanji.length]);
    }
    return picked;
  }, [baseLevelKanji, groupParam, searchTerm, sizeParam]);

  const handleClearGroupFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('group');
    next.delete('size');
    setSearchParams(next, { replace: true });
  };

  return (
    <PageContainer>
      <PageHeader
        title="Học Kanji"
        description="Luyện tập thứ tự nét, ghi nhớ âm đọc và từ vựng liên quan."
        actions={
          <div className="flex min-w-44 flex-col gap-1.5 rounded-xl border border-line bg-glass px-4 py-2.5 shadow-card">
            <div className="flex items-center justify-between gap-3 text-xs font-medium text-muted">
              <span>Đã thuộc</span>
              <span className="tabular font-semibold text-fg">
                {learnedCount} / {kanjiList.length}
              </span>
            </div>
            <ProgressBar
              value={learnedCount}
              max={kanjiList.length}
              size="sm"
              tone={learnedCount === kanjiList.length && kanjiList.length > 0 ? 'success' : 'primary'}
              label="Tiến độ Kanji đã thuộc"
            />
          </div>
        }
      />

      {/* Daily Stage Lesson Scoped Banner (when opened from Roadmap Màn N) */}
      {groupParam > 0 && !searchTerm.trim() && filteredKanji.length > 0 && (
        <Card padding="sm" className="mb-4 flex flex-col gap-2.5 border-primary/50 bg-primary-soft/35 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="primary">Bài học Kanji hôm nay</Badge>
              <span className="text-sm font-bold text-fg">
                Nhóm Bài {groupParam} · {filteredKanji.length} chữ Kanji {selectedLevel} ({filteredKanji.map((k) => k.kanji).join(' · ')})
              </span>
            </div>
            <p className="text-xs text-muted">
              Đã lọc riêng {filteredKanji.length} chữ Kanji của bài học hôm nay để bạn tập trung học âm Hán Việt, On-Kun và luyện viết nét.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              to={`/kanji/${filteredKanji[0].id}/practice`}
              className={buttonStyles({ variant: 'primary', size: 'sm' })}
            >
              <Edit3 className="size-3.5" aria-hidden />
              <span>Tập viết chữ {filteredKanji[0].kanji}</span>
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <Link
              to="/roadmap"
              className={buttonStyles({ variant: 'soft', size: 'sm' })}
            >
              ← Về Bản đồ Màn
            </Link>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClearGroupFilter}
            >
              Xem toàn bộ {baseLevelKanji.length} chữ {selectedLevel}
            </Button>
          </div>
        </Card>
      )}

      {/* Search & Level Filter */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Tìm chữ Kanji, Hán Việt, nghĩa, hoặc cách đọc..."
          className="sm:max-w-sm sm:flex-1"
        />

        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
          {LEVELS.map((level) => (
            <Chip
              key={level}
              selected={selectedLevel === level}
              onClick={() => setSelectedLevelOverride(level)}
              className="shrink-0"
            >
              {level === 'All' ? 'Tất cả' : level}
            </Chip>
          ))}
        </div>
      </div>

      {/* Kanji Grid */}
      {filteredKanji.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {filteredKanji.map((kanji) => {
            const progressInfo = progress[kanji.id];
            const isLearned = Boolean(progressInfo?.learned);
            const isInProgress = Boolean(
              progressInfo && progressInfo.writingAttempts > 0 && !isLearned,
            );

            return (
              <li key={kanji.id}>
                <CardLink
                  to={`/kanji/${kanji.id}`}
                  padding="sm"
                  className={cn(
                    'relative flex h-full flex-col items-center justify-center text-center',
                    isLearned && 'border-success-line bg-success-soft',
                  )}
                >
                  {isLearned && (
                    <CircleCheck
                      className="absolute top-2 right-2 size-3.5 text-success-fg"
                      aria-label="Đã thuộc"
                    />
                  )}
                  {isInProgress && (
                    <span
                      className="absolute top-2.5 right-2.5 size-2 rounded-full bg-warning"
                      title="Đang luyện tập"
                    />
                  )}

                  <span
                    lang="ja"
                    className={cn(
                      'text-3xl leading-none font-bold md:text-4xl',
                      isLearned ? 'text-success-fg' : 'text-fg',
                    )}
                  >
                    {kanji.kanji}
                  </span>

                  <span className="mt-2 line-clamp-1 text-xs text-muted">
                    {kanji.hanViet || kanji.meanings[0] || '...'}
                  </span>

                  {kanji.jlptLevel && (
                    <Badge tone="neutral" className="mt-1.5 px-1.5 py-0 text-[10px]">
                      {kanji.jlptLevel}
                    </Badge>
                  )}
                </CardLink>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title="Không tìm thấy chữ Kanji nào phù hợp"
          description="Hãy thử từ khóa khác hoặc đặt lại bộ lọc cấp độ."
          action={
            (searchTerm || selectedLevel !== 'All') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedLevelOverride('All');
                }}
              >
                Xóa bộ lọc
              </Button>
            )
          }
        />
      )}
    </PageContainer>
  );
};
