/**
 * N4 situation pack: 10 reading passages + 10 two-voice listening dialogues,
 * one of each per everyday situation. Written with `{漢字|かな}` ruby (see situationPackUtils.ts).
 */
import type { JLPTListeningItem, JLPTReadingPassage } from './jlptDataset';
import { situationListening, situationReading } from './situationPackUtils';

export const SITUATION_READING_N4: JLPTReadingPassage[] = [
  situationReading({
    id: 'sit-n4-r01',
    level: 'N4',
    situation: 'Trường học',
    title: 'Thông báo đổi ngày dã ngoại',
    paragraphs: [
      '{来月|らいげつ}の{遠足|えんそく}についてお{知|し}らせします。{天気|てんき}が{悪|わる}くなりそうなので、{日|ひ}にちを{変|か}えることになりました。',
      '{十月|じゅうがつ}{十日|とおか}ではなく、{十七日|じゅうしちにち}に{行|い}きます。{集合|しゅうごう}は{朝|あさ}{八時|はちじ}{半|はん}、{学校|がっこう}の{正門|せいもん}です。お{弁当|べんとう}と{水筒|すいとう}を{忘|わす}れないようにしてください。',
    ],
    translation:
      'Thông báo về chuyến dã ngoại tháng sau. Vì có vẻ thời tiết sẽ xấu nên đã quyết định đổi ngày. Thay vì ngày 10 tháng 10, sẽ đi vào ngày 17. Tập trung lúc 8 giờ 30 sáng ở cổng chính của trường. Hãy chú ý đừng quên cơm hộp và bình nước.',
    vocab: [
      ['遠足', 'えんそく', 'chuyến dã ngoại'],
      ['集合', 'しゅうごう', 'tập trung'],
      ['水筒', 'すいとう', 'bình nước'],
    ],
    questions: [
      {
        prompt: '{遠足|えんそく}はいつになりましたか。',
        options: ['十月十日', '十月十七日', '十月七日', '十一月十日'],
        correct: 1,
        explanation: '「十月十日ではなく、十七日に行きます」→ ngày 17 tháng 10.',
      },
      {
        prompt: '{何|なに}を{持|も}っていかなければなりませんか。',
        options: ['お弁当と水筒', '教科書と水筒', 'お金とお弁当', 'カメラと地図'],
        correct: 0,
        explanation: '「お弁当と水筒を忘れないようにしてください」→ cơm hộp và bình nước.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n4-r02',
    level: 'N4',
    situation: 'Mua sắm',
    title: 'Quy định đổi hàng của cửa hàng',
    paragraphs: [
      '{当店|とうてん}で{買|か}った{商品|しょうひん}は、レシートがあれば、{一週間|いっしゅうかん}{以内|いない}なら{交換|こうかん}できます。',
      'ただし、{一度|いちど}{使|つか}った{物|もの}や、セールで{買|か}った{物|もの}は{交換|こうかん}できませんので、ご{注意|ちゅうい}ください。',
    ],
    translation:
      'Hàng mua tại cửa hàng chúng tôi, nếu có hóa đơn thì có thể đổi trong vòng một tuần. Tuy nhiên, hàng đã dùng một lần hoặc hàng mua trong đợt giảm giá thì không đổi được, xin lưu ý.',
    vocab: [
      ['交換', 'こうかん', 'trao đổi, đổi hàng'],
      ['以内', 'いない', 'trong vòng'],
      ['ただし', 'ただし', 'tuy nhiên (điều kiện ngoại lệ)'],
    ],
    questions: [
      {
        prompt: '{交換|こうかん}できるのはどれですか。',
        options: [
          '三日前に買って、一度使ったかばん',
          'セールで買って、まだ使っていない服',
          '五日前に買って、まだ使っていない靴（レシートあり）',
          '二週間前に買った帽子（レシートあり）',
        ],
        correct: 2,
        explanation:
          'Đủ 3 điều kiện: có hóa đơn, trong vòng 1 tuần, chưa dùng và không phải hàng sale → đôi giày mua 5 ngày trước.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n4-r03',
    level: 'N4',
    situation: 'Nhà hàng',
    title: 'Cách đặt bàn nhà hàng Hanabi',
    paragraphs: [
      'レストラン「はなび」は、{昼|ひる}は{予約|よやく}しなくても{入|はい}れますが、{夜|よる}は{予約|よやく}が{必要|ひつよう}です。',
      '{予約|よやく}は{電話|でんわ}かインターネットでできます。{六人|ろくにん}{以上|いじょう}の{場合|ばあい}は、{三日前|みっかまえ}までに{電話|でんわ}で{予約|よやく}してください。',
    ],
    translation:
      'Nhà hàng Hanabi buổi trưa không cần đặt trước cũng vào được, nhưng buổi tối thì cần đặt bàn. Có thể đặt qua điện thoại hoặc Internet. Trường hợp từ 6 người trở lên, hãy đặt qua điện thoại trước 3 ngày.',
    vocab: [
      ['予約', 'よやく', 'đặt trước'],
      ['必要', 'ひつよう', 'cần thiết'],
      ['場合', 'ばあい', 'trường hợp'],
    ],
    questions: [
      {
        prompt: '{八人|はちにん}で{夜|よる}に{食事|しょくじ}をしたいです。どうしなければなりませんか。',
        options: ['予約しないで行く', '前の日にインターネットで予約する', '三日前までに電話で予約する', '当日に電話で予約する'],
        correct: 2,
        explanation: '8 người ≥ 6 người → phải đặt qua điện thoại trước 3 ngày.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n4-r04',
    level: 'N4',
    situation: 'Ga tàu & Giao thông',
    title: 'Khi để quên đồ trên tàu',
    paragraphs: [
      '{電車|でんしゃ}の{中|なか}に{忘|わす}れ{物|もの}をしたときは、{駅|えき}の{事務室|じむしつ}に{連絡|れんらく}してください。',
      '{忘|わす}れ{物|もの}は、{三日間|みっかかん}は{駅|えき}で{預|あず}かりますが、そのあとは{警察|けいさつ}に{送|おく}られます。{取|と}りに{来|く}るときは、{名前|なまえ}がわかる{物|もの}を{持|も}ってきてください。',
    ],
    translation:
      'Khi để quên đồ trên tàu, hãy liên lạc với văn phòng nhà ga. Đồ để quên được nhà ga giữ trong 3 ngày, sau đó sẽ được chuyển đến cảnh sát. Khi đến nhận, hãy mang theo giấy tờ có ghi tên.',
    vocab: [
      ['忘れ物', 'わすれもの', 'đồ để quên'],
      ['預かる', 'あずかる', 'giữ hộ'],
      ['警察', 'けいさつ', 'cảnh sát'],
    ],
    questions: [
      {
        prompt: '{五日前|いつかまえ}に{電車|でんしゃ}に{傘|かさ}を{忘|わす}れました。どこへ{取|と}りに{行|い}けばいいですか。',
        options: ['駅の事務室', '警察', '電車の中', '駅の改札'],
        correct: 1,
        explanation: 'Nhà ga chỉ giữ 3 ngày, sau đó chuyển cho cảnh sát (受身: 送られます) → 5 ngày rồi thì đến cảnh sát.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n4-r05',
    level: 'N4',
    situation: 'Bệnh viện',
    title: 'Lưu ý trước buổi khám sức khỏe',
    paragraphs: [
      '{会社|かいしゃ}の{健康診断|けんこうしんだん}は{来週|らいしゅう}の{水曜日|すいようび}です。',
      '{検査|けんさ}の{前|まえ}の{日|ひ}の{夜|よる}{九時|くじ}からは、{何|なに}も{食|た}べないでください。{水|みず}は{飲|の}んでもかまいません。{当日|とうじつ}の{朝|あさ}は、{薬|くすり}も{飲|の}まないでください。',
    ],
    translation:
      'Buổi khám sức khỏe của công ty là thứ Tư tuần sau. Từ 9 giờ tối ngày hôm trước buổi kiểm tra, đừng ăn gì cả. Uống nước thì không sao. Sáng hôm đó cũng đừng uống thuốc.',
    vocab: [
      ['健康診断', 'けんこうしんだん', 'khám sức khỏe'],
      ['検査', 'けんさ', 'kiểm tra, xét nghiệm'],
      ['当日', 'とうじつ', 'ngày hôm đó'],
    ],
    questions: [
      {
        prompt: '{健康診断|けんこうしんだん}の{前|まえ}の{日|ひ}の{夜|よる}{十時|じゅうじ}に、してもいいことはどれですか。',
        options: ['水を飲む', 'パンを食べる', '薬を飲む', 'ご飯を食べる'],
        correct: 0,
        explanation: 'Sau 9 giờ tối không được ăn, nhưng 「水は飲んでもかまいません」→ được uống nước.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n4-r06',
    level: 'N4',
    situation: 'Làm thêm & Công ty',
    title: 'Tuyển nhân viên làm thêm ở cửa hàng tiện lợi',
    paragraphs: [
      'アルバイト{募集|ぼしゅう}。コンビニ「ハッピー」で{働|はたら}く{人|ひと}を{探|さが}しています。{時給|じきゅう}は１１００{円|えん}で、{夜|よる}{十時|じゅうじ}からは１３００{円|えん}になります。',
      '{週|しゅう}に{三日|みっか}{以上|いじょう}{働|はたら}ける{人|ひと}を{探|さが}しています。{日本語|にほんご}が{少|すこ}しできれば、{留学生|りゅうがくせい}でも{大丈夫|だいじょうぶ}です。',
    ],
    translation:
      'Tuyển nhân viên làm thêm. Cửa hàng tiện lợi Happy đang tìm người làm việc. Lương theo giờ 1100 yên, từ 10 giờ tối là 1300 yên. Tìm người có thể làm từ 3 ngày/tuần trở lên. Nếu biết chút tiếng Nhật thì du học sinh cũng được.',
    vocab: [
      ['募集', 'ぼしゅう', 'tuyển dụng'],
      ['時給', 'じきゅう', 'lương theo giờ'],
      ['留学生', 'りゅうがくせい', 'du học sinh'],
    ],
    questions: [
      {
        prompt: 'この{店|みせ}で{働|はたら}けるのはだれですか。',
        options: [
          '週に一日だけ働きたい日本人',
          '週に四日働きたい、日本語が少しできる留学生',
          '日本語がぜんぜんできない人',
          '朝だけ月に二回働きたい人',
        ],
        correct: 1,
        explanation: 'Điều kiện: ≥ 3 ngày/tuần và biết chút tiếng Nhật → du học sinh làm 4 ngày/tuần.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n4-r07',
    level: 'N4',
    situation: 'Nhà ở & Hàng xóm',
    title: 'Thông báo cắt nước của chung cư',
    paragraphs: [
      'マンションの{皆様|みなさま}へ。{水道|すいどう}の{工事|こうじ}のため、{来週|らいしゅう}の{火曜日|かようび}、{午前|ごぜん}{十時|じゅうじ}から{午後|ごご}{二時|にじ}まで{水|みず}が{止|と}まります。',
      'その{間|あいだ}は、トイレやシャワーが{使|つか}えません。{必要|ひつよう}な{水|みず}は、{前|まえ}の{日|ひ}までに{用意|ようい}しておいてください。',
    ],
    translation:
      'Gửi cư dân chung cư. Do thi công đường ống nước, thứ Ba tuần sau từ 10 giờ sáng đến 2 giờ chiều sẽ cắt nước. Trong thời gian đó không dùng được nhà vệ sinh và vòi sen. Hãy chuẩn bị sẵn lượng nước cần dùng trước ngày hôm đó.',
    vocab: [
      ['工事', 'こうじ', 'thi công'],
      ['水道', 'すいどう', 'nước máy, đường nước'],
      ['用意する', 'よういする', 'chuẩn bị'],
    ],
    questions: [
      {
        prompt: '{住|す}んでいる{人|ひと}は{何|なに}をしておかなければなりませんか。',
        options: ['火曜日の朝にシャワーを使う', '工事を手伝う', '午後二時に管理人に電話する', '月曜日までに水を用意する'],
        correct: 3,
        explanation: '「前の日までに用意しておいてください」→ chuẩn bị nước trước thứ Ba, tức đến thứ Hai.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n4-r08',
    level: 'N4',
    situation: 'Bưu điện & Ngân hàng',
    title: 'Giờ sử dụng và phí ATM',
    paragraphs: [
      'さくら{銀行|ぎんこう}のATMは、{平日|へいじつ}は{朝|あさ}{八時|はちじ}から{夜|よる}{九時|くじ}まで{使|つか}えます。',
      '{土曜日|どようび}・{日曜日|にちようび}も{使|つか}えますが、{午後|ごご}{五時|ごじ}を{過|す}ぎると{手数料|てすうりょう}が２２０{円|えん}かかります。{平日|へいじつ}の{手数料|てすうりょう}は{無料|むりょう}です。',
    ],
    translation:
      'ATM của ngân hàng Sakura dùng được từ 8 giờ sáng đến 9 giờ tối vào ngày thường. Thứ Bảy, Chủ nhật cũng dùng được, nhưng sau 5 giờ chiều mất phí 220 yên. Ngày thường thì miễn phí.',
    vocab: [
      ['平日', 'へいじつ', 'ngày thường'],
      ['手数料', 'てすうりょう', 'phí giao dịch'],
      ['無料', 'むりょう', 'miễn phí'],
    ],
    questions: [
      {
        prompt: '{手数料|てすうりょう}がかからないで{使|つか}えるのはどれですか。',
        options: ['土曜日の午後六時', '水曜日の午後三時', '日曜日の午後七時', '月曜日の夜十時'],
        correct: 1,
        explanation: 'Ngày thường miễn phí và mở đến 9 giờ tối → thứ Tư 3 giờ chiều. Thứ Hai 10 giờ tối thì ATM đã đóng.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n4-r09',
    level: 'N4',
    moduleId: 'reading-medium',
    situation: 'Du lịch & Khách sạn',
    title: 'Hướng dẫn sử dụng khách sạn Minato',
    paragraphs: [
      'ホテル「みなと」のご{案内|あんない}。チェックインは{午後|ごご}{三時|さんじ}から、チェックアウトは{午前|ごぜん}{十時|じゅうじ}までです。',
      '{大浴場|だいよくじょう}は{六階|ろっかい}にあり、{夜|よる}{十二時|じゅうにじ}まで{利用|りよう}できます。タオルはお{部屋|へや}にありますので、{持|も}って{行|い}ってください。',
      'チェックアウトのあと、{荷物|にもつ}をフロントで{預|あず}かることもできます。{観光|かんこう}に{行|い}くときに、ぜひご{利用|りよう}ください。',
    ],
    translation:
      'Hướng dẫn của khách sạn Minato. Nhận phòng từ 3 giờ chiều, trả phòng trước 10 giờ sáng. Phòng tắm lớn ở tầng 6, dùng được đến 12 giờ đêm. Khăn tắm có trong phòng nên hãy mang theo. Sau khi trả phòng, quầy lễ tân có thể giữ hành lý giúp. Khi đi tham quan, hãy sử dụng dịch vụ này.',
    vocab: [
      ['大浴場', 'だいよくじょう', 'phòng tắm chung lớn'],
      ['利用', 'りよう', 'sử dụng'],
      ['観光', 'かんこう', 'tham quan'],
    ],
    questions: [
      {
        prompt: '{大浴場|だいよくじょう}へ{行|い}くとき、{何|なに}を{持|も}っていきますか。',
        options: ['部屋のタオル', 'フロントの鍵', '入場チケット', 'お金'],
        correct: 0,
        explanation: '「タオルはお部屋にありますので、持って行ってください」→ mang khăn trong phòng.',
      },
      {
        prompt: 'チェックアウトのあと{観光|かんこう}したいです。{荷物|にもつ}はどうしますか。',
        options: ['部屋に置いておく', '六階に置く', 'フロントに預ける', '持って観光する'],
        correct: 2,
        explanation: '「荷物をフロントで預かることもできます」→ gửi ở quầy lễ tân.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n4-r10',
    level: 'N4',
    situation: 'Sự kiện & Sở thích',
    title: 'Câu lạc bộ hội thoại tiếng Nhật',
    paragraphs: [
      '{日本語|にほんご}{会話|かいわ}クラブのお{知|し}らせ。{毎週|まいしゅう}{金曜日|きんようび}の{夕方|ゆうがた}{六時|ろくじ}から、{市民|しみん}センターで{日本人|にほんじん}と{話|はな}す{練習|れんしゅう}をしています。',
      '{参加費|さんかひ}は{一回|いっかい}３００{円|えん}です。{初|はじ}めての{人|ひと}は{無料|むりょう}なので、{気軽|きがる}に{来|き}てみてください。',
    ],
    translation:
      'Thông báo của câu lạc bộ hội thoại tiếng Nhật. Mỗi thứ Sáu từ 6 giờ chiều, chúng tôi luyện nói chuyện với người Nhật tại Trung tâm thị dân. Phí tham gia 300 yên mỗi lần. Người đến lần đầu được miễn phí, nên hãy thoải mái đến thử nhé.',
    vocab: [
      ['参加費', 'さんかひ', 'phí tham gia'],
      ['気軽に', 'きがるに', 'thoải mái, không ngại'],
    ],
    questions: [
      {
        prompt: '{初|はじ}めて{参加|さんか}する{人|ひと}はいくら{払|はら}いますか。',
        options: ['払わなくてもいい', '三百円', '六百円', '百円'],
        correct: 0,
        explanation: '「初めての人は無料」→ lần đầu không phải trả tiền.',
      },
    ],
  }),
];

export const SITUATION_LISTENING_N4: JLPTListeningItem[] = [
  situationListening({
    id: 'sit-n4-l01',
    level: 'N4',
    mondai: 'Mondai 1 · Hiểu nhiệm vụ',
    situationTag: 'Trường học',
    situation: 'Sinh viên nam hỏi cô giáo về bài báo cáo.',
    questionPrompt: '{男|おとこ}の{学生|がくせい}はまず{何|なに}をしますか。',
    lines: [
      ['女', 'レポートは{来週|らいしゅう}の{月曜日|げつようび}までに{出|だ}してください。'],
      ['男', '{先生|せんせい}、パソコンで{書|か}いてもいいですか。'],
      ['女', 'ええ、いいですよ。でも、{書|か}く{前|まえ}に{一度|いちど}、テーマをメールで{送|おく}ってください。'],
      ['男', 'わかりました。じゃあ、きょうテーマを{考|かんが}えて{送|おく}ります。'],
    ],
    options: ['レポートを出す', 'パソコンを買う', 'テーマをメールで送る', '先生に電話する'],
    correct: 2,
    translation:
      'Cô: Hãy nộp báo cáo trước thứ Hai tuần sau.\nNam: Thưa cô, em viết bằng máy tính được không ạ?\nCô: Được. Nhưng trước khi viết hãy gửi chủ đề qua email cho cô một lần.\nNam: Em hiểu rồi. Vậy hôm nay em nghĩ chủ đề rồi gửi ạ.',
    explanation: 'Việc đầu tiên (まず) là gửi chủ đề qua email — 「書く前に…送ってください」.',
  }),
  situationListening({
    id: 'sit-n4-l02',
    level: 'N4',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Mua sắm',
    situation: 'Hai vợ chồng xem tủ lạnh ở cửa hàng điện máy.',
    questionPrompt: '{女|おんな}の{人|ひと}はどうして{冷蔵庫|れいぞうこ}を{買|か}いませんか。',
    lines: [
      ['男', 'この{冷蔵庫|れいぞうこ}、{安|やす}いね。{買|か}わないの？'],
      ['女', 'うん、{値段|ねだん}はいいんだけど、ちょっと{大|おお}きすぎるの。{台所|だいどころ}に{入|はい}らないと{思|おも}う。'],
      ['男', 'そうか。じゃあ、もう{少|すこ}し{小|ちい}さいのを{探|さが}そう。'],
    ],
    options: ['値段が高いから', '大きすぎるから', '色がよくないから', '古いから'],
    correct: 1,
    translation:
      'Nam: Tủ lạnh này rẻ nhỉ. Không mua à?\nNữ: Ừ, giá thì được nhưng hơi to quá. Em nghĩ không vừa nhà bếp.\nNam: Vậy à. Thế mình tìm cái nhỏ hơn chút nhé.',
    explanation: '「値段はいいんだけど、ちょっと大きすぎる」→ lý do là quá to. Bẫy: giá rẻ (không phải đắt).',
  }),
  situationListening({
    id: 'sit-n4-l03',
    level: 'N4',
    mondai: 'Mondai 1 · Hiểu nhiệm vụ',
    situationTag: 'Nhà hàng',
    situation: 'Một khách nữ gọi điện thay đổi đặt bàn.',
    questionPrompt: '{予約|よやく}はどうなりましたか。',
    lines: [
      ['女', 'もしもし、{今晩|こんばん}{七時|しちじ}に{四人|よにん}で{予約|よやく}した{林|はやし}ですが。'],
      ['男', 'はい、{林様|はやしさま}ですね。'],
      ['女', 'すみません、{一人|ひとり}{増|ふ}えて{五人|ごにん}になったんですが、{大丈夫|だいじょうぶ}ですか。それから、{時間|じかん}を{七時半|しちじはん}にしてもらえますか。'],
      ['男', 'はい、{五名様|ごめいさま}、{七時半|しちじはん}ですね。かしこまりました。'],
    ],
    options: ['四人で七時', '五人で七時', '四人で七時半', '五人で七時半'],
    correct: 3,
    translation:
      'Nữ: Alo, tôi là Hayashi, đã đặt bàn 4 người lúc 7 giờ tối nay.\nNam: Vâng, chị Hayashi.\nNữ: Xin lỗi, có thêm một người thành 5 người, có được không ạ? Và anh đổi giờ sang 7 rưỡi giúp tôi được không?\nNam: Vâng, 5 người, 7 giờ rưỡi. Tôi đã rõ.',
    explanation: 'Cả số người (4 → 5) và giờ (7 → 7 rưỡi) đều đổi → 5 người lúc 7 rưỡi.',
  }),
  situationListening({
    id: 'sit-n4-l04',
    level: 'N4',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Ga tàu & Giao thông',
    situation: 'Một người đàn ông đến muộn buổi hẹn và giải thích với bạn.',
    questionPrompt: '{男|おとこ}の{人|ひと}はどうして{遅|おく}れましたか。',
    lines: [
      ['男', 'ごめん、{遅|おそ}くなって。'],
      ['女', 'どうしたの？{電車|でんしゃ}が{止|と}まったの？'],
      ['男', 'ううん、{電車|でんしゃ}は{大丈夫|だいじょうぶ}だったんだけど、{乗|の}り{換|か}えの{駅|えき}を{間違|まちが}えちゃって。'],
      ['女', 'そうだったんだ。'],
    ],
    options: ['電車が止まったから', '寝坊したから', '乗り換えの駅を間違えたから', '財布を忘れたから'],
    correct: 2,
    translation:
      'Nam: Xin lỗi, tớ đến muộn.\nNữ: Sao thế? Tàu dừng à?\nNam: Không, tàu thì không sao, nhưng tớ nhầm ga chuyển tàu.\nNữ: Ra là vậy.',
    explanation: 'Người nữ đoán tàu dừng nhưng nam phủ nhận (ううん) → lý do là nhầm ga chuyển tàu.',
  }),
  situationListening({
    id: 'sit-n4-l05',
    level: 'N4',
    mondai: 'Mondai 1 · Hiểu nhiệm vụ',
    situationTag: 'Bệnh viện',
    situation: 'Nhân viên phòng khám dặn bệnh nhân lần khám sau.',
    questionPrompt: '{男|おとこ}の{人|ひと}は{来週|らいしゅう}{何|なに}を{持|も}っていきますか。',
    lines: [
      ['女', '{次|つぎ}は{来週|らいしゅう}の{金曜日|きんようび}に{来|き}てください。'],
      ['男', 'はい。{何|なに}か{持|も}ってくるものはありますか。'],
      ['女', '{保険証|ほけんしょう}はもう{見|み}せていただいたので、いりません。きょうお{渡|わた}しした{薬|くすり}の{袋|ふくろ}を{持|も}ってきてください。'],
    ],
    options: ['保険証', '薬の袋', '診察券とお金', '何も持っていかない'],
    correct: 1,
    translation:
      'Nữ: Lần sau anh đến vào thứ Sáu tuần sau nhé.\nNam: Vâng. Tôi có cần mang gì không ạ?\nNữ: Thẻ bảo hiểm anh đã cho xem rồi nên không cần. Hãy mang túi thuốc tôi đưa hôm nay.',
    explanation: 'Thẻ bảo hiểm 「いりません」→ chỉ mang túi thuốc.',
  }),
  situationListening({
    id: 'sit-n4-l06',
    level: 'N4',
    mondai: 'Mondai 1 · Hiểu nhiệm vụ',
    situationTag: 'Làm thêm & Công ty',
    situation: 'Trưởng nhóm nhờ nhân viên nữ chuẩn bị cho cuộc họp ngày mai.',
    questionPrompt: '{女|おんな}の{人|ひと}はこのあと{何|なに}をしますか。',
    lines: [
      ['男', '{山本|やまもと}さん、あしたの{会議|かいぎ}の{資料|しりょう}、もうコピーした？'],
      ['女', 'はい、{十部|じゅうぶ}コピーしました。'],
      ['男', 'ありがとう。{実|じつ}は{参加者|さんかしゃ}が{三人|さんにん}{増|ふ}えたから、あと{三部|さんぶ}お{願|ねが}いできる？{会議室|かいぎしつ}の{予約|よやく}は{僕|ぼく}がしておくから。'],
      ['女', 'わかりました。'],
    ],
    options: ['資料を三部コピーする', '資料を十部コピーする', '会議室を予約する', '参加者に連絡する'],
    correct: 0,
    translation:
      'Nam: Chị Yamamoto, tài liệu họp ngày mai chị photo chưa?\nNữ: Rồi ạ, tôi photo 10 bản.\nNam: Cảm ơn. Thật ra người tham dự tăng thêm 3 người, chị photo thêm 3 bản được không? Đặt phòng họp thì tôi sẽ làm.\nNữ: Tôi hiểu rồi.',
    explanation: 'Việc của người nữ: photo thêm 3 bản. Đặt phòng họp là việc người nam tự làm.',
  }),
  situationListening({
    id: 'sit-n4-l07',
    level: 'N4',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Nhà ở & Hàng xóm',
    situation: 'Người hàng xóm nữ sang nhờ người đàn ông một việc vào buổi tối.',
    questionPrompt: '{女|おんな}の{人|ひと}は{何|なに}をお{願|ねが}いしましたか。',
    lines: [
      ['女', 'あの、{隣|となり}の{部屋|へや}の{者|もの}ですが…。'],
      ['男', 'あ、こんばんは。'],
      ['女', '{夜|よる}{遅|おそ}くに{洗濯機|せんたくき}を{使|つか}うと、{音|おと}が{響|ひび}くので、{十時|じゅうじ}からは{使|つか}わないでいただけますか。'],
      ['男', 'すみません、{気|き}がつきませんでした。これから{気|き}をつけます。'],
    ],
    options: ['テレビの音を小さくすること', '夜十時から洗濯機を使わないこと', 'ごみを早く出すこと', '友だちを呼ばないこと'],
    correct: 1,
    translation:
      'Nữ: Xin lỗi, tôi ở phòng bên cạnh...\nNam: À, chào buổi tối.\nNữ: Dùng máy giặt lúc khuya tiếng vang sang lắm, nên từ 10 giờ anh đừng dùng nữa được không?\nNam: Xin lỗi, tôi không để ý. Từ giờ tôi sẽ chú ý.',
    explanation: '「十時からは使わないでいただけますか」→ nhờ không dùng máy giặt từ 10 giờ tối.',
  }),
  situationListening({
    id: 'sit-n4-l08',
    level: 'N4',
    mondai: 'Mondai 1 · Hiểu nhiệm vụ',
    situationTag: 'Bưu điện & Ngân hàng',
    situation: 'Một du học sinh đến ngân hàng mở tài khoản.',
    questionPrompt: '{男|おとこ}の{人|ひと}は{口座|こうざ}を{作|つく}るために、{何|なに}を{使|つか}いますか。',
    lines: [
      ['男', '{口座|こうざ}を{作|つく}りたいんですが。'],
      ['女', 'はい。{在留|ざいりゅう}カードと{印鑑|いんかん}はお{持|も}ちですか。'],
      ['男', '{在留|ざいりゅう}カードはありますが、{印鑑|いんかん}は{持|も}っていません。'],
      ['女', 'では、サインでも{大丈夫|だいじょうぶ}ですよ。'],
    ],
    options: ['在留カードと印鑑', 'パスポートと印鑑', '在留カードとサイン', '印鑑とサイン'],
    correct: 2,
    translation:
      'Nam: Tôi muốn mở tài khoản.\nNữ: Vâng. Anh có mang thẻ cư trú và con dấu không ạ?\nNam: Tôi có thẻ cư trú nhưng không có con dấu.\nNữ: Vậy ký tên cũng được ạ.',
    explanation: 'Không có con dấu → dùng chữ ký thay thế, cùng với thẻ cư trú.',
  }),
  situationListening({
    id: 'sit-n4-l09',
    level: 'N4',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Du lịch & Khách sạn',
    situation: 'Hai người bạn nói về kế hoạch nghỉ hè.',
    questionPrompt: '{男|おとこ}の{人|ひと}は{夏休|なつやす}みにどこへ{行|い}きますか。',
    lines: [
      ['女', '{夏休|なつやす}み、どこか{行|い}くの？'],
      ['男', '{最初|さいしょ}は{北海道|ほっかいどう}に{行|い}こうと{思|おも}ってたんだけど、{飛行機|ひこうき}が{高|たか}くて。{結局|けっきょく}、{電車|でんしゃ}で{行|い}ける{長野|ながの}にしたんだ。'],
      ['女', 'へえ、{長野|ながの}もいいね。{山|やま}に{登|のぼ}るの？'],
      ['男', 'うん、そのつもり。'],
    ],
    options: ['長野', '北海道', '沖縄', '京都'],
    correct: 0,
    translation:
      'Nữ: Nghỉ hè cậu có đi đâu không?\nNam: Lúc đầu tớ định đi Hokkaido, nhưng vé máy bay đắt quá. Cuối cùng tớ chọn Nagano, đi tàu được.\nNữ: Ồ, Nagano cũng hay đấy. Cậu leo núi à?\nNam: Ừ, tớ định thế.',
    explanation: 'Từ khóa 「最初は…」(lúc đầu) rồi 「結局」(cuối cùng) → chốt là Nagano.',
  }),
  situationListening({
    id: 'sit-n4-l10',
    level: 'N4',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Sự kiện & Sở thích',
    situation: 'Người đàn ông mời bạn nữ đến bữa tiệc thứ Bảy.',
    questionPrompt: '{女|おんな}の{人|ひと}はどうしてパーティーに{行|い}きませんか。',
    lines: [
      ['男', '{土曜日|どようび}のパーティー、{来|こ}られる？'],
      ['女', '{行|い}きたいんだけど、その{日|ひ}は{妹|いもうと}の{結婚式|けっこんしき}なんだ。'],
      ['男', 'そうか、それは{仕方|しかた}ないね。'],
    ],
    options: ['仕事があるから', '病気だから', '旅行に行くから', '妹の結婚式があるから'],
    correct: 3,
    translation:
      'Nam: Bữa tiệc thứ Bảy, cậu đến được không?\nNữ: Tớ muốn đi lắm, nhưng hôm đó là đám cưới của em gái tớ.\nNam: Vậy à, thế thì đành chịu.',
    explanation: '「その日は妹の結婚式なんだ」→ vì có đám cưới của em gái.',
  }),
];
