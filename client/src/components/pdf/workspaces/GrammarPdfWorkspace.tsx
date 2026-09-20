import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Download, RefreshCcw, Book } from 'lucide-react';
import { createPortal } from 'react-dom';
import { grammarBooks } from '../../../data/grammar';
import { useSearchParams } from 'react-router-dom';
import { GrammarPdfBuilder } from './GrammarPdfBuilder';
import { FontManager } from '../../../utils/fontManager';
import { generateGrammarPdfDataset } from '../../../data/pdf/grammarPdfGenerator';
import type { GrammarPdfConfig, PdfMode, GrammarPdfSet } from '../../../data/pdf/grammarPdfGenerator';

export const GrammarPdfWorkspace: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initBookId = searchParams.get('bookId') || grammarBooks[0]?.id || '';
  const initChapterId = searchParams.get('chapterId') || grammarBooks.find(b => b.id === initBookId)?.chapters[0]?.id || '';
  const initGrammarId = searchParams.get('grammarId') || '';

  const [selectedBookId, setSelectedBookId] = useState<string>(initBookId);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(initChapterId);
  
  const selectedBook = useMemo(() => grammarBooks.find(b => b.id === selectedBookId), [selectedBookId]);
  const selectedChapter = useMemo(() => selectedBook?.chapters.find(c => c.id === selectedChapterId), [selectedBook, selectedChapterId]);
  
  const rules = useMemo(() => selectedChapter?.grammars || [], [selectedChapter]);

  const [selectedRules, setSelectedRules] = useState<string[]>(initGrammarId ? [initGrammarId] : []);
  
  // New PDF Config States
  const [pdfMode, setPdfMode] = useState<PdfMode>('vi_to_ja');
  
  type CountOption = number | 'all' | 'custom';
  const [questionCount, setQuestionCount] = useState<CountOption>(5);
  const [customCount, setCustomCount] = useState<number | ''>('');
  

  const [showHiragana, setShowHiragana] = useState<boolean>(false);
  const [generateAnswer, setGenerateAnswer] = useState(true);

  const [generatedSets, setGeneratedSets] = useState<GrammarPdfSet[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // === Cache & Lock ===
  const lastConfigRef = useRef<string>('');
  const isExportingRef = useRef(false);

  const getConfigFingerprint = useCallback(() => {
    return JSON.stringify({
      rules: [...selectedRules].sort(),
      mode: pdfMode,
      count: questionCount === 'custom' ? customCount : questionCount,
      showHiragana: showHiragana
    });
  }, [selectedRules, pdfMode, questionCount, customCount, showHiragana]);

  const handleToggleRule = (id: string) => {
    setSelectedRules(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    if (selectedRules.length === 0) return;
    
    if (isExportingRef.current) return;
    isExportingRef.current = true;
    setIsGenerating(true);
    
    try {
      await FontManager.ensureReady();

      const currentConfig = getConfigFingerprint();
      const needsRegenerate = currentConfig !== lastConfigRef.current || generatedSets.length === 0;

      if (needsRegenerate) {
        let finalCount: number | 'all' = 10;
        if (questionCount === 'all') finalCount = 'all';
        else if (questionCount === 'custom') finalCount = customCount === '' ? 10 : customCount;
        else finalCount = questionCount;

        const config: GrammarPdfConfig = {
          mode: pdfMode,
          scope: 'grammar',
          count: finalCount,
          grammarIds: selectedRules,
          showHiragana,
        };
        
        const sets = generateGrammarPdfDataset(config);
        setGeneratedSets(sets);
        lastConfigRef.current = currentConfig;

        await new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });
      }
      
      window.print();
    } finally {
      setIsGenerating(false);
      isExportingRef.current = false;
    }
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 h-full relative pb-8">
      {/* Cấu hình (Left Panel) */}
      <div className="flex flex-col gap-6">
        
        {/* Book & Chapter Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
           <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Book className="w-5 h-5 text-blue-500" />
            Chọn giáo trình
          </h3>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Giáo trình</label>
            <select 
              value={selectedBookId}
              onChange={e => setSelectedBookId(e.target.value)}
              className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
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
                setSelectedRules([]); 
              }}
              className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              {selectedBook?.chapters.map(c => (
                 <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cấu hình PDF */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-6">
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Loại PDF</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="pdfMode" 
                  value="vi_to_ja" 
                  checked={pdfMode === 'vi_to_ja'} 
                  onChange={() => setPdfMode('vi_to_ja')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-900 dark:text-white">Việt → Nhật</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="pdfMode" 
                  value="ja_to_vi" 
                  checked={pdfMode === 'ja_to_vi'} 
                  onChange={() => setPdfMode('ja_to_vi')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-900 dark:text-white">Nhật → Việt</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Chọn ngữ pháp</label>
            <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900/50">
              {rules.map((rule) => (
                <label key={rule.id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={selectedRules.includes(rule.id)}
                    onChange={() => handleToggleRule(rule.id)}
                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{rule.name}</div>
                    <div className="text-xs text-gray-500">{rule.meaning}</div>
                  </div>
                </label>
              ))}
              <div className="mt-2">
                <button 
                  onClick={() => setSelectedRules(rules.map((r) => r.id))}
                  className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline mr-4"
                >
                  Chọn tất cả
                </button>
                <button 
                  onClick={() => setSelectedRules([])}
                  className="text-sm text-red-600 dark:text-red-400 font-medium hover:underline"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Số câu hỏi (mỗi ngữ pháp)
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {[2, 3, 5, 10, 'all'].map(num => (
                <button
                  key={num}
                  onClick={() => {
                    setQuestionCount(num as any);
                    if (num !== 'custom') setCustomCount('');
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    questionCount === num 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {num === 'all' ? 'Tất cả' : num}
                </button>
              ))}
              
              <div className="flex items-center ml-2">
                <button
                  onClick={() => setQuestionCount('custom')}
                  className={`px-4 py-2 rounded-l-lg text-sm font-medium transition-colors ${
                    questionCount === 'custom'
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Tự nhập
                </button>
                {questionCount === 'custom' && (
                  <input
                    type="number"
                    min="1"
                    value={customCount}
                    onChange={(e) => setCustomCount(e.target.value ? parseInt(e.target.value, 10) : '')}
                    placeholder="VD: 15"
                    className="w-20 px-3 py-2 border-y border-r border-gray-200 dark:border-gray-700 rounded-r-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
          </div>



          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
             <label className="flex items-center gap-3 py-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={showHiragana}
                onChange={e => setShowHiragana(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Hiển thị Hiragana hỗ trợ</span>
            </label>
            <p className="text-xs text-gray-500 pl-8">In thêm dòng Hiragana gợi ý (chỉ áp dụng cho loại Việt → Nhật).</p>
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
            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <span className="font-semibold text-gray-900 dark:text-white text-sm">Tạo kèm Answer Key (Đáp án)</span>
        </label>

        <button 
          onClick={handleExport}
          disabled={selectedRules.length === 0 || isGenerating}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
        >
          {isGenerating ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
          {isGenerating ? '⏳ Đang tạo PDF...' : 'Xuất PDF Worksheet'}
        </button>
      </div>

      {/* Hidden Print Container via Portal */}
      {createPortal(
        <GrammarPdfBuilder 
          bookId={selectedBookId} 
          chapterId={selectedChapterId}
          generatedSets={generatedSets} 
          generateAnswer={generateAnswer} 
          linesCount={1}
          pdfMode={pdfMode}
        />,
        document.body
      )}
    </div>
  );
};
