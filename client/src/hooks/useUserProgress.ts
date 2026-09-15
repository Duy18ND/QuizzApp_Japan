import { useState, useEffect } from 'react';
import type { UserProgress } from '../types/quiz';

const STORAGE_KEY = 'nihonmaster_user_progress';

const defaultProgress: UserProgress = {
  starredWords: [],
  wrongWords: {}
};

export const useUserProgress = () => {
  const [progress, setProgress] = useState<UserProgress>(() => {
    try {
      const item = window.localStorage.getItem(STORAGE_KEY);
      return item ? JSON.parse(item) : defaultProgress;
    } catch (error) {
      console.warn("Error reading localStorage", error);
      return defaultProgress;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.warn("Error setting localStorage", error);
    }
  }, [progress]);

  const toggleStar = (wordId: number) => {
    setProgress(prev => {
      const isStarred = prev.starredWords.includes(wordId);
      const newStarredWords = isStarred
        ? prev.starredWords.filter(id => id !== wordId)
        : [...prev.starredWords, wordId];
      
      return {
        ...prev,
        starredWords: newStarredWords
      };
    });
  };

  const addWrongWord = (wordId: number) => {
    setProgress(prev => {
      const currentCount = prev.wrongWords[wordId] || 0;
      return {
        ...prev,
        wrongWords: {
          ...prev.wrongWords,
          [wordId]: currentCount + 1
        }
      };
    });
  };

  return {
    progress,
    toggleStar,
    addWrongWord
  };
};
