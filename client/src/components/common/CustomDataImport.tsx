import React, { useState } from 'react';
import { Copy, Check, Download } from 'lucide-react';

interface CustomDataImportProps {
  onDataImported: (parsedData: any[]) => void;
}

export const CustomDataImport: React.FC<CustomDataImportProps> = ({ onDataImported }) => {
  const [aiText, setAiText] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const promptText = `Hãy trích xuất và chuẩn hóa danh sách từ vựng tiếng Nhật lộn xộn dưới đây thành một mảng JSON.\nCấu trúc bắt buộc: [{"kanji": "", "hiragana": "", "hanViet": "", "meaning": "", "wordType": ""}].\nNếu không có Kanji thì để rỗng. Chỉ trả về duy nhất mảng JSON, không giải thích.\nDữ liệu của tôi: [DÁN TỪ VỰNG VÀO ĐÂY]`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleImport = () => {
    setError('');
    setSuccess('');
    
    if (!aiText.trim()) return;

    try {
      const parsedData = JSON.parse(aiText);
      if (!Array.isArray(parsedData)) {
        throw new Error("Dữ liệu không phải là mảng JSON.");
      }
      
      onDataImported(parsedData);
      setSuccess('Nhập dữ liệu thành công!');
      setAiText('');
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error("Lỗi parse JSON:", err);
      setError('Dữ liệu JSON không hợp lệ, vui lòng kiểm tra lại!');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Box Hướng dẫn */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Hướng dẫn nhập dữ liệu thông minh</h3>
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 text-[13px] leading-relaxed text-gray-600 dark:text-gray-300 font-mono relative pr-12 whitespace-pre-wrap">
          {promptText}
          <button 
            onClick={handleCopyPrompt}
            className="absolute top-2 right-2 px-2 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md transition-colors flex items-center justify-center min-w-[40px] h-[32px] gap-1 text-xs font-medium"
            title="Copy Prompt"
          >
            {isCopied ? (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Check className="w-3.5 h-3.5" /> Đã copy!
              </span>
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Box Nhập JSON */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <textarea
          rows={6}
          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm text-gray-900 dark:text-gray-100 focus:border-indigo-500 outline-none resize-none placeholder-gray-400 dark:placeholder-gray-500 font-mono"
          placeholder="Sau khi AI trả kết quả, hãy copy và dán đoạn mã JSON vào đây..."
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
        />
        
        {/* Messages */}
        {error && <p className="text-sm text-red-500 dark:text-red-400 mt-2">{error}</p>}
        {success && <p className="text-sm text-green-600 dark:text-green-400 mt-2">{success}</p>}
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleImport}
            disabled={!aiText.trim()}
            className="flex items-center gap-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Download className="w-4 h-4" /> Nhập dữ liệu
          </button>
        </div>
      </div>
    </div>
  );
};
