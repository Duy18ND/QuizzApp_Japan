import { grammarBooks } from '../data/grammar';
import { lesson01Sentences } from '../data/grammar/shinkanzen-n3/lesson01Sentences';
import { lesson02Sentences } from '../data/grammar/shinkanzen-n3/lesson02Sentences';
import type { FuriganaSegment, JLPTReadingPassage } from '../data/jlpt/jlptDataset';
import kanjiDatasetRaw from '../data/kanji/kanjiDataset.json';
import { unit1Data } from '../data/n3/unit1';
import type { KanjiItem } from '../types/kanji';

export interface LookupVocabMatch {
  word: string;
  reading: string;
  hanViet?: string;
  meaning: string;
  source: 'passage' | 'curriculum' | 'dictionary';
}

export interface LookupKanjiMatch {
  kanji: string;
  hanViet?: string;
  onReadings: string[];
  kunReadings: string[];
  meaning: string;
}

export interface LookupGrammarMatch {
  pattern: string;
  meaning: string;
  usage: string;
}

export interface JapaneseAnalysisResult {
  surface: string;
  reading: string;
  romaji: string;
  vocabMatches: LookupVocabMatch[];
  kanjiMatches: LookupKanjiMatch[];
  grammarMatches: LookupGrammarMatch[];
}

export interface PassageVocabNote {
  word: string;
  reading: string;
  meaning: string;
}

export interface InteractiveToken {
  id: string;
  text: string;
  segments: FuriganaSegment[];
  rubyMap: Record<string, string>;
  isPunctuation: boolean;
}

export interface InteractiveSentence {
  id: string;
  text: string;
  tokens: InteractiveToken[];
  rubyMap: Record<string, string>;
  translationHint?: string;
}

export interface TranslationResult {
  text: string;
  source: 'passage' | 'curriculum' | 'dictionary' | 'google' | 'fallback';
}

interface DictEntry {
  word: string;
  reading: string;
  hanViet?: string;
  meaning: string;
  source: 'curriculum' | 'dictionary';
}

interface GrammarPatternRule {
  pattern: string;
  triggers: string[];
  meaning: string;
  usage: string;
  minLength?: number;
}

const KANJI_CHAR_RE = /[\u4e00-\u9faf\u3400-\u4dbf]/;
const JAPANESE_CHAR_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF々ヶ]/;
const SENTENCE_END_CHARS = new Set(['。', '！', '？']);
const CLOSING_QUOTES = new Set(['」', '』', '）', ')']);
const PURE_PUNCT_RE = /^[\s。、．，,.!?！？「」『』（）()【】・〜~ー\-—…]+$/;

export function containsJapanese(text: string): boolean {
  return JAPANESE_CHAR_RE.test(text);
}

/* -------------------------------------------------------------------------- */
/* 1. Built-in N5-N3 Essential Dictionary & Sino-Vietnamese Kanji Map          */
/* -------------------------------------------------------------------------- */

