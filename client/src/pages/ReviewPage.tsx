import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  Play,
  RotateCcw,
  Star,
  Volume2,
} from 'lucide-react';
import { LoginRequiredState } from '../components/auth/LoginRequiredState';
import { useAuth } from '../context/auth-context';
import { recordDailyStageSkillActivity } from '../services/stageRoadmapService';
import {
  buildVocabToolQuery,
  findVocabTextbook,
  getWordsForVocabTextbook,
  parseVocabLevelParam,
  resolveActiveVocabTextbook,
} from '../data/vocabTextbooks';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { removeMistake } from '../store/slices/mistakeSlice';
import { useAppSettings } from '../hooks/useAppSettings';
import { useUserProgress } from '../hooks/useUserProgress';
import type { GrammarMistake } from '../types/grammar';
import type { VocabularyItem } from '../types/vocabulary';
import { speakJapanese } from '../utils/tts';
import { getVocabularyDisplay } from '../utils/vocabularyHelpers';
import { useCurriculumSnapshot } from '../hooks/useCurriculumData';
import { getLiveAllVocabulary } from '../services/curriculumStore';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  Notice,
  PageContainer,
  PageHeader,
  ProgressBar,
  buttonStyles,
} from '../components/ui';
import { cn } from '../lib/cn';

type ReviewScope = 'all' | 'vocab' | 'grammar';

type ReviewQueueItem =
  | {
      kind: 'vocab';
      uid: string;
      word: VocabularyItem;
      wrongCount: number;
      isStarred: boolean;
    }
  | {
      kind: 'grammar';
      uid: string;
      mistake: GrammarMistake;
    };

