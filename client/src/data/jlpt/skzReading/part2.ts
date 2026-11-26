/** Shin Kanzen N3 読解 — 第2部 いろいろな文章を読もう (passages & questions written for this app). */
import type { SituationReadingSpec } from '../situationPackUtils';

export const SKZ_R_PART2: SituationReadingSpec[] = [
  {
    id: 'skzr-2-1', level: 'N3', moduleId: 'reading-medium', situation: 'Làm thêm & Công ty',
    title: '[SKZ 読解 2-1] メール（プライベート）: Email cho bạn',
    paragraphs: [
      'ミンさんへ。お{元気|げんき}ですか。{先日|せんじつ}は{引っ越|ひっこ}しを{手伝|てつだ}ってくれて{本当|ほんとう}にありがとう。おかげで{一日|いちにち}で{片付|かたづ}きました。',
      'お{礼|れい}に{今度|こんど}の{土曜日|どようび}、うちで{食事|しょくじ}でもどうですか。{新|あたら}しい{部屋|へや}も{見|み}てもらいたいし、{母|はは}が{送|おく}ってくれたお{米|こめ}があるので、{一緒|いっしょ}に{食|た}べましょう。',
      '{時間|じかん}は{午後|ごご}{六|ろく}{時|じ}ごろを{考|かんが}えていますが、{仕事|しごと}の{都合|つごう}が{悪|わる}ければ{日曜日|にちようび}でも{大丈夫|だいじょうぶ}です。{金曜日|きんようび}の{夜|よる}までに{返事|へんじ}をもらえるとうれしいです。　　けんじ',
    ],
    translation: 'Gửi Minh. Bạn khỏe không? Cảm ơn hôm trước đã giúp mình chuyển nhà, nhờ vậy một ngày là xong. Để cảm ơn, thứ Bảy này đến nhà mình ăn cơm nhé. Mình muốn bạn xem phòng mới, mẹ lại gửi gạo nên cùng ăn nhé. Mình tính khoảng 6 giờ chiều, nếu bận việc thì Chủ nhật cũng được. Mong nhận được hồi âm trước tối thứ Sáu. — Kenji',
    vocab: [['片付く', 'かたづく', 'được dọn xong'], ['都合', 'つごう', 'sự thuận tiện']],
    questions: [
      { prompt: 'このメールの一番の目的は何ですか。', options: ['引っ越しを手伝ってほしい', '食事に誘いたい', 'お米を送ってほしい', '仕事の予定を聞きたい'], correct: 1, explanation: 'Mục đích chính: 「今度の土曜日、うちで食事でもどうですか」.' },
      { prompt: 'けんじさんがミンさんにお礼をしたいのはなぜですか。', options: ['お米をもらったから', '引っ越しを手伝ってもらったから', '部屋を貸してもらったから', '仕事を手伝ってもらったから'], correct: 1, explanation: '「先日は引っ越しを手伝ってくれて本当にありがとう」.' },
      { prompt: 'ミンさんは土曜日に仕事があって行けない場合、どうできますか。', options: ['日曜日に行く', '午後三時に行く', '返事をしなくていい', '金曜日に行く'], correct: 0, explanation: '「都合が悪ければ日曜日でも大丈夫」.' },
      { prompt: 'ミンさんはいつまでに返事をしたほうがいいですか。', options: ['土曜日の朝まで', '金曜日の夜まで', '日曜日まで', '今すぐ'], correct: 1, explanation: '「金曜日の夜までに返事をもらえるとうれしい」.' },
      { prompt: '「見てもらいたい」の意味はどれですか。', options: ['tôi muốn xem', 'tôi muốn bạn xem', 'tôi được xem', 'bạn muốn xem'], correct: 1, explanation: '〜てもらいたい = muốn người khác làm cho mình.' },
    ],
  },
  {
    id: 'skzr-2-2', level: 'N3', moduleId: 'reading-medium', situation: 'Trường học',
    title: '[SKZ 読解 2-2] 手紙: Thư cảm ơn thầy cô',
    paragraphs: [
      '{山田|やまだ}{先生|せんせい}。{寒|さむ}い{日|ひ}が{続|つづ}いておりますが、お{元気|げんき}でお{過|す}ごしでしょうか。',
      '{私|わたし}が{帰国|きこく}してから{半年|はんとし}がたちました。{日本|にほん}にいる{間|あいだ}は、{先生|せんせい}に{作文|さくぶん}を{何|なん}{度|ど}も{直|なお}していただき、{心|こころ}から{感謝|かんしゃ}しております。おかげさまで、{今|いま}は{国|くに}の{会社|かいしゃ}で{通訳|つうやく}の{仕事|しごと}をしています。',
      'まだ{分|わ}からないことも{多|おお}いのですが、{先生|せんせい}に{教|おし}えていただいた「{分|わ}からないことはすぐ{聞|き}く」という{言葉|ことば}を{忘|わす}れずに{頑張|がんば}っています。',
      '{来年|らいねん}の{春|はる}には{日本|にほん}へ{行|い}く{予定|よてい}ですので、その{際|さい}はぜひお{目|め}にかかりたいと{思|おも}っております。お{体|からだ}を{大切|たいせつ}になさってください。　　グエン・ラン',
    ],
    translation: 'Thưa cô Yamada. Trời lạnh kéo dài, cô vẫn khỏe chứ ạ? Em về nước được nửa năm rồi. Khi ở Nhật, cô đã nhiều lần sửa bài văn cho em, em thật lòng biết ơn. Nhờ cô, giờ em làm phiên dịch cho một công ty ở quê. Còn nhiều điều chưa biết nhưng em luôn nhớ câu cô dạy "không hiểu thì hỏi ngay" và cố gắng. Mùa xuân năm sau em dự định sang Nhật, khi đó rất mong được gặp cô. Cô giữ gìn sức khỏe ạ. — Nguyễn Lan',
    vocab: [['お目にかかる', 'おめにかかる', 'gặp (khiêm nhường)'], ['通訳', 'つうやく', 'phiên dịch']],
    questions: [
      { prompt: 'この手紙を書いた人は今、どこで何をしていますか。', options: ['日本の学校で勉強している', '国の会社で通訳の仕事をしている', '日本の会社で働いている', '先生の手伝いをしている'], correct: 1, explanation: '「今は国の会社で通訳の仕事をしています」.' },
      { prompt: '筆者が感謝していることは何ですか。', options: ['仕事を紹介してもらったこと', '作文を何度も直してもらったこと', '帰国の手伝いをしてもらったこと', 'お金を借りたこと'], correct: 1, explanation: '「作文を何度も直していただき」.' },
      { prompt: '先生に教えてもらった言葉はどれですか。', options: ['早く寝る', '分からないことはすぐ聞く', '毎日勉強する', '体を大切にする'], correct: 1, explanation: '「分からないことはすぐ聞く」という言葉.' },
      { prompt: '「お目にかかりたい」はどういう意味ですか。', options: ['会いたい (khiêm nhường)', '見せたい', '電話したい', '手紙を書きたい'], correct: 0, explanation: 'お目にかかる là khiêm nhường ngữ của 会う.' },
    ],
  },
  {
    id: 'skzr-2-3', level: 'N3', moduleId: 'reading-medium', situation: 'Làm thêm & Công ty',
    title: '[SKZ 読解 2-3] メモ: Lời nhắn ở công ty',
    paragraphs: [
      '{佐藤|さとう}さんへ（{田中|たなか}より）。{十|じゅう}{時|じ}ごろ、ABC{社|しゃ}の{鈴木|すずき}{様|さま}から{電話|でんわ}がありました。',
      '{来週|らいしゅう}の{打ち合|うちあ}わせを、{火曜日|かようび}の{午後|ごご}{二|に}{時|じ}から{水曜日|すいようび}の{午前|ごぜん}{十|じゅう}{時|じ}に{変|か}えてほしいそうです。{場所|ばしょ}は{同|おな}じ{当社|とうしゃ}の{会議|かいぎ}{室|しつ}でいいとのことです。',
      '{都合|つごう}を{確認|かくにん}して、{今日|きょう}の{五|ご}{時|じ}までに{鈴木|すずき}{様|さま}に{直接|ちょくせつ}お{電話|でんわ}ください。もし{五|ご}{時|じ}を{過|す}ぎる{場合|ばあい}は、メールでも{構|かま}わないそうです。',
    ],
    translation: 'Gửi anh Sato (từ Tanaka). Khoảng 10 giờ, ông Suzuki công ty ABC gọi điện. Ông ấy muốn đổi buổi họp tuần sau từ 2 giờ chiều thứ Ba sang 10 giờ sáng thứ Tư. Địa điểm vẫn là phòng họp công ty mình. Anh kiểm tra lịch rồi gọi trực tiếp cho ông Suzuki trước 5 giờ hôm nay. Nếu quá 5 giờ thì gửi email cũng được.',
    vocab: [['打ち合わせ', 'うちあわせ', 'họp bàn'], ['当社', 'とうしゃ', 'công ty chúng tôi']],
    questions: [
      { prompt: '鈴木様は何を伝えてきましたか。', options: ['打ち合わせを中止したい', '打ち合わせの日時を変えたい', '場所を変えたい', '資料を送ってほしい'], correct: 1, explanation: '「火曜日の午後二時から水曜日の午前十時に変えてほしい」.' },
      { prompt: '新しい打ち合わせはいつですか。', options: ['火曜日の午後二時', '火曜日の午前十時', '水曜日の午後二時', '水曜日の午前十時'], correct: 3, explanation: '「水曜日の午前十時」.' },
      { prompt: '佐藤さんはまず何をしなければなりませんか。', options: ['会議室を予約する', '都合を確認する', 'ABC社へ行く', '田中さんに電話する'], correct: 1, explanation: '「都合を確認して、…お電話ください」.' },
      { prompt: '五時を過ぎる場合はどうしますか。', options: ['連絡しなくていい', '翌日電話する', 'メールで連絡してもいい', '会社へ直接行く'], correct: 2, explanation: '「メールでも構わないそうです」.' },
    ],
  },
  {
    id: 'skzr-2-4', level: 'N3', moduleId: 'reading-medium', situation: 'Nhà ở & Hàng xóm',
    title: '[SKZ 読解 2-4] 指示文: Cách dùng máy giặt chung',
    paragraphs: [
      '{寮|りょう}の{洗濯|せんたく}{機|き}の{使い方|つかいかた}。{一|いち}、{使|つか}う{前|まえ}に、{中|なか}に{他|ほか}の{人|ひと}の{物|もの}がないか{確|たし}かめてください。',
      '{二|に}、{洗濯物|せんたくもの}を{入|い}れすぎないでください。{入|い}れすぎると{故障|こしょう}の{原因|げんいん}になります。{三|さん}、{洗剤|せんざい}は{決|き}められた{量|りょう}だけ{入|い}れてください。',
      '{四|よん}、{洗濯|せんたく}が{終|お}わったら、すぐに{取り出|とりだ}してください。{終了|しゅうりょう}{後|ご}{三十分|さんじゅっぷん}たっても{残|のこ}っている{場合|ばあい}は、{次|つぎ}に{使|つか}う{人|ひと}が{横|よこ}のかごに{移|うつ}してもかまいません。',
      '{五|ご}、{最後|さいご}に{必|かなら}ずふたを{開|あ}けたままにしておいてください。{中|なか}を{乾|かわ}かすためです。',
    ],
    translation: 'Cách dùng máy giặt ký túc. 1. Trước khi dùng kiểm tra trong máy không có đồ người khác. 2. Đừng cho quá nhiều đồ, dễ gây hỏng. 3. Chỉ cho bột giặt đúng lượng quy định. 4. Giặt xong lấy ra ngay; quá 30 phút vẫn còn thì người dùng sau được chuyển sang giỏ bên cạnh. 5. Cuối cùng nhất định để nắp mở để khô bên trong.',
    vocab: [['故障', 'こしょう', 'hỏng hóc'], ['終了', 'しゅうりょう', 'kết thúc']],
    questions: [
      { prompt: '洗濯物を入れすぎてはいけない理由は何ですか。', options: ['洗剤が足りなくなるから', '故障の原因になるから', '時間がかかるから', '他の人が使えないから'], correct: 1, explanation: '「入れすぎると故障の原因になります」.' },
      { prompt: '洗濯が終わって三十分以上たつと、どうなる可能性がありますか。', options: ['洗濯物が捨てられる', '次の人が洗濯物をかごに移す', '罰金を払う', 'もう一度洗われる'], correct: 1, explanation: '「次に使う人が横のかごに移してもかまいません」.' },
      { prompt: 'ふたを開けたままにするのはなぜですか。', options: ['次の人が分かるように', '中を乾かすため', '洗剤を入れるため', '電気を切るため'], correct: 1, explanation: '「中を乾かすためです」.' },
      { prompt: 'この説明に合っているものはどれですか。', options: ['洗剤は多いほどいい', '使う前に中を確認する', '三十分以内なら他の人が出してもいい', 'ふたは閉めておく'], correct: 1, explanation: 'Quy định 1: kiểm tra trước khi dùng.' },
    ],
  },
  {
    id: 'skzr-2-5', level: 'N3', moduleId: 'reading-medium', situation: 'Trường học',
    title: '[SKZ 読解 2-5] 意見文: Điện thoại trong lớp học',
    paragraphs: [
      '{大学|だいがく}の{授業|じゅぎょう}{中|ちゅう}にスマートフォンの{使用|しよう}を{禁止|きんし}すべきだという{意見|いけん}がある。{確|たし}かに、{授業|じゅぎょう}に{関係|かんけい}のないことに{使|つか}う{学生|がくせい}がいるのは{事実|じじつ}だ。',
      'しかし、{私|わたし}は{全面|ぜんめん}{的|てき}な{禁止|きんし}には{反対|はんたい}だ。{分|わ}からない{言葉|ことば}をすぐ{調|しら}べたり、{黒板|こくばん}を{写真|しゃしん}に{撮|と}って{後|あと}で{復習|ふくしゅう}したりするのに、スマートフォンはとても{役に立|やくにた}つからである。',
      '{大切|たいせつ}なのは、{禁止|きんし}することではなく、{使い方|つかいかた}のルールを{学生|がくせい}と{先生|せんせい}が{一緒|いっしょ}に{決|き}めることではないだろうか。{自分|じぶん}で{考|かんが}えて{決|き}めたルールなら、{学生|がくせい}も{守|まも}ろうとするはずだ。',
    ],
    translation: 'Có ý kiến nên cấm dùng smartphone trong giờ học đại học. Đúng là có sinh viên dùng vào việc không liên quan. Nhưng tôi phản đối cấm hoàn toàn, vì smartphone rất hữu ích để tra từ không hiểu hay chụp bảng ôn lại. Điều quan trọng không phải cấm mà là sinh viên và giảng viên cùng đặt quy tắc sử dụng. Quy tắc tự mình nghĩ ra thì sinh viên chắc sẽ cố tuân thủ.',
    vocab: [['全面的', 'ぜんめんてき', 'toàn diện'], ['復習', 'ふくしゅう', 'ôn tập']],
    questions: [
      { prompt: '筆者は授業中のスマートフォンについてどう考えていますか。', options: ['完全に禁止すべきだ', '全面的な禁止には反対だ', '自由に使うべきだ', '関心がない'], correct: 1, explanation: '「私は全面的な禁止には反対だ」.' },
      { prompt: '筆者が反対する理由は何ですか。', options: ['学生が嫌がるから', '勉強に役立つ使い方があるから', '先生が困るから', 'ルールがあるから'], correct: 1, explanation: 'Tra từ, chụp bảng ôn tập.' },
      { prompt: '「確かに」はどんな働きをしていますか。', options: ['Đưa ra kết luận', 'Công nhận một phần ý kiến trái chiều', 'Phủ định ý kiến', 'Đặt câu hỏi'], correct: 1, explanation: '確かに…しかし: thừa nhận rồi phản biện.' },
      { prompt: '筆者が大切だと考えていることはどれですか。', options: ['スマートフォンを持たないこと', 'ルールを学生と先生が一緒に決めること', '先生だけがルールを決めること', '写真を撮らないこと'], correct: 1, explanation: 'Đoạn kết.' },
      { prompt: '「守ろうとするはずだ」の意味はどれですか。', options: ['chắc sẽ cố tuân thủ', 'phải tuân thủ', 'không muốn tuân thủ', 'đã tuân thủ'], correct: 0, explanation: '〜(よ)うとする + はずだ.' },
    ],
  },
  {
    id: 'skzr-2-6', level: 'N3', moduleId: 'reading-medium', situation: 'Bệnh viện',
    title: '[SKZ 読解 2-6] 説明文: Vì sao ta ngủ mơ',
    paragraphs: [
      '{人|ひと}は{毎晩|まいばん}、{何|なん}{回|かい}か{夢|ゆめ}を{見|み}ていると{言|い}われている。{覚|おぼ}えていないのは、{夢|ゆめ}を{見|み}なかったからではなく、{忘|わす}れてしまうからだ。',
      '{眠|ねむ}りには、{体|からだ}を{休|やす}める{深|ふか}い{眠|ねむ}りと、{脳|のう}が{活発|かっぱつ}に{動|うご}いている{浅|あさ}い{眠|ねむ}りがある。{夢|ゆめ}をよく{見|み}るのは{浅|あさ}い{眠|ねむ}りの{時|とき}だ。この{二|ふた}つは{約|やく}{九十分|きゅうじゅっぷん}ごとに{繰り返|くりかえ}される。',
      '{浅|あさ}い{眠|ねむ}りの{途中|とちゅう}で{目|め}が{覚|さ}めると、{夢|ゆめ}の{内容|ないよう}を{覚|おぼ}えていることが{多|おお}い。{反対|はんたい}に、{深|ふか}い{眠|ねむ}りの{時|とき}に{無理|むり}に{起|お}こされると、{頭|あたま}がぼんやりしてしまう。',
      'つまり、すっきり{起|お}きるには、{眠|ねむ}りの{浅|あさ}い{時|とき}に{目|め}を{覚|さ}ますことが{大切|たいせつ}なのである。',
    ],
    translation: 'Người ta nói mỗi đêm con người mơ vài lần. Không nhớ không phải vì không mơ mà vì quên. Giấc ngủ gồm ngủ sâu giúp cơ thể nghỉ và ngủ nông khi não hoạt động mạnh. Ta hay mơ lúc ngủ nông. Hai kiểu này lặp lại mỗi khoảng 90 phút. Thức dậy giữa lúc ngủ nông thường nhớ giấc mơ. Ngược lại bị đánh thức lúc ngủ sâu thì đầu óc mụ mị. Tóm lại muốn thức dậy tỉnh táo thì nên dậy lúc ngủ nông.',
    vocab: [['活発', 'かっぱつ', 'hoạt bát, mạnh'], ['無理に', 'むりに', 'cưỡng ép']],
    questions: [
      { prompt: '夢を覚えていないのはなぜですか。', options: ['夢を見ないから', '忘れてしまうから', '深く眠るから', '時間が短いから'], correct: 1, explanation: '「忘れてしまうからだ」.' },
      { prompt: '夢をよく見るのはどんな時ですか。', options: ['深い眠りの時', '浅い眠りの時', '起きる直後', '寝る前'], correct: 1, explanation: '「夢をよく見るのは浅い眠りの時だ」.' },
      { prompt: '二つの眠りはどのくらいで繰り返されますか。', options: ['約三十分', '約六十分', '約九十分', '約百二十分'], correct: 2, explanation: '「約九十分ごと」.' },
      { prompt: '深い眠りの時に起こされるとどうなりますか。', options: ['夢を覚えている', '頭がぼんやりする', 'すぐ元気になる', 'また夢を見る'], correct: 1, explanation: '「頭がぼんやりしてしまう」.' },
      { prompt: '「つまり」の後で筆者が言いたいことは何ですか。', options: ['長く寝るほどいい', '眠りの浅い時に起きることが大切だ', '夢は見ないほうがいい', '九十分だけ寝ればいい'], correct: 1, explanation: 'Câu kết.' },
    ],
  },
  {
    id: 'skzr-2-7', level: 'N3', moduleId: 'reading-medium', situation: 'Sự kiện & Sở thích',
    title: '[SKZ 読解 2-7] エッセイ: Chiếc đồng hồ cũ của ông',
    paragraphs: [
      '{私|わたし}の{机|つくえ}の{上|うえ}には、{祖父|そふ}からもらった{古|ふる}い{時計|とけい}がある。{毎朝|まいあさ}、ねじを{回|まわ}さないと{止|と}まってしまう、{少|すこ}し{手|て}のかかる{時計|とけい}だ。',
      '{子|こ}どものころは、{電池|でんち}で{動|うご}く{新|あたら}しい{時計|とけい}がうらやましくて、どうしてこんな{古|ふる}い{物|もの}を{大切|たいせつ}にするのか{分|わ}からなかった。',
      'ところが、{大人|おとな}になった{今|いま}、{朝|あさ}ねじを{回|まわ}す{時間|じかん}が、{一|いち}{日|にち}の{中|なか}でいちばん{落ち着|おちつ}く{時間|じかん}になっている。ゆっくりねじを{回|まわ}しながら、{祖父|そふ}の{大|おお}きな{手|て}を{思い出|おもいだ}すのだ。',
      '{便利|べんり}な{物|もの}は{増|ふ}える{一方|いっぽう}だが、{手間|てま}がかかるからこそ、{大切|たいせつ}に{思|おも}える{物|もの}もあるのかもしれない。',
    ],
    translation: 'Trên bàn tôi có chiếc đồng hồ cũ ông cho. Sáng nào không lên dây cót là nó dừng, hơi tốn công. Hồi nhỏ tôi ghen tị với đồng hồ chạy pin mới, không hiểu sao lại quý đồ cũ thế. Vậy mà giờ lớn rồi, khoảng thời gian lên dây buổi sáng thành lúc yên bình nhất trong ngày. Vừa chậm rãi lên dây tôi lại nhớ bàn tay to của ông. Đồ tiện lợi ngày càng nhiều, nhưng có lẽ có những thứ chính vì tốn công nên ta mới thấy quý.',
    vocab: [['ねじを回す', 'ねじをまわす', 'lên dây cót'], ['手間', 'てま', 'công sức']],
    questions: [
      { prompt: 'この時計はどんな時計ですか。', options: ['電池で動く', '毎朝ねじを回す必要がある', '新しくて便利', '壊れていて動かない'], correct: 1, explanation: '「毎朝、ねじを回さないと止まってしまう」.' },
      { prompt: '子どものころの筆者はどう思っていましたか。', options: ['古い時計が大好きだった', '新しい時計がうらやましかった', '時計に興味がなかった', '祖父が嫌いだった'], correct: 1, explanation: '「新しい時計がうらやましくて」.' },
      { prompt: '今、ねじを回す時間は筆者にとって何ですか。', options: ['面倒な時間', 'いちばん落ち着く時間', '忙しい時間', '無駄な時間'], correct: 1, explanation: '「一日の中でいちばん落ち着く時間」.' },
      { prompt: 'ねじを回しながら、何を思い出しますか。', options: ['子どもの時の遊び', '祖父の大きな手', '学校の先生', '新しい時計'], correct: 1, explanation: '「祖父の大きな手を思い出す」.' },
      { prompt: '筆者が最後に言いたいことは何ですか。', options: ['便利な物は悪い', '手間がかかるからこそ大切に思える物もある', '古い物はすぐ捨てるべきだ', '時計は電池がいい'], correct: 1, explanation: 'Đoạn kết (からこそ).' },
    ],
  },
];
