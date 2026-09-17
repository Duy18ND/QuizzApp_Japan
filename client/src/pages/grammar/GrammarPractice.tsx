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

export const GrammarPractice: React.FC = () => {
  const { bookId, chapterId, grammarId } = useParams<{ bookId: string; chapterId: string; grammarId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = (searchParams.get('mode') as PracticeType) || 'fill_blank';
  const countParam = parseInt(searchParams.get('count') || '10', 10);
  const [questionCount, setQuestionCount] = useState<number>(isNaN(countParam) ? 10 : countParam);
  const [currentSeed] = useState<number>(Date.now());
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const practiceModes: { id: PracticeType; label: string }[] = [
    { id: 'multiple_choice', label: 'Chọn đáp án' },
    { id: 'fill_blank', label: 'Điền từ' },
    { id: 'conjugation', label: 'Chia từ' },
    { id: 'sentence_ordering', label: 'Sắp xếp câu' },
    { id: 'ja_to_vi', label: 'Nhật → Việt' },
    { id: 'vi_to_ja', label: 'Việt → Nhật' },
    { id: 'sentence_transformation', label: 'Biến đổi câu' },
    { id: 'grammar_selection', label: 'Chọn ngữ pháp' },
    { id: 'free_writing', label: 'Nhập câu' },
    { id: 'mixed', label: '★ Luyện tổng hợp' },
  ];

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
      rulesToPractice.forEach(rule => {
        const questionSet = generateSmartQuestionSet({
          grammarRule: rule,
          count: grammarId ? questionCount : Math.max(3, Math.floor(questionCount / rulesToPractice.length)), // distribute question count
          seed: currentSeed,
          rawVocabulary: unit1Data as any[],
          requestedPracticeTypes: mode === 'mixed' ? undefined : [mode],
        });
        allQuestions = [...allQuestions, ...questionSet.questions];
      });

      // Shuffle all questions
      const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);

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
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Dạng bài đang luyện</label>
            <select
              value={mode}
              onChange={(e) => {
                dispatch(endPractice());
                setSearchParams({ mode: e.target.value });
              }}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            >
              {practiceModes.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Số lượng câu hỏi</label>
            <select
              value={questionCount}
              onChange={(e) => {
                const newCount = parseInt(e.target.value, 10);
                setQuestionCount(newCount);
                dispatch(endPractice());
                setSearchParams({ mode, count: newCount.toString() });
              }}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
            >
              {[5, 10, 20, 30, 50].map(c => (
                <option key={c} value={c}>{c} câu</option>
              ))}
            </select>
          </div>
          
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
              onClick={() => {
                dispatch(endPractice());
                setSearchParams({ mode: 'mixed', count: questionCount.toString() });
              }}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              ★ Luyện tập tổng hợp
            </button>
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
                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 mt-6 text-left space-y-4">
                  <div>
                    <p className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">Đáp án đúng</p>
                    <p className="font-bold text-xl text-gray-900 dark:text-white">
                      {Array.isArray(feedback.correctAnswer) ? feedback.correctAnswer.join(' / ') : feedback.correctAnswer}
                    </p>
                  </div>
                  {feedback.explanation && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-bold text-indigo-500 mb-1 uppercase tracking-wider">Gợi ý</p>
                      <p className="font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
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
