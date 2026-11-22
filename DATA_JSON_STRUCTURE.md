# DATA_JSON_STRUCTURE.md — Toàn bộ cấu trúc JSON & Schema thực tế của dự án

Tài liệu này trích xuất **nguyên bản (verbatim)** cấu trúc dữ liệu hiện tại từ `client/src/data/`, `client/src/types/`, `localStorage` và `supabase/schema.sql` để phục vụ thiết kế giao diện **Admin CMS**.

---

## 1. Hierarchy & File Map (Sơ đồ phân cấp & Bản đồ file dữ liệu)

```text
Nihongo 問 — Data Hierarchy
├── JLPT Levels: 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
│
├── 1. Vocabulary & Units
│   ├── client/src/data/unitData.ts          → UNIT_DATA: Record<JLPTLevel, UnitMeta[]> (6 units tổng cộng across N5..N1)
│   ├── client/src/data/index.ts             → allVocabularyData: Record<levelLower, Record<unitIdStr, VocabularyItem[]>>
│   ├── client/src/data/n3/unit1.ts          → unit1Data: VocabularyItem[] (130 từ: IDs 1..120 chuẩn + IDs 200..209 mở rộng cho Grammar Engine)
│   └── client/src/types/vocabulary.ts       → interface VocabularyItem
│
├── 2. Kanji
│   ├── client/src/data/kanji/kanjiDataset.json → KanjiItem[] (178 chữ Kanji N5/N4/N3/N2/N1, hiện 177/178 chữ có hanViet: "")
│   └── client/src/types/kanji.ts               → interface KanjiItem, KanjiExample
│
├── 3. Grammar (Books → Chapters → Rules → Sentences & Practice Bank)
│   ├── client/src/data/grammar/index.ts                         → grammarBooks: GrammarBook[] (book 'SHINKANZEN_N3' gồm 2 chương 'L01', 'L02')
│   ├── client/src/data/grammar/grammarConfig.ts                 → verbTopics: Record<string, string[]>
│   ├── client/src/data/grammar/shinkanzen-n3/lesson01.ts        → shinkanzenN3Lesson01: SmartGrammarRule[] (6 mẫu ngữ pháp Bài 1)
│   ├── client/src/data/grammar/shinkanzen-n3/lesson02.ts        → shinkanzenN3Lesson02: SmartGrammarRule[] (5 mẫu ngữ pháp Bài 2)
│   ├── client/src/data/grammar/shinkanzen-n3/lesson01Sentences.ts    → lesson01Sentences: GrammarSentence[] (câu ví dụ gốc cho L01 & L02)
│   ├── client/src/data/grammar/shinkanzen-n3/lesson01PracticeBank.ts → lesson01PracticeBank: Record<grammarId, PracticeQuestion[]> (20 câu/mẫu)
│   ├── client/src/types/grammar.ts                              → GrammarRule, PracticeQuestion union, GrammarMistake, GrammarProgress
│   └── client/src/types/grammarEngine.ts                        → GrammarBook, GrammarChapter, SmartGrammarRule, SmartGrammarTemplate
│
├── 4. JLPT Practice & Mock Exam (9 Modules)
│   ├── client/src/data/jlpt/jlptDataset.ts  → JLPT_MODULES (9 modules: kanji, vocab, grammar, star, reading-short, reading-medium, reading-long, listening, full-test)
│   │   ├── CURATED_KANJI_QUESTIONS (15 câu) + buildDatasetKanjiMcqs() (18 câu) → JLPTMcqItem[] (moduleId: 'kanji')
│   │   ├── CURATED_VOCAB_QUESTIONS (12 câu) + buildDatasetVocabMcqs() (16 câu) → JLPTMcqItem[] (moduleId: 'vocab')
│   │   ├── CURATED_GRAMMAR_QUESTIONS (12 câu) + buildBankGrammarMcqs() (22 câu) → JLPTMcqItem[] (moduleId: 'grammar')
│   │   ├── CURATED_STAR_QUESTIONS (6 câu) + buildBankStarItems() (22 câu)       → JLPTStarItem[] (module: 'star')
│   │   ├── CURATED_READING_PASSAGES (9 bài đọc: 3 short, 3 medium, 3 long)      → JLPTReadingPassage[]
│   │   ├── CURATED_LISTENING_ITEMS (6 bài hội thoại nghe N5/N4/N3)              → JLPTListeningItem[]
│   │   └── 'full-test' (tổng hợp đề thi 4 phần trong JlptFullTestView.tsx)
│
├── 5. User Progress & Mistakes (localStorage ↔ Supabase Sync)
│   ├── nihonmaster_user_progress      → client/src/hooks/useUserProgress.ts
│   ├── nihonmaster_kanji_progress     → client/src/store/slices/kanjiSlice.ts
│   ├── nihonmaster_grammar_progress   → client/src/store/slices/grammarProgressSlice.ts
│   ├── nihonmaster_grammar_mistakes   → client/src/store/slices/mistakeSlice.ts
│   └── nihonmaster_quiz_history       → client/src/services/quizHistoryService.ts
│
└── 6. Supabase PostgreSQL Schema & Migration Layer
    ├── supabase/schema.sql                        → 9 bảng PostgreSQL + RLS + Triggers
    ├── client/src/services/migrationService.ts    → Chuyển đổi dữ liệu tĩnh sang định dạng bảng Supabase
    └── client/src/services/adminCmsService.ts     → CRUD trực tiếp + Batch Import/Export + E2E Auto-Test
```

---

## 2. Exact Real JSON Samples (Mẫu JSON thực tế trích xuất nguyên bản)

### 2.1. Unit Metadata (`client/src/data/unitData.ts` & `client/src/data/index.ts`)

**Cấu trúc trong `client/src/data/unitData.ts`:**
```json
{
  "N5": [
    {
      "id": 1,
      "name": "Unit 1 (N5)",
      "totalWords": 0
    }
  ],
  "N4": [
    {
      "id": 1,
      "name": "Unit 1 (N4)",
      "totalWords": 0
    }
  ],
  "N3": [
    {
      "id": 1,
      "name": "Unit 1 (N3 - Mimi kara Oboeru)",
      "totalWords": 130
    },
    {
      "id": 2,
      "name": "Unit 2 (N3)",
      "totalWords": 0
    }
  ],
  "N2": [
    {
      "id": 1,
      "name": "Unit 1 (N2)",
      "totalWords": 0
    }
  ],
  "N1": [
    {
      "id": 1,
      "name": "Unit 1 (N1)",
      "totalWords": 0
    }
  ]
}
```

**Cấu trúc map `allVocabularyData` trong `client/src/data/index.ts`:**
```json
{
  "n3": {
    "1": [
      /* 130 phần tử VocabularyItem từ unit1Data */
    ]
  }
}
```

---

### 2.2. Vocabulary (`client/src/data/n3/unit1.ts`)

Trong `client/src/data/n3/unit1.ts` hiện có **130 bản ghi** chia làm **2 biến thể cấu trúc**:

