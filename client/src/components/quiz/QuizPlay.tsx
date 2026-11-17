import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { quizConfig } from '../../config/quizConfig';
import { useAuth } from '../../context/auth-context';
import { recordQuizAttempt } from '../../services/quizHistoryService';
import type {
  AnswerOption as AnswerOptionType,
  Question,
  QuestionAnswer,
  QuestionType,
  QuizConfig,
  QuizState,
} from '../../types/quiz';
import { QuizHeader } from '../QuizHeader';
import { ProgressBar } from '../ProgressBar';
import { QuestionCard } from '../QuestionCard';
import { AnswerOption, type AnswerStatus } from '../AnswerOption';
import { Explanation } from '../Explanation';
import { Hint } from '../Hint';
import { QuizNavigation } from '../QuizNavigation';
import { QuizResult } from '../QuizResult';
import { Button, ErrorState, Kbd, LoadingState, PageContainer, useToast } from '../ui';
import { useUserProgress } from '../../hooks/useUserProgress';
import { generateQuizSession } from '../../utils/quizGenerator';

export type MergedQuestion = Question & {
  answerData: QuestionAnswer;
};

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface Props {
  config: QuizConfig;
  onExit: () => void;
}

export const QuizPlay: React.FC<Props> = ({ config, onExit }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [quizSessionKey] = useState<number>(0);
  const { progress, addWrongWord } = useUserProgress();
  const sessionStartRef = useRef<number>(0);
  const recordedSessionRef = useRef<boolean>(false);

  useEffect(() => {
    sessionStartRef.current = Date.now();
  }, []);

  const [quizQuestions, setQuizQuestions] = useState<MergedQuestion[]>([]);
  const [state, setState] = useState<QuizState>({
    currentIndex: 0,
    userAnswers: {},
    score: { correct: 0, wrong: 0 },
    isFinished: false,
  });

  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      setError(null);
      try {
        const starredList = progress.starredWords;
        const wrongList = Object.keys(progress.wrongWords).map(Number);

        const data = generateQuizSession(config, starredList, wrongList);

        if (
          config.rangeType === 'fixed' &&
          typeof config.questionCount === 'number' &&
          data.length < config.questionCount
        ) {
          toast({
            title: 'Số lượng từ vựng ít hơn lựa chọn',
            description: `Không đủ từ vựng thuộc loại này. Hiện có ${data.length} từ.`,
            tone: 'warning',
          });
        }

        setQuizQuestions(data as MergedQuestion[]);
        setState({
          currentIndex: 0,
          userAnswers: {},
          score: { correct: 0, wrong: 0 },
          isFinished: false,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải câu hỏi.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizSessionKey]);

  const handleAnswerSelect = useCallback(
    (answerId: string) => {
      if (state.userAnswers[state.currentIndex]) return;

      const currentQ = quizQuestions[state.currentIndex];
      if (!currentQ) return;
      const isCorrect = answerId === currentQ.answerData.correctAnswerId;

      if (!isCorrect && typeof currentQ.wordId === 'number') {
        addWrongWord(currentQ.wordId);
      }

      setState((prev: QuizState) => {
        if (prev.userAnswers[prev.currentIndex]) return prev;

        return {
          ...prev,
          userAnswers: {
            ...prev.userAnswers,
            [prev.currentIndex]: answerId,
          },
          score: {
            correct: prev.score.correct + (isCorrect ? 1 : 0),
            wrong: prev.score.wrong + (isCorrect ? 0 : 1),
          },
        };
      });
    },
    [quizQuestions, state.currentIndex, state.userAnswers, addWrongWord],
  );

  const handleNext = useCallback(() => {
    setState((prev: QuizState) => {
      if (prev.currentIndex < quizQuestions.length - 1) {
        return { ...prev, currentIndex: prev.currentIndex + 1 };
      }
      return { ...prev, isFinished: true };
    });
  }, [quizQuestions.length]);

  const handleBack = useCallback(() => {
    setState((prev: QuizState) => {
      if (prev.currentIndex > 0) {
        return { ...prev, currentIndex: prev.currentIndex - 1 };
      }
      return prev;
    });
  }, []);

  const handleRetry = () => {
    sessionStartRef.current = Date.now();
    recordedSessionRef.current = false;
    setState({
      currentIndex: 0,
      userAnswers: {},
      score: { correct: 0, wrong: 0 },
      isFinished: false,
    });
  };

  useEffect(() => {
    if (!state.isFinished || quizQuestions.length === 0 || recordedSessionRef.current) return;
    recordedSessionRef.current = true;

    const durationSeconds =
      sessionStartRef.current > 0
        ? Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 1000))
        : 0;
    const mistakes = quizQuestions
      .map((q, idx) => {
        const chosen = state.userAnswers[idx];
        if (!chosen || chosen === q.answerData.correctAnswerId) return null;
        return {
          questionId: q.id,
          wordId: q.wordId,
          chosen,
          correct: q.answerData.correctAnswerId,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    void recordQuizAttempt(
      {
        quizType: 'vocabulary',
        level: config.level,
        score: state.score.correct,
        totalQuestions: quizQuestions.length,
        durationSeconds,
        mistakesJson: mistakes,
      },
      user?.id,
    );
  }, [
    state.isFinished,
    state.score.correct,
    state.userAnswers,
    quizQuestions,
    config.level,
    user?.id,
  ]);

  useEffect(() => {
    if (loading || error || state.isFinished || quizQuestions.length === 0) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const currentQuestion = quizQuestions[state.currentIndex];
      if (!currentQuestion) return;
      const answered = Boolean(state.userAnswers[state.currentIndex]);

      const key = event.key.toLowerCase();
      const numIndex = ['1', '2', '3', '4'].indexOf(key);
      const letterIndex = ['a', 'b', 'c', 'd'].indexOf(key);
      const optionIndex = numIndex !== -1 ? numIndex : letterIndex;

      if (optionIndex !== -1 && !answered) {
        const answer = currentQuestion.answers[optionIndex];
        if (answer) {
          event.preventDefault();
          handleAnswerSelect(answer.id);
        }
        return;
      }

      if ((event.key === 'Enter' || event.key === 'ArrowRight') && answered) {
        event.preventDefault();
        handleNext();
      } else if (event.key === 'ArrowLeft' && state.currentIndex > 0) {
        event.preventDefault();
        handleBack();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    loading,
    error,
    state.isFinished,
    state.currentIndex,
    state.userAnswers,
    quizQuestions,
    handleAnswerSelect,
    handleNext,
    handleBack,
  ]);

  if (error) {
    return (
      <PageContainer size="sm" className="py-8">
        <ErrorState
          title="Không thể tạo bài Quiz"
          description={error}
          onRetry={onExit}
          retryLabel="Quay lại cài đặt"
        />
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer size="md">
        <LoadingState label="Đang tải câu hỏi..." />
      </PageContainer>
    );
  }

  if (quizQuestions.length === 0) {
    return null;
  }

  if (state.isFinished) {
    return (
      <QuizResult
        score={state.score}
        total={quizQuestions.length}
        onRetry={handleRetry}
        onNewQuiz={onExit}
      />
    );
  }

  const currentQ = quizQuestions[state.currentIndex];
  const selectedAnswerId = state.userAnswers[state.currentIndex];
  const isAnswered = Boolean(selectedAnswerId);
  const isCorrect = selectedAnswerId === currentQ.answerData.correctAnswerId;
  const canGoNext = isAnswered;

  const getAnswerStatus = (ansId: string): AnswerStatus => {
    if (!isAnswered) return 'default';

    const isThisSelected = ansId === selectedAnswerId;
    const isThisCorrect = ansId === currentQ.answerData.correctAnswerId;

    if (isThisCorrect) return 'correct';
    if (isThisSelected && !isThisCorrect) return 'wrong';
    return 'disabled';
  };

  const getHintProps = (type: QuestionType, hint: QuestionAnswer['hint']) => {
    if (!hint) return {};
    switch (type) {
      case 'vi_to_hiragana':
        return { kanji: hint.kanji, meaning: hint.meaning };
      case 'vi_to_kanji':
        return { hiragana: hint.hiragana, meaning: hint.meaning };
      case 'kanji_to_hiragana':
        return { meaning: hint.meaning };
      case 'kanji_to_vi':
        return { hiragana: hint.hiragana };
      case 'hiragana_to_kanji':
        return { meaning: hint.meaning };
      case 'hiragana_to_vi':
        return { kanji: hint.kanji };
      default:
        return {};
    }
  };

  const correctAnswerText = currentQ.answers.find(
    (a: AnswerOptionType) => a.id === currentQ.answerData.correctAnswerId,
  )?.text;

  return (
    <PageContainer size="md" className="flex flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          leftIcon={<ArrowLeft className="size-4" aria-hidden />}
          className="-ml-2"
        >
          Cài đặt lại
        </Button>

        <p className="hidden items-center gap-1.5 text-xs text-muted md:flex">
          Phím tắt: <Kbd>1–4</Kbd> / <Kbd>A–D</Kbd> chọn đáp án
        </p>
      </div>

      <ProgressBar current={state.currentIndex + 1} total={quizQuestions.length} />

      <QuizHeader
        current={state.currentIndex + 1}
        total={quizQuestions.length}
        score={state.score}
      />

      <QuestionCard
        question={currentQ.question}
        hanViet={
          config.showHanVietHint &&
          (currentQ.type === 'kanji_to_hiragana' ||
            currentQ.type === 'kanji_to_vi' ||
            currentQ.type.includes('kanji'))
            ? currentQ.answerData.hanViet || currentQ.answerData.hanviet
            : undefined
        }
      />

      {quizConfig.showHint && currentQ.answerData.hint && (
        <div className="relative z-20">
          <Hint {...getHintProps(currentQ.type, currentQ.answerData.hint)} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {currentQ.answers.map((ans: AnswerOptionType, idx: number) => (
          <AnswerOption
            key={ans.id}
            label={LABELS[idx] || (idx + 1).toString()}
            text={ans.text}
            status={getAnswerStatus(ans.id)}
            onClick={() => handleAnswerSelect(ans.id)}
          />
        ))}
      </div>

      {isAnswered && quizConfig.showExplanation && (
        <div className="mt-4 mb-4">
          <Explanation
            isCorrect={isCorrect}
            correctAnswerText={correctAnswerText}
            title={
              currentQ.answerData.kanji && currentQ.answerData.hiragana
                ? `${currentQ.answerData.kanji}（${currentQ.answerData.hiragana}）`
                : ''
            }
            kanji={currentQ.answerData.kanji}
            hanViet={currentQ.answerData.hanViet || currentQ.answerData.hanviet}
            hiragana={currentQ.answerData.hiragana}
            meaning={currentQ.answerData.meaning}
          />
        </div>
      )}

      <div className="sticky bottom-0 z-20 mt-auto -mx-4 border-t border-line bg-bg px-4 py-3 md:-mx-8 md:px-8">
        <QuizNavigation
          onBack={handleBack}
          onNext={handleNext}
          isFirst={state.currentIndex === 0}
          isLast={state.currentIndex === quizQuestions.length - 1}
          canGoNext={canGoNext}
        />
      </div>
    </PageContainer>
  );
};
