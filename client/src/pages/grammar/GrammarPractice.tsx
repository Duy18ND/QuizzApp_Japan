import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  RefreshCw,
  Sparkles,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { clearAttemptMistakeGroup } from '../../services/attemptMistakeService';
import { saveLastPracticeTarget } from '../../services/lastPracticeService';
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
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { getLiveGrammarBooks } from '../../services/curriculumStore';
import {
  buildGrammarDeepInsight,
  toScenarioPracticeQuestion,
  type ScenarioOptionExplanation,
} from '../../utils/grammarEngine/grammarInsightEngine';
import { shuffleArray } from '../../utils/shuffle';
import { speakJapanese } from '../../utils/tts';
import {
  lesson01PracticeBank,
  validateGrammarPracticeBanks,
} from '../../data/grammar/shinkanzen-n3/lesson01PracticeBank';

validateGrammarPracticeBanks();
import { generateSmartQuestionSet } from '../../utils/grammarEngine/questionGenerator';
import {
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
  isScenarioQuestion?: boolean;
  badgeLabel?: string;
  japanese?: string;
  vietnamese?: string;
  grammarName?: string;
  grammarMeaning?: string;
  grammarExplanation?: string;
  optionBreakdowns?: ScenarioOptionExplanation[];
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
  const [searchParams, setSearchParams] = useSearchParams();
  const rawModeParam = searchParams.get('mode') || 'scenario';
  const isScenarioMode = rawModeParam === 'scenario';
  const mode: PracticeType =
    rawModeParam === 'scenario' ? 'grammar_selection' : (rawModeParam as PracticeType) || 'mixed';
  const countParam = parseInt(searchParams.get('count') || '12', 10);
  const questionCount = isNaN(countParam) || countParam <= 0 ? 12 : countParam;
  const [currentSeed] = useState<number>(() => Date.now());
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const sessionStartRef = useRef<number>(0);
  const sessionMistakesRef = useRef<Array<Record<string, unknown>>>([]);

  const practice = useSelector((state: RootState) => state.practice);
  const cmsSnapshot = useCurriculumSnapshot();

  const { isInvalidTarget, rulesToPractice, chapterObj, allLevelRules } = useMemo(() => {
    const books = getLiveGrammarBooks(cmsSnapshot);
    const b = books.find((bk) => bk.id === bookId);
    const c = b?.chapters.find((ch) => ch.id === chapterId);
    const levelRules = books
      .filter((bk) => bk.level === (b?.level ?? 'N3'))
      .flatMap((bk) => bk.chapters.flatMap((ch) => ch.grammars));

    let rules = c?.grammars || [];
    if (grammarId) {
      rules = rules.filter((r) => r.id === grammarId);
    }
    return {
      isInvalidTarget: !b || !c || rules.length === 0,
      rulesToPractice: rules,
      chapterObj: c,
      allLevelRules: levelRules,
    };
  }, [cmsSnapshot, bookId, chapterId, grammarId]);

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    return () => {
      setFeedback(null);
      dispatch(resetPractice());
    };
  }, [dispatch, bookId, chapterId, grammarId, mode, isScenarioMode, questionCount]);

  useEffect(() => {
    if (rulesToPractice.length > 0 && !practice.isActive && !practice.isFinished) {
      let allQuestions: PracticeQuestion[] = [];

      const buildScenarioQuestionsForRules = () => {
        const scenarioList: PracticeQuestion[] = [];
        const peerRules = chapterObj?.grammars ?? rulesToPractice;
        for (const rule of rulesToPractice) {
          const insight = buildGrammarDeepInsight(rule, peerRules, allLevelRules);
          for (const sc of insight.scenarioQuestions) {
            scenarioList.push(
              toScenarioPracticeQuestion(sc, rule, shuffleArray([...sc.options])),
            );
          }
        }
        return scenarioList;
      };

      if (isScenarioMode) {
        allQuestions = buildScenarioQuestionsForRules();
      } else if (grammarId) {
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
        if (mode === 'mixed') {
          allQuestions = [...buildScenarioQuestionsForRules(), ...allQuestions];
        }
      } else {
        if (mode === 'mixed') {
          allQuestions = [...buildScenarioQuestionsForRules()];
        }
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
      const practiceRoute = `/grammar/${bookId}/${chapterId}/practice${grammarId ? `/${grammarId}` : ''}?mode=${mode}&count=${questionCount}`;
      const labelTitle = grammarId
        ? rulesToPractice[0]?.name || grammarId
        : `Luyện Ngữ pháp · ${rulesToPractice[0]?.level || 'N3'}`;
      saveLastPracticeTarget(
        {
          path: practiceRoute,
          label: labelTitle,
          level: rulesToPractice[0]?.level,
          quizType: 'grammar',
        },
        user?.id,
      );
      dispatch(startPractice({ mode, questions: shuffled }));
    }
  }, [
    rulesToPractice,
    chapterObj,
    allLevelRules,
    isScenarioMode,
    mode,
    questionCount,
    currentSeed,
    practice.isActive,
    practice.isFinished,
    dispatch,
    grammarId,
    bookId,
    chapterId,
    user?.id,
  ]);

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
      const matchedRule = rulesToPractice.find((r) => r.id === currentQ.grammarId) ?? rulesToPractice[0];
      const practicePath = `/grammar/${bookId}/${chapterId}/practice/${currentQ.grammarId}?mode=${mode}`;
      const mcqOptions =
        'answers' in currentQ && Array.isArray(currentQ.answers) && currentQ.answers.length >= 2
          ? currentQ.answers
          : undefined;
      const correctText = Array.isArray(currentQ.correctAnswer)
        ? currentQ.correctAnswer[0]
        : currentQ.correctAnswer;
      const mistakeId = `grammar_${currentQ.grammarId}_${Date.now()}_${sessionMistakesRef.current.length}`;
      const categoryLabel = matchedRule ? `Ngữ pháp · ${matchedRule.name}` : 'Luyện Ngữ pháp';
      sessionMistakesRef.current.push({
        id: mistakeId,
        grammarId: currentQ.grammarId,
        questionId: currentQ.id.replace(/-\d{10,}$/, ''),
        prompt: currentQ.question || currentQ.instruction || matchedRule?.name || currentQ.grammarId,
        userAnswer: answer,
        correctAnswer: correctText,
        explanation: currentQ.explanation,
        options: mcqOptions,
        level: matchedRule?.level,
        categoryLabel,
        practicePath,
      });
      dispatch(
        addMistake({
          id: mistakeId,
          grammarId: currentQ.grammarId,
          questionId: currentQ.id.replace(/-\d{10,}$/, ''),
          userAnswer: answer,
          correctAnswer: correctText,
          errorType: 'wrong_grammar',
          createdAt: new Date().toISOString(),
          prompt: currentQ.question || currentQ.instruction,
          categoryLabel,
          practicePath,
          explanation: currentQ.explanation,
          level: matchedRule?.level,
          options: mcqOptions,
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
      const retryAttemptId = searchParams.get('retryAttemptId')?.trim() || undefined;
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
      ).then(() => {
        if (retryAttemptId) {
          clearAttemptMistakeGroup(retryAttemptId, user?.id);
        }
      });
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
    searchParams,
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
  const currentLevelLabel = rulesToPractice[0]?.level || 'N3';
  const currentLessonLabel = chapterObj ? `Bài ${chapterObj.chapterNumber}` : 'Bài học';

  const switchPracticeMode = (nextModeKey: string) => {
    setFeedback(null);
    dispatch(resetPractice());
    const next = new URLSearchParams(searchParams);
    next.set('mode', nextModeKey);
    setSearchParams(next, { replace: true });
  };

  return (
    <PageContainer size="md" className="space-y-4">
      {/* Hình 1 Clean Quiz Header: ← Thoát | Mode Switcher | X */}
      <div className="flex flex-wrap items-center justify-between gap-2">
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
          Thoát
        </Button>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant={isScenarioMode ? 'primary' : 'secondary'}
            size="sm"
            leftIcon={<Sparkles className="size-3.5" aria-hidden />}
            onClick={() => switchPracticeMode('scenario')}
          >
            Tình huống &amp; Sắc thái
          </Button>
          <Button
            type="button"
            variant={!isScenarioMode && rawModeParam === 'mixed' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => switchPracticeMode('mixed')}
          >
            Tổng hợp
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<FileText className="size-4" aria-hidden />}
            onClick={() =>
              navigate(
                `/pdf?tab=grammar&chapterId=${chapterId}${grammarId ? `&grammarId=${grammarId}` : ''}&seed=${currentSeed}&count=${questionCount}&mode=${mode}`,
              )
            }
          >
            PDF
          </Button>
          <button
            type="button"
            aria-label="Đóng bài luyện tập"
            onClick={() => {
              dispatch(resetPractice());
              navigate(`/grammar/${bookId}/${chapterId}`);
            }}
            className="grid size-8 cursor-pointer place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* Progress & Counter (Matches Hình 1: Câu 1/12 left, N3 · Bài 1 right) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="tabular font-semibold text-muted">
            Câu {practice.currentQuestionIndex + 1}/{practice.questions.length}
          </span>
          <div className="flex items-center gap-3">
            <div className="tabular flex items-center gap-2.5 text-xs font-semibold">
              <span className="inline-flex items-center gap-1 text-success-fg">
                <CheckCircle2 className="size-3.5" aria-hidden />
                {practice.score.correct}
              </span>
              <span className="inline-flex items-center gap-1 text-danger-fg">
                <XCircle className="size-3.5" aria-hidden />
                {practice.score.wrong}
              </span>
            </div>
            <span className="font-bold text-sakura">
              {currentLevelLabel} · {currentLessonLabel}
            </span>
          </div>
        </div>

        <ProgressBar
          value={practice.currentQuestionIndex + 1}
          max={practice.questions.length}
          tone="primary"
          size="sm"
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
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-wide text-primary-fg uppercase">
                          Câu tiếng Nhật thực tế &amp; Dịch nghĩa
                        </p>
                        <p lang="ja" className="text-lg font-semibold text-fg">
                          {meta.japanese}
                        </p>
                        {meta.vietnamese && <p className="text-muted">{meta.vietnamese}</p>}
                      </div>
                      <Button
                        type="button"
                        variant="soft"
                        size="sm"
                        leftIcon={<Volume2 className="size-4" aria-hidden />}
                        onClick={() => meta.japanese && speakJapanese(meta.japanese)}
                      >
                        Nghe phát âm
                      </Button>
                    </div>
                    <div className="space-y-1.5 border-t border-line pt-3.5">
                      <p className="text-xs font-semibold tracking-wide text-primary-fg uppercase">
                        Ngữ pháp trọng tâm: <span lang="ja">{meta.grammarName}</span>
                      </p>
                      <p className="font-medium text-fg">Ý nghĩa: {meta.grammarMeaning}</p>
                      {meta.grammarExplanation && (
                        <p className="leading-relaxed text-muted">{meta.grammarExplanation}</p>
                      )}
                    </div>
                    {meta.optionBreakdowns && meta.optionBreakdowns.length > 0 && (
                      <div className="space-y-1.5 border-t border-line pt-3.5">
                        <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                          Phân tích đối chiếu 4 đáp án (Vì sao đúng / sai):
                        </p>
                        {meta.optionBreakdowns.map((b, bIdx) => (
                          <p key={bIdx} className="text-xs leading-relaxed text-fg">
                            {b.isCorrect ? '✅' : '❌'}{' '}
                            <strong lang="ja">{b.option}:</strong> {b.reason}
                          </p>
                        ))}
                      </div>
                    )}
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
