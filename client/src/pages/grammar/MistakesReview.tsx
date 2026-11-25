import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Eye,
  MoreHorizontal,
  Play,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { LoginRequiredState } from '../../components/auth/LoginRequiredState';
import { recordDailyStageSkillActivity } from '../../services/stageRoadmapService';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { useUserProgress } from '../../hooks/useUserProgress';
import {
  buildAttemptMistakeGroups,
  clearAllAttemptMistakes,
  clearAttemptMistakeGroup,
  resolveAttemptMistakeItem,
  useAttemptMistakeResolutions,
  type AttemptMistakeGroup,
  type AttemptMistakeRecord,
} from '../../services/attemptMistakeService';
import { getLiveAllVocabulary, getLiveGrammarBooks } from '../../services/curriculumStore';
import { useQuizHistory } from '../../services/quizHistoryService';
import { clearMistakes } from '../../store/slices/mistakeSlice';
import { shuffleArray } from '../../utils/shuffle';
import { cn } from '../../lib/cn';
import {
  Badge,
  Button,
  Card,
  Dropdown,
  EmptyState,
  Modal,
  PageContainer,
  PageHeader,
  ProgressBar,
  buttonStyles,
} from '../../components/ui';

interface DrillSession {
  title: string;
  redoPath?: string;
  items: AttemptMistakeRecord[];
  index: number;
  resolvedCount: number;
  keptCount: number;
  selectedOption: string | null;
  revealed: boolean;
  shuffledOptions: string[];
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

const formatAttemptDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Vừa xong';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function prepareOptions(mistake: AttemptMistakeRecord | undefined): string[] {
  if (!mistake?.options || mistake.options.length < 2) return [];
  const unique = Array.from(new Set(mistake.options.filter(Boolean)));
  if (!unique.includes(mistake.correctAnswer)) {
    unique.push(mistake.correctAnswer);
  }
  return shuffleArray(unique);
}

