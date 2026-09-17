import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { grammarBooks } from '../../data/grammar';
import { ArrowLeft, BookOpen, PenTool, Shuffle, FileDown, RefreshCw, ChevronDown, ChevronUp, Play } from 'lucide-react';
import { generateSmartQuestionSet } from '../../utils/grammarEngine/questionGenerator';
import { unit1Data } from '../../data/n3/unit1'; // Mocking vocab data source
import type { PracticeType } from '../../types/grammar';

export const GrammarLesson: React.FC = () => {
  const { bookId, chapterId, grammarId } = useParams<{ bookId: string; chapterId: string; grammarId: string }>();
  const navigate = useNavigate();

  const rule = useMemo(() => {
    const book = grammarBooks.find(b => b.id === bookId);
    const chapter = book?.chapters.find(c => c.id === chapterId);
    return chapter?.grammars.find(g => g.id === grammarId);
  }, [bookId, chapterId, grammarId]);

  const [examples, setExamples] = useState<any[]>([]);
  const [expandedExample, setExpandedExample] = useState<number | null>(null);
  const [selectedPracticeMode, setSelectedPracticeMode] = useState<PracticeType>('multiple_choice');

  // Generate initial examples
  useMemo(() => {
    if (rule && examples.length === 0) {
      const qs = generateSmartQuestionSet({
        grammarRule: rule,
        count: 3,
        seed: Date.now(),
        rawVocabulary: unit1Data as any[],
        requestedPracticeTypes: ['example']
      });
      setExamples(qs.questions);
    }
  }, [rule]); // Run once when rule is loaded

  const handleGenerateExamples = () => {
    if (!rule) return;
    const qs = generateSmartQuestionSet({
      grammarRule: rule,
      count: 3,
      seed: Date.now() + Math.random(),
      rawVocabulary: unit1Data as any[],
      requestedPracticeTypes: ['example']
    });
    setExamples(qs.questions);
  };

  if (!rule) {
    return <div className="p-8 text-center">Không tìm thấy bài học ngữ pháp.</div>;
  }

  const practiceModes: { id: PracticeType; label: string; icon: any }[] = [
    { id: 'multiple_choice', label: 'Chọn đáp án', icon: <PenTool className="w-5 h-5" /> },
    { id: 'fill_blank', label: 'Điền từ', icon: <PenTool className="w-5 h-5" /> },
    { id: 'conjugation', label: 'Chia từ', icon: <PenTool className="w-5 h-5" /> },
    { id: 'sentence_ordering', label: 'Sắp xếp câu', icon: <Shuffle className="w-5 h-5" /> },
    { id: 'ja_to_vi', label: 'Nhật → Việt', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'vi_to_ja', label: 'Việt → Nhật', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'sentence_transformation', label: 'Biến đổi câu', icon: <Shuffle className="w-5 h-5" /> },
    { id: 'grammar_selection', label: 'Chọn ngữ pháp', icon: <PenTool className="w-5 h-5" /> },
    { id: 'free_writing', label: 'Nhập câu', icon: <PenTool className="w-5 h-5" /> },
    { id: 'mixed', label: 'Luyện ngẫu nhiên (Bài này)', icon: <Shuffle className="w-5 h-5 text-indigo-500" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          to={`/grammar/${bookId}/${chapterId}`}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors text-gray-500"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-baseline gap-4">
            {rule.name}
            <span className="text-lg font-medium text-gray-500">{rule.hiragana}</span>
          </h1>
          <p className="text-gray-500 mt-1">{rule.level} • {rule.category}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LÝ THUYẾT */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20">
              <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-100">1. Ý nghĩa</h2>
              <p className="mt-2 text-lg text-gray-800 dark:text-gray-200">{rule.meaning}</p>
              {rule.explanation && (
                <p className="mt-2 text-gray-600 dark:text-gray-400">{rule.explanation}</p>
              )}
            </div>

            {rule.usage && (
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. Cách dùng</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{rule.usage}</p>
              </div>
            )}

            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Cấu trúc</h2>
              <div className="space-y-3">
                {rule.templates.map(t => (
                  <div key={t.id} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <p className="font-bold text-lg text-indigo-600 dark:text-indigo-400 font-mono">{t.pattern}</p>
                    <p className="text-sm text-gray-500 mt-2">{t.vietnamesePattern}</p>
                  </div>
                ))}
              </div>
            </div>

            {rule.patterns && rule.patterns.length > 0 && (
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Cách chia / Form</h2>
                <div className="space-y-2">
                  {rule.patterns.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span className="font-mono text-gray-900 dark:text-white font-medium">{p.pattern}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rule.notes && (
              <div className="p-6 bg-amber-50 dark:bg-amber-900/10">
                <h2 className="text-lg font-bold text-amber-900 dark:text-amber-500 mb-2">4. Ghi chú</h2>
                <p className="text-amber-800 dark:text-amber-200/80 leading-relaxed whitespace-pre-wrap">{rule.notes}</p>
              </div>
            )}
          </div>

          {/* VÍ DỤ ĐỘNG */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ví dụ</h2>
              <button 
                onClick={handleGenerateExamples}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl font-semibold transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Tạo ví dụ khác
              </button>
            </div>
            
            <div className="space-y-4">
              {examples.map((ex, idx) => {
                const meta = ex.metadata;
                if (!meta) return null;
                const isExpanded = expandedExample === idx;

                return (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 mt-1">【{idx + 1}】</span>
                        <div className="flex-1">
                          <p className="text-xl text-gray-900 dark:text-white font-medium leading-loose">
                            {meta.pattern && meta.slotValues ? (
                              <>
                                {meta.pattern.split(/(\{.*?\})/).map((part: string, i: number) => {
                                  if (part.startsWith('{') && part.endsWith('}')) {
                                    const slotName = part.slice(1, -1);
                                    return (
                                      <span key={i} className="text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 mx-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded border border-indigo-100 dark:border-indigo-800/50 relative group">
                                        {meta.slotValues[slotName]}
                                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                          {slotName}
                                        </span>
                                      </span>
                                    );
                                  }
                                  if (part && !/^[、。！？\s]+$/.test(part)) {
                                    return <span key={i} className="text-red-600 dark:text-red-400 font-bold mx-0.5">{part}</span>;
                                  }
                                  return <span key={i}>{part}</span>;
                                })}
                              </>
                            ) : (
                              meta.japanese
                            )}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 mt-2">{meta.hiragana}</p>
                          <p className="text-gray-700 dark:text-gray-300">{meta.vietnamese}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      <button 
                        onClick={() => setExpandedExample(isExpanded ? null : idx)}
                        className="w-full p-3 flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {isExpanded ? 'Đóng phân tích' : 'Phân tích câu'}
                      </button>
                      
                      {isExpanded && (
                        <div className="p-5 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 space-y-5">
                          {/* Conjugation Analysis */}
                          <div>
                            <h4 className="font-bold text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Cách tạo câu</h4>
                            <div className="flex flex-wrap items-center gap-3 text-gray-700 dark:text-gray-300 font-mono text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                              <span>{meta.conjugation?.base}</span>
                              <span className="text-gray-400">→</span>
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{meta.conjugation?.conjugated}</span>
                              <span className="text-gray-400">→</span>
                              <span>{meta.conjugation?.rule}</span>
                            </div>
                          </div>
                          
                          {/* Vocabulary */}
                          <div>
                            <h4 className="font-bold text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Từ vựng</h4>
                            <div className="space-y-2">
                              {meta.vocabulary?.map((v: any, vi: number) => (
                                <div key={vi} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 p-2.5 rounded-lg text-sm border border-gray-100 dark:border-gray-700">
                                  <div>
                                    <span className="font-bold text-gray-900 dark:text-white text-base">{v.kanji || v.hiragana}</span>
                                    {v.kanji && <span className="text-gray-500 ml-2">({v.hiragana})</span>}
                                  </div>
                                  <span className="text-gray-600 dark:text-gray-400 font-medium">{v.meaning?.split(',')[0]}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* LUYỆN TẬP WORKSPACE */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6 sticky top-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-indigo-500" />
              Luyện tập
            </h2>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Chọn dạng bài</label>
              <select 
                value={selectedPracticeMode}
                onChange={(e) => setSelectedPracticeMode(e.target.value as PracticeType)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
              >
                {practiceModes.filter(m => m.id !== 'mixed').map(mode => (
                  <option key={mode.id} value={mode.id}>{mode.label}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => navigate(`/grammar/${bookId}/${chapterId}/practice/${grammarId}?mode=${selectedPracticeMode}`)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-sm"
            >
              Bắt đầu luyện
            </button>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-6 space-y-3">
              <button 
                onClick={() => navigate(`/grammar/${bookId}/${chapterId}/practice?mode=mixed`)}
                className="w-full flex items-center justify-center gap-2 p-4 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-400 rounded-xl font-bold transition-colors shadow-sm"
              >
                ★ Luyện tập tổng hợp
              </button>

              <button 
                onClick={() => navigate(`/pdf?tab=grammar&bookId=${bookId}&chapterId=${chapterId}`)}
                className="w-full flex items-center justify-center gap-2 p-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-bold transition-colors shadow-sm"
              >
                <FileDown className="w-5 h-5" />
                Tạo PDF bài này
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