const CORE_READING_DICT: Omit<DictEntry, 'source'>[] = [
  { word: '一日', reading: 'いちにち', hanViet: 'NHẤT NHẬT', meaning: 'một ngày (khoảng thời gian suốt cả ngày)' },
  { word: '一日中', reading: 'いちにちじゅう', hanViet: 'NHẤT NHẬT TRUNG', meaning: 'suốt cả ngày' },
  { word: '書店', reading: 'しょてん', hanViet: 'THƯ ĐIẾM', meaning: 'hiệu sách' },
  { word: 'ご利用', reading: 'ごりよう', hanViet: 'LỢI DỤNG', meaning: 'việc sử dụng (kính ngữ)' },
  { word: '利用', reading: 'りよう', hanViet: 'LỢI DỤNG', meaning: 'sử dụng, tận dụng' },
  { word: '来週', reading: 'らいしゅう', hanViet: 'LAI CHU', meaning: 'tuần tới' },
  { word: '先週', reading: 'せんしゅう', hanViet: 'TIÊN CHU', meaning: 'tuần trước' },
  { word: '今週', reading: 'こんしゅう', hanViet: 'KIM CHU', meaning: 'tuần này' },
  { word: '月曜日', reading: 'げつようび', hanViet: 'NGUYỆT DIỆU NHẬT', meaning: 'thứ Hai' },
  { word: '水曜日', reading: 'すいようび', hanViet: 'THỦY DIỆU NHẬT', meaning: 'thứ Tư' },
  { word: '木曜日', reading: 'もくようび', hanViet: 'MỘC DIỆU NHẬT', meaning: 'thứ Năm' },
  { word: '金曜日', reading: 'きんようび', hanViet: 'KIM DIỆU NHẬT', meaning: 'thứ Sáu' },
  { word: '土曜日', reading: 'どようび', hanViet: 'THỔ DIỆU NHẬT', meaning: 'thứ Bảy' },
  { word: '日曜日', reading: 'にちようび', hanViet: 'NHẬT DIỆU NHẬT', meaning: 'Chủ nhật' },
  { word: '店内', reading: 'てんない', hanViet: 'ĐIẾM NỘI', meaning: 'bên trong cửa hàng' },
  { word: '電気', reading: 'でんき', hanViet: 'ĐIỆN KHÍ', meaning: 'điện, đèn điện' },
  { word: '工事', reading: 'こうじ', hanViet: 'CÔNG SỰ', meaning: 'công trình, sửa chữa' },
  { word: 'お休み', reading: 'おやすみ', hanViet: 'HƯU', meaning: 'ngày nghỉ, nghỉ ngơi' },
  { word: '午前', reading: 'ごぜん', hanViet: 'NGỌ TIỀN', meaning: 'buổi sáng (AM)' },
  { word: '午後', reading: 'ごご', hanViet: 'NGỌ HẬU', meaning: 'buổi chiều (PM)' },
  { word: '開いています', reading: 'あいています', meaning: 'đang mở cửa' },
  { word: '開く', reading: 'あく', hanViet: 'KHAI', meaning: 'mở (tự động từ)' },
  { word: 'いつもどおり', reading: 'いつもどおり', meaning: 'như thường lệ' },
  { word: 'お願いいたします', reading: 'おねがいいたします', meaning: 'xin vui lòng, mong được thông cảm (khiêm nhường)' },
  { word: 'ありがとうございます', reading: 'ありがとうございます', meaning: 'xin chân thành cảm ơn' },
  { word: 'すみません', reading: 'すみません', meaning: 'xin lỗi' },
  { word: 'いっしょに', reading: 'いっしょに', meaning: 'cùng nhau' },
  { word: '映画', reading: 'えいが', hanViet: 'ẢNH HỌA', meaning: 'phim điện ảnh' },
  { word: '約束', reading: 'やくそく', hanViet: 'ƯỚC THÚC', meaning: 'lời hứa, cuộc hẹn' },
  { word: '急に', reading: 'きゅうに', hanViet: 'CẤP', meaning: 'đột nhiên, bất ngờ' },
  { word: '大阪', reading: 'おおさか', hanViet: 'ĐẠI PHẢN', meaning: 'Osaka' },
  { word: '出張', reading: 'しゅっちょう', hanViet: 'XUẤT TRƯƠNG', meaning: 'đi công tác' },
  { word: '予定', reading: 'よてい', hanViet: 'DỰ ĐỊNH', meaning: 'dự định, lịch trình' },
  { word: '大丈夫', reading: 'だいじょうぶ', hanViet: 'ĐẠI TRƯỢNG PHU', meaning: 'không sao, ổn' },
  { word: '変更', reading: 'へんこう', hanViet: 'BIẾN CANH', meaning: 'thay đổi, điều chỉnh' },
  { word: '社員', reading: 'しゃいん', hanViet: 'XÃ VIÊN', meaning: 'nhân viên công ty' },
  { word: '皆さま', reading: 'みなさま', hanViet: 'GIAI DẠNG', meaning: 'quý vị, mọi người (trang trọng)' },
  { word: '新商品', reading: 'しんしょうひん', hanViet: 'TÂN THƯƠNG PHẨM', meaning: 'sản phẩm mới' },
  { word: '会議', reading: 'かいぎ', hanViet: 'HỘI NGHỊ', meaning: 'cuộc họp' },
  { word: '参加者', reading: 'さんかしゃ', hanViet: 'THAM GIA GIẢ', meaning: 'người tham gia' },
  { word: '家族', reading: 'かぞく', hanViet: 'GIA TỘC', meaning: 'gia đình' },
  { word: 'デパート', reading: 'デパート', meaning: 'trung tâm thương mại' },
  { word: '天気', reading: 'てんき', hanViet: 'THIÊN KHÍ', meaning: 'thời tiết' },
  { word: 'バス', reading: 'バス', meaning: 'xe buýt' },
  { word: '電車', reading: 'でんしゃ', hanViet: 'ĐIỆN XA', meaning: 'tàu điện' },
  { word: '歩いて', reading: 'あるいて', meaning: 'đi bộ' },
  { word: 'シャツ', reading: 'シャツ', meaning: 'áo sơ mi' },
  { word: '昼ごはん', reading: 'ひるごはん', meaning: 'bữa trưa' },
  { word: 'レストラン', reading: 'レストラン', meaning: 'nhà hàng' },
  { word: 'ラーメン', reading: 'ラーメン', meaning: 'mì Ramen' },
  { word: '野菜', reading: 'やさい', hanViet: 'DÃ THÁI', meaning: 'rau củ' },
  { word: '頼みました', reading: 'たのみました', meaning: 'đã gọi món / đã nhờ' },
  { word: 'お菓子', reading: 'おかし', hanViet: 'QUẢ TỬ', meaning: 'bánh kẹo' },
  { word: 'フルーツ', reading: 'フルーツ', meaning: 'trái cây' },
  { word: '荷物', reading: 'にもつ', hanViet: 'HÀ VẬT', meaning: 'hành lý' },
  { word: '重い', reading: 'おもい', hanViet: 'TRỌNG', meaning: 'nặng' },
  { word: '重かった', reading: 'おもかった', meaning: 'đã nặng' },
  { word: '楽しい', reading: 'たのしい', hanViet: 'LẠC', meaning: 'vui vẻ' },
  { word: '買い物', reading: 'かいもの', hanViet: 'MÃI VẬT', meaning: 'việc mua sắm' },
  { word: 'にぎやか', reading: 'にぎやか', meaning: 'náo nhiệt, nhộn nhịp' },
  { word: '社会', reading: 'しゃかい', hanViet: 'XÃ HỘI', meaning: 'xã hội' },
  { word: '注文', reading: 'ちゅうもん', hanViet: 'CHÚ VĂN', meaning: 'đặt hàng, gọi món' },
  { word: '返事', reading: 'へんじ', hanViet: 'PHẢN SỰ', meaning: 'hồi âm, trả lời' },
  { word: '便利', reading: 'べんり', hanViet: 'TIỆN LỢI', meaning: 'tiện lợi' },
  { word: '節約', reading: 'せつやく', hanViet: 'TIẾT ƯỚC', meaning: 'tiết kiệm' },
  { word: '不機嫌', reading: 'ふきげん', hanViet: 'BẤT CƠ HIỀM', meaning: 'khó chịu, cáu kỉnh' },
  { word: '乗り換え', reading: 'のりかえ', hanViet: 'THỪA HOÁN', meaning: 'việc chuyển tàu/xe' },
  { word: '想像', reading: 'そうぞう', hanViet: 'TƯỞNG TƯỢNG', meaning: 'tưởng tượng' },
  { word: '料理', reading: 'りょうり', hanViet: 'LIỆU LÝ', meaning: 'món ăn, nấu ăn' },
  { word: '引き立てる', reading: 'ひきたてる', meaning: 'làm nổi bật, tôn lên' },
  { word: '準備', reading: 'じゅんび', hanViet: 'CHUẨN BỊ', meaning: 'chuẩn bị' },
  { word: '締め切り', reading: 'しめきり', meaning: 'hạn chót (deadline)' },
  { word: '救急', reading: 'きゅうきゅう', hanViet: 'CỨU CẤP', meaning: 'cấp cứu' },
  { word: '無駄', reading: 'むだ', hanViet: 'VÔ ĐÀ', meaning: 'lãng phí, vô ích' },
  { word: '深呼吸', reading: 'しんこきゅう', hanViet: 'THÂM HÔ HẤP', meaning: 'hít thở sâu' },
  { word: '大学', reading: 'だいがく', hanViet: 'ĐẠI HỌC', meaning: 'trường đại học' },
  { word: '図書館', reading: 'としょかん', hanViet: 'ĐỒ THƯ QUÁN', meaning: 'thư viện' },
  { word: '宿題', reading: 'しゅくだい', hanViet: 'TÚC ĐỀ', meaning: 'bài tập về nhà' },
  { word: '友達', reading: 'ともだち', hanViet: 'HỮU ĐẠT', meaning: 'bạn bè' },
  { word: '浅草', reading: 'あさくさ', hanViet: 'THIỂN THẢO', meaning: 'Asakusa (khu phố cổ ở Tokyo)' },
  { word: 'お寺', reading: 'おてら', hanViet: 'TỰ', meaning: 'ngôi chùa' },
  { word: 'おみやげ', reading: 'おみやげ', meaning: 'quà lưu niệm, đặc sản' },
  { word: '慣れる', reading: 'なれる', hanViet: 'QUÁN', meaning: 'quen với' },
  { word: '慣れました', reading: 'なれました', meaning: 'đã quen với' },
  { word: '時間', reading: 'じかん', hanViet: 'THỜI GIAN', meaning: 'thời gian, tiếng đồng hồ' },
  { word: '日本語', reading: 'にほんご', hanViet: 'NHẬT BẢN NGỮ', meaning: 'tiếng Nhật' },
  { word: '公園', reading: 'こうえん', hanViet: 'CÔNG VIÊN', meaning: 'công viên' },
  { word: '静か', reading: 'しずか', hanViet: 'TĨNH', meaning: 'yên tĩnh' },
  { word: 'ベトナム人', reading: 'ベトナムじん', meaning: 'người Việt Nam' },
  { word: '手紙', reading: 'てがみ', hanViet: 'THỦ CHỈ', meaning: 'bức thư' },
  { word: '旅行', reading: 'りょこう', hanViet: 'LỮ HÀNH', meaning: 'du lịch' },
  { word: '先生', reading: 'せんせい', hanViet: 'TIÊN SINH', meaning: 'thầy/cô giáo' },
  { word: '元気', reading: 'げんき', hanViet: 'NGUYÊN KHÍ', meaning: 'khỏe mạnh' },
  { word: '学校', reading: 'がっこう', hanViet: 'HỌC HIỆU', meaning: 'trường học' },
  { word: '日本', reading: 'にほん', hanViet: 'NHẬT BẢN', meaning: 'Nhật Bản' },
  { word: '生活', reading: 'せいかつ', hanViet: 'SINH HOẠT', meaning: 'sinh hoạt, cuộc sống' },
  { word: '運転免許', reading: 'うんてんめんきょ', hanViet: 'VẬN CHUYỂN MIỄN HỨA', meaning: 'bằng lái xe' },
  { word: '学生', reading: 'がくせい', hanViet: 'HỌC SINH', meaning: 'học sinh, sinh viên' },
  { word: '大切', reading: 'たいせつ', hanViet: 'ĐẠI THIẾT', meaning: 'quan trọng, quý giá' },
  { word: '必要', reading: 'ひつよう', hanViet: 'TẤT YẾU', meaning: 'cần thiết' },
  { word: '重要', reading: 'じゅうよう', hanViet: 'TRỌNG YẾU', meaning: 'trọng yếu, quan trọng' },
  { word: '毎日', reading: 'まいにち', hanViet: 'MỖI NHẬT', meaning: 'mỗi ngày' },
  { word: '毎週', reading: 'まいしゅう', hanViet: 'MỖI CHU', meaning: 'mỗi tuần' },
  { word: '来月', reading: 'らいげつ', hanViet: 'LAI NGUYỆT', meaning: 'tháng sau' },
  { word: '明日', reading: 'あした', hanViet: 'MINH NHẬT', meaning: 'ngày mai' },
  { word: '昨日', reading: 'きのう', hanViet: 'TẠC NHẬT', meaning: 'hôm qua' },
  { word: '今日', reading: 'きょう', hanViet: 'KIM NHẬT', meaning: 'hôm nay' },
  { word: '忘れ', reading: 'わすれ', hanViet: 'VONG', meaning: 'quên (gốc động từ 忘れる)' },
  { word: '忘れる', reading: 'わすれる', hanViet: 'VONG', meaning: 'quên' },
  { word: 'メモ', reading: 'メモ', meaning: 'ghi chú (memo)' },
  { word: 'して', reading: 'して', meaning: 'làm (thể て của する)' },
  { word: 'ください', reading: 'ください', meaning: 'xin hãy, vui lòng' },
  { word: '間に', reading: 'あいだに', hanViet: 'GIAN', meaning: 'trong khoảng lúc...' },
  { word: 'うちに', reading: 'うちに', meaning: 'nhân lúc..., trong lúc (trạng thái chưa đổi)' },
];

