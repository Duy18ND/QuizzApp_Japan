/**
 * N3 reading tagged by Shin Kanzen Master N3 grammar lessons — passages for Bài 1–4.
 * Each passage uses the lesson's grammar; questions mix comprehension and grammar-in-context.
 */
import type { JLPTReadingPassage } from './jlptDataset';
import { situationReading } from './situationPackUtils';

export const SKZ_READING_N3_A: JLPTReadingPassage[] = [
  situationReading({
    id: 'skz-n3-r1',
    level: 'N3',
    moduleId: 'reading-medium',
    situation: 'Làm thêm & Công ty',
    title: 'Một ngày bận rộn của nhân viên mới',
    paragraphs: [
      '入社して以来、毎日が勉強だ。今朝も、会議の最中に部長から急に意見を求められて、うまく答えられなかった。',
      '会議が終わったとたん、先輩が「最初はみんなそうだよ」と声をかけてくれた。その言葉を聞いて、少し気持ちが楽になった。',
      '午後は取引先の資料を作った。部長に「完成し次第、メールで送ってください」と言われたので、急いで仕上げた。でも、送る前に先輩に一度見てもらった。確認してからでないと、また間違えるかもしれないからだ。',
      '働いてはじめて、学生時代の自由な時間がどれほど貴重だったかが分かった。でも、若いうちにいろいろなことを経験しておきたい。今はそう思っている。',
    ],
    translation:
      'Từ khi vào công ty, ngày nào cũng là học hỏi. Sáng nay, đang giữa cuộc họp thì bị trưởng phòng đột ngột hỏi ý kiến, tôi không trả lời tốt. Cuộc họp vừa xong thì đàn anh bảo "Lúc đầu ai cũng vậy". Nghe câu đó tôi thấy nhẹ lòng hơn. Buổi chiều tôi làm tài liệu cho đối tác. Trưởng phòng dặn "Xong là gửi email ngay", nên tôi gấp rút hoàn thành. Nhưng trước khi gửi tôi nhờ đàn anh xem một lần, vì nếu không kiểm tra trước thì có thể lại sai. Phải đi làm rồi tôi mới hiểu thời gian tự do thời sinh viên quý giá biết bao. Nhưng tôi muốn trải nghiệm nhiều điều khi còn trẻ. Hiện tại tôi nghĩ vậy.',
    vocab: [
      ['取引先', 'とりひきさき', 'đối tác kinh doanh'],
      ['仕上げる', 'しあげる', 'hoàn thành'],
      ['貴重', 'きちょう', 'quý giá'],
    ],
    questions: [
      { prompt: '筆者が部長の質問にうまく答えられなかったのはいつですか。', options: ['会議の前', '会議の最中', '昼休み', '会議の後'], correct: 1, explanation: '「会議の最中に…急に意見を求められて」— 最中に = đúng lúc đang.' },
      { prompt: '先輩が声をかけてくれたのはいつですか。', options: ['会議が始まる前', '会議が終わってすぐ', '午後、資料を作っているとき', '帰るとき'], correct: 1, explanation: '「会議が終わったとたん」— たとたん = vừa ~ thì ngay.' },
      { prompt: '部長は資料をいつ送るように言いましたか。', options: ['明日の朝', '完成したらすぐ', '先輩が見たあと、来週', '会議の最中'], correct: 1, explanation: '「完成し次第」= hoàn thành xong là ngay.' },
      { prompt: '筆者はどうして資料を先輩に見てもらいましたか。', options: ['部長に言われたから', '確認しないとまた間違えるかもしれないから', '先輩が見たいと言ったから', '時間があったから'], correct: 1, explanation: '「確認してからでないと、また間違えるかもしれないからだ」.' },
      { prompt: '「働いてはじめて」の意味に最も近いものはどれですか。', options: ['働く前に', '働いたことで、初めて', '働きながら', '働かなくても'], correct: 1, explanation: '〜てはじめて = phải sau khi ~ mới (nhận ra).' },
      { prompt: '筆者が働いてから分かったことは何ですか。', options: ['仕事は簡単だということ', '学生時代の自由な時間が貴重だったこと', '部長が優しいこと', '会議が長いこと'], correct: 1, explanation: '「学生時代の自由な時間がどれほど貴重だったかが分かった」.' },
      { prompt: '「入社して以来」の意味はどれですか。', options: ['vừa mới vào công ty', 'kể từ khi vào công ty', 'trước khi vào công ty', 'nếu vào công ty'], correct: 1, explanation: '〜て以来 = kể từ khi ~ đến nay.' },
      { prompt: '筆者が今思っていることはどれですか。', options: ['早く会社を辞めたい', '若いうちにいろいろ経験したい', '学生に戻りたい', '部長になりたい'], correct: 1, explanation: '「若いうちにいろいろなことを経験しておきたい」— うちに = trong lúc còn.' },
    ],
  }),
  situationReading({
    id: 'skz-n3-r2',
    level: 'N3',
    moduleId: 'reading-medium',
    situation: 'Du lịch & Khách sạn',
    title: 'Thông báo của khách sạn suối nước nóng',
    paragraphs: [
      'ご宿泊のお客様へ。当館では、お客様のご希望に応じて、夕食の時間を六時、七時、八時の中からお選びいただけます。',
      '料金は季節によって異なります。また、宿泊人数が増えるにしたがって、お一人様の料金は安くなります。詳しくはフロントにお問い合わせください。',
      '大浴場は、季節の変化とともに景色が楽しめるよう、窓を大きくしました。ご来館のたびに、違った景色をお楽しみください。',
      'お散歩のついでに、近くの朝市にもお立ち寄りください。地元の野菜や果物が並んでいます。なお、館内の地図のとおりに進むと、朝市への近道があります。',
    ],
    translation:
      'Kính gửi quý khách lưu trú. Tại khách sạn, quý khách có thể chọn giờ ăn tối 6, 7 hoặc 8 giờ tùy theo mong muốn. Giá phòng khác nhau tùy mùa. Ngoài ra, số người càng tăng thì giá mỗi người càng rẻ. Chi tiết xin hỏi lễ tân. Phòng tắm lớn được làm cửa sổ to để có thể ngắm cảnh thay đổi theo mùa. Mỗi lần đến, xin hãy tận hưởng phong cảnh khác nhau. Nhân tiện đi dạo, xin ghé chợ sáng gần đây. Có bày bán rau và trái cây địa phương. Đi theo đúng bản đồ trong khách sạn sẽ có đường tắt đến chợ.',
    vocab: [
      ['当館', 'とうかん', 'khách sạn chúng tôi'],
      ['大浴場', 'だいよくじょう', 'phòng tắm lớn (chung)'],
      ['朝市', 'あさいち', 'chợ sáng'],
    ],
    questions: [
      { prompt: '夕食の時間はどうやって決まりますか。', options: ['ホテルが決める', '客の希望に応じて選べる', '季節によって決まる', 'いつも七時'], correct: 1, explanation: '「ご希望に応じて…お選びいただけます」.' },
      { prompt: '料金について正しいものはどれですか。', options: ['一年中同じ', '季節によって違う', '人数が増えると高くなる', '朝市で払う'], correct: 1, explanation: '「料金は季節によって異なります」.' },
      { prompt: '宿泊人数が増えると、どうなりますか。', options: ['一人の料金が高くなる', '一人の料金が安くなる', '部屋が狭くなる', '夕食の時間が決まる'], correct: 1, explanation: '「人数が増えるにしたがって、お一人様の料金は安くなります」.' },
      { prompt: '「にしたがって」と同じ意味で使えるものはどれですか。', options: ['につれて', 'のくせに', 'のわりに', 'としても'], correct: 0, explanation: 'Nghĩa thay đổi song song: にしたがって ≈ につれて.' },
      { prompt: '大浴場の窓を大きくした理由は何ですか。', options: ['部屋を明るくするため', '季節によって変わる景色を楽しめるように', '掃除しやすくするため', '朝市が見えるように'], correct: 1, explanation: '「季節の変化とともに景色が楽しめるよう」.' },
      { prompt: '「ご来館のたびに」の意味はどれですか。', options: ['lần đầu đến', 'mỗi lần đến', 'trước khi đến', 'sau khi về'], correct: 1, explanation: '〜たびに = mỗi lần.' },
      { prompt: 'ホテルが勧めていることはどれですか。', options: ['散歩のついでに朝市に寄ること', '朝市で夕食を食べること', '車で朝市へ行くこと', 'フロントで野菜を買うこと'], correct: 0, explanation: '「お散歩のついでに、近くの朝市にもお立ち寄りください」.' },
      { prompt: '朝市への近道はどうすれば分かりますか。', options: ['フロントで聞く', '館内の地図のとおりに進む', '大浴場から見る', '地元の人に聞く'], correct: 1, explanation: '「館内の地図のとおりに進むと…近道があります」.' },
    ],
  }),
  situationReading({
    id: 'skz-n3-r3',
    level: 'N3',
    moduleId: 'reading-medium',
    situation: 'Trường học',
    title: 'Lý do tôi đỗ kỳ thi',
    paragraphs: [
      '去年の試験では、時間が足りなくて失敗した。最後の読解問題に時間をかけすぎたばかりに、聴解の準備ができなかったのだ。',
      '今年は友達のアドバイスのおかげで、勉強のやり方を変えた。毎日決まった時間に模擬試験を解くことにしたのだ。',
      'それでも、仕事が忙しかったせいで、勉強できない日も多かった。そんな日は、通勤電車の中で単語を覚えた。',
      '結果は合格だった。先生は「毎日続けたからこそ、合格できたんですよ」と言ってくれた。たくさん失敗した経験があるだけに、今回の合格は本当にうれしかった。',
    ],
    translation:
      'Kỳ thi năm ngoái tôi thất bại vì thiếu thời gian. Chỉ vì dành quá nhiều thời gian cho câu đọc hiểu cuối mà không chuẩn bị được phần nghe. Năm nay nhờ lời khuyên của bạn mà tôi đổi cách học: quyết định mỗi ngày làm đề thi thử vào giờ cố định. Dù vậy, do công việc bận nên nhiều ngày không học được. Những ngày đó tôi học từ vựng trên tàu đi làm. Kết quả là đỗ. Thầy nói "Chính vì em duy trì mỗi ngày nên mới đỗ đấy". Chính vì đã thất bại nhiều nên lần đỗ này tôi thật sự vui.',
    vocab: [
      ['模擬試験', 'もぎしけん', 'thi thử'],
      ['解く', 'とく', 'giải (đề)'],
      ['通勤', 'つうきん', 'đi làm'],
    ],
    questions: [
      { prompt: '去年失敗した理由は何ですか。', options: ['単語を覚えなかったから', '読解問題に時間をかけすぎたから', '試験に遅れたから', '病気だったから'], correct: 1, explanation: '「読解問題に時間をかけすぎたばかりに」.' },
      { prompt: '「ばかりに」が表すのはどれですか。', options: ['tốt nhờ ~', 'chỉ vì ~ mà (hậu quả xấu)', 'mỗi lần ~', 'trong lúc ~'], correct: 1, explanation: '〜ばかりに = chỉ vì ~ mà dẫn đến kết quả đáng tiếc.' },
      { prompt: '今年、勉強のやり方を変えたきっかけは何ですか。', options: ['先生の注意', '友達のアドバイス', '会社の命令', '本の広告'], correct: 1, explanation: '「友達のアドバイスのおかげで」.' },
      { prompt: '筆者が今年始めたことは何ですか。', options: ['毎日決まった時間に模擬試験を解く', '塾に通う', '仕事をやめる', '毎晩聴解だけ練習する'], correct: 0, explanation: '「毎日決まった時間に模擬試験を解くことにした」.' },
      { prompt: '勉強できない日が多かったのはなぜですか。', options: ['病気だったから', '仕事が忙しかったから', '友達と遊んだから', '電車が混んでいたから'], correct: 1, explanation: '「仕事が忙しかったせいで」— せいで = tại (kết quả xấu).' },
      { prompt: '勉強できない日、筆者はどうしましたか。', options: ['何もしなかった', '電車の中で単語を覚えた', '夜遅くまで勉強した', '先生に電話した'], correct: 1, explanation: '「通勤電車の中で単語を覚えた」.' },
      { prompt: '先生は、合格の理由を何だと言いましたか。', options: ['試験が簡単だったから', '毎日続けたから', '友達が手伝ったから', '運がよかったから'], correct: 1, explanation: '「毎日続けたからこそ、合格できた」.' },
      { prompt: '「失敗した経験があるだけに」の意味に近いものはどれですか。', options: ['thất bại nên buồn', 'chính vì đã từng thất bại nên càng (vui)', 'dù thất bại', 'chỉ thất bại thôi'], correct: 1, explanation: '〜だけに = chính vì ~ nên càng.' },
    ],
  }),
  situationReading({
    id: 'skz-n3-r4',
    level: 'N3',
    moduleId: 'reading-medium',
    situation: 'Nhà ở & Hàng xóm',
    title: 'Quy định của chung cư',
    paragraphs: [
      'マンション住民の皆様へ。最近、ペットに関する苦情が増えています。管理組合の許可がないかぎり、ペットを飼うことはできません。',
      '許可を受けるには、申込書と写真さえ提出すれば大丈夫です。ただし、他の住民の同意を得ないことには、許可は出せません。',
      'もしペットが原因で問題が起きたとしたら、飼い主が責任を持って対応してください。たとえ小さな犬でも、夜に鳴き続けると近所の迷惑になります。',
      'ルールを守らない場合、ペットを手放していただくこともあります。もっと早くルールを確認すれば、トラブルにならなかったのに、という声も聞きます。ご協力をお願いします。',
    ],
    translation:
      'Kính gửi cư dân chung cư. Gần đây phàn nàn liên quan đến thú cưng tăng lên. Trừ khi được ban quản lý cho phép, không được nuôi thú cưng. Để được phép, chỉ cần nộp đơn đăng ký và ảnh là được. Tuy nhiên, nếu không có sự đồng ý của các cư dân khác thì không thể cấp phép. Giả sử có vấn đề do thú cưng gây ra, chủ nuôi phải chịu trách nhiệm xử lý. Dù là chó nhỏ, nếu kêu suốt ban đêm cũng làm phiền hàng xóm. Trường hợp không tuân thủ quy định, có thể phải đem thú cưng đi nơi khác. Cũng có ý kiến "Giá mà kiểm tra quy định sớm hơn thì đã không xảy ra rắc rối". Mong mọi người hợp tác.',
    vocab: [
      ['管理組合', 'かんりくみあい', 'ban quản lý (chung cư)'],
      ['同意', 'どうい', 'sự đồng ý'],
      ['手放す', 'てばなす', 'buông bỏ, đem cho đi'],
    ],
    questions: [
      { prompt: 'このお知らせが書かれた理由は何ですか。', options: ['新しい住民が来たから', 'ペットに関する苦情が増えたから', 'ペットを飼う人が減ったから', '管理組合が変わったから'], correct: 1, explanation: '「ペットに関する苦情が増えています」.' },
      { prompt: 'ペットを飼うことができるのはどんな場合ですか。', options: ['いつでも', '管理組合の許可がある場合', '小さい犬の場合', '一階の住民の場合'], correct: 1, explanation: '「許可がないかぎり、ペットを飼うことはできません」.' },
      { prompt: '許可を受けるために提出するものは何ですか。', options: ['申込書と写真', 'お金と写真', '申込書だけ', '医者の証明書'], correct: 0, explanation: '「申込書と写真さえ提出すれば大丈夫です」— さえ〜ば = chỉ cần ~ là.' },
      { prompt: '許可が出ないのはどんな場合ですか。', options: ['写真がきれいでない場合', '他の住民の同意がない場合', '犬が小さい場合', '申込書が遅れた場合'], correct: 1, explanation: '「他の住民の同意を得ないことには、許可は出せません」.' },
      { prompt: '「ないことには」の意味に近いものはどれですか。', options: ['nếu không ~ thì không thể', 'dù không ~', 'vì không ~', 'trong lúc không ~'], correct: 0, explanation: '〜ないことには = nếu chưa ~ thì không thể ~.' },
      { prompt: '問題が起きたら、だれが対応しますか。', options: ['管理組合', '飼い主', '近所の人', '警察'], correct: 1, explanation: '「飼い主が責任を持って対応してください」.' },
      { prompt: '「たとえ小さな犬でも」の意味はどれですか。', options: ['vì là chó nhỏ', 'dù là chó nhỏ', 'chỉ chó nhỏ', 'nếu là chó nhỏ thì được'], correct: 1, explanation: 'たとえ〜ても / でも = dù cho.' },
      { prompt: '「確認すれば…ならなかったのに」はどんな気持ちを表しますか。', options: ['vui mừng', 'tiếc nuối', 'yêu cầu', 'dự định'], correct: 1, explanation: '〜ば〜のに = giá mà ~ thì đã (tiếc nuối).' },
    ],
  }),
];