#### Biến thể A — Các từ chuẩn Mimi kara Oboeru (IDs `1..120`, gồm 12 trường, không có `tags` và `semanticRoles`):
```json
[
  {
    "id": 1,
    "unitId": 1,
    "level": "N3",
    "wordNumber": 1,
    "kanji": "男性",
    "hiragana": "だんせい",
    "hanViet": "NAM TÍNH",
    "meaning": "đàn ông, nam giới",
    "wordType": "Danh từ",
    "exampleSentence": null,
    "exampleMeaning": null,
    "notes": null
  },
  {
    "id": 2,
    "unitId": 1,
    "level": "N3",
    "wordNumber": 2,
    "kanji": "女性",
    "hiragana": "じょせい",
    "hanViet": "NỮ TÍNH",
    "meaning": "phụ nữ, nữ giới",
    "wordType": "Danh từ",
    "exampleSentence": null,
    "exampleMeaning": null,
    "notes": null
  }
]
```

#### Biến thể B — Các từ bổ sung cho Grammar Engine (IDs `200..209`, gồm 14 trường, có thêm `tags` và `semanticRoles`):
```json
[
  {
    "id": 200,
    "unitId": 1,
    "level": "N3",
    "wordNumber": 200,
    "kanji": "食べる",
    "hiragana": "たべる",
    "hanViet": "THỰC",
    "meaning": "ăn",
    "wordType": "Động từ",
    "exampleSentence": null,
    "exampleMeaning": null,
    "notes": null,
    "tags": [
      "food",
      "task",
      "restaurant"
    ],
    "semanticRoles": [
      "task"
    ]
  },
  {
    "id": 201,
    "unitId": 1,
    "level": "N3",
    "wordNumber": 201,
    "kanji": "遊ぶ",
    "hiragana": "あそぶ",
    "hanViet": "DU",
    "meaning": "chơi",
    "wordType": "Động từ",
    "exampleSentence": null,
    "exampleMeaning": null,
    "notes": null,
    "tags": [
      "free_time"
    ],
    "semanticRoles": [
      "free_time"
    ]
  }
]
```

#### Danh sách toàn bộ giá trị `wordType` thực tế đang dùng trong `unit1.ts` (130 từ):
| Giá trị `wordType` trong `unit1.ts` | Số lượng bản ghi | Ghi chú đối chiếu với `types/quiz.ts` |
| :--- | :---: | :--- |
| `"Danh từ"` | 77 | Trong `types/quiz.ts`, union `WordType` khai báo `'noun' \| 'i_adj' \| 'na_adj' \| 'verb' \| 'vi' \| 'vt' \| 'adv' \| 'other'`, nhưng dữ liệu thực tế trong `unit1.ts` và Admin CMS dùng chuỗi tiếng Việt. |
| `"Động từ"` | 47 | Tương ứng `'verb'` |
| `"Tính từ -na"` | 5 | Tương ứng `'na_adj'` |
| `"Tính từ đuôi i"` | 1 | Tương ứng `'i_adj'` (bản ghi `id: 203` `"熱い"`, còn trong `AdminCMS` cũng hỗ trợ `"Tính từ -i"`, `"Phó từ"`, `"Liên từ"`, `"Cụm từ"`) |

---

### 2.3. Kanji (`client/src/data/kanji/kanjiDataset.json`)

File `kanjiDataset.json` chứa **178 bản ghi**. Dưới đây là 2 bản ghi đầu tiên nguyên bản:
```json
[
  {
    "id": "男",
    "kanji": "男",
    "meanings": [
      "male"
    ],
    "hanViet": "",
    "onReadings": [
      "ダン",
      "ナン"
    ],
    "kunReadings": [
      "おとこ",
      "お"
    ],
    "strokeCount": 7,
    "jlptLevel": "N5",
    "vocabularyIds": [
      1
    ],
    "examples": [
      {
        "vocabularyId": 1,
        "word": "男性",
        "hiragana": "だんせい",
        "meaning": "đàn ông, nam giới"
      }
    ]
  },
  {
    "id": "性",
    "kanji": "性",
    "meanings": [
      "sex",
      "gender",
      "nature"
    ],
    "hanViet": "",
    "onReadings": [
      "セイ",
      "ショウ"
    ],
    "kunReadings": [
      "さが"
    ],
    "strokeCount": 8,
    "jlptLevel": "N3",
    "vocabularyIds": [
      1,
      2,
      113,
      114
    ],
    "examples": [
      {
        "vocabularyId": 1,
        "word": "男性",
        "hiragana": "だんせい",
        "meaning": "đàn ông, nam giới"
      },
      {
        "vocabularyId": 2,
        "word": "女性",
        "hiragana": "じょせい",
        "meaning": "phụ nữ, nữ giới"
      },
      {
        "vocabularyId": 113,
        "word": "性格",
        "hiragana": "せいかく",
        "meaning": "tính cách"
      },
      {
        "vocabularyId": 114,
        "word": "性別",
        "hiragana": "せいべつ",
        "meaning": "giới tính"
      }
    ]
  }
]
```

---

### 2.4. Grammar Book, Chapter, Rule & Sentence Bank (`client/src/data/grammar/`)

#### A. Grammar Book & Chapter (`client/src/data/grammar/index.ts`)
```json
[
  {
    "id": "SHINKANZEN_N3",
    "title": "Shin Kanzen Master Ngữ pháp N3",
    "level": "N3",
    "chapters": [
      {
        "id": "L01",
        "bookId": "SHINKANZEN_N3",
        "chapterNumber": 1,
        "title": "Bài 1: Thời gian (～とき)",
        "topics": ["time", "condition"],
        "grammars": [
          /* 6 phần tử SmartGrammarRule từ shinkanzenN3Lesson01 */
        ]
      },
      {
        "id": "L02",
        "bookId": "SHINKANZEN_N3",
        "chapterNumber": 2,
        "title": "Bài 2: Liên quan đến (～と関係して)",
        "topics": ["time", "comparison", "condition", "degree"],
        "grammars": [
          /* 5 phần tử SmartGrammarRule từ shinkanzenN3Lesson02 */
        ]
      }
    ]
  }
]
```

