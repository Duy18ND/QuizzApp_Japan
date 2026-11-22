import type { PracticeType } from '../../../types/grammar';
import type { GrammarBook, SmartGrammarRule } from '../../../types/grammarEngine';
import type { GrammarSentence } from '../shinkanzen-n3/lesson01Sentences';

type CompactSentenceTuple = [
  grammarId: string,
  japanese: string,
  hiragana: string,
  vietnamese: string,
  target: string,
];

function buildCompactSentences(
  prefix: string,
  rows: CompactSentenceTuple[],
): GrammarSentence[] {
  const counts: Record<string, number> = {};
  return rows.map(([grammarId, japanese, hiragana, vietnamese, target]) => {
    counts[grammarId] = (counts[grammarId] ?? 0) + 1;
    return {
      id: `${prefix}_${grammarId}_S${String(counts[grammarId]).padStart(2, '0')}`,
      grammarId,
      japanese,
      hiragana,
      vietnamese,
      difficulty: 'easy',
      target,
    };
  });
}

const MINNA_N5_SENTENCE_ROWS: CompactSentenceTuple[] = [
  // L01
  ['N5-MNN-L01-WA-DESU', '私はベトナム人です。', 'わたしはベトナムじんです。', 'Tôi là người Việt Nam.', 'は'],
  ['N5-MNN-L01-WA-DESU', '田中さんは銀行員です。', 'たなかさんはぎんこういんです。', 'Anh Tanaka là nhân viên ngân hàng.', 'です'],
  ['N5-MNN-L01-JA-ARIMASEN', '私は先生じゃありません。', 'わたしはせんせいじゃありません。', 'Tôi không phải là giáo viên.', 'じゃありません'],
  ['N5-MNN-L01-JA-ARIMASEN', 'ミラーさんは学生じゃありません。', 'ミラーさんはがくせいじゃありません。', 'Anh Miller không phải là học sinh.', 'じゃありません'],
  ['N5-MNN-L01-KA', 'あなたは会社員ですか。', 'あなたはかいしゃいんですか。', 'Anh là nhân viên công ty phải không?', 'ですか'],
  ['N5-MNN-L01-KA', 'お名前は何ですか。', 'おなまえはなんですか。', 'Tên của bạn là gì?', 'ですか'],
  ['N5-MNN-L01-MO', 'グプタさんも社員です。', 'グプタさんもしゃいんです。', 'Anh Gupta cũng là nhân viên công ty.', 'も'],
  ['N5-MNN-L01-MO', '私もさくら大学の学生です。', 'わたしもさくらだいがくのがくせいです。', 'Tôi cũng là sinh viên đại học Sakura.', 'も'],
  ['N5-MNN-L01-NO', 'カリナさんは富士大学の学生です。', 'カリナさんはふじだいがくのがくせいです。', 'Chị Karina là sinh viên đại học Fuji.', 'の'],
  ['N5-MNN-L01-NO', 'これは日本語の本です。', 'これはにほんごのほんです。', 'Đây là sách tiếng Nhật.', 'の'],
  // L02
  ['N5-MNN-L02-KORE-SORE-ARE', 'これは私の辞書です。', 'これはわたしのじしょです。', 'Cái này là từ điển của tôi.', 'これ'],
  ['N5-MNN-L02-KORE-SORE-ARE', 'それは日本のカメラです。', 'それはにほんのカメラです。', 'Cái đó là máy ảnh của Nhật.', 'それ'],
  ['N5-MNN-L02-KONO-SONO-ANO', 'この傘は私のです。', 'このかさはわたしのです。', 'Cái ô này là của tôi.', 'この'],
  ['N5-MNN-L02-KONO-SONO-ANO', 'あのかばんは誰のですか。', 'あのかばんはだれのですか。', 'Cái cặp kia là của ai vậy?', 'あの'],
  ['N5-MNN-L02-KA-KA', 'これは「い」ですか、「り」ですか。', 'これは「い」ですか、「り」ですか。', 'Chữ này là chữ "i" hay là chữ "ri"?', 'ですか'],
  ['N5-MNN-L02-KA-KA', 'それはボールペンですか、鉛筆ですか。', 'それはボールペンですか、えんぴつですか。', 'Cái đó là bút bi hay bút chì?', 'ですか'],
  // L03
  ['N5-MNN-L03-KOKO-SOKO-ASOKO', 'ここは日本語の教室です。', 'ここはにほんごのきょうしつです。', 'Đây là phòng học tiếng Nhật.', 'ここ'],
  ['N5-MNN-L03-KOKO-SOKO-ASOKO', 'あそこは郵便局です。', 'あそこはゆうびんきょくです。', 'Đằng kia là bưu điện.', 'あそこ'],
  ['N5-MNN-L03-DOKO-DOCHIRA', 'お手洗いはどこですか。', 'おてあらいはどこですか。', 'Nhà vệ sinh ở đâu ạ?', 'どこ'],
  ['N5-MNN-L03-DOKO-DOCHIRA', '会社はどちらですか。', 'かいしゃはどちらですか。', 'Quý công ty ở đâu/tên gì ạ?', 'どちら'],
  ['N5-MNN-L03-ORIGIN-NO', 'これはイタリアの靴です。', 'これはイタリアのくつです。', 'Đây là đôi giày của Ý.', 'の'],
  ['N5-MNN-L03-ORIGIN-NO', 'この腕時計はスイスの時計です。', 'このうでどけいはスイスのとけいです。', 'Chiếc đồng hồ đeo tay này là của Thụy Sĩ.', 'の'],
  // L04
  ['N5-MNN-L04-IMA-JI-FUN', '今、午前八時十五分です。', 'いま、ごぜんはちじじゅうごふんです。', 'Bây giờ là 8 giờ 15 phút sáng.', '八時'],
  ['N5-MNN-L04-IMA-JI-FUN', 'ニューヨークは今、午後九時半です。', 'ニューヨークはいま、ごごくはんじです。', 'New York bây giờ là 9 giờ rưỡi tối.', '時半'],
  ['N5-MNN-L04-V-MASU-TENSE', '毎朝六時に起きます。', 'まいあさろくじにおきます。', 'Mỗi sáng tôi thức dậy lúc 6 giờ.', '起きます'],
  ['N5-MNN-L04-V-MASU-TENSE', '昨日、勉強しませんでした。', 'きのう、べんきょうしませんでした。', 'Hôm qua tôi đã không học bài.', 'しませんでした'],
  ['N5-MNN-L04-TIME-NI-V', '毎晩十一時に寝ます。', 'まいばんじゅういちじにねます。', 'Mỗi tối tôi đi ngủ lúc 11 giờ.', 'に'],
  ['N5-MNN-L04-TIME-NI-V', '日曜日に友達と会います。', 'にちようびにともだちとあいます。', 'Chủ nhật tôi gặp bạn bè.', 'に'],
  ['N5-MNN-L04-KARA-MADE', '銀行は九時から三時までです。', 'ぎんこうはくじからさんじまでです。', 'Ngân hàng mở cửa từ 9 giờ đến 3 giờ.', 'から'],
  ['N5-MNN-L04-KARA-MADE', '昼休みは十二時から一時までです。', 'ひるやすみはじゅうにじからいちじまでです。', 'Giờ nghỉ trưa từ 12 giờ đến 1 giờ.', 'まで'],
  // L05
  ['N5-MNN-L05-E-IKIMASU', '明日、京都へ行きます。', 'あした、きょうとへいきます。', 'Ngày mai tôi đi Kyoto.', 'へ'],
  ['N5-MNN-L05-E-IKIMASU', '来年、国へ帰ります。', 'らいねん、くにへかえります。', 'Năm sau tôi sẽ về nước.', 'へ'],
  ['N5-MNN-L05-DE-VEHICLE', '毎日電車で会社へ行きます。', 'まいにちでんしゃでかいしゃへいきます。', 'Mỗi ngày tôi đi công ty bằng tàu điện.', 'で'],
  ['N5-MNN-L05-DE-VEHICLE', '飛行機で日本へ来ました。', 'ひこうきでにほんへきました。', 'Tôi đến Nhật bằng máy bay.', 'で'],
  ['N5-MNN-L05-TO-PERSON', '家族と東京へ来ました。', 'かぞくととうきょうへきました。', 'Tôi đã đến Tokyo cùng gia đình.', 'と'],
  ['N5-MNN-L05-TO-PERSON', '友達と映画を見ます。', 'ともだちとえいがをみます。', 'Tôi xem phim cùng với bạn.', 'と'],
  // L06
  ['N5-MNN-L06-WO-V', '毎朝コーヒーを飲みます。', 'まいあさコーヒーをのみます。', 'Mỗi sáng tôi uống cà phê.', 'を'],
  ['N5-MNN-L06-WO-V', '図書館で新聞を読みます。', 'としょかんでしんぶんをよみます。', 'Tôi đọc báo ở thư viện.', 'を'],
  ['N5-MNN-L06-DE-PLACE', '食堂で昼ご飯を食べます。', 'しょくどうでひるごはんをたべます。', 'Tôi ăn trưa ở nhà ăn.', 'で'],
  ['N5-MNN-L06-DE-PLACE', '駅の前のスーパーで果物を買います。', 'えきのまえのスーパーでくだものをかいます。', 'Tôi mua trái cây ở siêu thị trước ga.', 'で'],
  ['N5-MNN-L06-V-MASENKA', '一緒に京都へ行きませんか。', 'いっしょにきょうとへいきませんか。', 'Cùng đi Kyoto với tôi không?', 'ませんか'],
  ['N5-MNN-L06-V-MASENKA', '喫茶店でお茶を飲みませんか。', 'きっさてんでおちゃをのみませんか。', 'Vào quán uống chút trà nhé?', 'ませんか'],
  ['N5-MNN-L06-V-MASHOU', '少し休みましょう。', 'すこしやすみましょう。', 'Hãy nghỉ ngơi một chút nào.', 'ましょう'],
  ['N5-MNN-L06-V-MASHOU', '十二時ですから昼ご飯を食べましょう。', 'じゅうにじですからひるごはんをたべましょう。', '12 giờ rồi, chúng ta cùng ăn trưa thôi.', 'ましょう'],
  // L07
  ['N5-MNN-L07-DE-TOOL', 'お箸でご飯を食べます。', 'おはしでごはんをたべます。', 'Tôi ăn cơm bằng đũa.', 'で'],
  ['N5-MNN-L07-DE-TOOL', '日本語でレポートを書きます。', 'にほんごでレポートをかきます。', 'Tôi viết báo cáo bằng tiếng Nhật.', 'で'],
  ['N5-MNN-L07-AGEMASU', '誕生日に妹に時計をあげました。', 'たんじょうびにいもうとにとけいをあげました。', 'Sinh nhật tôi đã tặng em gái đồng hồ.', 'あげました'],
  ['N5-MNN-L07-AGEMASU', '山田さんは木村さんに花をあげました。', 'やまださんはきむらさんにはなをあげました。', 'Anh Yamada đã tặng hoa cho chị Kimura.', 'あげました'],
  ['N5-MNN-L07-MORAIMASU', '先生に辞書をもらいました。', 'せんせいにじしょをもらいました。', 'Tôi đã nhận được từ điển từ thầy giáo.', 'もらいました'],
  ['N5-MNN-L07-MORAIMASU', '友達からきれいな写真をもらいました。', 'ともだちからきれいなしゃしんをもらいました。', 'Tôi nhận được bức ảnh đẹp từ bạn.', 'もらいました'],
  ['N5-MNN-L07-MOU-MASHITA', 'もう昼ご飯を食べましたか。はい、食べました。', 'もうひるごはんをたべましたか。はい、たべました。', 'Bạn đã ăn trưa chưa? Rồi, tôi ăn rồi.', 'もう'],
  ['N5-MNN-L07-MOU-MASHITA', 'もう荷物を送りましたか。いいえ、まだです。', 'もうにもつをおくりましたか。いいえ、まだです。', 'Bạn gửi hành lý chưa? Chưa, vẫn chưa.', 'まだです'],
  // L08
  ['N5-MNN-L08-ADJ-NA', '京都は静かな町です。とても綺麗です。', 'きょうとはしずかなまちです。とてもきれいです。', 'Kyoto là thành phố yên tĩnh. Rất đẹp.', '綺麗です'],
  ['N5-MNN-L08-ADJ-NA', '図書館の夜は賑やかじゃありません。', 'としょかんのよるはにぎやかじゃありません。', 'Thư viện buổi tối không náo nhiệt.', 'じゃありません'],
  ['N5-MNN-L08-ADJ-I', '日本の夏はとても暑いです。', 'にほんのなつはとてもあついです。', 'Mùa hè ở Nhật rất nóng.', '暑いです'],
  ['N5-MNN-L08-ADJ-I', 'この辞書はそんなに高くないです。', 'このじしょはそんなにたかくないです。', 'Cuốn từ điển này không đắt lắm.', '高くないです'],
  ['N5-MNN-L08-ADJ-MODIFY-N', 'ワット先生は親切な先生です。', 'ワットせんせいはしんせつなせんせいです。', 'Thầy Watt là một thầy giáo tốt bụng.', '親切な'],
  ['N5-MNN-L08-ADJ-MODIFY-N', '富士山は高い山です。', 'ふじさんはたかいやまです。', 'Núi Phú Sĩ là ngọn núi cao.', '高い'],
  ['N5-MNN-L08-GA-CONTRAST', '日本の食べ物は美味しいですが、高いです。', 'にほんのたべものはおいしいですが、たかいです。', 'Đồ ăn Nhật ngon nhưng mà đắt.', 'が'],
  ['N5-MNN-L08-GA-CONTRAST', '部屋は狭いですが、とても綺麗です。', 'へやはせまいですが、とてもきれいです。', 'Phòng tuy hẹp nhưng rất sạch đẹp.', 'が'],
  // L09
  ['N5-MNN-L09-GA-SUKI-JOUZU', '私は日本の音楽が好きです。', 'わたしはにほんのおんがくがすきです。', 'Tôi thích âm nhạc Nhật Bản.', 'が好き'],
  ['N5-MNN-L09-GA-SUKI-JOUZU', 'カリナさんは絵がとても上手です。', 'カリナさんはえがとてもじょうずです。', 'Chị Karina vẽ tranh rất giỏi.', 'が'],
  ['N5-MNN-L09-GA-WAKARIMASU', '私は漢字が少し分かります。', 'わたしはかんじがすこしわかります。', 'Tôi hiểu được một chút chữ Hán.', '分かります'],
  ['N5-MNN-L09-GA-WAKARIMASU', '今日は用事がありますから、早く帰ります。', 'きょうはようじがありますから、はやくかえります。', 'Hôm nay tôi có việc bận nên về sớm.', 'があります'],
  ['N5-MNN-L09-KARA-REASON', '時間がありませんから、新聞を読みません。', 'じかんがありませんから、しんぶんをよみません。', 'Vì không có thời gian nên tôi không đọc báo.', 'から'],
  ['N5-MNN-L09-KARA-REASON', '寒いから、窓を閉めましょう。', 'さむいから、まどをしめましょう。', 'Vì trời lạnh nên hãy đóng cửa sổ nhé.', 'から'],
  // L10
  ['N5-MNN-L10-ARIMASU-IMASU', 'そこに新しいコンビニがあります。', 'そこにあたらしいコンビニがあります。', 'Ở đằng đó có cửa hàng tiện lợi mới.', 'があります'],
  ['N5-MNN-L10-ARIMASU-IMASU', '教室の中に学生がいます。', 'きょうしつのなかにがくせいがいます。', 'Trong lớp học có học sinh.', 'がいます'],
  ['N5-MNN-L10-NI-GA-ARIMASU', '大阪に有名な城があります。', 'おおさかにゆうめいなしろがあります。', 'Ở Osaka có tòa thành nổi tiếng.', 'に'],
  ['N5-MNN-L10-NI-GA-ARIMASU', '庭に小さい猫がいます。', 'にわにちいさいねこがいます。', 'Trong vườn có chú mèo nhỏ.', 'に'],
  ['N5-MNN-L10-POSITION-NO-NI', '机の上に写真と本があります。', 'つくえのうえにしゃしんとほんがあります。', 'Ở trên bàn có ảnh và sách.', 'の上に'],
  ['N5-MNN-L10-POSITION-NO-NI', '銀行の隣に大きい病院があります。', 'ぎんこうのとなりにおおきいびょういんがあります。', 'Bên cạnh ngân hàng có bệnh viện lớn.', 'の隣に'],
  // L11
  ['N5-MNN-L11-COUNTERS', 'りんごを四つ買いました。', 'りんごをよっつかいました。', 'Tôi đã mua 4 quả táo.', '四つ'],
  ['N5-MNN-L11-COUNTERS', '切手を五枚ください。', 'きってをごまいください。', 'Cho tôi 5 con tem.', '五枚'],
  ['N5-MNN-L11-DURATION-KAKARIMASU', '駅まで自転車で十分かかります。', 'えきまでじてんしゃでじゅっぷんかかります。', 'Tới ga bằng xe đạp mất 10 phút.', 'かかります'],
  ['N5-MNN-L11-DURATION-KAKARIMASU', '日本で一年間日本語を勉強しました。', 'にほんでいちねんかんにほんごをべんきょうしました。', 'Tôi đã học tiếng Nhật ở Nhật 1 năm.', '一年間'],
  ['N5-MNN-L11-FREQUENCY-NI-KAI', '一週間に二回テニスをします。', 'いっしゅうかんににかいテニスをします。', 'Một tuần tôi chơi tennis 2 lần.', 'に二回'],
  ['N5-MNN-L11-FREQUENCY-NI-KAI', '一日に三回薬を飲みます。', 'いちにちにさんかいくすりをのみます。', 'Một ngày tôi uống thuốc 3 lần.', 'に三回'],
  // L12
  ['N5-MNN-L12-ADJ-PAST', '昨日のテストは難しかったです。', 'きのうのテストはむずかしかったです。', 'Bài kiểm tra hôm qua đã rất khó.', '難しかったです'],
  ['N5-MNN-L12-ADJ-PAST', '先週の日曜日は暇でした。', 'せんしゅうのにちようびはひまでした。', 'Chủ nhật tuần trước tôi rảnh rỗi.', 'でした'],
  ['N5-MNN-L12-YORI-COMPARE', '新幹線はバスより速いです。', 'しんかんせんはバスよりはやいです。', 'Tàu Shinkansen nhanh hơn xe buýt.', 'より'],
  ['N5-MNN-L12-YORI-COMPARE', '北海道は東京より寒いです。', 'ほっかいどうはとうきょうよりさむいです。', 'Hokkaido lạnh hơn Tokyo.', 'より'],
  ['N5-MNN-L12-DOCHIRA-GA', '夏と冬とどちらが好きですか。', 'なつとふゆとどちらがすきですか。', 'Giữa mùa hè và mùa đông bạn thích mùa nào hơn?', 'どちらが'],
  ['N5-MNN-L12-DOCHIRA-GA', 'コーヒーと紅茶とどちらがいいですか。', 'コーヒーとこうちゃとどちらがいいですか。', 'Cà phê và hồng trà bạn chọn cái nào hơn?', 'どちらが'],
  ['N5-MNN-L12-ICHIBAN', 'スポーツの中でサッカーが一番面白いです。', 'スポーツのなかでサッカーがいちばんおもしろいです。', 'Trong các môn thể thao bóng đá thú vị nhất.', 'の中で'],
  ['N5-MNN-L12-ICHIBAN', '一年で春が一番好きです。', 'いちねんではるがいちばんすきです。', 'Trong một năm tôi thích mùa xuân nhất.', '一番'],
  // L13
  ['N5-MNN-L13-GA-HOSHII', '今、新しいパソコンがほしいです。', 'いま、あたらしいパソコンがほしいです。', 'Bây giờ tôi muốn có máy tính mới.', 'がほしいです'],
  ['N5-MNN-L13-GA-HOSHII', '休みがほしいです。', 'やすみがほしいです。', 'Tôi muốn có kỳ nghỉ.', 'がほしいです'],
  ['N5-MNN-L13-V-TAI', '日本へ留学に行きたいです。', 'にほんへりゅうがくにいきたいです。', 'Tôi muốn đi du học ở Nhật Bản.', 'たいです'],
  ['N5-MNN-L13-V-TAI', 'お腹が空いたからラーメンが食べたいです。', 'おなかがすいたからラーメンがたべたいです。', 'Vì đói nên tôi muốn ăn mì Ramen.', 'たいです'],
  ['N5-MNN-L13-NI-IKIMASU', 'デパートへ靴を買いに行きます。', 'デパートへくつをかいにいきます。', 'Tôi đi trung tâm thương mại để mua giày.', '買いに'],
  ['N5-MNN-L13-NI-IKIMASU', '公園へ写真を撮りに行きましょう。', 'こうえんへしゃしんをとりにいきましょう。', 'Hãy ra công viên chụp ảnh nào.', '撮りに'],
  // L14
  ['N5-MNN-L14-TE-KUDASAI', 'ここに名前を書いてください。', 'ここになまえをかいてください。', 'Xin hãy viết tên vào đây.', 'てください'],
  ['N5-MNN-L14-TE-KUDASAI', '暑いので窓を開けてください。', 'あついのでまどをあけてください。', 'Vì nóng xin hãy mở cửa sổ.', 'てください'],
  ['N5-MNN-L14-TE-IMASU-PROG', '今、雨が降っています。', 'いま、あめがふっています。', 'Bây giờ trời đang mưa.', 'ています'],
  ['N5-MNN-L14-TE-IMASU-PROG', 'ミラーさんは今、電話をかけています。', 'ミラーさんはいま、でんわをかけています。', 'Anh Miller hiện đang gọi điện thoại.', 'ています'],
  ['N5-MNN-L14-V-MASHOUKA', '荷物を持ちましょうか。', 'にもつをもちましょうか。', 'Để tôi xách giúp hành lý nhé?', 'ましょうか'],
  ['N5-MNN-L14-V-MASHOUKA', '駅まで車で送りましょうか。', 'えきまでくるまでおくりましょうか。', 'Để tôi chở bạn ra ga bằng ô tô nhé?', 'ましょうか'],
  // L15
  ['N5-MNN-L15-TEMO-II', 'ここで写真を撮ってもいいですか。', 'ここでしゃしんをとってもいいですか。', 'Tôi chụp ảnh ở đây có được không?', 'てもいいですか'],
  ['N5-MNN-L15-TEMO-II', 'この辞書を借りてもいいですか。', 'このじしょをかりてもいいですか。', 'Tôi mượn cuốn từ điển này được không?', 'てもいいですか'],
  ['N5-MNN-L15-TEWA-IKEMASEN', '図書館で話してはいけません。', 'としょかんではなしてはいけません。', 'Không được nói chuyện trong thư viện.', 'てはいけません'],
  ['N5-MNN-L15-TEWA-IKEMASEN', 'ここでたばこを吸ってはいけません。', 'ここでたばこをすってはいけません。', 'Không được hút thuốc ở đây.', 'てはいけません'],
  ['N5-MNN-L15-TE-IMASU-STATE', '私は大阪に住んでいます。', 'わたしはおおさかにすんでいます。', 'Tôi đang sống ở Osaka.', 'でいます'],
  ['N5-MNN-L15-TE-IMASU-STATE', '姉はデパートで働いています。', 'あねはデパートではたらいています。', 'Chị gái tôi đang làm việc ở trung tâm thương mại.', 'ています'],
  // L16
  ['N5-MNN-L16-V1TE-V2TE', '朝起きて、顔を洗って、朝ご飯を食べます。', 'あさおきて、かおをあらって、あさごはんをたべます。', 'Sáng dậy, rửa mặt rồi ăn bữa sáng.', '起きて'],
  ['N5-MNN-L16-V1TE-V2TE', '銀行でお金を下ろして、買物をします。', 'ぎんこうでおかねをおろして、かいものをします。', 'Rút tiền ở ngân hàng rồi đi mua sắm.', '下ろして'],
  ['N5-MNN-L16-V1TEKARA-V2', '仕事が終わってから、飲みに行きます。', 'しごとがおわってから、のみにいきます。', 'Sau khi xong việc tôi sẽ đi uống.', 'てから'],
  ['N5-MNN-L16-V1TEKARA-V2', '手を洗ってから、食事をします。', 'てをあらってから、しょくじをします。', 'Sau khi rửa tay rồi mới ăn cơm.', 'てから'],
  ['N5-MNN-L16-ADJ-JOIN', 'この部屋は広くて、明るいです。', 'このへやはひろくて、あかるいです。', 'Căn phòng này rộng rãi và sáng sủa.', '広くて'],
  ['N5-MNN-L16-ADJ-JOIN', '京都は静かで、綺麗な町です。', 'きょうとはしずかで、きれいなまちです。', 'Kyoto là thành phố yên tĩnh và đẹp.', '静かで'],
  ['N5-MNN-L16-N1-WA-N2-GA-ADJ', '田中さんは背が高いです。', 'たなかさんはせがたかいです。', 'Anh Tanaka dáng người cao.', 'が'],
  ['N5-MNN-L16-N1-WA-N2-GA-ADJ', '奈良はお寺が有名です。', 'ならはおてらがゆうめいです。', 'Nara nổi tiếng về chùa chiền.', 'が'],
  // L17
  ['N5-MNN-L17-NAIDE-KUDASAI', 'ここに車を止めないでください。', 'ここにくるとめないでください。', 'Xin đừng đỗ xe ở đây.', 'ないでください'],
  ['N5-MNN-L17-NAIDE-KUDASAI', 'パスポートを忘れないでください。', 'パスポートをわすれないでください。', 'Xin đừng quên hộ chiếu.', 'ないでください'],
  ['N5-MNN-L17-NAKEREBA-NARIMASEN', '明日までにレポートを出さなければなりません。', 'あしたまでにレポートをださなければなりません。', 'Phải nộp báo cáo trước ngày mai.', 'なければなりません'],
  ['N5-MNN-L17-NAKEREBA-NARIMASEN', '毎日薬を飲まなければなりません。', 'まいにちくすりをのまなければなりません。', 'Mỗi ngày phải uống thuốc.', 'なければなりません'],
  ['N5-MNN-L17-NAKUTEMO-II', '日曜日は会社へ行かなくてもいいです。', 'にちようびはかいしゃへいかなくてもいいです。', 'Chủ nhật không cần đến công ty cũng được.', 'なくてもいいです'],
  ['N5-MNN-L17-NAKUTEMO-II', '明日は早く起きなくてもいいです。', 'あしたははやくおきなくてもいいです。', 'Ngày mai không cần dậy sớm cũng được.', 'なくてもいいです'],
  // L18
  ['N5-MNN-L18-KOTO-GA-DEKIMASU', '私は漢字を読むことができます。', 'わたしはかんじをよむことができます。', 'Tôi có thể đọc được chữ Hán.', 'ことができます'],
  ['N5-MNN-L18-KOTO-GA-DEKIMASU', 'カードで払うことができますか。', 'カードではらうことができますか。', 'Có thể thanh toán bằng thẻ được không?', 'ことができます'],
  ['N5-MNN-L18-SHUMI-WA-KOTO', '私の趣味は映画を見ることです。', 'わたしのしゅみはえいがをみることです。', 'Sở thích của tôi là xem phim.', 'ことです'],
  ['N5-MNN-L18-SHUMI-WA-KOTO', '兄の趣味は音楽を聴くことです。', 'あにのしゅみはおんがくをきくことです。', 'Sở thích của anh trai tôi là nghe nhạc.', 'ことです'],
  ['N5-MNN-L18-MAE-NI', '寝る前に、歯を磨きます。', 'ねるまえに、はをみがきます。', 'Trước khi đi ngủ tôi đánh răng.', '前に'],
  ['N5-MNN-L18-MAE-NI', '食事の前に、手を洗います。', 'しょくじのまえに、てをあらいます。', 'Trước bữa ăn tôi rửa tay.', 'の前に'],
  // L19
  ['N5-MNN-L19-TA-KOTO-GA-ARU', '私は富士山に登ったことがあります。', 'わたしはふじさんにのぼったことがあります。', 'Tôi đã từng leo núi Phú Sĩ.', 'たことがあります'],
  ['N5-MNN-L19-TA-KOTO-GA-ARU', 'お寿司を作ったことがありますか。', 'おすしをつくったことがありますか。', 'Bạn đã từng làm món Sushi bao giờ chưa?', 'たことがあります'],
  ['N5-MNN-L19-TARI-TARI', '日曜日は本を読んだり、音楽を聴いたりします。', 'にちようびはほんをよんだり、おんがくをきいたりします。', 'Chủ nhật tôi đọc sách rồi nghe nhạc các thứ.', 'たり'],
  ['N5-MNN-L19-TARI-TARI', '京都でお寺を見たり、写真を撮ったりしました。', 'きょうとでおてらをみたり、しゃしんをとったりしました。', 'Ở Kyoto tôi đi xem chùa và chụp ảnh các kiểu.', 'たり'],
  ['N5-MNN-L19-NARIMASU', '五時から暗くなります。', 'ごじからくらくなります。', 'Từ 5 giờ trời sẽ tối đi.', 'なります'],
  ['N5-MNN-L19-NARIMASU', '日本語が少しずつ上手になりました。', 'にほんごがすこしずつじょうずになりました。', 'Tiếng Nhật đã giỏi lên từng chút một.', 'になりました'],
  // L20
  ['N5-MNN-L20-PLAIN-FORM-RULES', '明日、東京へ行く。', 'あした、とうきょうへいく。', 'Ngày mai tôi đi Tokyo. (thể thường)', '行く'],
  ['N5-MNN-L20-PLAIN-FORM-RULES', '昨日のテストは簡単だった。', 'きのうのテストはかんたんだった。', 'Bài kiểm tra hôm qua dễ thật. (thể thường)', 'だった'],
  ['N5-MNN-L20-CASUAL-CONVERSATION', '明日、パーティーに行く？うん、行くよ。', 'あした、パーティーにいく？うん、いくよ。', 'Mai cậu có đi tiệc không? Ừ, đi chứ.', '？'],
  ['N5-MNN-L20-CASUAL-CONVERSATION', '今晩、映画見ない？いいね、見よう。', 'こんばん、えいがみない？いいね、みよう。', 'Tối nay xem phim không? Hay đấy, xem đi.', 'ない？'],
  // L21
  ['N5-MNN-L21-TO-OMOIMASU', '明日は雨が降ると思います。', 'あしたはあめがふるとおもいます。', 'Tôi nghĩ ngày mai trời sẽ mưa.', 'と思います'],
  ['N5-MNN-L21-TO-OMOIMASU', '日本の物価は高いと思います。', 'にほんのぶっかはたかいとおもいます。', 'Tôi nghĩ vật giá ở Nhật đắt.', 'と思います'],
  ['N5-MNN-L21-TO-IIMASU', '寝る前に「おやすみなさい」と言います。', 'ねるまえに「おやすみなさい」といいます。', 'Trước khi ngủ nói "Chúc ngủ ngon".', 'と言います'],
  ['N5-MNN-L21-TO-IIMASU', 'ミラーさんは来週帰国すると言いました。', 'ミラーさんはらいしゅうきこくするといいました。', 'Anh Miller đã nói tuần sau sẽ về nước.', 'と言いました'],
  ['N5-MNN-L21-DESHOU', '明日は寒いでしょう？はい、寒いです。', 'あしたはさむいでしょう？はい、さむいです。', 'Ngày mai chắc lạnh nhỉ? Ừ, lạnh đấy.', 'でしょう'],
  ['N5-MNN-L21-DESHOU', '北海道は雪が降るでしょう。', 'ほっかいどうはゆきがふるでしょう。', 'Ở Hokkaido chắc sẽ có tuyết rơi.', 'でしょう'],
  // L22
  ['N5-MNN-L22-NOUN-MODIFIER', 'これは先週私が買った本です。', 'これはせんしゅうわたしがかったほんです。', 'Đây là quyển sách tuần trước tôi đã mua.', '買った'],
  ['N5-MNN-L22-NOUN-MODIFIER', 'あそこで新聞を読んでいる人は先生です。', 'あそこでしんぶんをよんでいるひとはせんせいです。', 'Người đang đọc báo ở đằng kia là thầy giáo.', '読んでいる'],
  ['N5-MNN-L22-V-RU-JIKAN', '朝ご飯を食べる時間がありません。', 'あさごはんをたべるじかんがありません。', 'Tôi không có thời gian ăn sáng.', '食べる'],
  ['N5-MNN-L22-V-RU-JIKAN', '明日友達と会う約束があります。', 'あしたともだちとあうやくそくがあります。', 'Ngày mai tôi có hẹn gặp bạn.', '会う'],
  // L23
  ['N5-MNN-L23-TOKI', '図書館で本を借りるとき、カードがいります。', 'としょかんでほんをかりるとき、カードがいります。', 'Khi mượn sách ở thư viện cần có thẻ.', 'とき'],
  ['N5-MNN-L23-TOKI', '眠いとき、濃いコーヒーを飲みます。', 'ねむいとき、こいコーヒーをのみます。', 'Lúc buồn ngủ tôi uống cà phê đậm.', 'とき'],
  ['N5-MNN-L23-V-RU-TO', 'このボタンを押すと、お釣りが出ます。', 'このボタンをおすと、おつりがでます。', 'Hễ bấm nút này thì tiền thừa sẽ ra.', 'と'],
  ['N5-MNN-L23-V-RU-TO', '右へ曲がると、郵便局があります。', 'みぎへまがると、ゆうびんきょくがあります。', 'Hễ rẽ sang phải sẽ thấy bưu điện.', 'と'],
  // L24
  ['N5-MNN-L24-KUREMASU', '姉が誕生日にネクタイをくれました。', 'あねがたんじょうびにネクタイをくれました。', 'Chị gái đã tặng tôi chiếc cà vạt nhân sinh nhật.', 'くれました'],
  ['N5-MNN-L24-KUREMASU', '友達がお土産をくれました。', 'ともだちがおみやげをくれました。', 'Bạn tôi đã tặng quà lưu niệm cho tôi.', 'くれました'],
  ['N5-MNN-L24-TE-AGEMASU', '私はおばあさんに道を教えてあげました。', 'わたしはおばあさんにみちをおしえてあげました。', 'Tôi đã chỉ đường cho bà cụ.', 'てあげました'],
  ['N5-MNN-L24-TE-AGEMASU', '妹に日本語の本を買ってあげます。', 'いもうとににほんごのほんをかってあげます。', 'Tôi mua sách tiếng Nhật cho em gái.', 'あげます'],
  ['N5-MNN-L24-TE-MORAIMASU', '私は先輩に漢字を教えてもらいました。', 'わたしはせんぱいにかんじをおしえてもらいました。', 'Tôi đã được tiền bối dạy chữ Hán cho.', 'てもらいました'],
  ['N5-MNN-L24-TE-MORAIMASU', '先生に作文を直してもらいました。', 'せんせいにさくぶんをなおしてもらいました。', 'Tôi đã được thầy sửa bài viết cho.', 'てもらいました'],
  ['N5-MNN-L24-TE-KUREMASU', '山田さんが駅まで車で送ってくれました。', 'やまださんがえきまでくるまでおくってくれました。', 'Anh Yamada đã lái xe đưa tôi ra tận ga.', 'てくれました'],
  ['N5-MNN-L24-TE-KUREMASU', '友達が重い荷物を持ってくれました。', 'ともだちがおもいにもつをもってくれました。', 'Bạn tôi đã xách giúp hành lý nặng.', 'てくれました'],
  // L25
  ['N5-MNN-L25-TARA-IF', '雨が降ったら、出かけません。', 'あめがふったら、でかけません。', 'Nếu trời mưa thì tôi sẽ không ra ngoài.', '降ったら'],
  ['N5-MNN-L25-TARA-IF', '駅に着いたら、電話をかけてください。', 'えきについたら、でんわをかけてください。', 'Khi nào tới ga thì hãy gọi điện cho tôi nhé.', '着いたら'],
  ['N5-MNN-L25-TEMO-EVEN-IF', '雨が降っても、サッカーをします。', 'あめがふっても、サッカーをします。', 'Dù trời có mưa tôi vẫn đá bóng.', '降っても'],
  ['N5-MNN-L25-TEMO-EVEN-IF', '高くても、このカメラを買いたいです。', 'たかくても、このカメラをかいたいです。', 'Dù đắt tôi vẫn muốn mua chiếc máy ảnh này.', 'ても'],
];

