import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { selectGrammar, setGrammarRules } from '../../store/slices/grammarSlice';
import { n4GrammarData } from '../../data/grammar/n4';
import { ArrowLeft, PlayCircle, Info, LayoutList, PenTool, Type, MoveHorizontal, MessageSquare } from 'lucide-react';

const practiceIcons: Record<string, React.ReactNode> = {
  recognition: <LayoutList className="w-5 h-5 text-blue-500" />,
  conjugation: <PenTool className="w-5 h-5 text-indigo-500" />,
  sentence_transformation: <MoveHorizontal className="w-5 h-5 text-purple-500" />,
  word_order: <LayoutList className="w-5 h-5 text-teal-500" />,
  fill_blank: <Type className="w-5 h-5 text-orange-500" />,
  translation: <MessageSquare className="w-5 h-5 text-green-500" />,
  free_writing: <PenTool className="w-5 h-5 text-rose-500" />,
  mix_review: <PlayCircle className="w-5 h-5 text-amber-500" />
};

const practiceLabels: Record<string, string> = {
  recognition: 'Nhận diện',
  conjugation: 'Biến đổi từ',
  sentence_transformation: 'Biến đổi câu',
  word_order: 'Sắp xếp câu',
  fill_blank: 'Điền vào chỗ trống',
  translation: 'Dịch thuật',
  free_writing: 'Tự đặt câu',
  mix_review: 'Ôn tập tổng hợp'
};

export const GrammarDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { availableRules } = useSelector((state: RootState) => state.grammar);
  
  useEffect(() => {
    if (availableRules.length === 0) {
      dispatch(setGrammarRules(n4GrammarData));
    }
  }, [availableRules.length, dispatch]);

  const rule = availableRules.find(r => r.id === id);

  useEffect(() => {
    if (rule) {
      dispatch(selectGrammar(rule.id));
    }
  }, [rule, dispatch]);

  if (!rule) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button 
        onClick={() => navigate('/grammar')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors font-medium mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Quay lại
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center gap-4 mb-4">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
            {rule.name}
          </h1>
          <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-sm">
            {rule.level}
          </div>
        </div>
        <p className="text-xl text-gray-600 dark:text-gray-300 font-medium mb-2">
          {rule.hiragana}
        </p>
        <div className="flex items-center gap-2 text-lg text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
          <Info className="w-6 h-6 text-indigo-500 shrink-0" />
          <span className="font-semibold">{rule.meaning}</span>
        </div>
      </div>

      {/* Example Section */}
      {rule.example && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            Ví dụ
          </h2>
          <div className="bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 p-6 rounded-xl">
            <p className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-3 whitespace-pre-line leading-relaxed">
              {rule.example}
            </p>
            {rule.exampleMeaning && (
              <p className="text-gray-600 dark:text-gray-400">
                {rule.exampleMeaning}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Practice Modes */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Chế độ luyện tập
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rule.practiceTypes.map(type => (
            <Link
              key={type}
              to={`/grammar/${rule.id}/practice?mode=${type}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-900 flex items-center justify-center border border-gray-100 dark:border-gray-800 group-hover:scale-105 transition-transform">
                {practiceIcons[type]}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {practiceLabels[type] || type}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Luyện tập kỹ năng {practiceLabels[type]?.toLowerCase() || type}
                </p>
              </div>
              <PlayCircle className="w-6 h-6 text-gray-300 dark:text-gray-600 group-hover:text-indigo-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