#### B. SmartGrammarRule (`client/src/data/grammar/shinkanzen-n3/lesson01.ts`)
```json
[
  {
    "id": "N3-SKZ-L01-UCHINI-01",
    "bookId": "SHINKANZEN_N3",
    "chapterId": "L01",
    "level": "N3",
    "name": "～うちに（状態）",
    "hiragana": "うちに",
    "meaning": "Trong lúc (trạng thái chưa thay đổi) thì làm V...",
    "explanation": "Sử dụng khi muốn diễn tả ý: \"Trong lúc trạng thái A vẫn chưa thay đổi, thì hãy tranh thủ làm việc B\". Nếu để trạng thái A thay đổi thì sẽ khó hoặc không thể làm việc B được nữa.",
    "usage": "Thường đi với các từ thể hiện trạng thái liên tục (như tính từ, động từ thể ている/ない). Vế B thường là một hành động có chủ ý (muốn làm, định làm, kêu gọi người khác làm).",
    "notes": "Không dùng cho những việc xảy ra ngoài ý muốn ở vế B.",
    "category": "time",
    "semanticFunction": "timing_opportunity",
    "allowedRelationTypes": ["timing_opportunity"],
    "practiceTypes": [
      "multiple_choice",
      "fill_blank",
      "conjugation",
      "sentence_ordering",
      "star_question",
      "ja_to_vi",
      "vi_to_ja",
      "sentence_transformation",
      "grammar_selection",
      "text_input",
      "mixed"
    ],
    "patterns": [
      { "pattern": "Vている + うちに", "target": "Vている" },
      { "pattern": "Vない + うちに", "target": "Vない" },
      { "pattern": "Aい + うちに", "target": "I-adj" },
      { "pattern": "Aな + な + うちに", "target": "Na-adj+な" }
    ],
    "templates": [
      {
        "id": "UCHINI_STATE_1",
        "grammarId": "N3-SKZ-L01-UCHINI-01",
        "pattern": "{A}うちに、{B}。",
        "vietnamesePattern": "Trong lúc {A} thì nên tranh thủ {B}.",
        "supportedTopics": ["weather", "time", "health"],
        "slots": [
          {
            "name": "A",
            "allowedForms": ["I-adj", "Na-adj+な", "Vている", "Vない"],
            "allowedTypes": ["verb", "adjective"]
          },
          {
            "name": "B",
            "allowedTypes": ["verb"],
            "allowedForms": ["Vて", "Vる"]
          }
        ]
      }
    ]
  }
]
```

#### C. GrammarSentence (`client/src/data/grammar/shinkanzen-n3/lesson01Sentences.ts`)
```json
[
  {
    "id": "N3-SKZ-L01-UCHINI-01_S001",
    "grammarId": "N3-SKZ-L01-UCHINI-01",
    "japanese": "忘れないうちに、予定をメモしてください。",
    "hiragana": "わすれないうちに、よていをメモしてください。",
    "vietnamese": "Hãy ghi lại kế hoạch trước khi quên.",
    "difficulty": "normal",
    "target": "うちに"
  },
  {
    "id": "N3-SKZ-L01-UCHINI-01_S002",
    "grammarId": "N3-SKZ-L01-UCHINI-01",
    "japanese": "料理が熱いうちに、早く食べてください。",
    "hiragana": "りょうりがあついうちに、はやくたべてください。",
    "vietnamese": "Hãy ăn nhanh trong lúc thức ăn còn nóng.",
    "difficulty": "normal",
    "target": "うちに"
  }
]
```

#### D. PracticeQuestion Bank (`client/src/data/grammar/shinkanzen-n3/lesson01PracticeBank.ts`)
```json
{
  "N3-SKZ-L01-UCHINI-01": [
    {
      "id": "N3-SKZ-L01-UCHINI-01_S012-12345",
      "grammarId": "N3-SKZ-L01-UCHINI-01",
      "hint": "Trong lúc (trạng thái chưa thay đổi) thì làm V...",
      "explanation": "Câu gốc: 独身のうちに、自分の好きなことを楽しみたいです。\nDịch: Tôi muốn tận hưởng những điều mình thích trong lúc còn độc thân.\nNgữ pháp: ～うちに（状態） - Trong lúc (trạng thái chưa thay đổi) thì làm V...\nGiải thích: Sử dụng khi muốn diễn tả ý: \"Trong lúc trạng thái A vẫn chưa thay đổi, thì hãy tranh thủ làm việc B\". Nếu để trạng thái A thay đổi thì sẽ khó hoặc không thể làm việc B được nữa.",
      "metadata": {
        "originalSentence": "独身のうちに、自分の好きなことを楽しみたいです。"
      },
      "type": "star_question",
      "instruction": "Sắp xếp các từ sau thành câu hoàn chỉnh và chọn đáp án cho vị trí có ngôi sao (★):",
      "question": "",
      "sentenceParts": {
        "prefix": "",
        "suffix": "を楽しみたいです。"
      },
      "chunks": [
        { "id": "chunk_0", "text": "独身の", "originalIndex": 0 },
        { "id": "chunk_1", "text": "うちに", "originalIndex": 1 },
        { "id": "chunk_2", "text": "自分の", "originalIndex": 2 },
        { "id": "chunk_3", "text": "好きなこと", "originalIndex": 3 }
      ],
      "shuffledChunks": [
        { "id": "chunk_1", "text": "うちに", "originalIndex": 1 },
        { "id": "chunk_2", "text": "自分の", "originalIndex": 2 },
        { "id": "chunk_3", "text": "好きなこと", "originalIndex": 3 },
        { "id": "chunk_0", "text": "独身の", "originalIndex": 0 }
      ],
      "starIndex": 1,
      "correctAnswer": "うちに"
    },
    {
      "id": "N3-SKZ-L01-UCHINI-01_S010-12345",
      "grammarId": "N3-SKZ-L01-UCHINI-01",
      "hint": "Trong lúc (trạng thái chưa thay đổi) thì làm V...",
      "explanation": "Câu gốc: コーヒーが冷めないうちに、飲んでください。\nDịch: Hãy uống trong lúc cà phê chưa nguội.\nNgữ pháp: ～うちに（状態） - Trong lúc (trạng thái chưa thay đổi) thì làm V...\nGiải thích: Sử dụng khi muốn diễn tả ý: \"Trong lúc trạng thái A vẫn chưa thay đổi, thì hãy tranh thủ làm việc B\". Nếu để trạng thái A thay đổi thì sẽ khó hoặc không thể làm việc B được nữa.",
      "metadata": {
        "originalSentence": "コーヒーが冷めないうちに、飲んでください。"
      },
      "type": "sentence_ordering",
      "instruction": "Sắp xếp các phần sau thành câu hoàn chỉnh:",
      "question": "",
      "parts": [
        "飲んでください。",
        "コーヒーが",
        "冷めない",
        "うちに、"
      ],
      "correctAnswer": "コーヒーが冷めないうちに、飲んでください。"
    }
  ]
}
```

---

### 2.5. JLPT Dataset — 9 Modules (`client/src/data/jlpt/jlptDataset.ts`)

