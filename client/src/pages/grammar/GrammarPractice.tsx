import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, ArrowRight, CheckCircle2, FileText, RefreshCw, XCircle } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { recordQuizAttempt } from '../../services/quizHistoryService';
import type { RootState } from '../../store';
import {
  nextQuestion,
  resetPractice,
  startPractice,
  submitAnswer,
} from '../../store/slices/practiceSlice';
import { updateProgress } from '../../store/slices/grammarProgressSlice';
import { addMistake } from '../../store/slices/mistakeSlice';
import { PracticeQuestionRenderer } from '../../components/practice/PracticeQuestionRenderer';
import type { PracticeQuestion, PracticeType } from '../../types/grammar';
import { grammarBooks } from '../../data/grammar';
import { shuffleArray } from '../../utils/shuffle';
import {
  lesson01PracticeBank,
  validateGrammarPracticeBanks,
} from '../../data/grammar/shinkanzen-n3/lesson01PracticeBank';

validateGrammarPracticeBanks();
import { generateSmartQuestionSet } from '../../utils/grammarEngine/questionGenerator';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Kbd,
  LoadingState,
  Notice,
  PageContainer,
  ProgressBar,
} from '../../components/ui';

interface FeedbackState {
  isCorrect: boolean;
  correctAnswer: string | string[];
  explanation?: string;
  feedbackMsg?: string;
}

interface QuestionMetadata {
  japanese?: string;
  vietnamese?: string;
  grammarName?: string;
  grammarMeaning?: string;
  grammarExplanation?: string;
}

const selectBankQuestions = (ruleId: string, practiceMode: PracticeType): PracticeQuestion[] => {
  const bankQuestions = lesson01PracticeBank[ruleId] || [];
  if (bankQuestions.length === 0) return [];
  if (practiceMode === 'mixed') return bankQuestions;
  return bankQuestions.filter((q) => q.type === practiceMode);
};

