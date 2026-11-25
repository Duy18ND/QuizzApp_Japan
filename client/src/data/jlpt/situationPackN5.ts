/**
 * N5 situation pack: 10 reading passages + 10 two-voice listening dialogues,
 * one of each per everyday situation. Written with `{漢字|かな}` ruby (see situationPackUtils.ts).
 */
import type { JLPTListeningItem, JLPTReadingPassage } from './jlptDataset';
import { situationListening, situationReading } from './situationPackUtils';

export const SITUATION_READING_N5: JLPTReadingPassage[] = [
  situationReading({
    id: 'sit-n5-r01',
    level: 'N5',
    situation: 'Trường học',
    title: 'Thông báo bài kiểm tra tiếng Nhật',
    paragraphs: [
      'あしたは{日本語|にほんご}のテストがあります。テストは{朝|あさ}{九時|くじ}から{十時|じゅうじ}までです。{二階|にかい}の２０１{教室|きょうしつ}に{来|き}てください。',
      'えんぴつと{消|け}しゴムを{持|も}ってきてください。{辞書|じしょ}は{使|つか}いません。',
    ],
    translation:
      'Ngày mai có bài kiểm tra tiếng Nhật, từ 9 giờ đến 10 giờ sáng. Hãy đến phòng học 201 ở tầng 2. Hãy mang bút chì và tẩy. Không dùng từ điển.',
    vocab: [
      ['教室', 'きょうしつ', 'phòng học'],
      ['消しゴム', 'けしゴム', 'cục tẩy'],
      ['辞書', 'じしょ', 'từ điển'],
    ],
    questions: [
      {
        prompt: 'テストのとき、{何|なに}を{持|も}っていきますか。',
        options: ['えんぴつと消しゴム', '辞書とえんぴつ', 'ノートと辞書', 'ボールペンだけ'],
        correct: 0,
        explanation: 'Bài viết: 「えんぴつと消しゴムを持ってきてください。辞書は使いません」→ mang bút chì và tẩy.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n5-r02',
    level: 'N5',
    situation: 'Mua sắm',
    title: 'Tờ rơi giảm giá của siêu thị',
    paragraphs: [
      'さくらスーパーのお{知|し}らせ。{今週|こんしゅう}の{土曜日|どようび}と{日曜日|にちようび}は、{野菜|やさい}と{果物|くだもの}が{安|やす}いです。りんごは{一|ひと}つ１００{円|えん}です。',
      '{肉|にく}は{日曜日|にちようび}だけ{安|やす}くなります。{店|みせ}は{朝|あさ}{十時|じゅうじ}から{夜|よる}{九時|くじ}までです。',
    ],
    translation:
      'Thông báo của siêu thị Sakura. Thứ Bảy và Chủ nhật tuần này rau và trái cây rẻ. Táo 100 yên một quả. Thịt chỉ giảm giá vào Chủ nhật. Cửa hàng mở từ 10 giờ sáng đến 9 giờ tối.',
    vocab: [
      ['野菜', 'やさい', 'rau'],
      ['果物', 'くだもの', 'trái cây'],
      ['肉', 'にく', 'thịt'],
    ],
    questions: [
      {
        prompt: '{肉|にく}が{安|やす}いのはいつですか。',
        options: ['土曜日だけ', '日曜日だけ', '土曜日と日曜日', '毎日'],
        correct: 1,
        explanation: '「肉は日曜日だけ安くなります」→ chỉ Chủ nhật. Rau và trái cây mới rẻ cả hai ngày.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n5-r03',
    level: 'N5',
    situation: 'Nhà hàng',
    title: 'Tin nhắn rủ đi ăn ramen',
    paragraphs: [
      '{田中|たなか}さんへ。{駅|えき}の{前|まえ}に{新|あたら}しいレストランができました。ラーメンが{有名|ゆうめい}で、{一|いっ}{杯|ぱい}７００{円|えん}です。',
      '{来週|らいしゅう}の{金曜日|きんようび}の{夜|よる}、いっしょに{行|い}きませんか。{返事|へんじ}をください。　マリア',
    ],
    translation:
      'Gửi anh Tanaka. Trước nhà ga vừa mở một nhà hàng mới. Món ramen ở đó nổi tiếng, 700 yên một bát. Tối thứ Sáu tuần sau mình cùng đi nhé? Hãy trả lời mình. — Maria',
    vocab: [
      ['有名', 'ゆうめい', 'nổi tiếng'],
      ['返事', 'へんじ', 'trả lời, hồi âm'],
    ],
    questions: [
      {
        prompt: 'マリアさんは{田中|たなか}さんと{何|なに}をしたいですか。',
        options: ['いっしょにレストランへ行きたい', 'ラーメンを作りたい', '駅で会いたい', '金曜日に休みたい'],
        correct: 0,
        explanation: '「いっしょに行きませんか」là lời rủ → Maria muốn cùng đi nhà hàng.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n5-r04',
    level: 'N5',
    situation: 'Ga tàu & Giao thông',
    title: 'Thông báo tàu chạy trễ vì tuyết',
    paragraphs: [
      '{電車|でんしゃ}のお{知|し}らせ。きょうは{雪|ゆき}で、{電車|でんしゃ}が{遅|おく}れています。',
      '{東京|とうきょう}{駅|えき}へ{行|い}く{人|ひと}は、バスを{使|つか}ってください。バスは{駅|えき}の{東口|ひがしぐち}から{出|で}ます。',
    ],
    translation:
      'Thông báo về tàu điện. Hôm nay do tuyết nên tàu bị trễ. Ai đi ga Tokyo hãy dùng xe buýt. Xe buýt xuất phát từ cửa Đông của nhà ga.',
    vocab: [
      ['遅れる', 'おくれる', 'trễ, muộn'],
      ['東口', 'ひがしぐち', 'cửa phía Đông'],
    ],
    questions: [
      {
        prompt: '{東京|とうきょう}{駅|えき}へ{行|い}く{人|ひと}はどうしますか。',
        options: ['電車を待ちます', '西口からバスに乗ります', '東口からバスに乗ります', 'タクシーに乗ります'],
        correct: 2,
        explanation: '「バスを使ってください。バスは駅の東口から出ます」→ đi xe buýt ở cửa Đông.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n5-r05',
    level: 'N5',
    situation: 'Bệnh viện',
    title: 'Giờ khám của phòng khám',
    paragraphs: [
      'やまだクリニック。{受付|うけつけ}は{午前|ごぜん}{九時|くじ}から{十二時|じゅうにじ}までと、{午後|ごご}{三時|さんじ}から{六時|ろくじ}までです。',
      '{水曜日|すいようび}の{午後|ごご}と{日曜日|にちようび}は{休|やす}みです。{保険証|ほけんしょう}を{忘|わす}れないでください。',
    ],
    translation:
      'Phòng khám Yamada. Quầy tiếp nhận mở từ 9 giờ đến 12 giờ sáng và từ 3 giờ đến 6 giờ chiều. Chiều thứ Tư và Chủ nhật nghỉ. Đừng quên mang thẻ bảo hiểm.',
    vocab: [
      ['受付', 'うけつけ', 'quầy tiếp nhận'],
      ['保険証', 'ほけんしょう', 'thẻ bảo hiểm y tế'],
    ],
    questions: [
      {
        prompt: '{水曜日|すいようび}の{何時|なんじ}に{行|い}くことができますか。',
        options: ['夜七時', '午後四時', '午前十時', '午後五時'],
        correct: 2,
        explanation: 'Thứ Tư nghỉ buổi chiều, nên chỉ đến được buổi sáng (9–12 giờ) → 10 giờ sáng.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n5-r06',
    level: 'N5',
    situation: 'Làm thêm & Công ty',
    title: 'Lịch làm thêm tuần sau',
    paragraphs: [
      'リンさん。{来週|らいしゅう}のアルバイトの{時間|じかん}です。{月曜日|げつようび}と{木曜日|もくようび}は{午後|ごご}{五時|ごじ}から{九時|くじ}までです。',
      '{土曜日|どようび}は{朝|あさ}{十時|じゅうじ}から{午後|ごご}{三時|さんじ}までです。{休|やす}みたい{日|ひ}は、{早|はや}く{言|い}ってください。　{店長|てんちょう}　{木村|きむら}',
    ],
    translation:
      'Gửi Linh. Đây là giờ làm thêm tuần sau. Thứ Hai và thứ Năm từ 5 giờ đến 9 giờ tối. Thứ Bảy từ 10 giờ sáng đến 3 giờ chiều. Ngày nào muốn nghỉ thì hãy báo sớm. — Cửa hàng trưởng Kimura',
    vocab: [
      ['店長', 'てんちょう', 'cửa hàng trưởng'],
      ['休む', 'やすむ', 'nghỉ'],
    ],
    questions: [
      {
        prompt: 'リンさんは{土曜日|どようび}、{何時間|なんじかん}アルバイトをしますか。',
        options: ['４時間', '５時間', '３時間', '６時間'],
        correct: 1,
        explanation: 'Thứ Bảy làm từ 10 giờ sáng đến 3 giờ chiều → 5 tiếng.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n5-r07',
    level: 'N5',
    situation: 'Nhà ở & Hàng xóm',
    title: 'Quy định đổ rác của khu nhà',
    paragraphs: [
      'ごみの{出|だ}し{方|かた}。{燃|も}えるごみは{月曜日|げつようび}と{木曜日|もくようび}の{朝|あさ}に{出|だ}してください。',
      'びんとかんは{水曜日|すいようび}です。{夜|よる}は{出|だ}さないでください。',
    ],
    translation:
      'Cách đổ rác. Rác cháy được hãy để ra vào sáng thứ Hai và thứ Năm. Chai lọ và lon là thứ Tư. Đừng để rác ra vào buổi tối.',
    vocab: [
      ['燃えるごみ', 'もえるごみ', 'rác cháy được'],
      ['びん', 'びん', 'chai, lọ thủy tinh'],
      ['かん', 'かん', 'lon'],
    ],
    questions: [
      {
        prompt: 'びんはいつ{出|だ}しますか。',
        options: ['水曜日の夜', '月曜日の朝', '木曜日の夜', '水曜日の朝'],
        correct: 3,
        explanation: 'Chai lọ là thứ Tư, và không được đổ buổi tối → sáng thứ Tư.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n5-r08',
    level: 'N5',
    situation: 'Bưu điện & Ngân hàng',
    title: 'Giờ làm việc của bưu điện',
    paragraphs: [
      '{郵便局|ゆうびんきょく}のお{知|し}らせ。{郵便局|ゆうびんきょく}は{月曜日|げつようび}から{金曜日|きんようび}まで、{九時|くじ}から{五時|ごじ}まで{開|あ}いています。',
      '{土曜日|どようび}と{日曜日|にちようび}は{休|やす}みです。{切手|きって}は{駅|えき}の{前|まえ}のコンビニでも{売|う}っています。',
    ],
    translation:
      'Thông báo của bưu điện. Bưu điện mở cửa từ thứ Hai đến thứ Sáu, từ 9 giờ đến 5 giờ. Thứ Bảy và Chủ nhật nghỉ. Tem cũng được bán ở cửa hàng tiện lợi trước nhà ga.',
    vocab: [
      ['郵便局', 'ゆうびんきょく', 'bưu điện'],
      ['切手', 'きって', 'tem'],
    ],
    questions: [
      {
        prompt: '{土曜日|どようび}に{切手|きって}がほしいです。どこへ{行|い}きますか。',
        options: ['郵便局', '銀行', '駅の前のコンビニ', '学校'],
        correct: 2,
        explanation: 'Thứ Bảy bưu điện nghỉ, nhưng tem có bán ở cửa hàng tiện lợi trước ga.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n5-r09',
    level: 'N5',
    situation: 'Du lịch & Khách sạn',
    title: 'Nhật ký chuyến đi Kyoto',
    paragraphs: [
      '{先週|せんしゅう}、{家族|かぞく}と{京都|きょうと}へ{行|い}きました。{新幹線|しんかんせん}で{二時間|にじかん}ぐらいでした。',
      '{京都|きょうと}で{古|ふる}いお{寺|てら}を{見|み}ました。{夜|よる}は{旅館|りょかん}に{泊|と}まって、おいしい{料理|りょうり}を{食|た}べました。とても{楽|たの}しかったです。',
    ],
    translation:
      'Tuần trước tôi cùng gia đình đi Kyoto. Đi tàu Shinkansen mất khoảng 2 tiếng. Ở Kyoto tôi đã xem chùa cổ. Buổi tối nghỉ ở nhà trọ kiểu Nhật và ăn những món ngon. Rất vui.',
    vocab: [
      ['新幹線', 'しんかんせん', 'tàu cao tốc Shinkansen'],
      ['旅館', 'りょかん', 'nhà trọ kiểu Nhật'],
      ['泊まる', 'とまる', 'nghỉ lại, trọ'],
    ],
    questions: [
      {
        prompt: 'この{人|ひと}は{京都|きょうと}で{何|なに}をしましたか。',
        options: ['新幹線を作りました', 'お寺を見て、旅館に泊まりました', '家族に手紙を書きました', '二時間歩きました'],
        correct: 1,
        explanation: '「古いお寺を見ました。夜は旅館に泊まって…」→ xem chùa và nghỉ ở ryokan.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n5-r10',
    level: 'N5',
    situation: 'Sự kiện & Sở thích',
    title: 'Lễ hội hoa anh đào ở công viên',
    paragraphs: [
      'さくらまつり。{四月|しがつ}{五日|いつか}（{土|ど}）に、{公園|こうえん}でさくらまつりがあります。{時間|じかん}は{十一時|じゅういちじ}から{四時|よじ}までです。',
      '{雨|あめ}のときは、{次|つぎ}の{日|ひ}になります。だれでも{来|き}てください。',
    ],
    translation:
      'Lễ hội hoa anh đào. Ngày 5 tháng 4 (thứ Bảy) có lễ hội hoa anh đào ở công viên, từ 11 giờ đến 4 giờ. Nếu mưa sẽ dời sang ngày hôm sau. Ai cũng có thể đến.',
    vocab: [
      ['まつり', 'まつり', 'lễ hội'],
      ['次の日', 'つぎのひ', 'ngày hôm sau'],
    ],
    questions: [
      {
        prompt: '{四月|しがつ}{五日|いつか}に{雨|あめ}が{降|ふ}りました。まつりはいつですか。',
        options: ['四月四日', '四月五日', 'ありません', '四月六日'],
        correct: 3,
        explanation: '「雨のときは、次の日になります」→ dời sang ngày hôm sau, tức ngày 6 tháng 4 (むいか).',
      },
    ],
  }),
];

export const SITUATION_LISTENING_N5: JLPTListeningItem[] = [
  situationListening({
    id: 'sit-n5-l01',
    level: 'N5',
    mondai: 'Mondai 1 · Hiểu nhiệm vụ',
    situationTag: 'Trường học',
    situation: 'Cô giáo nói với học sinh về buổi học ngày mai.',
    questionPrompt: '{学生|がくせい}はあした{何|なに}を{持|も}っていきますか。',
    lines: [
      ['女', 'みなさん、あしたは{公園|こうえん}で{絵|え}をかきます。'],
      ['男', '{先生|せんせい}、{何|なに}を{持|も}っていきますか。'],
      ['女', '{紙|かみ}とえんぴつを{持|も}ってきてください。{色|いろ}えんぴつは{学校|がっこう}にありますから、いりません。'],
      ['男', 'お{弁当|べんとう}は？'],
      ['女', 'お{昼|ひる}の{前|まえ}に{学校|がっこう}へ{帰|かえ}りますから、いりません。'],
    ],
    options: ['紙とえんぴつ', '紙と色えんぴつ', 'えんぴつとお弁当', '色えんぴつとお弁当'],
    correct: 0,
    translation:
      'Cô: Các em, ngày mai chúng ta vẽ tranh ở công viên.\nNam: Thưa cô, mang gì ạ?\nCô: Mang giấy và bút chì. Bút chì màu có ở trường rồi nên không cần.\nNam: Còn cơm hộp ạ?\nCô: Chúng ta về trường trước buổi trưa nên không cần.',
    explanation: 'Bút chì màu và cơm hộp đều 「いりません」(không cần) → chỉ mang giấy và bút chì.',
  }),
  situationListening({
    id: 'sit-n5-l02',
    level: 'N5',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Mua sắm',
    situation: 'Một người phụ nữ mua áo sơ mi ở cửa hàng quần áo.',
    questionPrompt: '{女|おんな}の{人|ひと}はどのシャツを{買|か}いますか。',
    lines: [
      ['店員', 'いらっしゃいませ。'],
      ['女', 'あの、この{白|しろ}いシャツはいくらですか。'],
      ['店員', '２０００{円|えん}です。{青|あお}いのは１５００{円|えん}です。'],
      ['女', 'じゃあ、{安|やす}いほうをください。'],
    ],
    options: ['白いシャツ', '青いシャツ', '黒いシャツ', '赤いシャツ'],
    correct: 1,
    translation:
      'Nhân viên: Xin mời quý khách.\nNữ: À, chiếc áo trắng này bao nhiêu tiền?\nNhân viên: 2000 yên ạ. Chiếc màu xanh là 1500 yên.\nNữ: Vậy cho tôi chiếc rẻ hơn.',
    explanation: '「安いほう」= chiếc rẻ hơn → áo xanh 1500 yên.',
  }),
  situationListening({
    id: 'sit-n5-l03',
    level: 'N5',
    mondai: 'Mondai 1 · Hiểu nhiệm vụ',
    situationTag: 'Nhà hàng',
    situation: 'Một người đàn ông gọi món ở quán ăn.',
    questionPrompt: '{男|おとこ}の{人|ひと}は{何|なに}を{注文|ちゅうもん}しましたか。',
    lines: [
      ['店員', 'ご{注文|ちゅうもん}は？'],
      ['男', 'カレーライスを{一|ひと}つと、コーヒーを{二|ふた}つください。'],
      ['店員', 'はい。コーヒーはご{飯|はん}のあとですか。'],
      ['男', 'いいえ、{今|いま}お{願|ねが}いします。'],
    ],
    options: ['カレーライス一つとコーヒー一つ', 'カレーライス二つとコーヒー一つ', 'カレーライス一つとコーヒー二つ', 'コーヒー二つだけ'],
    correct: 2,
    translation:
      'Nhân viên: Quý khách gọi món gì ạ?\nNam: Cho tôi một cơm cà ri và hai cà phê.\nNhân viên: Vâng. Cà phê mang sau bữa ăn phải không ạ?\nNam: Không, mang luôn bây giờ giúp tôi.',
    explanation: '「カレーライスを一つと、コーヒーを二つ」→ 1 cơm cà ri + 2 cà phê.',
  }),
  situationListening({
    id: 'sit-n5-l04',
    level: 'N5',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Ga tàu & Giao thông',
    situation: 'Một người phụ nữ hỏi nhân viên nhà ga về tàu đi Osaka.',
    questionPrompt: '{大阪|おおさか}へ{行|い}く{電車|でんしゃ}は、きょう{何番線|なんばんせん}から{出|で}ますか。',
    lines: [
      ['女', 'すみません、{大阪|おおさか}へ{行|い}く{電車|でんしゃ}は{何番線|なんばんせん}ですか。'],
      ['男', 'いつもは{三番線|さんばんせん}です。でも、きょうは{五番線|ごばんせん}から{出|で}ますよ。'],
      ['女', 'そうですか。ありがとうございます。'],
    ],
    options: ['五番線', '一番線', '三番線', '七番線'],
    correct: 0,
    translation:
      'Nữ: Xin lỗi, tàu đi Osaka ở đường ray số mấy ạ?\nNam: Bình thường là đường ray số 3. Nhưng hôm nay tàu chạy từ đường ray số 5.\nNữ: Vậy à. Cảm ơn anh.',
    explanation: 'Câu hỏi hỏi về 「きょう」(hôm nay) → đường ray số 5. Số 3 chỉ là bình thường (いつも).',
  }),
  situationListening({
    id: 'sit-n5-l05',
    level: 'N5',
    mondai: 'Mondai 1 · Hiểu nhiệm vụ',
    situationTag: 'Bệnh viện',
    situation: 'Bác sĩ dặn bệnh nhân cách uống thuốc.',
    questionPrompt: '{女|おんな}の{人|ひと}はいつ{薬|くすり}を{飲|の}みますか。',
    lines: [
      ['男', 'この{薬|くすり}は{一日|いちにち}に{三回|さんかい}、ご{飯|はん}のあとで{飲|の}んでください。'],
      ['女', '{寝|ね}る{前|まえ}にも{飲|の}みますか。'],
      ['男', 'いいえ、{寝|ね}る{前|まえ}は{飲|の}まないでください。'],
    ],
    options: ['ご飯の前に三回', 'ご飯のあとに三回', '寝る前に一回', 'ご飯のあとと寝る前'],
    correct: 1,
    translation:
      'Bác sĩ: Thuốc này uống ngày 3 lần, sau bữa ăn.\nNữ: Trước khi ngủ cũng uống ạ?\nBác sĩ: Không, trước khi ngủ thì đừng uống.',
    explanation: '「一日に三回、ご飯のあとで」và không uống trước khi ngủ → 3 lần sau bữa ăn.',
  }),
  situationListening({
    id: 'sit-n5-l06',
    level: 'N5',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Làm thêm & Công ty',
    situation: 'Một bạn nữ xin cửa hàng trưởng đổi giờ làm thêm ngày mai.',
    questionPrompt: '{女|おんな}の{人|ひと}はあした{何時|なんじ}から{何時|なんじ}まで{働|はたら}きますか。',
    lines: [
      ['女', '{店長|てんちょう}、あしたのアルバイトですが…。'],
      ['男', 'はい、{何|なん}ですか。'],
      ['女', '{学校|がっこう}のテストがありますから、{午後|ごご}{三時|さんじ}から{来|き}てもいいですか。'],
      ['男', 'いいですよ。じゃあ、{三時|さんじ}から{八時|はちじ}までお{願|ねが}いします。'],
    ],
    options: ['午後一時から八時まで', '午後三時から八時まで', '午後三時から五時まで', '朝九時から三時まで'],
    correct: 1,
    translation:
      'Nữ: Anh cửa hàng trưởng, về ca làm thêm ngày mai ạ...\nNam: Ừ, có chuyện gì?\nNữ: Em có bài kiểm tra ở trường nên em đến từ 3 giờ chiều có được không ạ?\nNam: Được. Vậy em làm từ 3 giờ đến 8 giờ nhé.',
    explanation: 'Cửa hàng trưởng chốt: 「三時から八時までお願いします」→ 3 giờ đến 8 giờ.',
  }),
  situationListening({
    id: 'sit-n5-l07',
    level: 'N5',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Nhà ở & Hàng xóm',
    situation: 'Người mới chuyển đến chào hàng xóm và hỏi về ngày đổ rác.',
    questionPrompt: 'ごみは{何時|なんじ}までに{出|だ}しますか。',
    lines: [
      ['男', 'はじめまして。{隣|となり}に{来|き}たキムです。よろしくお{願|ねが}いします。'],
      ['女', 'はじめまして。{山田|やまだ}です。ごみは{月曜日|げつようび}と{木曜日|もくようび}ですよ。'],
      ['男', '{朝|あさ}{何時|なんじ}までに{出|だ}しますか。'],
      ['女', '{八時|はちじ}までです。'],
    ],
    options: ['月曜日の夜まで', '木曜日の昼まで', '朝七時まで', '朝八時まで'],
    correct: 3,
    translation:
      'Nam: Xin chào, tôi là Kim mới đến ở phòng bên cạnh. Mong được giúp đỡ.\nNữ: Xin chào, tôi là Yamada. Rác đổ vào thứ Hai và thứ Năm nhé.\nNam: Buổi sáng phải đổ trước mấy giờ ạ?\nNữ: Trước 8 giờ.',
    explanation: '「八時までです」→ đổ rác trước 8 giờ sáng.',
  }),
  situationListening({
    id: 'sit-n5-l08',
    level: 'N5',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Bưu điện & Ngân hàng',
    situation: 'Một người phụ nữ gửi bưu kiện về Việt Nam ở bưu điện.',
    questionPrompt: '{荷物|にもつ}はどのぐらいでベトナムに{着|つ}きますか。',
    lines: [
      ['女', 'この{荷物|にもつ}をベトナムへ{送|おく}りたいです。'],
      ['男', '{飛行機|ひこうき}は{一週間|いっしゅうかん}ぐらい、{船|ふね}は{一|いっ}か{月|げつ}ぐらいです。'],
      ['女', '{飛行機|ひこうき}は{高|たか}いですが、{早|はや}いほうがいいです。{飛行機|ひこうき}でお{願|ねが}いします。'],
    ],
    options: ['一か月ぐらい', '三日ぐらい', '二週間ぐらい', '一週間ぐらい'],
    correct: 3,
    translation:
      'Nữ: Tôi muốn gửi kiện hàng này về Việt Nam.\nNam: Đường hàng không khoảng một tuần, đường biển khoảng một tháng.\nNữ: Hàng không đắt nhưng nhanh thì tốt hơn. Cho tôi gửi đường hàng không.',
    explanation: 'Chị chọn 飛行機 (hàng không) → khoảng một tuần.',
  }),
  situationListening({
    id: 'sit-n5-l09',
    level: 'N5',
    mondai: 'Mondai 1 · Hiểu nhiệm vụ',
    situationTag: 'Du lịch & Khách sạn',
    situation: 'Một khách nam làm thủ tục nhận phòng ở khách sạn.',
    questionPrompt: '{朝|あさ}ご{飯|はん}はどこで{食|た}べますか。',
    lines: [
      ['男', 'チェックインをお{願|ねが}いします。'],
      ['女', 'はい。お{部屋|へや}は{七階|ななかい}の７１２です。{朝|あさ}ご{飯|はん}は{二階|にかい}のレストランで、{七時|しちじ}から{九時|くじ}までです。'],
      ['男', 'わかりました。ありがとう。'],
    ],
    options: ['七階の部屋', '一階のロビー', '二階のレストラン', '外の店'],
    correct: 2,
    translation:
      'Nam: Cho tôi nhận phòng.\nNữ: Vâng. Phòng của quý khách là 712 ở tầng 7. Bữa sáng ở nhà hàng tầng 2, từ 7 giờ đến 9 giờ.\nNam: Tôi hiểu rồi. Cảm ơn.',
    explanation: '「朝ご飯は二階のレストランで」→ ăn sáng ở nhà hàng tầng 2. Tầng 7 là phòng ngủ.',
  }),
  situationListening({
    id: 'sit-n5-l10',
    level: 'N5',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Sự kiện & Sở thích',
    situation: 'Hai người bạn nói chuyện về kế hoạch cuối tuần.',
    questionPrompt: '{男|おとこ}の{人|ひと}は{日曜日|にちようび}に{何|なに}をしますか。',
    lines: [
      ['女', '{週末|しゅうまつ}、{何|なに}をしますか。'],
      ['男', '{土曜日|どようび}は{友|とも}だちとテニスをします。{日曜日|にちようび}は{家|いえ}で{映画|えいが}を{見|み}ます。'],
      ['女', 'いいですね。わたしは{日曜日|にちようび}にプールへ{行|い}きます。'],
    ],
    options: ['テニスをします', 'プールへ行きます', '家で映画を見ます', '友だちと買い物をします'],
    correct: 2,
    translation:
      'Nữ: Cuối tuần anh làm gì?\nNam: Thứ Bảy tôi chơi tennis với bạn. Chủ nhật tôi xem phim ở nhà.\nNữ: Hay quá. Tôi thì Chủ nhật đi bể bơi.',
    explanation: 'Câu hỏi về NAM vào CHỦ NHẬT → xem phim ở nhà. Đi bể bơi là của người nữ.',
  }),
];
