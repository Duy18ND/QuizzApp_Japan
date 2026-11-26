/** Shin Kanzen N3 読解 — 第2部 いろいろな文章を読もう (passages & questions written for this app). */
import type { SituationReadingSpec } from '../situationPackUtils';

export const SKZ_R_PART2: SituationReadingSpec[] = [
  {
    id: 'skzr-2-1', level: 'N3', moduleId: 'reading-medium', situation: 'Làm thêm & Công ty',
    title: '[SKZ 読解 2-1] メール（プライベート）: Email cho bạn',
    paragraphs: [
      'ミンさんへ。お元気ですか。先日は引っ越しを手伝ってくれて本当にありがとう。おかげで一日で片付きました。',
      'お礼に今度の土曜日、うちで食事でもどうですか。新しい部屋も見てもらいたいし、母が送ってくれたお米があるので、一緒に食べましょう。',
      '時間は午後六時ごろを考えていますが、仕事の都合が悪ければ日曜日でも大丈夫です。金曜日の夜までに返事をもらえるとうれしいです。　　けんじ',
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
      '山田先生。寒い日が続いておりますが、お元気でお過ごしでしょうか。',
      '私が帰国してから半年がたちました。日本にいる間は、先生に作文を何度も直していただき、心から感謝しております。おかげさまで、今は国の会社で通訳の仕事をしています。',
      'まだ分からないことも多いのですが、先生に教えていただいた「分からないことはすぐ聞く」という言葉を忘れずに頑張っています。',
      '来年の春には日本へ行く予定ですので、その際はぜひお目にかかりたいと思っております。お体を大切になさってください。　　グエン・ラン',
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
      '佐藤さんへ（田中より）。十時ごろ、ABC社の鈴木様から電話がありました。',
      '来週の打ち合わせを、火曜日の午後二時から水曜日の午前十時に変えてほしいそうです。場所は同じ当社の会議室でいいとのことです。',
      '都合を確認して、今日の五時までに鈴木様に直接お電話ください。もし五時を過ぎる場合は、メールでも構わないそうです。',
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
      '寮の洗濯機の使い方。一、使う前に、中に他の人の物がないか確かめてください。',
      '二、洗濯物を入れすぎないでください。入れすぎると故障の原因になります。三、洗剤は決められた量だけ入れてください。',
      '四、洗濯が終わったら、すぐに取り出してください。終了後三十分たっても残っている場合は、次に使う人が横のかごに移してもかまいません。',
      '五、最後に必ずふたを開けたままにしておいてください。中を乾かすためです。',
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
      '大学の授業中にスマートフォンの使用を禁止すべきだという意見がある。確かに、授業に関係のないことに使う学生がいるのは事実だ。',
      'しかし、私は全面的な禁止には反対だ。分からない言葉をすぐ調べたり、黒板を写真に撮って後で復習したりするのに、スマートフォンはとても役に立つからである。',
      '大切なのは、禁止することではなく、使い方のルールを学生と先生が一緒に決めることではないだろうか。自分で考えて決めたルールなら、学生も守ろうとするはずだ。',
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
      '人は毎晩、何回か夢を見ていると言われている。覚えていないのは、夢を見なかったからではなく、忘れてしまうからだ。',
      '眠りには、体を休める深い眠りと、脳が活発に動いている浅い眠りがある。夢をよく見るのは浅い眠りの時だ。この二つは約九十分ごとに繰り返される。',
      '浅い眠りの途中で目が覚めると、夢の内容を覚えていることが多い。反対に、深い眠りの時に無理に起こされると、頭がぼんやりしてしまう。',
      'つまり、すっきり起きるには、眠りの浅い時に目を覚ますことが大切なのである。',
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
      '私の机の上には、祖父からもらった古い時計がある。毎朝、ねじを回さないと止まってしまう、少し手のかかる時計だ。',
      '子どものころは、電池で動く新しい時計がうらやましくて、どうしてこんな古い物を大切にするのか分からなかった。',
      'ところが、大人になった今、朝ねじを回す時間が、一日の中でいちばん落ち着く時間になっている。ゆっくりねじを回しながら、祖父の大きな手を思い出すのだ。',
      '便利な物は増える一方だが、手間がかかるからこそ、大切に思える物もあるのかもしれない。',
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