#### Danh mục 9 Modules (`JLPT_MODULES`):
```json
{
  "kanji": {
    "id": "kanji",
    "glyph": "字",
    "title": "Luyện Chữ Hán",
    "subtitle": "Luyện cách đọc Hiragana, âm On–Kun và chọn chữ Hán chuẩn trong câu.",
    "mistakeGrammarId": "JLPT_KANJI",
    "categoryLabel": "JLPT · Chữ Hán (Kanji)",
    "errorType": "wrong_grammar"
  },
  "vocab": {
    "id": "vocab",
    "glyph": "詞",
    "title": "Luyện Từ vựng",
    "subtitle": "Điền từ theo ngữ cảnh, tìm từ đồng nghĩa và cách dùng từ đúng chuẩn JLPT.",
    "mistakeGrammarId": "JLPT_VOCAB",
    "categoryLabel": "JLPT · Từ vựng (Goi)",
    "errorType": "missing_word"
  },
  "grammar": {
    "id": "grammar",
    "glyph": "法",
    "title": "Luyện Ngữ pháp",
    "subtitle": "Chọn mẫu ngữ pháp phù hợp trong câu và hoàn chỉnh đoạn hội thoại chuẩn JLPT.",
    "mistakeGrammarId": "JLPT_GRAMMAR",
    "categoryLabel": "JLPT · Ngữ pháp (Bunpou)",
    "errorType": "wrong_grammar"
  },
  "star": {
    "id": "star",
    "glyph": "星",
    "title": "Luyện Hái sao (★)",
    "subtitle": "Sắp xếp 4 mảnh ghép vào 4 vị trí ___ ___ _★_ ___ để chọn từ đúng tại ★.",
    "mistakeGrammarId": "JLPT_STAR",
    "categoryLabel": "JLPT · Bài tập Hái sao (Mondai ★)",
    "errorType": "wrong_word_order"
  },
  "reading-short": {
    "id": "reading-short",
    "glyph": "短",
    "title": "Đọc hiểu Ngắn (Đoản văn)",
    "subtitle": "Luyện đọc nhanh đoạn văn ngắn (150–200 chữ), email, bảng thông báo và tìm ý chính.",
    "mistakeGrammarId": "JLPT_READING_SHORT",
    "categoryLabel": "JLPT · Đọc hiểu Ngắn (Tanbun)",
    "errorType": "wrong_grammar"
  },
  "reading-medium": {
    "id": "reading-medium",
    "glyph": "中",
    "title": "Đọc hiểu Trung văn",
    "subtitle": "Phân tích bài viết độ dài trung bình (400–500 chữ) và trả lời câu hỏi lý giải nguyên nhân.",
    "mistakeGrammarId": "JLPT_READING_MEDIUM",
    "categoryLabel": "JLPT · Đọc hiểu Trung văn (Chuubun)",
    "errorType": "wrong_grammar"
  },
  "reading-long": {
    "id": "reading-long",
    "glyph": "長",
    "title": "Đọc hiểu Trường văn",
    "subtitle": "Luyện đọc bài luận dài, nắm bắt mạch lập luận của tác giả và tìm kiếm thông tin.",
    "mistakeGrammarId": "JLPT_READING_LONG",
    "categoryLabel": "JLPT · Đọc hiểu Trường văn (Choubun)",
    "errorType": "wrong_grammar"
  },
  "listening": {
    "id": "listening",
    "glyph": "聴",
    "title": "Luyện Nghe hiểu",
    "subtitle": "Luyện nghe theo từng Mondai kèm phát âm tiếng Nhật, transcript và giải thích.",
    "mistakeGrammarId": "JLPT_LISTENING",
    "categoryLabel": "JLPT · Nghe hiểu (Choukai)",
    "errorType": "wrong_grammar"
  },
  "full-test": {
    "id": "full-test",
    "glyph": "全",
    "title": "Thi thử Toàn bộ (Full Test)",
    "subtitle": "Đề thi JLPT hoàn chỉnh gồm đầy đủ các phần, có đồng hồ đếm ngược và chấm điểm chi tiết.",
    "mistakeGrammarId": "JLPT_FULL_TEST",
    "categoryLabel": "JLPT · Thi thử Toàn bộ",
    "errorType": "wrong_grammar"
  }
}
```

#### Module 1: `kanji` (`JLPTMcqItem`)
```json
{
  "id": "jlpt-kanji-n5-1",
  "moduleId": "kanji",
  "level": "N5",
  "mondaiLabel": "Mondai 1 · Đọc chữ Hán",
  "prompt": "きょうは 【天気】 が いいですね。",
  "highlight": "天気",
  "options": ["てんき", "でんき", "げんき", "てんぎ"],
  "correctIndex": 0,
  "explanation": "天気 (てんき - Thiên khí): thời tiết. Lưu ý khác với でんき (電気 - điện) và げんき (元気 - khỏe mạnh)."
}
```

#### Module 2: `vocab` (`JLPTMcqItem`)
```json
{
  "id": "jlpt-vocab-n5-1",
  "moduleId": "vocab",
  "level": "N5",
  "mondaiLabel": "Mondai 3 · Điền từ theo ngữ cảnh",
  "prompt": "きのう ともだちと えいがを（　　）にいきました。",
  "options": ["み", "きき", "のみ", "よみ"],
  "correctIndex": 0,
  "explanation": "映画を見る (えいがを みる): xem phim. Chia dạng bỏ ます khi đi với に行く → 見に行く (みにいく)."
}
```

#### Module 3: `grammar` (`JLPTMcqItem`)
```json
{
  "id": "jlpt-grammar-n5-2",
  "moduleId": "grammar",
  "level": "N5",
  "mondaiLabel": "Mondai 1 · Ngữ pháp câu",
  "prompt": "きょうは あつい（　　）、エアコンを つけましょう。",
  "options": ["から", "でも", "のに", "ほど"],
  "correctIndex": 0,
  "explanation": "Tính từ đuôi い + から: diễn tả nguyên nhân – kết quả (\"Vì hôm nay nóng nên hãy bật điều hòa\")."
}
```

#### Module 4: `star` (`JLPTStarItem`)
```json
{
  "id": "jlpt-star-n5-1",
  "level": "N5",
  "mondaiLabel": "Mondai ★ · Sắp xếp câu",
  "prefix": "きのう",
  "suffix": "。",
  "chunks": [
    { "id": "c0", "text": "スーパーで", "originalIndex": 0 },
    { "id": "c1", "text": "おいしい", "originalIndex": 1 },
    { "id": "c2", "text": "りんごを", "originalIndex": 2 },
    { "id": "c3", "text": "かいました", "originalIndex": 3 }
  ],
  "starIndex": 2,
  "correctAnswer": "りんごを",
  "fullSentence": "きのう スーパーで おいしい りんごを かいました。",
  "meaning": "Hôm qua tôi đã mua táo ngon ở siêu thị.",
  "explanation": "Trật tự tự nhiên: Thời gian (きのう) + Địa điểm + で (スーパーで) + Tính từ bổ nghĩa (おいしい) + Tân ngữ (りんごを) + Động từ (かいました). Vị trí ★ là りんごを."
}
```

