import type { SmartGrammarRule } from '../../../types/grammarEngine';

const ALL_PRACTICE_TYPES = [
  'multiple_choice', 'fill_blank', 'conjugation', 'sentence_ordering', 
  'ja_to_vi', 'vi_to_ja', 'sentence_transformation', 'grammar_selection', 
  'text_input', 'mixed'
] as any[];

export const shinkanzenN3Lesson02: SmartGrammarRule[] = [
  {
    id: 'N3_L02_G001',
    bookId: 'SHINKANZEN_N3',
    chapterId: 'L02',
    level: 'N3',
    name: '～とおりだ・～とおり（に）／～どおりだ・～どおり（に）',
    hiragana: 'とおり・どおり',
    meaning: 'Theo đúng như / Y như ...',
    explanation: 'Sử dụng khi muốn nói hành động ở vế sau được thực hiện giống hệt, tuân theo đúng nội dung, quy định, dự đoán hay chỉ dẫn ở vế trước.',
    usage: 'Thường đi kèm với những từ thể hiện sự mẫu mực, thông tin đã có sẵn (nghĩ, nói, nghe, dự đoán, kế hoạch, hướng dẫn). Khi kết nối với Danh từ trực tiếp không có の thì dùng どおり (Nどおり).',
    notes: 'Đây là cấu trúc thường gặp khi mô tả việc làm theo bản vẽ, sách hướng dẫn, hoặc việc xảy ra đúng như dự đoán.',
    category: 'comparison',
    semanticFunction: 'accordance',
    allowedRelationTypes: ['accordance'],
    practiceTypes: ALL_PRACTICE_TYPES,
    patterns: [
      { pattern: 'Vる・Vた + とおりに', target: 'Vる・Vた' },
      { pattern: 'N + の + とおりに', target: 'Nの' },
      { pattern: 'N + どおりに', target: 'N' }
    ],
    templates: [
      {
        id: 'TOORI_1',
        grammarId: 'N3_L02_G001',
        pattern: '{A}とおりに、{B}。',
        vietnamesePattern: 'Làm {B} theo đúng như {A}.',
        supportedTopics: ['work', 'school', 'daily life'],
        slots: [
          {
            name: 'A',
            allowedForms: ['Vる', 'Vた', 'Nの'],
            allowedTypes: ['verb', 'noun']
          },
          {
            name: 'B',
            allowedForms: ['Vる', 'Vた', 'Vてください'],
            allowedTypes: ['verb']
          }
        ]
      },
      {
        id: 'DOORI_1',
        grammarId: 'N3_L02_G001',
        pattern: '{A}どおりに、{B}。',
        vietnamesePattern: 'Làm {B} theo đúng {A}.',
        supportedTopics: ['work', 'school', 'daily life'],
        slots: [
          {
            name: 'A',
            allowedForms: ['N'],
            allowedTypes: ['noun']
          },
          {
            name: 'B',
            allowedForms: ['Vる', 'Vた', 'Vてください'],
            allowedTypes: ['verb']
          }
        ]
      }
    ]
  },
  {
    id: 'N3_L02_G002',
    bookId: 'SHINKANZEN_N3',
    chapterId: 'L02',
    level: 'N3',
    name: '～によって・～によっては',
    hiragana: 'によって',
    meaning: 'Tùy vào / Tùy theo ... mà khác nhau',
    explanation: 'Diễn tả ý nghĩa: tùy thuộc vào từng người, từng nơi, từng thời điểm hay từng trường hợp (A) mà kết quả, cách thức hoặc sự việc (B) sẽ khác nhau hoặc thay đổi theo.',
    usage: 'Vế trước thường là danh từ chỉ sự đa dạng (người, quốc gia, thời tiết, mùa...). Vế sau thường có từ "khác nhau" (違う), "thay đổi" (変わる). Đặc biệt ～によっては được dùng khi muốn đưa ra một ví dụ cụ thể có thể xảy ra trong một số trường hợp.',
    notes: 'Trong bài này chỉ tập trung vào ý nghĩa "Tùy theo sự khác biệt", không trộn với các nghĩa khác của によって như "Bởi ai đó" (câu bị động) hay "Do/Vì" (nguyên nhân).',
    category: 'condition',
    semanticFunction: 'dependence',
    allowedRelationTypes: ['dependence'],
    practiceTypes: ALL_PRACTICE_TYPES,
    patterns: [
      { pattern: 'N + によって', target: 'N' },
      { pattern: 'N + によっては', target: 'N' }
    ],
    templates: [
      {
        id: 'NIYOTTE_1',
        grammarId: 'N3_L02_G002',
        pattern: '{A}によって、{B}違います。',
        vietnamesePattern: 'Tùy vào {A} mà {B} khác nhau.',
        supportedTopics: ['culture', 'opinion', 'daily life'],
        slots: [
          {
            name: 'A',
            allowedForms: ['N'],
            allowedTypes: ['noun']
          },
          {
            name: 'B',
            allowedForms: ['Nが', 'Vるかどうかが'],
            allowedTypes: ['noun', 'verb']
          }
        ]
      }
    ]
  },
  {
    id: 'N3_L02_G003',
    bookId: 'SHINKANZEN_N3',
    chapterId: 'L02',
    level: 'N3',
    name: '～たびに',
    hiragana: 'たびに',
    meaning: 'Mỗi khi / Cứ mỗi lần ...',
    explanation: 'Dùng khi muốn nói: "Cứ mỗi lần hành động A xảy ra, thì chắc chắn hành động/sự việc B cũng sẽ xảy ra theo". Nhấn mạnh tính lặp đi lặp lại một cách thường xuyên.',
    usage: 'Không dùng cho những việc hiển nhiên hàng ngày (như "Mỗi sáng tôi đều đánh răng"). Vế B không dùng để diễn đạt trạng thái liên tục hay kết quả đương nhiên.',
    notes: 'Thường đi kèm với những từ thể hiện cảm xúc, nhận xét, hoặc một hành động đặc trưng.',
    category: 'time',
    semanticFunction: 'repetition',
    allowedRelationTypes: ['repetition'],
    practiceTypes: ALL_PRACTICE_TYPES,
    patterns: [
      { pattern: 'Vる + たびに', target: 'Vる' },
      { pattern: 'N + の + たびに', target: 'Nの' }
    ],
    templates: [
      {
        id: 'TABINI_1',
        grammarId: 'N3_L02_G003',
        pattern: '{A}たびに、{B}。',
        vietnamesePattern: 'Cứ mỗi lần {A} thì lại {B}.',
        supportedTopics: ['memory', 'habit', 'experience'],
        slots: [
          {
            name: 'A',
            allowedForms: ['Vる', 'Nの'],
            allowedTypes: ['verb', 'noun']
          },
          {
            name: 'B',
            allowedForms: ['Vる', 'Vた'],
            allowedTypes: ['verb']
          }
        ]
      }
    ]
  },
  {
    id: 'N3_L02_G004',
    bookId: 'SHINKANZEN_N3',
    chapterId: 'L02',
    level: 'N3',
    name: '（～ば）～ほど・（～なら）～ほど・～ほど',
    hiragana: 'ば～ほど',
    meaning: 'Càng ... càng ...',
    explanation: 'Diễn tả ý nghĩa: Nếu mức độ của A tăng lên thì mức độ của B cũng tăng lên (hoặc giảm đi) tương ứng.',
    usage: 'Có nhiều cách kết hợp: VばVるほど, AければAいほど, NaならNaなほど. Có thể lược bỏ vế điều kiện và chỉ dùng: Vる/Aい/Aな/N + ほど.',
    notes: 'Chủ ngữ của cả 2 vế thường giống nhau. Động từ và tính từ phải được lặp lại.',
    category: 'degree',
    semanticFunction: 'proportional_change',
    allowedRelationTypes: ['proportional_change'],
    practiceTypes: ALL_PRACTICE_TYPES,
    patterns: [
      { pattern: 'Vば + Vる + ほど', target: 'Vば' },
      { pattern: 'Aければ + Aい + ほど', target: 'I-adj' },
      { pattern: 'Naなら + Naな + ほど', target: 'Na-adj' },
      { pattern: 'N + ほど', target: 'N' }
    ],
    templates: [
      {
        id: 'HODO_1',
        grammarId: 'N3_L02_G004',
        pattern: '{A}ば{A}ほど、{B}。',
        vietnamesePattern: 'Càng {A} thì càng {B}.',
        supportedTopics: ['learning', 'shopping', 'experience'],
        slots: [
          {
            name: 'A',
            allowedForms: ['Vば', 'Aければ', 'Naなら'],
            allowedTypes: ['verb', 'adjective']
          },
          {
            name: 'B',
            allowedForms: ['Vる', 'Aい', 'Naだ'],
            allowedTypes: ['verb', 'adjective']
          }
        ]
      }
    ]
  },
  {
    id: 'N3_L02_G005',
    bookId: 'SHINKANZEN_N3',
    chapterId: 'L02',
    level: 'N3',
    name: '～ついでに',
    hiragana: 'ついでに',
    meaning: 'Nhân tiện / Tiện thể ...',
    explanation: 'Dùng khi muốn nói: "Nhân cơ hội đang làm việc chính (A), thì tranh thủ làm luôn việc phụ (B)".',
    usage: 'Việc A là việc có chủ đích làm từ đầu, việc B là việc nảy sinh hoặc được thực hiện gộp chung vào cơ hội đó. Hành động B thường là hành động cố ý của người nói.',
    notes: 'Không dùng cho những sự việc tự nhiên xảy ra ngoài ý muốn.',
    category: 'time',
    semanticFunction: 'opportunity',
    allowedRelationTypes: ['opportunity'],
    practiceTypes: ALL_PRACTICE_TYPES,
    patterns: [
      { pattern: 'Vる・Vた + ついでに', target: 'Vる・Vた' },
      { pattern: 'N + の + ついでに', target: 'Nの' }
    ],
    templates: [
      {
        id: 'TSUIDENI_1',
        grammarId: 'N3_L02_G005',
        pattern: '{A}ついでに、{B}。',
        vietnamesePattern: 'Nhân tiện {A}, thì {B} luôn.',
        supportedTopics: ['shopping', 'errands', 'daily life'],
        slots: [
          {
            name: 'A',
            allowedForms: ['Vる', 'Vた', 'Nの'],
            allowedTypes: ['verb', 'noun']
          },
          {
            name: 'B',
            allowedForms: ['Vた', 'Vてください', 'Vよう'],
            allowedTypes: ['verb']
          }
        ]
      }
    ]
  }
];
