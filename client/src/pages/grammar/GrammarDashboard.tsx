import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { setGrammarRules, setSelectedLevel } from '../../store/slices/grammarSlice';
import { n4GrammarData } from '../../data/grammar/n4';
import { GrammarCard } from '../../components/grammar/GrammarCard';
import type { JLPTLevel } from '../../types/grammar';
import { Filter, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export const GrammarDashboard: React.FC = () => {
  const dispatch = useDispatch();
  const { availableRules, selectedLevel } = useSelector((state: RootState) => state.grammar);
  const progressRecords = useSelector((state: RootState) => state.grammarProgress.records);

  useEffect(() => {
    // In a real app, this would fetch from an API or load all local data
    dispatch(setGrammarRules(n4GrammarData));
  }, [dispatch]);

  const levels: (JLPTLevel | 'All')[] = ['All', 'N5', 'N4', 'N3', 'N2', 'N1'];

  const filteredRules = availableRules.filter(
    rule => selectedLevel === 'All' || rule.level === selectedLevel
  );

  const calculateOverallProgress = (grammarId: string) => {
    const record = progressRecords[grammarId];
    if (!record) return 0;
    // Simple average of all practice types
    const scores = [
      record.recognition, record.conjugation, record.sentence_transformation,
      record.word_order, record.fill_blank, record.translation, record.free_writing, record.mix_review
    ];
    const sum = scores.reduce((a, b) => a + b, 0);
    return sum / scores.length || 0;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
            Ngữ pháp
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Học và luyện tập ngữ pháp theo từng cấp độ
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            to="/grammar/pdf" 
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Tạo PDF
          </Link>
          <Link 
            to="/grammar/mistakes" 
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
          >
            Ôn tập lỗi sai
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <Filter className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">Cấp độ</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => dispatch(setSelectedLevel(level))}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedLevel === level
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRules.map((rule) => (
          <GrammarCard 
            key={rule.id} 
            rule={rule} 
            progress={calculateOverallProgress(rule.id)}
          />
        ))}
        {filteredRules.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
            Không có ngữ pháp nào cho cấp độ này.
          </div>
        )}
      </div>
    </div>
  );
};