#### Module 5: `reading-short` (`JLPTReadingPassage`)
```json
{
  "id": "jlpt-rs-n5-1",
  "moduleId": "reading-short",
  "level": "N5",
  "title": "Bảng thông báo của cửa hàng sách",
  "genre": "Thông báo (お知らせ)",
  "paragraphs": [
    {
      "segments": [
        { "text": "さくら" },
        { "text": "書店", "furigana": "しょてん" },
        { "text": "からのお知らせ" }
      ]
    },
    {
      "segments": [
        { "text": "いつもご" },
        { "text": "利用", "furigana": "りよう" },
        { "text": "ありがとうございます。" },
        { "text": "来週", "furigana": "らいしゅう" },
        { "text": "の" },
        { "text": "水曜日", "furigana": "すいようび" },
        { "text": "（15" },
        { "text": "日", "furigana": "にち" },
        { "text": "）は、" },
        { "text": "店内", "furigana": "てんない" },
        { "text": "の" },
        { "text": "電気", "furigana": "でんき" },
        { "text": "の" },
        { "text": "工事", "furigana": "こうじ" },
        { "text": "のため、お" },
        { "text": "休", "furigana": "やす" },
        { "text": "みします。" }
      ]
    },
    {
      "segments": [
        { "text": "木曜日", "furigana": "もくようび" },
        { "text": "（16" },
        { "text": "日", "furigana": "にち" },
        { "text": "）からは、いつもどおり" },
        { "text": "午前", "furigana": "ごぜん" },
        { "text": "10" },
        { "text": "時", "furigana": "じ" },
        { "text": "から" },
        { "text": "夜", "furigana": "よる" },
        { "text": "9" },
        { "text": "時", "furigana": "じ" },
        { "text": "まで" },
        { "text": "開", "furigana": "あ" },
        { "text": "いています。よろしくお" },
        { "text": "願", "furigana": "ねが" },
        { "text": "いいたします。" }
      ]
    }
  ],
  "translation": "Thông báo từ hiệu sách Sakura.\nCảm ơn quý khách đã luôn sử dụng dịch vụ. Thứ Tư tuần tới (ngày 15), do sửa chữa hệ thống điện trong cửa hàng nên chúng tôi xin phép nghỉ.\nTừ thứ Năm (ngày 16), cửa hàng sẽ mở cửa như thường lệ từ 10 giờ sáng đến 9 giờ tối. Xin chân thành cảm ơn.",
  "vocabNotes": [
    { "word": "書店", "reading": "しょてん", "meaning": "hiệu sách" },
    { "word": "工事", "reading": "こうじ", "meaning": "công trình, sửa chữa" },
    { "word": "いつもどおり", "reading": "いつもどおり", "meaning": "như thường lệ" }
  ],
  "questions": [
    {
      "id": "jlpt-rs-n5-1-q1",
      "prompt": "15日は どうして お休みですか。",
      "options": [
        "店の 人が 休みたいからです。",
        "電気の 工事が あるからです。",
        "本が ぜんぶ 売れたからです。",
        "木曜日の じゅんびが あるからです。"
      ],
      "correctIndex": 1,
      "explanation": "Đoạn văn ghi rõ: 「店内の電気の工事のため、お休みします。」 (Nghỉ do sửa chữa điện trong cửa hàng)."
    },
    {
      "id": "jlpt-rs-n5-1-q2",
      "prompt": "16日の 午前10時半に 本を 買いに 行きます。店は どうですか。",
      "options": [
        "開いて います。",
        "まだ 開いて いません。",
        "休みです。",
        "午後から 開きます。"
      ],
      "correctIndex": 0,
      "explanation": "Từ thứ Năm ngày 16 mở cửa từ 10:00 sáng đến 9:00 tối nên 10:30 sáng cửa hàng đang mở."
    }
  ]
}
```

#### Module 6: `reading-medium` (`JLPTReadingPassage`)
```json
{
  "id": "jlpt-rm-n5-1",
  "moduleId": "reading-medium",
  "level": "N5",
  "title": "Cuối tuần đi mua sắm cùng gia đình",
  "genre": "Nhật ký (日記)",
  "paragraphs": [
    {
      "segments": [
        { "text": "先週", "furigana": "せんしゅう" },
        { "text": "の" },
        { "text": "日曜日", "furigana": "にちようび" },
        { "text": "、" },
        { "text": "家族", "furigana": "かぞく" },
        { "text": "で" },
        { "text": "駅", "furigana": "えき" },
        { "text": "の" },
        { "text": "近", "furigana": "ちか" },
        { "text": "くのデパートへ" },
        { "text": "行", "furigana": "い" },
        { "text": "きました。とてもいい" },
        { "text": "天気", "furigana": "てんき" },
        { "text": "だったので、バスではなく、" },
        { "text": "歩", "furigana": "ある" },
        { "text": "いて" },
        { "text": "行", "furigana": "い" },
        { "text": "きました。" },
        { "text": "家", "furigana": "いえ" },
        { "text": "からデパートまで20" },
        { "text": "分", "furigana": "ふん" },
        { "text": "ぐらいかかりました。" }
      ]
    }
  ],
  "translation": "Chủ nhật tuần trước, tôi đã cùng gia đình đi đến trung tâm thương mại gần ga...",
  "vocabNotes": [
    { "word": "にぎやか", "reading": "にぎやか", "meaning": "náo nhiệt, đông vui" },
    { "word": "頼む", "reading": "たのむ", "meaning": "gọi món, nhờ vả" },
    { "word": "荷物", "reading": "にもつ", "meaning": "hành lý, đồ đạc" }
  ],
  "questions": [
    {
      "id": "jlpt-rm-n5-1-q1",
      "prompt": "家族は どうやって デパートへ 行きましたか。",
      "options": [
        "バスで 行きました。",
        "電車で 行きました。",
        "歩いて 行きました。",
        "車で 行きました。"
      ],
      "correctIndex": 2,
      "explanation": "Lúc đi gia đình chọn đi bộ vì thời tiết đẹp (バスではなく、歩いて行きました). Lúc về mới đi tàu điện."
    }
  ]
}
```

#### Module 7: `reading-long` (`JLPTReadingPassage`)
```json
{
  "id": "jlpt-rl-n3-1",
  "moduleId": "reading-long",
  "level": "N3",
  "title": "Giá trị của việc \"chờ đợi\" trong thời đại tốc độ",
  "genre": "Luận văn (論説文)",
  "paragraphs": [
    {
      "segments": [
        { "text": "今の社会では、どんなことでも「速く」できることが良いとされている。インターネットで注文すれば次の日には荷物が" },
        { "text": "届", "furigana": "とど" },
        { "text": "き、メッセージを送れば数秒で返事が来る。便利な世の中になったおかげで、私たちは多くの時間を" },
        { "text": "節約", "furigana": "せつやく" },
        { "text": "できるようになった。" }
      ]
    }
  ],
  "translation": "Trong xã hội ngày nay, việc làm mọi thứ \"nhanh chóng\" luôn được coi là tốt...",
  "vocabNotes": [
    { "word": "節約する", "reading": "せつやくする", "meaning": "tiết kiệm" },
    { "word": "不機嫌", "reading": "ふきげん", "meaning": "khó chịu, cáu kỉnh" },
    { "word": "引き立てる", "reading": "ひきたてる", "meaning": "làm nổi bật, tôn lên" }
  ],
  "questions": [
    {
      "id": "jlpt-rl-n3-1-q1",
      "prompt": "便利で速い社会になって、どんな問題が起きていると筆者は言っていますか。",
      "options": [
        "インターネットの注文で荷物が届かないことが増えた。",
        "少し待つだけでイライラしたり怒ったりする人が増えた。",
        "電車の本数が減って乗り換えに時間がかかるようになった。",
        "手紙を書く人が増えたが返事が遅くなっている。"
      ],
      "correctIndex": 1,
      "explanation": "Đoạn 2 nêu rõ: vì quá quen tốc độ nên người dễ cáu kỉnh khi phải chờ dù chỉ 3 phút."
    }
  ]
}
```

