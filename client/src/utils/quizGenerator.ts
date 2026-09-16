import { allVocabularyData } from '../data';
import type { QuizConfig, QuestionType } from '../types/quiz';

const QUESTION_TYPES: QuestionType[] = [
  "vi_to_hiragana",
  "vi_to_kanji",
  "kanji_to_hiragana",
  "kanji_to_vi",
  "hiragana_to_kanji",
  "hiragana_to_vi"
];

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  const result = [...array];
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [result[currentIndex], result[randomIndex]] = [result[randomIndex], result[currentIndex]];
  }
  return result;
}

export function generateQuizSession(config: QuizConfig, starredWords: number[], wrongWords: number[]) {
  const {
    level,
    unitId,
    source,
    wordType,
    rangeType,
    questionCount,
    customRange,
    shuffleQuestions,
    shuffleAnswers
  } = config;

  let unitData;
  if (config.isCustom && config.customData && config.customData.length > 0) {
    unitData = config.customData.map((w: any, index: number) => ({
      ...w,
      id: w.id || (Date.now() + index)
    }));
  } else {
    const levelKey = level.toLowerCase();
    unitData = allVocabularyData[levelKey]?.[unitId.toString()];
  }

  if (!unitData || unitData.length === 0) {
    throw new Error(`Không có dữ liệu từ vựng để tạo bài kiểm tra.`);
  }

  // Bước 1: Lấy danh sách từ vựng gốc
  let words = [...unitData];

  // Lọc theo Nguồn (Đã lưu / Làm sai)
  if (!config.isCustom) {
    if (source === 'starred') {
      words = words.filter(w => starredWords.includes(w.id));
    } else if (source === 'wrong') {
      words = words.filter(w => wrongWords.includes(w.id));
    }
  }

  // Lọc theo Từ loại (wordType)
  if (wordType && wordType !== 'all') {
    words = words.filter(w => {
      if (!w.wordType) return false;
      if (wordType === 'Khác') {
        return !['Danh từ', 'Động từ', 'Tính từ -na', 'Tính từ -i', 'Trạng từ', 'Đại từ', 'Liên từ', 'Trợ từ'].includes(w.wordType);
      }
      return w.wordType === wordType;
    });
  }

  if (words.length === 0) {
    throw new Error('Không có từ vựng nào phù hợp với bộ lọc hiện tại.');
  }

  // Bước 2: Xử lý theo Phạm vi (Cố định / Tùy chỉnh)
  if (rangeType === 'fixed') {
    if (questionCount === 'all') {
      if (shuffleQuestions) {
        words = shuffle(words);
      }
    } else if (typeof questionCount === 'number') {
      // Luôn xáo trộn toàn bộ mảng gốc trước khi lấy cố định số lượng
      words = shuffle(words);
      words = words.slice(0, questionCount);
    }
  } else if (rangeType === 'custom' && customRange) {
    // Cắt theo STT (giữ nguyên tính tuần tự)
    const startIdx = Math.max(0, customRange.start - 1);
    const endIdx = customRange.end;
    words = words.slice(startIdx, endIdx);
    
    if (shuffleQuestions) {
      words = shuffle(words);
    }
  }

  // Bước 3: Đóng gói thành Question Format
  const sessionQuestions = words.map((word, index) => {
    const type = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
    
    // Select 3 random other words for wrong answers
    const otherWords = shuffle(unitData.filter(w => w.id !== word.id)).slice(0, 3);
    let allOptions = [word, ...otherWords];
    
    if (shuffleAnswers) {
      allOptions = shuffle(allOptions);
    }
    
    let questionText = '';
    let hint: any = {};
    
    const mapOptionText = (w: typeof word, t: string) => {
      switch(t) {
        case 'vi_to_hiragana': return w.hiragana || w.kanji || w.meaning;
        case 'vi_to_kanji': return w.kanji || w.hiragana || w.meaning;
        case 'kanji_to_hiragana': return w.hiragana || w.kanji || w.meaning;
        case 'kanji_to_vi': return w.meaning || w.hiragana || w.kanji;
        case 'hiragana_to_kanji': return w.kanji || w.hiragana || w.meaning;
        case 'hiragana_to_vi': return w.meaning || w.hiragana || w.kanji;
        default: return w.meaning || w.kanji || w.hiragana;
      }
    };

    switch (type) {
      case 'vi_to_hiragana':
        questionText = word.meaning || word.kanji;
        hint = { kanji: word.kanji, meaning: word.meaning };
        break;
      case 'vi_to_kanji':
        questionText = word.meaning || word.hiragana;
        hint = { hiragana: word.hiragana, meaning: word.meaning };
        break;
      case 'kanji_to_hiragana':
        questionText = word.kanji || word.meaning;
        hint = { meaning: word.meaning };
        break;
      case 'kanji_to_vi':
        questionText = word.kanji || word.hiragana;
        hint = { hiragana: word.hiragana };
        break;
      case 'hiragana_to_kanji':
        questionText = word.hiragana || word.meaning;
        hint = { meaning: word.meaning };
        break;
      case 'hiragana_to_vi':
        questionText = word.hiragana || word.kanji;
        hint = { kanji: word.kanji };
        break;
    }

    let correctAnswerId = '';
    const answers = allOptions.map((opt, i) => {
      const id = String.fromCharCode(65 + i); // A, B, C, D
      const text = mapOptionText(opt, type);
      if (opt.id === word.id) correctAnswerId = id;
      return { id, text };
    });

    const qId = `Q-${Date.now()}-${index}`;

    return {
      id: qId,
      wordId: word.id,
      type,
      question: questionText,
      answers,
      answerData: {
        questionId: qId,
        correctAnswerId,
        kanji: word.kanji,
        hanViet: word.hanViet,
        hiragana: word.hiragana,
        meaning: word.meaning,
        wordType: word.wordType,
        hint,
        explanation: `${word.kanji}（${word.hiragana}）= ${word.meaning}`
      }
    };
  });

  return sessionQuestions;
}
