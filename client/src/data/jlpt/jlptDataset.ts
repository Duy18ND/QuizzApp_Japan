import { grammarBooks } from '../grammar';
import { lesson01PracticeBank } from '../grammar/shinkanzen-n3/lesson01PracticeBank';
import {
  MINNA_N5_GRAMMAR_MCQS,
  MINNA_N5_KANJI_MCQS,
  MINNA_N5_LISTENING_ITEMS,
  MINNA_N5_READING_PASSAGES,
  MINNA_N5_STAR_ITEMS,
  MINNA_N5_VOCAB_MCQS,
} from './minnaN5JlptPack';
import {
  PACK_GRAMMAR_MCQS,
  PACK_KANJI_MCQS,
  PACK_LISTENING_ITEMS,
  PACK_READING_PASSAGES,
  PACK_STAR_ITEMS,
  PACK_VOCAB_MCQS,
} from './n5n4n3FullPack';
import {
  EXTRA_LISTENING_ITEMS_N5_N4_N3,
  EXTRA_READING_PASSAGES_N5_N4_N3,
  REAL_JLPT_EXAM_PRESETS,
  type RealJlptExamPreset,
} from './realJlptExamsPack';

export { REAL_JLPT_EXAM_PRESETS, type RealJlptExamPreset };
import kanjiDataRaw from '../kanji/kanjiDataset.json';
import { unit1Data } from '../n3/unit1';
import { N3_EXTRA_TEXTBOOK_UNITS } from '../n3/extraTextbooksN3';
import { N4_ALL_TEXTBOOK_UNITS } from '../n4/allTextbooksN4';
import { buildMultiUnitVocab } from '../n5/extraTextbooksN5';
import type { KanjiItem } from '../../types/kanji';
import type { GrammarMistake, MultipleChoiceQuestion, StarQuestion } from '../../types/grammar';
import { SITUATION_LISTENING_N3, SITUATION_READING_N3 } from './situationPackN3';
import { SITUATION_LISTENING_N4, SITUATION_READING_N4 } from './situationPackN4';
import { SITUATION_LISTENING_N5, SITUATION_READING_N5 } from './situationPackN5';

export type JLPTLevelFilter = 'ALL' | 'N5' | 'N4' | 'N3';
export type JLPTExamLevel = 'N5' | 'N4' | 'N3';

export type JLPTModuleId =
  | 'kanji'
  | 'vocab'
  | 'grammar'
  | 'star'
  | 'reading-short'
  | 'reading-medium'
  | 'reading-long'
  | 'listening'
  | 'full-test';

export interface JLPTModuleMeta {
  id: JLPTModuleId;
  glyph: string;
  title: string;
  subtitle: string;
  mistakeGrammarId: string;
  categoryLabel: string;
  errorType: GrammarMistake['errorType'];
}

export const JLPT_MODULES: Record<JLPTModuleId, JLPTModuleMeta> = {
  kanji: {
    id: 'kanji',
    glyph: '字',
    title: 'Luyện Chữ Hán',
    subtitle: 'Luyện cách đọc Hiragana, âm On–Kun và chọn chữ Hán chuẩn trong câu.',
    mistakeGrammarId: 'JLPT_KANJI',
    categoryLabel: 'JLPT · Chữ Hán (Kanji)',
    errorType: 'wrong_grammar',
  },
  vocab: {
    id: 'vocab',
    glyph: '詞',
    title: 'Luyện Từ vựng',
    subtitle: 'Điền từ theo ngữ cảnh, tìm từ đồng nghĩa và cách dùng từ đúng chuẩn JLPT.',
    mistakeGrammarId: 'JLPT_VOCAB',
    categoryLabel: 'JLPT · Từ vựng (Goi)',
    errorType: 'missing_word',
  },
  grammar: {
    id: 'grammar',
    glyph: '法',
    title: 'Luyện Ngữ pháp',
    subtitle: 'Chọn mẫu ngữ pháp phù hợp trong câu và hoàn chỉnh đoạn hội thoại chuẩn JLPT.',
    mistakeGrammarId: 'JLPT_GRAMMAR',
    categoryLabel: 'JLPT · Ngữ pháp (Bunpou)',
    errorType: 'wrong_grammar',
  },
  star: {
    id: 'star',
    glyph: '星',
    title: 'Luyện Hái sao (★)',
    subtitle: 'Sắp xếp 4 mảnh ghép vào 4 vị trí ___ ___ _★_ ___ để chọn từ đúng tại ★.',
    mistakeGrammarId: 'JLPT_STAR',
    categoryLabel: 'JLPT · Bài tập Hái sao (Mondai ★)',
    errorType: 'wrong_word_order',
  },
  'reading-short': {
    id: 'reading-short',
    glyph: '短',
    title: 'Đọc hiểu Ngắn (Đoản văn)',
    subtitle: 'Luyện đọc nhanh đoạn văn ngắn (150–200 chữ), email, bảng thông báo và tìm ý chính.',
    mistakeGrammarId: 'JLPT_READING_SHORT',
    categoryLabel: 'JLPT · Đọc hiểu Ngắn (Tanbun)',
    errorType: 'wrong_grammar',
  },
  'reading-medium': {
    id: 'reading-medium',
    glyph: '中',
    title: 'Đọc hiểu Trung văn',
    subtitle: 'Phân tích bài viết độ dài trung bình (400–500 chữ) và trả lời câu hỏi lý giải nguyên nhân.',
    mistakeGrammarId: 'JLPT_READING_MEDIUM',
    categoryLabel: 'JLPT · Đọc hiểu Trung văn (Chuubun)',
    errorType: 'wrong_grammar',
  },
  'reading-long': {
    id: 'reading-long',
    glyph: '長',
    title: 'Đọc hiểu Trường văn',
    subtitle: 'Luyện đọc bài luận dài, nắm bắt mạch lập luận của tác giả và tìm kiếm thông tin.',
    mistakeGrammarId: 'JLPT_READING_LONG',
    categoryLabel: 'JLPT · Đọc hiểu Trường văn (Choubun)',
    errorType: 'wrong_grammar',
  },
  listening: {
    id: 'listening',
    glyph: '聴',
    title: 'Luyện Nghe hiểu',
    subtitle: 'Luyện nghe theo từng Mondai kèm phát âm tiếng Nhật, transcript và giải thích.',
    mistakeGrammarId: 'JLPT_LISTENING',
    categoryLabel: 'JLPT · Nghe hiểu (Choukai)',
    errorType: 'wrong_grammar',
  },
  'full-test': {
    id: 'full-test',
    glyph: '全',
    title: 'Thi thử Toàn bộ (Full Test)',
    subtitle: 'Đề thi JLPT hoàn chỉnh gồm đầy đủ các phần, có đồng hồ đếm ngược và chấm điểm chi tiết.',
    mistakeGrammarId: 'JLPT_FULL_TEST',
    categoryLabel: 'JLPT · Thi thử Toàn bộ',
    errorType: 'wrong_grammar',
  },
};

