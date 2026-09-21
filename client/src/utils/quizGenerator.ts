import { allVocabularyData } from '../data';
import type { QuizConfig, QuestionType } from '../types/quiz';

const QUESTION_TYPES: QuestionType[] = [
  "vi_to_hiragana",
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
    shuffleAnswers,
    customData
  } = config;

  // 1. Lấy dữ liệu gốc
  let unitData: any[] = [];
  if (config.isCustom && customData && customData.length > 0) {
    unitData = customData.map((w: any, index: number) => ({
      ...w,
      id: w.id || `C-${Date.now()}-${index}`
    }));
  } else {
    const levelKey = level.toLowerCase();
    unitData = allVocabularyData[levelKey]?.[unitId.toString()] || [];
  }

  if (!unitData || unitData.length === 0) {
    throw new Error(`Không có dữ liệu từ vựng để tạo bài kiểm tra.`);
  }

  // 2. Lọc danh sách từ vựng gốc (Nguồn, Từ loại)
  let words = [...unitData];

  if (!config.isCustom) {
    if (source === 'starred') {
      words = words.filter(w => starredWords.includes(w.id));
    } else if (source === 'wrong') {
      words = words.filter(w => wrongWords.includes(w.id));
    }
  }

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

  // 3. Xử lý Custom Range cho Vocabulary (nếu có)
  if (rangeType === 'custom' && customRange) {
    const startIdx = Math.max(0, customRange.start - 1);
    const endIdx = customRange.end;
    words = words.slice(startIdx, endIdx);
  }

  // 4. Sinh Pool Câu Hỏi
  let poolOfQuestions: any[] = [];
  const allowedTypes = (config.questionType && config.questionType !== 'all') 
    ? [config.questionType as QuestionType] 
    : QUESTION_TYPES;

  words.forEach((word) => {
    // Nếu trong word đã có thuộc tính quiz[] (import từ file JSON có sẵn quiz)
    if (word.quiz && Array.isArray(word.quiz) && word.quiz.length > 0) {
      const filteredQuizzes = word.quiz.filter((q: any) => 
        !config.questionType || config.questionType === 'all' || q.type === config.questionType
      );
      poolOfQuestions.push(...filteredQuizzes.map((q: any) => ({ ...q, word })));
    } else {
      // Tự sinh dựa trên allowedTypes
      allowedTypes.forEach(type => {
        poolOfQuestions.push({ type, word, isGenerated: true });
      });
    }
  });

  if (poolOfQuestions.length === 0) {
    throw new Error('Không có câu hỏi nào được tạo ra. Vui lòng kiểm tra lại bộ lọc.');
  }

  // 5. Xử lý Fixed Range & Shuffle
  if (shuffleQuestions) {
    poolOfQuestions = shuffle(poolOfQuestions);
  }

  if (rangeType === 'fixed' && typeof questionCount === 'number') {
    poolOfQuestions = poolOfQuestions.slice(0, questionCount);
  }

  // 6. Map to Final Question Format
  return poolOfQuestions.map((qObj, index) => {
    const word = qObj.word;
    const type = qObj.type as QuestionType;
    
    let answers: { id: string; text: string }[] = [];
    let correctAnswerId = "A";
    let hint: any = {};
    let questionText = '';

    const mapOptionText = (w: any, t: string) => {
      switch(t) {
        case 'vi_to_hiragana': return w.hiragana || w.kanji || w.meaning;
        case 'kanji_to_hiragana': return w.hiragana || w.kanji || w.meaning;
        case 'kanji_to_vi': return w.meaning || w.hiragana || w.kanji;
        case 'hiragana_to_kanji': return w.kanji || w.hiragana || w.meaning;
        case 'hiragana_to_vi': return w.meaning || w.hiragana || w.kanji;
        default: return w.meaning || w.kanji || w.hiragana;
      }
    };

    // Nếu câu hỏi được định nghĩa sẵn trong JSON (có mảng options)
    if (qObj.options && Array.isArray(qObj.options)) {
      questionText = qObj.question || '';
      answers = qObj.options.map((optText: string, i: number) => {
        const id = String.fromCharCode(65 + i); // A, B, C, D
        if (qObj.answer === i || qObj.answer === id || qObj.answer === i + 1 || qObj.answer === optText) {
            correctAnswerId = id;
        }
        return { id, text: optText };
      });
      if (shuffleAnswers) {
        const correctAnsObj = answers.find(a => a.id === correctAnswerId);
        answers = shuffle(answers);
        answers = answers.map((a, i) => {
            const newId = String.fromCharCode(65 + i);
            if (correctAnsObj && a.text === correctAnsObj.text) {
              correctAnswerId = newId;
            }
            return { id: newId, text: a.text };
        });
      }
    } else {
      // Sinh câu hỏi tự động
      switch (type) {
        case 'vi_to_hiragana':
          questionText = word.meaning || word.kanji;
          hint = { kanji: word.kanji, meaning: word.meaning };
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

      // Tạo random options
      const otherWords = shuffle(unitData.filter((w: any) => w.id !== word.id)).slice(0, 3);
      let allOptions = [word, ...otherWords];
      if (shuffleAnswers) {
        allOptions = shuffle(allOptions);
      }
      
      answers = allOptions.map((opt, i) => {
        const id = String.fromCharCode(65 + i);
        const text = mapOptionText(opt, type);
        if (opt.id === word.id) correctAnswerId = id;
        return { id, text };
      });
    }

    // Fix hints if not generated automatically above
    if (qObj.options) {
      switch (type as string) {
        case 'vi_to_hiragana': hint = { kanji: word.kanji, meaning: word.meaning }; break;
        case 'vi_to_kanji': hint = { hiragana: word.hiragana, meaning: word.meaning }; break;
        case 'kanji_to_hiragana': hint = { meaning: word.meaning }; break;
        case 'kanji_to_vi':
        case 'kanji_to_vietnamese': hint = { hiragana: word.hiragana }; break;
        case 'hiragana_to_kanji': hint = { meaning: word.meaning }; break;
        case 'hiragana_to_vi':
        case 'hiragana_to_vietnamese': hint = { kanji: word.kanji }; break;
      }
    }

    const qId = qObj.questionId || `Q-${Date.now()}-${index}`;

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
        explanation: `${word.kanji || ''}（${word.hiragana || ''}）= ${word.meaning || ''}`
      }
    };
  });
}
