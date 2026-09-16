import React, { useState } from 'react';
import { Play } from 'lucide-react';
import type { QuizConfig, JLPTLevel, QuizSource } from '../../types/quiz';

const UNIT_DATA: Record<JLPTLevel, { id: number, name: string, totalWords: number }[]> = {
  N5: [{ id: 1, name: 'Unit 1 (N5)', totalWords: 100 }],
  N4: [{ id: 1, name: 'Unit 1 (N4)', totalWords: 110 }],
  N3: [{ id: 1, name: 'Unit 1 (N3 - Mimi kara Oboeru)', totalWords: 120 }, { id: 2, name: 'Unit 2 (N3)', totalWords: 120 }],
  N2: [{ id: 1, name: 'Unit 1 (N2)', totalWords: 150 }],
  N1: [{ id: 1, name: 'Unit 1 (N1)', totalWords: 200 }],
};

interface Props {
  onStart: (config: QuizConfig) => void;
}

export const QuizSetup: React.FC<Props> = ({ onStart }) => {
  const [config, setConfig] = useState<QuizConfig>({
    level: 'N3',
    unitId: 1,
    source: 'all',
    wordType: 'all',
    rangeType: 'fixed',
    questionCount: 10,
    customRange: { start: 1, end: 20 },
    shuffleQuestions: true,
    shuffleAnswers: true,
    showHanVietHint: true
  });

  const [error, setError] = useState<string | null>(null);

  const activeUnits = UNIT_DATA[config.level as JLPTLevel] || UNIT_DATA['N3'];
  const totalWordsInUnit = activeUnits.find((u: any) => u.id === config.unitId)?.totalWords || 120;

  const handleLevelChange = (newLevel: JLPTLevel) => {
    const defaultUnitId = UNIT_DATA[newLevel]?.[0]?.id || 1;
    setConfig({ ...config, level: newLevel, unitId: defaultUnitId, customRange: { start: 1, end: 20 } });
  };

  const handleStart = () => {
    if (config.rangeType === 'custom') {
      if (config.customRange.start >= config.customRange.end) {
        setError("STT Bắt đầu phải nhỏ hơn STT Kết thúc.");
        return;
      }
      if (config.customRange.start < 1 || config.customRange.end > totalWordsInUnit) {
        setError(`Vui lòng chọn khoảng trong phạm vi từ 1 đến ${totalWordsInUnit}.`);
        return;
      }
    }
    setError(null);
    onStart(config);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Cài đặt Quiz</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Tùy chỉnh bài test trước khi bắt đầu</p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xl transition-colors">
        
        {/* 1. Trình độ & Bài học */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Trình độ (JLPT)</label>
            <select 
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg p-3 min-h-[48px] outline-none focus:border-indigo-500 transition-colors"
              value={config.level}
              onChange={(e) => handleLevelChange(e.target.value as JLPTLevel)}
            >
              {['N5', 'N4', 'N3', 'N2', 'N1'].map(lvl => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bài Học (Unit)</label>
            <select 
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg p-3 min-h-[48px] outline-none focus:border-indigo-500 transition-colors"
              value={config.unitId}
              onChange={(e) => setConfig({ ...config, unitId: e.target.value === 'all' ? 'all' : Number(e.target.value) })}
            >
              {activeUnits.map((unit: any) => (
                <option key={unit.id} value={unit.id}>{unit.name} ({unit.totalWords} từ)</option>
              ))}
              <option value="all" disabled>Tất cả (Sắp ra mắt)</option>
            </select>
          </div>
        </div>

        {/* 2. Nguồn từ vựng */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nguồn từ vựng</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'starred', label: 'Đã lưu (★)' },
              { id: 'wrong', label: 'Làm sai' }
            ].map((src) => (
              <button
                key={src.id}
                onClick={() => setConfig({ ...config, source: src.id as QuizSource })}
                className={`py-3 px-2 rounded-lg border text-sm font-medium transition-colors min-h-[48px] ${
                  config.source === src.id
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' 
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500'
                }`}
              >
                {src.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2.5. Từ loại */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Từ loại</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'Danh từ', label: 'Danh từ' },
              { id: 'Động từ', label: 'Động từ' },
              { id: 'Tính từ -i', label: 'Tính từ - い' },
              { id: 'Tính từ -na', label: 'Tính từ - な' },
              { id: 'Trạng từ', label: 'Trạng từ' },
              { id: 'Đại từ', label: 'Đại từ' },
              { id: 'Khác', label: 'Khác' },
            ].map((wt) => (
              <button
                key={wt.id}
                onClick={() => setConfig({ ...config, wordType: wt.id })}
                className={`py-3 px-2 rounded-lg border text-sm font-medium transition-colors min-h-[48px] ${
                  config.wordType === wt.id
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' 
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500'
                }`}
              >
                {wt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Tùy chọn Phạm vi (Range) */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phạm vi câu hỏi</label>
            <div className="flex bg-gray-100 dark:bg-gray-950 p-1 rounded-lg border border-gray-200 dark:border-gray-800">
              <button 
                className={`px-4 py-2 text-sm font-medium rounded-md min-h-[40px] transition-colors ${config.rangeType === 'fixed' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                onClick={() => setConfig({ ...config, rangeType: 'fixed' })}
              >
                Cố định
              </button>
              <button 
                className={`px-4 py-2 text-sm font-medium rounded-md min-h-[40px] transition-colors ${config.rangeType === 'custom' ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white dark:shadow-none' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                onClick={() => setConfig({ ...config, rangeType: 'custom' })}
              >
                Tùy chỉnh
              </button>
            </div>
          </div>

          {config.rangeType === 'fixed' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[10, 20, 50, 'all'].map((count) => (
                <button
                  key={count}
                  onClick={() => setConfig({ ...config, questionCount: count as any })}
                  className={`py-3 px-4 rounded-lg border text-sm font-medium transition-colors min-h-[48px] ${
                    config.questionCount === count 
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {count === 'all' ? 'Tất cả' : count}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-950 p-3 rounded-xl border border-gray-200 dark:border-gray-800 transition-colors">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">STT Bắt đầu</label>
                <input 
                  type="number" 
                  min={1} 
                  max={totalWordsInUnit - 1}
                  value={config.customRange.start}
                  onChange={(e) => setConfig({ ...config, customRange: { ...config.customRange, start: Number(e.target.value) } })}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg p-3 min-h-[48px] outline-none focus:border-indigo-500 text-sm transition-colors"
                />
              </div>
              <div className="pt-5 text-gray-500">đến</div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">STT Kết thúc</label>
                <input 
                  type="number" 
                  min={2} 
                  max={totalWordsInUnit}
                  value={config.customRange.end}
                  onChange={(e) => setConfig({ ...config, customRange: { ...config.customRange, end: Number(e.target.value) } })}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg p-3 min-h-[48px] outline-none focus:border-indigo-500 text-sm transition-colors"
                />
              </div>
            </div>
          )}
          
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        {/* 4. Toggles */}
        <div className="space-y-3 mb-8">
          <label className="flex items-center justify-between cursor-pointer p-4 md:p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[60px] md:min-h-0">
            <div>
              <span className="block text-base md:text-sm font-medium text-gray-800 dark:text-gray-200">Đảo vị trí câu hỏi</span>
            </div>
            <div className="relative inline-block w-10 h-5 rounded-full transition-colors duration-200 ease-in-out">
              <input 
                type="checkbox" 
                className="peer sr-only"
                checked={config.shuffleQuestions}
                onChange={(e) => setConfig({ ...config, shuffleQuestions: e.target.checked })}
              />
              <span className={`block w-10 h-5 rounded-full transition-colors ${config.shuffleQuestions ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'}`}></span>
              <span className={`absolute left-1 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${config.shuffleQuestions ? 'translate-x-5' : 'translate-x-0'}`}></span>
            </div>
          </label>

          <label className="flex items-center justify-between cursor-pointer p-4 md:p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[60px] md:min-h-0">
            <div>
              <span className="block text-base md:text-sm font-medium text-gray-800 dark:text-gray-200">Đảo vị trí đáp án</span>
            </div>
            <div className="relative inline-block w-10 h-5 rounded-full transition-colors duration-200 ease-in-out">
              <input 
                type="checkbox" 
                className="peer sr-only"
                checked={config.shuffleAnswers}
                onChange={(e) => setConfig({ ...config, shuffleAnswers: e.target.checked })}
              />
              <span className={`block w-10 h-5 rounded-full transition-colors ${config.shuffleAnswers ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'}`}></span>
              <span className={`absolute left-1 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${config.shuffleAnswers ? 'translate-x-5' : 'translate-x-0'}`}></span>
            </div>
          </label>

          <label className="flex items-center justify-between cursor-pointer p-4 md:p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[60px] md:min-h-0">
            <div>
              <span className="block text-base md:text-sm font-medium text-gray-800 dark:text-gray-200">Hiển thị gợi ý Hán Việt</span>
              <span className="block text-xs md:text-xs text-gray-500 mt-0.5">Sẽ hiện dưới câu hỏi Kanji</span>
            </div>
            <div className="relative inline-block w-10 h-5 rounded-full transition-colors duration-200 ease-in-out">
              <input 
                type="checkbox" 
                className="peer sr-only"
                checked={config.showHanVietHint}
                onChange={(e) => setConfig({ ...config, showHanVietHint: e.target.checked })}
              />
              <span className={`block w-10 h-5 rounded-full transition-colors ${config.showHanVietHint ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-700'}`}></span>
              <span className={`absolute left-1 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${config.showHanVietHint ? 'translate-x-5' : 'translate-x-0'}`}></span>
            </div>
          </label>
        </div>

        <button
          onClick={handleStart}
          className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Play className="w-5 h-5 fill-current" />
          Bắt đầu Quiz
        </button>

      </div>
    </div>
  );
};