const KANJI_VI_GLOSS: Record<string, { hanViet: string; meaning: string }> = {
  一: { hanViet: 'NHẤT', meaning: 'một' },
  二: { hanViet: 'NHỊ', meaning: 'hai' },
  三: { hanViet: 'TAM', meaning: 'ba' },
  四: { hanViet: 'TỨ', meaning: 'bốn' },
  五: { hanViet: 'NGŨ', meaning: 'năm' },
  六: { hanViet: 'LỤC', meaning: 'sáu' },
  七: { hanViet: 'THẤT', meaning: 'bảy' },
  八: { hanViet: 'BÁT', meaning: 'tám' },
  九: { hanViet: 'CỬU', meaning: 'chín' },
  十: { hanViet: 'THẬP', meaning: 'mười' },
  日: { hanViet: 'NHẬT', meaning: 'ngày, mặt trời' },
  月: { hanViet: 'NGUYỆT', meaning: 'tháng, mặt trăng' },
  水: { hanViet: 'THỦY', meaning: 'nước' },
  木: { hanViet: 'MỘC', meaning: 'cây, gỗ' },
  金: { hanViet: 'KIM', meaning: 'tiền, vàng' },
  土: { hanViet: 'THỔ', meaning: 'đất' },
  曜: { hanViet: 'DIỆU', meaning: 'ngày trong tuần' },
  書: { hanViet: 'THƯ', meaning: 'viết, sách' },
  店: { hanViet: 'ĐIẾM', meaning: 'cửa hàng' },
  利: { hanViet: 'LỢI', meaning: 'lợi ích' },
  用: { hanViet: 'DỤNG', meaning: 'dùng, sử dụng' },
  来: { hanViet: 'LAI', meaning: 'đến, tới' },
  週: { hanViet: 'CHU', meaning: 'tuần lễ' },
  内: { hanViet: 'NỘI', meaning: 'bên trong' },
  電: { hanViet: 'ĐIỆN', meaning: 'điện' },
  気: { hanViet: 'KHÍ', meaning: 'khí, tinh thần' },
  工: { hanViet: 'CÔNG', meaning: 'công việc, kỹ thuật' },
  事: { hanViet: 'SỰ', meaning: 'việc, sự việc' },
  休: { hanViet: 'HƯU', meaning: 'nghỉ ngơi' },
  午: { hanViet: 'NGỌ', meaning: 'buổi trưa' },
  前: { hanViet: 'TIỀN', meaning: 'trước' },
  後: { hanViet: 'HẬU', meaning: 'sau' },
  時: { hanViet: 'THỜI', meaning: 'giờ, thời gian' },
  夜: { hanViet: 'DẠ', meaning: 'ban đêm, tối' },
  開: { hanViet: 'KHAI', meaning: 'mở' },
  願: { hanViet: 'NGUYỆN', meaning: 'mong muốn, nhờ' },
  今: { hanViet: 'KIM', meaning: 'hiện tại, nay' },
  映: { hanViet: 'ẢNH', meaning: 'chiếu, phản chiếu' },
  画: { hanViet: 'HỌA', meaning: 'tranh, hình ảnh' },
  見: { hanViet: 'KIẾN', meaning: 'nhìn, xem' },
  行: { hanViet: 'HÀNH', meaning: 'đi, thực hiện' },
  約: { hanViet: 'ƯỚC', meaning: 'hẹn, tiết kiệm' },
  束: { hanViet: 'THÚC', meaning: 'bó, ràng buộc' },
  急: { hanViet: 'CẤP', meaning: 'vội, gấp' },
  出: { hanViet: 'XUẤT', meaning: 'ra, xuất hiện' },
  張: { hanViet: 'TRƯƠNG', meaning: 'căng, mở rộng' },
  帰: { hanViet: 'QUY', meaning: 'trở về' },
  予: { hanViet: 'DỰ', meaning: 'dự báo, trước' },
  定: { hanViet: 'ĐỊNH', meaning: 'quyết định, ổn định' },
  大: { hanViet: 'ĐẠI', meaning: 'lớn, to' },
  丈: { hanViet: 'TRƯỢNG', meaning: 'trượng, chắc chắn' },
  夫: { hanViet: 'PHU', meaning: 'chồng, người đàn ông' },
  変: { hanViet: 'BIẾN', meaning: 'thay đổi' },
  更: { hanViet: 'CANH', meaning: 'đổi mới, càng' },
  社: { hanViet: 'XÃ', meaning: 'công ty, xã hội' },
  員: { hanViet: 'VIÊN', meaning: 'thành viên, nhân viên' },
  会: { hanViet: 'HỘI', meaning: 'gặp gỡ, họp' },
  議: { hanViet: 'NGHỊ', meaning: 'bàn bạc, thảo luận' },
  明: { hanViet: 'MINH', meaning: 'sáng, rõ ràng' },
  新: { hanViet: 'TÂN', meaning: 'mới' },
  商: { hanViet: 'THƯƠNG', meaning: 'buôn bán' },
  品: { hanViet: 'PHẨM', meaning: 'hàng hóa, phẩm chất' },
  参: { hanViet: 'THAM', meaning: 'tham gia' },
  加: { hanViet: 'GIA', meaning: 'thêm vào' },
  者: { hanViet: 'GIẢ', meaning: 'người' },
  増: { hanViet: 'TĂNG', meaning: 'tăng lên' },
  先: { hanViet: 'TIÊN', meaning: 'trước' },
  生: { hanViet: 'SINH', meaning: 'sinh sống, học sinh' },
  家: { hanViet: 'GIA', meaning: 'nhà, gia đình' },
  族: { hanViet: 'TỘC', meaning: 'họ hàng, gia tộc' },
  駅: { hanViet: 'DỊCH', meaning: 'nhà ga' },
  近: { hanViet: 'CẬN', meaning: 'gần' },
  天: { hanViet: 'THIÊN', meaning: 'trời' },
  歩: { hanViet: 'BỘ', meaning: 'đi bộ, bước' },
  分: { hanViet: 'PHÂN', meaning: 'phút, chia' },
  人: { hanViet: 'NHÂN', meaning: 'người' },
  階: { hanViet: 'GIAI', meaning: 'tầng lầu' },
  父: { hanViet: 'PHỤ', meaning: 'cha, bố' },
  買: { hanViet: 'MÃI', meaning: 'mua' },
  昼: { hanViet: 'TRÚ', meaning: 'buổi trưa' },
  食: { hanViet: 'THỰC', meaning: 'ăn, đồ ăn' },
  野: { hanViet: 'DÃ', meaning: 'cánh đồng, hoang dã' },
  菜: { hanViet: 'THÁI', meaning: 'rau' },
  頼: { hanViet: 'LẠI', meaning: 'nhờ vả, gọi món' },
  菓: { hanViet: 'QUẢ', meaning: 'trái cây, bánh kẹo' },
  子: { hanViet: 'TỬ', meaning: 'con, đứa trẻ' },
  車: { hanViet: 'XA', meaning: 'xe cộ' },
  荷: { hanViet: 'HÀ', meaning: 'hành lý, gánh' },
  物: { hanViet: 'VẬT', meaning: 'đồ vật' },
  重: { hanViet: 'TRỌNG', meaning: 'nặng, quan trọng' },
  楽: { hanViet: 'LẠC', meaning: 'vui vẻ, âm nhạc' },
  届: { hanViet: 'GIỚI', meaning: 'gửi tới, đến nơi' },
  便: { hanViet: 'TIỆN', meaning: 'tiện lợi, thư từ' },
  節: { hanViet: 'TIẾT', meaning: 'tiết kiệm, đốt' },
  想: { hanViet: 'TƯỞNG', meaning: 'nghĩ, tưởng tượng' },
  像: { hanViet: 'TƯỢNG', meaning: 'hình tượng' },
  料: { hanViet: 'LIỆU', meaning: 'nguyên liệu, phí' },
  理: { hanViet: 'LÝ', meaning: 'lý lẽ, xử lý' },
  引: { hanViet: 'DẪN', meaning: 'kéo, lôi cuốn' },
  立: { hanViet: 'LẬP', meaning: 'đứng, dựng lên' },
  学: { hanViet: 'HỌC', meaning: 'học tập' },
  校: { hanViet: 'HIỆU', meaning: 'trường học' },
  図: { hanViet: 'ĐỒ', meaning: 'bản đồ, hình vẽ' },
  館: { hanViet: 'QUÁN', meaning: 'tòa nhà' },
  宿: { hanViet: 'TÚC', meaning: 'trọ, bài tập' },
  題: { hanViet: 'ĐỀ', meaning: 'chủ đề, câu hỏi' },
  友: { hanViet: 'HỮU', meaning: 'bạn bè' },
  達: { hanViet: 'ĐẠT', meaning: 'đạt tới, nhóm' },
  寺: { hanViet: 'TỰ', meaning: 'chùa' },
  慣: { hanViet: 'QUÁN', meaning: 'quen thuộc' },
  語: { hanViet: 'NGỮ', meaning: 'ngôn ngữ, từ ngữ' },
  手: { hanViet: 'THỦ', meaning: 'tay' },
  紙: { hanViet: 'CHỈ', meaning: 'giấy' },
  旅: { hanViet: 'LỮ', meaning: 'du lịch' },
};

