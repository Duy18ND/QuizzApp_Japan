import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  FastForward,
  Lock,
  Play,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Notice, ProgressBar } from '../ui';
import { cn } from '../../lib/cn';
import { recordQuizAttempt } from '../../services/quizHistoryService';
import type { StudyLevel } from '../../services/userLevelService';
import type {
  StageBossRecord,
  StageMasteryQuestion,
} from '../../utils/stageBriefingBuilder';

interface StageMasteryTestCardProps {
  stageId: string;
  stageNumber: number;
  level: StudyLevel;
  userId?: string | null;
  questions: StageMasteryQuestion[];
  unlockedBySteps: boolean;
  passedRecord: StageBossRecord | null;
  onPassed: (record: StageBossRecord) => void;
}

export const StageMasteryTestCard: React.FC<StageMasteryTestCardProps> = ({
  stageId,
  stageNumber,
  level,
  userId,
  questions,
  unlockedBySteps,
  passedRecord,
  onPassed,
}) => {
  const [testState, setTestState] = useState<{
    stageId: string;
    active: boolean;
    jumpMode: boolean;
    picks: Record<string, number>;
    submitted: boolean;
    startedAt: number;
  }>({
    stageId,
    active: false,
    jumpMode: false,
    picks: {},
    submitted: false,
    startedAt: 0,
  });

  if (questions.length === 0) return null;

  const isCurrent = testState.stageId === stageId;
  const active = isCurrent ? testState.active : false;
  const jumpMode = isCurrent ? testState.jumpMode : false;
  const picks = isCurrent ? testState.picks : {};
  const submitted = isCurrent ? testState.submitted : false;

  const requiredPct = jumpMode ? 85 : 75;
  const answeredCount = questions.filter((q) => picks[q.id] !== undefined).length;
  const correctCount = questions.filter((q) => picks[q.id] === q.correctIndex).length;
  const accuracyPct = Math.round((correctCount / Math.max(1, questions.length)) * 100);
  const passedThisRun = submitted && accuracyPct >= requiredPct;

  const startTest = (asJumpMode: boolean) => {
    setTestState({
      stageId,
      active: true,
      jumpMode: asJumpMode,
      picks: {},
      submitted: false,
      startedAt: Date.now(),
    });
  };

  const handleSubmit = () => {
    if (answeredCount < questions.length) return;
    const durationSec = testState.startedAt > 0
      ? Math.max(5, Math.round((Date.now() - testState.startedAt) / 1000))
      : 60;

    const wrongMistakes = questions
      .filter((q) => picks[q.id] !== q.correctIndex)
      .map((q) => ({
        id: `${stageId}_${q.id}`,
        grammarId: `STAGE_${stageNumber}`,
        questionId: q.id,
        prompt: q.prompt,
        userAnswer: q.options[picks[q.id]] ?? '',
        correctAnswer: q.options[q.correctIndex],
        explanation: q.explanation,
        options: [...q.options],
        level,
        categoryLabel: `Màn ${stageNumber} · Chốt Màn`,
        practicePath: '/roadmap',
      }));

    void recordQuizAttempt(
      {
        quizType: `roadmap-stage-${stageNumber}`,
        level,
        score: correctCount,
        totalQuestions: questions.length,
        durationSeconds: durationSec,
        mistakesJson: wrongMistakes,
      },
      userId,
    );

    setTestState((prev) => ({ ...prev, submitted: true }));

    if (accuracyPct >= requiredPct) {
      onPassed({
        stageId,
        score: correctCount,
        total: questions.length,
        accuracyPct,
        isJumpPass: jumpMode,
        passedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div
      className={cn(
        'space-y-3 rounded-xl border p-3.5 transition-colors',
        passedRecord
          ? 'border-success-line bg-success-soft/25'
          : unlockedBySteps || active
            ? 'border-sakura/50 bg-sakura-soft/15'
            : 'border-line bg-surface-2/40',
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-lg',
              passedRecord
                ? 'bg-success-soft text-success-fg'
                : unlockedBySteps || active
                  ? 'bg-sakura-soft text-sakura'
                  : 'bg-surface-3 text-muted',
            )}
          >
            {passedRecord ? (
              <Trophy className="size-4" aria-hidden />
            ) : unlockedBySteps || active ? (
              <Award className="size-4" aria-hidden />
            ) : (
              <Lock className="size-4" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-xs font-bold tracking-wide text-fg uppercase">
                Chặng 4 · Mini-Test Chốt Màn ({questions.length} câu tổng hợp · ~5p)
              </p>
              {passedRecord ? (
                <Badge tone="success">
                  ✓ Đạt {passedRecord.score}/{passedRecord.total} ({passedRecord.accuracyPct}%)
                </Badge>
              ) : (
                <Badge tone={unlockedBySteps ? 'sakura' : 'neutral'}>
                  {jumpMode ? 'Thi nhảy cóc · Cần ≥ 85%' : 'Cần đạt ≥ 75%'}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted">
              Trộn Từ vựng + Chữ Hán + Ngữ pháp dấu hiệu của đúng Màn {stageNumber} (chấm điểm không lộ đáp án trước).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {!active && (
            <>
              {passedRecord ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<RotateCcw className="size-3.5" aria-hidden />}
                  onClick={() => startTest(false)}
                >
                  Làm lại Chốt Màn
                </Button>
              ) : unlockedBySteps ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<Play className="size-3.5" aria-hidden />}
                  onClick={() => startTest(false)}
                >
                  Bắt đầu Chốt Màn
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  leftIcon={<FastForward className="size-3.5" aria-hidden />}
                  onClick={() => startTest(true)}
                >
                  Đã biết bài này · Thi nhảy cóc (≥ 85%)
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Locked Hint */}
      {!active && !passedRecord && !unlockedBySteps && (
        <p className="rounded-lg border border-line bg-surface/70 px-3 py-2 text-xs text-muted">
          🔒 Hoàn thành <strong>Chặng 1 → Chặng 3</strong> để mở bài Chốt Màn (yêu cầu ≥ 75%). Nếu bạn đã học qua bài này rồi, có thể chọn{' '}
          <strong>Thi nhảy cóc (≥ 85%)</strong> ở góc phải.
        </p>
      )}

      {/* Active Mini-Test Runner */}
      {active && (
        <div className="space-y-3 border-t border-line pt-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-fg">
                Đã chọn: {answeredCount}/{questions.length} câu
              </span>
              <span className="text-muted">
                Ngưỡng đạt: <strong>≥ {requiredPct}%</strong>
              </span>
            </div>
            <ProgressBar
              value={answeredCount}
              max={questions.length}
              size="sm"
              tone={submitted ? (passedThisRun ? 'success' : 'danger') : 'primary'}
              label="Tiến độ Mini-Test Chốt Màn"
            />
          </div>

          {submitted && (
            <Notice
              tone={passedThisRun ? 'success' : 'warning'}
              title={
                passedThisRun
                  ? `🎉 Xuất sắc! Bạn đạt ${correctCount}/${questions.length} (${accuracyPct}%) — Đã mở khóa hoàn thành Màn ${stageNumber}!`
                  : `Chưa đạt (${correctCount}/${questions.length} · ${accuracyPct}% < ${requiredPct}%)`
              }
            >
              {passedThisRun
                ? 'Bạn có thể bấm nút "Hoàn thành & Mở khóa Màn tiếp theo" bên dưới.'
                : 'Xem lại các câu bị sai màu đỏ ở dưới (có chỉ rõ cần đọc lại Chặng nào) rồi bấm Làm lại nhé!'}
            </Notice>
          )}

          <div className="space-y-2.5">
            {questions.map((q, qIdx) => {
              const chosen = picks[q.id];
              const isWrong = submitted && chosen !== q.correctIndex;
              const isRight = submitted && chosen === q.correctIndex;

              return (
                <div
                  key={q.id}
                  className={cn(
                    'space-y-2 rounded-xl border p-3',
                    isRight
                      ? 'border-success-line bg-success-soft/20'
                      : isWrong
                        ? 'border-danger-line bg-danger-soft/20'
                        : 'border-line bg-surface/90',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="neutral">Câu {qIdx + 1}</Badge>
                    <Badge tone="primary">{q.category}</Badge>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed text-fg sm:text-sm">
                    {q.prompt}
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {q.options.map((opt, optIdx) => {
                      const selectedThis = chosen === optIdx;
                      const showCorrect = submitted && optIdx === q.correctIndex;
                      const showWrong = submitted && selectedThis && optIdx !== q.correctIndex;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={submitted}
                          onClick={() =>
                            setTestState((prev) => ({
                              ...prev,
                              picks: { ...prev.picks, [q.id]: optIdx },
                            }))
                          }
                          className={cn(
                            'flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-all disabled:cursor-default',
                            showCorrect
                              ? 'border-success-line bg-success-soft text-success-fg'
                              : showWrong
                                ? 'border-danger-line bg-danger-soft text-danger-fg'
                                : selectedThis
                                  ? 'border-primary bg-primary-soft text-primary-fg'
                                  : 'border-line bg-surface-2 text-fg hover:border-primary/50',
                          )}
                        >
                          <span lang="ja">{opt}</span>
                          {showCorrect && <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />}
                          {showWrong && <XCircle className="size-3.5 shrink-0" aria-hidden />}
                        </button>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div className="space-y-0.5 border-t border-line pt-1.5 text-[11px]">
                      <p className="text-fg">{q.explanation}</p>
                      {isWrong && (
                        <p className="font-semibold text-warning-fg">→ Gợi ý: {q.reviewHint}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            {!submitted ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTestState((prev) => ({ ...prev, active: false }))}
                >
                  Đóng bài test
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={answeredCount < questions.length}
                  onClick={handleSubmit}
                >
                  Nộp bài Chốt Màn ({answeredCount}/{questions.length})
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant={passedThisRun ? 'secondary' : 'primary'}
                size="sm"
                leftIcon={<RotateCcw className="size-3.5" aria-hidden />}
                onClick={() => startTest(jumpMode)}
              >
                Làm lại Mini-Test
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
