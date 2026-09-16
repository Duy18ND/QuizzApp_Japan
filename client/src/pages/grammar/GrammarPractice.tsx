import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { startPractice, submitAnswer, nextQuestion, endPractice } from '../../store/slices/practiceSlice';
import { updateProgress } from '../../store/slices/grammarProgressSlice';
import { addMistake } from '../../store/slices/mistakeSlice';
import { PracticeModeRenderer } from '../../components/grammar/PracticeModes';
import type { PracticeType } from '../../types/grammar';
import { generateQuestionSet } from '../../utils/grammarEngine/questionGenerator';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { unit1Data } from '../../data/n3/unit1'; // Mocking vocab data source

export const GrammarPractice: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get('mode') as PracticeType) || 'conjugation';
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { availableRules } = useSelector((state: RootState) => state.grammar);
  const practice = useSelector((state: RootState) => state.practice);
  const rule = availableRules.find(r => r.id === id);

  const [feedback, setFeedback] = useState<{ isCorrect: boolean, correctAnswer: string | string[], explanation?: string } | null>(null);

  useEffect(() => {
    if (rule && !practice.isActive) {
      // Generate some dummy questions based on mode
      const seed = Date.now();
      const questionSet = generateQuestionSet({
        grammarRule: rule,
        count: 10,
        seed,
        rawVocabulary: unit1Data as any[],
        practiceTypes: [mode]
      });

      let questions = questionSet.questions;
      if (questions.length === 0) {
        // Fallback if no questions generated
        questions.push({
          id: 'fb-1',
          grammarId: rule.id,
          type: mode,
          question: 'Mock Question (Không đủ từ vựng để tạo câu)',
          correctAnswer: 'mock'
        });
      }

      dispatch(startPractice({ mode, questions }));
    }
  }, [rule, mode, practice.isActive, dispatch]);

  const handleSubmit = (answer: string, isCorrect: boolean) => {
    const currentQ = practice.questions[practice.currentQuestionIndex];
    setFeedback({
      isCorrect,
      correctAnswer: currentQ.correctAnswer,
      explanation: currentQ.explanation
    });

    dispatch(submitAnswer({ questionId: currentQ.id, answer, isCorrect }));

    if (!isCorrect) {
      dispatch(addMistake({
        id: Date.now().toString(),
        grammarId: rule!.id,
        questionId: currentQ.id,
        userAnswer: answer,
        correctAnswer: Array.isArray(currentQ.correctAnswer) ? currentQ.correctAnswer[0] : currentQ.correctAnswer,
        errorType: 'wrong_conjugation',
        createdAt: new Date().toISOString()
      }));
    }
  };

  const handleNext = () => {
    setFeedback(null);
    if (practice.currentQuestionIndex >= practice.questions.length - 1) {
      dispatch(endPractice());
      // Calculate and save progress
      const total = practice.score.correct + practice.score.wrong;
      const progress = total > 0 ? Math.round((practice.score.correct / total) * 100) : 0;
      dispatch(updateProgress({ grammarId: rule!.id, type: mode, score: progress }));
    } else {
      dispatch(nextQuestion());
    }
  };

  if (!rule || !practice.isActive) {
    return <div className="p-8 text-center text-gray-500">Loading practice...</div>;
  }

  const currentQ = practice.questions[practice.currentQuestionIndex];
  const progressPercent = ((practice.currentQuestionIndex) / practice.questions.length) * 100;

  if (practice.isFinished) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-3xl font-bold">Hoàn thành!</h2>
        <div className="text-5xl font-black text-indigo-600 dark:text-indigo-400 py-4">
          {practice.score.correct} / {practice.questions.length}
        </div>
        <div className="flex justify-center gap-4">
          <button 
            onClick={() => navigate(`/grammar/${rule.id}`)}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold transition-colors"
          >
            Quay lại bài học
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => {
            dispatch(endPractice());
            navigate(`/grammar/${rule.id}`);
          }}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Thoát
        </button>
        <div className="font-bold text-gray-700 dark:text-gray-300">
          Câu {practice.currentQuestionIndex + 1} / {practice.questions.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Practice Area */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[300px]">
        {!feedback ? (
          <PracticeModeRenderer 
            mode={mode} 
            question={currentQ} 
            onSubmit={handleSubmit} 
          />
        ) : (
          <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300">
            {feedback.isCorrect ? (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-500/20 text-green-500 rounded-full mb-4">
                <CheckCircle className="w-10 h-10" />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-rose-100 dark:bg-rose-500/20 text-rose-500 rounded-full mb-4">
                <XCircle className="w-10 h-10" />
              </div>
            )}
            
            <h3 className={`text-2xl font-bold ${feedback.isCorrect ? 'text-green-600' : 'text-rose-600'}`}>
              {feedback.isCorrect ? 'Chính xác!' : 'Chưa chính xác!'}
            </h3>

            {!feedback.isCorrect && (
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 mb-1">Đáp án đúng:</p>
                <p className="font-bold text-lg text-gray-900 dark:text-white">
                  {Array.isArray(feedback.correctAnswer) ? feedback.correctAnswer.join(' / ') : feedback.correctAnswer}
                </p>
                {feedback.explanation && (
                  <p className="mt-2 text-sm text-indigo-600 dark:text-indigo-400">
                    Gợi ý: {feedback.explanation}
                  </p>
                )}
              </div>
            )}

            <button 
              onClick={handleNext}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors w-full sm:w-auto"
            >
              Tiếp tục
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
