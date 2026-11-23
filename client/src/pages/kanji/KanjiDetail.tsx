import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CircleCheck, Edit3, Star, Volume2 } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { getLiveKanjis } from '../../services/curriculumStore';
import {
  SAVED_KANJI_SYNC_EVENT,
  loadSavedKanjiIds,
  toggleSavedKanjiId,
} from '../../services/kanjiBookmarkService';
import { recordDailyStageSkillActivity } from '../../services/stageRoadmapService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { markKanjiLearned } from '../../store/slices/kanjiSlice';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  EmptyState,
  PageContainer,
  buttonStyles,
} from '../../components/ui';

export const KanjiDetail: React.FC = () => {
  const { kanjiId } = useParams();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const cmsSnapshot = useCurriculumSnapshot();
  const kanjiList = useMemo(() => getLiveKanjis(cmsSnapshot), [cmsSnapshot]);
  const progress = useAppSelector((state) => (kanjiId ? state.kanji.progress[kanjiId] : undefined));

  const kanji = kanjiList.find((k) => k.id === kanjiId);
  const [savedState, setSavedState] = useState<{ userId: string | undefined; ids: string[] }>(() => ({
    userId: user?.id,
    ids: loadSavedKanjiIds(user?.id),
  }));
  const savedIds = savedState.userId === user?.id ? savedState.ids : loadSavedKanjiIds(user?.id);

  useEffect(() => {
    const syncSaved = () => {
      setSavedState({ userId: user?.id, ids: loadSavedKanjiIds(user?.id) });
    };
    window.addEventListener(SAVED_KANJI_SYNC_EVENT, syncSaved);
    return () => window.removeEventListener(SAVED_KANJI_SYNC_EVENT, syncSaved);
  }, [user?.id]);

  useEffect(() => {
    if (kanji) {
      recordDailyStageSkillActivity('kanji', user?.id);
    }
  }, [kanji, user?.id]);

  if (!kanji) {
    return (
      <PageContainer size="md">
        <EmptyState
          title="Không tìm thấy Kanji"
          description="Chữ Kanji bạn yêu cầu không có trong bộ dữ liệu."
          action={
            <Link to="/kanji" className={buttonStyles({ variant: 'secondary' })}>
              Quay lại danh sách
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const isLearned = Boolean(progress?.learned);

  return (
    <PageContainer size="md" className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Kanji', to: '/kanji' },
          { label: kanji.kanji },
        ]}
      />

      <Card padding="none" className="overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left Hero */}
          <div className="flex flex-col items-center justify-center gap-4 border-b border-line bg-surface-2 p-6 text-center md:w-72 md:shrink-0 md:border-r md:border-b-0 md:p-8">
            <h1 lang="ja" className="text-7xl leading-none font-bold text-fg md:text-8xl">
              {kanji.kanji}
            </h1>

            {kanji.hanViet && (
              <Badge tone="primary" className="px-3 py-1 text-sm font-semibold tracking-wider uppercase">
                {kanji.hanViet}
              </Badge>
            )}

            <div className="mt-2 flex w-full flex-col gap-2.5">
              <Link
                to={`/kanji/${kanji.id}/practice`}
                className={buttonStyles({ variant: 'primary', size: 'md', fullWidth: true })}
              >
                <Edit3 className="size-4" aria-hidden />
                Luyện viết
              </Link>

              <Link
                to={`/vocabulary/quiz?kanji=${kanji.kanji}`}
                className={buttonStyles({ variant: 'secondary', size: 'md', fullWidth: true })}
              >
                Làm bài tập (Quiz)
              </Link>

              <Button
                variant={savedIds.includes(kanji.id) ? 'soft' : 'secondary'}
                size="sm"
                fullWidth
                aria-pressed={savedIds.includes(kanji.id)}
                leftIcon={
                  <Star
                    className={`size-4 ${savedIds.includes(kanji.id) ? 'fill-current text-warning-fg' : ''}`}
                    aria-hidden
                  />
                }
                onClick={() => {
                  const res = toggleSavedKanjiId(kanji.id, user?.id);
                  setSavedState({ userId: user?.id, ids: res.ids });
                }}
              >
                {savedIds.includes(kanji.id) ? 'Đã lưu Kanji ★' : 'Lưu Kanji để xuất PDF'}
              </Button>

              <Button
                variant={isLearned ? 'soft' : 'ghost'}
                size="sm"
                fullWidth
                aria-pressed={isLearned}
                leftIcon={<CircleCheck className="size-4" aria-hidden />}
                onClick={() =>
                  dispatch(markKanjiLearned({ kanjiId: kanji.id, learned: !isLearned }))
                }
              >
                {isLearned ? 'Đã thuộc' : 'Đánh dấu đã thuộc'}
              </Button>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-6 p-6 md:p-8">
            <div>
              <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Ý nghĩa</h2>
              <p className="mt-1.5 text-xl font-semibold text-fg">{kanji.meanings.join(', ')}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-surface-2 p-4">
                <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary-fg uppercase">
                  <Volume2 className="size-4" aria-hidden />
                  Âm ON (音読み)
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {kanji.onReadings.length > 0 ? (
                    kanji.onReadings.map((r) => (
                      <Badge key={r} tone="neutral" className="bg-surface px-2.5 py-1 text-sm font-medium text-fg">
                        <span lang="ja">{r}</span>
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted">Không có</span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-line bg-surface-2 p-4">
                <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary-fg uppercase">
                  <Volume2 className="size-4" aria-hidden />
                  Âm KUN (訓読み)
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {kanji.kunReadings.length > 0 ? (
                    kanji.kunReadings.map((r) => (
                      <Badge key={r} tone="neutral" className="bg-surface px-2.5 py-1 text-sm font-medium text-fg">
                        <span lang="ja">{r}</span>
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted">Không có</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {typeof kanji.strokeCount === 'number' && kanji.strokeCount > 0 && (
                <Badge tone="neutral" className="tabular px-3 py-1 text-sm">
                  Số nét: <strong className="ml-1 font-semibold text-fg">{kanji.strokeCount}</strong>
                </Badge>
              )}
              {kanji.jlptLevel && (
                <Badge tone="primary" className="px-3 py-1 text-sm">
                  JLPT: <strong className="ml-1 font-semibold">{kanji.jlptLevel}</strong>
                </Badge>
              )}
              {kanji.radical && (
                <Badge tone="neutral" className="px-3 py-1 text-sm">
                  Bộ thủ: <span lang="ja" className="ml-1 font-semibold text-fg">{kanji.radical}</span>
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Vocabulary Examples */}
      <Card padding="lg" className="space-y-4">
        <h2 className="text-lg font-semibold text-fg">
          Từ vựng chứa <span lang="ja">{kanji.kanji}</span>
        </h2>

        {kanji.examples && kanji.examples.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {kanji.examples.map((ex, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-center rounded-xl border border-line bg-surface-2 p-4"
              >
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span lang="ja" className="text-xl font-bold text-fg">
                    {ex.word}
                  </span>
                  <Badge tone="neutral" className="bg-surface">
                    <span lang="ja">{ex.hiragana}</span>
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{ex.meaning}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Không có từ vựng ví dụ nào.</p>
        )}
      </Card>
    </PageContainer>
  );
};