const BUILTIN_GRAMMAR_RULES: GrammarPatternRule[] = [
  { pattern: '～てからでないと', triggers: ['てからでないと', 'でからでないと'], meaning: 'Nếu chưa... thì không thể...', usage: 'Điều kiện tiên quyết: phải hoàn tất A trước thì B mới xảy ra/làm được.' },
  { pattern: '～おかげで', triggers: ['おかげで'], meaning: 'Nhờ vào..., nhờ có...', usage: 'Chỉ nguyên nhân đem lại kết quả tốt đẹp hoặc tích cực.' },
  { pattern: '～ことになりました', triggers: ['ことになりました', 'ことになります'], meaning: 'Đã được quyết định là...', usage: 'Diễn đạt quyết định khách quan từ tập thể/tổ chức hoặc hoàn cảnh bên ngoài.' },
  { pattern: '～ようになりました', triggers: ['ようになりました', 'ようになります'], meaning: 'Đã trở nên có thể / Đã thay đổi thành...', usage: 'Chỉ sự thay đổi trạng thái hoặc năng lực theo thời gian.' },
  { pattern: '～てしまいます', triggers: ['てしまいます', 'てしまいました', 'てしまう', 'ちゃった', 'でしまう', 'でしまった'], meaning: 'Làm xong mất / lỡ làm mất (tiếc nuối)', usage: 'Diễn tả hành động hoàn tất dứt điểm hoặc cảm giác lỡ làng, đáng tiếc.' },
  { pattern: '～てみる', triggers: ['てみます', 'てみました', 'てみて', 'てみたい', 'でみる'], meaning: 'Thử làm gì đó', usage: 'Diễn đạt hành động thử nghiệm để xem kết quả ra sao.' },
  { pattern: '～なければならない', triggers: ['なければならない', 'なければなりません', 'なくてはいけない'], meaning: 'Phải làm gì đó', usage: 'Diễn tả nghĩa vụ hoặc sự cần thiết bắt buộc.' },
  { pattern: '～てもいいですか', triggers: ['てもいいですか', 'でもいいですか', 'てもいい', 'でもいい'], meaning: 'Làm... có được không? / Được phép...', usage: 'Xin phép hoặc cho phép thực hiện hành động.' },
  { pattern: '～かもしれない', triggers: ['かもしれません', 'かもしれない'], meaning: 'Có lẽ, có thể là...', usage: 'Phỏng đoán với độ chắc chắn khoảng 50%.' },
  { pattern: '～たり～たりする', triggers: ['たり', 'だり'], meaning: 'Lúc thì..., lúc thì... / Nào là... nào là...', usage: 'Liệt kê các hành động, trạng thái tiêu biểu không theo thứ tự.' },
  { pattern: '～ている / ～ています', triggers: ['ています', 'ていました', 'ていますか', 'ている', 'でいます', 'でいる'], meaning: 'Đang làm... / Trạng thái kéo dài', usage: 'Hành động đang diễn ra, thói quen lặp lại hoặc trạng thái kết quả còn tiếp diễn.' },
  { pattern: '～たいです', triggers: ['たいです', 'たいと思', 'たい'], meaning: 'Muốn làm gì đó', usage: 'Gắn vào V-ます (bỏ ます) để biểu thị mong muốn của bản thân.' },
  { pattern: '～のために / ～ため', triggers: ['のため', 'ために', 'ため、', 'ため'], meaning: 'Vì / Do (nguyên nhân, mục đích)', usage: 'Đưa ra lý do trang trọng (N + のため) hoặc mục đích hành động.', minLength: 2 },
  { pattern: '～ですが / ～が', triggers: ['ですが', 'ますが', 'でしたが', 'でした。しかし'], meaning: 'Tuy nhiên..., nhưng...', usage: 'Mệnh đề nối mềm mại hoặc diễn tả sự tương phản (V/A/N + が).' },
  { pattern: '～ので', triggers: ['ので', 'なので'], meaning: 'Vì..., nên... (nguyên nhân khách quan)', usage: 'Nối nguyên nhân – kết quả mang sắc thái lịch sự, nhẹ nhàng hơn から.' },
  { pattern: '～から（理由）', triggers: ['からです', 'から、', 'だから'], meaning: 'Vì..., tại vì... (lý do chủ quan)', usage: 'Giải thích nguyên nhân hoặc đưa ra lý do cho phán đoán/yêu cầu.' },
  { pattern: '～から～まで', triggers: ['から', 'まで'], meaning: 'Từ... đến...', usage: 'Chỉ điểm bắt đầu (から) và giới hạn/điểm kết thúc (まで) về thời gian hoặc không gian.' },
  { pattern: '～のに', triggers: ['のに'], meaning: 'Mặc dù... thế nhưng mà...', usage: 'Thể hiện sự trái ngược kèm cảm giác ngạc nhiên hoặc trách móc.' },
  { pattern: '～ながら', triggers: ['ながら'], meaning: 'Vừa... vừa...', usage: 'Hai hành động do cùng một chủ thể thực hiện song song.' },
  { pattern: '～ばかり', triggers: ['ばかり'], meaning: 'Toàn là... / Vừa mới...', usage: 'Nhấn mạnh sự lặp đi lặp lại một thứ hoặc vừa mới xảy ra (V-たばかり).' },
  { pattern: '～だけ', triggers: ['だけ'], meaning: 'Chỉ...', usage: 'Giới hạn phạm vi (chỉ có từng này, không thêm).' },
  { pattern: '～ぐらい / ～くらい', triggers: ['ぐらい', 'くらい'], meaning: 'Khoảng chừng...', usage: 'Ước lượng số lượng, thời gian, mức độ khoảng chừng.' },
  { pattern: '～ごろ', triggers: ['ごろ'], meaning: 'Khoảng (mốc thời gian)', usage: 'Đi sau thời điểm cụ thể (4時ごろ = khoảng 4 giờ).' },
  { pattern: '～すぎます / ～すぎる', triggers: ['すぎます', 'すぎて', 'すぎる', 'すぎると'], meaning: 'Quá mức...', usage: 'Mức độ vượt quá ngưỡng bình thường (V-ます / A + すぎる).' },
  { pattern: '～て（nối câu / nguyên nhân）', triggers: ['て、', 'で、', 'して', 'って'], meaning: 'Rồi / Sau đó / Vì... nên...', usage: 'Thể て dùng để nối liên tiếp các hành động, phương tiện hoặc nguyên nhân nhẹ.' },
  { pattern: '～ました / ～ませんでした', triggers: ['ました', 'ませんでした', 'でした'], meaning: 'Thì quá khứ lịch sự', usage: 'Đuôi động từ/danh từ ở thì quá khứ dạng lịch sự (です/ます).' },
  { pattern: '～ます / ～ません', triggers: ['ません', 'ます'], meaning: 'Thì hiện tại / tương lai lịch sự', usage: 'Đuôi động từ thể khẳng định (ます) và phủ định (ません) lịch sự.' },
  { pattern: 'Trợ từ は (Chủ đề)', triggers: ['は'], meaning: 'Đánh dấu chủ đề câu', usage: 'Giới thiệu chủ đề đang được nói tới hoặc nhấn mạnh sự đối chiếu (đọc là wa).' },
  { pattern: 'Trợ từ が (Chủ ngữ)', triggers: ['が'], meaning: 'Đánh dấu chủ ngữ / đối tượng', usage: 'Xác định chủ thể thực hiện hành động, tính chất hoặc tân ngữ của thích/ghét/có/cần.' },
  { pattern: 'Trợ từ を (Tân ngữ)', triggers: ['を'], meaning: 'Đánh dấu tân ngữ trực tiếp', usage: 'Chỉ đối tượng chịu tác động trực tiếp của ngoại động từ (đọc là o).' },
  { pattern: 'Trợ từ に (Thời điểm / Hướng / Nơi tồn tại)', triggers: ['には', 'に'], meaning: 'Ở / Vào lúc / Tới / Cho', usage: 'Chỉ mốc thời gian xác định, đích đến, người nhận hoặc vị trí tồn tại (います/あります).' },
  { pattern: 'Trợ từ で (Phương tiện / Nơi diễn ra)', triggers: ['では', 'で'], meaning: 'Bằng (phương tiện) / Tại (nơi hành động)', usage: 'Chỉ công cụ/phương tiện di chuyển, nguyên nhân nhẹ hoặc địa điểm diễn ra hành động.' },
  { pattern: 'Trợ từ へ (Phương hướng)', triggers: ['へは', 'へ'], meaning: 'Hướng về / Tới', usage: 'Chỉ phương hướng di chuyển tới một địa điểm (đọc là e).' },
  { pattern: 'Trợ từ の (Sở hữu / Bổ nghĩa)', triggers: ['の'], meaning: 'Của / Danh từ hóa', usage: 'Nối hai danh từ (A của B) hoặc biến cụm mệnh đề trước thành danh từ.' },
  { pattern: 'Trợ từ と (Cùng với / Liệt kê / Trích dẫn)', triggers: ['と'], meaning: 'Và / Cùng với / Rằng', usage: 'Liệt kê đầy đủ (A và B), làm cùng ai đó, hoặc đánh dấu nội dung trích dẫn.' },
];

