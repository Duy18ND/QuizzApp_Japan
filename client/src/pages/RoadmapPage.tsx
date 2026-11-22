import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  GraduationCap,
  Target,
} from 'lucide-react';
import { LoginRequiredState } from '../components/auth/LoginRequiredState';
import {
  Badge,
  Button,
  Card,
  PageContainer,
  PageHeader,
  ProgressBar,
  useToast,
} from '../components/ui';
import { buttonStyles } from '../components/ui/styles';
import { useAuth } from '../context/auth-context';
import {
  buildVocabToolQuery,
  resolveActiveVocabTextbook,
} from '../data/vocabTextbooks';
import {
  getNextRoadmapStep,
  getRoadmapStepCount,
  STUDY_ROADMAPS,
  type RoadmapSkillTag,
} from '../data/studyRoadmaps';
import { cn } from '../lib/cn';
import {
  loadRoadmapCompletedSteps,
  requestOpenLevelModal,
  ROADMAP_PROGRESS_SYNC_EVENT,
  STUDY_LEVEL_OPTIONS,
  toggleRoadmapStepCompletion,
  type StudyLevel,
} from '../services/userLevelService';

const SKILL_TONE: Record<RoadmapSkillTag, 'primary' | 'sakura' | 'success' | 'warning' | 'neutral'> = {
  'Từ vựng': 'primary',
  Kanji: 'primary',
  'Ngữ pháp': 'primary',
  Flashcard: 'neutral',
  'Luyện tập': 'warning',
  'Đọc hiểu': 'sakura',
  'Nghe hiểu': 'sakura',
  'Thi thử': 'success',
};