export const ReviewPage: React.FC = () => {
  const { user, studyLevel, studyTextbookId } = useAuth();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const mistakes = useAppSelector((state) => state.mistake.mistakes);
  const { progress, toggleStar, clearWrongWord } = useUserProgress();
  const { settings } = useAppSettings();
  const cmsSnapshot = useCurriculumSnapshot();

  const levelParam = parseVocabLevelParam(searchParams.get('level'));
  const explicitBook = useMemo(
    () => findVocabTextbook(levelParam, searchParams.get('book')),
    [levelParam, searchParams],
  );
  const activeLevel = explicitBook?.level ?? levelParam ?? studyLevel;
  const textbook = useMemo(() => {
    if (explicitBook) return explicitBook;
    if (!levelParam && activeLevel) {
      return resolveActiveVocabTextbook(
        activeLevel,
        user?.id,
        activeLevel === studyLevel ? studyTextbookId : null,
      );
    }
    return undefined;
  }, [activeLevel, explicitBook, levelParam, studyLevel, studyTextbookId, user?.id]);

  const allVocab = useMemo(() => {
    if (textbook) {
      return getWordsForVocabTextbook(cmsSnapshot, textbook.level, textbook);
    }
    const all = getLiveAllVocabulary(cmsSnapshot);
    if (activeLevel) {
      return all.filter((w) => w.level === activeLevel);
    }
    return all;
  }, [cmsSnapshot, textbook, activeLevel]);
  const [scope, setScope] = useState<ReviewScope>('all');
  const [sessionQueue, setSessionQueue] = useState<ReviewQueueItem[] | null>(null);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    recordDailyStageSkillActivity('review', user?.id);
  }, [user?.id]);

  const vocabReviewItems = useMemo<ReviewQueueItem[]>(() => {
    const starredSet = new Set(progress.starredWords);
    const items: Extract<ReviewQueueItem, { kind: 'vocab' }>[] = [];

    for (const word of allVocab) {
      const wrongCount = progress.wrongWords[word.id] || 0;
      const isStarred = starredSet.has(word.id);
      if (wrongCount > 0 || isStarred) {
        items.push({
          kind: 'vocab',
          uid: `vocab-${word.id}`,
          word,
          wrongCount,
          isStarred,
        });
      }
    }

    items.sort((a, b) => b.wrongCount - a.wrongCount || Number(b.isStarred) - Number(a.isStarred));
    return items;
  }, [allVocab, progress.starredWords, progress.wrongWords]);

  const grammarReviewItems = useMemo<ReviewQueueItem[]>(
    () =>
      mistakes
        .filter((mistake) => !activeLevel || !mistake.level || mistake.level === activeLevel)
        .map((mistake) => ({
          kind: 'grammar',
          uid: `grammar-${mistake.id}`,
          mistake,
        })),
    [mistakes, activeLevel],
  );

  const activeItems = useMemo(() => {
    if (scope === 'vocab') return vocabReviewItems;
    if (scope === 'grammar') return grammarReviewItems;
    return [...vocabReviewItems, ...grammarReviewItems];
  }, [grammarReviewItems, scope, vocabReviewItems]);

  const startSession = () => {
    if (activeItems.length === 0) return;
    setSessionQueue([...activeItems]);
    setSessionIdx(0);
    setRevealed(false);
    setCompletedCount(0);
  };

  const currentItem = sessionQueue?.[sessionIdx];

  if (!user) {
    return (
      <PageContainer size="md" className="space-y-5">
        <PageHeader
          breadcrumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Ôn tập lỗi sai' }]}
          title="Ôn tập từ vựng & lỗi sai"
          description="Ôn tập thông minh các từ làm sai, từ đánh dấu sao và lỗi ngữ pháp JLPT."
        />
        <LoginRequiredState
          title="Đăng nhập để lưu & ôn tập lỗi sai"
          description="Các câu làm sai và từ vựng đánh dấu ★ chỉ được lưu và hiển thị khi bạn đăng nhập tài khoản."
        />
      </PageContainer>
    );
  }

  const handleRemembered = (markResolved: boolean) => {
    if (!sessionQueue || !currentItem) return;

    if (markResolved) {
      if (currentItem.kind === 'vocab' && currentItem.wrongCount > 0) {
        clearWrongWord(currentItem.word.id);
      } else if (currentItem.kind === 'grammar') {
        dispatch(removeMistake(currentItem.mistake.id));
      }
    }

    setCompletedCount((c) => c + 1);
    setRevealed(false);
    setSessionIdx((i) => i + 1);
  };

  const handleRepeatLater = () => {
    if (!sessionQueue || !currentItem) return;
    setSessionQueue((prev) => (prev ? [...prev, currentItem] : prev));
    setRevealed(false);
    setSessionIdx((i) => i + 1);
  };

  if (sessionQueue) {
    if (!currentItem || sessionIdx >= sessionQueue.length) {
      return (
        <PageContainer size="sm" className="py-4">
          <Card padding="lg" className="space-y-5 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-success-soft text-success-fg">
              <CheckCircle2 className="size-6" aria-hidden />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-fg">Hoàn tất ôn tập!</h1>
              <p className="text-sm text-muted">
                Bạn đã hoàn thành {completedCount} mục ôn tập trong phiên này.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="secondary" onClick={() => setSessionQueue(null)}>
                Quay lại tổng quan
              </Button>
              {activeItems.length > 0 && (
                <Button variant="primary" onClick={startSession}>
                  Ôn tiếp ({activeItems.length} mục)
                </Button>
              )}
            </div>
          </Card>
        </PageContainer>
      );
    }

    return (
      <PageContainer size="md" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSessionQueue(null)}>
            ← Thoát phiên ôn
          </Button>
          <Badge tone="primary" className="tabular">
            Mục {sessionIdx + 1} / {sessionQueue.length}
          </Badge>
        </div>

        <ProgressBar value={sessionIdx + 1} max={sessionQueue.length} label="Tiến độ ôn tập" />

        <Card padding="lg" className="space-y-6">
          {currentItem.kind === 'vocab' ? (
            (() => {
              const display = getVocabularyDisplay(currentItem.word);
              return (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="primary">Từ vựng</Badge>
                      {currentItem.wrongCount > 0 && (
                        <Badge tone="danger" className="tabular">
                          Sai {currentItem.wrongCount} lần
                        </Badge>
                      )}
                      {currentItem.isStarred && <Badge tone="warning">★ Đã lưu</Badge>}
                    </div>
                    <Button
                      variant="soft"
                      size="sm"
                      leftIcon={<Volume2 className="size-4" aria-hidden />}
                      onClick={() =>
                        speakJapanese(currentItem.word.hiragana || display.primaryText, settings.ttsRate)
                      }
                    >
                      Phát âm
                    </Button>
                  </div>

                  <div className="space-y-2 py-2">
                    <p className="text-xs font-semibold text-muted uppercase">
                      {currentItem.word.wordType}
                    </p>
                    <h2 className="text-2xl font-bold text-fg md:text-3xl">
                      {currentItem.word.meaning}
                    </h2>
                  </div>

                  {!revealed ? (
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      leftIcon={<Eye className="size-4" aria-hidden />}
                      onClick={() => {
                        setRevealed(true);
                        speakJapanese(currentItem.word.hiragana || display.primaryText, settings.ttsRate);
                      }}
                    >
                      Hiện đáp án tiếng Nhật
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-line bg-surface-2 p-5 text-center space-y-1.5">
                        <p lang="ja" className="text-3xl font-bold text-fg md:text-4xl">
                          {display.primaryText}
                        </p>
                        {display.hasKanji && (
                          <p lang="ja" className="text-lg font-medium text-primary-fg">
                            {display.hiragana}
                          </p>
                        )}
                        {display.hanViet && (
                          <p className="text-xs font-semibold tracking-wider text-muted uppercase">
                            {display.hanViet}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2.5">
                        <Button
                          variant="secondary"
                          className="flex-1"
                          leftIcon={<RotateCcw className="size-4" aria-hidden />}
                          onClick={handleRepeatLater}
                        >
                          Chưa nhớ (Ôn lại)
                        </Button>
                        {currentItem.wrongCount > 0 ? (
                          <Button
                            variant="primary"
                            className="flex-1"
                            leftIcon={<CheckCircle2 className="size-4" aria-hidden />}
                            onClick={() => handleRemembered(true)}
                          >
                            Đã nhớ (Xóa lỗi sai)
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            className="flex-1"
                            rightIcon={<ArrowRight className="size-4" aria-hidden />}
                            onClick={() => handleRemembered(false)}
                          >
                            Đã nhớ · Tiếp
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              );
            })()
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge tone="danger">Lỗi Ngữ pháp / JLPT</Badge>
                  {currentItem.mistake.level && (
                    <Badge tone="primary">{currentItem.mistake.level}</Badge>
                  )}
                </div>
                {currentItem.mistake.categoryLabel && (
                  <span className="text-xs font-medium text-muted">
                    {currentItem.mistake.categoryLabel}
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <p lang="ja" className="text-lg font-semibold leading-relaxed text-fg">
                  {currentItem.mistake.prompt || currentItem.mistake.questionId}
                </p>
                <Notice tone="danger" className="text-sm">
                  Lần trước bạn chọn:{' '}
                  <strong lang="ja" className="line-through">
                    {currentItem.mistake.userAnswer}
                  </strong>
                </Notice>
              </div>

              {!revealed ? (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  leftIcon={<Eye className="size-4" aria-hidden />}
                  onClick={() => setRevealed(true)}
                >
                  Xem đáp án đúng & giải thích
                </Button>
              ) : (
                <div className="space-y-4">
                  <Notice tone="success" className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase">Đáp án đúng</p>
                    <p lang="ja" className="text-base font-bold text-fg">
                      {currentItem.mistake.correctAnswer}
                    </p>
                  </Notice>

                  {currentItem.mistake.explanation && (
                    <p className="rounded-xl border border-line bg-surface-2 p-3.5 text-sm leading-relaxed text-muted whitespace-pre-line">
                      {currentItem.mistake.explanation}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2.5">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      leftIcon={<RotateCcw className="size-4" aria-hidden />}
                      onClick={handleRepeatLater}
                    >
                      Chưa chắc (Ôn lại)
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1"
                      leftIcon={<CheckCircle2 className="size-4" aria-hidden />}
                      onClick={() => handleRemembered(true)}
                    >
                      Đã hiểu (Xóa lỗi)
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </PageContainer>
    );
  }

  const scopeTitle = textbook
    ? `${textbook.title} (${textbook.level})`
    : activeLevel
      ? `JLPT ${activeLevel}`
      : null;
  const toolQuery = activeLevel ? buildVocabToolQuery(activeLevel, textbook?.id) : '';
  const overviewBreadcrumbs = textbook
    ? [
        { label: 'Trang chủ', to: '/' },
        { label: 'Từ vựng', to: '/vocabulary' },
        { label: `Trình độ ${textbook.level}`, to: `/vocabulary/${textbook.level.toLowerCase()}` },
        { label: textbook.title, to: `/vocabulary/${textbook.level.toLowerCase()}/book/${textbook.id}` },
        { label: 'Ôn tập tổng hợp' },
      ]
    : activeLevel
      ? [
          { label: 'Trang chủ', to: '/' },
          { label: 'Từ vựng', to: '/vocabulary' },
          { label: `Trình độ ${activeLevel}`, to: `/vocabulary/${activeLevel.toLowerCase()}` },
          { label: 'Ôn tập tổng hợp' },
        ]
      : [
          { label: 'Trang chủ', to: '/' },
          { label: 'Từ vựng', to: '/vocabulary' },
          { label: 'Ôn tập tổng hợp' },
        ];

  return (
    <PageContainer size="md" className="space-y-6">
      <PageHeader
        breadcrumbs={overviewBreadcrumbs}
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span>Ôn tập thông minh</span>
            {scopeTitle && <Badge tone="primary">{scopeTitle}</Badge>}
          </span>
        }
        description={
          scopeTitle
            ? `Đang lọc mục cần ôn thuộc ${scopeTitle} (từ ★, từ làm sai và lỗi cấp ${activeLevel}).`
            : 'Gom từ vựng đánh dấu (★), từ hay làm sai và lỗi ngữ pháp/JLPT thành phiên ôn tập tập trung.'
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to={`/vocabulary/writing${toolQuery}`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              Luyện gõ từ
            </Link>
            <Link to="/grammar/mistakes" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
              <BookOpen className="size-4" aria-hidden />
              Lỗi Ngữ pháp
            </Link>
          </div>
        }
      />

      {scopeTitle && (
        <Notice tone="info" className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Đang lọc theo giáo trình &amp; trình độ: <strong>{scopeTitle}</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('level');
              next.delete('book');
              setSearchParams(next, { replace: true });
            }}
          >
            Xem tất cả cấp độ
          </Button>
        </Notice>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Chip selected={scope === 'all'} onClick={() => setScope('all')}>
            Tất cả ({vocabReviewItems.length + grammarReviewItems.length})
          </Chip>
          <Chip selected={scope === 'vocab'} onClick={() => setScope('vocab')}>
            Từ vựng ★ & Sai ({vocabReviewItems.length})
          </Chip>
          <Chip selected={scope === 'grammar'} onClick={() => setScope('grammar')}>
            Ngữ pháp & JLPT ({grammarReviewItems.length})
          </Chip>
        </div>

        {activeItems.length > 0 && (
          <Button
            variant="primary"
            leftIcon={<Play className="size-4" aria-hidden />}
            onClick={startSession}
          >
            Bắt đầu ôn tập ({activeItems.length})
          </Button>
        )}
      </div>

      {activeItems.length === 0 ? (
        <EmptyState
          title="Chưa có mục nào cần ôn"
          description="Hãy đánh dấu sao (★) những từ quan trọng hoặc làm bài Quiz / JLPT để hệ thống ghi nhận điểm yếu."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/vocabulary/n3/1" className={buttonStyles({ variant: 'primary' })}>
                Xem từ vựng N3
              </Link>
              <Link to="/vocabulary/quiz" className={buttonStyles({ variant: 'secondary' })}>
                Làm Quiz ngay
              </Link>
            </div>
          }
        />
      ) : (
        <Card padding="none" className="divide-y divide-line overflow-hidden">
          {activeItems.map((item) => {
            if (item.kind === 'vocab') {
              const display = getVocabularyDisplay(item.word);
              return (
                <div key={item.uid} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span lang="ja" className="text-lg font-bold text-fg">
                        {display.primaryText}
                      </span>
                      {display.hasKanji && (
                        <span lang="ja" className="text-sm text-primary-fg">
                          {display.hiragana}
                        </span>
                      )}
                      {item.wrongCount > 0 && (
                        <Badge tone="danger" className="tabular">
                          Sai {item.wrongCount}
                        </Badge>
                      )}
                      {item.isStarred && <Badge tone="warning">★</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{item.word.meaning}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <IconButton
                      size="sm"
                      aria-label={`Phát âm ${display.primaryText}`}
                      onClick={() => speakJapanese(item.word.hiragana || display.primaryText, settings.ttsRate)}
                    >
                      <Volume2 className="size-4" aria-hidden />
                    </IconButton>
                    <IconButton
                      size="sm"
                      aria-label={item.isStarred ? 'Bỏ đánh dấu sao' : 'Đánh dấu sao'}
                      onClick={() => toggleStar(item.word.id)}
                      className={cn(item.isStarred && 'text-warning-fg')}
                    >
                      <Star className={cn('size-4', item.isStarred && 'fill-current')} aria-hidden />
                    </IconButton>
                  </div>
                </div>
              );
            }

            return (
              <div key={item.uid} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="danger">Lỗi Ngữ pháp / JLPT</Badge>
                    {item.mistake.categoryLabel && (
                      <span className="text-xs font-medium text-muted">
                        {item.mistake.categoryLabel}
                      </span>
                    )}
                  </div>
                  <p lang="ja" className="text-sm font-medium text-fg">
                    {item.mistake.prompt || item.mistake.questionId}
                  </p>
                  <p className="text-xs text-success-fg">
                    Đáp án đúng: <span lang="ja">{item.mistake.correctAnswer}</span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch(removeMistake(item.mistake.id))}
                >
                  Xóa lỗi
                </Button>
              </div>
            );
          })}
        </Card>
      )}
    </PageContainer>
  );
};
