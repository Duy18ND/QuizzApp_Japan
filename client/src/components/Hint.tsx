import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

interface HintProps {
  kanji?: string;
  hiragana?: string;
  meaning?: string;
}

export const Hint: React.FC<HintProps> = ({ kanji, hiragana, meaning }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-2 relative inline-block">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-yellow-600 hover:text-yellow-500 dark:text-yellow-500 dark:hover:text-yellow-400 font-medium text-sm transition-colors bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-full"
      >
        <Lightbulb className="w-4 h-4 mr-1.5" />
        Gợi ý {isOpen ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 w-64 p-4 bg-white border border-yellow-200 shadow-xl dark:bg-gray-800 dark:border-yellow-700/50 rounded-lg text-sm space-y-2 transition-colors">
          {kanji && <div className="text-gray-900 dark:text-white"><span className="text-yellow-700 dark:text-yellow-500 font-semibold mr-2">Kanji:</span>{kanji}</div>}
          {hiragana && <div className="text-gray-900 dark:text-white"><span className="text-yellow-700 dark:text-yellow-500 font-semibold mr-2">Hiragana:</span>{hiragana}</div>}
          {meaning && <div className="text-gray-900 dark:text-white"><span className="text-yellow-700 dark:text-yellow-500 font-semibold mr-2">Nghĩa:</span>{meaning}</div>}
        </div>
      )}
    </div>
  );
};
