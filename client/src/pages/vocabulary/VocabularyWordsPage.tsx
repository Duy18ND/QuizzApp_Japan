import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { VocabularyTabs } from '../../components/vocabulary/VocabularyTabs';
import { ExportPDFModal } from '../../components/pdf/ExportPDFModal';
import { ChevronRight, Home, Star, Volume2 } from 'lucide-react';
import { UNIT_DATA } from '../../data/unitData';
import { useUserProgress } from '../../hooks/useUserProgress';
import type { JLPTLevel, WordType } from '../../types/quiz';
import { allVocabularyData } from '../../data';

const wordTypeColors: Record<WordType, string> = {
  noun: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  verb: 'bg-red-500/20 text-red-400 border border-red-500/30',
  vi: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  vt: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  i_adj: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  na_adj: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  adv: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  other: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

const formatWordType = (type?: WordType) => {
  switch (type) {
    case 'noun': return 'Danh từ';
    case 'verb': return 'Động từ';
    case 'vi': return 'Tự động từ';
    case 'vt': return 'Tha động từ';
    case 'i_adj': return 'Tính từ (い)';
    case 'na_adj': return 'Tính từ (な)';
    case 'adv': return 'Phó từ';
    default: return 'Khác';
  }
};

const mapVietnameseWordTypeToEnglish = (viType?: string): WordType => {
  if (!viType) return 'other';
  const t = viType.toLowerCase();
  if (t.includes('danh từ')) return 'noun';
  if (t.includes('động từ')) return 'verb';
  if (t.includes('tính từ -i') || t.includes('tính từ (い)')) return 'i_adj';
  if (t.includes('tính từ -na') || t.includes('tính từ (な)')) return 'na_adj';
  if (t.includes('phó từ')) return 'adv';
  return 'other';
};

export const VocabularyWordsPage: React.FC = () => {
  const { level, unitId } = useParams<{ level: string; unitId: string }>();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { progress, toggleStar } = useUserProgress();
  
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('all');

  const FILTER_OPTIONS = [
    { id: 'all', label: 'Tất cả' },
    { id: 'noun', label: 'Danh từ' },
    { id: 'verb', label: 'Động từ' },
    { id: 'i_adj', label: 'Tính từ -i' },
    { id: 'na_adj', label: 'Tính từ -na' },
    { id: 'adv', label: 'Phó từ' },
  ];

  const filteredWords = words.filter(word => {
    if (selectedType === 'all') return true;
    if (selectedType === 'verb') return ['verb', 'vi', 'vt'].includes(word.wordType);
    return word.wordType === selectedType;
  });

  const levelKey = (level?.toUpperCase() || 'N3') as JLPTLevel;
  const numericUnitId = Number(unitId);
  const unitInfo = UNIT_DATA[levelKey]?.find(u => u.id === numericUnitId);

  useEffect(() => {
    setLoading(true);
    try {
      const data = allVocabularyData[levelKey.toLowerCase()]?.[numericUnitId.toString()];
      if (data && Array.isArray(data)) {
        const formattedWords = data.map(w => ({
          id: w.id,
          kanji: w.kanji,
          hanviet: w.hanViet || w.hanviet,
          hiragana: w.hiragana,
          meaning: w.meaning,
          wordType: mapVietnameseWordTypeToEnglish(w.wordType)
        }));
        setWords(formattedWords);
      } else {
        setWords([]);
      }
    } catch (err) {
      console.error("Failed to load words", err);
    } finally {
      setLoading(false);
    }
  }, [numericUnitId, levelKey]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="w-full space-y-6">
      <VocabularyTabs onExportPDF={() => setIsExportOpen(true)} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link to="/vocabulary" className="hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" /> Từ vựng
        </Link>
        <ChevronRight className="w-4 h-4" />
        <Link to={`/vocabulary/${level}`} className="hover:text-gray-900 dark:hover:text-white transition-colors">
          Trình độ {levelKey}
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-indigo-600 dark:text-indigo-400 font-medium">{unitInfo?.name || `Unit ${numericUnitId}`}</span>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Danh sách từ vựng ({filteredWords.length} từ)
          </h2>
          
          {/* Filter Pills */}
          <div className="flex overflow-x-auto whitespace-nowrap gap-2 pb-1 scrollbar-hide">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSelectedType(opt.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedType === opt.id 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">Đang tải danh sách từ vựng...</div>
        ) : words.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">Không có dữ liệu từ vựng cho bài học này.</div>
        ) : (
          <>
            {/* Mobile View: Cards */}
            <div className="md:hidden flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
              {filteredWords.map((word, index) => {
                const isStarred = progress.starredWords.includes(word.id);
                const badgeColor = wordTypeColors[word.wordType as WordType] || wordTypeColors.other;

                return (
                  <div key={word.id} className="p-4 flex flex-col gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 dark:text-gray-500 font-mono text-sm">{index + 1}.</span>
                        <div className="flex flex-col">
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">{word.kanji || word.hiragana}</span>
                          {word.kanji && word.hanviet && <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">{word.hanviet}</span>}
                          {word.kanji && <span className="text-sm text-indigo-500 dark:text-indigo-300">{word.hiragana}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => speakText(word.kanji || word.hiragana)}
                          className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors p-2"
                          title="Phát âm"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => toggleStar(word.id)}
                          className={`transition-colors p-2 ${isStarred ? 'text-yellow-500 dark:text-yellow-400' : 'text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400'}`}
                          title={isStarred ? 'Bỏ lưu' : 'Lưu từ này'}
                        >
                          <Star className={`w-5 h-5 ${isStarred ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium mb-1 ${badgeColor}`}>
                        {formatWordType(word.wordType)}
                      </span>
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{word.meaning}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800/50">
                <tr>
                  <th className="px-6 py-4 font-medium rounded-tl-lg">STT</th>
                  <th className="px-6 py-4 font-medium">Từ vựng</th>
                  <th className="px-6 py-4 font-medium">Từ loại</th>
                  <th className="px-6 py-4 font-medium">Ý nghĩa</th>
                  <th className="px-6 py-4 font-medium text-right rounded-tr-lg">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50">
                {filteredWords.map((word, index) => {
                  const isStarred = progress.starredWords.includes(word.id);
                  const badgeColor = wordTypeColors[word.wordType as WordType] || wordTypeColors.other;

                  return (
                    <tr key={word.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                      <td className="px-6 py-4 text-gray-400 dark:text-gray-500 font-mono">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">{word.kanji || word.hiragana}</span>
                          {word.kanji && word.hanviet && <span className="text-sm text-gray-500 dark:text-gray-400 uppercase">{word.hanviet}</span>}
                          {word.kanji && <span className="text-sm text-indigo-500 dark:text-indigo-300">{word.hiragana}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${badgeColor}`}>
                          {formatWordType(word.wordType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {word.meaning}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3 transition-opacity">
                          <button 
                            onClick={() => speakText(word.kanji || word.hiragana)}
                            className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors p-1"
                            title="Phát âm"
                          >
                            <Volume2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => toggleStar(word.id)}
                            className={`transition-colors p-1 ${isStarred ? 'text-yellow-500 dark:text-yellow-400' : 'text-gray-400 hover:text-yellow-500 dark:text-gray-500 dark:hover:text-yellow-400'}`}
                            title={isStarred ? 'Bỏ lưu' : 'Lưu từ này'}
                          >
                            <Star className={`w-5 h-5 ${isStarred ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {isExportOpen && <ExportPDFModal onClose={() => setIsExportOpen(false)} />}
    </div>
  );
};