export const RoadmapPage: React.FC = () => {
  const { user, studyLevel, studyTextbookId, updateStudyLevel } = useAuth();
  const { toast } = useToast();
  const [viewingLevelOverride, setViewingLevelOverride] = useState<StudyLevel | null>(null);
  const [roadmapVersion, setRoadmapVersion] = useState(0);

  useEffect(() => {
    const onSync = () => setRoadmapVersion((v) => v + 1);
    window.addEventListener(ROADMAP_PROGRESS_SYNC_EVENT, onSync);
    return () => {
      window.removeEventListener(ROADMAP_PROGRESS_SYNC_EVENT, onSync);
    };
  }, []);

  const completedSteps = user ? (roadmapVersion >= 0 ? loadRoadmapCompletedSteps(user.id) : []) : [];

  if (!user) {
    return (
      <PageContainer size="md" className="py-2">
        <PageHeader
          breadcrumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Học theo lộ trình' }]}
          title="Học theo lộ trình (JLPT N5 – N1)"
          description="Lộ trình học tập từng bước theo 5 trình độ JLPT dành riêng cho tài khoản đã đăng nhập."
        />
        <Card padding="lg">
          <LoginRequiredState
            title="Đăng nhập để sử dụng Học theo lộ trình"
            description="Chỉ tài khoản đã đăng nhập mới có thể chọn trình độ (N5 – N1), theo dõi các giai đoạn học và lưu tiến độ từng bước."
          />
        </Card>
      </PageContainer>
    );
  }

  const activeLevel: StudyLevel | null = viewingLevelOverride ?? studyLevel;
  const completedSet = new Set(completedSteps);

  const handleSetPrimaryLevel = async (level: StudyLevel) => {
    await updateStudyLevel(level);
    setViewingLevelOverride(null);
    toast({
      title: `Đã đặt JLPT ${level} làm trình độ học chính`,
      tone: 'success',
    });
  };

  const handleToggleStep = async (stepId: string) => {
    await toggleRoadmapStepCompletion(stepId, user.id);
    setRoadmapVersion((v) => v + 1);
  };

  if (!activeLevel) {
    return (
      <PageContainer size="lg" className="max-w-5xl space-y-5 py-2">
        <PageHeader
          breadcrumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Học theo lộ trình' }]}
          title="Chọn trình độ để bắt đầu lộ trình"
          description="Hãy chọn 1 trong 5 trình độ JLPT (N5 – N1) phù hợp với mục tiêu hiện tại của bạn."
        />
        <Card padding="lg" className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {STUDY_LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt.level}
                type="button"
                onClick={() => void handleSetPrimaryLevel(opt.level)}
                className="flex cursor-pointer flex-col gap-2.5 rounded-xl border border-line bg-surface-2/60 p-4 text-left transition-colors duration-150 hover:border-primary hover:bg-primary-soft/50"
              >
                <span className="inline-flex h-9 w-11 items-center justify-center rounded-lg bg-primary text-sm font-bold text-on-primary">
                  {opt.level}
                </span>
                <div>
                  <div className="text-sm font-semibold text-fg">
                    JLPT {opt.level} · {opt.title}
                  </div>
                  <div lang="ja" className="text-xs text-muted">
                    {opt.japaneseLabel}
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted">{opt.summary}</p>
              </button>
            ))}
          </div>
        </Card>
      </PageContainer>
    );
  }

  const roadmap = STUDY_ROADMAPS[activeLevel];
  const activeTextbook = resolveActiveVocabTextbook(
    activeLevel,
    user.id,
    activeLevel === studyLevel ? studyTextbookId : null,
  );
  const toolQuery = buildVocabToolQuery(activeLevel, activeTextbook.id);
  const jlptQuery =
    activeLevel === 'N5' || activeLevel === 'N4' || activeLevel === 'N3'
      ? `?level=${activeLevel}`
      : '';
  const resolveStepHref = (rawTo: string): string => {
    const lvlLower = activeLevel.toLowerCase();
    if (rawTo === `/vocabulary/${lvlLower}`) {
      return `/vocabulary/${lvlLower}/book/${activeTextbook.id}`;
    }
    if (rawTo === `/flashcard/${lvlLower}`) {
      return `/flashcard/${lvlLower}/book/${activeTextbook.id}`;
    }
    if (
      rawTo === '/vocabulary/quiz' ||
      rawTo === '/vocabulary/writing' ||
      rawTo === '/vocabulary/review' ||
      rawTo === '/vocabulary/unmastered'
    ) {
      return `${rawTo}${toolQuery}`;
    }
    if (rawTo.startsWith('/jlpt/') && jlptQuery && !rawTo.includes('?')) {
      return `${rawTo}${jlptQuery}`;
    }
    return rawTo;
  };
  const totalSteps = getRoadmapStepCount(activeLevel);
  const doneInLevel = roadmap.phases.reduce(
    (sum, phase) => sum + phase.steps.filter((step) => completedSet.has(step.id)).length,
    0,
  );
  const nextStepInfo = getNextRoadmapStep(activeLevel, completedSteps);
  const isViewingPrimary = studyLevel === activeLevel;

  return (
    <PageContainer size="lg" className="max-w-5xl space-y-5 py-2">
      <PageHeader
        breadcrumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Học theo lộ trình' }]}
        title={`Lộ trình JLPT ${roadmap.level}`}
        description={roadmap.summary}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/roadmap/stages"
              className={buttonStyles({ variant: 'primary', size: 'sm' })}
            >
              Bản đồ Chặng &amp; Màn
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<GraduationCap className="size-4 text-primary-fg" aria-hidden />}
              onClick={requestOpenLevelModal}
            >
              Đổi trình độ chính
            </Button>
          </div>
        }
      />

      {/* 5-Level Selector Strip */}
      <div
        role="tablist"
        aria-label="5 trình độ JLPT"
        className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-glass p-2 shadow-card"
      >
        {STUDY_LEVEL_OPTIONS.map((opt) => {
          const selected = activeLevel === opt.level;
          const isPrimary = studyLevel === opt.level;
          return (
            <button
              key={opt.level}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setViewingLevelOverride(opt.level)}
              className={cn(
                'flex flex-1 min-w-[100px] cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                selected
                  ? 'bg-primary text-on-primary shadow-card'
                  : 'text-fg hover:bg-surface-2',
              )}
            >
              <span>JLPT {opt.level}</span>
              {isPrimary && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    selected ? 'bg-surface/20 text-on-primary' : 'bg-primary-soft text-primary-fg',
                  )}
                >
                  Đang học
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Roadmap Summary Banner */}
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">JLPT {roadmap.level}</Badge>
              <Badge tone="neutral">{roadmap.japaneseLabel}</Badge>
              <Badge tone="neutral">{activeTextbook.shortTitle}</Badge>
              {isViewingPrimary ? (
                <Badge tone="success">Trình độ chính của bạn</Badge>
              ) : (
                <Badge tone="warning">Đang xem trước</Badge>
              )}
            </div>
            <h2 className="text-lg font-bold text-fg">{roadmap.title}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isViewingPrimary && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<Compass className="size-4" aria-hidden />}
                onClick={() => void handleSetPrimaryLevel(activeLevel)}
              >
                Đặt làm trình độ chính ({activeLevel})
              </Button>
            )}
            {nextStepInfo && (
              <Link
                to={resolveStepHref(nextStepInfo.step.to)}
                className={buttonStyles({
                  variant: isViewingPrimary ? 'primary' : 'secondary',
                  size: 'sm',
                })}
              >
                Học bước tiếp theo
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-line bg-surface-2/60 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Clock className="size-3.5 text-primary-fg" aria-hidden />
              Thời lượng
            </div>
            <div className="mt-1 text-sm font-semibold text-fg">{roadmap.durationWeeks}</div>
            <div className="text-xs text-muted">{roadmap.dailyMinutes}</div>
          </div>
          <div className="rounded-lg border border-line bg-surface-2/60 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <BookOpen className="size-3.5 text-primary-fg" aria-hidden />
              Mục tiêu Từ vựng
            </div>
            <div className="mt-1 text-sm font-semibold text-fg tabular-nums">{roadmap.vocabTarget}</div>
          </div>
          <div className="rounded-lg border border-line bg-surface-2/60 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Target className="size-3.5 text-primary-fg" aria-hidden />
              Mục tiêu Kanji
            </div>
            <div className="mt-1 text-sm font-semibold text-fg tabular-nums">{roadmap.kanjiTarget}</div>
          </div>
          <div className="rounded-lg border border-line bg-surface-2/60 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <CheckCircle2 className="size-3.5 text-primary-fg" aria-hidden />
              Mục tiêu Ngữ pháp
            </div>
            <div className="mt-1 text-sm font-semibold text-fg tabular-nums">{roadmap.grammarTarget}</div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-muted">
            <span>Tiến độ lộ trình JLPT {roadmap.level}</span>
            <span className="tabular-nums text-fg">
              {doneInLevel}/{totalSteps} bước hoàn thành
            </span>
          </div>
          <ProgressBar
            value={doneInLevel}
            max={totalSteps}
            label={`Tiến độ lộ trình JLPT ${roadmap.level}`}
          />
        </div>
      </Card>

      {/* 4 Structured Phases */}
      <div className="space-y-4">
        {roadmap.phases.map((phase) => {
          const phaseDone = phase.steps.filter((step) => completedSet.has(step.id)).length;
          const allDone = phaseDone === phase.steps.length;
          return (
            <Card key={phase.id} padding="lg" className="space-y-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold',
                      allDone
                        ? 'bg-success-soft text-success-fg ring-1 ring-success-line'
                        : 'bg-primary-soft text-primary-fg',
                    )}
                  >
                    {phase.phaseNumber}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-fg">{phase.title}</h3>
                    <p className="mt-0.5 text-xs text-muted sm:text-sm">{phase.subtitle}</p>
                  </div>
                </div>
                <Badge tone={allDone ? 'success' : 'neutral'} className="tabular-nums">
                  {phaseDone}/{phase.steps.length} bước
                </Badge>
              </div>

              <ul className="space-y-2.5">
                {phase.steps.map((step) => {
                  const isDone = completedSet.has(step.id);
                  return (
                    <li
                      key={step.id}
                      className={cn(
                        'flex flex-col gap-3 rounded-xl border p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between',
                        isDone
                          ? 'border-success-line bg-success-soft/45'
                          : 'border-line bg-surface-2/50 hover:border-primary/50',
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <button
                          type="button"
                          onClick={() => void handleToggleStep(step.id)}
                          aria-label={isDone ? `Bỏ đánh dấu ${step.title}` : `Đánh dấu hoàn thành ${step.title}`}
                          aria-pressed={isDone}
                          className={cn(
                            'mt-0.5 shrink-0 cursor-pointer rounded-full transition-colors',
                            isDone ? 'text-success-fg' : 'text-muted hover:text-primary-fg',
                          )}
                        >
                          {isDone ? (
                            <CheckCircle2 className="size-5" />
                          ) : (
                            <Circle className="size-5" />
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'text-sm font-semibold sm:text-base',
                                isDone ? 'text-muted line-through' : 'text-fg',
                              )}
                            >
                              {step.title}
                            </span>
                            <Badge tone={SKILL_TONE[step.skill]}>{step.skill}</Badge>
                            <span className="text-xs text-muted">{step.durationLabel}</span>
                          </div>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted sm:text-sm">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      <Link
                        to={resolveStepHref(step.to)}
                        className={buttonStyles({
                          variant: isDone ? 'secondary' : 'soft',
                          size: 'sm',
                          className: 'shrink-0 self-end sm:self-center',
                        })}
                      >
                        {isDone ? 'Ôn lại' : 'Học ngay'}
                        <ArrowRight className="size-3.5" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
};
