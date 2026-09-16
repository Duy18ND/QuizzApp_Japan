import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { clearMistakes, removeMistakesByGrammar } from '../../store/slices/mistakeSlice';
import { ArrowLeft, Trash2, AlertTriangle, BookOpen } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const MistakesReview: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const mistakes = useSelector((state: RootState) => state.mistake.mistakes);
  const rules = useSelector((state: RootState) => state.grammar.availableRules);

  const mistakesByGrammar = mistakes.reduce((acc, mistake) => {
    if (!acc[mistake.grammarId]) {
      acc[mistake.grammarId] = [];
    }
    acc[mistake.grammarId].push(mistake);
    return acc;
  }, {} as Record<string, typeof mistakes>);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={() => navigate('/grammar')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Quay lại
        </button>
        
        {mistakes.length > 0 && (
          <button 
            onClick={() => dispatch(clearMistakes())}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-sm font-semibold transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Xóa lịch sử
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          Ôn tập lỗi sai
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Danh sách các câu hỏi bạn đã làm sai trong quá trình luyện tập.
        </p>

        {Object.keys(mistakesByGrammar).length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 text-green-500 rounded-full mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Không có lỗi sai nào!</h3>
            <p className="text-gray-500">Tuyệt vời, bạn đang làm rất tốt.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(mistakesByGrammar).map(([grammarId, grammarMistakes]) => {
              const rule = rules.find(r => r.id === grammarId);
              if (!rule) return null;

              return (
                <div key={grammarId} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{rule.name}</h3>
                      <p className="text-sm text-gray-500">{grammarMistakes.length} lỗi sai</p>
                    </div>
                    <div className="flex gap-2">
                      <Link 
                        to={`/grammar/${rule.id}/practice?mode=mix_review`}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                      >
                        <BookOpen className="w-4 h-4" />
                        Ôn lại ngữ pháp này
                      </Link>
                      <button 
                        onClick={() => dispatch(removeMistakesByGrammar(grammarId))}
                        className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa lỗi của ngữ pháp này"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {grammarMistakes.map(mistake => (
                      <div key={mistake.id} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs font-semibold text-gray-500 uppercase">Câu hỏi / Lời nhắc</span>
                          <p className="mt-1 font-medium">{mistake.questionId}</p> 
                          {/* Note: we would normally store the prompt text in mistake, but for simplicity here we just show ID or fallback */}
                        </div>
                        <div className="grid grid-cols-2 gap-4 bg-rose-50/50 dark:bg-rose-900/10 p-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                          <div>
                            <span className="text-xs font-semibold text-rose-500 uppercase">Bạn trả lời</span>
                            <p className="mt-1 font-medium text-rose-700 dark:text-rose-400 line-through">{mistake.userAnswer}</p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-green-600 uppercase">Đáp án đúng</span>
                            <p className="mt-1 font-bold text-green-700 dark:text-green-400">{mistake.correctAnswer}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper for check circle since lucide wasn't imported at top for it
const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