export const minnaN5Sentences: GrammarSentence[] = buildCompactSentences(
  'MNN5',
  MINNA_N5_SENTENCE_ROWS,
);

// ==================== EXTRA N5 GRAMMAR BOOK: SOU MATOME N5 ====================
const BASIC_PRACTICE_TYPES: PracticeType[] = [
  'multiple_choice',
  'fill_blank',
  'ja_to_vi',
  'vi_to_ja',
  'grammar_selection',
  'mixed',
];

function buildExtraGrammarRule(params: {
  id: string;
  bookId: string;
  chapterId: string;
  level: 'N5' | 'N4' | 'N3';
  name: string;
  hiragana: string;
  meaning: string;
  explanation: string;
  usage: string;
  notes?: string;
  category?: SmartGrammarRule['category'];
  patterns: string[];
  templatePattern: string;
  templateVi: string;
}): SmartGrammarRule {
  return {
    id: params.id,
    bookId: params.bookId,
    chapterId: params.chapterId,
    level: params.level,
    name: params.name,
    hiragana: params.hiragana,
    meaning: params.meaning,
    explanation: params.explanation,
    usage: params.usage,
    notes: params.notes,
    category: params.category ?? 'relation',
    semanticFunction: params.id.toLowerCase(),
    allowedRelationTypes: [params.id.toLowerCase()],
    practiceTypes: BASIC_PRACTICE_TYPES,
    patterns: params.patterns.map((p) => ({ pattern: p, target: p })),
    templates: [
      {
        id: `${params.id}_T1`,
        grammarId: params.id,
        pattern: params.templatePattern,
        vietnamesePattern: params.templateVi,
        slots: [
          { name: 'A', allowedTypes: ['noun'], allowedForms: ['N'] },
          { name: 'B', allowedTypes: ['verb'], allowedForms: ['Vる'] },
        ],
      },
    ],
  };
}