export const GrammarPractice: React.FC = () => {
  const { bookId, chapterId, grammarId } = useParams<{
    bookId: string;
    chapterId: string;
    grammarId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get('mode') as PracticeType) || 'fill_blank';
  const countParam = parseInt(searchParams.get('count') || '10', 10);
  const questionCount = isNaN(countParam) || countParam <= 0 ? 10 : countParam;
  const [currentSeed] = useState<number>(() => Date.now());
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const sessionStartRef = useRef<number>(0);
  const sessionMistakesRef = useRef<Array<Record<string, string>>>([]);

  const practice = useSelector((state: RootState) => state.practice);

  const { isInvalidTarget, rulesToPractice } = useMemo(() => {
    const b = grammarBooks.find((bk) => bk.id === bookId);
    const c = b?.chapters.find((ch) => ch.id === chapterId);

    let rules = c?.grammars || [];
    if (grammarId) {
      rules = rules.filter((r) => r.id === grammarId);
    }
    return {
      isInvalidTarget: !b || !c || rules.length === 0,
      rulesToPractice: rules,
    };
  }, [bookId, chapterId, grammarId]);

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    return () => {
      setFeedback(null);
      dispatch(resetPractice());
    };
  }, [dispatch, bookId, chapterId, grammarId, mode, questionCount]);

  useEffect(() => {
    if (rulesToPractice.length > 0 && !practice.isActive && !practice.isFinished) {
      let allQuestions: PracticeQuestion[] = [];

      if (grammarId) {
        const bankQuestions = selectBankQuestions(grammarId, mode);
        if (bankQuestions.length > 0) {
          allQuestions = [...bankQuestions];
        } else {
          const generated = generateSmartQuestionSet({
            grammarRule: rulesToPractice[0],
            count: questionCount,
            seed: currentSeed,
            rawVocabulary: [],
            requestedPracticeTypes: [mode],
          });
          allQuestions = generated.questions;
        }
      } else {
        rulesToPractice.forEach((rule) => {
          const bankQuestions = selectBankQuestions(rule.id, mode);
          if (bankQuestions.length > 0) {
            allQuestions = [...allQuestions, ...bankQuestions];
          } else {
            const generated = generateSmartQuestionSet({
              grammarRule: rule,
              count: Math.max(4, Math.ceil(questionCount / rulesToPractice.length)),
              seed: currentSeed,
              rawVocabulary: [],
              requestedPracticeTypes: [mode],
            });
            allQuestions = [...allQuestions, ...generated.questions];
          }
        });
      }

      let shuffled = shuffleArray([...allQuestions]);

      if (shuffled.length > questionCount) {
        shuffled = shuffled.slice(0, questionCount);
      }

      if (shuffled.length === 0) {
        shuffled.push({
          id: 'fb-1',
          grammarId: rulesToPractice[0].id,
          type: 'fill_blank',
          question: 'Mock Question (Chưa có bộ câu luyện cho grammar này)',
          instruction: 'Điền đáp án phù hợp',
          correctAnswer: 'mock',
        });
      }

      sessionStartRef.current = Date.now();
      sessionMistakesRef.current = [];
      dispatch(startPractice({ mode, questions: shuffled }));
    }
  }, [rulesToPractice, mode, questionCount, currentSeed, practice.isActive, practice.isFinished, dispatch, grammarId]);

  const handleSubmit = (answer: string, isCorrect: boolean, feedbackMsg?: string) => {
    const currentQ = practice.questions[practice.currentQuestionIndex];
    setFeedback({
      isCorrect,
      correctAnswer: currentQ.correctAnswer,
      explanation: currentQ.explanation,
      feedbackMsg,
    });

    dispatch(submitAnswer({ questionId: currentQ.id, answer, isCorrect }));

    if (!isCorrect) {
      sessionMistakesRef.current.push({
        grammarId: currentQ.grammarId,
        questionId: currentQ.id,
        userAnswer: answer,
      });
      dispatch(
        addMistake({
          id: Date.now().toString(),
          grammarId: currentQ.grammarId,
          questionId: currentQ.id.replace(/-\d{10,}$/, ''),
          userAnswer: answer,
          correctAnswer: Array.isArray(currentQ.correctAnswer)
            ? currentQ.correctAnswer[0]
            : currentQ.correctAnswer,
          errorType: 'wrong_grammar',
          createdAt: new Date().toISOString(),
          prompt: currentQ.question || currentQ.instruction,
          explanation: currentQ.explanation,
        }),
      );
    }
  };

  const handleNext = useCallback(() => {
    setFeedback(null);
    if (practice.currentQuestionIndex >= practice.questions.length - 1) {
      const total = Math.max(1, practice.score.correct + practice.score.wrong);
      const progress = Math.round((practice.score.correct / total) * 100);
      const durationSeconds =
        sessionStartRef.current > 0
          ? Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 1000))
          : 0;
      const level = rulesToPractice[0]?.level || 'N3';

      if (grammarId) {
        dispatch(updateProgress({ grammarId, type: mode, score: progress }));
      }
      void recordQuizAttempt(
        {
          quizType: 'grammar',
          level,
          score: practice.score.correct,
          totalQuestions: total,
          durationSeconds,
          mistakesJson: sessionMistakesRef.current,
        },
        user?.id,
      );
      dispatch(nextQuestion());
    } else {
      dispatch(nextQuestion());
    }
  }, [
    practice.currentQuestionIndex,
    practice.questions.length,
    practice.score.correct,
    practice.score.wrong,
    grammarId,
    mode,
    rulesToPractice,
    user?.id,
    dispatch,
  ]);

  useEffect(() => {
    if (!feedback) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }
      if (event.key === 'Enter' || event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [feedback, handleNext]);

  if (isInvalidTarget) {
    return (
      <PageContainer size="md">
        <ErrorState
          title="Không tìm thấy bài luyện tập ngữ pháp"
          description="Giáo trình, chương hoặc mẫu ngữ pháp bạn yêu cầu không tồn tại."
          onRetry={() => navigate('/grammar')}
          retryLabel="Về trang Ngữ pháp"
          className="bg-surface/90 backdrop-blur-md"
        />
      </PageContainer>
    );
  }

  if (!practice.isActive) {
    return (
      <PageContainer size="md">
        <LoadingState label="Đang chuẩn bị bài luyện tập..." />
      </PageContainer>
    );
  }

  if (practice.isFinished) {
    const total = practice.questions.length;
    const percentage = total > 0 ? Math.round((practice.score.correct / total) * 100) : 0;

    return (
      <PageContainer size="sm" className="py-6">
        <Card padding="lg" className="space-y-6 text-center">
          <div>
            <p className="text-sm font-medium text-muted">Kết quả luyện tập</p>
            <h1 className="mt-1 text-2xl font-bold text-fg md:text-3xl">Hoàn thành!</h1>
          </div>

          <div className="space-y-3">
            <p className="tabular text-5xl font-bold text-primary-fg">
              {practice.score.correct}{' '}
              <span className="text-2xl font-medium text-muted">/ {total}</span>
            </p>
            <p className="tabular text-base font-semibold text-fg">{percentage}% chính xác</p>
            <ProgressBar
              value={practice.score.correct}
              max={total}
              label="Tỷ lệ chính xác"
              tone={percentage >= 80 ? 'success' : 'primary'}
              className="mx-auto max-w-xs"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="secondary"
              size="lg"
              leftIcon={<RefreshCw className="size-4" aria-hidden />}
              onClick={() => {
                setFeedback(null);
                dispatch(resetPractice());
              }}
            >
              Làm lại
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                dispatch(resetPractice());
                navigate(`/grammar/${bookId}/${chapterId}`);
              }}
            >
              Quay lại bài học
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  const currentQ = practice.questions[practice.currentQuestionIndex];
  const meta = currentQ.metadata as QuestionMetadata | undefined;

  return (
    <PageContainer size="md" className="space-y-5">
      {/* Top context bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="size-4" aria-hidden />}
          onClick={() => {
            dispatch(resetPractice());
            navigate(`/grammar/${bookId}/${chapterId}`);
          }}
          className="-ml-2"
        >
          Về bài học
        </Button>

        <div className="flex items-center gap-2">
          <Badge tone="neutral" className="jp max-w-48 truncate">
            {grammarId
              ? rulesToPractice[0]?.name
              : `Toàn bộ bài (${rulesToPractice.length} cấu trúc)`}
          </Badge>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<FileText className="size-4" aria-hidden />}
            onClick={() =>
              navigate(
                `/pdf?tab=grammar&chapterId=${chapterId}${grammarId ? `&grammarId=${grammarId}` : ''}&seed=${currentSeed}&count=${questionCount}&mode=${mode}`,
              )
            }
          >
            Tạo PDF
          </Button>
        </div>
      </div>

      {/* Progress & Counter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Badge tone="primary" className="tabular">
            Câu {practice.currentQuestionIndex + 1} / {practice.questions.length}
          </Badge>
          <div className="tabular flex items-center gap-3 text-sm font-semibold">
            <span className="inline-flex items-center gap-1 text-success-fg">
              <CheckCircle2 className="size-4" aria-hidden />
              {practice.score.correct}
            </span>
            <span className="inline-flex items-center gap-1 text-danger-fg">
              <XCircle className="size-4" aria-hidden />
              {practice.score.wrong}
            </span>
          </div>
        </div>

        <ProgressBar
          value={practice.currentQuestionIndex + 1}
          max={practice.questions.length}
          label="Tiến độ luyện tập ngữ pháp"
        />
      </div>

      {/* Main Question / Feedback */}
      <Card padding="lg">
        {!feedback ? (
          <PracticeQuestionRenderer
            mode={mode === 'mixed' ? currentQ.type : mode}
            question={currentQ}
            onSubmit={handleSubmit}
          />
        ) : (
          <div className="animate-fade-in space-y-5">
            <Notice tone={feedback.isCorrect ? 'success' : 'danger'} className="space-y-1.5">
              <div className="flex items-center gap-2 text-base font-bold">
                {feedback.isCorrect ? (
                  <>
                    <CheckCircle2 className="size-5 shrink-0" aria-hidden />
                    Chính xác!
                  </>
                ) : (
                  <>
                    <XCircle className="size-5 shrink-0" aria-hidden />
                    Chưa chính xác!
                  </>
                )}
              </div>
              {feedback.feedbackMsg && <p className="text-sm text-fg">{feedback.feedbackMsg}</p>}
              {!feedback.isCorrect && (
                <p className="text-sm text-fg">
                  Đáp án đúng:{' '}
                  <span lang="ja" className="font-bold text-success-fg">
                    {Array.isArray(feedback.correctAnswer)
                      ? feedback.correctAnswer.join(' / ')
                      : feedback.correctAnswer}
                  </span>
                </p>
              )}
            </Notice>

            {feedback.explanation && (
              <div className="space-y-4 rounded-xl border border-line bg-surface-2 p-5 text-sm">
                {meta?.japanese ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold tracking-wide text-primary-fg uppercase">
                        Câu gốc & Dịch nghĩa
                      </p>
                      <p lang="ja" className="text-lg font-semibold text-fg">
                        {meta.japanese}
                      </p>
                      {meta.vietnamese && <p className="text-muted">{meta.vietnamese}</p>}
                    </div>
                    <div className="space-y-1 border-t border-line pt-4">
                      <p className="text-xs font-semibold tracking-wide text-primary-fg uppercase">
                        Ngữ pháp: <span lang="ja">{meta.grammarName}</span>
                      </p>
                      <p className="font-medium text-fg">Ý nghĩa: {meta.grammarMeaning}</p>
                      {meta.grammarExplanation && (
                        <p className="leading-relaxed text-muted">{meta.grammarExplanation}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold tracking-wide text-primary-fg uppercase">
                      Giải thích chi tiết
                    </p>
                    <p className="leading-relaxed whitespace-pre-wrap text-fg">
                      {feedback.explanation}
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleNext}
              rightIcon={<ArrowRight className="size-4" aria-hidden />}
            >
              {practice.currentQuestionIndex >= practice.questions.length - 1
                ? 'Xem kết quả'
                : 'Tiếp tục'}
              <Kbd className="hidden border-transparent bg-surface/20 text-on-primary md:inline-flex">
                Enter
              </Kbd>
            </Button>
          </div>
        )}
      </Card>
    </PageContainer>
  );
};
