import React, { useState, useRef } from 'react';
import { FileDown, Settings } from 'lucide-react';
import { DraggableColumnList, type ColumnOption } from '../DraggableColumnList';
import { CustomDataImport } from '../../common/CustomDataImport';
import { createPortal } from 'react-dom';
import { VocabularyPdfBuilder } from './VocabularyPdfBuilder';
import { UNIT_DATA } from '../../../data/unitData';
import { allVocabularyData } from '../../../data/index';
import { useUserProgress } from '../../../hooks/useUserProgress';
import { FontManager } from '../../../utils/fontManager';
import type { JLPTLevel, QuizSource, QuizRangeType } from '../../../types/quiz';

const DEFAULT_COLUMNS: ColumnOption[] = [
  { id: 'kanji', label: 'Kanji', showContent: false },
  { id: 'hanviet', label: 'Âm Hán Việt', showContent: false },
  { id: 'hiragana', label: 'Hiragana', showContent: false },
  { id: 'meaning', label: 'Nghĩa', showContent: false }
];

export const VocabularyPdfWorkspace: React.FC = () => {
  const { progress } = useUserProgress();
  const [columns, setColumns] = useState<ColumnOption[]>(DEFAULT_COLUMNS);
  const [isExporting, setIsExporting] = useState(false);
  const [exportWords, setExportWords] = useState<any[]>([]);
  const isExportingRef = useRef(false); // Export lock

  // Tab 1: System Selection
  const [tab, setTab] = useState<'system' | 'custom'>('system');
  const [level, setLevel] = useState<JLPTLevel>('N3');
  const [unitId, setUnitId] = useState<number>(1);
  const [source, setSource] = useState<QuizSource>('all');
  const [rangeType, setRangeType] = useState<QuizRangeType>('fixed');
  const [customRange, setCustomRange] = useState({ start: 1, end: 20 });

  const activeUnits = UNIT_DATA[level] || UNIT_DATA['N3'];

  const [manualWords, setManualWords] = useState<any[]>([]);

  const handleLevelChange = (newLevel: JLPTLevel) => {
    const defaultUnitId = UNIT_DATA[newLevel]?.[0]?.id || 1;
    setLevel(newLevel);
    setUnitId(defaultUnitId);
  };

  const handleExport = async () => {
    if (!columns.some(col => col.showContent)) {
      alert("Vui lòng tích chọn hiển thị nội dung cho ít nhất 1 cột trước khi xuất PDF.");
      return;
    }

    // Export lock: ngăn chạy song song
    if (isExportingRef.current) return;
    isExportingRef.current = true;
    setIsExporting(true);

    try {
      // Đảm bảo font sẵn sàng
      await FontManager.ensureReady();

      let exportWordsArr: any[] = [];

      if (tab === 'system') {
        const targetWordIds = source === 'starred'
          ? progress.starredWords
          : source === 'wrong'
            ? Object.keys(progress.wrongWords).map(Number)
            : [];

        const levelKey = level.toLowerCase();
        const unitDataObj = allVocabularyData[levelKey as keyof typeof allVocabularyData];

        if (!unitDataObj || !(unitDataObj as any)[unitId.toString()]) {
          throw new Error(`Dữ liệu cho ${level} - Unit ${unitId} chưa được nạp sẵn offline.`);
        }

        let words = (unitDataObj as any)[unitId.toString()];

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

        exportWordsArr = words.map((w: any) => ({
          id: w.id.toString(),
          kanji: w.kanji || '',
          hanViet: w.hanViet || '',
          hiragana: w.hiragana || '',
          meaning: w.meaning || ''
        }));
      } else {
        exportWordsArr = manualWords.filter(w => w.kanji || w.hiragana || w.meaning);
        if (exportWordsArr.length === 0) throw new Error('Vui lòng thêm ít nhất một từ vựng.');

        exportWordsArr = exportWordsArr.map(w => ({
          ...w,
          hanViet: w.hanviet
        }));
      }

      setExportWords(exportWordsArr);

      // Chờ DOM render xong (1 frame) rồi print
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });

      window.print();
    } catch (error: any) {
      console.error('Lỗi khi xuất PDF:', error);
      alert(error.message || 'Có lỗi xảy ra khi xuất PDF. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
      isExportingRef.current = false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-12">
      {/* Nguồn dữ liệu */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Nguồn dữ liệu</h3>
        
        <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl mb-6">
          <button
            onClick={() => setTab('system')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${tab === 'system' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            Hệ thống
          </button>
          <button
            onClick={() => setTab('custom')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${tab === 'custom' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            Tùy chỉnh
          </button>
        </div>

        {tab === 'system' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Trình độ</label>
                <select
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  value={level}
                  onChange={(e) => handleLevelChange(e.target.value as JLPTLevel)}
                >
                  {['N5', 'N4', 'N3', 'N2', 'N1'].map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bài học</label>
                <select
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  value={unitId}
                  onChange={(e) => setUnitId(Number(e.target.value))}
                >
                  {activeUnits.map((unit: any) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phạm vi từ vựng</label>
              <select
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                value={source}
                onChange={(e) => setSource(e.target.value as QuizSource)}
              >
                <option value="all">Tất cả từ vựng trong Unit</option>
                <option value="starred">Chỉ từ đã lưu (★)</option>
                <option value="wrong">Từ làm sai</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">STT (Bắt đầu - Kết thúc)</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <select
                  className="w-full sm:w-1/3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  value={rangeType}
                  onChange={(e) => setRangeType(e.target.value as QuizRangeType)}
                >
                  <option value="fixed">Tất cả</option>
                  <option value="custom">Tùy chỉnh</option>
                </select>

                {rangeType === 'custom' && (
                  <div className="flex items-center gap-3 w-full sm:w-2/3">
                    <input
                      type="number"
                      min="1"
                      className="w-1/2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl p-3 text-center outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                      value={customRange.start}
                      onChange={(e) => setCustomRange({ ...customRange, start: parseInt(e.target.value) || 1 })}
                    />
                    <span className="text-gray-400 font-bold">-</span>
                    <input
                      type="number"
                      min="1"
                      className="w-1/2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl p-3 text-center outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                      value={customRange.end}
                      onChange={(e) => setCustomRange({ ...customRange, end: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            <CustomDataImport onDataImported={(data) => setManualWords(data)} />
            {manualWords.length > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-sm text-green-700 dark:text-green-400 font-bold">✅ Đã tải {manualWords.length} từ vựng</span>
                <button onClick={() => setManualWords([])} className="text-sm font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">Xóa dữ liệu</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cấu hình Cột */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cấu hình cột</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
          Kéo thả để sắp xếp vị trí các cột. Bỏ chọn nội dung nếu muốn chừa khoảng trống cho luyện viết.
        </p>
        <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-700">
          <DraggableColumnList columns={columns} onColumnsChange={setColumns} />
        </div>
      </div>

      {/* Cài đặt PDF */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-blue-500" />
          Cài đặt xuất PDF
        </h3>
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          (Sử dụng cấu hình mặc định của hệ thống)
        </div>
      </div>

      {/* Nút Xuất PDF */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-gray-900 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
      >
        <FileDown className="w-6 h-6" />
        {isExporting ? '⏳ Đang tạo PDF...' : 'Xuất PDF'}
      </button>

      {/* Hidden Print Container via Portal */}
      {createPortal(
        <VocabularyPdfBuilder 
          words={exportWords} 
          columns={columns} 
          isGenerating={true} 
        />,
        document.body
      )}
    </div>
  );
};