/* Build unified fast lookup maps once at module load */
const KANJI_DATASET_MAP = new Map<string, KanjiItem>();
(kanjiDatasetRaw as KanjiItem[]).forEach((item) => {
  KANJI_DATASET_MAP.set(item.kanji, item);
});

const VOCAB_ENTRIES: DictEntry[] = (() => {
  const map = new Map<string, DictEntry>();
  const addEntry = (e: DictEntry) => {
    if (!e.word) return;
    if (!map.has(e.word)) {
      map.set(e.word, e);
    }
  };

  for (const w of unit1Data) {
    const surface = (w.kanji || w.hiragana || '').trim();
    if (!surface) continue;
    addEntry({
      word: surface,
      reading: (w.hiragana || surface).trim(),
      hanViet: w.hanViet || undefined,
      meaning: w.meaning,
      source: 'curriculum',
    });
  }

  for (const c of CORE_READING_DICT) {
    addEntry({ ...c, source: 'dictionary' });
  }

  return Array.from(map.values()).sort((a, b) => b.word.length - a.word.length);
})();

const VOCAB_BY_WORD = new Map<string, DictEntry>(VOCAB_ENTRIES.map((e) => [e.word, e]));

const SENTENCE_TRANSLATION_INDEX = (() => {
  const map = new Map<string, string>();
  for (const rec of [...lesson01Sentences, ...lesson02Sentences]) {
    if (rec.japanese && rec.vietnamese) {
      map.set(rec.japanese.trim(), rec.vietnamese.trim());
    }
  }
  return map;
})();

const CURATED_GRAMMAR_RULES = grammarBooks.flatMap((book) =>
  book.chapters.flatMap((ch) => ch.grammars),
);

/* -------------------------------------------------------------------------- */
/* 2. Kana <-> Romaji & Context-Aware Reading Resolution                       */
/* -------------------------------------------------------------------------- */

