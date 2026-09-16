import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const QUESTION_TYPES = [
  "vi_to_hiragana",
  "vi_to_kanji",
  "kanji_to_hiragana",
  "kanji_to_vi",
  "hiragana_to_kanji",
  "hiragana_to_vi"
] as const;

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // S?a l?i TS2322: Th�m to�n t? ! d? kh?ng d?nh gi� tr? kh�ng undefined
    [array[currentIndex], array[randomIndex]] = [array[randomIndex]!, array[currentIndex]!];
  }
  return array;
}

app.post('/api/quiz/session', async (req, res) => {
  try {
    const { 
      unitId, 
      source = 'all', 
      targetWordIds = [], 
      rangeType = 'fixed', 
      count = 'all', 
      customRange, 
      types = ['all'], 
      shuffleQuestions = true, 
      shuffleAnswers = true 
    } = req.body;
    
    // Default to Unit 1 if not provided for now
    const targetUnitId = unitId === 'all' ? undefined : (unitId || 1);

    // Bước 1: Lấy danh sách từ vựng gốc (Sắp xếp theo id/stt)
    // S?a l?i TS2379: Kh�ng truy?n tr?c ti?p undefined v�o where
    const queryArgs: any = { orderBy: { id: 'asc' } };
    if (targetUnitId) queryArgs.where = { unitId: targetUnitId };
    let words = await prisma.word.findMany(queryArgs);

    if (words.length === 0) {
      res.status(404).json({ error: 'No words found for this unit.' });
      return;
    }

    // Lọc theo Nguồn (Đã lưu / Làm sai)
    if (source !== 'all') {
      // Vì hiện tại localStorage lưu ở frontend, ta tạm filter qua targetWordIds truyền lên
      // Mặc định nếu chưa tích hợp, nó sẽ lấy tất cả.
      if (targetWordIds.length > 0) {
        words = words.filter(w => targetWordIds.includes(w.id));
      }
    }

    // Bước 2: Xử lý theo Phạm vi (Cố định / Tùy chỉnh)
    if (rangeType === 'fixed') {
      if (count === 'all') {
        // Nhánh Cố định -> Tất cả: Chỉ xáo trộn nếu bật toggle
        if (shuffleQuestions) {
          words = shuffle(words);
        }
      } else if (typeof count === 'number') {
        // Nhánh Cố định -> 10, 20, 50: Luôn xáo trộn mảng gốc rồi mới cắt lấy ngẫu nhiên
        words = shuffle(words);
        words = words.slice(0, count);
      }
    } else if (rangeType === 'custom' && customRange) {
      // Nhánh Tùy chỉnh: Cắt mảng theo khoảng STT trước
      const startIdx = Math.max(0, customRange.start - 1);
      const endIdx = customRange.end;
      words = words.slice(startIdx, endIdx);
      
      // Sau đó mới kiểm tra toggle xáo trộn
      if (shuffleQuestions) {
        words = shuffle(words);
      }
    }

    const availableTypes = types.includes('all') ? QUESTION_TYPES : types;

    const sessionQuestions = words.map((word, index) => {
      const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      
      // Select 3 random other words for wrong answers
      const otherWords = shuffle(words.filter(w => w.id !== word.id)).slice(0, 3);
      let allOptions = [word, ...otherWords];
      
      if (shuffleAnswers) {
        allOptions = shuffle(allOptions);
      }
      
      let questionText = '';
      let hint: any = {};
      
      const mapOptionText = (w: typeof word, t: string) => {
        switch(t) {
          case 'vi_to_hiragana': return w.hiragana;
          case 'vi_to_kanji': return w.kanji;
          case 'kanji_to_hiragana': return w.hiragana;
          case 'kanji_to_vi': return w.meaning;
          case 'hiragana_to_kanji': return w.kanji;
          case 'hiragana_to_vi': return w.meaning;
          default: return w.meaning;
        }
      };

      switch (type) {
        case 'vi_to_hiragana':
          questionText = word.meaning;
          hint = { kanji: word.kanji, meaning: word.meaning };
          break;
        case 'vi_to_kanji':
          questionText = word.meaning;
          hint = { hiragana: word.hiragana, meaning: word.meaning };
          break;
        case 'kanji_to_hiragana':
          questionText = word.kanji;
          hint = { meaning: word.meaning };
          break;
        case 'kanji_to_vi':
          questionText = word.kanji;
          hint = { hiragana: word.hiragana };
          break;
        case 'hiragana_to_kanji':
          questionText = word.hiragana;
          hint = { meaning: word.meaning };
          break;
        case 'hiragana_to_vi':
          questionText = word.hiragana;
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

    res.json(sessionQuestions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate quiz session' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

