/**
 * N3 listening tagged by Shin Kanzen Master N3 grammar lessons (Bài 1–8).
 * - The 36 dialogues of listeningPackN3Lessons.ts are re-labelled to the Shin Kanzen lesson whose
 *   grammar they practise (ids unchanged, so "done" progress is kept).
 * - 17 new dialogues fill the lessons that had few items (Bài 2–7).
 */
import type { JLPTListeningItem } from './jlptDataset';
import { LESSON_LISTENING_N3 } from './listeningPackN3Lessons';
import { buildLessonListening, type LessonListeningRow } from './situationPackUtils';

export const SKZ_N3_LESSON_TITLES: Record<number, string> = {
  1: 'Thời gian (うちに・間に・最中に・次第)',
  2: 'Liên quan & Tùy theo (につれて・によって・たびに)',
  3: 'Nguyên nhân (おかげで・せいで・ばかりに)',
  4: 'Điều kiện (としたら・ないかぎり・ものなら)',
  5: 'Nghịch tiếp (くせに・ものの・にしては)',
  6: 'Xu hướng (がち・っぽい・一方だ)',
  7: 'Trạng thái kéo dài (っぱなし・たまま・だらけ)',
  8: 'Thái độ & Cảm xúc (にとって・べきだ・わけにはいかない)',
};

/** Old N3 grammar-unit number (+ row id) → Shin Kanzen lesson. */
const RELABEL: Record<string, number> = {
  'b01-a': 8, 'b01-b': 8, 'b01-c': 8,
  'b02-a': 1, 'b02-b': 6, 'b02-c': 1,
  'b03-a': 8, 'b03-b': 8, 'b03-c': 8,
  'b04-a': 8, 'b04-b': 8, 'b04-c': 8,
  'b05-a': 6, 'b05-b': 6, 'b05-c': 6,
  'b06-a': 3, 'b06-b': 3, 'b06-c': 3,
  'b07-a': 1, 'b07-b': 1, 'b07-c': 1,
  'b08-a': 2, 'b08-b': 2, 'b08-c': 2,
  'b09-a': 8, 'b09-b': 8, 'b09-c': 8,
  'b10-a': 8, 'b10-b': 8, 'b10-c': 8,
  'b11-a': 7, 'b11-b': 7, 'b11-c': 7,
  'b12-a': 5, 'b12-b': 8, 'b12-c': 8,
};

const relabelled: JLPTListeningItem[] = LESSON_LISTENING_N3.map((item) => {
  const key = /-(b\d{2}-[a-z])/.exec(item.id)?.[1];
  const lesson = key ? RELABEL[key] : undefined;
  if (!lesson) return item;
  return { ...item, mondaiLabel: item.mondaiLabel.replace(/Bài\s*\d+/, `Bài ${lesson}`) };
});

const Q = '何と答えますか。';
const T = 'Trường học';
const S = 'Mua sắm';
const R = 'Nhà hàng';
const G = 'Ga tàu & Giao thông';
const B = 'Bệnh viện';
const C = 'Làm thêm & Công ty';
const N = 'Nhà ở & Hàng xóm';
const P = 'Bưu điện & Ngân hàng';
const D = 'Du lịch & Khách sạn';
const E = 'Sự kiện & Sở thích';