export const soumatomeN5Book: GrammarBook = {
  id: 'SOUMATOME_N5',
  title: 'Nihongo Sou Matome Ngữ pháp N5',
  level: 'N5',
  chapters: [
    {
      id: 'W01',
      bookId: 'SOUMATOME_N5',
      chapterNumber: 1,
      title: 'Tuần 1: Trợ từ căn bản (は・が・を・に・で)',
      topics: ['particle', 'relation'],
      grammars: [
        buildExtraGrammarRule({
          id: 'N5-SMT-W01-GA-EXIST',
          bookId: 'SOUMATOME_N5',
          chapterId: 'W01',
          level: 'N5',
          name: 'Phân biệt trợ từ 「に」 và 「で」 chỉ nơi chốn',
          hiragana: 'に / で',
          meaning: 'Ở (nơi tồn tại) vs Tại (nơi diễn ra hành động)',
          explanation: '「に」 dùng với động từ chỉ sự tồn tại (います・あります・住んでいます). 「で」 dùng cho địa điểm diễn ra hành động (食べます・勉強します).',
          usage: 'Địa điểm + に + あります/います/住みます · Địa điểm + で + Động từ hành động',
          patterns: ['Địa điểm + に (Tồn tại)', 'Địa điểm + で (Hành động)'],
          templatePattern: '{A}で{B}。',
          templateVi: 'Làm {B} tại {A}.',
        }),
        buildExtraGrammarRule({
          id: 'N5-SMT-W01-TO-YA',
          bookId: 'SOUMATOME_N5',
          chapterId: 'W01',
          level: 'N5',
          name: 'Liệt kê danh từ: ～と～ vs ～や～など',
          hiragana: 'と / や～など',
          meaning: 'Và (liệt kê hết) vs Và... v.v. (liệt kê đại diện)',
          explanation: '「AとB」 liệt kê đầy đủ toàn bộ vật. 「AやBなど」 nêu vài ví dụ tiêu biểu trong nhiều vật.',
          usage: 'N1 + と + N2 / N1 + や + N2 + など',
          patterns: ['N1 + と + N2', 'N1 + や + N2 + など'],
          templatePattern: '{A}や{B}などがあります。',
          templateVi: 'Có {A}, {B}, v.v.',
        }),
      ],
    },
    {
      id: 'W02',
      bookId: 'SOUMATOME_N5',
      chapterNumber: 2,
      title: 'Tuần 2: Biến đổi Tính từ & Phó từ mức độ',
      topics: ['adjective', 'degree'],
      grammars: [
        buildExtraGrammarRule({
          id: 'N5-SMT-W02-AMARI-ZENZEN',
          bookId: 'SOUMATOME_N5',
          chapterId: 'W02',
          level: 'N5',
          name: 'Phó từ đi với phủ định: あまり / 全然 ～ない',
          hiragana: 'あまり・ぜんぜん',
          meaning: 'Không... lắm / Hoàn toàn không...',
          explanation: '「あまり」 đi với động từ hoặc tính từ phủ định diễn tả mức độ ít; 「ぜんぜん」 mang nghĩa phủ định hoàn toàn 100%.',
          usage: 'あまり + Vません / Aくない · 全然 + Vません / Aくない',
          patterns: ['あまり + Phủ định', '全然 + Phủ định'],
          templatePattern: 'あまり{B}ません。',
          templateVi: 'Không {B} lắm.',
        }),
        buildExtraGrammarRule({
          id: 'N5-SMT-W02-SUGIRU',
          bookId: 'SOUMATOME_N5',
          chapterId: 'W02',
          level: 'N5',
          name: '～すぎる / ～やすい (Quá mức / Dễ làm)',
          hiragana: 'すぎる',
          meaning: 'Quá... (vượt mức) / Dễ...',
          explanation: 'Thể hiện trạng thái vượt quá mức bình thường (tính từ bỏ い/な + すぎる, động từ bỏ ます + すぎる).',
          usage: 'Vます + すぎる / Aい(bỏ い) + すぎる / Aな + すぎる',
          patterns: ['Vます + すぎる', 'Adj + すぎる'],
          templatePattern: '{A}は大きすぎます。',
          templateVi: '{A} quá to.',
        }),
      ],
    },
    {
      id: 'W03',
      bookId: 'SOUMATOME_N5',
      chapterNumber: 3,
      title: 'Tuần 3: Thể て & Xin phép / Cấm đoán',
      topics: ['verb_form', 'request'],
      grammars: [
        buildExtraGrammarRule({
          id: 'N5-SMT-W03-TE-OKU',
          bookId: 'SOUMATOME_N5',
          chapterId: 'W03',
          level: 'N5',
          name: 'Vて みます (Thử làm V)',
          hiragana: 'てみます',
          meaning: 'Thử làm việc gì đó xem sao',
          explanation: 'Diễn tả hành động làm thử để kiểm tra kết quả hoặc cảm nhận.',
          usage: 'Động từ thể て + みます',
          patterns: ['Vて + みます'],
          templatePattern: '一度{B}てみます。',
          templateVi: 'Thử {B} một lần xem sao.',
        }),
        buildExtraGrammarRule({
          id: 'N5-SMT-W03-TE-SHIMAU',
          bookId: 'SOUMATOME_N5',
          chapterId: 'W03',
          level: 'N5',
          name: 'Vて しまいます (Hoàn thành xong / Lỡ mất)',
          hiragana: 'てしまいます',
          meaning: 'Làm xong hết hoàn toàn / Lỡ làm (tiếc nuối)',
          explanation: 'Nghĩa 1: hoàn thành dứt điểm hành động. Nghĩa 2: lỡ làm gì ngoài ý muốn.',
          usage: 'Động từ thể て + しまいます / しまいました',
          patterns: ['Vて + しまいます'],
          templatePattern: 'もう{B}てしまいました。',
          templateVi: 'Đã lỡ / đã làm xong {B} mất rồi.',
        }),
      ],
    },
    {
      id: 'W04',
      bookId: 'SOUMATOME_N5',
      chapterNumber: 4,
      title: 'Tuần 4: Mệnh đề, Nghi vấn từ & Ý chí',
      topics: ['clause', 'intention'],
      grammars: [
        buildExtraGrammarRule({
          id: 'N5-SMT-W04-TSUMORI',
          bookId: 'SOUMATOME_N5',
          chapterId: 'W04',
          level: 'N5',
          name: 'Vる / Vない + つもりです',
          hiragana: 'つもりです',
          meaning: 'Dự định làm / dự định không làm',
          explanation: 'Thể hiện ý định rõ ràng, kế hoạch của bản thân trong tương lai.',
          usage: 'Vる / Vない + つもりです',
          patterns: ['Vる + つもりです', 'Vない + つもりです'],
          templatePattern: '来年日本へ{B}つもりです。',
          templateVi: 'Năm sau tôi dự định {B} sang Nhật.',
        }),
        buildExtraGrammarRule({
          id: 'N5-SMT-W04-KARA-NODE',
          bookId: 'SOUMATOME_N5',
          chapterId: 'W04',
          level: 'N5',
          name: 'Nguyên nhân lịch sự: ～ので',
          hiragana: 'ので',
          meaning: 'Vì... cho nên... (mềm mỏng, khách quan)',
          explanation: 'Giống 「から」 nhưng mang sắc thái lịch sự, nhẹ nhàng, khách quan hơn khi trình bày lý do.',
          usage: 'V/Aい + ので · N/Aな + なので',
          patterns: ['V/Aい + ので', 'N/Aな + なので'],
          templatePattern: '時間がないので、{B}。',
          templateVi: 'Vì không có thời gian nên {B}.',
        }),
      ],
    },
    {
      id: 'W05',
      bookId: 'SOUMATOME_N5',
      chapterNumber: 5,
      title: 'Tuần 5: Tổng ôn Câu điều kiện & Giao tiếp',
      topics: ['condition', 'communication'],
      grammars: [
        buildExtraGrammarRule({
          id: 'N5-SMT-W05-HOU-GA-II',
          bookId: 'SOUMATOME_N5',
          chapterId: 'W05',
          level: 'N5',
          name: 'Vた / Vない + ほうがいいです',
          hiragana: 'ほうがいいです',
          meaning: 'Nên làm / Không nên làm...',
          explanation: 'Dùng để khuyên nhủ người khác nên làm hoặc tránh làm việc gì.',
          usage: 'Vた + ほうがいいです · Vない + ほうがいいです',
          patterns: ['Vた + ほうがいいです', 'Vない + ほうがいいです'],
          templatePattern: '薬を飲んだほうがいいです。',
          templateVi: 'Bạn nên uống thuốc.',
        }),
        buildExtraGrammarRule({
          id: 'N5-SMT-W05-KAMOSHIRENAI',
          bookId: 'SOUMATOME_N5',
          chapterId: 'W05',
          level: 'N5',
          name: 'Thể thông thường + かもしれません',
          hiragana: 'かもしれません',
          meaning: 'Có lẽ, biết đâu chừng (khả năng ~50%)',
          explanation: 'Dự đoán một sự việc có khả năng xảy ra nhưng người nói không chắc chắn lắm.',
          usage: 'V/Aい/Aな(bỏ だ)/N(bỏ だ) + かもしれません',
          patterns: ['Thể thường + かもしれません'],
          templatePattern: '明日は雨が降るかもしれません。',
          templateVi: 'Có lẽ ngày mai trời sẽ mưa.',
        }),
      ],
    },
  ],
};