const DIGRAPH_MAP: Record<string, string> = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo',
  てぃ: 'ti', でぃ: 'di', じぇ: 'je', しぇ: 'she', ちぇ: 'che',
};

const KANA_MAP: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
  ゃ: 'ya', ゅ: 'yu', ょ: 'yo',
};

function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );
}

function toHalfWidthAlnum(str: string): string {
  return str.replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
}

export function kanaToRomaji(input: string): string {
  const normalized = toHalfWidthAlnum(katakanaToHiragana(input));
  let out = '';
  let doubleNext = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === 'っ') {
      doubleNext = true;
      continue;
    }
    if (ch === 'ー') {
      const last = out[out.length - 1];
      if (last && 'aeiou'.includes(last)) out += last;
      continue;
    }

    const pair = normalized.slice(i, i + 2);
    let romaji = DIGRAPH_MAP[pair];
    if (romaji) {
      i += 1;
    } else {
      romaji = KANA_MAP[ch];
    }

    if (romaji) {
      if (doubleNext) {
        out += romaji.startsWith('ch') ? 't' : romaji[0];
        doubleNext = false;
      }
      out += romaji;
    } else {
      doubleNext = false;
      if (ch === '。') out += '. ';
      else if (ch === '、') out += ', ';
      else if (ch === '？') out += '?';
      else if (ch === '！') out += '!';
      else if (ch === '「' || ch === '」' || ch === '（' || ch === '）') out += ' ';
      else out += ch;
    }
  }

  return out.replace(/\s+/g, ' ').trim();
}

function resolveIchinichiContext(text: string, fullContext?: string): string {
  const ctx = fullContext || text;
  // Calendar date like 4月一日 or 一日に... -> ついたち; otherwise default duration context -> いちにち
  if (/[0-9０-９一二三四五六七八九十]+月一日/.test(ctx)) {
    return 'ついたち';
  }
  return 'いちにち';
}

export function computeReadingAndRomaji(
  surface: string,
  options?: { rubyMap?: Record<string, string>; sentenceContext?: string },
): { reading: string; romaji: string } {
  const clean = surface.trim();
  if (!clean) return { reading: '', romaji: '' };

  const rubyMap = options?.rubyMap || {};
  const ctx = options?.sentenceContext || clean;

  // Build ordered match pairs: DOM rubyMap first (most accurate for current passage), then dictionary
  const dynamicEntries: Array<[string, string]> = Object.entries(rubyMap)
    .filter(([base, rt]) => Boolean(base && rt))
    .map(([base, rt]) => [base, base === '一日' && !/[0-9]+月一日/.test(ctx) ? resolveIchinichiContext(clean, ctx) : rt]);

  if (clean.includes('一日') && !rubyMap['一日']) {
    dynamicEntries.push(['一日', resolveIchinichiContext(clean, ctx)]);
  }

  const combinedPairs: Array<[string, string]> = [
    ...dynamicEntries,
    ...VOCAB_ENTRIES.map((e): [string, string] => [e.word, e.reading]),
  ].sort((a, b) => b[0].length - a[0].length);

  let reading = '';
  const romajiTokens: string[] = [];
  let pendingKana = '';

  const flushPendingKana = () => {
    if (!pendingKana) return;
    reading += pendingKana;
    // Add clean spaces around standalone particle transitions inside longer kana runs
    const spaced = pendingKana.replace(/(を|は|が|に|で|へ|と)/g, ' $1 ').trim();
    const rom = kanaToRomaji(spaced);
    if (rom) romajiTokens.push(rom);
    pendingKana = '';
  };

  for (let i = 0; i < clean.length; ) {
    let matched: [string, string] | undefined;
    for (const entry of combinedPairs) {
      if (clean.startsWith(entry[0], i)) {
        matched = entry;
        break;
      }
    }

    if (matched) {
      flushPendingKana();
      reading += matched[1];
      const r = kanaToRomaji(matched[1]);
      if (r) romajiTokens.push(r);
      i += matched[0].length;
    } else {
      const ch = clean[i];
      if (KANJI_CHAR_RE.test(ch)) {
        const ds = KANJI_DATASET_MAP.get(ch);
        const rawKun = ds?.kunReadings?.[0]?.split('.')[0]?.replace(/-/g, '');
        const rawOn = ds?.onReadings?.[0]?.replace(/-/g, '');
        const fallbackKana = katakanaToHiragana(rawKun || rawOn || '');
        if (fallbackKana) {
          flushPendingKana();
          reading += fallbackKana;
          const r = kanaToRomaji(fallbackKana);
          if (r) romajiTokens.push(r);
          i += 1;
          continue;
        }
      }
      pendingKana += ch;
      i += 1;
    }
  }
  flushPendingKana();

  const finalRomaji = romajiTokens.filter(Boolean).join(' ').replace(/\s+([,.!?])/g, '$1').trim();
  return { reading: reading.trim(), romaji: finalRomaji };
}

/* -------------------------------------------------------------------------- */
/* 3. Vocab, Kanji & Grammar Analysis Engine                                   */
/* -------------------------------------------------------------------------- */

