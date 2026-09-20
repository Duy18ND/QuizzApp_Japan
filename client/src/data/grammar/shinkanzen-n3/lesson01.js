"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shinkanzenN3Book = exports.shinkanzenN3Lesson01 = void 0;
var ALL_PRACTICE_TYPES = [
    'multiple_choice', 'fill_blank', 'conjugation', 'sentence_ordering',
    'ja_to_vi', 'vi_to_ja', 'sentence_transformation', 'grammar_selection',
    'text_input', 'mixed'
];
exports.shinkanzenN3Lesson01 = [
    {
        id: 'N3-SKZ-L01-UCHINI-01',
        bookId: 'SHINKANZEN_N3',
        chapterId: 'L01',
        level: 'N3',
        name: '～うちに（状態）',
        hiragana: 'うちに',
        meaning: 'Trong lúc (trạng thái chưa thay đổi) thì làm V...',
        explanation: 'Sử dụng khi muốn diễn tả ý: "Trong lúc trạng thái A vẫn chưa thay đổi, thì hãy tranh thủ làm việc B". Nếu để trạng thái A thay đổi thì sẽ khó hoặc không thể làm việc B được nữa.',
        usage: 'Thường đi với các từ thể hiện trạng thái liên tục (như tính từ, động từ thể ている/ない). Vế B thường là một hành động có chủ ý (muốn làm, định làm, kêu gọi người khác làm).',
        notes: 'Không dùng cho những việc xảy ra ngoài ý muốn ở vế B.',
        category: 'time',
        semanticFunction: 'timing_opportunity',
        allowedRelationTypes: ['timing_opportunity'],
        practiceTypes: ALL_PRACTICE_TYPES,
        patterns: [
            { pattern: 'Vている + うちに', target: 'Vている' },
            { pattern: 'Vない + うちに', target: 'Vない' },
            { pattern: 'Aい + うちに', target: 'I-adj' },
            { pattern: 'Aな + な + うちに', target: 'Na-adj+な' }
        ],
        templates: [
            {
                id: 'UCHINI_STATE_1',
                grammarId: 'N3-SKZ-L01-UCHINI-01',
                pattern: '{A}うちに、{B}。',
                vietnamesePattern: 'Trong lúc {A} thì nên tranh thủ {B}.',
                supportedTopics: ['weather', 'time', 'health'],
                slots: [
                    {
                        name: 'A',
                        allowedForms: ['I-adj', 'Na-adj+な', 'Vている', 'Vない'],
                        allowedTypes: ['verb', 'adjective']
                    },
                    {
                        name: 'B',
                        allowedTypes: ['verb'],
                        allowedForms: ['Vて', 'Vる'] // Intentional actions
                    }
                ]
            }
        ]
    },
    {
        id: 'N3-SKZ-L01-UCHINI-02',
        bookId: 'SHINKANZEN_N3',
        chapterId: 'L01',
        level: 'N3',
        name: '～うちに（変化）',
        hiragana: 'うちに',
        meaning: 'Trong khi đang (làm V) thì có một sự thay đổi xảy ra...',
        explanation: 'Sử dụng khi muốn diễn tả ý: "Trong quá trình đang làm việc A, thì một sự thay đổi B diễn ra một cách tự nhiên (ngoài ý muốn)".',
        usage: 'Vế A thường là động từ diễn tả hành động kéo dài (Vている) hoặc lặp đi lặp lại. Vế B là một sự thay đổi (tự nhiên sinh ra, dần dần biến đổi).',
        notes: 'Vế B KHÔNG PHẢI là hành động có chủ ý của người nói.',
        category: 'time',
        semanticFunction: 'concurrent_change',
        allowedRelationTypes: ['concurrent_change'],
        practiceTypes: ALL_PRACTICE_TYPES,
        patterns: [
            { pattern: 'Vる + うちに', target: 'Vる' },
            { pattern: 'Vている + うちに', target: 'Vている' }
        ],
        templates: [
            {
                id: 'UCHINI_CHANGE_1',
                grammarId: 'N3-SKZ-L01-UCHINI-02',
                pattern: '{A}うちに、{B}。',
                vietnamesePattern: 'Trong lúc đang {A} thì {B} (đã xảy ra lúc nào không hay).',
                supportedTopics: ['school', 'daily life'],
                slots: [
                    {
                        name: 'A',
                        allowedForms: ['Vている', 'Vる'], // Ongoing action
                        allowedTypes: ['verb']
                    },
                    {
                        name: 'B',
                        allowedForms: ['Vた', 'Vてきた', 'Vようになった'], // Unintentional change
                        allowedTypes: ['verb']
                    }
                ]
            }
        ]
    },
    {
        id: 'N3-SKZ-L01-AIDA',
        bookId: 'SHINKANZEN_N3',
        chapterId: 'L01',
        level: 'N3',
        name: '～間（ずっと）',
        hiragana: 'あいだ',
        meaning: 'Trong suốt (khoảng thời gian) ...',
        explanation: 'Dùng khi muốn nói: "Trong suốt khoảng thời gian A diễn ra, thì trạng thái/hành động B cũng liên tục diễn ra theo".',
        usage: 'Cả vế A và vế B đều phải là những hành động hoặc trạng thái kéo dài liên tục. Khi A kết thúc thì B cũng kết thúc.',
        notes: 'Nếu vế B là một hành động xảy ra chớp nhoáng (không kéo dài) thì phải dùng ～間に, không được dùng ～間.',
        category: 'time',
        practiceTypes: ALL_PRACTICE_TYPES,
        patterns: [
            { pattern: 'Vている + 間', target: 'Vている' },
            { pattern: 'N + の + 間', target: 'Noun+の' }
        ],
        templates: [
            {
                id: 'AIDA_1',
                grammarId: 'N3-SKZ-L01-AIDA',
                pattern: '{A}間、ずっと{B}。',
                vietnamesePattern: 'Trong suốt lúc {A}, thì {B}.',
                supportedTopics: ['school', 'weather', 'travel'],
                slots: [
                    {
                        name: 'A',
                        allowedForms: ['Vている', 'Noun+の']
                    },
                    {
                        name: 'B',
                        allowedForms: ['Vている', 'Vていた'] // Continuous state
                    }
                ]
            }
        ]
    },
    {
        id: 'N3-SKZ-L01-AIDANI',
        bookId: 'SHINKANZEN_N3',
        chapterId: 'L01',
        level: 'N3',
        name: '～間に（瞬間）',
        hiragana: 'あいだに',
        meaning: 'Trong lúc (một khoảnh khắc nào đó) ...',
        explanation: 'Dùng khi muốn nói: "Trong khoảng thời gian A đang diễn ra, thì hành động B chen ngang hoặc hoàn thành".',
        usage: 'Vế A là trạng thái kéo dài, vế B là hành động xảy ra và kết thúc chóng vánh (không kéo dài). Vế B cũng có thể là hành động kết thúc trước khi vế A kết thúc.',
        notes: 'Chú ý phân biệt với ～間. (間: A kéo dài, B cũng kéo dài. 間に: A kéo dài, B chỉ là một điểm).',
        category: 'time',
        practiceTypes: ALL_PRACTICE_TYPES,
        patterns: [
            { pattern: 'Vている + 間に', target: 'Vている' },
            { pattern: 'N + の + 間に', target: 'Noun+の' }
        ],
        templates: [
            {
                id: 'AIDANI_1',
                grammarId: 'N3-SKZ-L01-AIDANI',
                pattern: '{A}間に、{B}。',
                vietnamesePattern: 'Trong lúc {A} thì {B} (đã xảy ra).',
                supportedTopics: ['school', 'travel', 'daily life'],
                slots: [
                    {
                        name: 'A',
                        allowedForms: ['Vている', 'Noun+の']
                    },
                    {
                        name: 'B',
                        allowedForms: ['Vた', 'Vる'] // Momentary action
                    }
                ]
            }
        ]
    },
    {
        id: 'N3-SKZ-L01-TEKARA-DENAITO',
        bookId: 'SHINKANZEN_N3',
        chapterId: 'L01',
        level: 'N3',
        name: '～てからでないと / ～てからでなければ',
        hiragana: 'てからでないと',
        meaning: 'Nếu chưa ... thì không thể ...',
        explanation: 'Dùng khi muốn nhấn mạnh thứ tự trước sau: "Hành động A bắt buộc phải được thực hiện trước, nếu không có A thì B không thể xảy ra hoặc không được phép xảy ra".',
        usage: 'Vế A luôn chia thể て. Vế B luôn mang nghĩa phủ định hoặc tiêu cực (không thể, không được phép, khó mà...).',
        notes: 'Thường dùng trong các quy định, cảnh báo, hoặc điều kiện tiên quyết.',
        category: 'condition',
        semanticFunction: 'prerequisite',
        allowedRelationTypes: ['prerequisite'],
        practiceTypes: ALL_PRACTICE_TYPES,
        patterns: [
            { pattern: 'Vて + からでないと', target: 'Vて' }
        ],
        templates: [
            {
                id: 'TEKARA_DENAITO_1',
                grammarId: 'N3-SKZ-L01-TEKARA-DENAITO',
                pattern: '{A}てからでないと、{B}。',
                vietnamesePattern: 'Nếu chưa {A} thì không thể {B}.',
                supportedTopics: ['work', 'school', 'shopping'],
                slots: [
                    {
                        name: 'A',
                        allowedForms: ['Vて'], // Pre-condition
                        allowedTypes: ['verb']
                    },
                    {
                        name: 'B',
                        allowedForms: ['Vない'], // Negative result (Vられない is technically Vない form of potential verb, we just use Vない to represent negative here, or we can use Vられない)
                        allowedTypes: ['verb']
                    }
                ]
            }
        ]
    },
    {
        id: 'N3-SKZ-L01-TOKORO',
        bookId: 'SHINKANZEN_N3',
        chapterId: 'L01',
        level: 'N3',
        name: '～ところだ',
        hiragana: 'ところだ',
        meaning: 'Đúng lúc sắp / đang / vừa mới ...',
        explanation: 'Nhấn mạnh một thời điểm cụ thể của hành động. Tùy thuộc vào thì của động từ đi trước mà ý nghĩa khác nhau: Vるところ (chuẩn bị làm), Vているところ (đang làm dở), Vたところ (vừa mới làm xong).',
        usage: 'Thường đi kèm với các trạng từ chỉ thời gian để làm rõ nghĩa: これから、ちょうど今、たった今.',
        notes: 'Có thể đi kèm trợ từ (ところへ、ところで、ところを) tùy thuộc vào động từ ở vế sau.',
        category: 'time',
        practiceTypes: ALL_PRACTICE_TYPES,
        patterns: [
            { pattern: 'Vる + ところ', target: 'Vる' },
            { pattern: 'Vている + ところ', target: 'Vている' },
            { pattern: 'Vた + ところ', target: 'Vた' }
        ],
        templates: [
            {
                id: 'TOKORO_RUTOKORO',
                grammarId: 'N3-SKZ-L01-TOKORO',
                pattern: 'これから{A}ところです。',
                vietnamesePattern: 'Bây giờ chuẩn bị {A}.',
                supportedTopics: ['daily life', 'school'],
                slots: [
                    {
                        name: 'A',
                        allowedForms: ['Vる'],
                        allowedTypes: ['verb']
                    }
                ]
            },
            {
                id: 'TOKORO_TEIRUTOKORO',
                grammarId: 'N3-SKZ-L01-TOKORO',
                pattern: 'ちょうど今、{A}ところです。',
                vietnamesePattern: 'Bây giờ đúng lúc đang {A}.',
                supportedTopics: ['daily life', 'school', 'work'],
                slots: [
                    {
                        name: 'A',
                        allowedForms: ['Vている'],
                        allowedTypes: ['verb']
                    }
                ]
            },
            {
                id: 'TOKORO_TATOKORO',
                grammarId: 'N3-SKZ-L01-TOKORO',
                pattern: 'たった今、{A}ところです。',
                vietnamesePattern: 'Vừa mới {A} xong.',
                supportedTopics: ['daily life', 'transportation'],
                slots: [
                    {
                        name: 'A',
                        allowedForms: ['Vた'],
                        allowedTypes: ['verb']
                    }
                ]
            }
        ]
    }
];
exports.shinkanzenN3Book = {
    id: 'SHINKANZEN_N3',
    title: '新完全マスター 文法 N3',
    level: 'N3',
    chapters: [
        {
            id: 'L01',
            bookId: 'SHINKANZEN_N3',
            chapterNumber: 1,
            title: '第1課 ～とき',
            topics: ['time', 'condition'],
            grammars: exports.shinkanzenN3Lesson01
        }
    ]
};