export const soumatomeN5Sentences: GrammarSentence[] = buildCompactSentences('SMT5', [
  ['N5-SMT-W01-GA-EXIST', '部屋の机の上に猫がいます。', 'へやのつくえのうえにねこがいます。', 'Ở trên bàn trong phòng có con mèo.', 'に'],
  ['N5-SMT-W01-GA-EXIST', '図書館で友達と勉強します。', 'としょかんでともだちとべんきょうします。', 'Tôi học bài cùng bạn ở thư viện.', 'で'],
  ['N5-SMT-W01-TO-YA', '机の上にペンやノートなどがあります。', 'つくえのうえにペンやノートなどがあります。', 'Trên bàn có bút, vở, v.v.', 'など'],
  ['N5-SMT-W01-TO-YA', '冷蔵庫に牛乳と卵が入っています。', 'れいぞうこにぎゅうにゅうとたまごがはいっています。', 'Trong tủ lạnh có sữa bò và trứng.', 'と'],
  ['N5-SMT-W02-AMARI-ZENZEN', '私は辛い料理があまり好きじゃありません。', 'わたしはからいりょうりがあまりすきじゃありません。', 'Tôi không thích đồ ăn cay lắm.', 'あまり'],
  ['N5-SMT-W02-AMARI-ZENZEN', '昨日は忙しくて全然寝ませんでした。', 'きのうはいそがしくてぜんぜんねませんでした。', 'Hôm qua bận nên tôi hoàn toàn không ngủ.', '全然'],
  ['N5-SMT-W02-SUGIRU', '昨日の晩ご飯は食べすぎました。', 'きのうのばんごはんはたべすぎました。', 'Bữa tối hôm qua tôi đã ăn quá nhiều.', 'すぎました'],
  ['N5-SMT-W02-SUGIRU', 'この靴は私には少し大きすぎます。', 'このくつはわたしにはすこしおおきすぎます。', 'Đôi giày này hơi quá to với tôi.', 'すぎます'],
  ['N5-SMT-W03-TE-OKU', '日本の抹茶を飲んでみます。', 'にほんのまっちゃをのんでみます。', 'Tôi sẽ uống thử trà xanh Nhật Bản.', 'でみます'],
  ['N5-SMT-W03-TE-OKU', 'この靴を履いてみてもいいですか。', 'このくつをはいてみてもいいですか。', 'Tôi đi thử đôi giày này được không?', 'てみても'],
  ['N5-SMT-W03-TE-SHIMAU', '宿題をもう全部やってしまいました。', 'しゅくだいをもうぜんぶやってしまいました。', 'Tôi đã làm xong hết toàn bộ bài tập rồi.', 'てしまいました'],
  ['N5-SMT-W03-TE-SHIMAU', '電車に傘を忘れてしまいました。', 'でんしゃにかさをわすれてしまいました。', 'Tôi lỡ để quên ô trên tàu điện mất rồi.', 'てしまいました'],
  ['N5-SMT-W04-TSUMORI', '夏休みに国へ帰るつもりです。', 'なつやすみにくにへかえるつもりです。', 'Nghỉ hè tôi dự định sẽ về nước.', 'つもりです'],
  ['N5-SMT-W04-TSUMORI', '明日からはお菓子を食べないつもりです。', 'あしたからはおかしをたべないつもりです。', 'Từ mai tôi định sẽ không ăn đồ ngọt nữa.', 'つもりです'],
  ['N5-SMT-W04-KARA-NODE', '風邪を引いたので、今日は学校を休みます。', 'かぜをひいたので、きょうはがっこうをやすみます。', 'Vì bị cảm nên hôm nay tôi nghỉ học.', 'ので'],
  ['N5-SMT-W04-KARA-NODE', '雨が降っているので、傘を持って出かけます。', 'あめがふっているので、かさをもってでかけます。', 'Vì trời đang mưa nên tôi mang ô ra ngoài.', 'ので'],
  ['N5-SMT-W05-HOU-GA-II', '早く寝たほうがいいですよ。', 'はやくねたほうがいいですよ。', 'Bạn nên đi ngủ sớm đi nhé.', 'ほうがいいです'],
  ['N5-SMT-W05-HOU-GA-II', '夜遅くコーヒーを飲まないほうがいいです。', 'よるおそくコーヒーをのまないほうがいいです。', 'Đêm muộn thì không nên uống cà phê.', 'ほうがいいです'],
  ['N5-SMT-W05-KAMOSHIRENAI', '午後から雪が降るかもしれません。', 'ごごからゆきがふるかもしれません。', 'Từ chiều có lẽ tuyết sẽ rơi đấy.', 'かもしれません'],
  ['N5-SMT-W05-KAMOSHIRENAI', '田中さんは今日来ないかもしれません。', 'たなかさんはきょうこないかもしれません。', 'Có lẽ hôm nay anh Tanaka sẽ không đến.', 'かもしれません'],
]);
