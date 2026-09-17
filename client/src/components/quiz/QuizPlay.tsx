import React, { useState, useEffect, useCallback } from 'react';
import { quizConfig } from '../../config/quizConfig';
import type { QuizState, QuestionType, QuestionAnswer, Question } from '../../types/quiz';

import { QuizHeader } from '../QuizHeader';
import { ProgressBar } from '../ProgressBar';
import { QuestionCard } from '../QuestionCard';
import { AnswerOption, type AnswerStatus } from '../AnswerOption';
import { Explanation } from '../Explanation';
import { Hint } from '../Hint';
import { QuizNavigation } from '../QuizNavigation';
import { QuizResult } from '../QuizResult';
import { useUserProgress } from '../../hooks/useUserProgress';

export type MergedQuestion = Question & {
  answerData: QuestionAnswer;
};

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

import type { QuizConfig } from '../../types/quiz';
import { generateQuizSession } from '../../utils/quizGenerator';

interface Props {
  config: QuizConfig;
  onExit: () => void;
}

export const QuizPlay: React.FC<Props> = ({ config, onExit }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [quizSessionKey] = useState<number>(0);
  const { progress } = useUserProgress();
  
  const [quizQuestions, setQuizQuestions] = useState<MergedQuestion[]>([]);
  const [state, setState] = useState<QuizState>({
    currentIndex: 0,
    userAnswers: {},
    score: { correct: 0, wrong: 0 },
    isFinished: false
  });

  // Fetch from API
  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      setError(null);
      try {
        const starredList = progress.starredWords;
        const wrongList = Object.keys(progress.wrongWords).map(Number);
        
        const data = generateQuizSession(config, starredList, wrongList);
        
        if (config.rangeType === 'fixed' && typeof config.questionCount === 'number' && data.length < config.questionCount) {
          alert(`Không đủ từ vựng thuộc loại này. Hiện có ${data.length} từ.`);
        }
        
        setQuizQuestions(data as MergedQuestion[]);
        setState({
          currentIndex: 0,
          userAnswers: {},
          score: { correct: 0, wrong: 0 },
          isFinished: false
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchQuiz();
  }, [quizSessionKey]);

  const handleAnswerSelect = useCallback((answerId: string) => {
    setState((prev: QuizState) => {
      // Prevent multiple clicks on same question
      if (prev.userAnswers[prev.currentIndex]) return prev;

      const currentQ = quizQuestions[prev.currentIndex];
      const isCorrect = answerId === currentQ.answerData.correctAnswerId;
      
      return {
        ...prev,
        userAnswers: {
          ...prev.userAnswers,
          [prev.currentIndex]: answerId
        },
        score: {
          correct: prev.score.correct + (isCorrect ? 1 : 0),
          wrong: prev.score.wrong + (isCorrect ? 0 : 1),
        }
      };
    });
  }, [quizQuestions]);

  const handleNext = () => {
    if (state.currentIndex < quizQuestions.length - 1) {
      setState((prev: QuizState) => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    } else {
      setState((prev: QuizState) => ({ ...prev, isFinished: true }));
    }
  };

  const handleBack = () => {
    if (state.currentIndex > 0) {
      setState((prev: QuizState) => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
    }
  };

  const handleRetry = () => {
    // Reset state, keep same session data
    setState({
      currentIndex: 0,
      userAnswers: {},
      score: { correct: 0, wrong: 0 },
      isFinished: false
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white p-8 flex items-center justify-center transition-colors">
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-500 p-8 rounded-xl max-w-lg w-full">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Quiz Data Error</h2>
          <p className="text-red-500 dark:text-gray-200 font-mono">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white p-8 flex items-center justify-center transition-colors">
        <div className="text-xl text-gray-500 dark:text-gray-400">Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (quizQuestions.length === 0) {
    return null;
  }

  if (state.isFinished) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 transition-colors">
        <QuizResult 
          score={state.score} 
          total={quizQuestions.length} 
          onRetry={handleRetry} 
          onNewQuiz={onExit} 
        />
      </div>
    );
  }

  const currentQ = quizQuestions[state.currentIndex];
  const selectedAnswerId = state.userAnswers[state.currentIndex];
  const isAnswered = !!selectedAnswerId;
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
      case 'vi_to_hiragana': return { kanji: hint.kanji, meaning: hint.meaning };
      case 'vi_to_kanji': return { hiragana: hint.hiragana, meaning: hint.meaning };
      case 'kanji_to_hiragana': return { meaning: hint.meaning };
      case 'kanji_to_vi': return { hiragana: hint.hiragana };
      case 'hiragana_to_kanji': return { meaning: hint.meaning };
      case 'hiragana_to_vi': return { kanji: hint.kanji };
      default: return {};
    }
  };

  const correctAnswerText = currentQ.answers.find((a: any) => a.id === currentQ.answerData.correctAnswerId)?.text;

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors w-full h-full relative">
      <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col">
        <ProgressBar current={state.currentIndex} total={quizQuestions.length} />
        
        <QuizHeader 
          current={state.currentIndex + 1} 
          total={quizQuestions.length} 
          score={state.score} 
        />
        <QuestionCard 
          question={currentQ.question} 
          hanViet={
            (config.showHanVietHint && (currentQ.type === 'kanji_to_hiragana' || currentQ.type === 'kanji_to_vi' || currentQ.type.includes('kanji'))) 
              ? (currentQ.answerData.hanViet || currentQ.answerData.hanviet)
              : undefined
          }
        />
        
        {quizConfig.showHint && currentQ.answerData.hint && (
          <div className="relative z-20">
            <Hint {...getHintProps(currentQ.type, currentQ.answerData.hint)} />
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6">
          {currentQ.answers.map((ans: any, idx: number) => (
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
          <div className="relative z-10 mt-4">
            <Explanation 
              isCorrect={isCorrect} 
              correctAnswerText={correctAnswerText}
              title={currentQ.answerData.kanji && currentQ.answerData.hiragana ? `${currentQ.answerData.kanji}（${currentQ.answerData.hiragana}）` : ''}
              kanji={currentQ.answerData.kanji}
              hanViet={currentQ.answerData.hanViet || currentQ.answerData.hanviet}
              hiragana={currentQ.answerData.hiragana}
              meaning={currentQ.answerData.meaning}
            />
          </div>
        )}
        
        <div className="mt-auto pt-6 pb-2">
          <QuizNavigation 
            onBack={handleBack} 
            onNext={handleNext} 
            isFirst={state.currentIndex === 0} 
            isLast={state.currentIndex === quizQuestions.length - 1} 
            canGoNext={canGoNext} 
          />
        </div>
      </div>
    </div>
  );
};