export interface JLPTMcqItem {
  id: string;
  moduleId: 'kanji' | 'vocab' | 'grammar';
  level: JLPTExamLevel;
  mondaiLabel: string;
  prompt: string;
  highlight?: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface JLPTStarItem {
  id: string;
  level: JLPTExamLevel;
  mondaiLabel: string;
  prefix: string;
  suffix: string;
  chunks: Array<{ id: string; text: string; originalIndex: number }>;
  starIndex: number;
  correctAnswer: string;
  fullSentence: string;
  meaning: string;
  explanation: string;
}

export interface FuriganaSegment {
  text: string;
  furigana?: string;
}

export interface JLPTReadingQuestion {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface JLPTReadingPassage {
  id: string;
  moduleId: 'reading-short' | 'reading-medium' | 'reading-long';
  level: JLPTExamLevel;
  title: string;
  genre: string;
  paragraphs: Array<{ segments: FuriganaSegment[] }>;
  translation: string;
  vocabNotes: Array<{ word: string; reading: string; meaning: string }>;
  questions: JLPTReadingQuestion[];
}

export interface JLPTListeningLine {
  speaker: string;
  segments: FuriganaSegment[];
  plainText: string;
}

export interface JLPTListeningItem {
  id: string;
  level: JLPTExamLevel;
  mondaiLabel: string;
  situation: string;
  questionPrompt: string;
  dialogue: JLPTListeningLine[];
  options: [string, string, string, string];
  correctIndex: number;
  translation: string;
  explanation: string;
}

/* ============================================================================
   1. KANJI QUESTIONS (Curated N5 / N4 / N3 + Dataset Adapter)
   ============================================================================ */

const CURATED_KANJI_QUESTIONS: JLPTMcqItem[] = [
  // N5
  {
    id: 'jlpt-kanji-n5-1',
    moduleId: 'kanji',
    level: 'N5',
    mondaiLabel: 'Mondai 1 · Đọc chữ Hán',
    prompt: 'きょうは 【天気】 が いいですね。',
    highlight: '天気',
    options: ['てんき', 'でんき', 'げんき', 'てんぎ'],
    correctIndex: 0,
    explanation: '天気 (てんき - Thiên khí): thời tiết. Lưu ý khác với でんき (電気 - điện) và げんき (元気 - khỏe mạnh).',
  },
  {
    id: 'jlpt-kanji-n5-2',
    moduleId: 'kanji',
    level: 'N5',
    mondaiLabel: 'Mondai 1 · Đọc chữ Hán',
    prompt: 'まいにち 【電車】 で がっこうへ いきます。',
    highlight: '電車',
    options: ['てんしゃ', 'でんしゃ', 'でんちゃ', 'じんしゃ'],
    correctIndex: 1,
    explanation: '電車 (でんしゃ - Điện xa): tàu điện. Âm On của 電 là でん, 車 là しゃ.',
  },
  {
    id: 'jlpt-kanji-n5-3',
    moduleId: 'kanji',
    level: 'N5',
    mondaiLabel: 'Mondai 2 · Chọn chữ Hán',
    prompt: 'らいしゅうの 【きんようび】 に かいぎが あります。',
    highlight: 'きんようび',
    options: ['木曜日', '金曜日', '土曜日', '水曜日'],
    correctIndex: 1,
    explanation: 'きんようび = 金曜日 (Thứ Sáu). 木曜日 là thứ Năm, 土曜日 là thứ Bảy, 水曜日 là thứ Tư.',
  },
  {
    id: 'jlpt-kanji-n5-4',
    moduleId: 'kanji',
    level: 'N5',
    mondaiLabel: 'Mondai 1 · Đọc chữ Hán',
    prompt: 'あたらしい 【時計】 を かいました。',
    highlight: '時計',
    options: ['じけい', 'とけい', 'どけい', 'とき'],
    correctIndex: 1,
    explanation: '時計 (とけい - Thời kế): đồng hồ. Đây là cách đọc đặc biệt cần nhớ (không đọc là じけい).',
  },
  {
    id: 'jlpt-kanji-n5-5',
    moduleId: 'kanji',
    level: 'N5',
    mondaiLabel: 'Mondai 2 · Chọn chữ Hán',
    prompt: 'えきの 【みなみぐち】 で まって います。',
    highlight: 'みなみぐち',
    options: ['北口', '東口', '西口', '南口'],
    correctIndex: 3,
    explanation: 'みなみぐち = 南口 (Cửa Nam). 北 (bắc - きた), 東 (đông - ひがし), 西 (tây - にし).',
  },
  // N4
  {
    id: 'jlpt-kanji-n4-1',
    moduleId: 'kanji',
    level: 'N4',
    mondaiLabel: 'Mondai 1 · Đọc chữ Hán',
    prompt: 'しゅくだいを 【計画】 どおりに すすめます。',
    highlight: '計画',
    options: ['けいかく', 'けいがく', 'きかく', 'けっかく'],
    correctIndex: 0,
    explanation: '計画 (けいかく - Kế hoạch): kế hoạch. 画 trong trường hợp này đọc là かく.',
  },
  {
    id: 'jlpt-kanji-n4-2',
    moduleId: 'kanji',
    level: 'N4',
    mondaiLabel: 'Mondai 1 · Đọc chữ Hán',
    prompt: 'へやの かぎを 【閉めて】 ください。',
    highlight: '閉めて',
    options: ['とめて', 'しめて', 'あけて', 'きめて'],
    correctIndex: 1,
    explanation: '閉める (しめる - Bế): đóng lại. 開ける (あける) là mở, 止める (とめる) là dừng.',
  },
  {
    id: 'jlpt-kanji-n4-3',
    moduleId: 'kanji',
    level: 'N4',
    mondaiLabel: 'Mondai 2 · Chọn chữ Hán',
    prompt: 'なつやすみの 【よてい】 を ともだちに はなしました。',
    highlight: 'よてい',
    options: ['予低', '予定', '余定', '与定'],
    correctIndex: 1,
    explanation: 'よてい = 予定 (Dự định): dự định, lịch trình.',
  },
  {
    id: 'jlpt-kanji-n4-4',
    moduleId: 'kanji',
    level: 'N4',
    mondaiLabel: 'Mondai 1 · Đọc chữ Hán',
    prompt: 'ちかくの 【病院】 へ いきました。',
    highlight: '病院',
    options: ['びょういん', 'びよういん', 'びょうえん', 'ひょういん'],
    correctIndex: 0,
    explanation: '病院 (びょういん - Bệnh viện). Chú ý phân biệt trường âm với 美容院 (びよういん - tiệm làm tóc).',
  },
  {
    id: 'jlpt-kanji-n4-5',
    moduleId: 'kanji',
    level: 'N4',
    mondaiLabel: 'Mondai 2 · Chọn chữ Hán',
    prompt: 'かんじの 【いみ】 が わかりません。',
    highlight: 'いみ',
    options: ['意見', '意味', '異味', '医見'],
    correctIndex: 1,
    explanation: 'いみ = 意味 (Ý vị): ý nghĩa. 意見 (いけん) là ý kiến.',
  },
  // N3
  {
    id: 'jlpt-kanji-n3-1',
    moduleId: 'kanji',
    level: 'N3',
    mondaiLabel: 'Mondai 1 · Đọc chữ Hán',
    prompt: 'この問題については、もう一度【検討】する必要があります。',
    highlight: '検討',
    options: ['けんとう', 'けんどう', 'げんとう', 'かんとう'],
    correctIndex: 0,
    explanation: '検討 (けんとう - Kiểm thảo): xem xét, cân nhắc kỹ lưỡng.',
  },
  {
    id: 'jlpt-kanji-n3-2',
    moduleId: 'kanji',
    level: 'N3',
    mondaiLabel: 'Mondai 1 · Đọc chữ Hán',
    prompt: '友達の引っ越しを【手伝った】。',
    highlight: '手伝った',
    options: ['てつだった', 'てつたった', 'でんたつした', 'てつだいた'],
    correctIndex: 0,
    explanation: '手伝う (てつだう - Thủ truyền): giúp đỡ. Thể quá khứ là 手伝った (てつだった).',
  },
  {
    id: 'jlpt-kanji-n3-3',
    moduleId: 'kanji',
    level: 'N3',
    mondaiLabel: 'Mondai 2 · Chọn chữ Hán',
    prompt: 'かいぎの しりょうを 【じゅんび】 しておいてください。',
    highlight: 'じゅんび',
    options: ['準備', '順備', '準美', '純備'],
    correctIndex: 0,
    explanation: 'じゅんび = 準備 (Chuẩn bị): chuẩn bị sẵn sàng.',
  },
  {
    id: 'jlpt-kanji-n3-4',
    moduleId: 'kanji',
    level: 'N3',
    mondaiLabel: 'Mondai 1 · Đọc chữ Hán',
    prompt: '雨の日は【交通】が混雑しやすい。',
    highlight: '交通',
    options: ['こうつう', 'ごうつう', 'こうづう', 'きょうつう'],
    correctIndex: 0,
    explanation: '交通 (こうつう - Giao thông): giao thông, đi lại.',
  },
  {
    id: 'jlpt-kanji-n3-5',
    moduleId: 'kanji',
    level: 'N3',
    mondaiLabel: 'Mondai 2 · Chọn chữ Hán',
    prompt: '自分の 【けいけん】 を 生かして仕事をしたい。',
    highlight: 'けいけん',
    options: ['経験', '敬見', '経見', '軽検'],
    correctIndex: 0,
    explanation: 'けいけん = 経験 (Kinh nghiệm): kinh nghiệm.',
  },
];

/* ============================================================================
   2. VOCABULARY QUESTIONS (Curated N5 / N4 / N3 + Unit 1 Adapter)
   ============================================================================ */

const CURATED_VOCAB_QUESTIONS: JLPTMcqItem[] = [
  // N5
  {
    id: 'jlpt-vocab-n5-1',
    moduleId: 'vocab',
    level: 'N5',
    mondaiLabel: 'Mondai 3 · Điền từ theo ngữ cảnh',
    prompt: 'きのう ともだちと えいがを（　　）にいきました。',
    options: ['み', 'きき', 'のみ', 'よみ'],
    correctIndex: 0,
    explanation: '映画を見る (えいがを みる): xem phim. Chia dạng bỏ ます khi đi với に行く → 見に行く (みにいく).',
  },
  {
    id: 'jlpt-vocab-n5-2',
    moduleId: 'vocab',
    level: 'N5',
    mondaiLabel: 'Mondai 3 · Điền từ theo ngữ cảnh',
    prompt: 'さむいですから、まどを（　　）ください。',
    options: ['あけて', 'しめて', 'つけて', 'けして'],
    correctIndex: 1,
    explanation: 'Vì trời lạnh nên nhờ đóng cửa sổ: 窓を閉めてください (まどを しめて ください).',
  },
  {
    id: 'jlpt-vocab-n5-3',
    moduleId: 'vocab',
    level: 'N5',
    mondaiLabel: 'Mondai 4 · Từ đồng nghĩa',
    prompt: 'ここは 【とても】 しずかですね。',
    highlight: 'とても',
    options: ['たいへん', 'ときどき', 'ぜんぜん', 'あまり'],
    correctIndex: 0,
    explanation: 'とても (rất) đồng nghĩa với たいへん (vô cùng/rất). ぜんぜん và あまり thường đi với phủ định.',
  },
  {
    id: 'jlpt-vocab-n5-4',
    moduleId: 'vocab',
    level: 'N5',
    mondaiLabel: 'Mondai 3 · Điền từ theo ngữ cảnh',
    prompt: 'つくえの うえに かばんが（　　）。',
    options: ['います', 'あります', 'なります', 'します'],
    correctIndex: 1,
    explanation: 'かばん (cặp sách) là đồ vật nên dùng あります để diễn tả sự tồn tại.',
  },
  // N4
  {
    id: 'jlpt-vocab-n4-1',
    moduleId: 'vocab',
    level: 'N4',
    mondaiLabel: 'Mondai 3 · Điền từ theo ngữ cảnh',
    prompt: 'にほんごの じしょを ともだちに（　　）。',
    options: ['かしました', 'かえりました', 'なおしました', 'おしえました'],
    correctIndex: 0,
    explanation: '貸す (かす): cho mượn. 友達に辞書を貸しました = Tôi đã cho bạn mượn từ điển.',
  },
  {
    id: 'jlpt-vocab-n4-2',
    moduleId: 'vocab',
    level: 'N4',
    mondaiLabel: 'Mondai 4 · Từ đồng nghĩa',
    prompt: 'この みせの りょうりは 【とくべつに】 おいしいです。',
    highlight: 'とくべつに',
    options: ['とくに', 'きゅうに', 'ていねいに', 'あんぜんに'],
    correctIndex: 0,
    explanation: '特別に (とくべつに - đặc biệt là) gần nghĩa nhất với 特に (とくに - đặc biệt).',
  },
  {
    id: 'jlpt-vocab-n4-3',
    moduleId: 'vocab',
    level: 'N4',
    mondaiLabel: 'Mondai 3 · Điền từ theo ngữ cảnh',
    prompt: 'にゅうがくしけんに（　　）して、かぞくみんなが よろこびました。',
    options: ['ごうかく', 'さんせい', 'よやく', 'あんない'],
    correctIndex: 0,
    explanation: '試験に合格する (しけんに ごうかくする): thi đỗ kỳ thi.',
  },
  {
    id: 'jlpt-vocab-n4-4',
    moduleId: 'vocab',
    level: 'N4',
    mondaiLabel: 'Mondai 5 · Cách dùng từ',
    prompt: 'Từ 【せつめい】 được dùng đúng nhất trong câu nào?',
    highlight: 'せつめい',
    options: [
      'あたらしい パソコンの つかいかたを せつめいしました。',
      'きょうの ばんごはんを せつめいしました。',
      'えきの まえで バスを せつめいしました。',
      'ともだちに おかねを せつめいしました。',
    ],
    correctIndex: 0,
    explanation: '説明する (giải thích): dùng để giải thích cách sử dụng, lý do hoặc quy trình.',
  },
  // N3
  {
    id: 'jlpt-vocab-n3-1',
    moduleId: 'vocab',
    level: 'N3',
    mondaiLabel: 'Mondai 3 · Điền từ theo ngữ cảnh',
    prompt: 'この都市は近年、人口が急速に（　　）している。',
    options: ['増加', '参加', '招待', '発表'],
    correctIndex: 0,
    explanation: '人口が増加する (じんこうが ぞうかする): dân số gia tăng. 急速に (nhanh chóng).',
  },
  {
    id: 'jlpt-vocab-n3-2',
    moduleId: 'vocab',
    level: 'N3',
    mondaiLabel: 'Mondai 4 · Từ đồng nghĩa',
    prompt: '彼女はいつも 【冷静に】 物事を判断する。',
    highlight: '冷静に',
    options: ['落ち着いて', '急いで', '厳しく', '明るく'],
    correctIndex: 0,
    explanation: '冷静に (れいせいに - bình tĩnh) đồng nghĩa với 落ち着いて (おちついて - điềm tĩnh).',
  },
  {
    id: 'jlpt-vocab-n3-3',
    moduleId: 'vocab',
    level: 'N3',
    mondaiLabel: 'Mondai 3 · Điền từ theo ngữ cảnh',
    prompt: 'アルバイトの時間が学校の授業と（　　）しまった。',
    options: ['重なって', '並んで', '続いて', '集まって'],
    correctIndex: 0,
    explanation: '時間が重なる (じかんが かさなる): thời gian bị trùng nhau.',
  },
  {
    id: 'jlpt-vocab-n3-4',
    moduleId: 'vocab',
    level: 'N3',
    mondaiLabel: 'Mondai 5 · Cách dùng từ',
    prompt: 'Từ 【せっかく】 được dùng đúng nhất trong câu nào?',
    highlight: 'せっかく',
    options: [
      'せっかく日本に来たのだから、富士山を見てみたい。',
      'せっかく朝ご飯を食べないほうがいいですよ。',
      'きのうはせっかく雨が降って、本当に困りました。',
      'せっかく会議が中止になったから、忘れないで。',
    ],
    correctIndex: 0,
    explanation: 'せっかく (cất công, nhân dịp hiếm có): mang sắc thái trân trọng cơ hội khó có được để làm việc tích cực.',
  },
];

/* ============================================================================
   3. GRAMMAR QUESTIONS (Curated N5 / N4 / N3 + Practice Bank Adapter)
   ============================================================================ */

const CURATED_GRAMMAR_QUESTIONS: JLPTMcqItem[] = [
  // N5
  {
    id: 'jlpt-grammar-n5-1',
    moduleId: 'grammar',
    level: 'N5',
    mondaiLabel: 'Mondai 1 · Ngữ pháp câu',
    prompt: 'わたしの たんじょうびは 5がつ（　　）です。',
    options: ['に', 'で', 'の', 'と'],
    correctIndex: 2,
    explanation: '5月 (gatsu) kết hợp trực tiếp với です hoặc dùng trợ từ の khi bổ nghĩa; trong N5 hỏi tháng/ngày dùng trực tiếp, nhưng ở câu "5月のだと思います" hoặc "5月の[3日]です" — sửa chuẩn nhất: わたしは きょうと（　）いきます -> chờ chút dùng chuẩn trợ từ N5.',
  },
  {
    id: 'jlpt-grammar-n5-2',
    moduleId: 'grammar',
    level: 'N5',
    mondaiLabel: 'Mondai 1 · Ngữ pháp câu',
    prompt: 'きょうは あつい（　　）、エアコンを つけましょう。',
    options: ['から', 'でも', 'のに', 'ほど'],
    correctIndex: 0,
    explanation: 'Tính từ đuôi い + から: diễn tả nguyên nhân – kết quả ("Vì hôm nay nóng nên hãy bật điều hòa").',
  },
  {
    id: 'jlpt-grammar-n5-3',
    moduleId: 'grammar',
    level: 'N5',
    mondaiLabel: 'Mondai 1 · Ngữ pháp câu',
    prompt: 'この へやに（　　）は いけません。',
    options: ['はいって', 'はいる', 'はいった', 'はいり'],
    correctIndex: 0,
    explanation: 'Vて + はいけません: diễn tả sự cấm đoán ("Không được phép vào phòng này").',
  },
  {
    id: 'jlpt-grammar-n5-4',
    moduleId: 'grammar',
    level: 'N5',
    mondaiLabel: 'Mondai 1 · Ngữ pháp câu',
    prompt: 'まいあさ 7じ（　　）おきます。',
    options: ['を', 'で', 'に', 'へ'],
    correctIndex: 2,
    explanation: 'Thời điểm cụ thể (7じ) đi với trợ từ に khi thực hiện hành động (おきます).',
  },
  // N4
  {
    id: 'jlpt-grammar-n4-1',
    moduleId: 'grammar',
    level: 'N4',
    mondaiLabel: 'Mondai 1 · Ngữ pháp câu',
    prompt: 'にほんに いく（　　）、日本語を べんきょうして います。',
    options: ['ために', 'ように', 'ながら', 'あとで'],
    correctIndex: 0,
    explanation: 'Vる + ために: chỉ mục đích mang tính ý chí ("Để đi Nhật, tôi đang học tiếng Nhật").',
  },
  {
    id: 'jlpt-grammar-n4-2',
    moduleId: 'grammar',
    level: 'N4',
    mondaiLabel: 'Mondai 1 · Ngữ pháp câu',
    prompt: '雨が ふり（　　）なので、かさを もって いきます。',
    options: ['そう', 'よう', 'らしい', 'みたい'],
    correctIndex: 0,
    explanation: 'Vます bỏ ます + そうだ: phán đoán trực quan sắp xảy ra ("Có vẻ sắp mưa nên tôi mang theo ô").',
  },
  {
    id: 'jlpt-grammar-n4-3',
    moduleId: 'grammar',
    level: 'N4',
    mondaiLabel: 'Mondai 1 · Ngữ pháp câu',
    prompt: 'あした テストが ある（　　）、ぜんぜん べんきょうして いません。',
    options: ['のに', 'ので', 'から', 'なら'],
    correctIndex: 0,
    explanation: 'Mệnh đề + のに: diễn tả sự trái ngược, bất mãn ("Mặc dù ngày mai có bài kiểm tra nhưng vẫn chưa học chút nào").',
  },
  {
    id: 'jlpt-grammar-n4-4',
    moduleId: 'grammar',
    level: 'N4',
    mondaiLabel: 'Mondai 1 · Ngữ pháp câu',
    prompt: 'おちゃでも（　　）ながら、ゆっくり はなしましょう。',
    options: ['のみ', 'のむ', 'のんで', 'のんだ'],
    correctIndex: 0,
    explanation: 'Vます bỏ ます + ながら: làm hai hành động song song ("Vừa uống trà vừa nói chuyện thong thả").',
  },
  // N3
  {
    id: 'jlpt-grammar-n3-1',
    moduleId: 'grammar',
    level: 'N3',
    mondaiLabel: 'Mondai 1 · Ngữ pháp câu',
    prompt: '電車に乗ろうとした（　　）、ドアが閉まってしまった。',
    options: ['ところに', 'ばかりに', 'わけに', 'かわりに'],
    correctIndex: 0,
    explanation: 'Vようとしたところに: đúng vào lúc vừa định làm gì đó thì việc khác xảy ra bất ngờ.',
  },
  {
    id: 'jlpt-grammar-n3-2',
    moduleId: 'grammar',
    level: 'N3',
    mondaiLabel: 'Mondai 1 · Ngữ pháp câu',
    prompt: '仕事が忙しくて、自分の時間がなかなか（　　）。',
    options: ['とれないものだ', 'とれるはずだ', 'とれないわけがない', 'とれるわけではない'],
    correctIndex: 3,
    explanation: 'Câu này dùng ngữ cảnh tự nhiên hơn với cấu trúc phân biệt sắc thái — xem bản kiểm chứng trước khi chốt.',
  },
];

// Normalize N5-1 and N3-2 so every single curated item is 100% grammatically natural
CURATED_GRAMMAR_QUESTIONS[0] = {
  id: 'jlpt-grammar-n5-1',
  moduleId: 'grammar',
  level: 'N5',
  mondaiLabel: 'Mondai 1 · Ngữ pháp câu',
  prompt: 'きのう としょかん（　　）ほんを かりました。',
  options: ['で', 'に', 'へ', 'を'],
  correctIndex: 0,
  explanation: 'Trợ từ で chỉ địa điểm diễn ra hành động ("Hôm qua tôi đã mượn sách ở thư viện").',
};

CURATED_GRAMMAR_QUESTIONS[9] = {
  id: 'jlpt-grammar-n3-2',
  moduleId: 'grammar',
  level: 'N3',
  mondaiLabel: 'Mondai 1 · Ngữ pháp câu',
  prompt: '高いからといって、必ずしも質がいい（　　）。',
  options: ['わけではない', 'はずがない', 'にちがいない', 'ことになっている'],
  correctIndex: 0,
  explanation: '～わけではない: không hẳn là / không có nghĩa là ("Không phải cứ đắt tiền thì chắc chắn chất lượng tốt").',
};

/* ============================================================================
   4. STAR QUESTIONS (Curated N5 / N4 + Shin Kanzen N3 Practice Bank Adapter)
   ============================================================================ */

const CURATED_STAR_QUESTIONS: JLPTStarItem[] = [
  // N5
  {
    id: 'jlpt-star-n5-1',
    level: 'N5',
    mondaiLabel: 'Mondai ★ · Sắp xếp câu',
    prefix: 'きのう',
    suffix: '。',
    chunks: [
      { id: 'c0', text: 'スーパーで', originalIndex: 0 },
      { id: 'c1', text: 'おいしい', originalIndex: 1 },
      { id: 'c2', text: 'りんごを', originalIndex: 2 },
      { id: 'c3', text: 'かいました', originalIndex: 3 },
    ],
    starIndex: 2,
    correctAnswer: 'りんごを',
    fullSentence: 'きのう スーパーで おいしい りんごを かいました。',
    meaning: 'Hôm qua tôi đã mua táo ngon ở siêu thị.',
    explanation: 'Trật tự tự nhiên: Thời gian (きのう) + Địa điểm + で (スーパーで) + Tính từ bổ nghĩa (おいしい) + Tân ngữ (りんごを) + Động từ (かいました). Vị trí ★ là りんごを.',
  },
  {
    id: 'jlpt-star-n5-2',
    level: 'N5',
    mondaiLabel: 'Mondai ★ · Sắp xếp câu',
    prefix: 'わたしの へやには',
    suffix: '。',
    chunks: [
      { id: 'c0', text: '大きい', originalIndex: 0 },
      { id: 'c1', text: 'つくえが', originalIndex: 1 },
      { id: 'c2', text: '一つ', originalIndex: 2 },
      { id: 'c3', text: 'あります', originalIndex: 3 },
    ],
    starIndex: 1,
    correctAnswer: 'つくえが',
    fullSentence: 'わたしの へやには 大きい つくえが 一つ あります。',
    meaning: 'Trong phòng tôi có một chiếc bàn lớn.',
    explanation: 'Cấu trúc tồn tại: Địa điểm + には + Tính từ (大きい) + Danh từ + が (つくえが) + Lượng từ (一つ) + あります. Vị trí ★ là つくえが.',
  },
  {
    id: 'jlpt-star-n5-3',
    level: 'N5',
    mondaiLabel: 'Mondai ★ · Sắp xếp câu',
    prefix: 'あした',
    suffix: 'と おもいます。',
    chunks: [
      { id: 'c0', text: 'ともだちと', originalIndex: 0 },
      { id: 'c1', text: 'えいがを', originalIndex: 1 },
      { id: 'c2', text: 'みに', originalIndex: 2 },
      { id: 'c3', text: 'いこう', originalIndex: 3 },
    ],
    starIndex: 2,
    correctAnswer: 'みに',
    fullSentence: 'あした ともだちと えいがを みに いこう と おもいます。',
    meaning: 'Ngày mai tôi định đi xem phim cùng bạn.',
    explanation: 'Mục đích đi đâu làm gì: えいがを みに (đi xem) + Thể ý định いこう + と おもいます. Vị trí ★ là みに.',
  },
  // N4
  {
    id: 'jlpt-star-n4-1',
    level: 'N4',
    mondaiLabel: 'Mondai ★ · Sắp xếp câu',
    prefix: '先生の',
    suffix: '書きました。',
    chunks: [
      { id: 'c0', text: 'おっしゃった', originalIndex: 0 },
      { id: 'c1', text: 'とおりに', originalIndex: 1 },
      { id: 'c2', text: 'ノートに', originalIndex: 2 },
      { id: 'c3', text: 'メモを', originalIndex: 3 },
    ],
    starIndex: 1,
    correctAnswer: 'とおりに',
    fullSentence: '先生の おっしゃった とおりに ノートに メモを 書きました。',
    meaning: 'Tôi đã ghi chú vào vở đúng theo những gì thầy giáo nói.',
    explanation: 'Cụm ～とおりに ("đúng theo...") nối sau động từ chia quá khứ おっしゃった → tiếp nối hành động ノートに メモを 書きました.',
  },
  {
    id: 'jlpt-star-n4-2',
    level: 'N4',
    mondaiLabel: 'Mondai ★ · Sắp xếp câu',
    prefix: '日本へ',
    suffix: 'なりました。',
    chunks: [
      { id: 'c0', text: '来てから', originalIndex: 0 },
      { id: 'c1', text: '日本語が', originalIndex: 1 },
      { id: 'c2', text: '少しずつ', originalIndex: 2 },
      { id: 'c3', text: '話せるように', originalIndex: 3 },
    ],
    starIndex: 2,
    correctAnswer: '少しずつ',
    fullSentence: '日本へ 来てから 日本語が 少しずつ 話せるように なりました。',
    meaning: 'Kể từ khi sang Nhật, tôi đã dần dần nói được tiếng Nhật.',
    explanation: 'Trạng từ 少しずつ (từng chút một) đứng trước động từ khả năng 話せるように なりました.',
  },
  {
    id: 'jlpt-star-n4-3',
    level: 'N4',
    mondaiLabel: 'Mondai ★ · Sắp xếp câu',
    prefix: 'このボタンを',
    suffix: 'わかります。',
    chunks: [
      { id: 'c0', text: '押して', originalIndex: 0 },
      { id: 'c1', text: 'みれば', originalIndex: 1 },
      { id: 'c2', text: '動くか', originalIndex: 2 },
      { id: 'c3', text: 'どうか', originalIndex: 3 },
    ],
    starIndex: 2,
    correctAnswer: '動くか',
    fullSentence: 'このボタンを 押して みれば 動くか どうか わかります。',
    meaning: 'Nếu thử bấm nút này thì sẽ biết nó có hoạt động hay không.',
    explanation: 'Vてみる (thử làm) + ば → Điều kiện; đi với mẫu nghi vấn ～か どうか ("có ... hay không"). Vị trí ★ là 動くか.',
  },
];

/* ============================================================================
   5. READING PASSAGES (Short / Medium / Long across N5 / N4 / N3)
   ============================================================================ */

const CURATED_READING_PASSAGES: JLPTReadingPassage[] = [
  // READING SHORT (Tanbun)
  {
    id: 'jlpt-rs-n5-1',
    moduleId: 'reading-short',
    level: 'N5',
    title: 'Bảng thông báo của cửa hàng sách',
    genre: 'Thông báo (お知らせ)',
    paragraphs: [
      {
        segments: [
          { text: 'さくら' },
          { text: '書店', furigana: 'しょてん' },
          { text: 'からのお知らせ' },
        ],
      },
      {
        segments: [
          { text: 'いつもご' },
          { text: '利用', furigana: 'りよう' },
          { text: 'ありがとうございます。' },
          { text: '来週', furigana: 'らいしゅう' },
          { text: 'の' },
          { text: '水曜日', furigana: 'すいようび' },
          { text: '（15' },
          { text: '日', furigana: 'にち' },
          { text: '）は、' },
          { text: '店内', furigana: 'てんない' },
          { text: 'の' },
          { text: '電気', furigana: 'でんき' },
          { text: 'の' },
          { text: '工事', furigana: 'こうじ' },
          { text: 'のため、お' },
          { text: '休', furigana: 'やす' },
          { text: 'みします。' },
        ],
      },
      {
        segments: [
          { text: '木曜日', furigana: 'もくようび' },
          { text: '（16' },
          { text: '日', furigana: 'にち' },
          { text: '）からは、いつもどおり' },
          { text: '午前', furigana: 'ごぜん' },
          { text: '10' },
          { text: '時', furigana: 'じ' },
          { text: 'から' },
          { text: '夜', furigana: 'よる' },
          { text: '9' },
          { text: '時', furigana: 'じ' },
          { text: 'まで' },
          { text: '開', furigana: 'あ' },
          { text: 'いています。よろしくお' },
          { text: '願', furigana: 'ねが' },
          { text: 'いいたします。' },
        ],
      },
    ],
    translation:
      'Thông báo từ hiệu sách Sakura.\nCảm ơn quý khách đã luôn sử dụng dịch vụ. Thứ Tư tuần tới (ngày 15), do sửa chữa hệ thống điện trong cửa hàng nên chúng tôi xin phép nghỉ.\nTừ thứ Năm (ngày 16), cửa hàng sẽ mở cửa như thường lệ từ 10 giờ sáng đến 9 giờ tối. Xin chân thành cảm ơn.',
    vocabNotes: [
      { word: '書店', reading: 'しょてん', meaning: 'hiệu sách' },
      { word: '工事', reading: 'こうじ', meaning: 'công trình, sửa chữa' },
      { word: 'いつもどおり', reading: 'いつもどおり', meaning: 'như thường lệ' },
    ],
    questions: [
      {
        id: 'jlpt-rs-n5-1-q1',
        prompt: '15日は どうして お休みですか。',
        options: [
          '店の 人が 休みたいからです。',
          '電気の 工事が あるからです。',
          '本が ぜんぶ 売れたからです。',
          '木曜日の じゅんびが あるからです。',
        ],
        correctIndex: 1,
        explanation: 'Đoạn văn ghi rõ: 「店内の電気の工事のため、お休みします。」 (Nghỉ do sửa chữa điện trong cửa hàng).',
      },
      {
        id: 'jlpt-rs-n5-1-q2',
        prompt: '16日の 午前10時半に 本を 買いに 行きます。店は どうですか。',
        options: [
          '開いて います。',
          'まだ 開いて いません。',
          '休みです。',
          '午後から 開きます。',
        ],
        correctIndex: 0,
        explanation: 'Từ thứ Năm ngày 16 mở cửa từ 10:00 sáng đến 9:00 tối nên 10:30 sáng cửa hàng đang mở.',
      },
    ],
  },
  {
    id: 'jlpt-rs-n4-1',
    moduleId: 'reading-short',
    level: 'N4',
    title: 'Email hẹn gặp cuối tuần',
    genre: 'Email cá nhân',
    paragraphs: [
      {
        segments: [{ text: '山田さんへ' }],
      },
      {
        segments: [
          { text: '今週', furigana: 'こんしゅう' },
          { text: 'の' },
          { text: '土曜日', furigana: 'どようび' },
          { text: '、いっしょに' },
          { text: '映画', furigana: 'えいが' },
          { text: 'を' },
          { text: '見', furigana: 'み' },
          { text: 'に' },
          { text: '行', furigana: 'い' },
          { text: 'く' },
          { text: '約束', furigana: 'やくそく' },
          { text: 'でしたが、すみません。' },
          { text: '急', furigana: 'きゅう' },
          { text: 'に' },
          { text: '大阪', furigana: 'おおさか' },
          { text: 'へ' },
          { text: '出張', furigana: 'しゅっちょう' },
          { text: 'することになりました。' },
        ],
      },
      {
        segments: [
          { text: '土曜日', furigana: 'どようび' },
          { text: 'の' },
          { text: '夜', furigana: 'よる' },
          { text: 'には' },
          { text: '帰', furigana: 'かえ' },
          { text: 'ってくる' },
          { text: '予定', furigana: 'よてい' },
          { text: 'なので、' },
          { text: '日曜日', furigana: 'にちようび' },
          { text: 'の' },
          { text: '午後', furigana: 'ごご' },
          { text: 'なら' },
          { text: '大丈夫', furigana: 'だいじょうぶ' },
          { text: 'です。' },
          { text: '日曜日', furigana: 'にちようび' },
          { text: 'に' },
          { text: '変更', furigana: 'へんこう' },
          { text: 'してもいいですか。' },
        ],
      },
    ],
    translation:
      'Gửi anh/chị Yamada,\nThứ Bảy tuần này chúng ta có hẹn cùng nhau đi xem phim, nhưng rất xin lỗi. Đột nhiên tôi phải đi công tác ở Osaka.\nDự kiến tối thứ Bảy tôi sẽ về, nên chiều Chủ nhật thì tôi rảnh. Chúng ta đổi sang Chủ nhật được không?',
    vocabNotes: [
      { word: '出張', reading: 'しゅっちょう', meaning: 'đi công tác' },
      { word: '変更する', reading: 'へんこうする', meaning: 'thay đổi' },
    ],
    questions: [
      {
        id: 'jlpt-rs-n4-1-q1',
        prompt: 'このメールを書いた人は、山田さんに何をお願いしていますか。',
        options: [
          '大阪へいっしょに来てほしい。',
          '映画を見に行く日を日曜日に変えてほしい。',
          '土曜日の夜に駅まで迎えに来てほしい。',
          '映画のチケットを一人で見てきてほしい。',
        ],
        correctIndex: 1,
        explanation: 'Người viết hỏi cuối email: 「日曜日に変更してもいいですか。」 (Đổi sang Chủ nhật được không?).',
      },
    ],
  },
  {
    id: 'jlpt-rs-n3-1',
    moduleId: 'reading-short',
    level: 'N3',
    title: 'Thông báo đổi phòng họp công ty',
    genre: 'Thông báo nội bộ',
    paragraphs: [
      {
        segments: [
          { text: '社員', furigana: 'しゃいん' },
          { text: 'の' },
          { text: '皆', furigana: 'みな' },
          { text: 'さまへ' },
        ],
      },
      {
        segments: [
          { text: '明日', furigana: 'あした' },
          { text: 'の' },
          { text: '午後', furigana: 'ごご' },
          { text: '2' },
          { text: '時', furigana: 'じ' },
          { text: 'から' },
          { text: '予定', furigana: 'よてい' },
          { text: 'されている' },
          { text: '新商品', furigana: 'しんしょうひん' },
          { text: 'の' },
          { text: '会議', furigana: 'かいぎ' },
          { text: 'は、' },
          { text: '参加者', furigana: 'さんかしゃ' },
          { text: 'が' },
          { text: '増', furigana: 'ふ' },
          { text: 'えたため、3' },
          { text: '階', furigana: 'かい' },
          { text: 'の「' },
          { text: '会議室', furigana: 'かいぎしつ' },
          { text: 'A」から5' },
          { text: '階', furigana: 'かい' },
          { text: 'の「' },
          { text: '大会議室', furigana: 'だいかいぎしつ' },
          { text: '」に' },
          { text: '変更', furigana: 'へんこう' },
          { text: 'します。' },
        ],
      },
      {
        segments: [
          { text: 'なお、' },
          { text: '開始時間', furigana: 'かいしじかん' },
          { text: 'の' },
          { text: '変更', furigana: 'へんこう' },
          { text: 'はありません。' },
          { text: '資料', furigana: 'しりょう' },
          { text: 'は' },
          { text: '会議室', furigana: 'かいぎしつ' },
          { text: 'で' },
          { text: '配', furigana: 'くば' },
          { text: 'りますので、' },
          { text: '各自', furigana: 'かくじ' },
          { text: '筆記用具', furigana: 'ひっきようぐ' },
          { text: 'のみお' },
          { text: '持', furigana: 'も' },
          { text: 'ちください。' },
        ],
      },
    ],
    translation:
      'Gửi toàn thể nhân viên,\nCuộc họp sản phẩm mới dự kiến diễn ra từ 2 giờ chiều mai sẽ được chuyển từ "Phòng họp A" tầng 3 sang "Phòng họp lớn" tầng 5 do số lượng người tham gia tăng lên.\nTuy nhiên, thời gian bắt đầu không thay đổi. Tài liệu sẽ được phát tại phòng họp nên mọi người chỉ cần tự mang theo đồ dùng viết.',
    vocabNotes: [
      { word: '参加者', reading: 'さんかしゃ', meaning: 'người tham gia' },
      { word: 'なお', reading: 'なお', meaning: 'hơn nữa, lưu ý thêm' },
      { word: '筆記用具', reading: 'ひっきようぐ', meaning: 'dụng cụ viết (bút, sổ)' },
    ],
    questions: [
      {
        id: 'jlpt-rs-n3-1-q1',
        prompt: '会議について正しいものはどれですか。',
        options: [
          '開始時間が午後2時から変更になった。',
          '資料は各自で印刷して持っていかなければならない。',
          '参加人数が増えたので、より広い部屋に変更された。',
          '3階の会議室Aで行われることになった。',
        ],
        correctIndex: 2,
        explanation: 'Vì số người tham gia tăng (参加者が増えたため) nên chuyển sang phòng họp lớn (大会議室) ở tầng 5.',
      },
    ],
  },

  // READING MEDIUM (Chuubun)
  {
    id: 'jlpt-rm-n5-1',
    moduleId: 'reading-medium',
    level: 'N5',
    title: 'Cuối tuần đi mua sắm cùng gia đình',
    genre: 'Nhật ký (日記)',
    paragraphs: [
      {
        segments: [
          { text: '先週', furigana: 'せんしゅう' },
          { text: 'の' },
          { text: '日曜日', furigana: 'にちようび' },
          { text: '、' },
          { text: '家族', furigana: 'かぞく' },
          { text: 'で' },
          { text: '駅', furigana: 'えき' },
          { text: 'の' },
          { text: '近', furigana: 'ちか' },
          { text: 'くのデパートへ' },
          { text: '行', furigana: 'い' },
          { text: 'きました。とてもいい' },
          { text: '天気', furigana: 'てんき' },
          { text: 'だったので、バスではなく、' },
          { text: '歩', furigana: 'ある' },
          { text: 'いて' },
          { text: '行', furigana: 'い' },
          { text: 'きました。' },
          { text: '家', furigana: 'いえ' },
          { text: 'からデパートまで20' },
          { text: '分', furigana: 'ふん' },
          { text: 'ぐらいかかりました。' },
        ],
      },
      {
        segments: [
          { text: 'デパートはたくさんの' },
          { text: '人', furigana: 'ひと' },
          { text: 'でにぎやかでした。まず、3' },
          { text: '階', furigana: 'かい' },
          { text: 'で' },
          { text: '父', furigana: 'ちち' },
          { text: 'の' },
          { text: '新', furigana: 'あたら' },
          { text: 'しいシャツを' },
          { text: '買', furigana: 'か' },
          { text: 'いました。それから、' },
          { text: '昼', furigana: 'ひる' },
          { text: 'ごはんに6' },
          { text: '階', furigana: 'かい' },
          { text: 'のレストランでラーメンを' },
          { text: '食', furigana: 'た' },
          { text: 'べました。わたしは' },
          { text: '野菜', furigana: 'やさい' },
          { text: 'がすきですから、' },
          { text: '野菜', furigana: 'やさい' },
          { text: 'ラーメンを' },
          { text: '頼', furigana: 'たの' },
          { text: 'みました。' },
        ],
      },
      {
        segments: [
          { text: '午後', furigana: 'ごご' },
          { text: 'は1' },
          { text: '階', furigana: 'かい' },
          { text: 'でお' },
          { text: '菓子', furigana: 'かし' },
          { text: 'とフルーツを' },
          { text: '買', furigana: 'か' },
          { text: 'って、4' },
          { text: '時', furigana: 'じ' },
          { text: 'ごろ' },
          { text: '電車', furigana: 'でんしゃ' },
          { text: 'で' },
          { text: '帰', furigana: 'かえ' },
          { text: 'りました。' },
          { text: '荷物', furigana: 'にもつ' },
          { text: 'が' },
          { text: '重', furigana: 'おも' },
          { text: 'かったですが、とても' },
          { text: '楽', furigana: 'たの' },
          { text: 'しい' },
          { text: '一日', furigana: 'いちにち' },
          { text: 'でした。' },
        ],
      },
    ],
    translation:
      'Chủ nhật tuần trước, tôi đã cùng gia đình đi đến trung tâm thương mại gần ga. Vì thời tiết rất đẹp nên chúng tôi không đi xe buýt mà đi bộ. Từ nhà đến đó mất khoảng 20 phút.\nTrung tâm thương mại rất đông đúc và nhộn nhịp. Đầu tiên, chúng tôi mua áo sơ mi mới cho bố ở tầng 3. Sau đó, cả nhà ăn trưa mì Ramen ở nhà hàng tầng 6. Vì thích rau nên tôi đã gọi mì Ramen rau.\nBuổi chiều, chúng tôi mua bánh kẹo và hoa quả ở tầng 1, rồi khoảng 4 giờ đi tàu điện về nhà. Hành lý khá nặng nhưng thật sự là một ngày rất vui.',
    vocabNotes: [
      { word: 'にぎやか', reading: 'にぎやか', meaning: 'náo nhiệt, đông vui' },
      { word: '頼む', reading: 'たのむ', meaning: 'gọi món, nhờ vả' },
      { word: '荷物', reading: 'にもつ', meaning: 'hành lý, đồ đạc' },
    ],
    questions: [
      {
        id: 'jlpt-rm-n5-1-q1',
        prompt: '家族は どうやって デパートへ 行きましたか。',
        options: [
          'バスで 行きました。',
          '電車で 行きました。',
          '歩いて 行きました。',
          '車で 行きました。',
        ],
        correctIndex: 2,
        explanation: 'Lúc đi gia đình chọn đi bộ vì thời tiết đẹp (バスではなく、歩いて行きました). Lúc về mới đi tàu điện.',
      },
      {
        id: 'jlpt-rm-n5-1-q2',
        prompt: 'どうして 電車で 家へ 帰りましたか。',
        options: [
          '天気が わるくなったからです。',
          '買い物を して 荷物が 重かったからです。',
          '午後 4時に なって 急いでいたからです。',
          'バスが なかったからです。',
        ],
        correctIndex: 1,
        explanation: 'Sau khi mua áo, bánh kẹo và hoa quả, hành lý nặng (荷物が重かった) nên cả nhà đi tàu về.',
      },
    ],
  },
  {
    id: 'jlpt-rm-n4-1',
    moduleId: 'reading-medium',
    level: 'N4',
    title: 'Thói quen đọc sách trên tàu điện',
    genre: 'Bài viết ngắn (エッセイ)',
    paragraphs: [
      {
        segments: [
          { text: '日本', furigana: 'にほん' },
          { text: 'では、' },
          { text: '電車', furigana: 'でんしゃ' },
          { text: 'の' },
          { text: '中', furigana: 'なか' },
          { text: 'でスマートフォンを' },
          { text: '見', furigana: 'み' },
          { text: 'ている' },
          { text: '人', furigana: 'ひと' },
          { text: 'が' },
          { text: '多', furigana: 'おお' },
          { text: 'いですが、' },
          { text: '紙', furigana: 'かみ' },
          { text: 'の' },
          { text: '本', furigana: 'ほん' },
          { text: 'を' },
          { text: '読', furigana: 'よ' },
          { text: 'んでいる' },
          { text: '人', furigana: 'ひと' },
          { text: 'もよく' },
          { text: '見', furigana: 'み' },
          { text: 'かけます。' },
          { text: '通勤', furigana: 'つうきん' },
          { text: 'や' },
          { text: '通学', furigana: 'つうがく' },
          { text: 'の' },
          { text: '時間', furigana: 'じかん' },
          { text: 'は' },
          { text: '毎日', furigana: 'まいにち' },
          { text: '同じ' },
          { text: 'なので、その' },
          { text: '時間', furigana: 'じかん' },
          { text: 'を' },
          { text: '大切', furigana: 'たいせつ' },
          { text: 'にしたいと' },
          { text: '考', furigana: 'かんが' },
          { text: 'える' },
          { text: '人', furigana: 'ひと' },
          { text: 'が' },
          { text: '多', furigana: 'おお' },
          { text: 'いからでしょう。' },
        ],
      },
      {
        segments: [
          { text: 'わたしも' },
          { text: '以前', furigana: 'いぜん' },
          { text: 'は' },
          { text: '電車', furigana: 'でんしゃ' },
          { text: 'の中でいつもニュースやゲームをしていましたが、' },
          { text: '目', furigana: 'め' },
          { text: 'が' },
          { text: '疲', furigana: 'つか' },
          { text: 'れやすくなりました。そこで、先月から' },
          { text: '小', furigana: 'ちい' },
          { text: 'さめの' },
          { text: '小説', furigana: 'しょうせつ' },
          { text: 'を' },
          { text: '持', furigana: 'も' },
          { text: 'ち' },
          { text: '歩', furigana: 'ある' },
          { text: 'くようにしました。' },
          { text: '片手', furigana: 'かたて' },
          { text: 'で' },
          { text: '持', furigana: 'も' },
          { text: 'てるサイズなので、' },
          { text: '立', furigana: 'た' },
          { text: 'っているときでも' },
          { text: '楽', furigana: 'らく' },
          { text: 'に' },
          { text: '読', furigana: 'よ' },
          { text: 'めます。' },
        ],
      },
    ],
    translation:
      'Ở Nhật Bản, trên tàu điện tuy có nhiều người nhìn điện thoại thông minh, nhưng cũng thường bắt gặp nhiều người đọc sách giấy. Có lẽ vì thời gian đi làm hay đi học mỗi ngày đều giống nhau, nên nhiều người muốn trân trọng khoảng thời gian đó.\nTrước đây trên tàu tôi cũng luôn đọc tin tức hay chơi game, nhưng mắt rất dễ bị mỏi. Vì thế từ tháng trước tôi đã tập mang theo tiểu thuyết khổ nhỏ. Vì kích cỡ cầm vừa một tay nên ngay cả khi đứng vẫn có thể đọc thoải mái.',
    vocabNotes: [
      { word: '通勤・通学', reading: 'つうきん・つうがく', meaning: 'đi làm・đi học' },
      { word: '持ち歩く', reading: 'もちあるく', meaning: 'mang theo bên mình' },
      { word: '片手', reading: 'かたて', meaning: 'một tay' },
    ],
    questions: [
      {
        id: 'jlpt-rm-n4-1-q1',
        prompt: '筆者は どうして 紙の本を 読むようになりましたか。',
        options: [
          'スマートフォンの料金が高くなったから。',
          'スマホを見ていると目が疲れやすくなったから。',
          '電車の中でゲームが禁止されたから。',
          '小説のほうがニュースより速く読めるから。',
        ],
        correctIndex: 1,
        explanation: 'Tác giả nêu rõ lý do: 「目が疲れやすくなりました。そこで、先月から小さめの小説を持ち歩くようにしました。」',
      },
      {
        id: 'jlpt-rm-n4-1-q2',
        prompt: '筆者が選んでいる本は どんな本ですか。',
        options: [
          '写真がたくさん入った大きい本',
          '片手で持てるサイズの小さい小説',
          '仕事に関係する専門書',
          '毎朝駅で配られるニュースの本',
        ],
        correctIndex: 1,
        explanation: '「小さめの小説」 và 「片手で持てるサイズなので、立っているときでも楽に読めます。」',
      },
    ],
  },
  {
    id: 'jlpt-rm-n3-1',
    moduleId: 'reading-medium',
    level: 'N3',
    title: 'Làm việc từ xa và ranh giới nghỉ ngơi',
    genre: 'Bài phân tích (解説文)',
    paragraphs: [
      {
        segments: [
          { text: '近年', furigana: 'きんねん' },
          { text: '、' },
          { text: '自宅', furigana: 'じたく' },
          { text: 'で' },
          { text: '仕事', furigana: 'しごと' },
          { text: 'をする「テレワーク」が' },
          { text: '広', furigana: 'ひろ' },
          { text: 'がっている。' },
          { text: '満員電車', furigana: 'まんいんでんしゃ' },
          { text: 'に' },
          { text: '乗', furigana: 'の' },
          { text: 'らなくてすむため、' },
          { text: '通勤', furigana: 'つうきん' },
          { text: 'のストレスが' },
          { text: '減', furigana: 'へ' },
          { text: 'り、' },
          { text: '自分', furigana: 'じぶん' },
          { text: 'のペースで' },
          { text: '働', furigana: 'はたら' },
          { text: 'けるというメリットがある。' },
        ],
      },
      {
        segments: [
          { text: 'しかし、' },
          { text: '一方', furigana: 'いっぽう' },
          { text: 'で「仕事とプライベートの' },
          { text: '区別', furigana: 'くべつ' },
          { text: 'がつきにくい」という' },
          { text: '課題', furigana: 'かだい' },
          { text: 'も' },
          { text: '指摘', furigana: 'してき' },
          { text: 'されている。' },
          { text: '会社', furigana: 'かいしゃ' },
          { text: 'に' },
          { text: '行', furigana: 'い' },
          { text: 'けば「' },
          { text: '家', furigana: 'いえ' },
          { text: 'を' },
          { text: '出', furigana: 'で' },
          { text: 'る」「' },
          { text: '帰宅', furigana: 'きたく' },
          { text: 'する」という' },
          { text: '行動', furigana: 'こうどう' },
          { text: 'が' },
          { text: '気分', furigana: 'きぶん' },
          { text: 'の' },
          { text: '切', furigana: 'き' },
          { text: 'り' },
          { text: '替', furigana: 'か' },
          { text: 'えになっていたが、' },
          { text: '自宅', furigana: 'じたく' },
          { text: 'では' },
          { text: '夜遅', furigana: 'よるおそ' },
          { text: 'くまでパソコンを' },
          { text: '開', furigana: 'ひら' },
          { text: 'いてしまいがちだ。' },
        ],
      },
      {
        segments: [
          { text: 'そのため、仕事用の机と' },
          { text: '休', furigana: 'やす' },
          { text: 'む' },
          { text: '場所', furigana: 'ばしょ' },
          { text: 'を分けたり、' },
          { text: '決', furigana: 'き' },
          { text: 'まった時間に' },
          { text: '散歩', furigana: 'さんぽ' },
          { text: 'をしたりするなど、' },
          { text: '意識的', furigana: 'いしきてき' },
          { text: 'に' },
          { text: '区切', furigana: 'くぎ' },
          { text: 'りをつける' },
          { text: '工夫', furigana: 'くふう' },
          { text: 'が' },
          { text: '求', furigana: 'もと' },
          { text: 'められている。' },
        ],
      },
    ],
    translation:
      'Gần đây, hình thức làm việc tại nhà "Telework" đang lan rộng. Vì không phải đi tàu điện chật chội, căng thẳng di chuyển giảm đi và có ưu điểm là làm việc theo nhịp độ riêng.\nTuy nhiên, mặt khác cũng có vấn đề được chỉ ra là "khó phân biệt giữa công việc và đời tư". Khi lên công ty, hành động "ra khỏi nhà" hay "về nhà" vốn là bước chuyển đổi tâm trạng, nhưng ở nhà người ta dễ có thói quen mở máy tính đến tận đêm khuya.\nVì vậy, việc chủ động tạo ra sự phân tách như tách riêng bàn làm việc với chỗ nghỉ ngơi, hoặc đi dạo vào giờ cố định đang rất cần thiết.',
    vocabNotes: [
      { word: '満員電車', reading: 'まんいんでんしゃ', meaning: 'tàu điện đông nghịt người' },
      { word: '切り替え', reading: 'きりかえ', meaning: 'sự chuyển đổi trạng thái' },
      { word: '区切りをつける', reading: 'くぎりをつける', meaning: 'tạo ranh giới rõ ràng' },
    ],
    questions: [
      {
        id: 'jlpt-rm-n3-1-q1',
        prompt: 'テレワークの課題として挙げられているのはどれですか。',
        options: [
          '通勤時間が長くなってストレスが増えること。',
          '自分のペースで仕事をすることがまったくできないこと。',
          '仕事と休みの時間の境界が曖昧になりやすいこと。',
          '会社のパソコンが自宅で使えないこと。',
        ],
        correctIndex: 2,
        explanation: 'Vấn đề được nêu ở đoạn 2 là khó phân biệt công việc và đời tư (仕事とプライベートの区別がつきにくい).',
      },
      {
        id: 'jlpt-rm-n3-1-q2',
        prompt: '筆者はテレワークをうまく続けるために何が必要だと述べていますか。',
        options: [
          '毎日必ず会社に一度顔を出すこと',
          '場所や時間を意識的に分けて気分を切り替えること',
          '夜遅くまで働いて昼間に長く寝ること',
          'パソコンを使わずに紙だけで仕事すること',
        ],
        correctIndex: 1,
        explanation: 'Đoạn cuối đề xuất tách nơi làm/nghỉ hoặc đi dạo theo giờ để chủ động phân tách công việc và nghỉ ngơi.',
      },
    ],
  },

  // READING LONG (Choubun)
  {
    id: 'jlpt-rl-n3-1',
    moduleId: 'reading-long',
    level: 'N3',
    title: 'Giá trị của việc "chờ đợi" trong thời đại tốc độ',
    genre: 'Luận văn (論説文)',
    paragraphs: [
      {
        segments: [
          { text: '今の社会では、どんなことでも「速く」できることが良いとされている。インターネットで注文すれば次の日には荷物が' },
          { text: '届', furigana: 'とど' },
          { text: 'き、メッセージを送れば数秒で返事が来る。便利な世の中になったおかげで、私たちは多くの時間を' },
          { text: '節約', furigana: 'せつやく' },
          { text: 'できるようになった。' },
        ],
      },
      {
        segments: [
          { text: 'ところが、このスピードに慣れすぎると、「待つこと」に対して必要以上にイライラしてしまう人が増えているように思う。電車の乗り換えで3分待つだけで' },
          { text: '不機嫌', furigana: 'ふきげん' },
          { text: 'になったり、料理がなかなか出てこないからといって店の人に強い口調で言ったりする光景も見かける。' },
        ],
      },
      {
        segments: [
          { text: 'しかし、本当は「待つ時間」にも大切な役割があるのではないだろうか。たとえば、手紙を書いて返事を待っている間、相手はどう思うだろうと' },
          { text: '想像', furigana: 'そうぞう' },
          { text: 'する楽しみがある。料理ができあがるまでの香りや音も、おいしさを' },
          { text: '引', furigana: 'ひ' },
          { text: 'き' },
          { text: '立', furigana: 'た' },
          { text: 'てる準備の時間と言える。' },
        ],
      },
      {
        segments: [
          { text: 'もちろん、仕事の締め切りや救急の場合にはスピードが何より重要だ。ただ、日常の小さな待ち時間まで「無駄」だと決めつけてしまうのはもったいない。少し深呼吸をして周りを見渡せば、待つ時間の中にも豊かな気づきが隠れているはずだ。' },
        ],
      },
    ],
    translation:
      'Trong xã hội ngày nay, việc làm mọi thứ "nhanh chóng" luôn được coi là tốt. Đặt hàng qua mạng hôm nay thì hôm sau hàng tới, gửi tin nhắn thì vài giây sau đã có hồi âm. Nhờ thế giới tiện lợi hơn, chúng ta tiết kiệm được rất nhiều thời gian.\nThế nhưng, khi quá quen với tốc độ này, dường như ngày càng nhiều người cáu kỉnh quá mức trước việc "chờ đợi". Ta dễ bắt gặp cảnh chỉ chờ chuyển tàu 3 phút đã bực bội, hay món ăn chưa kịp lên đã gắt gỏng với nhân viên.\nTuy nhiên, thực ra "thời gian chờ đợi" chẳng phải cũng có vai trò quan trọng hay sao? Chẳng hạn trong lúc viết thư và đợi hồi âm, có niềm vui tưởng tượng xem đối phương sẽ nghĩ gì. Hương thơm và âm thanh trước khi món ăn dọn ra cũng góp phần làm tăng độ ngon.\nTất nhiên với hạn chót công việc hay cấp cứu thì tốc độ là số một. Chỉ là nếu gán cho cả những khoảng chờ nhỏ nhặt hằng ngày là "vô ích" thì thật đáng tiếc. Chỉ cần hít thở sâu và nhìn xung quanh, ta sẽ thấy nhiều phát hiện thú vị ẩn ngay trong thời gian chờ đợi.',
    vocabNotes: [
      { word: '節約する', reading: 'せつやくする', meaning: 'tiết kiệm' },
      { word: '不機嫌', reading: 'ふきげん', meaning: 'khó chịu, cáu kỉnh' },
      { word: '引き立てる', reading: 'ひきたてる', meaning: 'làm nổi bật, tôn lên' },
    ],
    questions: [
      {
        id: 'jlpt-rl-n3-1-q1',
        prompt: '便利で速い社会になって、どんな問題が起きていると筆者は言っていますか。',
        options: [
          'インターネットの注文で荷物が届かないことが増えた。',
          '少し待つだけでイライラしたり怒ったりする人が増えた。',
          '電車の本数が減って乗り換えに時間がかかるようになった。',
          '手紙を書く人が増えたが返事が遅くなっている。',
        ],
        correctIndex: 1,
        explanation: 'Đoạn 2 nêu rõ: vì quá quen tốc độ nên người dễ cáu kỉnh khi phải chờ dù chỉ 3 phút.',
      },
      {
        id: 'jlpt-rl-n3-1-q2',
        prompt: '筆者が手紙や料理の例を出したのはなぜですか。',
        options: [
          '手紙や料理はできるだけ速く仕上げるべきだと伝えるため。',
          'レストランのサービスが悪い理由を説明するため。',
          '待つ時間にも楽しみや価値があることを示すため。',
          'メールより手紙のほうが仕事で役に立つと言うため。',
        ],
        correctIndex: 2,
        explanation: 'Đoạn 3 dùng ví dụ thư tay và món ăn để minh họa vai trò & giá trị của thời gian chờ đợi.',
      },
      {
        id: 'jlpt-rl-n3-1-q3',
        prompt: '筆者の考えに最も合っているものはどれですか。',
        options: [
          'どんな場面でもスピードよりゆっくりすることが大切だ。',
          '日常の待ち時間はすべて無駄なので減らすべきだ。',
          '緊急時以外は、待つ時間も味わいながら過ごすとよい。',
          'レストランでは料理が出てくるまでスマホを見るべきだ。',
        ],
        correctIndex: 2,
        explanation: 'Đoạn kết: trong công việc/khẩn cấp cần tốc độ, nhưng với khoảng chờ nhỏ hằng ngày thì nên thư giãn đón nhận thay vì coi là lãng phí.',
      },
    ],
  },
  {
    id: 'jlpt-rl-n4-1',
    moduleId: 'reading-long',
    level: 'N4',
    title: 'Kinh nghiệm học nấu ăn ở câu lạc bộ trường',
    genre: 'Bài văn tường thuật',
    paragraphs: [
      {
        segments: [
          { text: 'わたしは大学に入ってから、ずっと自分でりょうりを作りたいと思っていました。でも、アルバイトがいそがしくて、なかなか始めることができませんでした。そんなとき、学校のけいじばんで「りょうりクラブ」のポスターを見つけました。' },
        ],
      },
      {
        segments: [
          { text: 'クラブはまいしゅう木曜日の夕方5時から7時まで開かれています。さいしょはうまく切れるか心配でしたが、せんぱいがやさしく包丁の持ち方を教えてくれました。毎週いろいろな国のりょうりを作るので、日本人の学生だけでなく、留学生もたくさん参加しています。' },
        ],
      },
      {
        segments: [
          { text: '先月はカレーとぎょうざを作りました。ぎょうざの皮にぐを包むのはむずかしかったですが、みんなでおしゃべりしながら作ると、とても楽しかったです。今では家でも週に三回ぐらい自分で晩ごはんを作れるようになりました。' },
        ],
      },
    ],
    translation:
      'Từ khi vào đại học, tôi luôn muốn tự nấu ăn. Nhưng vì việc làm thêm bận rộn nên mãi chưa bắt đầu được. Đúng lúc đó, tôi thấy tấm áp phích "Câu lạc bộ nấu ăn" trên bảng thông báo của trường.\nCâu lạc bộ sinh hoạt từ 5 đến 7 giờ chiều thứ Năm hằng tuần. Ban đầu tôi lo không biết có thái đồ khéo không, nhưng các anh chị khóa trên đã chỉ tận tình cách cầm dao. Vì mỗi tuần nấu món của nhiều nước khác nhau nên không chỉ sinh viên Nhật mà nhiều du học sinh cũng tham gia.\nTháng trước chúng tôi làm cà ri và há cảo. Gói nhân vào vỏ há cảo khá khó, nhưng vừa trò chuyện vừa làm cùng mọi người rất vui. Giờ đây ở nhà tôi cũng đã tự nấu bữa tối khoảng 3 lần mỗi tuần.',
    vocabNotes: [
      { word: '掲示板', reading: 'けいじばん', meaning: 'bảng thông báo' },
      { word: '包丁', reading: 'ほうちょう', meaning: 'con dao làm bếp' },
    ],
    questions: [
      {
        id: 'jlpt-rl-n4-1-q1',
        prompt: 'わたしは どうして すぐに りょうりを 始められませんでしたか。',
        options: [
          '包丁を持っていなかったから。',
          'アルバイトが いそがしかったから。',
          'りょうりクラブが 木曜日にしかなかったから。',
          'せんぱいが こわかったから。',
        ],
        correctIndex: 1,
        explanation: 'Đoạn 1: 「でも、アルバイトがいそがしくて、なかなか始めることができませんでした。」',
      },
      {
        id: 'jlpt-rl-n4-1-q2',
        prompt: 'このクラブについて正しいものはどれですか。',
        options: [
          '毎週日本の伝統りょうりだけを作る。',
          '留学生もいっしょに参加している。',
          '毎週日曜日の朝に集まっている。',
          '今でも家ではまったく作れない。',
        ],
        correctIndex: 1,
        explanation: 'Đoạn 2: 「日本人の学生だけでなく、留学生もたくさん参加しています。」',
      },
    ],
  },
  {
    id: 'jlpt-rl-n5-1',
    moduleId: 'reading-long',
    level: 'N5',
    title: 'Bức thư gửi thầy giáo cũ',
    genre: 'Thư tay (手紙)',
    paragraphs: [
      {
        segments: [
          { text: '木村先生、お元気ですか。日本へ来てから、もう三か月になりました。東京での新しい生活には、だんだん慣れました。' },
        ],
      },
      {
        segments: [
          { text: 'わたしの大学は駅から歩いて十分ぐらいのところにあります。学校の周りはとても静かで、きれいな公園もあります。月曜日から金曜日まで、午前中は日本語のクラスで勉強して、午後は図書館で宿題をしたり、友達と話したりしています。' },
        ],
      },
      {
        segments: [
          { text: '先週の日曜日に、同じクラスのベトナム人の友達と浅草へ行きました。古いお寺を見たり、おいしいおみやげを買ったりして、とても楽しかったです。また来月もどこかへ旅行に行きたいと思っています。それでは、また手紙を書きます。' },
        ],
      },
    ],
    translation:
      'Thầy Kimura, thầy có khỏe không ạ? Kể từ khi em sang Nhật đến nay đã được 3 tháng rồi. Em cũng dần quen với cuộc sống mới ở Tokyo.\nTrường đại học của em cách ga khoảng 10 phút đi bộ. Xung quanh trường rất yên tĩnh và còn có công viên đẹp. Từ thứ Hai đến thứ Sáu, buổi sáng em học lớp tiếng Nhật, còn buổi chiều em làm bài tập ở thư viện hoặc trò chuyện với bạn bè.\nChủ nhật tuần trước, em đã đi Asakusa cùng người bạn Việt Nam chung lớp. Chúng em tham quan ngôi chùa cổ và mua quà lưu niệm ngon, rất vui. Tháng sau em cũng muốn đi du lịch đâu đó nữa. Vậy nhé, em sẽ viết thư tiếp cho thầy sau ạ.',
    vocabNotes: [
      { word: '慣れる', reading: 'なれる', meaning: 'quen với' },
      { word: 'お寺', reading: 'おてら', meaning: 'ngôi chùa' },
    ],
    questions: [
      {
        id: 'jlpt-rl-n5-1-q1',
        prompt: 'わたしは 平日の 午後、よく 何を していますか。',
        options: [
          'アルバイトを しています。',
          '図書館で 宿題をしたり 友達と話したり しています。',
          '浅草へ お寺を 見に 行っています。',
          '日本語の クラスで 授業を 受けています。',
        ],
        correctIndex: 1,
        explanation: 'Thư viết: 「午後は図書館で宿題をしたり、友達と話したりしています。」',
      },
      {
        id: 'jlpt-rl-n5-1-q2',
        prompt: '先週の 日曜日は だれと どこへ 行きましたか。',
        options: [
          '木村先生と 公園へ 行きました。',
          'クラスの 友達と 浅草へ 行きました。',
          'ひとりで 東京駅へ 行きました。',
          '家族と 図書館へ 行きました。',
        ],
        correctIndex: 1,
        explanation: '「同じクラスのベトナム人の友達と浅草へ行きました。」',
      },
    ],
  },
];

/* ============================================================================
   6. LISTENING QUESTIONS (N5 / N4 / N3 Multi-Speaker Dialogues)
   ============================================================================ */

const CURATED_LISTENING_ITEMS: JLPTListeningItem[] = [
  // N5
  {
    id: 'jlpt-lis-n5-1',
    level: 'N5',
    mondaiLabel: 'Mondai 1 · 課題理解 (Nghe nhiệm vụ)',
    situation: 'Tại lớp học tiếng Nhật, giáo viên dặn học sinh về bài tập ngày mai.',
    questionPrompt: 'がくせいは あした まず なにを 出さなければなりませんか。',
    dialogue: [
      {
        speaker: '先生',
        plainText: 'みなさん、あしたの しゅくだいは かんじの プリントです。さくぶんは 来週の 月曜日で いいですよ。',
        segments: [
          { text: 'みなさん、あしたの しゅくだいは かんじの プリントです。さくぶんは ' },
          { text: '来週', furigana: 'らいしゅう' },
          { text: 'の ' },
          { text: '月曜日', furigana: 'げつようび' },
          { text: 'で いいですよ。' },
        ],
      },
      {
        speaker: '学生',
        plainText: 'わかりました。かんじの プリントですね。',
        segments: [{ text: 'わかりました。かんじの プリントですね。' }],
      },
    ],
    options: [
      '漢字のプリント',
      '作文（さくぶん）',
      'テストの紙',
      '教科書',
    ],
    correctIndex: 0,
    translation:
      'Giáo viên: Mọi người ơi, bài tập ngày mai là tờ bài tập Kanji nhé. Còn bài văn thì thứ Hai tuần sau nộp cũng được.\nHọc sinh: Vâng em hiểu rồi. Tờ bài tập Kanji ạ.',
    explanation: 'Giáo viên nói rõ: bài tập ngày mai là 漢字のプリント, còn 作文 để sang thứ Hai tuần sau.',
  },
  {
    id: 'jlpt-lis-n5-2',
    level: 'N5',
    mondaiLabel: 'Mondai 3 · 即時応答 (Phản xạ nhanh)',
    situation: 'Trong văn phòng khi sắp tan làm.',
    questionPrompt: '「お先に 失礼します。」と 言われたら、なんと 答えますか。',
    dialogue: [
      {
        speaker: '同僚',
        plainText: 'きょうは これで おわります。お先に 失礼します。',
        segments: [
          { text: 'きょうは これで おわります。お' },
          { text: '先', furigana: 'さき' },
          { text: 'に ' },
          { text: '失礼', furigana: 'しつれい' },
          { text: 'します。' },
        ],
      },
    ],
    options: [
      'お疲れさまでした。',
      'いらっしゃいませ。',
      'いただきます。',
      'こちらこそ、お願いします。',
    ],
    correctIndex: 0,
    translation: 'Đồng nghiệp: Hôm nay tôi xin dừng ở đây. Tôi xin phép về trước ạ.',
    explanation: 'Khi ai đó chào về trước (お先に失礼します), câu đáp lịch sự chuẩn tiếng Nhật là 「お疲れさまでした。」',
  },
  // N4
  {
    id: 'jlpt-lis-n4-1',
    level: 'N4',
    mondaiLabel: 'Mondai 2 · ポイント理解 (Hiểu điểm chính)',
    situation: 'Hai bạn sinh viên nói chuyện về quán cà phê mới gần ga.',
    questionPrompt: '女の人は どうして その新しいカフェに よく 行きますか。',
    dialogue: [
      {
        speaker: '男',
        plainText: '駅前に 新しいカフェが できたね。あそこ、コーヒーが 安いの？',
        segments: [
          { text: '駅前', furigana: 'えきまえ' },
          { text: 'に ' },
          { text: '新', furigana: 'あたら' },
          { text: 'しいカフェが できたね。あそこ、コーヒーが ' },
          { text: '安', furigana: 'やす' },
          { text: 'いの？' },
        ],
      },
      {
        speaker: '女',
        plainText: 'ううん、ねだんは ふつうなんだけど、Wi-Fiがあって とても 静かなんだ。だから よく 勉強しに 行くの。',
        segments: [
          { text: 'ううん、ねだんは ふつうなんだけど、Wi-Fiがあって とても ' },
          { text: '静', furigana: 'しず' },
          { text: 'かなんだ。だから よく ' },
          { text: '勉強', furigana: 'べんきょう' },
          { text: 'しに ' },
          { text: '行', furigana: 'い' },
          { text: 'くの。' },
        ],
      },
    ],
    options: [
      'コーヒーが とても 安いから',
      '駅に いちばん 近くて にぎやかだから',
      'Wi-Fiがあって 静かで 勉強しやすいから',
      'ケーキが 無料（むりょう）だから',
    ],
    correctIndex: 2,
    translation:
      'Nam: Trước ga mới mở quán cà phê đấy nhỉ. Ở đó cà phê rẻ không?\nNữ: Không đâu, giá bình thường thôi, nhưng có Wi-Fi và rất yên tĩnh. Nên mình hay đến đó học bài.',
    explanation: 'Bạn nữ phủ nhận chuyện giá rẻ (ねだんは ふつう) và nêu lý do có Wi-Fi và yên tĩnh (静かなんだ) để học bài.',
  },
  {
    id: 'jlpt-lis-n4-2',
    level: 'N4',
    mondaiLabel: 'Mondai 1 · 課題理解 (Nghe nhiệm vụ)',
    situation: 'Tại siêu thị, nhân viên hướng dẫn khách tìm quầy bánh mì.',
    questionPrompt: 'パンの 売り場は どこに ありますか。',
    dialogue: [
      {
        speaker: '客',
        plainText: 'すみません、パンの 売り場は どちらですか。',
        segments: [
          { text: 'すみません、パンの ' },
          { text: '売', furigana: 'う' },
          { text: 'り' },
          { text: '場', furigana: 'ば' },
          { text: 'は どちらですか。' },
        ],
      },
      {
        speaker: '店員',
        plainText: 'この道を まっすぐ 行って、突き当たりの 野菜コーナーを 右に 曲がった ところです。',
        segments: [
          { text: 'この' },
          { text: '道', furigana: 'みち' },
          { text: 'を まっすぐ ' },
          { text: '行', furigana: 'い' },
          { text: 'って、' },
          { text: '突', furigana: 'つ' },
          { text: 'き' },
          { text: '当', furigana: 'あ' },
          { text: 'たりの ' },
          { text: '野菜', furigana: 'やさい' },
          { text: 'コーナーを ' },
          { text: '右', furigana: 'みぎ' },
          { text: 'に ' },
          { text: '曲', furigana: 'ま' },
          { text: 'がった ところです。' },
        ],
      },
    ],
    options: [
      '入口のすぐ左側',
      '突き当たりの野菜コーナーを右に曲がった所',
      '野菜コーナーを左に曲がった所',
      '2階のエスカレーターの前',
    ],
    correctIndex: 1,
    translation:
      'Khách: Xin lỗi, quầy bánh mì ở hướng nào ạ?\nNhân viên: Quý khách đi thẳng lối này, đến cuối đường chỗ góc rau củ rồi rẽ phải là tới ạ.',
    explanation: 'Nhân viên chỉ dẫn đi thẳng tới cuối đường (突き当たりの野菜コーナー) rồi rẽ phải (右に曲がったところ).',
  },
  // N3
  {
    id: 'jlpt-lis-n3-1',
    level: 'N3',
    mondaiLabel: 'Mondai 2 · ポイント理解 (Hiểu điểm chính)',
    situation: 'Hai nhân viên đang bàn về phương pháp thuyết trình cho khách hàng.',
    questionPrompt: '男の人は プレゼンの 資料について どう したら いいと 言っていますか。',
    dialogue: [
      {
        speaker: '女',
        plainText: '来週のプレゼン資料、数字やグラフを もっと 増やした ほうが いいでしょうか。',
        segments: [
          { text: '来週', furigana: 'らいしゅう' },
          { text: 'のプレゼン' },
          { text: '資料', furigana: 'しりょう' },
          { text: '、' },
          { text: '数字', furigana: 'すうじ' },
          { text: 'やグラフを もっと ' },
          { text: '増', furigana: 'ふ' },
          { text: 'やした ほうが いいでしょうか。' },
        ],
      },
      {
        speaker: '男',
        plainText: 'うーん、今のままでも データは 十分 そろっているよ。それより、文字が 小さくて 読みにくいから、1ページあたりの 情報量を 減らして すっきりさせた ほうが 伝わりやすいと思うな。',
        segments: [
          { text: 'うーん、' },
          { text: '今', furigana: 'いま' },
          { text: 'のままでも データは ' },
          { text: '十分', furigana: 'じゅうぶん' },
          { text: ' そろっているよ。それより、' },
          { text: '文字', furigana: 'もじ' },
          { text: 'が ' },
          { text: '小', furigana: 'ちい' },
          { text: 'さくて ' },
          { text: '読', furigana: 'よ' },
          { text: 'みにくいから、1ページあたりの ' },
          { text: '情報量', furigana: 'じょうほうりょう' },
          { text: 'を ' },
          { text: '減', furigana: 'へ' },
          { text: 'らして すっきりさせた ほうが ' },
          { text: '伝', furigana: 'つた' },
          { text: 'わりやすいと' },
          { text: '思', furigana: 'おも' },
          { text: 'うな。' },
        ],
      },
    ],
    options: [
      '数字やグラフの ページを もっと 増やす',
      '細かい データを すべて 削除して 作り直す',
      '1ページの情報量を減らして 読みやすく整理する',
      '文字を さらに 小さくして 1枚に まとめる',
    ],
    correctIndex: 2,
    translation:
      'Nữ: Tài liệu thuyết trình tuần sau có nên thêm nhiều số liệu và biểu đồ hơn không anh?\nNam: Ừm, để như hiện tại thì dữ liệu cũng đủ rồi. Thay vào đó, vì chữ hơi nhỏ khó đọc nên anh nghĩ giảm lượng thông tin mỗi trang cho gọn gàng sẽ dễ truyền đạt hơn.',
    explanation: 'Anh đồng nghiệp khuyên dữ liệu đã đủ (十分そろっている), cần giảm lượng thông tin mỗi trang cho thoáng (情報量を減らしてすっきりさせる).',
  },
  {
    id: 'jlpt-lis-n3-2',
    level: 'N3',
    mondaiLabel: 'Mondai 4 · 発話表現 / 即時応答',
    situation: 'Nhân viên nhận ra mình quên mang tài liệu cho cuộc họp với khách hàng.',
    questionPrompt: '部長に 何と 言いますか。',
    dialogue: [
      {
        speaker: '社員',
        plainText: 'すみません、部長。会議で 使う 資料を 机の上に 置いてきて しまいました。',
        segments: [
          { text: 'すみません、' },
          { text: '部長', furigana: 'ぶちょう' },
          { text: '。' },
          { text: '会議', furigana: 'かいぎ' },
          { text: 'で ' },
          { text: '使', furigana: 'つか' },
          { text: 'う ' },
          { text: '資料', furigana: 'しりょう' },
          { text: 'を ' },
          { text: '机', furigana: 'つくえ' },
          { text: 'の' },
          { text: '上', furigana: 'うえ' },
          { text: 'に ' },
          { text: '置', furigana: 'お' },
          { text: 'いてきて しまいました。' },
        ],
      },
      {
        speaker: '部長',
        plainText: '今から 取りに 戻ったら 間に合うかな。',
        segments: [
          { text: '今', furigana: 'いま' },
          { text: 'から ' },
          { text: '取', furigana: 'と' },
          { text: 'りに ' },
          { text: '戻', furigana: 'もど' },
          { text: 'ったら ' },
          { text: '間', furigana: 'ま' },
          { text: 'に' },
          { text: '合', furigana: 'あ' },
          { text: 'うかな。' },
        ],
      },
    ],
    options: [
      'はい、すぐに取りに戻ってまいります。',
      'いいえ、机の上に置いたままにしてください。',
      'はい、部長が取りに行ってくださいますか。',
      'すみません、そのまま会議を始めますか。',
    ],
    correctIndex: 0,
    translation:
      'Nhân viên: Xin lỗi trưởng phòng. Tôi lỡ để quên tài liệu dùng cho cuộc họp trên bàn mất rồi.\nTrưởng phòng: Bây giờ quay lại lấy liệu có kịp không nhỉ?',
    explanation: '「取りに戻ってまいります」 sử dụng khiêm nhường ngữ (まいります) phù hợp khi báo với cấp trên là mình sẽ lập tức quay lại lấy.',
  },
];

/* ============================================================================
   ADAPTERS PULLING REAL N3 / DATASET QUESTIONS DETERMINISTICALLY
   ============================================================================ */

function rotateSlice<T>(items: T[], offset: number, count: number): T[] {
  if (items.length === 0) return [];
  const res: T[] = [];
  for (let i = 0; i < count && i < items.length; i++) {
    res.push(items[(offset + i) % items.length]);
  }
  return res;
}

const kanjiDataset = kanjiDataRaw as KanjiItem[];

function buildDatasetKanjiMcqs(): JLPTMcqItem[] {
  const validByLevel = {
    N5: kanjiDataset.filter(
      (item) =>
        item.jlptLevel === 'N5' &&
        item.examples &&
        item.examples.length > 0 &&
        item.examples[0].word &&
        item.examples[0].hiragana &&
        item.examples[0].word !== item.examples[0].hiragana,
    ),
    N4: kanjiDataset.filter(
      (item) =>
        item.jlptLevel === 'N4' &&
        item.examples &&
        item.examples.length > 0 &&
        item.examples[0].word &&
        item.examples[0].hiragana &&
        item.examples[0].word !== item.examples[0].hiragana,
    ),
    N3: kanjiDataset.filter(
      (item) =>
        item.jlptLevel === 'N3' &&
        item.examples &&
        item.examples.length > 0 &&
        item.examples[0].word &&
        item.examples[0].hiragana &&
        item.examples[0].word !== item.examples[0].hiragana,
    ),
  };

  const validItems = [
    ...validByLevel.N5.slice(0, 12),
    ...validByLevel.N4.slice(0, 14),
    ...validByLevel.N3.slice(0, 14),
  ];

  const allHiragana = Array.from(
    new Set(
      [...validByLevel.N5, ...validByLevel.N4, ...validByLevel.N3]
        .map((item) => item.examples?.[0]?.hiragana || '')
        .filter(Boolean),
    ),
  );

  const generated: JLPTMcqItem[] = [];
  validItems.forEach((item, idx) => {
    const example = item.examples![0];
    const distractors = allHiragana.filter((h) => h !== example.hiragana);
    const picked = rotateSlice(distractors, idx * 3, 3);
    if (picked.length < 3) return;

    const correctPos = idx % 4;
    const optionsList = [...picked];
    optionsList.splice(correctPos, 0, example.hiragana);

    generated.push({
      id: `jlpt-kanji-data-${item.id}`,
      moduleId: 'kanji',
      level: item.jlptLevel as JLPTExamLevel,
      mondaiLabel: 'Mondai 1 · Đọc chữ Hán',
      prompt: `Từ 【${example.word}】 (${example.meaning}) đọc đúng là gì?`,
      highlight: example.word,
      options: optionsList as [string, string, string, string],
      correctIndex: correctPos,
      explanation: `${example.word} (${example.hiragana}): ${example.meaning}${item.hanViet ? ` — Âm Hán Việt: ${item.hanViet}` : ''}.`,
    });
  });

  return generated;
}

function buildDatasetVocabMcqs(): JLPTMcqItem[] {
  const n3Words = [
    ...unit1Data,
    ...N3_EXTRA_TEXTBOOK_UNITS.slice(0, 2).flatMap((d) =>
      buildMultiUnitVocab('N3', d.unitId, d.startId, d.words),
    ),
  ].filter(
    (w): w is (typeof unit1Data)[number] & { kanji: string } =>
      Boolean(w.kanji && w.hiragana && w.meaning),
  );
  const n4Words = N4_ALL_TEXTBOOK_UNITS.slice(0, 3)
    .flatMap((d) => buildMultiUnitVocab('N4', d.unitId, d.startId, d.words))
    .filter(
      (w): w is (typeof unit1Data)[number] & { kanji: string } =>
        Boolean(w.kanji && w.hiragana && w.meaning),
    );

  const buildForLevel = (lvl: 'N4' | 'N3', pool: typeof n3Words, count: number): JLPTMcqItem[] => {
    const allMeanings = Array.from(new Set(pool.map((w) => w.meaning)));
    return pool.slice(0, count).map((word, idx) => {
      const distractors = rotateSlice(
        allMeanings.filter((m) => m !== word.meaning),
        idx * 5,
        3,
      );
      const correctPos = idx % 4;
      const optionsList = [...distractors];
      optionsList.splice(correctPos, 0, word.meaning);

      return {
        id: `jlpt-vocab-${lvl.toLowerCase()}-ds-${word.id}`,
        moduleId: 'vocab',
        level: lvl,
        mondaiLabel: `Mondai 4 · Ý nghĩa từ vựng ${lvl}`,
        prompt: `Từ 【${word.kanji}（${word.hiragana}）】 có nghĩa là gì?`,
        highlight: word.kanji,
        options: optionsList as [string, string, string, string],
        correctIndex: correctPos,
        explanation: `${word.kanji} (${word.hiragana})${word.hanViet ? ` [${word.hanViet}]` : ''}: ${word.meaning}.`,
      };
    });
  };

  return [...buildForLevel('N4', n4Words, 14), ...buildForLevel('N3', n3Words, 16)];
}

function buildBankGrammarMcqs(): JLPTMcqItem[] {
  const items: JLPTMcqItem[] = [];
  const allRuleNames = new Map<string, string>();
  grammarBooks.forEach((book) =>
    book.chapters.forEach((ch) =>
      ch.grammars.forEach((g) => allRuleNames.set(g.id, g.name)),
    ),
  );

  Object.entries(lesson01PracticeBank).forEach(([ruleId, questions]) => {
    const mcQuestions = questions.filter(
      (q): q is MultipleChoiceQuestion =>
        (q.type === 'multiple_choice' || q.type === 'grammar_selection') &&
        Array.isArray(q.answers) &&
        q.answers.length === 4 &&
        typeof q.correctAnswer === 'string' &&
        q.answers.includes(q.correctAnswer),
    );

    mcQuestions.slice(0, 2).forEach((q) => {
      const correctIdx = q.answers.indexOf(q.correctAnswer);
      const ruleName = allRuleNames.get(ruleId) || ruleId;
      items.push({
        id: `jlpt-grammar-${q.id}`,
        moduleId: 'grammar',
        level: 'N3',
        mondaiLabel: `Mondai 1 · ${ruleName}`,
        prompt: q.question,
        options: q.answers as [string, string, string, string],
        correctIndex: correctIdx,
        explanation: q.explanation || `Đáp án đúng theo cấu trúc ${ruleName} là 「${q.correctAnswer}」.`,
      });
    });
  });

  return items;
}

function buildBankStarItems(): JLPTStarItem[] {
  const items: JLPTStarItem[] = [];

  Object.values(lesson01PracticeBank).forEach((questions) => {
    const starQs = questions.filter((q): q is StarQuestion => q.type === 'star_question');
    starQs.slice(0, 2).forEach((q) => {
      items.push({
        id: `jlpt-star-${q.id}`,
        level: 'N3',
        mondaiLabel: 'Mondai ★ · Shin Kanzen N3',
        prefix: q.sentenceParts?.prefix || '',
        suffix: q.sentenceParts?.suffix || '',
        chunks: q.chunks,
        starIndex: q.starIndex,
        correctAnswer: q.correctAnswer,
        fullSentence:
          q.metadata?.originalSentence ||
          `${q.sentenceParts?.prefix || ''}${q.chunks.map((c) => c.text).join('')}${q.sentenceParts?.suffix || ''}`,
        meaning: q.hint || '',
        explanation: q.explanation || `Đáp án đúng tại vị trí ★ là 「${q.correctAnswer}」.`,
      });
    });
  });

  return items;
}

const ALL_KANJI_MCQS: JLPTMcqItem[] = [
  ...MINNA_N5_KANJI_MCQS,
  ...CURATED_KANJI_QUESTIONS,
  ...PACK_KANJI_MCQS,
  ...buildDatasetKanjiMcqs(),
];
const ALL_VOCAB_MCQS: JLPTMcqItem[] = [
  ...MINNA_N5_VOCAB_MCQS,
  ...CURATED_VOCAB_QUESTIONS,
  ...PACK_VOCAB_MCQS,
  ...buildDatasetVocabMcqs(),
];
const ALL_GRAMMAR_MCQS: JLPTMcqItem[] = [
  ...MINNA_N5_GRAMMAR_MCQS,
  ...CURATED_GRAMMAR_QUESTIONS,
  ...PACK_GRAMMAR_MCQS,
  ...buildBankGrammarMcqs(),
];
const ALL_STAR_ITEMS: JLPTStarItem[] = [
  ...MINNA_N5_STAR_ITEMS,
  ...CURATED_STAR_QUESTIONS,
  ...PACK_STAR_ITEMS,
  ...buildBankStarItems(),
];
const ALL_READING_PASSAGES: JLPTReadingPassage[] = [
  ...MINNA_N5_READING_PASSAGES,
  ...CURATED_READING_PASSAGES,
  ...PACK_READING_PASSAGES,
  ...EXTRA_READING_PASSAGES_N5_N4_N3,
  ...SITUATION_READING_N5,
  ...SITUATION_READING_N4,
  ...SITUATION_READING_N3,
];
const ALL_LISTENING_ITEMS: JLPTListeningItem[] = [
  ...MINNA_N5_LISTENING_ITEMS,
  ...CURATED_LISTENING_ITEMS,
  ...PACK_LISTENING_ITEMS,
  ...EXTRA_LISTENING_ITEMS_N5_N4_N3,
  ...SITUATION_LISTENING_N5,
  ...SITUATION_LISTENING_N4,
  ...SITUATION_LISTENING_N3,
];

function filterByLevel<T extends { level: JLPTExamLevel }>(items: T[], level: JLPTLevelFilter): T[] {
  if (level === 'ALL') return items;
  return items.filter((item) => item.level === level);
}

export function getJLPTMcqQuestions(
  moduleId: 'kanji' | 'vocab' | 'grammar',
  level: JLPTLevelFilter,
): JLPTMcqItem[] {
  const source =
    moduleId === 'kanji'
      ? ALL_KANJI_MCQS
      : moduleId === 'vocab'
        ? ALL_VOCAB_MCQS
        : ALL_GRAMMAR_MCQS;
  return filterByLevel(source, level);
}

export function getJLPTStarQuestions(level: JLPTLevelFilter): JLPTStarItem[] {
  return filterByLevel(ALL_STAR_ITEMS, level);
}

export function getJLPTReadingPassages(
  moduleId: 'reading-short' | 'reading-medium' | 'reading-long',
  level: JLPTLevelFilter,
): JLPTReadingPassage[] {
  const ofModule = ALL_READING_PASSAGES.filter((p) => p.moduleId === moduleId);
  return filterByLevel(ofModule, level);
}

export function getJLPTListeningItems(level: JLPTLevelFilter): JLPTListeningItem[] {
  return filterByLevel(ALL_LISTENING_ITEMS, level);
}

export function toStarQuestionShape(item: JLPTStarItem, shuffleOrder = true): StarQuestion {
  const shuffledChunks = shuffleOrder
    ? [item.chunks[2], item.chunks[0], item.chunks[3], item.chunks[1]]
    : [...item.chunks];

  return {
    id: item.id,
    grammarId: 'JLPT_STAR',
    type: 'star_question',
    instruction: 'Sắp xếp 4 mảnh ghép thành câu hoàn chỉnh và chọn đáp án đúng cho vị trí ngôi sao (★):',
    question: '',
    sentenceParts: {
      prefix: item.prefix,
      suffix: item.suffix,
    },
    chunks: item.chunks,
    shuffledChunks,
    starIndex: item.starIndex,
    correctAnswer: item.correctAnswer,
    explanation: item.explanation,
    hint: item.meaning,
    metadata: {
      originalSentence: item.fullSentence,
    },
  };
}
