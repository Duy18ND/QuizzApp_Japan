/**
 * N3 situation pack: 10 reading passages + 10 two-voice listening dialogues,
 * one of each per everyday situation. Written with `{漢字|かな}` ruby (see situationPackUtils.ts).
 */
import type { JLPTListeningItem, JLPTReadingPassage } from './jlptDataset';
import { situationListening, situationReading } from './situationPackUtils';

export const SITUATION_READING_N3: JLPTReadingPassage[] = [
  situationReading({
    id: 'sit-n3-r01',
    level: 'N3',
    moduleId: 'reading-medium',
    situation: 'Trường học',
    title: 'Thông báo nhận hồ sơ học bổng',
    paragraphs: [
      '{留学生|りゅうがくせい}の{皆|みな}さんへ。{来年度|らいねんど}の{奨学金|しょうがくきん}の{申請|しんせい}を{受|う}け{付|つ}けます。{申請|しんせい}できるのは、{今年度|こんねんど}の{成績|せいせき}が{平均|へいきん}B{以上|いじょう}で、{出席率|しゅっせきりつ}が９０パーセント{以上|いじょう}の{人|ひと}に{限|かぎ}ります。',
      '{申請書|しんせいしょ}は{学生課|がくせいか}のホームページからダウンロードし、{先生|せんせい}の{推薦書|すいせんしょ}といっしょに、{十一月|じゅういちがつ}{三十日|さんじゅうにち}までに{提出|ていしゅつ}してください。{郵送|ゆうそう}は{受|う}け{付|つ}けていませんので、{必|かなら}ず{窓口|まどぐち}まで{持|も}ってきてください。',
    ],
    translation:
      'Gửi các bạn du học sinh. Chúng tôi nhận hồ sơ xin học bổng năm học tới. Chỉ những bạn có thành tích năm nay trung bình từ B trở lên và tỉ lệ chuyên cần từ 90% trở lên mới được nộp. Hãy tải đơn từ trang web của Phòng Công tác sinh viên và nộp kèm thư giới thiệu của giáo viên trước ngày 30/11. Không nhận hồ sơ qua bưu điện, nên nhất định phải mang trực tiếp đến quầy.',
    vocab: [
      ['奨学金', 'しょうがくきん', 'học bổng'],
      ['申請', 'しんせい', 'xin, đăng ký (thủ tục)'],
      ['推薦書', 'すいせんしょ', 'thư giới thiệu'],
      ['〜に限る', '〜にかぎる', 'chỉ giới hạn ở'],
    ],
    questions: [
      {
        prompt: '{申請|しんせい}できるのはだれですか。',
        options: [
          '成績が平均Cで、出席率が95パーセントの人',
          '成績が平均Aで、出席率が85パーセントの人',
          '成績が平均Bで、出席率が92パーセントの人',
          '成績が平均Aで、出席率が80パーセントの人',
        ],
        correct: 2,
        explanation: 'Phải đủ CẢ HAI: điểm ≥ B và chuyên cần ≥ 90% → B + 92%.',
      },
      {
        prompt: '{申請書|しんせいしょ}はどうやって{出|だ}しますか。',
        options: ['メールで送る', '郵便で送る', '先生に渡す', '推薦書といっしょに窓口に持っていく'],
        correct: 3,
        explanation: '「推薦書といっしょに…提出」và 「郵送は受け付けていません…窓口まで持ってきて」.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n3-r02',
    level: 'N3',
    situation: 'Mua sắm',
    title: 'Thay đổi hạn sử dụng điểm tích lũy',
    paragraphs: [
      '{当店|とうてん}のポイントカードについてのお{知|し}らせです。{来月|らいげつ}から、ポイントの{有効期限|ゆうこうきげん}が{二年|にねん}から{一年|いちねん}に{変更|へんこう}されます。',
      'ただし、{期限|きげん}までに{一度|いちど}でも{買|か}い{物|もの}をすれば、その{日|ひ}から{一年|いちねん}{延長|えんちょう}されます。ポイントを{無駄|むだ}にしないよう、ご{注意|ちゅうい}ください。',
    ],
    translation:
      'Thông báo về thẻ tích điểm của cửa hàng. Từ tháng sau, hạn sử dụng điểm sẽ đổi từ 2 năm thành 1 năm. Tuy nhiên, chỉ cần mua hàng một lần trước khi hết hạn thì sẽ được gia hạn thêm 1 năm kể từ ngày đó. Xin lưu ý để không lãng phí điểm.',
    vocab: [
      ['有効期限', 'ゆうこうきげん', 'thời hạn hiệu lực'],
      ['延長', 'えんちょう', 'gia hạn'],
      ['無駄', 'むだ', 'lãng phí'],
    ],
    questions: [
      {
        prompt: 'ポイントを{長|なが}く{使|つか}い{続|つづ}けるためには、どうすればいいですか。',
        options: ['二年に一度カードを作り直す', '期限までに一度は買い物をする', 'ポイントをすぐ全部使う', '店に電話で延長を頼む'],
        correct: 1,
        explanation: '「期限までに一度でも買い物をすれば…延長されます」→ mua hàng ít nhất 1 lần trước hạn.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n3-r03',
    level: 'N3',
    moduleId: 'reading-medium',
    situation: 'Nhà hàng',
    title: 'Quán buffet và chuyện thức ăn thừa',
    paragraphs: [
      '{最近|さいきん}、{食|た}べ{放題|ほうだい}の{店|みせ}が{増|ふ}えている。{好|す}きなものを{好|す}きなだけ{食|た}べられるのは{魅力的|みりょくてき}だが、その{一方|いっぽう}で、{食|た}べ{残|のこ}しが{問題|もんだい}になっている。',
      'そこで、{食|た}べ{残|のこ}しが{多|おお}い{客|きゃく}から{追加料金|ついかりょうきん}をもらう{店|みせ}も{出|で}てきた。{店|みせ}にとっては{当然|とうぜん}のルールかもしれないが、{客|きゃく}が{自分|じぶん}で{食|た}べられる{量|りょう}を{考|かんが}えて{取|と}るようにすることこそ、いちばん{大切|たいせつ}ではないだろうか。',
    ],
    translation:
      'Gần đây các quán buffet ngày càng nhiều. Được ăn món mình thích thỏa thích thì hấp dẫn, nhưng mặt khác, thức ăn thừa đang trở thành vấn đề. Vì vậy đã xuất hiện những quán thu thêm phí với khách để thừa nhiều. Với quán thì đó có lẽ là quy định đương nhiên, nhưng chẳng phải điều quan trọng nhất chính là khách tự cân nhắc lượng mình ăn được rồi mới lấy hay sao?',
    vocab: [
      ['食べ放題', 'たべほうだい', 'ăn thỏa thích, buffet'],
      ['食べ残し', 'たべのこし', 'đồ ăn thừa'],
      ['追加料金', 'ついかりょうきん', 'phụ phí'],
      ['〜こそ', '〜こそ', 'chính là (nhấn mạnh)'],
    ],
    questions: [
      {
        prompt: '{筆者|ひっしゃ}がいちばん{言|い}いたいことは{何|なん}ですか。',
        options: [
          '客が自分で食べられる量を考えて取ることが大切だ',
          '食べ放題の店はもっと増えるべきだ',
          '追加料金は高すぎる',
          '食べ放題はやめたほうがいい',
        ],
        correct: 0,
        explanation: 'Ý chính nằm ở câu cuối với 「〜こそ、いちばん大切ではないだろうか」(chẳng phải … mới là quan trọng nhất sao).',
      },
    ],
  }),
  situationReading({
    id: 'sit-n3-r04',
    level: 'N3',
    situation: 'Ga tàu & Giao thông',
    title: 'Tạm ngừng chạy tàu để kiểm tra đường ray',
    paragraphs: [
      'さくら{線|せん}ご{利用|りよう}のお{客様|きゃくさま}へ。{線路|せんろ}の{点検|てんけん}のため、{十二月|じゅうにがつ}{五日|いつか}（{日|にち}）の{始発|しはつ}から{午前|ごぜん}{十時|じゅうじ}まで、みなみ{駅|えき}とひがし{駅|えき}の{間|あいだ}は{運転|うんてん}を{見合|みあ}わせます。',
      'この{間|あいだ}は{代行|だいこう}バスを{運行|うんこう}しますが、{通常|つうじょう}より３０{分|ぷん}ほど{多|おお}くかかる{見込|みこ}みです。{時間|じかん}に{余裕|よゆう}を{持|も}ってお{出|で}かけください。',
    ],
    translation:
      'Gửi hành khách tuyến Sakura. Để kiểm tra đường ray, từ chuyến đầu tiên đến 10 giờ sáng ngày 5/12 (Chủ nhật), tạm ngừng chạy tàu giữa ga Minami và ga Higashi. Trong thời gian này có xe buýt thay thế, nhưng dự kiến mất nhiều hơn bình thường khoảng 30 phút. Xin hãy xuất phát sớm.',
    vocab: [
      ['点検', 'てんけん', 'kiểm tra'],
      ['見合わせる', 'みあわせる', 'tạm hoãn, tạm ngừng'],
      ['代行バス', 'だいこうバス', 'xe buýt thay thế'],
      ['余裕', 'よゆう', 'dư dả (thời gian)'],
    ],
    questions: [
      {
        prompt: '{十二月|じゅうにがつ}{五日|いつか}の{朝|あさ}{九時|くじ}に、みなみ{駅|えき}からひがし{駅|えき}へ{行|い}く{人|ひと}はどうなりますか。',
        options: [
          'いつもと同じ時間で電車に乗れる',
          'バスで行くので、いつもより時間がかかる',
          '電車もバスも動かないので行けない',
          '十時まで駅で待たなければならない',
        ],
        correct: 1,
        explanation: '9 giờ nằm trong thời gian ngừng tàu → đi xe buýt thay thế, mất thêm khoảng 30 phút.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n3-r05',
    level: 'N3',
    moduleId: 'reading-medium',
    situation: 'Bệnh viện',
    title: 'Ngủ bao lâu là đủ?',
    paragraphs: [
      '{睡眠|すいみん}{不足|ぶそく}が{体|からだ}に{悪|わる}いことはよく{知|し}られているが、{寝|ね}すぎもまた{健康|けんこう}によくないという{研究|けんきゅう}がある。',
      'ある{調査|ちょうさ}によると、{一日|いちにち}に{七時間|しちじかん}ぐらい{寝|ね}る{人|ひと}がもっとも{病気|びょうき}になりにくく、{五時間|ごじかん}{以下|いか}の{人|ひと}や{九時間|くじかん}{以上|いじょう}の{人|ひと}は、{病気|びょうき}になる{割合|わりあい}が{高|たか}かったそうだ。',
      'つまり、{長|なが}く{寝|ね}ればいいというわけではなく、{自分|じぶん}に{合|あ}った{時間|じかん}を{知|し}ることが{大切|たいせつ}なのである。',
    ],
    translation:
      'Thiếu ngủ có hại cho cơ thể thì ai cũng biết, nhưng cũng có nghiên cứu cho thấy ngủ quá nhiều cũng không tốt cho sức khỏe. Theo một khảo sát, người ngủ khoảng 7 tiếng mỗi ngày ít mắc bệnh nhất, còn người ngủ dưới 5 tiếng hoặc trên 9 tiếng có tỉ lệ mắc bệnh cao. Tóm lại, không phải cứ ngủ lâu là tốt, mà điều quan trọng là biết thời lượng phù hợp với bản thân.',
    vocab: [
      ['睡眠不足', 'すいみんぶそく', 'thiếu ngủ'],
      ['割合', 'わりあい', 'tỉ lệ'],
      ['〜というわけではない', '〜というわけではない', 'không hẳn là …'],
    ],
    questions: [
      {
        prompt: '{調査|ちょうさ}によると、{病気|びょうき}になりにくいのはどんな{人|ひと}ですか。',
        options: ['五時間ぐらい寝る人', '七時間ぐらい寝る人', '九時間以上寝る人', '昼寝をする人'],
        correct: 1,
        explanation: '「七時間ぐらい寝る人がもっとも病気になりにくく」→ người ngủ khoảng 7 tiếng.',
      },
      {
        prompt: 'この{文章|ぶんしょう}でいちばん{言|い}いたいことは{何|なん}ですか。',
        options: ['できるだけ長く寝たほうがいい', '睡眠不足は問題ではない', '自分に合った睡眠時間を知ることが大切だ', '九時間寝るのが理想だ'],
        correct: 2,
        explanation: 'Câu kết với 「つまり」(tóm lại) nêu ý chính: biết thời gian ngủ phù hợp với mình.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n3-r06',
    level: 'N3',
    situation: 'Làm thêm & Công ty',
    title: 'Email đổi lịch họp định kỳ',
    paragraphs: [
      '{営業部|えいぎょうぶ}の{皆様|みなさま}。{明日|あす}{予定|よてい}していた{定例会議|ていれいかいぎ}ですが、{部長|ぶちょう}の{出張|しゅっちょう}が{延|の}びたため、{木曜日|もくようび}の{午後|ごご}{二時|にじ}に{変更|へんこう}することになりました。',
      '{場所|ばしょ}は{変|か}わらず、{三階|さんがい}の{第一|だいいち}{会議室|かいぎしつ}です。{資料|しりょう}は{前日|ぜんじつ}までに{各自|かくじ}でプリントしておいてください。　{佐藤|さとう}',
    ],
    translation:
      'Gửi các anh chị phòng Kinh doanh. Cuộc họp định kỳ dự kiến vào ngày mai, do chuyến công tác của trưởng phòng bị kéo dài, đã quyết định chuyển sang 2 giờ chiều thứ Năm. Địa điểm không đổi, phòng họp số 1 tầng 3. Mỗi người hãy tự in tài liệu trước ngày họp. — Sato',
    vocab: [
      ['定例会議', 'ていれいかいぎ', 'họp định kỳ'],
      ['出張', 'しゅっちょう', 'công tác'],
      ['各自', 'かくじ', 'mỗi người tự'],
    ],
    questions: [
      {
        prompt: 'この{会議|かいぎ}について、{正|ただ}しいものはどれですか。',
        options: [
          '明日、第一会議室で行われる',
          '木曜日に、場所を変えて行われる',
          '資料は佐藤さんが当日配る',
          '木曜日に、同じ会議室で行われる',
        ],
        correct: 3,
        explanation: 'Đổi sang thứ Năm, 「場所は変わらず」(địa điểm không đổi); tài liệu mỗi người tự in.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n3-r07',
    level: 'N3',
    situation: 'Nhà ở & Hàng xóm',
    title: 'Đăng ký chỗ để xe đạp',
    paragraphs: [
      '{自転車|じてんしゃ}{置|お}き{場|ば}の{利用|りよう}についてのお{願|ねが}い。{最近|さいきん}、{登録|とうろく}していない{自転車|じてんしゃ}が{増|ふ}えて、{置|お}く{場所|ばしょ}が{足|た}りなくなっています。',
      '{今月末|こんげつまつ}までに{管理|かんり}{事務所|じむしょ}で{登録|とうろく}を{済|す}ませてください。{来月|らいげつ}からは、シールが{貼|は}られていない{自転車|じてんしゃ}は{撤去|てっきょ}させていただきます。',
    ],
    translation:
      'Đề nghị về việc sử dụng bãi để xe đạp. Gần đây xe đạp chưa đăng ký tăng lên, khiến chỗ để không đủ. Hãy hoàn tất đăng ký ở văn phòng quản lý trước cuối tháng này. Từ tháng sau, xe đạp không dán nhãn sẽ bị dọn đi.',
    vocab: [
      ['登録', 'とうろく', 'đăng ký'],
      ['済ませる', 'すませる', 'hoàn tất'],
      ['撤去', 'てっきょ', 'dỡ bỏ, dọn đi'],
    ],
    questions: [
      {
        prompt: '{自転車|じてんしゃ}を{置|お}き{場|ば}に{置|お}き{続|つづ}けたい{人|ひと}は、{何|なに}をしなければなりませんか。',
        options: ['今月末までに管理事務所で登録する', '自転車を新しく買う', '来月、シールを買う', '自転車を部屋に入れる'],
        correct: 0,
        explanation: '「今月末までに管理事務所で登録を済ませてください」→ đăng ký trước cuối tháng.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n3-r08',
    level: 'N3',
    situation: 'Bưu điện & Ngân hàng',
    title: 'Phiếu báo giao hàng vắng nhà',
    paragraphs: [
      '{不在連絡票|ふざいれんらくひょう}。お{届|とど}けに{参|まい}りましたが、ご{不在|ふざい}でしたので{荷物|にもつ}を{持|も}ち{帰|かえ}りました。',
      '{再配達|さいはいたつ}をご{希望|きぼう}の{場合|ばあい}は、お{電話|でんわ}かホームページからお{申|もう}し{込|こ}みください。{保管期間|ほかんきかん}は{七日間|なのかかん}で、{期間|きかん}を{過|す}ぎると{差出人|さしだしにん}に{返送|へんそう}されます。',
    ],
    translation:
      'Phiếu báo vắng nhà. Chúng tôi đã đến giao hàng nhưng quý khách vắng nhà nên đã mang hàng về. Nếu muốn giao lại, xin đăng ký qua điện thoại hoặc trang web. Thời gian lưu giữ là 7 ngày; quá hạn hàng sẽ được gửi trả người gửi.',
    vocab: [
      ['不在', 'ふざい', 'vắng nhà'],
      ['再配達', 'さいはいたつ', 'giao lại'],
      ['差出人', 'さしだしにん', 'người gửi'],
    ],
    questions: [
      {
        prompt: '{荷物|にもつ}を{受|う}け{取|と}るためには、どうすればいいですか。',
        options: ['七日以内に再配達を申し込む', '差出人に電話する', '郵便局の前で待つ', '何もしなくても、明日また届く'],
        correct: 0,
        explanation: 'Phải tự đăng ký giao lại (電話かホームページ) trong 7 ngày lưu giữ.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n3-r09',
    level: 'N3',
    moduleId: 'reading-long',
    situation: 'Du lịch & Khách sạn',
    title: 'Điều tốt của du lịch một mình',
    paragraphs: [
      '{私|わたし}は{毎年|まいとし}、{一人|ひとり}で{旅行|りょこう}をすることにしている。{友人|ゆうじん}には「{一人|ひとり}でつまらなくないの？」とよく{聞|き}かれるが、{実|じつ}は{一人旅|ひとりたび}には{良|よ}いところがたくさんある。',
      'まず、{行|い}きたい{場所|ばしょ}に{自由|じゆう}に{行|い}ける。{誰|だれ}かに{合|あ}わせる{必要|ひつよう}がないので、{気|き}に{入|い}った{店|みせ}に{何時間|なんじかん}いてもいい。また、{一人|ひとり}だと{地元|じもと}の{人|ひと}に{話|はな}しかけられることが{多|おお}く、{思|おも}いがけない{出会|であ}いもある。',
      'もちろん、{困|こま}ったときに{相談|そうだん}できる{相手|あいて}がいないという{不安|ふあん}もある。しかし、{自分|じぶん}で{考|かんが}えて{解決|かいけつ}した{経験|けいけん}が、{少|すこ}しずつ{自信|じしん}につながっていると{感|かん}じている。',
    ],
    translation:
      'Mỗi năm tôi đều đặt cho mình thói quen đi du lịch một mình. Bạn bè hay hỏi "Đi một mình không chán à?", nhưng thật ra du lịch một mình có nhiều điểm tốt. Trước hết, có thể tự do đến nơi mình muốn. Không cần chiều theo ai nên có thể ngồi bao lâu cũng được ở quán mình thích. Ngoài ra, đi một mình thường được người địa phương bắt chuyện và có những cuộc gặp gỡ bất ngờ. Tất nhiên cũng có nỗi lo không có ai để bàn bạc khi gặp khó khăn. Nhưng tôi cảm thấy những trải nghiệm tự suy nghĩ và giải quyết vấn đề đang dần giúp tôi tự tin hơn.',
    vocab: [
      ['〜ことにしている', '〜ことにしている', 'có thói quen, tự đặt ra cho mình'],
      ['地元', 'じもと', 'địa phương'],
      ['思いがけない', 'おもいがけない', 'bất ngờ, không ngờ'],
      ['自信', 'じしん', 'sự tự tin'],
    ],
    questions: [
      {
        prompt: '{筆者|ひっしゃ}によると、{一人旅|ひとりたび}の{良|よ}い{点|てん}ではないものはどれですか。',
        options: ['自由に行きたい場所に行ける', '地元の人と出会うことが多い', '困ったときにすぐ相談できる', '好きな店に長くいられる'],
        correct: 2,
        explanation: 'Không có ai để bàn bạc khi gặp khó khăn là ĐIỂM LO (不安) của du lịch một mình, không phải điểm tốt.',
      },
      {
        prompt: '{筆者|ひっしゃ}は{一人旅|ひとりたび}の{経験|けいけん}についてどう{感|かん}じていますか。',
        options: ['つまらないと感じている', '自信につながっていると感じている', '友人と行くべきだと感じている', '不安ばかりだと感じている'],
        correct: 1,
        explanation: '「経験が、少しずつ自信につながっていると感じている」→ giúp tự tin hơn.',
      },
    ],
  }),
  situationReading({
    id: 'sit-n3-r10',
    level: 'N3',
    situation: 'Sự kiện & Sở thích',
    title: 'Tuyển tình nguyện viên giải marathon',
    paragraphs: [
      '{市民|しみん}マラソン ボランティア{募集|ぼしゅう}。{三月|さんがつ}{十日|とおか}に{行|おこな}われる{市民|しみん}マラソンで、{水|みず}を{配|くば}ったり{道|みち}を{案内|あんない}したりするボランティアを{募集|ぼしゅう}しています。',
      '{十八歳|じゅうはっさい}{以上|いじょう}なら、どなたでも{参加|さんか}できます。{参加|さんか}した{方|かた}には、{記念|きねん}のTシャツとお{弁当|べんとう}をお{渡|わた}しします。{申|もう}し{込|こ}みは{二月|にがつ}{末|まつ}までです。',
    ],
    translation:
      'Tuyển tình nguyện viên giải marathon thành phố. Chúng tôi tuyển tình nguyện viên phát nước, chỉ đường tại giải marathon thành phố tổ chức ngày 10/3. Ai từ 18 tuổi trở lên đều có thể tham gia. Người tham gia sẽ được tặng áo phông kỷ niệm và cơm hộp. Hạn đăng ký đến cuối tháng 2.',
    vocab: [
      ['募集', 'ぼしゅう', 'tuyển'],
      ['配る', 'くばる', 'phát, phân phát'],
      ['記念', 'きねん', 'kỷ niệm'],
    ],
    questions: [
      {
        prompt: 'ボランティアに{参加|さんか}できないのはだれですか。',
        options: ['二十歳の大学生', '六十五歳の会社員', '三十歳の留学生', '十六歳の高校生'],
        correct: 3,
        explanation: 'Điều kiện 「十八歳以上」→ học sinh 16 tuổi không tham gia được.',
      },
    ],
  }),
];

export const SITUATION_LISTENING_N3: JLPTListeningItem[] = [
  situationListening({
    id: 'sit-n3-l01',
    level: 'N3',
    mondai: 'Mondai 1 · Hiểu nhiệm vụ',
    situationTag: 'Trường học',
    situation: 'Sinh viên nam hỏi nhân viên văn phòng trường về việc đổi môn học.',
    questionPrompt: '{男|おとこ}の{学生|がくせい}はまず{何|なに}をしなければなりませんか。',
    lines: [
      ['男', 'すみません、{授業|じゅぎょう}の{登録|とうろく}を{変更|へんこう}したいんですが。'],
      ['女', '{変更|へんこう}ですね。まず、この{用紙|ようし}に{記入|きにゅう}して、{担当|たんとう}の{先生|せんせい}にサインをもらってきてください。'],
      ['男', 'サインをもらったら、ここに{出|だ}せばいいですか。'],
      ['女', 'はい。ただ、{締|し}め{切|き}りは{今週|こんしゅう}の{金曜日|きんようび}ですから、{急|いそ}いでくださいね。'],
    ],
    options: ['用紙に記入する', '先生に電話する', '金曜日に窓口へ行く', '新しい授業に出席する'],
    correct: 0,
    translation:
      'Nam: Xin lỗi, em muốn đổi đăng ký môn học.\nNữ: Đổi môn à. Trước tiên em điền vào tờ đơn này, rồi xin chữ ký của giáo viên phụ trách.\nNam: Có chữ ký rồi thì nộp ở đây phải không ạ?\nNữ: Đúng. Nhưng hạn chót là thứ Sáu tuần này nên em nhanh lên nhé.',
    explanation: 'Thứ tự: 「まず」điền đơn → xin chữ ký → nộp. Việc đầu tiên là điền đơn.',
    followUps: [
      {
        prompt: '{書類|しょるい}の{締|し}め{切|き}りはいつですか。',
        options: ['今週の金曜日', '来週の月曜日', '今日中', '来週の金曜日'],
        correct: 0,
        explanation: '「締め切りは今週の金曜日ですから」.',
      },
    ],
  }),
  situationListening({
    id: 'sit-n3-l02',
    level: 'N3',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Mua sắm',
    situation: 'Hai người bạn nói chuyện về chiếc điện thoại mới mua.',
    questionPrompt: '{女|おんな}の{人|ひと}がこのスマホを{選|えら}んだいちばんの{理由|りゆう}は{何|なん}ですか。',
    lines: [
      ['女', '{新|あたら}しいスマホ、{買|か}ったんだ。'],
      ['男', 'へえ、それ、{最新型|さいしんがた}じゃないよね。カメラがいいから？'],
      ['女', 'カメラはまあまあなんだけど、とにかく{電池|でんち}が{長|なが}く{持|も}つの。{前|まえ}のは{一日|いちにち}{持|も}たなかったから、それがいちばん{大事|だいじ}だったんだ。'],
    ],
    options: ['最新型だから', 'カメラがいいから', '電池が長く持つから', '値段が安いから'],
    correct: 2,
    translation:
      'Nữ: Tớ mua điện thoại mới rồi.\nNam: Ồ, cái đó đâu phải đời mới nhất nhỉ. Vì camera đẹp à?\nNữ: Camera thì tạm được, nhưng quan trọng là pin dùng được lâu. Cái cũ không trụ nổi một ngày, nên với tớ đó là điều quan trọng nhất.',
    explanation: '「とにかく」và 「それがいちばん大事だった」→ lý do chính là pin lâu.',
  }),
  situationListening({
    id: 'sit-n3-l03',
    level: 'N3',
    mondai: 'Mondai 1 · Hiểu nhiệm vụ',
    situationTag: 'Nhà hàng',
    situation: 'Hai đồng nghiệp chuẩn bị tiệc chào mừng nhân viên mới.',
    questionPrompt: '{女|おんな}の{人|ひと}はこのあとまず{何|なに}をしますか。',
    lines: [
      ['男', '{来週|らいしゅう}の{歓迎会|かんげいかい}、お{店|みせ}はもう{決|き}まった？'],
      ['女', 'はい、{駅前|えきまえ}の{居酒屋|いざかや}を{予約|よやく}しました。ただ、{料理|りょうり}のコースをまだ{決|き}めていなくて。'],
      ['男', 'じゃあ、{参加者|さんかしゃ}に{苦手|にがて}な{食|た}べ{物|もの}がないか{確認|かくにん}してから{決|き}めたら？'],
      ['女', 'そうですね。じゃあ、{先|さき}にみんなにメールで{聞|き}いてみます。'],
    ],
    options: ['参加者に苦手な食べ物を聞く', '店を予約する', 'コースを決める', '店に電話する'],
    correct: 0,
    translation:
      'Nam: Tiệc chào mừng tuần sau đã chọn được quán chưa?\nNữ: Rồi, tôi đã đặt quán nhậu trước ga. Nhưng chưa chọn set món.\nNam: Vậy hỏi xem người tham gia có ai không ăn được món gì rồi hãy chọn?\nNữ: Đúng nhỉ. Vậy tôi sẽ email hỏi mọi người trước.',
    explanation: 'Đặt quán đã xong; 「先に…メールで聞いてみます」→ trước tiên hỏi món không ăn được, sau đó mới chọn set.',
  }),
  situationListening({
    id: 'sit-n3-l04',
    level: 'N3',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Ga tàu & Giao thông',
    situation: 'Đồng nghiệp hỏi vì sao người đàn ông đi làm bằng xe buýt.',
    questionPrompt: '{男|おとこ}の{人|ひと}はどうしてバスで{通|かよ}っていますか。',
    lines: [
      ['女', 'あれ、きょうは{電車|でんしゃ}じゃないの？'],
      ['男', 'うん、{最近|さいきん}バスで{通|かよ}ってるんだ。{電車|でんしゃ}より{二十分|にじゅっぷん}も{長|なが}くかかるんだけどね。'],
      ['女', 'どうして？'],
      ['男', '{朝|あさ}の{電車|でんしゃ}はすごく{混|こ}んでて、{立|た}ったままで{疲|つか}れちゃうんだよ。バスなら{座|すわ}って{本|ほん}が{読|よ}めるから。'],
    ],
    options: ['バスのほうが早いから', 'バスのほうが安いから', 'バスなら座れるから', '電車が止まっているから'],
    correct: 2,
    translation:
      'Nữ: Ơ, hôm nay anh không đi tàu à?\nNam: Ừ, dạo này tôi đi xe buýt. Dù mất lâu hơn tàu tận 20 phút.\nNữ: Sao vậy?\nNam: Tàu buổi sáng đông quá, đứng suốt mệt lắm. Đi buýt thì được ngồi đọc sách.',
    explanation: 'Bẫy: xe buýt CHẬM hơn 20 phút. Lý do thật: 「バスなら座って本が読める」.',
    followUps: [
      {
        prompt: 'バスは{電車|でんしゃ}よりどのぐらい{長|なが}くかかりますか。',
        options: ['十分', '三十分', '二十分', '一時間'],
        correct: 2,
        explanation: '「電車より二十分も長くかかる」.',
      },
    ],
  }),
  situationListening({
    id: 'sit-n3-l05',
    level: 'N3',
    mondai: 'Mondai 3 · Hiểu khái quát',
    situationTag: 'Bệnh viện',
    situation: 'Bác sĩ giải thích kết quả khám cho bệnh nhân nữ.',
    questionPrompt: '{医者|いしゃ}は{女|おんな}の{人|ひと}に{何|なに}をするように{言|い}いましたか。',
    lines: [
      ['男', '{検査|けんさ}の{結果|けっか}ですが、{大|おお}きな{問題|もんだい}はありませんでした。ただ、{血圧|けつあつ}が{少|すこ}し{高|たか}めですね。'],
      ['男', '{薬|くすり}を{飲|の}むほどではありませんが、{塩分|えんぶん}を{控|ひか}えて、{毎日|まいにち}{少|すこ}しでも{歩|ある}くようにしてください。'],
      ['女', 'わかりました。{気|き}をつけます。'],
    ],
    options: ['すぐに薬を飲む', '塩分を控えて、毎日歩く', 'もう一度検査を受ける', 'しばらく運動をやめる'],
    correct: 1,
    translation:
      'Bác sĩ: Về kết quả kiểm tra, không có vấn đề gì lớn. Có điều huyết áp hơi cao một chút. Chưa đến mức phải uống thuốc, nhưng chị hãy giảm muối và cố gắng mỗi ngày đi bộ một chút.\nNữ: Tôi hiểu rồi. Tôi sẽ chú ý.',
    explanation: '「薬を飲むほどではありません」= chưa cần thuốc; lời khuyên: giảm muối + đi bộ mỗi ngày (〜ようにしてください).',
  }),
  situationListening({
    id: 'sit-n3-l06',
    level: 'N3',
    mondai: 'Mondai 1 · Hiểu nhiệm vụ',
    situationTag: 'Làm thêm & Công ty',
    situation: 'Nhân viên nữ nộp báo cáo cho trưởng nhóm.',
    questionPrompt: '{女|おんな}の{人|ひと}はこのあとまず{何|なに}をしますか。',
    lines: [
      ['女', '{課長|かちょう}、{報告書|ほうこくしょ}ができました。'],
      ['男', 'ありがとう。…うん、{内容|ないよう}はいいね。ただ、グラフが{一|ひと}つ{古|ふる}いデータのままだよ。'],
      ['女', 'あ、すみません。すぐ{直|なお}します。'],
      ['男', '{直|なお}したら、{部長|ぶちょう}に{出|だ}す{前|まえ}に、もう{一度|いちど}{僕|ぼく}に{見|み}せてくれる？'],
    ],
    options: ['報告書を部長に出す', 'グラフのデータを新しくする', '課長にもう一度見せる', '報告書を全部書き直す'],
    correct: 1,
    translation:
      'Nữ: Anh trưởng nhóm, báo cáo xong rồi ạ.\nNam: Cảm ơn. … Ừ, nội dung tốt. Có điều một biểu đồ vẫn dùng dữ liệu cũ.\nNữ: À, xin lỗi. Tôi sửa ngay.\nNam: Sửa xong thì trước khi nộp trưởng phòng, cho tôi xem lại một lần nhé?',
    explanation: 'Thứ tự: sửa biểu đồ → đưa trưởng nhóm xem lại → nộp trưởng phòng. Việc đầu tiên là cập nhật dữ liệu biểu đồ.',
  }),
  situationListening({
    id: 'sit-n3-l07',
    level: 'N3',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Nhà ở & Hàng xóm',
    situation: 'Hai người bạn nói chuyện về việc chuyển nhà.',
    questionPrompt: '{女|おんな}の{人|ひと}が{引|ひ}っ{越|こ}すいちばんの{理由|りゆう}は{何|なん}ですか。',
    lines: [
      ['男', '{引|ひ}っ{越|こ}すんだって？{今|いま}の{部屋|へや}、{駅|えき}から{近|ちか}くて{便利|べんり}なのに。'],
      ['女', 'うん、{便利|べんり}なんだけど、{家賃|やちん}が{来年|らいねん}から{上|あ}がることになったの。それに、{窓|まど}の{外|そと}に{大|おお}きなビルが{建|た}って、{日|ひ}が{当|あ}たらなくなっちゃって。'],
      ['男', 'それは{困|こま}るね。'],
      ['女', 'うん。{家賃|やちん}だけならまだ{我慢|がまん}できたんだけど、{部屋|へや}が{暗|くら}いのがいちばん{嫌|いや}で。'],
    ],
    options: ['部屋が暗くなったから', '駅から遠いから', '家賃が上がるから', '部屋が狭いから'],
    correct: 0,
    translation:
      'Nam: Nghe nói cậu chuyển nhà à? Phòng bây giờ gần ga tiện lắm mà.\nNữ: Ừ, tiện thật, nhưng từ năm sau tiền nhà sẽ tăng. Thêm nữa, ngoài cửa sổ mọc lên tòa nhà lớn nên không còn nắng chiếu vào.\nNam: Thế thì khó chịu nhỉ.\nNữ: Ừ. Nếu chỉ tiền nhà thì còn chịu được, nhưng phòng tối là điều tớ ghét nhất.',
    explanation: '「家賃だけならまだ我慢できた…部屋が暗いのがいちばん嫌」→ lý do chính là phòng tối.',
    followUps: [
      {
        prompt: '{今|いま}の{部屋|へや}のいいところは{何|なん}ですか。',
        options: ['家賃が安いこと', '駅から近いこと', '日がよく当たること', '部屋が広いこと'],
        correct: 1,
        explanation: '「今の部屋、駅から近くて便利なのに」.',
      },
    ],
  }),
  situationListening({
    id: 'sit-n3-l08',
    level: 'N3',
    mondai: 'Mondai 1 · Hiểu nhiệm vụ',
    situationTag: 'Bưu điện & Ngân hàng',
    situation: 'Một người đàn ông muốn chuyển tiền ra nước ngoài ở ngân hàng.',
    questionPrompt: '{男|おとこ}の{人|ひと}はまず{何|なに}をしますか。',
    lines: [
      ['男', '{海外|かいがい}に{送金|そうきん}したいんですが。'],
      ['女', 'はい。{海外|かいがい}{送金|そうきん}は、あちらの{専用|せんよう}カウンターでお{手続|てつづ}きをお{願|ねが}いします。その{前|まえ}に、こちらの{番号札|ばんごうふだ}を{取|と}ってお{待|ま}ちください。'],
      ['男', '{書類|しょるい}は{何|なに}か{必要|ひつよう}ですか。'],
      ['女', '{在留|ざいりゅう}カードと、{送|おく}り{先|さき}の{口座|こうざ}{番号|ばんごう}がわかるものをご{用意|ようい}ください。'],
    ],
    options: ['専用カウンターへ行く', '口座番号を調べる', '番号札を取って待つ', '在留カードを作る'],
    correct: 2,
    translation:
      'Nam: Tôi muốn chuyển tiền ra nước ngoài.\nNữ: Vâng. Chuyển tiền quốc tế xin làm thủ tục ở quầy chuyên dụng đằng kia. Trước đó, xin lấy số thứ tự ở đây và chờ.\nNam: Có cần giấy tờ gì không ạ?\nNữ: Xin chuẩn bị thẻ cư trú và giấy tờ có số tài khoản người nhận.',
    explanation: '「その前に、番号札を取ってお待ちください」→ việc đầu tiên là lấy số thứ tự.',
    followUps: [
      {
        prompt: '{送金|そうきん}のために{必要|ひつよう}なものはどれですか。',
        options: ['パスポートと印鑑', '在留カードと印鑑', '番号札と通帳', '在留カードと送り先の口座番号がわかるもの'],
        correct: 3,
        explanation: '「在留カードと、送り先の口座番号がわかるものをご用意ください」.',
      },
    ],
  }),
  situationListening({
    id: 'sit-n3-l09',
    level: 'N3',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Du lịch & Khách sạn',
    situation: 'Khách nữ hỏi nhân viên công ty du lịch về suối nước nóng.',
    questionPrompt: '{男|おとこ}の{人|ひと}はみどり{温泉|おんせん}のどこがいちばんいいと{言|い}っていますか。',
    lines: [
      ['女', '{温泉|おんせん}に{行|い}きたいんですが、どこかおすすめはありますか。'],
      ['男', 'それでしたら、{山|やま}の{上|うえ}の「みどり{温泉|おんせん}」はいかがでしょう。{駅|えき}からは{少|すこ}し{遠|とお}いんですが、{無料|むりょう}の{送迎|そうげい}バスがありますし、{何|なに}より{部屋|へや}から{見|み}える{景色|けしき}が{素晴|すば}らしいんです。'],
      ['女', 'へえ、いいですね。'],
    ],
    options: ['駅から近いこと', '部屋から見える景色', '料金が安いこと', '料理がおいしいこと'],
    correct: 1,
    translation:
      'Nữ: Tôi muốn đi suối nước nóng, anh có gợi ý nào không?\nNam: Nếu vậy, chị thấy "Suối nước nóng Midori" trên núi thế nào? Hơi xa ga một chút nhưng có xe đưa đón miễn phí, và hơn hết là cảnh nhìn từ phòng tuyệt đẹp.\nNữ: Ồ, hay quá.',
    explanation: '「何より」(hơn hết) đánh dấu ý quan trọng nhất → cảnh nhìn từ phòng. Bẫy: xa ga chứ không gần ga.',
    followUps: [
      {
        prompt: '{駅|えき}からみどり{温泉|おんせん}までどうやって{行|い}きますか。',
        options: ['無料の送迎バスで行く', '歩いて行く', 'タクシーで行く', '電車で行く'],
        correct: 0,
        explanation: '「駅からは少し遠いんですが、無料の送迎バスがあります」.',
      },
    ],
  }),
  situationListening({
    id: 'sit-n3-l10',
    level: 'N3',
    mondai: 'Mondai 2 · Hiểu điểm chính',
    situationTag: 'Sự kiện & Sở thích',
    situation: 'Đồng nghiệp hỏi vì sao người đàn ông không đến phòng tập nữa.',
    questionPrompt: '{男|おとこ}の{人|ひと}はどうしてジムに{行|い}かなくなりましたか。',
    lines: [
      ['女', '{最近|さいきん}、ジムに{行|い}ってないの？'],
      ['男', 'うん。{仕事|しごと}が{忙|いそが}しいせいもあるけど、それより{近所|きんじょ}にテニスクラブができてね。{友|とも}だちと{一緒|いっしょ}にできるほうが{続|つづ}くと{思|おも}って、そっちに{変|か}えたんだ。'],
    ],
    options: ['仕事が忙しくなったから', 'ジムが閉まったから', 'けがをしたから', '友だちとテニスをするようになったから'],
    correct: 3,
    translation:
      'Nữ: Dạo này anh không đi phòng tập à?\nNam: Ừ. Một phần cũng vì công việc bận, nhưng chủ yếu là gần nhà mới mở câu lạc bộ tennis. Tôi nghĩ chơi cùng bạn bè thì sẽ duy trì được lâu hơn nên chuyển sang đó.',
    explanation: '「〜せいもあるけど、それより…」→ lý do chính đứng sau 「それより」: chuyển sang chơi tennis với bạn.',
  }),
  situationListening({
    id: 'sit-n3-lm01',
    level: 'N3',
    mondai: 'Mondai 5 · Phản hồi nhanh',
    situationTag: 'Làm thêm & Công ty',
    situation: 'Cấp trên nhờ hoàn thành tài liệu trong ngày.',
    questionPrompt: '{何|なん}と{答|こた}えますか。',
    lines: [['女', '{会議|かいぎ}の{資料|しりょう}、{今日中|きょうじゅう}に{仕上|しあ}げてもらえると{助|たす}かるんだけど。']],
    options: ['わかりました。急いでやります。', '助けてくれてありがとう。', '今日は会議でしたね。', '資料はもう読みました。'],
    correct: 0,
    translation: 'Nữ: Nếu cậu hoàn thành tài liệu họp trong hôm nay thì tốt quá.',
    explanation: '「〜てもらえると助かる」 là lời nhờ khéo → nhận lời.',
  }),
  situationListening({
    id: 'sit-n3-lm02',
    level: 'N3',
    mondai: 'Mondai 5 · Phản hồi nhanh',
    situationTag: 'Trường học',
    situation: 'Sinh viên xin lùi hạn nộp báo cáo.',
    questionPrompt: '{何|なん}と{答|こた}えますか。',
    lines: [['男', 'レポートの{締|し}め{切|き}り、{一日|いちにち}{延|の}ばしてもらうわけにはいきませんか。']],
    options: ['締め切りは昨日でした。', '延ばしてくれてありがとう。', 'じゃあ、明日までなら待ちますよ。', 'レポートを書くわけです。'],
    correct: 2,
    translation: 'Nam: Có thể cho em lùi hạn báo cáo một ngày được không ạ?',
    explanation: '「〜わけにはいきませんか」 = xin phép khéo → giáo viên đồng ý chờ đến mai.',
  }),
  situationListening({
    id: 'sit-n3-lm03',
    level: 'N3',
    mondai: 'Mondai 5 · Phản hồi nhanh',
    situationTag: 'Nhà ở & Hàng xóm',
    situation: 'Hàng xóm xin lỗi vì con làm vỡ kính.',
    questionPrompt: '{何|なん}と{答|こた}えますか。',
    lines: [['女', 'うちの{子|こ}が{窓|まど}ガラスを{割|わ}ってしまって、{本当|ほんとう}に{申|もう}し{訳|わけ}ありません。']],
    options: ['どういたしまして。', 'いえいえ、けががなくてよかったです。', '申し訳ありません。', 'ガラスがきれいですね。'],
    correct: 1,
    translation: 'Nữ: Con nhà tôi làm vỡ kính cửa sổ, thật sự xin lỗi anh.',
    explanation: 'Đáp lời xin lỗi lịch sự: 「けががなくてよかったです」.',
  }),
  situationListening({
    id: 'sit-n3-lm04',
    level: 'N3',
    mondai: 'Mondai 5 · Phản hồi nhanh',
    situationTag: 'Mua sắm',
    situation: 'Khách nhờ gói quà.',
    questionPrompt: '{何|なん}と{答|こた}えますか。',
    lines: [['男', 'こちら、{包|つつ}んでいただけますか。プレゼントなので。']],
    options: ['はい、プレゼントをいただきました。', '包むのはたいへんですね。', 'どうぞ、召し上がってください。', 'かしこまりました。リボンもおつけしましょうか。'],
    correct: 3,
    translation: 'Nam: Gói giúp tôi cái này được không? Để làm quà.',
    explanation: 'Nhân viên nhận lời bằng kính ngữ 「かしこまりました」.',
  }),
  situationListening({
    id: 'sit-n3-lm05',
    level: 'N3',
    mondai: 'Mondai 5 · Phản hồi nhanh',
    situationTag: 'Bệnh viện',
    situation: 'Bạn báo tin một người quen nhập viện.',
    questionPrompt: '{何|なん}と{答|こた}えますか。',
    lines: [['女', '{田中|たなか}さん、{入院|にゅういん}したんだって。']],
    options: ['え、本当？お見舞いに行かなきゃ。', '入院おめでとう。', 'じゃあ、退院したんだね。', '病院は近いね。'],
    correct: 0,
    translation: 'Nữ: Nghe nói anh Tanaka nhập viện rồi.',
    explanation: 'Phản ứng tự nhiên: ngạc nhiên và định đi thăm (お見舞い).',
  }),
].flat();