#### Module 8: `listening` (`JLPTListeningItem`)
```json
{
  "id": "jlpt-lis-n5-1",
  "level": "N5",
  "mondaiLabel": "Mondai 1 · 課題理解 (Nghe nhiệm vụ)",
  "situation": "Tại lớp học tiếng Nhật, giáo viên dặn học sinh về bài tập ngày mai.",
  "questionPrompt": "がくせいは あした まず なにを 出さなければなりませんか。",
  "dialogue": [
    {
      "speaker": "先生",
      "plainText": "みなさん、あしたの しゅくだいは かんじの プリントです。さくぶんは 来週の 月曜日で いいですよ。",
      "segments": [
        { "text": "みなさん、あしたの しゅくだいは かんじの プリントです。さくぶんは " },
        { "text": "来週", "furigana": "らいしゅう" },
        { "text": "の " },
        { "text": "月曜日", "furigana": "げつようび" },
        { "text": "で いいですよ。" }
      ]
    },
    {
      "speaker": "学生",
      "plainText": "わかりました。かんじの プリントですね。",
      "segments": [
        { "text": "わかりました。かんじの プリントですね。" }
      ]
    }
  ],
  "options": [
    "漢字のプリント",
    "作文（さくぶん）",
    "テストの紙",
    "教科書"
  ],
  "correctIndex": 0,
  "translation": "Giáo viên: Mọi người ơi, bài tập ngày mai là tờ bài tập Kanji nhé. Còn bài văn thì thứ Hai tuần sau nộp cũng được.\nHọc sinh: Vâng em hiểu rồi. Tờ bài tập Kanji ạ.",
  "explanation": "Giáo viên nói rõ: bài tập ngày mai là 漢字のプリント, còn 作文 để sang thứ Hai tuần sau."
}
```

#### Module 9: `full-test` (`JlptFullTestView.tsx` Composite Structure)
Module `full-test` không lưu mảng câu hỏi riêng biệt mà tổng hợp động một đề thi 20 phút (`DEFAULT_DURATION_SECONDS = 1200`) từ 8 module trên theo cấu trúc `examSet`:
```json
{
  "moduleMeta": {
    "id": "full-test",
    "glyph": "全",
    "title": "Thi thử Toàn bộ (Full Test)",
    "subtitle": "Đề thi JLPT hoàn chỉnh gồm đầy đủ các phần, có đồng hồ đếm ngược và chấm điểm chi tiết.",
    "mistakeGrammarId": "JLPT_FULL_TEST",
    "categoryLabel": "JLPT · Thi thử Toàn bộ",
    "errorType": "wrong_grammar"
  },
  "durationSeconds": 1200,
  "sections": {
    "s1": "4 câu JLPTMcqItem (moduleId: 'kanji') + 4 câu JLPTMcqItem (moduleId: 'vocab')",
    "s2": "4 câu JLPTMcqItem (moduleId: 'grammar') + 2 câu JLPTStarItem (module: 'star')",
    "s3": "1 bài đọc JLPTReadingPassage (random từ 'reading-short' | 'reading-medium' | 'reading-long')",
    "s4": "2 bài nghe JLPTListeningItem (module: 'listening')"
  }
}
```

---

### 2.6. User Progress (`localStorage` & Supabase Sync)

#### 1. `nihonmaster_user_progress` (`client/src/hooks/useUserProgress.ts` — `UserProgress`)
```json
{
  "starredWords": [1, 2, 15, 200],
  "wrongWords": {
    "1": 2,
    "45": 1,
    "203": 3
  }
}
```

#### 2. `nihonmaster_kanji_progress` (`client/src/store/slices/kanjiSlice.ts` — `KanjiState`)
```json
{
  "progress": {
    "男": {
      "kanjiId": "男",
      "learned": true,
      "tutorialSeen": true,
      "writingAttempts": 5,
      "correctAttempts": 4,
      "lastPracticedAt": "2026-11-18T02:15:00.000Z"
    },
    "性": {
      "kanjiId": "性",
      "learned": false,
      "tutorialSeen": true,
      "writingAttempts": 2,
      "correctAttempts": 1,
      "lastPracticedAt": "2026-11-18T02:20:00.000Z"
    }
  },
  "tutorialSeen": true
}
```

#### 3. `nihonmaster_grammar_progress` (`client/src/store/slices/grammarProgressSlice.ts` — `Record<string, GrammarProgress>`)
```json
{
  "N3-SKZ-L01-UCHINI-01": {
    "multiple_choice": 80,
    "fill_blank": 60,
    "star_question": 100,
    "conjugation": 0,
    "sentence_ordering": 90,
    "ja_to_vi": 0,
    "vi_to_ja": 0,
    "sentence_transformation": 0,
    "grammar_selection": 0,
    "text_input": 0,
    "free_writing": 0,
    "mixed": 85
  }
}
```

#### 4. `nihonmaster_grammar_mistakes` (`client/src/store/slices/mistakeSlice.ts` — `GrammarMistake[]`)
```json
[
  {
    "id": "mistake-1731896400000",
    "grammarId": "N3-SKZ-L01-UCHINI-01",
    "questionId": "N3-SKZ-L01-UCHINI-01_S012",
    "userAnswer": "自分の",
    "correctAnswer": "うちに",
    "errorType": "wrong_word_order",
    "createdAt": "2026-11-18T02:30:00.000Z",
    "prompt": "Sắp xếp các từ sau thành câu hoàn chỉnh và chọn đáp án cho vị trí có ngôi sao (★):",
    "categoryLabel": "Shin Kanzen N3 · Bài 1",
    "practicePath": "/grammar/SHINKANZEN_N3/L01/practice/N3-SKZ-L01-UCHINI-01",
    "explanation": "Đáp án đúng tại vị trí ★ là 「うちに」.",
    "level": "N3"
  }
]
```

*(Bonus)* **`nihonmaster_quiz_history` (`client/src/services/quizHistoryService.ts` — `QuizAttemptRecord[]`)**:
```json
[
  {
    "id": "attempt-1731896500000-ab12cd",
    "quizType": "vocabulary",
    "level": "N3",
    "score": 9,
    "totalQuestions": 10,
    "durationSeconds": 75,
    "mistakesJson": [
      {
        "wordId": 2,
        "kanji": "女性",
        "hiragana": "じょせい",
        "meaning": "phụ nữ, nữ giới",
        "selectedText": "đàn ông, nam giới"
      }
    ],
    "createdAt": "2026-11-18T02:35:00.000Z"
  }
]
```

---

## 3. Current Supabase Table Schema (`supabase/schema.sql`) & Đối chiếu `camelCase` vs `snake_case`

File `supabase/schema.sql` định nghĩa **9 bảng PostgreSQL** với Row-Level Security (RLS). Dưới đây là chi tiết từng bảng và bảng ánh xạ sang các trường JSON phía Frontend (`migrationService.ts` & `adminCmsService.ts`):

