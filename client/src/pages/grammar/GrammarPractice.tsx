import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { startPractice, submitAnswer, nextQuestion, endPractice } from '../../store/slices/practiceSlice';
import { updateProgress } from '../../store/slices/grammarProgressSlice';
import { addMistake } from '../../store/slices/mistakeSlice';
import { PracticeQuestionRenderer } from '../../components/practice/PracticeQuestionRenderer';
import type { PracticeType } from '../../types/grammar';
import { generateSmartQuestionSet } from '../../utils/grammarEngine/questionGenerator';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { unit1Data } from '../../data/n3/unit1'; // Mocking vocab data source
import { grammarBooks } from '../../data/grammar';
import { shuffleArray } from '../../utils/shuffle';

export const GrammarPractice: React.FC = () => {
  const { bookId, chapterId, grammarId } = useParams<{ bookId: string; chapterId: string; grammarId?: string }>();
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get('mode') as PracticeType) || 'fill_blank';
  const countParam = parseInt(searchParams.get('count') || '10', 10);
  const [questionCount] = useState<number>(isNaN(countParam) ? 10 : countParam);
  const [currentSeed] = useState<number>(Date.now());
  const navigate = useNavigate();
  const dispatch = useDispatch();


  const practice = useSelector((state: RootState) => state.practice);

  const { rulesToPractice } = useMemo(() => {
    const b = grammarBooks.find(bk => bk.id === bookId);
    const c = b?.chapters.find(ch => ch.id === chapterId);
    
    let rules = c?.grammars || [];
    if (grammarId) {
      rules = rules.filter(r => r.id === grammarId);
    }
    return { rulesToPractice: rules };
  }, [bookId, chapterId, grammarId]);

  const [feedback, setFeedback] = useState<{ isCorrect: boolean, correctAnswer: string | string[], explanation?: string, feedbackMsg?: string } | null>(null);

  useEffect(() => {
    if (rulesToPractice.length > 0 && !practice.isActive) {
      let allQuestions: any[] = [];
      
      // Generate questions for all targeted rules
      rulesToPractice.forEach((rule, index) => {
        const countPerRule = grammarId ? questionCount : Math.max(4, Math.ceil(questionCount / rulesToPractice.length));
        const questionSet = generateSmartQuestionSet({
          grammarRule: rule,
          count: countPerRule,
          seed: currentSeed + index, // Add index to seed to ensure variety across rules
          rawVocabulary: unit1Data as any[],
          requestedPracticeTypes: mode === 'mixed' ? ['sentence_ordering', 'star_question', 'fill_blank', 'multiple_choice'] : [mode],
        });
        allQuestions = [...allQuestions, ...questionSet.questions];
      });

      // Shuffle all questions
      let shuffled = shuffleArray([...allQuestions]);
      
      // If practicing the whole chapter, cap exactly at questionCount
      if (!grammarId && shuffled.length > questionCount) {
        shuffled = shuffled.slice(0, questionCount);
      }

      if (shuffled.length === 0) {
        shuffled.push({
          id: 'fb-1',
          grammarId: rulesToPractice[0].id,
          type: mode,
          question: 'Mock Question (Không đủ từ vựng để tạo câu)',
          correctAnswer: 'mock'
        });
      }

      dispatch(startPractice({ mode, questions: shuffled }));
    }
  }, [rulesToPractice, mode, questionCount, practice.isActive, dispatch, grammarId]);

  const handleSubmit = (answer: string, isCorrect: boolean, feedbackMsg?: string) => {
    const currentQ = practice.questions[practice.currentQuestionIndex];
    setFeedback({
      isCorrect,
      correctAnswer: currentQ.correctAnswer,
      explanation: currentQ.explanation,
      feedbackMsg
    });

    dispatch(submitAnswer({ questionId: currentQ.id, answer, isCorrect }));

    if (!isCorrect) {
      dispatch(addMistake({
        id: Date.now().toString(),
        grammarId: currentQ.grammarId,
        questionId: currentQ.id,
        userAnswer: answer,
        correctAnswer: Array.isArray(currentQ.correctAnswer) ? currentQ.correctAnswer[0] : currentQ.correctAnswer,
        errorType: 'wrong_grammar',
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
      
      if (grammarId) {
         dispatch(updateProgress({ grammarId, type: mode, score: progress }));
      } else {
         // Could distribute score across all rules in chapter
      }
    } else {
      dispatch(nextQuestion());
    }
  };

  if (!rulesToPractice.length || !practice.isActive) {
    return <div className="p-8 text-center text-gray-500">Đang chuẩn bị bài luyện tập...</div>;
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
            onClick={() => navigate(`/grammar/${bookId}/${chapterId}`)}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold transition-colors"
          >
            Quay lại bài học
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 lg:grid lg:grid-cols-4 lg:gap-8 lg:space-y-0">
      
      {/* Sidebar Workspace Menu */}
      <div className="lg:col-span-1">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6 space-y-6">
          <button 
            onClick={() => {
              dispatch(endPractice());
              navigate(`/grammar/${bookId}/${chapterId}`);
            }}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors mb-4 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Về bài học
          </button>
          
          {/* Target rule info */}
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
            <p className="text-xs font-bold text-indigo-400 mb-1 uppercase tracking-wider">MỤC TIÊU</p>
            <p className="text-sm text-indigo-900 dark:text-indigo-200 font-bold leading-relaxed">
              {grammarId ? rulesToPractice[0]?.name : `Toàn bộ bài (${rulesToPractice.length} cấu trúc)`}
            </p>
          </div>
          {/* Sidebar Actions */}
          <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700/50">
            <button
              onClick={() => navigate(`/pdf?tab=grammar&chapterId=${chapterId}${grammarId ? `&grammarId=${grammarId}` : ''}&seed=${currentSeed}&count=${questionCount}&mode=${mode}`)}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2"
            >
              Tạo PDF bài này
            </button>
          </div>
        </div>
      </div>

      {/* Main Practice Area */}
      <div className="lg:col-span-3 space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Workspace Luyện tập</h2>
          {practice.isActive && !practice.isFinished && (
            <div className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-1.5 rounded-full text-sm">
              Câu {practice.currentQuestionIndex + 1} / {practice.questions.length}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {practice.isActive && !practice.isFinished && (
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Practice Content */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[400px]">
          {!feedback ? (
            <PracticeQuestionRenderer 
              mode={mode} 
              question={currentQ} 
              onSubmit={handleSubmit} 
            />
          ) : (
            <div className="space-y-6 text-center animate-in fade-in zoom-in duration-300 max-w-lg mx-auto">
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
              
              {feedback.feedbackMsg && (
                <p className="text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  {feedback.feedbackMsg}
                </p>
              )}

              {!feedback.isCorrect && (
                <div className="bg-rose-50 dark:bg-rose-900/20 p-5 rounded-xl border border-rose-100 dark:border-rose-800/30 mt-6 text-left">
                  <p className="text-sm font-bold text-rose-500 mb-1 uppercase tracking-wider">Đáp án đúng</p>
                  <p className="font-bold text-xl text-gray-900 dark:text-white">
                    {Array.isArray(feedback.correctAnswer) ? feedback.correctAnswer.join(' / ') : feedback.correctAnswer}
                  </p>
                </div>
              )}

              {feedback.explanation && (
                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 mt-6 text-left space-y-4">
                  {(currentQ as any).metadata?.japanese ? (
                    <>
                      <div>
                        <p className="text-sm font-bold text-indigo-500 mb-2 uppercase tracking-wider">Câu gốc & Dịch nghĩa</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                          {(currentQ as any).metadata.japanese}
                        </p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {(currentQ as any).metadata.vietnamese}
                        </p>
                      </div>
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-bold text-indigo-500 mb-2 uppercase tracking-wider">
                          Ngữ pháp: {(currentQ as any).metadata.grammarName}
                        </p>
                        <p className="font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
                          Ý nghĩa: {(currentQ as any).metadata.grammarMeaning}
                        </p>
                        {(currentQ as any).metadata.grammarExplanation && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            {(currentQ as any).metadata.grammarExplanation}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="text-sm font-bold text-indigo-500 mb-1 uppercase tracking-wider">Giải thích chi tiết</p>
                      <p className="font-medium text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {feedback.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4">
                <button 
                  onClick={handleNext}
                  className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors w-full shadow-sm text-lg"
                >
                  Tiếp tục
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