export function analyzeJapaneseText(
  surface: string,
  options?: {
    rubyMap?: Record<string, string>;
    sentenceContext?: string;
    passageVocab?: PassageVocabNote[];
  },
): JapaneseAnalysisResult {
  const clean = surface.trim();
  const rubyMap = options?.rubyMap || {};
  const { reading, romaji } = computeReadingAndRomaji(clean, options);

  // 1. Match Vocabulary (Passage vocabNotes + Curriculum unit1Data + Core JLPT Dict) in reading order
  const vocabMatches: LookupVocabMatch[] = [];
  const seenVocab = new Set<string>();
  const matchedSpans: Array<[number, number]> = [];
  const isOverlappingSpan = (idx: number, len: number) =>
    matchedSpans.some(([s, e]) => idx >= s && idx + len <= e);

  if (options?.passageVocab) {
    for (const note of options.passageVocab) {
      const idx = clean.indexOf(note.word);
      if (idx !== -1 || note.word === clean) {
        seenVocab.add(note.word);
        if (idx !== -1) matchedSpans.push([idx, idx + note.word.length]);
        vocabMatches.push({
          word: note.word,
          reading: note.reading,
          meaning: note.meaning,
          source: 'passage',
        });
      }
    }
  }

  // Find longest matching vocabulary terms ordered left-to-right across the selected phrase
  const foundPositions: Array<{ idx: number; entry: DictEntry }> = [];
  for (let pos = 0; pos < clean.length; ) {
    let hit: DictEntry | undefined;
    for (const entry of VOCAB_ENTRIES) {
      if (clean.startsWith(entry.word, pos)) {
        hit = entry;
        break;
      }
    }
    if (hit) {
      if (!seenVocab.has(hit.word) && !isOverlappingSpan(pos, hit.word.length)) {
        seenVocab.add(hit.word);
        matchedSpans.push([pos, pos + hit.word.length]);
        foundPositions.push({ idx: pos, entry: hit });
      }
      pos += hit.word.length;
    } else {
      pos += 1;
    }
  }

  for (const { entry } of foundPositions) {
    if (vocabMatches.length >= 8) break;
    const overrideReading =
      entry.word === '一日'
        ? resolveIchinichiContext(clean, options?.sentenceContext)
        : rubyMap[entry.word] || entry.reading;

    vocabMatches.push({
      word: entry.word,
      reading: overrideReading,
      hanViet: entry.hanViet,
      meaning: entry.meaning,
      source: entry.source,
    });
  }

  // 2. Match Kanji breakdown
  const kanjiMatches: LookupKanjiMatch[] = [];
  const seenKanji = new Set<string>();
  for (const ch of clean) {
    if (!KANJI_CHAR_RE.test(ch) || seenKanji.has(ch)) continue;
    seenKanji.add(ch);
    const ds = KANJI_DATASET_MAP.get(ch);
    const gloss = KANJI_VI_GLOSS[ch];
    if (ds || gloss) {
      kanjiMatches.push({
        kanji: ch,
        hanViet: gloss?.hanViet || ds?.hanViet || undefined,
        onReadings: ds?.onReadings?.slice(0, 3) || [],
        kunReadings: ds?.kunReadings?.slice(0, 3) || [],
        meaning: gloss?.meaning || (ds?.meanings?.length ? ds.meanings.slice(0, 3).join(', ') : 'Chữ Hán thông dụng'),
      });
    }
    if (kanjiMatches.length >= 6) break;
  }

  // 3. Match Grammar & Particle patterns (Shin Kanzen N3 rules + Built-in N5-N3 patterns)
  const grammarMatches: LookupGrammarMatch[] = [];
  const seenPatterns = new Set<string>();

  for (const rule of CURATED_GRAMMAR_RULES) {
    const bare = rule.hiragana.replace(/[～〜~\s]/g, '');
    if (bare.length >= 2 && clean.includes(bare)) {
      seenPatterns.add(rule.name);
      grammarMatches.push({
        pattern: rule.name,
        meaning: rule.meaning,
        usage: rule.templates?.[0] ? `${rule.level} · Mẫu: ${rule.templates[0]}` : `${rule.level} · Ngữ pháp`,
      });
    }
  }

  const matchedRanges: Array<[number, number]> = [];
  const overlapsCovered = (start: number, len: number) =>
    matchedRanges.some(([s, e]) => start >= s && start + len <= e);

  for (const gp of BUILTIN_GRAMMAR_RULES) {
    if (seenPatterns.has(gp.pattern)) continue;
    if (gp.minLength && clean.length < gp.minLength) continue;

    for (const trig of gp.triggers) {
      const idx = clean.indexOf(trig);
      if (idx === -1) continue;
      // Only match 1-char particles when not covered by a longer grammar pattern or single word match
      if (trig.length === 1 && overlapsCovered(idx, 1)) continue;
      if (trig.length === 1 && vocabMatches.some((v) => v.word.length > 1 && v.word.includes(trig))) {
        continue;
      }

      matchedRanges.push([idx, idx + trig.length]);
      seenPatterns.add(gp.pattern);
      grammarMatches.push({
        pattern: gp.pattern,
        meaning: gp.meaning,
        usage: gp.usage,
      });
      break;
    }
    if (grammarMatches.length >= 5) break;
  }

  return {
    surface: clean,
    reading,
    romaji,
    vocabMatches,
    kanjiMatches,
    grammarMatches,
  };
}

/* -------------------------------------------------------------------------- */
/* 4. Interactive Passage Sentence & Token Splitter                            */
/* -------------------------------------------------------------------------- */

function splitSegmentsBySentences(segments: FuriganaSegment[]): Array<{ text: string; segments: FuriganaSegment[] }> {
  const sentences: Array<{ text: string; segments: FuriganaSegment[] }> = [];
  let currSegments: FuriganaSegment[] = [];
  let currText = '';

  const flushSentence = () => {
    const trimmed = currText.trim();
    if (trimmed) {
      sentences.push({ text: trimmed, segments: currSegments });
    }
    currSegments = [];
    currText = '';
  };

  for (const seg of segments) {
    if (seg.furigana) {
      currSegments.push(seg);
      currText += seg.text;
      continue;
    }

    let buffer = '';
    for (let i = 0; i < seg.text.length; i++) {
      const ch = seg.text[i];
      buffer += ch;

      if (SENTENCE_END_CHARS.has(ch)) {
        // Consume immediately trailing closing bracket if any
        if (i + 1 < seg.text.length && CLOSING_QUOTES.has(seg.text[i + 1])) {
          buffer += seg.text[i + 1];
          i += 1;
        }
        currSegments.push({ text: buffer });
        currText += buffer;
        buffer = '';
        flushSentence();
      }
    }

    if (buffer) {
      currSegments.push({ text: buffer });
      currText += buffer;
    }
  }

  flushSentence();
  return sentences;
}