### 3.1. Bảng `public.profiles` (Tài khoản & Phân quyền 3 tầng)
| Cột PostgreSQL (`snake_case`) | Kiểu dữ liệu SQL | Trường Frontend (`AuthUser` / `ManagedUserProfile`) | Ghi chú / Khác biệt |
| :--- | :--- | :--- | :--- |
| `id` | `uuid primary key references auth.users(id)` | `id: string` | Cùng tên |
| `email` | `text not null unique` | `email: string` | Cùng tên |
| `display_name` | `text` | `displayName: string` | **`snake_case` ↔ `camelCase`** |
| `role` | `text not null default 'USER'` (`'SUPER_ADMIN' \| 'ADMIN' \| 'USER'`) | `role: AccountRole` | Bảo vệ bởi trigger `trg_protect_profiles_rbac` |
| `created_at` | `timestamptz not null default now()` | `createdAt: string` (`ManagedUserProfile`) | **`snake_case` ↔ `camelCase`** |
| `updated_at` | `timestamptz not null default now()` | *(không dùng trên UI)* | Tự cập nhật qua trigger |

---

### 3.2. Bảng `public.units` (Danh mục Unit học tập)
| Cột PostgreSQL (`snake_case`) | Kiểu dữ liệu SQL | Trường Frontend (`UnitMeta` trong `unitData.ts` / `CmsUnitItem`) | Ghi chú / Khác biệt quan trọng |
| :--- | :--- | :--- | :--- |
| `id` | `text primary key` | `UnitMeta.id: number` (`1`) vs `CmsUnitItem.id: string` (`"N3-U1"`) | **Khác kiểu khóa**: Trong `unitData.ts`, `id` là `number` (`1`, `2`) theo từng level; trên Supabase `id` là chuỗi ổn định như `"N3-U1"` hoặc `"N3-MIMI-N3-U1"` để tránh trùng số bài giữa các giáo trình. |
| `level` | `text not null` (`'N5'..'N1'`) | Key của object `UNIT_DATA[level]` | Trong `unitData.ts`, `level` là key cha bọc ngoài mảng `UnitMeta[]`. |
| `unit_number` | `integer not null default 1` | `UnitMeta.id: number` | **`unit_number` ↔ `id` (số thứ tự unit trong level)** |
| `textbook_id` | `text null` | `AdminUnitRecord.textbookId: string \| null` | Mã giáo trình chính xác, ví dụ `minna-n5` hoặc `mimi-n3`; dùng để lọc bài học và dữ liệu, không dò tên bài khi đã gắn mã. |
| `title` | `text not null` | `UnitMeta.name: string` | **Đổi tên trường**: `title` (DB) ↔ `name` (`unitData.ts`) |
| `description` | `text default ''` | `CmsUnitItem.description: string` | Không có trong `unitData.ts` gốc |
| `order_index` | `integer not null default 0` | `CmsUnitItem.orderIndex: number` | **`snake_case` ↔ `camelCase`** |
| `is_published` | `boolean not null default true` | `CmsUnitItem.isPublished: boolean` | **`snake_case` ↔ `camelCase`** |
| `created_at` | `timestamptz not null default now()` | — | Có thêm `totalWords: number` tính động ở Frontend |

---

### 3.3. Bảng `public.vocabularies` (Từ vựng)
| Cột PostgreSQL (`snake_case`) | Kiểu dữ liệu SQL | Trường Frontend (`VocabularyItem` trong `unit1.ts`) | Ghi chú / Khác biệt quan trọng |
| :--- | :--- | :--- | :--- |
| `id` | `bigint generated by default as identity primary key` | `id: number` | Cùng tên (`1..120`, `200..209`) |
| `unit_id` | `text not null references public.units(id)` | `unitId: number` | **Khác kiểu & tên**: dữ liệu tĩnh lưu `unitId: 1` (`number`), còn DB lưu khóa ngoại chuỗi như `unit_id: "N3-U1"`. Unit mới có thể dùng ID ghép theo giáo trình để không trộn các sách cùng số bài. |
| `word_number` | `integer` | `wordNumber: number` | **`snake_case` ↔ `camelCase`** |
| `kanji` | `text` | `kanji: string \| null` | Cùng tên |
| `hiragana` | `text not null` | `hiragana: string` | Cùng tên |
| `han_viet` | `text` | `hanViet: string \| null` | **`snake_case` ↔ `camelCase`** |
| `meaning` | `text not null` | `meaning: string` | Cùng tên |
| `word_type` | `text not null` | `wordType: string` | **`snake_case` ↔ `camelCase`** |
| `example_sentence` | `text` | `exampleSentence: string \| null` | **`snake_case` ↔ `camelCase`** |
| `example_meaning` | `text` | `exampleMeaning: string \| null` | **`snake_case` ↔ `camelCase`** |
| `notes` | `text` | `notes: string \| null` | Cùng tên |
| `level` | `text not null` (`'N5'..'N1'`) | `level: JLPTLevel` | Cùng tên |
| `tags` | `text[] not null default '{}'` | `tags?: string[]` | Chỉ xuất hiện ở IDs `200..209` trong `unit1.ts` |
| `semantic_roles` | `text[] not null default '{}'` | `semanticRoles?: string[]` | **`snake_case` ↔ `camelCase`** (chỉ có ở IDs `200..209`) |

---

### 3.4. Bảng `public.kanjis` (Chữ Hán)
| Cột PostgreSQL (`snake_case`) | Kiểu dữ liệu SQL | Trường Frontend (`KanjiItem` trong `kanjiDataset.json`) | Ghi chú / Khác biệt quan trọng |
| :--- | :--- | :--- | :--- |
| `id` | `text primary key` | `id: string` | Cùng tên (chính là ký tự Kanji, VD: `"男"`) |
| `character` | `text not null unique` | `kanji: string` | **Đổi tên trường**: DB dùng `character`, còn `kanjiDataset.json` dùng `kanji` (`CmsKanjiItem` dùng `character`). |
| `han_viet` | `text not null default ''` | `hanViet?: string` | **`snake_case` ↔ `camelCase`** |
| `meanings` | `jsonb not null default '[]'` | `meanings: string[]` | Cùng tên |
| `onyomi` | `jsonb not null default '[]'` | `onReadings: string[]` | **Đổi tên trường**: DB + `CmsKanjiItem` dùng `onyomi`, còn `kanjiDataset.json` dùng `onReadings`. |
| `kunyomi` | `jsonb not null default '[]'` | `kunReadings: string[]` | **Đổi tên trường**: DB + `CmsKanjiItem` dùng `kunyomi`, còn `kanjiDataset.json` dùng `kunReadings`. |
| `stroke_count` | `integer not null default 0` | `strokeCount?: number` | **`snake_case` ↔ `camelCase`** |
| `jlpt_level` | `text not null` (`'N5'..'N1'`) | `jlptLevel?: JLPTLevel` | **`snake_case` ↔ `camelCase`** |
| `examples` | `jsonb not null default '[]'` | `examples?: KanjiExample[]` | Cùng tên (`[{ vocabularyId, word, hiragana, meaning }]`) |
| *(không có cột riêng)* | — | `vocabularyIds: (number \| string)[]` | Có trong `kanjiDataset.json`, trên DB có thể suy ra từ `examples[].vocabularyId` |

