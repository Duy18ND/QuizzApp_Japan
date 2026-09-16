import React, { useState } from 'react';
import { X, FileDown, Sparkles, Plus, Trash2, Copy, Check, Download, Info } from 'lucide-react';
import { DraggableColumnList, type ColumnOption } from './DraggableColumnList';
import { exportToPDF } from '../../utils/pdfExport';
import { UNIT_DATA } from '../../data/unitData';
import { allVocabularyData } from '../../data/index';
import { useUserProgress } from '../../hooks/useUserProgress';
import type { JLPTLevel, QuizSource, QuizRangeType } from '../../types/quiz';

export interface ExportPDFModalProps {
  onClose: () => void;
}

const DEFAULT_COLUMNS: ColumnOption[] = [
  { id: 'kanji', label: 'Kanji', showContent: false },
  { id: 'hanviet', label: 'Âm Hán Việt', showContent: false },
  { id: 'hiragana', label: 'Hiragana', showContent: false },
  { id: 'meaning', label: 'Nghĩa', showContent: false }
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
  const [aiText, setAiText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [manualWords, setManualWords] = useState<any[]>([]);

  const handleLevelChange = (newLevel: JLPTLevel) => {
    const defaultUnitId = UNIT_DATA[newLevel]?.[0]?.id || 1;
    setLevel(newLevel);
    setUnitId(defaultUnitId);
  };

  const handleImportJSON = () => {
    if (!aiText.trim()) return;

    try {
      const parsedData = JSON.parse(aiText);
      if (!Array.isArray(parsedData)) {
        throw new Error("Dữ liệu không phải là mảng JSON.");
      }

      const formattedWords = parsedData.map((w: any) => ({
        id: Date.now().toString() + Math.random().toString(),
        kanji: w.kanji || '',
        hanviet: w.hanViet || w.hanviet || '',
        hiragana: w.hiragana || '',
        meaning: w.meaning || ''
      }));

      setManualWords(prev => {
        const filtered = prev.filter(w => w.kanji || w.hiragana || w.meaning);
        return [...filtered, ...formattedWords];
      });

      setAiText('');
    } catch (error: any) {
      console.error("Lỗi parse JSON:", error);
      alert("Dữ liệu JSON không hợp lệ, vui lòng kiểm tra lại kết quả từ AI.");
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
    if (!columns.some(col => col.showContent)) {
      alert("Vui lòng tích chọn hiển thị nội dung cho ít nhất 1 cột trước khi xuất PDF.");
      return;
    }

    setIsExporting(true);
    try {
      let exportWords: any[] = [];

      if (tab === 'system') {
        const targetWordIds = source === 'starred'
          ? progress.starredWords
          : source === 'wrong'
            ? Object.keys(progress.wrongWords).map(Number)
            : [];

        const levelKey = level.toLowerCase();
        const unitDataObj = allVocabularyData[levelKey];

        if (!unitDataObj || !unitDataObj[unitId.toString()]) {
          throw new Error(`Dữ liệu cho ${level} - Unit ${unitId} chưa được nạp sẵn offline.`);
        }

        let words = unitDataObj[unitId.toString()];

        if (source !== 'all') {
          if (targetWordIds.length > 0) {
            words = words.filter((w: any) => targetWordIds.includes(w.id));
          } else {
            words = [];
          }
        }

        if (rangeType === 'custom') {
          const startIdx = Math.max(0, customRange.start - 1);
          const endIdx = customRange.end;
          words = words.slice(startIdx, endIdx);
        }

        exportWords = words.map((w: any) => ({
          id: w.id.toString(),
          kanji: w.kanji || '',
          hanViet: w.hanViet || '',
          hiragana: w.hiragana || '',
          meaning: w.meaning || ''
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
                  <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-indigo-300 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Nhập dữ liệu bằng AI (Thủ công)
                      </label>
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* Step 1 */}
                      <div className="bg-gray-900/50 p-3.5 rounded-lg border border-gray-800 relative">
                        <h4 className="text-xs font-semibold text-gray-300 mb-2">Bước 1: Lấy dữ liệu chuẩn hóa từ AI</h4>
                        <div className="bg-gray-950 p-3 rounded border border-gray-800 text-[12px] leading-relaxed text-gray-400 font-mono relative pr-12">
                          {'Hãy trích xuất và chuẩn hóa danh sách từ vựng tiếng Nhật lộn xộn dưới đây thành một mảng JSON với định dạng chính xác như sau: [{"kanji": "", "hanViet": "", "hiragana": "", "meaning": ""}]. Nếu từ nào không có Kanji, hãy để trống "". Chỉ trả về duy nhất mảng JSON, không giải thích thêm. \n\nDữ liệu của tôi: [DÁN TỪ VỰNG LỘN XỘN CỦA BẠN VÀO ĐÂY]'}

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`Hãy trích xuất và chuẩn hóa danh sách từ vựng tiếng Nhật lộn xộn dưới đây thành một mảng JSON với định dạng chính xác như sau: [{"kanji": "", "hanViet": "", "hiragana": "", "meaning": ""}]. Nếu từ nào không có Kanji, hãy để trống "". Chỉ trả về duy nhất mảng JSON, không giải thích thêm. \n\nDữ liệu của tôi: [DÁN TỪ VỰNG LỘN XỘN CỦA BẠN VÀO ĐÂY]`);
                              setIsCopied(true);
                              setTimeout(() => setIsCopied(false), 2000);
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
                            title="Copy Prompt"
                          >
                            {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-indigo-300/80 mt-2 italic flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5" /> (Hãy dán dòng này vào ChatGPT hoặc Gemini, sau đó copy kết quả JSON nhận được)
                        </p>
                      </div>

                      {/* Step 2 */}
                      <div className="bg-gray-900/50 p-3.5 rounded-lg border border-gray-800">
                        <h4 className="text-xs font-semibold text-gray-300 mb-2">Bước 2: Dán kết quả JSON vào đây</h4>
                        <textarea
                          className="w-full h-24 bg-gray-950 border border-indigo-500/30 rounded-lg p-3 text-sm text-gray-200 focus:border-indigo-500 outline-none resize-none placeholder-gray-500 font-mono"
                          placeholder="Dán đoạn mã JSON mà AI đã trả về vào đây..."
                          value={aiText}
                          onChange={(e) => setAiText(e.target.value)}
                        />
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={handleImportJSON}
                            disabled={!aiText.trim()}
                            className="flex items-center gap-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Download className="w-4 h-4" /> ⬇️ Nhập dữ liệu
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>



                  {/* Manual Grid */}
                  {manualWords.length > 0 && (
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
                  )}
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
