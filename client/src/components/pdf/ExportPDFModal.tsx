import React, { useState, useEffect } from 'react';
import { X, FileDown, Sparkles, Plus, Trash2, Loader2, KeyRound, HelpCircle } from 'lucide-react';
import { DraggableColumnList, type ColumnOption } from './DraggableColumnList';
import { exportToPDF } from '../../utils/pdfExport';
import { extractVocabularyWithGemini } from '../../utils/geminiApi';
import { UNIT_DATA } from '../../data/unitData';
import { useUserProgress } from '../../hooks/useUserProgress';
import type { JLPTLevel, QuizSource, QuizRangeType } from '../../types/quiz';

export interface ExportPDFModalProps {
  onClose: () => void;
}

const DEFAULT_COLUMNS: ColumnOption[] = [
  { id: 'kanji', label: 'Kanji', showContent: true },
  { id: 'hanviet', label: 'Âm Hán Việt', showContent: true },
  { id: 'hiragana', label: 'Hiragana', showContent: true },
  { id: 'meaning', label: 'Nghĩa', showContent: true }
];

export const ExportPDFModal: React.FC<ExportPDFModalProps> = ({ onClose }) => {
  const { progress } = useUserProgress();
  const [columns, setColumns] = useState<ColumnOption[]>(DEFAULT_COLUMNS);
  const [isExporting, setIsExporting] = useState(false);
  
  // Tab 1: System Selection
  const [tab, setTab] = useState<'system' | 'custom'>('system');
  const [level, setLevel] = useState<JLPTLevel>('N3');
  const [unitId, setUnitId] = useState<number>(1);
  const [source, setSource] = useState<QuizSource>('all');
  const [rangeType, setRangeType] = useState<QuizRangeType>('fixed');
  const [customRange, setCustomRange] = useState({ start: 1, end: 20 });
  
  const activeUnits = UNIT_DATA[level] || UNIT_DATA['N3'];

  // Tab 2: Free list (Manual Grid + AI Import)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [aiModel, setAiModel] = useState(() => localStorage.getItem('gemini_model') || 'gemini-2.0-flash');
  const [showApiHelp, setShowApiHelp] = useState(false);
  const [aiText, setAiText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [manualWords, setManualWords] = useState<any[]>([
    { id: '1', kanji: '', hanviet: '', hiragana: '', meaning: '' }
  ]);

  useEffect(() => {
    if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
    else localStorage.removeItem('gemini_api_key');
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('gemini_model', aiModel);
  }, [aiModel]);

  const handleLevelChange = (newLevel: JLPTLevel) => {
    const defaultUnitId = UNIT_DATA[newLevel]?.[0]?.id || 1;
    setLevel(newLevel);
    setUnitId(defaultUnitId);
  };

  const handleExtractAI = async () => {
    if (!aiText.trim()) return;
    if (!apiKey.trim()) {
      alert("Vui lòng nhập Gemini API Key để sử dụng tính năng này!");
      return;
    }

    setIsExtracting(true);
    
    try {
      const extractedWords = await extractVocabularyWithGemini(aiText, apiKey, aiModel);
      
      const formattedWords = extractedWords.map((w: any) => ({
        id: Date.now().toString() + Math.random().toString(),
        kanji: w.kanji || '',
        hanviet: w.hanviet || w.hanViet || '',
        hiragana: w.hiragana || '',
        meaning: w.meaning || ''
      }));
      
      setManualWords(prev => {
        const filtered = prev.filter(w => w.kanji || w.hiragana || w.meaning);
        return [...filtered, ...formattedWords];
      });
      
      setAiText(''); 
    } catch (error: any) {
      console.error("Lỗi AI Extraction:", error);
      alert("Lỗi trích xuất AI: " + (error.message || "Đảm bảo API Key hợp lệ và đúng định dạng."));
    } finally {
      setIsExtracting(false);
    }
  };

  const addManualRow = () => {
    setManualWords([...manualWords, { id: Date.now().toString(), kanji: '', hanviet: '', hiragana: '', meaning: '' }]);
  };

  const removeManualRow = (id: string) => {
    setManualWords(manualWords.filter(w => w.id !== id));
  };

  const updateManualRow = (id: string, field: string, value: string) => {
    setManualWords(manualWords.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let exportWords: any[] = [];
      
      if (tab === 'system') {
        const targetWordIds = source === 'starred' 
          ? progress.starredWords 
          : source === 'wrong' 
            ? Object.keys(progress.wrongWords).map(Number) 
            : [];

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/quiz/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unitId: unitId,
            source: source,
            targetWordIds: targetWordIds,
            rangeType: rangeType,
            customRange: customRange,
            count: 'all', 
            types: ['all'],
            shuffleQuestions: false, 
            shuffleAnswers: false
          })
        });

        if (!response.ok) throw new Error('Lỗi tải dữ liệu hệ thống.');
        const data = await response.json();
        
        exportWords = data.map((q: any) => ({
          id: q.wordId.toString(),
          kanji: q.answerData.kanji || '',
          hanViet: q.answerData.hanViet || '',
          hiragana: q.answerData.hiragana || '',
          meaning: q.answerData.meaning || ''
        }));
      } else {
        exportWords = manualWords.filter(w => w.kanji || w.hiragana || w.meaning);
        if (exportWords.length === 0) throw new Error('Vui lòng thêm ít nhất một từ vựng.');
        
        exportWords = exportWords.map(w => ({
          ...w,
          hanViet: w.hanviet
        }));
      }

      await exportToPDF(exportWords, columns);
      onClose();
    } catch (error: any) {
      console.error('Lỗi khi xuất PDF:', error);
      alert(error.message || 'Có lỗi xảy ra khi xuất PDF. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-auto md:max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileDown className="w-6 h-6 text-indigo-400" />
            Xuất PDF Luyện Viết
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
          {/* Left Panel: Data Source */}
          <div className="flex-1 border-b md:border-b-0 md:border-r border-gray-800 overflow-y-auto flex flex-col min-h-[50vh] md:min-h-0">
            <div className="p-5 border-b border-gray-800 bg-gray-950/50">
              <div className="flex bg-gray-900 p-1 rounded-xl">
                <button
                  onClick={() => setTab('system')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'system' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
                >
                  Chọn từ hệ thống
                </button>
                <button
                  onClick={() => setTab('custom')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'custom' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
                >
                  Tạo danh sách tự do
                </button>
              </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto">
              {tab === 'system' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Trình độ</label>
                      <select 
                        className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg p-2.5 outline-none focus:border-indigo-500"
                        value={level}
                        onChange={(e) => handleLevelChange(e.target.value as JLPTLevel)}
                      >
                        {['N5', 'N4', 'N3', 'N2', 'N1'].map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Bài học</label>
                      <select 
                        className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg p-2.5 outline-none focus:border-indigo-500"
                        value={unitId}
                        onChange={(e) => setUnitId(Number(e.target.value))}
                      >
                        {activeUnits.map(unit => (
                          <option key={unit.id} value={unit.id}>{unit.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nguồn từ vựng</label>
                    <select 
                      className="w-full bg-gray-950 border border-gray-700 text-white rounded-lg p-2.5 outline-none focus:border-indigo-500"
                      value={source}
                      onChange={(e) => setSource(e.target.value as QuizSource)}
                    >
                      <option value="all">Tất cả từ vựng trong Unit</option>
                      <option value="starred">Chỉ từ đã lưu (★)</option>
                      <option value="wrong">Từ làm sai</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Phạm vi STT (Bắt đầu - Kết thúc)</label>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <select 
                        className="w-full sm:w-1/3 bg-gray-950 border border-gray-700 text-white rounded-lg p-3 min-h-[44px] outline-none focus:border-indigo-500"
                        value={rangeType}
                        onChange={(e) => setRangeType(e.target.value as QuizRangeType)}
                      >
                        <option value="fixed">Tất cả</option>
                        <option value="custom">Tùy chỉnh</option>
                      </select>
                      
                      {rangeType === 'custom' && (
                        <div className="flex items-center gap-2 w-full sm:w-2/3 mt-2 sm:mt-0">
                          <input 
                            type="number" 
                            min="1"
                            className="w-1/2 bg-gray-950 border border-gray-700 text-white rounded-lg p-3 min-h-[44px] text-center outline-none focus:border-indigo-500"
                            value={customRange.start}
                            onChange={(e) => setCustomRange({ ...customRange, start: parseInt(e.target.value) || 1 })}
                          />
                          <span className="text-gray-400">-</span>
                          <input 
                            type="number" 
                            min="1"
                            className="w-1/2 bg-gray-950 border border-gray-700 text-white rounded-lg p-3 min-h-[44px] text-center outline-none focus:border-indigo-500"
                            value={customRange.end}
                            onChange={(e) => setCustomRange({ ...customRange, end: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full space-y-4">
                  {/* AI Import Box */}
                  <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4">
                    <div className="flex flex-col gap-3 mb-3">
                      <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-indigo-300">Magic AI Import</label>
                        <button 
                          onClick={handleExtractAI}
                          disabled={isExtracting || !aiText.trim()}
                          className="flex items-center gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {isExtracting ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Đang xử lý...</>
                          ) : (
                            <><Sparkles className="w-3 h-3" /> Trích xuất bằng AI</>
                          )}
                        </button>
                      </div>
                      
                      {/* API Key & Model Input */}
                      <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 relative">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1 flex items-center gap-2 border-b sm:border-b-0 sm:border-r border-gray-700/50 pb-2 sm:pb-0 sm:pr-3">
                            <KeyRound className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <input
                              type="password"
                              placeholder="Nhập Google Gemini API Key (Bắt buộc)"
                              className="w-full bg-transparent border-none text-xs text-white outline-none placeholder-gray-600"
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                            />
                          </div>
                          <div className="sm:w-1/3 flex items-center gap-2">
                            <select 
                              value={aiModel}
                              onChange={(e) => setAiModel(e.target.value)}
                              className="w-full bg-gray-800 border border-gray-700 text-xs text-gray-300 rounded px-2 py-1 outline-none focus:border-indigo-500"
                            >
                              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Khuyên dùng)</option>
                              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Dự phòng)</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-2 ml-6">
                          <button 
                            onClick={() => setShowApiHelp(!showApiHelp)}
                            className="text-[11px] text-blue-400 hover:text-blue-300 underline underline-offset-2 flex items-center gap-1 transition-colors"
                          >
                            <HelpCircle className="w-3 h-3" /> Chưa có Key? Xem hướng dẫn lấy Key miễn phí
                          </button>
                        </div>

                        {/* API Help Popover */}
                        {showApiHelp && (
                          <div className="absolute top-full left-0 mt-2 w-full bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-xl z-20 text-xs text-gray-300">
                            <h4 className="font-semibold text-white mb-2 text-sm flex items-center justify-between">
                              Hướng dẫn lấy Gemini API Key (Miễn phí)
                              <button onClick={() => setShowApiHelp(false)} className="text-gray-500 hover:text-white">
                                <X className="w-4 h-4" />
                              </button>
                            </h4>
                            <ol className="list-decimal pl-4 space-y-1.5">
                              <li>Truy cập trang <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-medium">Google AI Studio</a>.</li>
                              <li>Đăng nhập bằng tài khoản Google của bạn.</li>
                              <li>Nhấn nút <strong>Create API key</strong> màu xanh, tạo mới và copy đoạn mã hiện ra.</li>
                              <li>Quay lại đây và dán vào ô bên trên để sử dụng.</li>
                            </ol>
                            <p className="mt-3 text-[10px] text-gray-500 bg-gray-900 p-2 rounded border border-gray-700/50">
                              🔒 Key của bạn chỉ được lưu cục bộ trên trình duyệt này bằng localStorage, hoàn toàn an toàn và không bị gửi lên server hệ thống.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <textarea 
                      className="w-full h-20 bg-gray-900/50 border border-indigo-500/30 rounded-lg p-3 text-sm text-gray-200 focus:border-indigo-500 outline-none resize-none placeholder-gray-500"
                      placeholder="Dán đoạn văn bản tiếng Nhật lộn xộn vào đây..."
                      value={aiText}
                      onChange={(e) => setAiText(e.target.value)}
                    />
                  </div>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-800"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-500 text-xs uppercase font-semibold">Hoặc tự điền tay</span>
                    <div className="flex-grow border-t border-gray-800"></div>
                  </div>

                  {/* Manual Grid */}
                  <div className="flex-1 overflow-y-auto border border-gray-800 rounded-xl">
                    <table className="w-full text-left text-sm text-gray-300">
                      <thead className="bg-gray-900 text-xs text-gray-400 sticky top-0 z-10">
                        <tr>
                          <th className="p-2 w-1/4">Kanji</th>
                          <th className="p-2 w-1/4">Hán Việt</th>
                          <th className="p-2 w-1/4">Hiragana</th>
                          <th className="p-2 w-1/4">Nghĩa</th>
                          <th className="p-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {manualWords.map((row) => (
                          <tr key={row.id} className="bg-gray-950/50 hover:bg-gray-800/30">
                            <td className="p-1">
                              <input 
                                className="w-full bg-transparent border border-transparent hover:border-gray-700 focus:border-indigo-500 rounded p-1.5 outline-none"
                                value={row.kanji}
                                onChange={(e) => updateManualRow(row.id, 'kanji', e.target.value)}
                                placeholder="Kanji"
                              />
                            </td>
                            <td className="p-1">
                              <input 
                                className="w-full bg-transparent border border-transparent hover:border-gray-700 focus:border-indigo-500 rounded p-1.5 outline-none"
                                value={row.hanviet}
                                onChange={(e) => updateManualRow(row.id, 'hanviet', e.target.value)}
                                placeholder="Hán Việt"
                              />
                            </td>
                            <td className="p-1">
                              <input 
                                className="w-full bg-transparent border border-transparent hover:border-gray-700 focus:border-indigo-500 rounded p-1.5 outline-none"
                                value={row.hiragana}
                                onChange={(e) => updateManualRow(row.id, 'hiragana', e.target.value)}
                                placeholder="Hiragana"
                              />
                            </td>
                            <td className="p-1">
                              <input 
                                className="w-full bg-transparent border border-transparent hover:border-gray-700 focus:border-indigo-500 rounded p-1.5 outline-none"
                                value={row.meaning}
                                onChange={(e) => updateManualRow(row.id, 'meaning', e.target.value)}
                                placeholder="Nghĩa"
                              />
                            </td>
                            <td className="p-1 text-center">
                              <button 
                                onClick={() => removeManualRow(row.id)}
                                className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-gray-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button 
                    onClick={addManualRow}
                    className="w-full py-2 border border-dashed border-gray-700 rounded-lg text-sm text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Thêm dòng
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Column Configuration */}
          <div className="w-full md:w-80 bg-gray-900/50 p-5 shrink-0 flex flex-col">
            <h3 className="text-sm font-semibold text-white mb-2">Cấu hình Cột PDF</h3>
            <p className="text-xs text-gray-400 mb-4">
              Kéo thả để sắp xếp. Cột "STT" luôn tự động ở đầu. Bỏ chọn các ô nếu muốn chừa khoảng trống cho luyện viết.
            </p>
            
            <div className="flex-1">
              <DraggableColumnList columns={columns} onColumnsChange={setColumns} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex justify-end gap-3 bg-gray-950">
          <button 
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-lg disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            {isExporting ? 'Đang tạo PDF...' : 'Bắt đầu xuất PDF'}
          </button>
        </div>
        
      </div>
    </div>
  );
};