---

### 3.5. Bảng `public.grammar_rules` (Ngữ pháp)
| Cột PostgreSQL (`snake_case`) | Kiểu dữ liệu SQL | Trường Frontend (`SmartGrammarRule` trong `lesson01.ts` vs `CmsGrammarRule`) | Ghi chú / Khác biệt quan trọng |
| :--- | :--- | :--- | :--- |
| `id` | `text primary key` | `id: string` | Cùng tên (VD: `"N3-SKZ-L01-UCHINI-01"`) |
| `book_id` | `text not null` | `bookId: string` | **`snake_case` ↔ `camelCase`** (`"SHINKANZEN_N3"`) |
| `chapter_id` | `text not null` | `chapterId: string` | **`snake_case` ↔ `camelCase`** (`"L01"`, `"L02"`) |
| `level` | `text not null` (`'N5'..'N1'`) | `level: JLPTLevel` | Cùng tên |
| `title` | `text not null` | `SmartGrammarRule.name` / `CmsGrammarRule.title` | **Đổi tên trường**: `lesson01.ts` dùng `name` (`"～うちに（状態）"`), còn DB và `CmsGrammarRule` dùng `title`. |
| `structure` | `text not null default ''` | `SmartGrammarRule.patterns: Array<{ pattern, target }>` / `CmsGrammarRule.structure: string` | **Khác cấu trúc**: `lesson01.ts` lưu mảng `patterns`, khi migrate sang DB được nối bằng `' / '` thành chuỗi `structure` (VD: `"Vている + うちに / Vない + うちに / ..."`). |
| `meaning` | `text not null` | `meaning: string` | Cùng tên |
| `explanation` | `text not null default ''` | `explanation?: string` | Cùng tên |
| `notes` | `text not null default ''` | `notes?: string` + `usage?: string` | Trong `migrationService.ts`, `notes` và `usage` được gộp vào cột `notes`. |
| `examples` | `jsonb not null default '[]'` | `lesson01Sentences` (`GrammarSentence[]`) → `Array<{ jp, vi }>` | **Tách file ở static**: Ở file tĩnh, câu ví dụ nằm riêng trong `lesson01Sentences.ts` (`{ japanese, hiragana, vietnamese }`); khi lên DB được nhúng vào cột `examples` dạng `[{ "jp": "...", "vi": "..." }]`. |

---

### 3.6. Bảng `public.jlpt_questions` (Câu hỏi luyện đề JLPT)
| Cột PostgreSQL (`snake_case`) | Kiểu dữ liệu SQL | Trường Frontend (`jlptDataset.ts` / `CmsJlptQuestion`) | Ghi chú / Khác biệt quan trọng |
| :--- | :--- | :--- | :--- |
| `id` | `text primary key` | `id: string` | Cùng tên (VD: `"jlpt-kanji-n5-1"`, `"jlpt-rs-n5-1-q1"`) |
| `module_id` | `text not null` | `moduleId: JLPTModuleId` | **`snake_case` ↔ `camelCase`** |
| `level` | `text not null` (`'N5'..'N1'`) | `level: JLPTExamLevel` | Cùng tên |
| `question_type` | `text not null` | `CmsJlptQuestion.questionType` (`'kanji' \| 'vocab' \| 'grammar' \| 'star' \| 'reading' \| 'listening'`) | **`snake_case` ↔ `camelCase`** |
| `prompt` | `text not null` | `JLPTMcqItem.prompt` / `JLPTListeningItem.questionPrompt` / `JLPTStarItem: "${prefix} ___ ___ ★ ___ ${suffix}"` | Chuẩn hóa câu hỏi từ các dạng MCQ, Star, Reading, Listening về cột `prompt`. |
| `passage` | `text` | `JLPTReadingPassage.paragraphs` / `JLPTStarItem.fullSentence` / `JLPTListeningItem.situation` | Với bài Đọc hiểu (`reading-*`), các đoạn văn `paragraphs[].segments[].text` của bài đọc cha được nối thành chuỗi `passage` cho từng câu hỏi con. |
| `options` | `jsonb not null default '[]'` | `options: [string, string, string, string]` (hoặc `chunks.map(c => c.text)` với bài `star`) | Mảng JSON 4 lựa chọn đáp án. |
| `correct_index` | `integer not null default 0` | `correctIndex: number` (hoặc `starIndex` với bài `star`) | **`snake_case` ↔ `camelCase`** (`0..3`) |
| `explanation` | `text not null default ''` | `explanation: string` | Cùng tên |
| `audio_text` | `text` | `JLPTListeningItem.dialogue` (`speaker: plainText`) → `CmsJlptQuestion.audioText` | **`snake_case` ↔ `camelCase`** (chỉ có ở câu hỏi `listening`). |

---

### 3.7. Các bảng Tiến độ & Kiểm toán (`user_progress`, `quiz_attempts`, `audit_logs`)
| Bảng PostgreSQL | Các cột chính (`snake_case`) | Đối chiếu dữ liệu Frontend |
| :--- | :--- | :--- |
| **`public.user_progress`** | `id (uuid)`, `user_id (uuid)`, `item_type ('vocab' \| 'kanji' \| 'grammar' \| 'mistake')`, `item_id (text)`, `status (text)`, `score (int)`, `attempts (int)`, `starred (bool)`, `wrong_count (int)`, `metadata_json (jsonb)`, `updated_at (timestamptz)` | Hợp nhất cả 4 kho `localStorage` (`nihonmaster_user_progress`, `nihonmaster_kanji_progress`, `nihonmaster_grammar_progress`, `nihonmaster_grammar_mistakes`) vào 1 bảng quan hệ đa hình theo `(user_id, item_type, item_id)`. |
| **`public.quiz_attempts`** | `id (uuid)`, `user_id (uuid)`, `quiz_type (text)`, `level (text)`, `score (int)`, `total_questions (int)`, `duration_seconds (int)`, `mistakes_json (jsonb)`, `created_at (timestamptz)` | Ánh xạ 1-1 với `QuizAttemptRecord` trong `nihonmaster_quiz_history` (`quizType` ↔ `quiz_type`, `totalQuestions` ↔ `total_questions`, `durationSeconds` ↔ `duration_seconds`, `mistakesJson` ↔ `mistakes_json`, `createdAt` ↔ `created_at`). |
| **`public.audit_logs`** | `id (uuid)`, `actor_id (uuid)`, `action (text)`, `entity_type (text)`, `entity_id (text)`, `details_json (jsonb)`, `created_at (timestamptz)` | Ghi nhật ký mọi thao tác Admin (`MIGRATE_STATIC_DATA`, `SAVE_VOCAB`, `DELETE_VOCAB`, `SAVE_KANJI`, `BATCH_IMPORT`, `UPDATE_USER_ROLE`, `CRUD_AUTO_TEST`). |
