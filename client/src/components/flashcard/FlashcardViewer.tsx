import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Shuffle, Star, Volume2, Layers, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { allVocabularyData } from '../../data';
import { useUserProgress } from '../../hooks/useUserProgress';

export const FlashcardViewer: React.FC = () => {
  const { level, unitId } = useParams<{ level: string; unitId: string }>();
  const levelKey = level?.toLowerCase() || 'n3';
  const unitKey = unitId || '1';
  
  const [words, setWords] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const { progress, toggleStar } = useUserProgress();

  // Load words
  useEffect(() => {
    if (allVocabularyData[levelKey] && allVocabularyData[levelKey][unitKey]) {
      setWords(allVocabularyData[levelKey][unitKey]);
    } else {
      setWords([]);
    }
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [levelKey, unitKey]);

  const currentWord = words[currentIndex];
  const isStarred = currentWord ? progress.starredWords.includes(currentWord.id) : false;

  const handleNext = useCallback(() => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, words.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  const handleShuffle = useCallback(() => {
    setWords(prevWords => {
      const shuffled = [...prevWords];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    setCurrentIndex(0);
    setIsFlipped(false);
  }, []);

  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel any previous speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Auto-pronounce when switching cards
  useEffect(() => {
    if (currentWord) {
      const timer = setTimeout(() => {
        speakText(currentWord.kanji || currentWord.hiragana);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentWord, speakText]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleFlip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleFlip]);

  if (!words.length) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-gray-500 dark:text-gray-400">
        Đang tải dữ liệu từ vựng...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col items-center">
      
      {/* Breadcrumb */}
      <div className="w-full flex justify-between items-center mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/flashcard" className="hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1">
            <Layers className="w-4 h-4" /> Flashcard
          </Link>
          <ChevronRightIcon className="w-4 h-4" />
          <Link to={`/flashcard/${level}`} className="hover:text-gray-900 dark:hover:text-white transition-colors">
            {level?.toUpperCase()}
          </Link>
          <ChevronRightIcon className="w-4 h-4" />
          <span className="text-blue-600 dark:text-blue-400 font-medium">Unit {unitKey}</span>
        </div>
      </div>

      {/* Flashcard Area */}
      <div className="relative w-full max-w-2xl flex-1 max-h-[500px] [perspective:1000px] mb-8 select-none">
        <div 
          className={`w-full h-full transition-transform duration-500 [transform-style:preserve-3d] cursor-pointer ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
          onClick={handleFlip}
        >
          
          {/* Front Face */}
          <div className="absolute w-full h-full [backface-visibility:hidden] bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center p-8 transition-colors">
            <div className="absolute top-6 right-6">
              <button 
                onClick={(e) => { e.stopPropagation(); speakText(currentWord.kanji || currentWord.hiragana); }}
                className="p-3 text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 bg-gray-50 dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-all"
                title="Phát âm"
              >
                <Volume2 className="w-6 h-6" />
              </button>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold text-gray-900 dark:text-white text-center break-words leading-tight">
              {currentWord.kanji || currentWord.hiragana}
            </h1>
            
            <div className="absolute bottom-6 left-0 w-full text-center text-gray-400 dark:text-gray-500 text-sm animate-pulse">
              Click hoặc bấm phím Space để lật thẻ
            </div>
          </div>

          {/* Back Face */}
          <div className="absolute w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center p-8 transition-colors">
            
            <div className="flex flex-col items-center gap-4 text-center max-w-md">
              {currentWord.kanji && (
                <div className="text-3xl md:text-4xl font-medium text-blue-500 dark:text-blue-400">
                  {currentWord.hiragana}
                </div>
              )}
              
              {currentWord.kanji && currentWord.hanviet && (
                <div className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-500 tracking-widest uppercase">
                  {currentWord.hanviet}
                </div>
              )}
              
              <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full my-2"></div>
              
              <div className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-200">
                {currentWord.meaning}
              </div>
              
              <div className="mt-4 px-4 py-1.5 bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium">
                {currentWord.wordType}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-2xl flex items-center justify-between bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 transition-colors">
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleShuffle}
            className="p-3 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all"
            title="Đảo trộn thẻ"
          >
            <Shuffle className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => toggleStar(currentWord.id)}
            className={`p-3 rounded-xl transition-all ${
              isStarred 
                ? 'text-yellow-500 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20' 
                : 'text-gray-500 hover:text-yellow-500 dark:text-gray-400 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
            }`}
            title="Lưu từ vựng"
          >
            <Star className={`w-5 h-5 ${isStarred ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="p-3 bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="font-medium text-gray-600 dark:text-gray-400 tabular-nums text-lg">
            {currentIndex + 1} <span className="text-gray-400 dark:text-gray-600 mx-1">/</span> {words.length}
          </div>

          <button 
            onClick={handleNext}
            disabled={currentIndex === words.length - 1}
            className="p-3 bg-blue-600 hover:bg-blue-500 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-blue-500/20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
      
    </div>
  );
};
