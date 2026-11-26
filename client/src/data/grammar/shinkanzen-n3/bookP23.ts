import type { CompactN3Rule } from './extraLessonsN3';

/** Shin Kanzen N3 Ngữ pháp — 第2部 文の文法2 & 第3部 文章の文法 (explanations/examples written for this app). */
export const SKZ_BOOK_P23: Record<string, CompactN3Rule[]> = {
  'P2-01': [
    [
      'INYOU', '文の組み立て① 引用 (Trích dẫn: 〜と言う・〜ように言う・〜か聞く)', 'いんよう',
      'Lắp ghép câu trích dẫn trực tiếp / gián tiếp',
      'Trích trực tiếp: 「…」と言う. Gián tiếp: thể thường + と言う/思う; yêu cầu: 〜ように言う; câu hỏi: 〜か(どうか)聞く/分からない.',
      '「câu」と + V · Thể thường + と + V · 〜か(どうか) + V', 'Câu hỏi có từ để hỏi: 何時に来るか聞く; không có: 来るかどうか聞く.',
      ['Thể thường + と言う', '〜かどうか + 分からない'],
      '彼は明日来ないと言っていた。', 'Anh ấy bảo mai không đến.',
      [
        ['会議は何時に始まるか、確認してください。', 'かいぎはなんじにはじまるか、かくにんしてください。', 'Hãy xác nhận xem cuộc họp bắt đầu lúc mấy giờ.', 'か'],
        ['彼女が来るかどうか、まだ分からない。', 'かのじょがくるかどうか、まだわからない。', 'Chưa biết cô ấy có đến hay không.', 'かどうか'],
        ['先生は「明日はテストです」と言った。', 'せんせいはあしたはテストですといった。', 'Thầy nói: "Ngày mai có kiểm tra".', 'と言った'],
      ],
    ],
  ],
  'P2-02': [
    [
      'MEISHI-SETSUMEI', '文の組み立て② 名詞の説明 (Mệnh đề bổ nghĩa danh từ)', 'めいしのせつめい',
      'Dùng cả một câu để bổ nghĩa cho danh từ',
      'Câu bổ nghĩa đứng trước danh từ, dùng thể thường; chủ ngữ trong mệnh đề dùng が (hoặc の). Câu dài cần tìm danh từ trung tâm.',
      'Thể thường (Nな→Nの/である) + N', 'が trong mệnh đề có thể đổi thành の: 母の作った料理.',
      ['Thể thường + N'],
      'これは母が作った料理です。', 'Đây là món mẹ tôi nấu.',
      [
        ['昨日駅で会った人は、私の先生だった。', 'きのうえきであったひとは、わたしのせんせいだった。', 'Người gặp ở ga hôm qua là thầy tôi.', 'た人'],
        ['日本語が上手な友達に手伝ってもらった。', 'にほんごがじょうずなともだちにてつだってもらった。', 'Tôi được người bạn giỏi tiếng Nhật giúp.', 'な友達'],
        ['彼が書いた小説を読んだことがありますか。', 'かれがかいたしょうせつをよんだことがありますか。', 'Bạn đã đọc tiểu thuyết anh ấy viết chưa?', 'た小説'],
      ],
    ],
  ],
  'P2-03': [
    [
      'TOIU-TOITTA', '文の組み立て③ 「〜という・〜といった」 (Gọi là / Chẳng hạn như)', 'という・といった',
      'N1 という N2: N2 có tên/nội dung N1 · N1 といった N2: N2 chẳng hạn như N1',
      '〜という + N dùng để giải thích nội dung (〜という意見・〜というニュース). 〜といった liệt kê ví dụ tiêu biểu.',
      'Thể thường/N + という + N · N、N + といった + N', '〜ということ: biến câu thành danh từ.',
      ['〜という + N', 'N、N + といった + N'],
      '来年から料金が上がるというニュースを見た。', 'Tôi xem tin giá sẽ tăng từ năm sau.',
      [
        ['寿司や天ぷらといった日本料理が好きだ。', 'すしやてんぷらといったにほんりょうりがすきだ。', 'Tôi thích món Nhật như sushi, tempura.', 'といった'],
        ['「さくら」という名前の店を探している。', 'さくらというなまえのみせをさがしている。', 'Tôi đang tìm quán tên "Sakura".', 'という'],
        ['彼が会社を辞めるということを、だれも知らなかった。', 'かれがかいしゃをやめるということを、だれもしらなかった。', 'Không ai biết việc anh ấy nghỉ việc.', 'ということ'],
      ],
    ],
  ],
  'P2-04': [
    [
      'KIMATTA-KATACHI', '文の組み立て④ 決まった形 (Mẫu cố định: 〜ことになっている・〜ことがある)', 'きまったかたち',
      'Một số khung câu cố định thường gặp',
      '〜ことになっている: quy định, lịch đã định sẵn. 〜ことがある: thỉnh thoảng có khi ~. 〜ことができる / 〜ことはない (không cần). Nhận ra khung để lắp đúng trật tự câu.',
      'Vる + ことになっている · Vる + ことがある', 'Hay xuất hiện trong dạng bài ★ sắp xếp câu.',
      ['Vる + ことになっている', 'Vる + ことがある'],
      'この寮では、夜十時以降は外出しないことになっている。', 'Ký túc xá này quy định sau 10 giờ tối không ra ngoài.',
      [
        ['忙しいと、昼ごはんを食べないことがある。', 'いそがしいと、ひるごはんをたべないことがある。', 'Khi bận đôi khi tôi không ăn trưa.', 'ことがある'],
        ['会議は毎週月曜日に行うことになっている。', 'かいぎはまいしゅうげつようびにおこなうことになっている。', 'Cuộc họp được định tổ chức thứ Hai hằng tuần.', 'ことになっている'],
        ['そんなに急ぐことはないよ。', 'そんなにいそぐことはないよ。', 'Không cần vội thế đâu.', 'ことはない'],
      ],
    ],
  ],
  'P3-01': [
    [
      'HAJIME-OWARI', '文の始めと終わりの対応 (Đầu câu – cuối câu tương ứng)', 'たいおう',
      'Đầu câu quyết định cách kết thúc câu',
      'Một số cách mở đầu đòi hỏi cuối câu tương ứng: 〜のは〜からだ, なぜなら〜からだ, 私の夢は〜ことだ, 〜理由は〜からだ. Đọc đầu câu để chọn đuôi câu đúng.',
      '〜のは + 〜からだ · 〜は + 〜ことだ', 'Lỗi thường gặp: 私の夢は医者になりたいです (sai) → 医者になることです.',
      ['〜のは〜からだ', '〜は〜ことだ'],
      '遅れたのは、電車が止まったからです。', 'Sở dĩ đến muộn là vì tàu dừng.',
      [
        ['私の夢は、自分の店を開くことです。', 'わたしのゆめは、じぶんのみせをひらくことです。', 'Ước mơ của tôi là mở cửa hàng riêng.', 'ことです'],
        ['日本に来た理由は、アニメが好きだからだ。', 'にほんにきたりゆうは、アニメがすきだからだ。', 'Lý do đến Nhật là vì thích anime.', 'からだ'],
        ['参加しない。なぜなら、その日は仕事があるからだ。', 'さんかしない。なぜなら、そのひはしごとがあるからだ。', 'Tôi không tham gia. Bởi vì hôm đó có việc.', 'なぜなら〜からだ'],
      ],
    ],
  ],
  'P3-02': [
    [
      'JISEI-TEIRU', '時制・〜ている (Thì của câu và 〜ている)', 'じせい',
      'Chọn đúng thì (る/た) và 〜ている trong văn bản',
      'Trong mệnh đề phụ, thì được tính theo động từ chính: 日本に来る前に (chưa đến), 来た時 (đã đến). 〜ている: đang diễn ra, trạng thái kết quả, thói quen, kinh nghiệm.',
      'Vる前に · Vた後で · Vた時 · Vている', 'Kết quả: 窓が開いている (đang mở sẵn).',
      ['Vる + 前に', 'Vた + 時', 'Vている'],
      '日本に来る前に、少し日本語を勉強した。', 'Trước khi sang Nhật, tôi đã học chút tiếng Nhật.',
      [
        ['家に帰った時、母は料理をしていた。', 'いえにかえったとき、はははりょうりをしていた。', 'Lúc tôi về nhà, mẹ đang nấu ăn.', 'た時'],
        ['彼は毎朝ジョギングをしている。', 'かれはまいあさジョギングをしている。', 'Anh ấy chạy bộ mỗi sáng.', 'ている'],
        ['もう駅に着いている。', 'もうえきについている。', 'Đã đến ga rồi (đang ở ga).', 'ている'],
      ],
    ],
  ],
  'P3-03': [
    [
      'TADOUSHI-JIDOUSHI', '他動詞・自動詞 (Tha động từ / Tự động từ)', 'たどうし・じどうし',
      'Chọn tự/tha động từ theo góc nhìn người nói',
      'Tha động từ (〜を開ける) nhấn mạnh người làm; tự động từ (〜が開く) nhấn mạnh kết quả/trạng thái. 〜てある (tha) = ai đó đã làm sẵn; 〜ている (tự) = trạng thái.',
      'Nを + tha động từ · Nが + tự động từ', 'Cặp thường gặp: 開ける/開く, 閉める/閉まる, つける/つく, 消す/消える, 落とす/落ちる.',
      ['Nを + V(tha)', 'Nが + V(tự)'],
      '風でドアが開いた。', 'Cửa mở do gió.',
      [
        ['電気を消してから寝てください。', 'でんきをけしてからねてください。', 'Hãy tắt điện rồi đi ngủ.', 'を消して'],
        ['財布を落としてしまった。', 'さいふをおとしてしまった。', 'Tôi lỡ đánh rơi ví.', 'を落として'],
        ['窓が閉まっている。だれかが閉めたのだろう。', 'まどがしまっている。だれかがしめたのだろう。', 'Cửa sổ đang đóng. Chắc ai đó đã đóng.', 'が閉まって'],
      ],
    ],
  ],
  'P3-04': [
    [
      'TEKURU-TEIKU', '〜てくる・〜ていく (Hướng về / Rời xa người nói)', 'てくる・ていく',
      'Giữ góc nhìn người nói: tiến lại gần (てくる) / đi xa, tiếp diễn về sau (ていく)',
      'Không gian: 走ってくる (chạy lại), 持っていく (mang đi). Thời gian: 〜てきた = thay đổi đến hiện tại; 〜ていく = thay đổi từ nay về sau.',
      'Vて + くる · Vて + いく', 'Biến đổi: 寒くなってきた (đã bắt đầu lạnh), 増えていく (sẽ tăng dần).',
      ['Vて + くる', 'Vて + いく'],
      'だんだん寒くなってきましたね。', 'Trời bắt đầu lạnh dần rồi nhỉ.',
      [
        ['これからも日本語を勉強していくつもりです。', 'これからもにほんごをべんきょうしていくつもりです。', 'Từ nay tôi vẫn định tiếp tục học tiếng Nhật.', 'ていく'],
        ['向こうから犬が走ってきた。', 'むこうからいぬがはしってきた。', 'Con chó chạy lại từ phía bên kia.', 'てきた'],
        ['この町の人口は減っていくだろう。', 'このまちのじんこうはへっていくだろう。', 'Dân số thị trấn này chắc sẽ giảm dần.', 'ていく'],
      ],
    ],
  ],
  'P3-05': [
    [
      'UKEMI-SHIEKI', '受身・使役・使役受身 (Bị động / Sai khiến / Bị bắt làm)', 'うけみ・しえき',
      'Giữ chủ ngữ thống nhất trong văn bản',
      'Bị động (〜られる): chủ ngữ chịu tác động. Sai khiến (〜させる): bắt/cho ai làm. Sai khiến bị động (〜させられる): bị bắt làm. Chọn dạng sao cho chủ ngữ của cả đoạn không đổi.',
      'V(ら)れる · V(さ)せる · V(さ)せられる', 'Bị động gây phiền: 雨に降られた.',
      ['V(ら)れる', 'V(さ)せる', 'V(さ)せられる'],
      '私は母に部屋を掃除させられた。', 'Tôi bị mẹ bắt dọn phòng.',
      [
        ['弟に大切なケーキを食べられた。', 'おとうとにたいせつなケーキをたべられた。', 'Bánh quan trọng bị em trai ăn mất.', 'られた'],
        ['先生は学生に作文を書かせた。', 'せんせいはがくせいにさくぶんをかかせた。', 'Thầy bắt học sinh viết văn.', 'させた'],
        ['帰りに雨に降られて、びしょびしょになった。', 'かえりにあめにふられて、びしょびしょになった。', 'Trên đường về bị mưa, ướt sũng.', 'られて'],
      ],
    ],
  ],
  'P3-06': [
    [
      'AGERU-MORAU-KURERU', '〜てあげる・〜てもらう・〜てくれる (Cho – nhận hành động)', 'じゅじゅ',
      'Thể hiện ai làm cho ai, giữ góc nhìn người nói',
      '〜てあげる: mình/người phe mình làm cho người khác. 〜てもらう: mình nhờ/được người khác làm cho. 〜てくれる: người khác làm cho mình (biết ơn).',
      'Vて + あげる / もらう / くれる', 'Lịch sự: さしあげる・いただく・くださる.',
      ['Vて + あげる', 'Vて + もらう', 'Vて + くれる'],
      '友達が駅まで送ってくれた。', 'Bạn đã tiễn tôi ra ga.',
      [
        ['妹に宿題を手伝ってあげた。', 'いもうとにしゅくだいをてつだってあげた。', 'Tôi giúp em gái làm bài tập.', 'てあげた'],
        ['先生に作文を直していただいた。', 'せんせいにさくぶんをなおしていただいた。', 'Tôi được thầy sửa bài văn.', 'ていただいた'],
        ['隣の人が荷物を持ってくれました。', 'となりのひとがにもつをもってくれました。', 'Người bên cạnh đã xách đồ giúp tôi.', 'てくれました'],
      ],
    ],
  ],
  'P3-07': [
    [
      'KOSOA', 'こ・そ・あ (Từ chỉ thị trong văn bản)', 'こそあ',
      'これ/それ/あれ trong đoạn văn chỉ cái gì',
      'Trong văn viết: そ chỉ điều vừa nói trước đó; こ chỉ điều sắp nói hoặc điều người viết đang nhấn mạnh; あ chỉ điều cả hai cùng biết (hội thoại).',
      'こ・そ・あ + N / これ・それ・あれ', 'Khi làm bài: tìm câu ngay trước そ để biết nó chỉ gì.',
      ['その + N', 'この + N'],
      '昨日、新しい店に行った。その店はとても安かった。', 'Hôm qua tôi đi quán mới. Quán đó rất rẻ.',
      [
        ['次のことに注意してください。これは大切です。', 'つぎのことにちゅういしてください。これはたいせつです。', 'Hãy chú ý điều sau. Điều này quan trọng.', 'これ'],
        ['A「先週の映画、面白かったね。」B「うん、あれはよかった。」', 'せんしゅうのえいが、おもしろかったね。うん、あれはよかった。', 'A: Phim tuần trước hay nhỉ. B: Ừ, phim đó hay.', 'あれ'],
        ['毎日運動をしている。そのおかげで元気だ。', 'まいにちうんどうをしている。そのおかげでげんきだ。', 'Ngày nào cũng tập thể dục. Nhờ vậy mà khỏe.', 'その'],
      ],
    ],
  ],
  'P3-08': [
    [
      'WA-GA', 'は・が (Phân biệt は và が)', 'は・が',
      'は: chủ đề, đối chiếu · が: chủ ngữ mới, nhấn mạnh, trong mệnh đề phụ',
      'Thông tin mới dùng が, đã biết dùng は. Trong mệnh đề phụ (〜とき・〜のは・bổ nghĩa danh từ) dùng が. は còn dùng để đối chiếu: 肉は食べるが、魚は食べない.',
      'N + は · N + が', 'Câu hỏi với từ để hỏi làm chủ ngữ: だれが来ましたか.',
      ['N + は + …', 'N + が + …'],
      '昔々、おじいさんがいました。おじいさんは山へ行きました。', 'Ngày xửa ngày xưa có một ông lão. Ông lão đi lên núi.',
      [
        ['私が子どものころ、この辺は畑だった。', 'わたしがこどものころ、このへんははたけだった。', 'Hồi tôi còn nhỏ, vùng này là ruộng.', 'が'],
        ['肉は食べますが、魚は食べません。', 'にくはたべますが、さかなはたべません。', 'Thịt thì ăn, cá thì không.', 'は'],
        ['だれがこの絵をかいたのですか。', 'だれがこのえをかいたのですか。', 'Ai đã vẽ bức tranh này?', 'が'],
      ],
    ],
  ],
  'P3-09': [
    [
      'SETSUZOKU', '接続表現 (Từ nối trong văn bản)', 'せつぞく',
      'Chọn từ nối đúng quan hệ giữa hai câu',
      'Thuận: だから・そのため・したがって. Nghịch: しかし・ところが・それでも. Thêm: そして・それに・また. Giải thích: つまり・なぜなら. Chuyển ý: ところで・さて. Ví dụ: たとえば.',
      'Câu 1。+ từ nối + 、Câu 2。', 'ところが: kết quả trái dự đoán; しかし: đối lập chung.',
      ['だから', 'しかし', 'つまり'],
      '雨が降っていた。それでも、試合は行われた。', 'Trời mưa. Dù vậy trận đấu vẫn diễn ra.',
      [
        ['よく勉強した。だから、合格できた。', 'よくべんきょうした。だから、ごうかくできた。', 'Học chăm. Vì vậy đã đỗ.', 'だから'],
        ['晴れると思っていた。ところが、急に雨が降り出した。', 'はれるとおもっていた。ところが、きゅうにあめがふりだした。', 'Tưởng trời nắng. Thế mà đột nhiên đổ mưa.', 'ところが'],
        ['この店は安い。それに、店員も親切だ。', 'このみせはやすい。それに、てんいんもしんせつだ。', 'Quán này rẻ. Hơn nữa nhân viên cũng tử tế.', 'それに'],
      ],
    ],
  ],
  'P3-10': [
    [
      'FUNIKI-TOUITSU', '文章の雰囲気の統一 (Thống nhất văn phong)', 'ぶんたい',
      'Giữ một văn phong trong cả đoạn văn',
      'Không trộn lẫn thể lịch sự (です・ます) với thể thường (だ・である) trong cùng văn bản; văn viết trang trọng dùng である, 〜ではない, 〜のだ; hội thoại dùng 〜んだ, 〜ちゃう.',
      'です・ます体 / だ・である体', 'Thư, email: です・ます; luận văn, báo: だ・である.',
      ['〜である', '〜です・ます'],
      '環境問題は重要な課題である。私たちは早く対策を考えるべきだ。', 'Vấn đề môi trường là vấn đề quan trọng. Chúng ta nên sớm nghĩ biện pháp.',
      [
        ['先日はありがとうございました。とても楽しかったです。', 'せんじつはありがとうございました。とてもたのしかったです。', 'Cảm ơn hôm trước. Rất vui ạ.', 'です'],
        ['この調査の結果は次のとおりである。', 'このちょうさのけっかはつぎのとおりである。', 'Kết quả khảo sát như sau.', 'である'],
        ['昨日、友達と映画を見た。とても面白かった。', 'きのう、ともだちとえいがをみた。とてもおもしろかった。', 'Hôm qua đi xem phim với bạn. Rất hay.', 'た'],
      ],
    ],
  ],
};