export const MistakesReview: React.FC = () => {
  const { user } = useAuth();
  const dispatch = useDispatch();
  const cmsSnapshot = useCurriculumSnapshot();
  const liveGrammarBooks = useMemo(() => getLiveGrammarBooks(cmsSnapshot), [cmsSnapshot]);
  const allVocab = useMemo(() => getLiveAllVocabulary(cmsSnapshot), [cmsSnapshot]);
  const { clearWrongWord, clearAllWrongWords } = useUserProgress();
  const quizHistory = useQuizHistory();
  const resolutions = useAttemptMistakeResolutions();

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [drill, setDrill] = useState<DrillSession | null>(null);
  const [confirmClear, setConfirmClear] = useState<
    { kind: 'all' } | { kind: 'group'; group: AttemptMistakeGroup } | null
  >(null);
  const navigate = useNavigate();

  useEffect(() => {
    recordDailyStageSkillActivity('review', user?.id);
  }, [user?.id]);

  const attemptGroups = useMemo(
    () => buildAttemptMistakeGroups(quizHistory, allVocab, liveGrammarBooks, resolutions),
    [quizHistory, allVocab, liveGrammarBooks, resolutions],
  );

  const allMistakes = useMemo(
    () => attemptGroups.flatMap((group) => group.mistakes),
    [attemptGroups],
  );

  const allExpanded =
    attemptGroups.length > 0 && attemptGroups.every((g) => Boolean(expandedIds[g.attemptId]));

  const toggleGroupExpanded = (attemptId: string) => {
    setExpandedIds((prev) => ({ ...prev, [attemptId]: !prev[attemptId] }));
  };

  const handleToggleExpandAll = () => {
    if (allExpanded) {
      setExpandedIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const g of attemptGroups) {
      next[g.attemptId] = true;
    }
    setExpandedIds(next);
  };

  const handleResolveSingle = (mistake: AttemptMistakeRecord) => {
    resolveAttemptMistakeItem(mistake.attemptId, mistake.id, user?.id);
    if (typeof mistake.wordId === 'number') {
      const stillInOtherAttempt = allMistakes.some(
        (m) =>
          m.wordId === mistake.wordId &&
          !(m.attemptId === mistake.attemptId && m.id === mistake.id),
      );
      if (!stillInOtherAttempt) {
        clearWrongWord(mistake.wordId);
      }
    }
  };

  const handleClearGroup = (group: AttemptMistakeGroup) => {
    clearAttemptMistakeGroup(group.attemptId, user?.id);
  };

  const handleClearAll = () => {
    clearAllAttemptMistakes(
      attemptGroups.map((g) => g.attemptId),
      user?.id,
    );
    dispatch(clearMistakes());
    clearAllWrongWords();
  };

  const startDrill = (title: string, items: AttemptMistakeRecord[], redoPath?: string) => {
    if (items.length === 0) return;
    const ordered = [...items];
    setDrill({
      title,
      redoPath,
      items: ordered,
      index: 0,
      resolvedCount: 0,
      keptCount: 0,
      selectedOption: null,
      revealed: false,
      shuffledOptions: prepareOptions(ordered[0]),
    });
  };

  const advanceDrill = (wasResolved: boolean, currentMistake: AttemptMistakeRecord) => {
    if (wasResolved) {
      handleResolveSingle(currentMistake);
    }
    setDrill((prev) => {
      if (!prev) return null;
      const nextIdx = prev.index + 1;
      const nextItem = prev.items[nextIdx];
      return {
        ...prev,
        index: nextIdx,
        resolvedCount: prev.resolvedCount + (wasResolved ? 1 : 0),
        keptCount: prev.keptCount + (wasResolved ? 0 : 1),
        selectedOption: null,
        revealed: false,
        shuffledOptions: prepareOptions(nextItem),
      };
    });
  };

  if (user && drill) {
    const isComplete = drill.index >= drill.items.length;
    const currentMistake = drill.items[drill.index];

    if (isComplete || !currentMistake) {
      return (
        <PageContainer size="sm" className="py-6">
          <Card padding="lg" className="space-y-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-success-soft text-success-fg">
              <CheckCircle2 className="size-7" aria-hidden />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">{drill.title}</p>
              <h1 className="text-2xl font-bold text-fg">Hoàn thành ôn lỗi sai!</h1>
              <p className="text-sm text-muted">
                Bạn đã khắc phục được <strong>{drill.resolvedCount}</strong> / {drill.items.length} câu sai.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface-2 p-4">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-success-fg">Đã nhớ</p>
                <p className="tabular text-2xl font-bold text-fg">{drill.resolvedCount}</p>
              </div>
              <div className="space-y-0.5 border-l border-line">
                <p className="text-xs font-medium text-danger-fg">Cần ôn thêm</p>
                <p className="tabular text-2xl font-bold text-fg">{drill.keptCount}</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="primary" onClick={() => setDrill(null)}>
                Quay lại danh sách lỗi sai
              </Button>
              {drill.redoPath && (
                <Link
                  to={drill.redoPath}
                  className={buttonStyles({ variant: 'secondary' })}
                >
                  <RotateCcw className="size-4" aria-hidden />
                  Làm lại bài này
                </Link>
              )}
            </div>
          </Card>
        </PageContainer>
      );
    }

    const hasOptions = drill.shuffledOptions.length >= 2;
    const isAnswered = drill.selectedOption !== null;
    const isCorrectSelection = drill.selectedOption === currentMistake.correctAnswer;

    return (
      <PageContainer size="md" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDrill(null)}>
            ← Quay lại danh sách
          </Button>
          <span className="tabular text-sm font-semibold text-fg">
            Câu {drill.index + 1} / {drill.items.length}
          </span>
        </div>

        <ProgressBar
          value={drill.index + (isAnswered || drill.revealed ? 1 : 0)}
          max={drill.items.length}
          label="Tiến độ ôn lỗi sai"
          size="sm"
        />

        <Card padding="lg" className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {currentMistake.level && <Badge tone="primary">{currentMistake.level}</Badge>}
            <Badge tone="neutral">{drill.title}</Badge>
            <Badge tone="danger">Từng chọn sai: {currentMistake.userAnswer}</Badge>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Câu hỏi</p>
            <p lang="ja" className="text-xl font-bold leading-relaxed text-fg md:text-2xl">
              {currentMistake.prompt}
            </p>
          </div>

          {hasOptions ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {drill.shuffledOptions.map((opt, idx) => {
                  const isThisSelected = drill.selectedOption === opt;
                  const isThisCorrect = opt === currentMistake.correctAnswer;
                  return (
                    <button
                      key={`${opt}-${idx}`}
                      type="button"
                      disabled={isAnswered}
                      onClick={() =>
                        setDrill((prev) => (prev ? { ...prev, selectedOption: opt } : prev))
                      }
                      className={cn(
                        'flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors',
                        !isAnswered &&
                          'cursor-pointer border-line bg-surface text-fg hover:border-primary hover:bg-surface-2',
                        isAnswered &&
                          isThisCorrect &&
                          'border-success-line bg-success-soft text-success-fg',
                        isAnswered &&
                          isThisSelected &&
                          !isThisCorrect &&
                          'border-danger-line bg-danger-soft text-danger-fg',
                        isAnswered &&
                          !isThisCorrect &&
                          !isThisSelected &&
                          'border-line bg-surface-2/60 text-muted opacity-70',
                      )}
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-current/25 text-xs font-bold">
                        {OPTION_LABELS[idx] || idx + 1}
                      </span>
                      <span lang="ja" className="flex-1 text-base">
                        {opt}
                      </span>
                      {isAnswered && isThisCorrect && (
                        <CheckCircle2 className="size-5 shrink-0 text-success-fg" aria-hidden />
                      )}
                      {isAnswered && isThisSelected && !isThisCorrect && (
                        <XCircle className="size-5 shrink-0 text-danger-fg" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <div className="space-y-4">
                  <div
                    className={cn(
                      'rounded-xl border p-4 text-sm',
                      isCorrectSelection
                        ? 'border-success-line bg-success-soft text-success-fg'
                        : 'border-danger-line bg-danger-soft text-danger-fg',
                    )}
                  >
                    <p className="font-semibold">
                      {isCorrectSelection
                        ? 'Chính xác! Câu này sẽ được gỡ khỏi danh sách lỗi sai.'
                        : `Chưa đúng. Đáp án đúng là: ${currentMistake.correctAnswer}`}
                    </p>
                    {currentMistake.explanation && (
                      <p className="mt-2 leading-relaxed text-fg">{currentMistake.explanation}</p>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    rightIcon={<ArrowRight className="size-4" aria-hidden />}
                    onClick={() => advanceDrill(isCorrectSelection, currentMistake)}
                  >
                    {drill.index >= drill.items.length - 1 ? 'Hoàn thành' : 'Câu tiếp theo'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!drill.revealed ? (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  leftIcon={<Eye className="size-4" aria-hidden />}
                  onClick={() => setDrill((prev) => (prev ? { ...prev, revealed: true } : prev))}
                >
                  Xem đáp án đúng
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-success-line bg-success-soft p-4">
                    <p className="text-xs font-semibold text-success-fg uppercase">Đáp án đúng</p>
                    <p lang="ja" className="mt-1 text-lg font-bold text-fg">
                      {currentMistake.correctAnswer}
                    </p>
                    {currentMistake.explanation && (
                      <p className="mt-2 text-sm leading-relaxed text-muted">
                        {currentMistake.explanation}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => advanceDrill(false, currentMistake)}
                    >
                      Chưa nhớ
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      leftIcon={<Check className="size-4" aria-hidden />}
                      onClick={() => advanceDrill(true, currentMistake)}
                    >
                      Đã nhớ
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </PageContainer>
    );
  }

  const confirmClearAction = () => {
    if (!confirmClear) return;
    if (confirmClear.kind === 'all') {
      handleClearAll();
    } else {
      handleClearGroup(confirmClear.group);
    }
    setConfirmClear(null);
  };

  return (
    <PageContainer size="md" className="space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Ôn tập lỗi sai' },
        ]}
        title="Ôn tập lỗi sai"
        description="Ôn lại những câu bạn từng làm sai. Trả lời đúng thì câu đó tự được gỡ khỏi danh sách."
      />

      {!user ? (
        <LoginRequiredState
          title="Đăng nhập để lưu & ôn tập lỗi sai"
          description="Câu làm sai được lưu vào tài khoản để bạn ôn lại bất cứ lúc nào."
        />
      ) : attemptGroups.length === 0 ? (
        <EmptyState
          icon={<CircleCheck className="size-6 text-success-fg" aria-hidden />}
          title="Không có lỗi sai nào!"
          description="Tuyệt vời, bạn đang làm rất tốt."
          action={
            <Link to="/" className={buttonStyles({ variant: 'secondary' })}>
              Quay lại Trang chủ
            </Link>
          }
        />
      ) : (
        <>
          {/* Summary + one main action */}
          <Card padding="md" className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="tabular text-2xl font-bold text-fg">
                {allMistakes.length}{' '}
                <span className="text-base font-medium text-muted">câu cần ôn</span>
              </p>
              <p className="text-sm text-muted">từ {attemptGroups.length} bài đã làm</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="primary"
                leftIcon={<Play className="size-4" aria-hidden />}
                onClick={() => startDrill('Ôn tất cả lỗi sai', allMistakes)}
              >
                Ôn tất cả
              </Button>
              <Dropdown
                variant="ghost"
                align="end"
                aria-label="Tùy chọn khác"
                label={<MoreHorizontal className="size-5" aria-hidden />}
                items={[
                  {
                    id: 'toggle-expand',
                    label: allExpanded ? 'Thu gọn tất cả' : 'Xem chi tiết tất cả',
                    icon: allExpanded ? (
                      <ChevronUp className="size-4" aria-hidden />
                    ) : (
                      <ChevronDown className="size-4" aria-hidden />
                    ),
                    onSelect: handleToggleExpandAll,
                  },
                  {
                    id: 'clear-all',
                    label: 'Xóa tất cả lỗi sai',
                    icon: <Trash2 className="size-4" aria-hidden />,
                    tone: 'danger',
                    onSelect: () => setConfirmClear({ kind: 'all' }),
                  },
                ]}
              />
            </div>
          </Card>

          <ul className="space-y-2.5">
            {attemptGroups.map((group) => {
              const isExpanded = Boolean(expandedIds[group.attemptId]);
              const resultLabel =
                group.percent >= 100
                  ? 'cuối cùng đã đúng hết'
                  : `đúng ${group.score}/${group.totalQuestions}`;

              return (
                <li key={group.attemptId}>
                  <Card padding="none" className="overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => toggleGroupExpanded(group.attemptId)}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                      >
                        <span
                          className="tabular grid size-10 shrink-0 place-items-center rounded-xl bg-danger-soft text-base font-bold text-danger-fg"
                          title={`${group.mistakes.length} câu sai`}
                        >
                          {group.mistakes.length}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span lang="ja" className="truncate text-sm font-semibold text-fg md:text-base">
                              {group.title}
                            </span>
                            {group.level && group.level !== 'ALL' && (
                              <Badge tone="primary">{group.level}</Badge>
                            )}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {group.mistakes.length} câu sai · {formatAttemptDate(group.createdAt)} ·{' '}
                            {resultLabel}
                          </span>
                        </span>
                        <ChevronDown
                          className={cn(
                            'size-4 shrink-0 text-muted transition-transform duration-150',
                            isExpanded && 'rotate-180',
                          )}
                          aria-hidden
                        />
                      </button>

                      <Button
                        variant="soft"
                        size="sm"
                        leftIcon={<Play className="size-3.5" aria-hidden />}
                        onClick={() => startDrill(group.title, group.mistakes, group.redoPath)}
                      >
                        Ôn
                      </Button>
                      <Dropdown
                        variant="ghost"
                        size="sm"
                        align="end"
                        aria-label={`Tùy chọn cho ${group.title}`}
                        label={<MoreHorizontal className="size-4" aria-hidden />}
                        items={[
                          {
                            id: 'redo',
                            label: 'Làm lại cả bài',
                            icon: <RotateCcw className="size-4" aria-hidden />,
                            onSelect: () => navigate(group.redoPath),
                          },
                          {
                            id: 'clear',
                            label: 'Xóa khỏi danh sách',
                            icon: <Trash2 className="size-4" aria-hidden />,
                            tone: 'danger',
                            onSelect: () => setConfirmClear({ kind: 'group', group }),
                          },
                        ]}
                      />
                    </div>

                    {isExpanded && (
                      <ul className="divide-y divide-line border-t border-line">
                        {group.mistakes.map((mistake) => (
                          <li
                            key={`${group.attemptId}-${mistake.id}`}
                            className="flex items-start gap-3 px-4 py-3"
                          >
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <p lang="ja" className="text-sm font-medium leading-relaxed text-fg">
                                {mistake.prompt}
                              </p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                <span className="inline-flex items-center gap-1 text-danger-fg">
                                  <XCircle className="size-4 shrink-0" aria-label="Bạn chọn" />
                                  <span lang="ja" className="line-through">
                                    {mistake.userAnswer}
                                  </span>
                                </span>
                                <span className="inline-flex items-center gap-1 text-success-fg">
                                  <CheckCircle2 className="size-4 shrink-0" aria-label="Đáp án đúng" />
                                  <span lang="ja" className="font-semibold">
                                    {mistake.correctAnswer}
                                  </span>
                                </span>
                              </div>
                              {mistake.explanation && (
                                <p className="text-xs leading-relaxed text-muted">{mistake.explanation}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Check className="size-3.5 text-success-fg" aria-hidden />}
                              onClick={() => handleResolveSingle(mistake)}
                            >
                              Đã nhớ
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Modal
        open={confirmClear !== null}
        onClose={() => setConfirmClear(null)}
        size="sm"
        title={confirmClear?.kind === 'all' ? 'Xóa tất cả lỗi sai?' : 'Xóa bài này khỏi danh sách?'}
        description={
          confirmClear?.kind === 'all'
            ? `${allMistakes.length} câu sai sẽ bị xóa và không khôi phục được.`
            : confirmClear?.kind === 'group'
              ? `${confirmClear.group.mistakes.length} câu sai của "${confirmClear.group.title}" sẽ bị xóa.`
              : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmClear(null)}>
              Hủy
            </Button>
            <Button variant="danger" onClick={confirmClearAction}>
              Xóa
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">Bạn vẫn có thể làm lại bài để ôn tập bất cứ lúc nào.</p>
      </Modal>
    </PageContainer>
  );
};
