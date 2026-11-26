import type { CompactN3Rule } from './extraLessonsN3';

/**
 * Shin Kanzen N3 Ngữ pháp — 第1部 文の文法1, 3課〜7課: new points (explanations/examples written for this app).
 * Keys are the app chapter ids (P1-03 …).
 */
export const SKZ_BOOK_P1A: Record<string, CompactN3Rule[]> = {
  'P1-03': [
    [
      'KURAI-HODO', '～くらいだ・～ぐらいだ・～ほどだ (Đến mức...)', 'くらい・ほど',
      'Đến mức ~ / Khoảng ~',
      'Dùng ví dụ cụ thể để diễn tả mức độ của trạng thái. 〜ほど trang trọng hơn và mức độ thường cao hơn.',
      'Vる/Vない/Aい/Aな/N + くらい(だ)・ほど(だ)', 'Cũng dùng để chỉ lượng xấp xỉ: 一時間ぐらい.',
      ['Thể thường + くらいだ', 'Thể thường + ほどだ'],
      '足が痛くて、もう歩けないくらいだ。', 'Chân đau đến mức không đi nổi nữa.',
      [
        ['涙が出るほど笑った。', 'なみだがでるほどわらった。', 'Cười đến chảy nước mắt.', 'ほど'],
        ['今日は寒くて、手が動かないくらいだ。', 'きょうはさむくて、てがうごかないくらいだ。', 'Hôm nay lạnh đến mức tay cứng đờ.', 'くらいだ'],
        ['声が出ないほど驚いた。', 'こえがでないほどおどろいた。', 'Ngạc nhiên đến mức không thốt nên lời.', 'ほど'],
      ],
    ],
    [
      'KURAI-WANAI', '～くらい…はない・～ほど…はない (Không có gì... bằng)', 'ほど…はない',
      'Không có ~ nào ... bằng (là nhất)',
      'So sánh nhất theo cảm nhận chủ quan của người nói: ~ là nhất.',
      'N + くらい/ほど + N + はない', 'Thường dùng cho cảm xúc, kinh nghiệm cá nhân.',
      ['N + ほど + N + はない', 'Vる + くらい + N + はない'],
      '母の料理ほどおいしいものはない。', 'Không có gì ngon bằng món mẹ nấu.',
      [
        ['富士山ほど美しい山はないと思う。', 'ふじさんほどうつくしいやまはないとおもう。', 'Tôi nghĩ không có núi nào đẹp bằng Phú Sĩ.', 'ほど'],
        ['一人で食事をするくらい寂しいことはない。', 'ひとりでしょくじをするくらいさびしいことはない。', 'Không gì buồn bằng ăn cơm một mình.', 'くらい'],
        ['彼ほど優しい人はいない。', 'かれほどやさしいひとはいない。', 'Không ai hiền bằng anh ấy.', 'ほど'],
      ],
    ],
    [
      'KURAINARA', '～くらいなら・～ぐらいなら (Nếu phải... thì thà...)', 'くらいなら',
      'Nếu phải ~ (điều không muốn) thì thà ~ còn hơn',
      'Vế trước là việc người nói rất không muốn; vế sau là lựa chọn tốt hơn.',
      'Vる + くらいなら', 'Vế sau thường là 〜ほうがいい・〜ほうがましだ.',
      ['Vる + くらいなら'],
      'あんな会社で働くくらいなら、自分で店を開いたほうがいい。', 'Nếu phải làm ở công ty như thế thì thà tự mở cửa hàng còn hơn.',
      [
        ['途中でやめるくらいなら、最初からやらないほうがいい。', 'とちゅうでやめるくらいなら、さいしょからやらないほうがいい。', 'Nếu bỏ giữa chừng thì thà đừng làm từ đầu.', 'くらいなら'],
        ['満員電車に乗るぐらいなら、歩いて行く。', 'まんいんでんしゃにのるぐらいなら、あるいていく。', 'Phải đi tàu chật cứng thì thà đi bộ.', 'ぐらいなら'],
        ['うそをつくくらいなら、黙っていたほうがましだ。', 'うそをつくくらいなら、だまっていたほうがましだ。', 'Nói dối thì thà im lặng còn hơn.', 'くらいなら'],
      ],
    ],
    [
      'NIKAGIRU', '～に限る (Là nhất, tốt nhất là)', 'にかぎる',
      '~ là nhất / tốt nhất là ~',
      'Ý kiến chủ quan của người nói: trong hoàn cảnh đó, ~ là lựa chọn tốt nhất.',
      'N / Vる / Vない + に限る', 'Không dùng cho sự thật khách quan.',
      ['N + に限る', 'Vる + に限る'],
      '暑い日は冷たいビールに限る。', 'Ngày nóng thì bia lạnh là nhất.',
      [
        ['疲れたときは早く寝るに限る。', 'つかれたときははやくねるにかぎる。', 'Mệt thì ngủ sớm là tốt nhất.', 'に限る'],
        ['旅行は平日に限る。人が少ないから。', 'りょこうはへいじつにかぎる。ひとがすくないから。', 'Du lịch thì ngày thường là nhất, vì ít người.', 'に限る'],
        ['危ない所には近づかないに限る。', 'あぶないところにはちかづかないにかぎる。', 'Tốt nhất là đừng đến gần chỗ nguy hiểm.', 'に限る'],
      ],
    ],
  ],
  'P1-04': [
    [
      'HANMEN', '～反面 (Mặt khác, ngược lại)', 'はんめん',
      'Một mặt ~, mặt khác lại ~',
      'Một sự vật có hai mặt trái ngược nhau.',
      'V/A(thường) + 反面 · Aな/Nである + 反面', 'Cùng một chủ thể, hai tính chất đối lập.',
      ['Thể thường + 反面'],
      'スマホは便利な反面、使いすぎると目に悪い。', 'Smartphone tiện lợi, mặt khác dùng nhiều lại hại mắt.',
      [
        ['一人暮らしは自由な反面、寂しいこともある。', 'ひとりぐらしはじゆうなはんめん、さびしいこともある。', 'Sống một mình tự do, nhưng mặt khác cũng có lúc cô đơn.', '反面'],
        ['この薬はよく効く反面、副作用も強い。', 'このくすりはよくきくはんめん、ふくさようもつよい。', 'Thuốc này hiệu quả, ngược lại tác dụng phụ cũng mạnh.', '反面'],
        ['都会は便利である反面、物価が高い。', 'とかいはべんりであるはんめん、ぶっかがたかい。', 'Thành phố tiện lợi, mặt khác vật giá cao.', '反面'],
      ],
    ],
    [
      'IPPOUDE', '～一方(で) (Trong khi đó, mặt khác)', 'いっぽうで',
      'Trong khi ~ thì mặt khác ~',
      'Đối chiếu hai sự việc/hai mặt khác nhau, hoặc làm song song hai việc.',
      'V/A(thường) + 一方(で) · Nである + 一方(で)', 'Khác 〜一方だ (ngày càng).',
      ['Thể thường + 一方(で)'],
      '都会の人口は増える一方で、田舎の人口は減っている。', 'Dân số thành phố tăng, trong khi dân số nông thôn giảm.',
      [
        ['彼は会社で働く一方で、夜は大学で勉強している。', 'かれはかいしゃではたらくいっぽうで、よるはだいがくでべんきょうしている。', 'Anh ấy vừa làm ở công ty, mặt khác tối lại học đại học.', '一方で'],
        ['輸出が増えた一方、輸入は減った。', 'ゆしゅつがふえたいっぽう、ゆにゅうはへった。', 'Xuất khẩu tăng, trong khi nhập khẩu giảm.', '一方'],
        ['厳しい一方で、優しいところもある先生だ。', 'きびしいいっぽうで、やさしいところもあるせんせいだ。', 'Thầy nghiêm khắc nhưng mặt khác cũng có chỗ hiền.', '一方で'],
      ],
    ],
    [
      'TOIUYORI', '～というより (Nói là... thì đúng hơn là...)', 'というより',
      'Thay vì nói là ~ thì nói là ~ đúng hơn',
      'Đưa ra cách diễn đạt chính xác hơn cho sự việc.',
      'V/A/N(thường) + というより', 'Hay đi với むしろ: 〜というより、むしろ〜.',
      ['Thể thường + というより'],
      '今日は暖かいというより、暑い。', 'Hôm nay nói là ấm thì đúng hơn là nóng.',
      [
        ['彼は友達というより、家族のような存在だ。', 'かれはともだちというより、かぞくのようなそんざいだ。', 'Anh ấy không hẳn là bạn mà như người nhà.', 'というより'],
        ['この料理は辛いというより、痛い。', 'このりょうりはからいというより、いたい。', 'Món này không phải cay mà là rát.', 'というより'],
        ['怒っているというより、悲しんでいるように見えた。', 'おこっているというより、かなしんでいるようにみえた。', 'Trông không phải đang giận mà đúng hơn là đang buồn.', 'というより'],
      ],
    ],
    [
      'KAWARINI', '～かわりに (Thay vì / Đổi lại)', 'かわりに',
      '(1) Thay cho ~ (2) Đổi lại ~ (3) Bù lại',
      'Nghĩa 1: thay thế người/vật. Nghĩa 2: làm việc này để đổi lấy việc kia. Nghĩa 3: có mặt tốt bù cho mặt xấu.',
      'Nの / Vる / Vた + かわりに', 'Ví dụ: 英語を教えるかわりに日本語を教えてもらう.',
      ['Nの + かわりに', 'Vる + かわりに'],
      '部長のかわりに、私が会議に出ます。', 'Tôi dự họp thay trưởng phòng.',
      [
        ['料理を作ってもらうかわりに、皿を洗います。', 'りょうりをつくってもらうかわりに、さらをあらいます。', 'Đổi lại việc được nấu cho, tôi sẽ rửa bát.', 'かわりに'],
        ['この店は安いかわりに、サービスがよくない。', 'このみせはやすいかわりに、サービスがよくない。', 'Quán này rẻ nhưng bù lại phục vụ không tốt.', 'かわりに'],
        ['ペンのかわりに、鉛筆を使ってもいいですか。', 'ペンのかわりに、えんぴつをつかってもいいですか。', 'Dùng bút chì thay bút bi được không?', 'かわりに'],
      ],
    ],
  ],
  'P1-05': [
    [
      'NIYOTTE-GEN', '～によって・～による (Do / Bởi — nguyên nhân)', 'によって',
      'Do ~ (nguyên nhân dẫn tới kết quả)',
      'Nêu nguyên nhân của một sự việc, văn phong trang trọng (tin tức, báo cáo).',
      'N + によって / N + による + N', 'Nghĩa khác: によって = tùy theo (2課), bởi (bị động), bằng (phương tiện).',
      ['N + によって', 'N + による + N'],
      '大雨によって、道路が通れなくなった。', 'Do mưa lớn, đường không đi được.',
      [
        ['地震による被害は大きかった。', 'じしんによるひがいはおおきかった。', 'Thiệt hại do động đất rất lớn.', 'による'],
        ['不注意によって、事故が起きた。', 'ふちゅういによって、じこがおきた。', 'Tai nạn xảy ra do bất cẩn.', 'によって'],
        ['台風による停電が続いている。', 'たいふうによるていでんがつづいている。', 'Mất điện do bão đang kéo dài.', 'による'],
      ],
    ],
    [
      'NODAKARA', '～のだから (Vì đã... nên (đương nhiên))', 'のだから',
      'Vì (rõ ràng là) ~ nên',
      'Nêu lý do mà cả người nói và người nghe đều biết, vế sau thường là ý kiến, yêu cầu, trách móc.',
      'V/A(thường) + のだから · Nな/Aな + のだから', 'Văn nói: 〜んだから.',
      ['Thể thường + のだから'],
      'もう大人なのだから、自分で決めなさい。', 'Đã là người lớn rồi thì tự quyết đi.',
      [
        ['せっかく来たのだから、ゆっくりしていってください。', 'せっかくきたのだから、ゆっくりしていってください。', 'Đã mất công đến thì cứ thong thả nhé.', 'のだから'],
        ['約束したんだから、守らなきゃ。', 'やくそくしたんだから、まもらなきゃ。', 'Đã hứa rồi thì phải giữ.', 'んだから'],
        ['毎日練習しているのだから、きっと上手になる。', 'まいにちれんしゅうしているのだから、きっとじょうずになる。', 'Ngày nào cũng luyện thì chắc chắn sẽ giỏi.', 'のだから'],
      ],
    ],
  ],
  'P1-06': [
    [
      'NONARA', '～(の)なら (Nếu (đúng là) ~ thì)', 'なら',
      'Nếu ~ (như anh nói / như vậy) thì',
      'Tiếp nhận thông tin từ người khác hoặc giả định, rồi đưa ra lời khuyên, ý kiến.',
      'V/A(thường) + (の)なら · N/Aな + なら', 'Vế sau có thể xảy ra trước vế trước: 旅行に行くなら、カメラを買う.',
      ['Thể thường + (の)なら', 'N + なら'],
      '日本へ行くなら、京都がおすすめですよ。', 'Nếu đi Nhật thì tôi khuyên Kyoto.',
      [
        ['体の具合が悪いのなら、早く帰ったほうがいい。', 'からだのぐあいがわるいのなら、はやくかえったほうがいい。', 'Nếu không khỏe thì nên về sớm.', 'のなら'],
        ['パソコンを買うなら、軽いのがいいですよ。', 'パソコンをかうなら、かるいのがいいですよ。', 'Nếu mua máy tính thì loại nhẹ là được đấy.', 'なら'],
        ['そんなに嫌なら、やめればいい。', 'そんなにいやなら、やめればいい。', 'Nếu ghét đến thế thì bỏ đi.', 'なら'],
      ],
    ],
    [
      'TEWA', '～ては・～(の)では (Nếu ~ thì (kết quả xấu))', 'ては',
      'Nếu cứ ~ thì (sẽ không được / kết quả xấu)',
      'Điều kiện dẫn đến kết quả không mong muốn; vế sau thường mang ý tiêu cực.',
      'Vて + は · Aくて + は · N/Aな + では', 'Văn nói: 〜ちゃ・〜じゃ.',
      ['Vて + は', 'N + では'],
      'そんなに食べては、太りますよ。', 'Ăn nhiều thế thì béo đấy.',
      [
        ['毎日遅刻しては、信用されなくなる。', 'まいにちちこくしては、しんようされなくなる。', 'Ngày nào cũng muộn thì sẽ mất lòng tin.', 'ては'],
        ['こんなに寒くては、外で遊べない。', 'こんなにさむくては、そとであそべない。', 'Lạnh thế này thì không chơi ngoài trời được.', 'ては'],
        ['このやり方では、間に合わない。', 'このやりかたでは、まにあわない。', 'Làm theo cách này thì không kịp.', 'では'],
      ],
    ],
  ],
  'P1-07': [
    [
      'TOIUKOTODA', '～ということだ・～とのことだ (Nghe nói / Được biết)', 'ということだ',
      'Nghe nói ~ / Có tin rằng ~',
      'Truyền đạt lại thông tin nghe được. 〜とのことだ trang trọng, hay dùng trong thư, lời nhắn.',
      'Thể thường + ということだ / とのことだ', 'Có thể kèm nguồn tin: 〜によると、〜ということだ.',
      ['Thể thường + ということだ', 'Thể thường + とのことだ'],
      '天気予報によると、明日は雪が降るということだ。', 'Theo dự báo thì mai có tuyết.',
      [
        ['田中さんから電話があって、少し遅れるとのことです。', 'たなかさんからでんわがあって、すこしおくれるとのことです。', 'Anh Tanaka gọi điện, nói là sẽ đến muộn một chút.', 'とのこと'],
        ['新しい駅は来年完成するということだ。', 'あたらしいえきはらいねんかんせいするということだ。', 'Nghe nói nhà ga mới năm sau hoàn thành.', 'ということだ'],
        ['先生は来週から出張だとのことです。', 'せんせいはらいしゅうからしゅっちょうだとのことです。', 'Được biết thầy đi công tác từ tuần sau.', 'とのこと'],
      ],
    ],
    [
      'TOIWARETEIRU', '～と言われている (Người ta nói rằng / Được cho là)', 'といわれている',
      'Người ta nói / Được cho là ~',
      'Nêu ý kiến hoặc truyền thuyết được nhiều người tin, nói chung.',
      'Thể thường + と言われている', 'Không rõ chủ thể cụ thể; mang tính phổ biến.',
      ['Thể thường + と言われている'],
      'この寺は千年前に建てられたと言われている。', 'Ngôi chùa này được cho là xây cách đây nghìn năm.',
      [
        ['緑茶は体にいいと言われている。', 'りょくちゃはからだにいいといわれている。', 'Trà xanh được cho là tốt cho sức khỏe.', 'と言われている'],
        ['日本人は時間に厳しいと言われている。', 'にほんじんはじかんにきびしいといわれている。', 'Người ta nói người Nhật rất đúng giờ.', 'と言われている'],
        ['この池に願いをかけるとかなうと言われている。', 'このいけにねがいをかけるとかなうといわれている。', 'Người ta nói ước ở hồ này thì thành.', 'と言われている'],
      ],
    ],
    [
      'TOKA', '～とか (Nghe đâu là / Hình như nghe nói)', 'とか',
      'Nghe đâu ~ (truyền đạt không chắc chắn)',
      'Truyền đạt thông tin nghe được một cách mơ hồ, không khẳng định.',
      'Thể thường + とか', 'Thường ở cuối câu: 〜とか。/〜とかで.',
      ['Thể thường + とか'],
      '山田さんは来月結婚するとか。', 'Nghe đâu tháng sau anh Yamada cưới.',
      [
        ['駅前に新しい店ができたとか。', 'えきまえにあたらしいみせができたとか。', 'Nghe đâu trước ga có cửa hàng mới.', 'とか'],
        ['今年の冬は暖かいとか。', 'ことしのふゆはあたたかいとか。', 'Nghe đâu mùa đông năm nay ấm.', 'とか'],
        ['風邪をひいたとかで、彼は休んでいる。', 'かぜをひいたとかで、かれはやすんでいる。', 'Nghe đâu bị cảm nên anh ấy nghỉ.', 'とかで'],
      ],
    ],
    [
      'TTE', '～って (Nghe nói / Nghe bảo — văn nói)', 'って',
      '(Nghe) nói là ~ / ~ là (văn nói)',
      'Dạng thân mật của と言っていた・そうだ・という. Dùng nhiều trong hội thoại.',
      'Thể thường + って', 'Cũng dùng để nêu chủ đề: 〜って何？ = 〜というのは何？',
      ['Thể thường + って'],
      '明日、雨だって。', 'Nghe nói mai mưa đấy.',
      [
        ['田中さん、今日休むって。', 'たなかさん、きょうやすむって。', 'Tanaka bảo hôm nay nghỉ.', 'って'],
        ['あの店のケーキ、すごくおいしいんだって。', 'あのみせのケーキ、すごくおいしいんだって。', 'Nghe nói bánh quán đó ngon lắm.', 'って'],
        ['「積ん読」って、どういう意味？', 'つんどくって、どういういみ？', '"Tsundoku" là nghĩa gì vậy?', 'って'],
      ],
    ],
    [
      'TOIU', '～という (Nghe nói / Gọi là)', 'という',
      '(1) Nghe nói, tương truyền (2) Có tên là',
      'Nghĩa 1: truyền đạt truyền thuyết, lời kể (văn viết). Nghĩa 2: N1 という N2 = N2 tên là N1.',
      'Thể thường + という · N1 + という + N2', 'Nghĩa 1 hay dùng trong truyện cổ, tin tức.',
      ['Thể thường + という', 'N + という + N'],
      '昔、この山には鬼が住んでいたという。', 'Tương truyền ngày xưa trên núi này có quỷ ở.',
      [
        ['「さくら」という店を知っていますか。', 'さくらというみせをしっていますか。', 'Bạn biết quán tên "Sakura" không?', 'という'],
        ['この祭りは三百年前から続いているという。', 'このまつりはさんびゃくねんまえからつづいているという。', 'Nghe nói lễ hội này có từ 300 năm trước.', 'という'],
        ['山田という人から電話がありました。', 'やまだというひとからでんわがありました。', 'Có điện thoại từ người tên Yamada.', 'という'],
      ],
    ],
  ],
};