function splitVietnameseParagraph(paraTrans: string): string[] {
  return paraTrans
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const TOKEN_PARTICLES = [
  'からは', 'までは', 'には', 'では', 'へは', 'でも', 'とも', 'ので', 'のに',
  'から', 'まで', 'より', 'しか', 'だけ', 'など', 'ばかり', 'ぐらい', 'くらい',
  'は', 'が', 'を', 'に', 'で', 'へ', 'と', 'や', 'も', 'の', 'か', 'ね', 'よ',
];
const TOKEN_PUNCTS = new Set(['、', '。', '？', '！', '「', '」', '（', '）', '『', '』', '・']);

function buildTokensForSentence(sentenceId: string, segments: FuriganaSegment[]): InteractiveToken[] {
  const tokens: InteractiveToken[] = [];
  let tokenCounter = 0;

  const pushToken = (segs: FuriganaSegment[]) => {
    const text = segs.map((s) => s.text).join('');
    if (!text) return;
    const rubyMap: Record<string, string> = {};
    for (const s of segs) {
      if (s.furigana) rubyMap[s.text] = s.furigana;
    }
    tokens.push({
      id: `${sentenceId}-t${tokenCounter++}`,
      text,
      segments: segs,
      rubyMap,
      isPunctuation: PURE_PUNCT_RE.test(text),
    });
  };

  let pendingPlain = '';
  let pendingRubySegs: FuriganaSegment[] = [];

  const flushPending = () => {
    if (pendingRubySegs.length > 0) {
      // Group attached okurigana directly following a ruby segment when short kana verb/adj tail
      if (pendingPlain && /^[\u3040-\u309F]{1,4}$/.test(pendingPlain)) {
        pendingRubySegs.push({ text: pendingPlain });
        pendingPlain = '';
      }
      pushToken(pendingRubySegs);
      pendingRubySegs = [];
    }
    if (pendingPlain) {
      splitPlainTextIntoTokens(pendingPlain).forEach((chunk) => pushToken([{ text: chunk }]));
      pendingPlain = '';
    }
  };

  for (const seg of segments) {
    if (seg.furigana) {
      if (pendingPlain) {
        // Attach honorific prefix ご / お directly to kanji word
        if (/^(ご|お)$/.test(pendingPlain)) {
          pendingRubySegs.push({ text: pendingPlain });
          pendingPlain = '';
        } else {
          flushPending();
        }
      }
      if (pendingRubySegs.length > 0 && pendingRubySegs[pendingRubySegs.length - 1].furigana) {
        // Flush previous standalone ruby word unless prefix number/counter
        const prev = pendingRubySegs[pendingRubySegs.length - 1].text;
        if (!/^[0-9０-９一二三四五六七八九十]+$/.test(prev)) {
          flushPending();
        }
      }
      pendingRubySegs.push(seg);
    } else {
      // Scan plain segment text character by character for okurigana vs particles/punct
      let tail = seg.text;
      if (pendingRubySegs.length > 0) {
        const matchOkurigana = tail.match(/^([\u3040-\u309F]{1,3})(?=[\s、。！？「」]|からは|までは|には|では|から|まで|ので|のに|[はがをにでへとものか]|$)/);
        if (matchOkurigana && !TOKEN_PARTICLES.includes(matchOkurigana[1])) {
          pendingRubySegs.push({ text: matchOkurigana[1] });
          tail = tail.slice(matchOkurigana[1].length);
        }
        flushPending();
      }
      if (tail) {
        pendingPlain += tail;
        flushPending();
      }
    }
  }

  flushPending();
  return tokens;
}

function splitPlainTextIntoTokens(plain: string): string[] {
  const chunks: string[] = [];
  let buf = '';

  const flushBuf = () => {
    if (buf) {
      chunks.push(buf);
      buf = '';
    }
  };

  for (let i = 0; i < plain.length; ) {
    const ch = plain[i];
    if (TOKEN_PUNCTS.has(ch) || /\s/.test(ch)) {
      flushBuf();
      chunks.push(ch);
      i += 1;
      continue;
    }

    // Match longest dict entry in plain text first (helps un-segmented N5/N4 passages!)
    let dictHit = '';
    for (const entry of VOCAB_ENTRIES) {
      if (entry.word.length >= 2 && plain.startsWith(entry.word, i)) {
        dictHit = entry.word;
        break;
      }
    }
    if (dictHit) {
      flushBuf();
      chunks.push(dictHit);
      i += dictHit.length;
      continue;
    }

    // Match particle only after non-empty buffer or at boundary
    let particleHit = '';
    for (const p of TOKEN_PARTICLES) {
      if (plain.startsWith(p, i)) {
        // Keep trailing verb inflection intact instead of ripping single kana out of middle of kana words
        if (p.length === 1 && buf.length === 0 && i + 1 < plain.length && /[\u3040-\u309F]/.test(plain[i + 1])) {
          continue;
        }
        particleHit = p;
        break;
      }
    }
    if (particleHit && (buf.length > 0 || i + particleHit.length === plain.length || TOKEN_PUNCTS.has(plain[i + particleHit.length]))) {
      flushBuf();
      chunks.push(particleHit);
      i += particleHit.length;
      continue;
    }

    buf += ch;
    i += 1;
  }

  flushBuf();
  return chunks;
}

export function buildPassageInteractiveParagraphs(passage: JLPTReadingPassage): InteractiveSentence[][] {
  const viParas = passage.translation.split('\n').map((p) => p.trim());

  return passage.paragraphs.map((para, pIdx) => {
    const rawSentences = splitSegmentsBySentences(para.segments);
    const viPara = viParas[pIdx] || '';
    const viSentences = viPara ? splitVietnameseParagraph(viPara) : [];

    return rawSentences.map((sent, sIdx) => {
      const sentenceId = `${passage.id}-p${pIdx}-s${sIdx}`;
      const rubyMap: Record<string, string> = {};
      for (const seg of sent.segments) {
        if (seg.furigana) rubyMap[seg.text] = seg.furigana;
      }

      const alignedVi =
        rawSentences.length === viSentences.length
          ? viSentences[sIdx]
          : viSentences.length === 1
            ? viSentences[0]
            : viPara || passage.translation;

      return {
        id: sentenceId,
        text: sent.text,
        tokens: buildTokensForSentence(sentenceId, sent.segments),
        rubyMap,
        translationHint: alignedVi,
      };
    });
  });
}

/* -------------------------------------------------------------------------- */
/* 5. Cached Translation Resolver (Passage / Dict / Free GTX Fallback)         */
/* -------------------------------------------------------------------------- */

const translationCache = new Map<string, TranslationResult>();
const passageSentenceCache = new Map<string, string>();

export function registerPassageSentences(paragraphs: InteractiveSentence[][]): void {
  for (const sentences of paragraphs) {
    for (const s of sentences) {
      if (s.text && s.translationHint) {
        passageSentenceCache.set(s.text.trim(), s.translationHint.trim());
      }
    }
  }
}

export async function translateJapaneseToVietnamese(
  text: string,
  options?: {
    sentenceTranslation?: string;
    passageVocab?: PassageVocabNote[];
    signal?: AbortSignal;
  },
): Promise<TranslationResult> {
  const clean = text.trim();
  if (!clean) return { text: '', source: 'fallback' };

  // 1. Direct pre-translated passage sentence hint or registered curated passage sentence
  if (options?.sentenceTranslation) {
    return { text: options.sentenceTranslation, source: 'passage' };
  }
  const passageHint = passageSentenceCache.get(clean);
  if (passageHint) {
    return { text: passageHint, source: 'passage' };
  }

  // 2. Passage vocab notes exact match
  if (options?.passageVocab) {
    const note = options.passageVocab.find((v) => v.word === clean || v.reading === clean);
    if (note) return { text: note.meaning, source: 'passage' };
  }

  // 3. Exact sentence in Shin Kanzen grammar corpus
  const grammarSent = SENTENCE_TRANSLATION_INDEX.get(clean);
  if (grammarSent) {
    return { text: grammarSent, source: 'curriculum' };
  }

  // 4. Exact single-word dictionary match
  const dictMatch = VOCAB_BY_WORD.get(clean);
  if (dictMatch) {
    return { text: dictMatch.meaning, source: dictMatch.source };
  }

  // 5. In-memory GTX cache
  const cached = translationCache.get(clean);
  if (cached) return cached;

  // 6. Free Google Translate GTX endpoint fallback with timeout & offline safety
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5500);
  const onAbort = () => controller.abort();
  options?.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=vi&dt=t&q=${encodeURIComponent(clean)}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: unknown = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const joined = (data[0] as unknown[])
        .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
        .join('')
        .trim();

      if (joined) {
        const result: TranslationResult = { text: joined, source: 'google' };
        translationCache.set(clean, result);
        return result;
      }
    }
    throw new Error('Unexpected GTX payload');
  } catch {
    return {
      text: 'Chưa thể tải bản dịch trực tuyến (hãy kiểm tra kết nối mạng). Tham khảo phần giải thích từ vựng & ngữ pháp bên dưới.',
      source: 'fallback',
    };
  } finally {
    window.clearTimeout(timeoutId);
    options?.signal?.removeEventListener('abort', onAbort);
  }
}

/* -------------------------------------------------------------------------- */
/* 6. Clean Range Extraction (Strips <rt>/<rp> & Captures Ruby Context)        */
/* -------------------------------------------------------------------------- */

export function extractCleanSelection(selection: Selection): {
  text: string;
  rubyMap: Record<string, string>;
  rect: DOMRect | null;
} {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return { text: '', rubyMap: {}, rect: null };
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    return { text: '', rubyMap: {}, rect: null };
  }

  const fragment = range.cloneContents();
  const rubyMap: Record<string, string> = {};

  // Capture any intact <ruby> base -> <rt> mappings inside selection before stripping <rt>
  fragment.querySelectorAll('ruby').forEach((rubyEl) => {
    const rtEl = rubyEl.querySelector('rt');
    const rtText = rtEl?.textContent?.trim();
    const clonedRuby = rubyEl.cloneNode(true) as HTMLElement;
    clonedRuby.querySelectorAll('rt, rp').forEach((n) => n.remove());
    const baseText = clonedRuby.textContent?.trim();
    if (baseText && rtText) {
      rubyMap[baseText] = rtText;
    }
  });

  // Remove <rt> and <rp> completely so copied/translated Japanese contains zero interleaved furigana
  fragment.querySelectorAll('rt, rp').forEach((el) => el.remove());

  const cleanText = (fragment.textContent || '').replace(/\s+/g, ' ').trim();
  return { text: cleanText, rubyMap, rect };
}
