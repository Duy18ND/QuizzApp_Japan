import React, { useState, useMemo } from 'react';
import { Download, RefreshCcw, Book, Layers } from 'lucide-react';
import { createPortal } from 'react-dom';
import { generateSmartQuestionSet } from '../../../utils/grammarEngine/questionGenerator';
import { grammarBooks } from '../../../data/grammar';
import { unit1Data } from '../../../data/n3/unit1';
import { useSearchParams } from 'react-router-dom';
import { GrammarPdfBuilder } from './GrammarPdfBuilder';
import type { PracticeType } from '../../../types/grammar';

export const GrammarPdfWorkspace: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initBookId = searchParams.get('bookId') || grammarBooks[0]?.id || '';
  const initChapterId = searchParams.get('chapterId') || grammarBooks.find(b => b.id === initBookId)?.chapters[0]?.id || '';
  const initGrammarId = searchParams.get('grammarId') || '';

  const initCount = parseInt(searchParams.get('count') || '5', 10);
  const initMode = searchParams.get('mode') || 'mixed';

  const [selectedBookId, setSelectedBookId] = useState<string>(initBookId);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(initChapterId);
  
  const selectedBook = useMemo(() => grammarBooks.find(b => b.id === selectedBookId), [selectedBookId]);
  const selectedChapter = useMemo(() => selectedBook?.chapters.find(c => c.id === selectedChapterId), [selectedBook, selectedChapterId]);
  
  const rules = useMemo(() => selectedChapter?.grammars || [], [selectedChapter]);

  const [selectedRules, setSelectedRules] = useState<string[]>(initGrammarId ? [initGrammarId] : []);
  const [questionCount, setQuestionCount] = useState(initCount);
  const [generateAnswer, setGenerateAnswer] = useState(true);
  const [generatedSets, setGeneratedSets] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('current');
  const [selectedPreset, setSelectedPreset] = useState<string>('vi_to_ja');

  const handleToggleRule = (id: string) => {
    setSelectedRules(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    if (selectedRules.length === 0) return;
    setIsGenerating(true);
    
    const nextSeed = Date.now();
    
    setTimeout(() => {
      const topicScope = selectedTopic === 'current' ? [] : [];
      // Use URL mode if provided, otherwise the preset dropdown
      const requestedPracticeTypes: PracticeType[] | undefined = 
        initMode === 'mixed' && selectedPreset === 'mixed' ? undefined : [(initMode && initMode !== 'mixed' ? initMode : selectedPreset) as PracticeType];
      
      const sets = selectedRules.map(id => {
        const rule = rules.find((r) => r.id === id)!;
        return generateSmartQuestionSet({
          grammarRule: rule,
          count: questionCount,
          seed: nextSeed,
          rawVocabulary: unit1Data as any[],
          topicScope,
          requestedPracticeTypes
        });
      });
      setGeneratedSets(sets);
      
      setTimeout(() => {
        setIsGenerating(false);
        window.print();
      }, 500); // allow time for the hidden print block to render
    }, 100);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 h-full relative pb-8">
      {/* Cấu hình (Left Panel) */}
      <div className="flex flex-col gap-6">
        
        {/* Book & Chapter Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
           <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Book className="w-5 h-5 text-indigo-500" />
            Chọn giáo trình
          </h3>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Giáo trình</label>
            <select 
              value={selectedBookId}
              onChange={e => setSelectedBookId(e.target.value)}
              className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {grammarBooks.map(b => (
                 <option key={b.id} value={b.id}>{b.title} ({b.level})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Chương / Bài</label>
            <select 
              value={selectedChapterId}
              onChange={e => {
                setSelectedChapterId(e.target.value);
                setSelectedRules([]); // reset selections
              }}
              className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {selectedBook?.chapters.map(c => (
                 <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-indigo-500" />
            Chọn ngữ pháp ({rules.length})
          </h3>
          
          <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900/50 mb-3">
            {rules.map((rule) => (
              <label key={rule.id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                <input 
                  type="checkbox"
                  checked={selectedRules.includes(rule.id)}
                  onChange={() => handleToggleRule(rule.id)}
                  className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{rule.name}</div>
                  <div className="text-xs text-gray-500">{rule.meaning}</div>
                </div>
              </label>
            ))}
          </div>
          <button 
            onClick={() => setSelectedRules(rules.map((r) => r.id))}
            className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
          >
            Chọn tất cả
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-6">
           <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Preset (Loại bài tập)</label>
            <select 
              value={selectedPreset}
              onChange={e => setSelectedPreset(e.target.value)}
              className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="vi_to_ja">Dịch Việt sang Nhật</option>
              <option value="ja_to_vi">Dịch Nhật sang Việt</option>
            </select>
          </div>

           <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nguồn từ vựng</label>
            <select 
              value={selectedTopic}
              onChange={e => setSelectedTopic(e.target.value)}
              className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="current">Sử dụng từ vựng của bài hiện tại</option>
              <option value="unit1">Từ vựng Unit 1 (N3)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Số lượng câu (mỗi ngữ pháp)</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 italic">Lưu ý: Chọn số lượng nhỏ (2-5) để PDF không quá dài.</p>
            <div className="flex gap-2">
              {[2, 3, 5, 10].map(num => (
                <button
                  key={num}
                  onClick={() => setQuestionCount(num)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    questionCount === num 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
        <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer">
          <input 
            type="checkbox"
            checked={generateAnswer}
            onChange={e => setGenerateAnswer(e.target.checked)}
            className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
          />
          <span className="font-semibold text-gray-900 dark:text-white text-sm">Tạo kèm Answer Key (Đáp án)</span>
        </label>

        <button 
          onClick={handleExport}
          disabled={selectedRules.length === 0 || isGenerating}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
        >
          {isGenerating ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
          {isGenerating ? 'Đang tạo...' : 'Xuất PDF'}
        </button>
      </div>



      {/* Hidden Print Container via Portal to avoid overflow:hidden clipping */}
      {createPortal(
        <GrammarPdfBuilder bookId={selectedBookId} generatedSets={generatedSets} generateAnswer={generateAnswer} />,
        document.body
      )}
    </div>
  );
};
