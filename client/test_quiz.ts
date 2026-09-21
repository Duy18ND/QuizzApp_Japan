import { generateQuizSession } from './src/utils/quizGenerator';

const customData = [
  {
    "id": "V001",
    "kanji": "男性",
    "hiragana": "だんせい",
    "hanViet": "NAM TÍNH",
    "meaning": "đàn ông, nam giới",
    "wordType": "Danh từ",
    "quiz": [
      {
        "type": "vi_to_kanji",
        "question": "「đàn ông, nam giới」に合う漢字はどれですか。",
        "options": ["男性", "年上", "思い出", "故郷"],
        "answer": 0
      },
      {
        "type": "vi_to_hiragana",
        "question": "「đàn ông, nam giới」の読み方はどれですか。",
        "options": ["だんせい", "たいがく", "しゅうしょく", "ちゅうもん"],
        "answer": 0
      },
      {
        "type": "kanji_to_vietnamese",
        "question": "「男性」の意味はどれですか。",
        "options": ["mối quan hệ", "hứng thú", "sắp xếp, dọn dẹp", "đàn ông, nam giới"],
        "answer": 3
      },
      {
        "type": "hiragana_to_vietnamese",
        "question": "「だんせい」の意味はどれですか。",
        "options": ["đàn ông, nam giới", "sinh hoạt, cuộc sống", "chuẩn bị", "tiền bối, người đi trước"],
        "answer": 0
      }
    ]
  }
];

// Duplicate to 60
const customWords = Array(60).fill(null).map((_, i) => ({ ...customData[0], id: `V${i}` }));

const config = {
    level: 'N3',
    unitId: 1,
    source: 'all',
    wordType: 'all',
    rangeType: 'fixed',
    questionCount: 'all',
    customRange: { start: 1, end: 60 },
    shuffleQuestions: true,
    shuffleAnswers: true,
    showHanVietHint: true,
    questionType: 'all',
    isCustom: true,
    customData: customWords
};

const questions = generateQuizSession(config as any, [], []);
console.log(`Generated ${questions.length} questions`);
