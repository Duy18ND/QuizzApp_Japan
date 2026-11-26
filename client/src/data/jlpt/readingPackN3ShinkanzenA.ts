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
      '{入社|にゅうしゃ}して{以来|いらい}、{毎日|まいにち}が{勉強|べんきょう}だ。{今朝|けさ}も、{会議|かいぎ}の{最中|さいちゅう}に{部長|ぶちょう}から{急|きゅう}に{意見|いけん}を{求|もと}められて、うまく{答|こた}えられなかった。',
      '{会議|かいぎ}が{終|お}わったとたん、{先輩|せんぱい}が「{最初|さいしょ}はみんなそうだよ」と{声|こえ}をかけてくれた。その{言葉|ことば}を{聞|き}いて、{少|すこ}し{気持|きも}ちが{楽|らく}になった。',
      '{午後|ごご}は{取引|とりひき}{先|さき}の{資料|しりょう}を{作|つく}った。{部長|ぶちょう}に「{完成|かんせい}し{次第|しだい}、メールで{送|おく}ってください」と{言|い}われたので、{急|いそ}いで{仕上|しあ}げた。でも、{送|おく}る{前|まえ}に{先輩|せんぱい}に{一|いち}{度|ど}{見|み}てもらった。{確認|かくにん}してからでないと、また{間違|まちが}えるかもしれないからだ。',
      '{働|はたら}いてはじめて、{学生|がくせい}{時代|じだい}の{自由|じゆう}な{時間|じかん}がどれほど{貴重|きちょう}だったかが{分|わ}かった。でも、{若|わか}いうちにいろいろなことを{経験|けいけん}しておきたい。{今|いま}はそう{思|おも}っている。',
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
      'ご{宿泊|しゅくはく}のお{客様|きゃくさま}へ。{当館|とうかん}では、お{客様|きゃくさま}のご{希望|きぼう}に{応|おう}じて、{夕食|ゆうしょく}の{時間|じかん}を{六|ろく}{時|じ}、{七時|しちじ}、{八|はち}{時|じ}の{中|なか}からお{選|えら}びいただけます。',
      '{料金|りょうきん}は{季節|きせつ}によって{異|こと}なります。また、{宿泊|しゅくはく}{人数|にんずう}が{増|ふ}えるにしたがって、お{一人様|ひとりさま}の{料金|りょうきん}は{安|やす}くなります。{詳|くわ}しくはフロントにお{問い合|といあ}わせください。',
      '{大|だい}{浴場|よくじょう}は、{季節|きせつ}の{変化|へんか}とともに{景色|けしき}が{楽|たの}しめるよう、{窓|まど}を{大|おお}きくしました。ご{来館|らいかん}のたびに、{違|ちが}った{景色|けしき}をお{楽|たの}しみください。',
      'お{散歩|さんぽ}のついでに、{近|ちか}くの{朝市|あさいち}にもお{立ち寄|たちよ}りください。{地元|じもと}の{野菜|やさい}や{果物|くだもの}が{並|なら}んでいます。なお、{館内|かんない}の{地図|ちず}のとおりに{進|すす}むと、{朝市|あさいち}への{近道|ちかみち}があります。',
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
      '{去年|きょねん}の{試験|しけん}では、{時間|じかん}が{足|た}りなくて{失敗|しっぱい}した。{最後|さいご}の{読解|どっかい}{問題|もんだい}に{時間|じかん}をかけすぎたばかりに、{聴解|ちょうかい}の{準備|じゅんび}ができなかったのだ。',
      '{今年|ことし}は{友達|ともだち}のアドバイスのおかげで、{勉強|べんきょう}のやり{方|かた}を{変|か}えた。{毎日|まいにち}{決|き}まった{時間|じかん}に{模擬|もぎ}{試験|しけん}を{解|と}くことにしたのだ。',
      'それでも、{仕事|しごと}が{忙|いそが}しかったせいで、{勉強|べんきょう}できない{日|ひ}も{多|おお}かった。そんな{日|ひ}は、{通勤|つうきん}{電車|でんしゃ}の{中|なか}で{単語|たんご}を{覚|おぼ}えた。',
      '{結果|けっか}は{合格|ごうかく}だった。{先生|せんせい}は「{毎日|まいにち}{続|つづ}けたからこそ、{合格|ごうかく}できたんですよ」と{言|い}ってくれた。たくさん{失敗|しっぱい}した{経験|けいけん}があるだけに、{今回|こんかい}の{合格|ごうかく}は{本当|ほんとう}にうれしかった。',
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
      'マンション{住民|じゅうみん}の{皆様|みなさま}へ。{最近|さいきん}、ペットに{関|かん}する{苦情|くじょう}が{増|ふ}えています。{管理|かんり}{組合|くみあい}の{許可|きょか}がないかぎり、ペットを{飼|か}うことはできません。',
      '{許可|きょか}を{受|う}けるには、{申込|もうしこみ}{書|しょ}と{写真|しゃしん}さえ{提出|ていしゅつ}すれば{大丈夫|だいじょうぶ}です。ただし、{他|ほか}の{住民|じゅうみん}の{同意|どうい}を{得|え}ないことには、{許可|きょか}は{出|だ}せません。',
      'もしペットが{原因|げんいん}で{問題|もんだい}が{起|お}きたとしたら、{飼い主|かいぬし}が{責任|せきにん}を{持|も}って{対応|たいおう}してください。たとえ{小|ちい}さな{犬|いぬ}でも、{夜|よる}に{鳴|な}き{続|つづ}けると{近所|きんじょ}の{迷惑|めいわく}になります。',
      'ルールを{守|まも}らない{場合|ばあい}、ペットを{手放|てばな}していただくこともあります。もっと{早|はや}くルールを{確認|かくにん}すれば、トラブルにならなかったのに、という{声|こえ}も{聞|き}きます。ご{協力|きょうりょく}をお{願|ねが}いします。',
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