const ROWS: LessonListeningRow[] = [
  // Bài 2 — たびに / によって / ついでに
  ['a', 2, D, 2, 'Hai người nói về chuyến công tác.', '女の人は出張のたびに何をしますか。',
    [['男', '出張、多いですね。'], ['女', 'ええ。でも出張のたびに、その町の美術館に行くことにしているんです。']],
    ['お土産を買う', 'その町の美術館に行く', '友達に会う', '温泉に入る'], 1,
    'Nam: Chị đi công tác nhiều nhỉ.\nNữ: Vâng. Nhưng mỗi lần đi công tác tôi đều đi bảo tàng mỹ thuật của thành phố đó.', '〜たびに = mỗi lần ~.'],
  ['b', 2, S, 2, 'Nhân viên giải thích giá vé.', '料金はどうやって決まりますか。',
    [['男', 'このツアーの料金はいくらですか。'], ['女', '季節によって違います。夏は高く、冬は安くなります。']],
    ['人数によって', '季節によって', '年齢によって', 'いつも同じ'], 1,
    'Nam: Giá tour này bao nhiêu?\nNữ: Tùy theo mùa. Mùa hè đắt, mùa đông rẻ.', '〜によって = tùy theo.'],
  // Bài 3 — ばかりに / ものだから
  ['a', 3, C, 2, 'Đồng nghiệp kể chuyện bị sếp mắng.', '男の人はどうして部長に叱られましたか。',
    [['女', 'どうしたの、元気ないね。'], ['男', 'メールの宛先を一文字間違えたばかりに、大事な資料が別の会社に届いちゃったんだ。']],
    ['会議に遅れたから', 'メールの宛先を間違えたから', '資料をなくしたから', '電話に出なかったから'], 1,
    'Nữ: Sao thế, trông buồn vậy.\nNam: Chỉ vì gõ sai một chữ địa chỉ email mà tài liệu quan trọng gửi nhầm sang công ty khác.', '〜ばかりに = chỉ vì ~ mà (hậu quả xấu).'],
  ['b', 3, N, 2, 'Hàng xóm xin lỗi vì tiếng ồn.', '男の人はどうして夜うるさかったのですか。',
    [['女', 'ゆうべ、ちょっとにぎやかでしたね。'], ['男', 'すみません。久しぶりに国の友達が来たものだから、つい遅くまで話してしまって。']],
    ['パーティーの練習をしていたから', '久しぶりに友達が来たから', 'テレビの音が大きかったから', '引っ越しの準備をしていたから'], 1,
    'Nữ: Tối qua hơi náo nhiệt nhỉ.\nNam: Xin lỗi. Vì lâu lắm bạn ở quê mới sang nên lỡ nói chuyện đến khuya.', '〜ものだから = vì ~ (thanh minh).'],
  // Bài 4 — としたら / ないかぎり / ものなら / ないことには
  ['a', 4, T, 2, 'Hai sinh viên nói chuyện giả định.', '女の人は一か月休みがあったら何をしますか。',
    [['男', 'もし一か月休みがあるとしたら、何をする？'], ['女', 'そうだね、日本中を自転車で回ってみたいな。']],
    ['国に帰る', '自転車で日本中を回る', 'アルバイトをする', 'ずっと寝る'], 1,
    'Nam: Giả sử có một tháng nghỉ thì cậu làm gì?\nNữ: Ừm, tớ muốn đạp xe đi khắp Nhật Bản.', '〜としたら = giả sử ~.'],
  ['b', 4, E, 2, 'Thông báo về giải chạy marathon.', '大会はどんなときに中止になりますか。',
    [['男', '明日の大会、雨でもやるんですか。'], ['女', 'ええ。台風が来ないかぎり、予定どおり行います。']],
    ['雨が降ったとき', '台風が来たとき', '参加者が少ないとき', '気温が高いとき'], 1,
    'Nam: Giải ngày mai mưa cũng tổ chức à?\nNữ: Vâng. Chừng nào bão không đến thì vẫn tổ chức như dự kiến.', '〜ないかぎり = chừng nào chưa ~.'],
  ['c', 4, B, 2, 'Bác sĩ nói về việc xuất viện.', '男の人はいつ退院できますか。',
    [['男', 'いつ退院できますか。'], ['女', '検査の結果を見ないことには、何とも言えませんね。結果は金曜日に出ます。']],
    ['明日', '金曜日の検査結果を見てから決まる', '来週の月曜日', 'もう退院できる'], 1,
    'Nam: Khi nào tôi xuất viện được ạ?\nBác sĩ: Chưa xem kết quả xét nghiệm thì chưa nói được. Thứ Sáu có kết quả.', '〜ないことには = nếu chưa ~ thì không thể.'],
  ['d', 4, P, 4, 'Khách lo lắng ở bưu điện.', Q,
    [['男', '今日中に届けられるものなら、届けてほしいんですが…。']],
    ['申し訳ありません。今日中は難しいです。', 'はい、今日届きました。', '届けるものです。', 'どうぞ、届けてください。'], 0,
    'Nam: Nếu có thể giao trong hôm nay thì tôi muốn giao…', '〜ものなら = nếu có thể ~ (mong muốn khó). Đáp lại lịch sự từ chối.'],
  // Bài 5 — くせに / ものの / にしては / わりに
  ['a', 5, C, 2, 'Hai đồng nghiệp nói về một người.', '女の人は山田さんについてどう思っていますか。',
    [['男', '山田さん、また会議で文句を言ってたね。'], ['女', '自分は何もしないくせに、人のことばかり言うんだから。']],
    ['よく働く人だ', '何もしないのに人の文句ばかり言う', '会議が好きだ', '優しい人だ'], 1,
    'Nam: Yamada lại phàn nàn trong cuộc họp nhỉ.\nNữ: Bản thân chẳng làm gì mà toàn nói người khác.', '〜くせに = vậy mà (trách móc).'],
  ['b', 5, S, 2, 'Bạn bè nói về chiếc máy ảnh mới.', '男の人はカメラをどうしていますか。',
    [['女', '新しいカメラ、使ってる？'], ['男', 'それが、買ったものの、使い方が難しくて、まだ箱から出してないんだ。']],
    ['毎日使っている', '買ったがまだ使っていない', '友達にあげた', '返品した'], 1,
    'Nữ: Máy ảnh mới cậu có dùng không?\nNam: Ừ thì, mua rồi nhưng cách dùng khó quá, chưa lấy ra khỏi hộp.', '〜ものの = tuy ~ nhưng.'],
  ['c', 5, R, 2, 'Hai người ăn ở quán mới.', 'この店について、男の人はどう言っていますか。',
    [['女', 'このラーメン、どう？'], ['男', '駅前の店にしては、静かで落ち着くね。値段のわりに量も多いし。']],
    ['うるさくて高い', '静かで、値段のわりに量が多い', '量が少ない', '駅から遠い'], 1,
    'Nữ: Mì này thế nào?\nNam: So với quán trước ga thì yên tĩnh dễ chịu. So với giá thì lượng cũng nhiều.', '〜にしては / 〜わりに.'],
  // Bài 6 — がち / 気味 / つつある
  ['a', 6, B, 2, 'Bạn hỏi thăm sức khỏe.', '女の人は最近どうですか。',
    [['男', '最近、顔色が悪いね。'], ['女', '仕事が忙しくて、寝不足気味なの。朝ごはんも抜きがちで。']],
    ['元気いっぱい', '寝不足ぎみで朝ごはんを抜きがち', '入院している', '太ってきた'], 1,
    'Nam: Dạo này sắc mặt cậu kém nhỉ.\nNữ: Việc bận nên hơi thiếu ngủ. Bữa sáng cũng hay bỏ.', '〜気味 / 〜がち.'],
  // Bài 7 — っぱなし / たまま / だらけ / きり
  ['a', 7, N, 2, 'Mẹ nhắc con.', '母親は何について怒っていますか。',
    [['女', 'また電気をつけっぱなしで出かけたでしょう。'], ['男', 'ごめん、急いでたから。']],
    ['ドアを開けたままにしたこと', '電気をつけたまま出かけたこと', '部屋を汚したこと', '帰りが遅かったこと'], 1,
    'Mẹ: Con lại ra ngoài để đèn bật nguyên đúng không.\nCon: Xin lỗi, vì vội quá.', '〜っぱなし = để nguyên (không xử lý).'],
  ['b', 7, G, 2, 'Nhân viên nhà ga và hành khách.', '男の人はどこにかばんを忘れましたか。',
    [['男', 'すみません、電車にかばんを置いたまま降りてしまって…。'], ['女', '何両目でしたか。'], ['男', '一番後ろの車両の網棚です。']],
    ['駅のベンチ', '一番後ろの車両の網棚', '改札', 'トイレ'], 1,
    'Nam: Xin lỗi, tôi để nguyên cặp trên tàu rồi xuống mất…\nNữ: Toa thứ mấy ạ?\nNam: Trên giá hành lý toa cuối cùng.', '〜たまま = để nguyên.'],
  ['c', 7, T, 2, 'Học sinh nộp bài.', '先生はレポートについて何と言いましたか。',
    [['男', '先生、レポートです。'], ['女', 'うーん、間違いだらけですね。もう一度見直してから出してください。']],
    ['よくできている', '間違いがたくさんある', '短すぎる', '字がきれい'], 1,
    'Nam: Thưa cô, bài báo cáo ạ.\nCô: Ừm, toàn lỗi thôi. Hãy xem lại rồi nộp.', '〜だらけ = đầy, toàn là (tiêu cực).'],
  ['d', 7, D, 2, 'Bạn kể về người bạn đi du học.', '女の人と田中さんは今どうなっていますか。',
    [['男', '田中さんとは今も連絡を取ってる？'], ['女', 'ううん、三年前にアメリカに行ったきり、一度も連絡がないの。']],
    ['毎週電話している', '三年前から連絡がない', '先月会った', '一緒に住んでいる'], 1,
    'Nam: Cậu vẫn liên lạc với Tanaka chứ?\nNữ: Không, từ khi sang Mỹ 3 năm trước là bặt tin, chưa liên lạc lần nào.', '〜たきり = từ khi ~ thì không (tiếp diễn).'],
  ['e', 7, C, 4, 'Đồng nghiệp gọi điện.', Q,
    [['女', 'ごめん、今ちょっと手が離せないから、あとでかけ直してもいい？']],
    ['うん、じゃあ、またあとで。', 'はい、離せます。', 'いいえ、手が痛いです。', 'どうぞ、かけてください。'], 0,
    'Nữ: Xin lỗi, giờ mình đang bận tay, lát gọi lại được không?', 'Đáp đồng ý: 「うん、じゃあ、またあとで」.'],
];

// "Bài N" here was only an interim grammar-theme number; N3 is now filtered by the book's
// 聴解 sections (see skzListening/), so drop it from the visible label. Ids stay unchanged.
export const LISTENING_N3_SHINKANZEN: JLPTListeningItem[] = [
  ...relabelled,
  ...buildLessonListening('N3', 'skz-n3', ROWS),
].map((item) => ({ ...item, mondaiLabel: item.mondaiLabel.replace(/ · Bài\s*\d+/, '') }));
