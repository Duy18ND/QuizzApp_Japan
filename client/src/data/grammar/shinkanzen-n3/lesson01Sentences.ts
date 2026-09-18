

export interface GrammarSentence {
  id: string;
  grammarId: string;
  japanese: string;
  hiragana: string;
  vietnamese: string;
  difficulty: 'easy' | 'normal' | 'hard';
  target?: string;
  analysis?: {
    pattern: string;
    slotValues: Record<string, string>;
    conjugation?: {
      base: string;
      conjugated: string;
      rule: string;
    };
  };
}

export const lesson01Sentences: GrammarSentence[] = [
  {
    id: "N3-SKZ-L01-UCHINI-01_S001",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "忘れないうちに、予定をメモしてください。",
    hiragana: "わすれないうちに、よていをメモしてください。",
    vietnamese: "Hãy ghi lại kế hoạch trước khi quên.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S002",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "料理が熱いうちに、早く食べてください。",
    hiragana: "りょうりがあついうちに、はやくたべてください。",
    vietnamese: "Hãy ăn nhanh trong lúc thức ăn còn nóng.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S003",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "明るいうちに、家に帰りましょう。",
    hiragana: "あかるいうちに、いえにかえりましょう。",
    vietnamese: "Hãy về nhà trong lúc trời còn sáng.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S004",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "元気なうちに、いろいろな国へ旅行したいです。",
    hiragana: "げんきなうちに、いろいろなくにへりょこうしたいです。",
    vietnamese: "Tôi muốn đi du lịch nhiều nước trong lúc còn khỏe.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S005",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "若いうちに、たくさん本を読んだほうがいいです。",
    hiragana: "わかいうちに、たくさんほんをよんだほうがいいです。",
    vietnamese: "Nên đọc nhiều sách trong lúc còn trẻ.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S006",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "雨が降らないうちに、散歩に行きませんか。",
    hiragana: "あめがふらないうちに、さんぽにいきませんか。",
    vietnamese: "Có muốn đi dạo trong lúc trời chưa mưa không?",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S007",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "両親が元気なうちに、新しい家を建ててあげたいです。",
    hiragana: "りょうしんがげんきなうちに、あたらしいいえをたててあげたいです。",
    vietnamese: "Tôi muốn xây nhà mới cho bố mẹ trong lúc họ còn khỏe.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S008",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "学生のうちに、たくさん勉強しておいてください。",
    hiragana: "がくせいのうちに、たくさんべんきょうしておいてください。",
    vietnamese: "Hãy học thật nhiều trong lúc còn là học sinh.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S009",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "桜がきれいなうちに、お花見に行きましょう。",
    hiragana: "さくらがきれいなうちに、おはなみにいきましょう。",
    vietnamese: "Hãy đi ngắm hoa trong lúc hoa anh đào còn đẹp.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S010",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "コーヒーが冷めないうちに、飲んでください。",
    hiragana: "コーヒーがさめないうちに、のんでください。",
    vietnamese: "Hãy uống trong lúc cà phê chưa nguội.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S011",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "子供が寝ているうちに、掃除をしてしまいます。",
    hiragana: "こどもがねているうちに、そうじをしてしまいます。",
    vietnamese: "Tôi sẽ dọn dẹp xong trong lúc con đang ngủ.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S012",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "独身のうちに、自分の好きなことを楽しみたいです。",
    hiragana: "どくしんのうちに、じぶんのすきなことをたのしみたいです。",
    vietnamese: "Tôi muốn tận hưởng những điều mình thích trong lúc còn độc thân.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S013",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "お金があるうちに、必要なものを買っておきます。",
    hiragana: "おかねがあるうちに、ひつようなものをかっておきます。",
    vietnamese: "Tôi sẽ mua những thứ cần thiết trong lúc còn có tiền.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S014",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "暗くならないうちに、仕事をやめましょう。",
    hiragana: "くらくならないうちに、しごとをやめましょう。",
    vietnamese: "Hãy nghỉ làm trong lúc trời chưa tối.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S015",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "家族がいないうちに、こっそりケーキを食べました。",
    hiragana: "かぞくがいないうちに、こっそりケーキをたべました。",
    vietnamese: "Tôi đã lén ăn bánh trong lúc gia đình không có nhà.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S016",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "暇なうちに、来週の準備をしておきます。",
    hiragana: "ひまなうちに、らいしゅうのじゅんびをしておきます。",
    vietnamese: "Tôi sẽ chuẩn bị cho tuần sau trong lúc rảnh rỗi.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S017",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "日本にいるうちに、一度富士山に登りたいです。",
    hiragana: "にほんにいるうちに、いちどふじさんにのぼりたいです。",
    vietnamese: "Tôi muốn leo núi Phú Sĩ một lần trong lúc còn ở Nhật.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S018",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "みんなが集まっているうちに、写真を撮りましょう。",
    hiragana: "みんながあつまっているうちに、しゃしんをとりましょう。",
    vietnamese: "Hãy chụp ảnh trong lúc mọi người đang tập trung lại.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S019",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "気が変わらないうちに、早く契約にサインしてください。",
    hiragana: "きがかわらないうちに、はやくけいやくにサインしてください。",
    vietnamese: "Hãy mau ký hợp đồng trong lúc tôi chưa đổi ý.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-01_S020",
    grammarId: "N3-SKZ-L01-UCHINI-01",
    japanese: "店が空いているうちに、買い物に行きましょう。",
    hiragana: "みせがすいているうちに、かいものにいきましょう。",
    vietnamese: "Hãy đi mua sắm trong lúc cửa hàng còn vắng.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S001",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "日本で生活しているうちに、日本語が上手になりました。",
    hiragana: "にほんでせいかつしているうちに、にほんごがじょうずになりました。",
    vietnamese: "Sống ở Nhật một thời gian thì tiếng Nhật đã giỏi lên lúc nào không hay.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S002",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "何度も練習しているうちに、自転車に乗れるようになりました。",
    hiragana: "なんどもれんしゅうしているうちに、じてんしゃにのれるようになりました。",
    vietnamese: "Trong lúc luyện tập nhiều lần thì tôi đã biết đi xe đạp.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S003",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "友達と話しているうちに、悩みが消えてしまいました。",
    hiragana: "ともだちとはなしているうちに、なやみがきえてしまいました。",
    vietnamese: "Trong lúc nói chuyện với bạn thì những muộn phiền đã biến mất.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S004",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "本を読んでいるうちに、だんだん眠くなりました。",
    hiragana: "ほんをよんでいるうちに、だんだんねむくなりました。",
    vietnamese: "Trong lúc đang đọc sách thì tôi dần thấy buồn ngủ.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S005",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "その音楽を聞いているうちに、昔のことを思い出しました。",
    hiragana: "そのおんがくをきいているうちに、むかしのことをおもいだしました。",
    vietnamese: "Trong khi đang nghe bản nhạc đó thì tôi nhớ lại chuyện ngày xưa.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S006",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "気づかないうちに、外は暗くなっていました。",
    hiragana: "きづかないうちに、そとはくらくなっていました。",
    vietnamese: "Trong lúc không để ý thì bên ngoài trời đã tối.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S007",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "二人で会っているうちに、彼女のことが好きになりました。",
    hiragana: "ふたりであっているうちに、かのじょのことがすきになりました。",
    vietnamese: "Trong lúc hai đứa hay gặp nhau thì tôi đã thích cô ấy.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S008",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "テレビを見ているうちに、いつの間にか寝ていました。",
    hiragana: "テレビをみているうちに、いつのまにかねていました。",
    vietnamese: "Trong lúc xem tivi thì tôi đã ngủ quên lúc nào không hay.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S009",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "仕事をしているうちに、新しいアイデアが浮かびました。",
    hiragana: "しごとをしているうちに、あたらしいアイデアがうかびました。",
    vietnamese: "Trong khi đang làm việc thì tôi đã nảy ra ý tưởng mới.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S010",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "話を聞いているうちに、だんだん怒りが湧いてきました。",
    hiragana: "はなしをきいているうちに、だんだんいかりがわいてきました。",
    vietnamese: "Trong khi nghe chuyện thì cơn giận dần sôi sục lên.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S011",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "毎日使っているうちに、スマートフォンの使い方が分かりました。",
    hiragana: "まいにちつかっているうちに、スマートフォンのつかいかたがわかりました。",
    vietnamese: "Trong quá trình sử dụng mỗi ngày thì tôi đã hiểu cách dùng smartphone.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S012",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "この町に住んでいるうちに、町の歴史に興味を持ちました。",
    hiragana: "このまちにすんでいるうちに、まちのれきしにきょうみをもちました。",
    vietnamese: "Trong thời gian sống ở thị trấn này, tôi đã trở nên hứng thú với lịch sử của nó.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S013",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "教えているうちに、自分もたくさん学ぶことができました。",
    hiragana: "おしえているうちに、じぶんもたくさんまなぶことができました。",
    vietnamese: "Trong khi đi dạy, bản thân tôi cũng đã học hỏi được rất nhiều.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S014",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "彼女の笑顔を見ているうちに、元気が出てきました。",
    hiragana: "かのじょのえがおをみているうちに、げんきがでてきました。",
    vietnamese: "Trong lúc nhìn nụ cười của cô ấy, tôi đã thấy khỏe khoắn trở lại.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S015",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "ずっと待っているうちに、だんだん不安になってきました。",
    hiragana: "ずっとまっているうちに、だんだんふあんになってきました。",
    vietnamese: "Trong lúc mải chờ đợi, tôi dần trở nên bất an.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S016",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "何回も読んでいるうちに、この小説の面白さが分かりました。",
    hiragana: "なんかいもよんでいるうちに、このしょうせつのおもしろさがわかりました。",
    vietnamese: "Trong lúc đọc đi đọc lại nhiều lần, tôi đã hiểu được sự thú vị của cuốn tiểu thuyết này.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S017",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "知らないうちに、子供はすっかり大きくなっていました。",
    hiragana: "しらないうちに、こどもはすっかりおおきくなっていました。",
    vietnamese: "Bọn trẻ đã lớn phổng phao lúc nào không hay.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S018",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "一緒に遊んでいるうちに、犬は私にすっかり慣れました。",
    hiragana: "いっしょにあそんでいるうちに、いぬはわたしにすっかりなれました。",
    vietnamese: "Trong quá trình chơi cùng nhau, con chó đã hoàn toàn quen với tôi.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S019",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "インターネットで調べているうちに、面白いサイトを見つけました。",
    hiragana: "インターネットでしらべているうちに、おもしろいサイトをみつけました。",
    vietnamese: "Trong lúc đang tìm kiếm trên mạng, tôi đã tìm thấy một trang web thú vị.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-UCHINI-02_S020",
    grammarId: "N3-SKZ-L01-UCHINI-02",
    japanese: "先生の話を聞いているうちに、将来の目標が決まりました。",
    hiragana: "せんせいのはなしをきいているうちに、しょうらいのもくひょうがきまりました。",
    vietnamese: "Trong khi nghe thầy giáo nói chuyện, tôi đã quyết định được mục tiêu tương lai.",
    difficulty: "normal",
    target: "うちに"
  },
  {
    id: "N3-SKZ-L01-AIDA_S001",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "夏休みの間、ずっとアルバイトをしていました。",
    hiragana: "なつやすみのあいだ、ずっとアルバイトをしていました。",
    vietnamese: "Trong suốt kỳ nghỉ hè, tôi liên tục làm thêm.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S002",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "日本にいる間、ずっと日本語を勉強していました。",
    hiragana: "にほんにいるあいだ、ずっとにほんごをべんきょうしていました。",
    vietnamese: "Trong suốt thời gian ở Nhật, tôi đã liên tục học tiếng Nhật.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S003",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "授業の間、ずっと静かにしていました。",
    hiragana: "じゅぎょうのあいだ、ずっとしずかにしていました。",
    vietnamese: "Trong suốt buổi học, tôi đã luôn giữ im lặng.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S004",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "旅行の間、ずっと写真を撮っていました。",
    hiragana: "りょこうのあいだ、ずっとしゃしんをとっていました。",
    vietnamese: "Trong suốt chuyến du lịch, tôi đã liên tục chụp ảnh.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S005",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "映画を見ている間、ずっと彼と手をつないでいました。",
    hiragana: "えいがをみているあいだ、ずっとかれとてをつないでいました。",
    vietnamese: "Trong suốt lúc xem phim, tôi đã luôn nắm tay anh ấy.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S006",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "私が寝ている間、猫はずっと私のそばにいました。",
    hiragana: "わたしがねているあいだ、ねこはずっとわたしのそばにいました。",
    vietnamese: "Trong suốt lúc tôi ngủ, con mèo đã luôn ở bên cạnh tôi.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S007",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "彼がシャワーを浴びている間、ずっとテレビを見ていました。",
    hiragana: "かれがシャワーをあびているあいだ、ずっとテレビをみていました。",
    vietnamese: "Trong suốt lúc anh ấy tắm, tôi đã liên tục xem tivi.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S008",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "子供が遊んでいる間、母はずっと本を読んでいました。",
    hiragana: "こどもがあそんでいるあいだ、はははずっとほんをよんでいました。",
    vietnamese: "Trong suốt lúc bọn trẻ chơi, mẹ đã liên tục đọc sách.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S009",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "入院している間、友達がずっと世話をしてくれました。",
    hiragana: "にゅういんしているあいだ、ともだちがずっとせわをしてくれました。",
    vietnamese: "Trong suốt thời gian nằm viện, bạn tôi đã luôn chăm sóc cho tôi.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S010",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "電車に乗っている間、ずっと音楽を聞いていました。",
    hiragana: "でんしゃにのっているあいだ、ずっとおんがくをきいていました。",
    vietnamese: "Trong suốt lúc đi tàu, tôi đã liên tục nghe nhạc.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S011",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "雨が降っている間、ずっと喫茶店で雨宿りをしていました。",
    hiragana: "あめがふっているあいだ、ずっときっさてんであまやどりをしていました。",
    vietnamese: "Trong suốt lúc trời mưa, tôi đã liên tục trú mưa ở quán cà phê.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S012",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "飛行機に乗っている間、ずっと寝ていました。",
    hiragana: "ひこうきにのっているあいだ、ずっとねていました。",
    vietnamese: "Trong suốt lúc đi máy bay, tôi đã ngủ li bì.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S013",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "社長が話している間、みんなずっと真剣に聞いていました。",
    hiragana: "しゃちょうがはなしているあいだ、みんなずっとしんけんにきいていました。",
    vietnamese: "Trong suốt lúc giám đốc phát biểu, mọi người đã luôn lắng nghe nghiêm túc.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S014",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "私が日本に留学している間、父はずっと仕送りをしてくれました。",
    hiragana: "わたしがにほんにりゅうがくしているあいだ、ちちはずっとしおくりをしてくれました。",
    vietnamese: "Trong suốt thời gian tôi du học ở Nhật, bố đã luôn gửi tiền chu cấp.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S015",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "彼女が料理を作っている間、私はずっと部屋の掃除をしていました。",
    hiragana: "かのじょがりょうりをつくっているあいだ、わたしはずっとへやのそうじをしていました。",
    vietnamese: "Trong suốt lúc cô ấy nấu ăn, tôi đã liên tục dọn dẹp phòng.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S016",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "会議の間、ずっと眠くて仕方がなかった。",
    hiragana: "かいぎのあいだ、ずっとねむくてしかたがなかった。",
    vietnamese: "Trong suốt buổi họp, tôi đã luôn buồn ngủ không chịu được.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S017",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "停電の間、ずっと暗闇の中で座っていました。",
    hiragana: "ていでんのあいだ、ずっとくらやみのなかですわっていました。",
    vietnamese: "Trong suốt lúc mất điện, tôi đã luôn ngồi trong bóng tối.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S018",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "テストの間、ずっと時計を気にしていました。",
    hiragana: "テストのあいだ、ずっととけいをきにしていました。",
    vietnamese: "Trong suốt lúc làm bài kiểm tra, tôi đã luôn để ý đồng hồ.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S019",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "彼を待っている間、ずっと本を読んで時間を潰していました。",
    hiragana: "かれをまっているあいだ、ずっとほんをよんでじかんをつぶしていました。",
    vietnamese: "Trong suốt lúc đợi anh ấy, tôi đã liên tục đọc sách để giết thời gian.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDA_S020",
    grammarId: "N3-SKZ-L01-AIDA",
    japanese: "家族が旅行に出かけている間、私一人でずっと家を守っていました。",
    hiragana: "かぞくがりょこうにでかけているあいだ、わたしひとりでずっといえをまもっていました。",
    vietnamese: "Trong suốt lúc gia đình đi du lịch, tôi đã ở một mình trông nhà.",
    difficulty: "normal",
    target: "間"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S001",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "私が寝ている間に、電話がありました。",
    hiragana: "わたしがねているあいだに、でんわがありました。",
    vietnamese: "Trong lúc tôi đang ngủ thì có điện thoại.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S002",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "日本にいる間に、富士山を見たいです。",
    hiragana: "にほんにいるあいだに、ふじさんをみたいです。",
    vietnamese: "Trong khoảng thời gian ở Nhật, tôi muốn được nhìn thấy núi Phú Sĩ.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S003",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "母が料理している間に、宿題をしました。",
    hiragana: "ははがりょうりしているあいだに、しゅくだいをしました。",
    vietnamese: "Trong lúc mẹ đang nấu ăn, tôi đã làm bài tập.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S004",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "夏休みの間に、京都へ行きました。",
    hiragana: "なつやすみのあいだに、きょうとへいきました。",
    vietnamese: "Trong khoảng thời gian nghỉ hè, tôi đã đi Kyoto.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S005",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "独身の間に、いろいろなことに挑戦したいです。",
    hiragana: "どくしんのあいだに、いろいろなことにちょうせんしたいです。",
    vietnamese: "Trong lúc còn độc thân, tôi muốn thử thách nhiều điều.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S006",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "先生がいない間に、こっそりお菓子を食べました。",
    hiragana: "せんせいかいないあいだに、こっそりおかしをたべました。",
    vietnamese: "Trong lúc thầy giáo không có mặt, tôi đã lén ăn kẹo.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S007",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "彼がシャワーを浴びている間に、こっそりメッセージを見ました。",
    hiragana: "かれがシャワーをあびているあいだに、こっそりメッセージをみました。",
    vietnamese: "Trong lúc anh ấy đang tắm, tôi đã lén xem tin nhắn.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S008",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "私が留守にしている間に、泥棒が入りました。",
    hiragana: "わたしがるすにしているあいだに、どろぼうがいりました。",
    vietnamese: "Trong lúc tôi vắng nhà thì trộm đã lẻn vào.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S009",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "明るい間に、庭の掃除を終わらせましょう。",
    hiragana: "あかるいあいだに、にわのそうじをおわらせましょう。",
    vietnamese: "Trong lúc trời còn sáng thì hãy dọn dẹp xong khu vườn.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S010",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "子供が昼寝をしている間に、本を読みました。",
    hiragana: "こどもがひるねをしているあいだに、ほんをよみました。",
    vietnamese: "Trong lúc con đang ngủ trưa, tôi đã đọc sách.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S011",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "社長が出張している間に、新しいプロジェクトが始まりました。",
    hiragana: "しゃちょうがしゅっちょうしているあいだに、あたらしいプロジェクトがはじまりました。",
    vietnamese: "Trong khoảng thời gian giám đốc đi công tác, dự án mới đã bắt đầu.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S012",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "学生の間に、運転免許を取っておきたいです。",
    hiragana: "がくせいのあいだに、うんてんめんきょをとっておきたいです。",
    vietnamese: "Trong khoảng thời gian còn là học sinh, tôi muốn lấy bằng lái xe.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S013",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "妻が買い物に行っている間に、部屋を片付けました。",
    hiragana: "つまがかいものにいっているあいだに、へやをかたづけました。",
    vietnamese: "Trong lúc vợ đi mua sắm, tôi đã dọn dẹp phòng.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S014",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "電車を待っている間に、自動販売機でジュースを買いました。",
    hiragana: "でんしゃをまっているあいだに、じどうはんばいきでジュースをかいました。",
    vietnamese: "Trong lúc chờ tàu, tôi đã mua nước trái cây ở máy bán hàng tự động.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S015",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "雨が降っている間に、少し休みましょう。",
    hiragana: "あめがふっているあいだに、すこしやすみましょう。",
    vietnamese: "Trong lúc trời đang mưa thì chúng ta hãy nghỉ ngơi một chút.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S016",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "親が元気な間に、親孝行をしたいです。",
    hiragana: "おやがげんきなあいだに、おやこうこうをしたいです。",
    vietnamese: "Trong lúc bố mẹ còn khỏe mạnh, tôi muốn báo hiếu.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S017",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "私が旅行している間に、大事な手紙が届きました。",
    hiragana: "わたしがりょこうしているあいだに、だいじなてがみがとどきました。",
    vietnamese: "Trong lúc tôi đang đi du lịch thì bức thư quan trọng đã được gửi tới.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S018",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "若くて体力がある間に、世界一周をしてみたいです。",
    hiragana: "わかくてたいりょくがあるあいだに、せかいいっしゅうをしてみたいです。",
    vietnamese: "Trong lúc còn trẻ và có thể lực, tôi muốn đi vòng quanh thế giới.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S019",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "みんなが寝静まった間に、サンタクロースがプレゼントを置きました。",
    hiragana: "みんながねしずまったあいだに、サンタクロースがプレゼントをおきました。",
    vietnamese: "Trong lúc mọi người đã ngủ say, ông già Noel đã đặt quà xuống.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-AIDANI_S020",
    grammarId: "N3-SKZ-L01-AIDANI",
    japanese: "仕事が暇な間に、資格の勉強をしています。",
    hiragana: "しごとがひまなあいだに、しかくのべんきょうをしています。",
    vietnamese: "Trong lúc công việc rảnh rỗi, tôi đang học lấy chứng chỉ.",
    difficulty: "normal",
    target: "間に"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S001",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "切符を買ってからでないと、電車に乗れません。",
    hiragana: "きっぷをかってからでないと、でんしゃにのれません。",
    vietnamese: "Nếu chưa mua vé thì không thể lên tàu.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S002",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "予約してからでないと、ホテルに泊まれません。",
    hiragana: "よやくしてからでないと、ホテルにとまれません。",
    vietnamese: "Nếu chưa đặt trước thì không thể ở khách sạn.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S003",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "申し込んでからでないと、参加できません。",
    hiragana: "もうしこんでからでないと、さんかできません。",
    vietnamese: "Nếu chưa đăng ký thì không thể tham gia.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S004",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "宿題をしてからでないと、ゲームをしてはいけません。",
    hiragana: "しゅくだいをしてからでないと、ゲームをしてはいけません。",
    vietnamese: "Nếu chưa làm xong bài tập thì không được chơi game.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S005",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "お金を払ってからでないと、商品を受け取れません。",
    hiragana: "おかねをはらってからでないと、しょうひんをうけとれません。",
    vietnamese: "Nếu chưa trả tiền thì không thể nhận hàng.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S006",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "練習してからでないと、本番ではうまくできません。",
    hiragana: "れんしゅうしてからでないと、ほんばんではうまくできません。",
    vietnamese: "Nếu chưa luyện tập thì không thể làm tốt trong buổi biểu diễn chính thức.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S007",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "よく考えてからでないと、決めることができません。",
    hiragana: "よくかんがえてからでないと、きめることができません。",
    vietnamese: "Nếu chưa suy nghĩ kỹ thì tôi không thể quyết định.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S008",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "親に相談してからでないと、留学を決めることはできません。",
    hiragana: "おやにそうだんしてからでないと、りゅうがくをきめることはできません。",
    vietnamese: "Nếu chưa bàn bạc với bố mẹ thì tôi không thể quyết định việc đi du học.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S009",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "説明書をよく読んでからでないと、この機械は使えません。",
    hiragana: "せつめいしょをよくよんでからでないと、このきかいはつかえません。",
    vietnamese: "Nếu chưa đọc kỹ sách hướng dẫn thì không thể sử dụng cái máy này.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S010",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "手を洗ってからでないと、ご飯を食べてはいけません。",
    hiragana: "てをあらってからでないと、ごはんをたべてはいけません。",
    vietnamese: "Nếu chưa rửa tay thì không được ăn cơm.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S011",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "上司の許可をもらってからでないと、このデータは使えません。",
    hiragana: "じょうしのきょかをもらってからでないと、このデータはつかえません。",
    vietnamese: "Nếu chưa nhận được sự cho phép của sếp thì không thể sử dụng dữ liệu này.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S012",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "病気が完全に治ってからでないと、退院できません。",
    hiragana: "びょうきがかんぜんになおってからでないと、たいいんできません。",
    vietnamese: "Nếu bệnh chưa hoàn toàn khỏi thì không thể xuất viện.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S013",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "免許を取ってからでないと、車を運転してはいけません。",
    hiragana: "めんきょをとってからでないと、くるまをうんてんしてはいけません。",
    vietnamese: "Nếu chưa lấy bằng lái thì không được phép lái xe.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S014",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "全員が集まってからでないと、会議を始められません。",
    hiragana: "ぜんいんがあつまってからでないと、かいぎをはじめられません。",
    vietnamese: "Nếu chưa tập trung đủ mọi người thì không thể bắt đầu cuộc họp.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S015",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "安全を確認してからでないと、出発できません。",
    hiragana: "あんぜんをかくにんしてからでないと、しゅっぱつできません。",
    vietnamese: "Nếu chưa xác nhận an toàn thì không thể xuất phát.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S016",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "実物を見てからでないと、買うかどうか決められません。",
    hiragana: "じつぶつをみてからでないと、かうかどうかきめられません。",
    vietnamese: "Nếu chưa nhìn thấy đồ thật thì tôi không thể quyết định mua hay không.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S017",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "詳しい説明を聞いてからでないと、契約書にサインできません。",
    hiragana: "くわしいせつめいをきいてからでないと、けいやくしょにサインできません。",
    vietnamese: "Nếu chưa nghe giải thích chi tiết thì tôi không thể ký vào hợp đồng.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S018",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "試験に合格してからでないと、次のレベルに進めません。",
    hiragana: "しけんにごうかくしてからでないと、つぎのレベルにすすめません。",
    vietnamese: "Nếu chưa thi đỗ thì không thể lên cấp độ tiếp theo.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S019",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "熱が下がってからでないと、お風呂に入ってはいけません。",
    hiragana: "ねつがさがってからでないと、おふろにはいってはいけません。",
    vietnamese: "Nếu chưa hạ sốt thì không được đi tắm.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TEKARA-DENAITO_S020",
    grammarId: "N3-SKZ-L01-TEKARA-DENAITO",
    japanese: "パスワードを入力してからでないと、ログインできません。",
    hiragana: "パスワードをにゅうりょくしてからでないと、ログインできません。",
    vietnamese: "Nếu chưa nhập mật khẩu thì không thể đăng nhập.",
    difficulty: "normal",
    target: "てからでないと"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S001",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "これからご飯を食べるところです。",
    hiragana: "これからごはんをたべるところです。",
    vietnamese: "Bây giờ chuẩn bị ăn cơm.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S002",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "今から出かけるところです。",
    hiragana: "いまからでかけるところです。",
    vietnamese: "Bây giờ tôi chuẩn bị đi ra ngoài.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S003",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "これから勉強するところです。",
    hiragana: "これからべんきょうするところです。",
    vietnamese: "Bây giờ chuẩn bị bắt đầu học.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S004",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "今からお風呂に入るところです。",
    hiragana: "いまからおふろにはいるところです。",
    vietnamese: "Bây giờ chuẩn bị đi tắm.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S005",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "これから映画が始まるところです。",
    hiragana: "これからえいががはじまるところです。",
    vietnamese: "Bây giờ bộ phim chuẩn bị bắt đầu.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S006",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "今から彼に電話をかけるところです。",
    hiragana: "いまからかれにでんわをかけるところです。",
    vietnamese: "Bây giờ tôi chuẩn bị gọi điện cho anh ấy.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S007",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "これから家を出るところです。",
    hiragana: "これからいえをでるところです。",
    vietnamese: "Bây giờ tôi chuẩn bị ra khỏi nhà.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S008",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "今、日本語を勉強しているところです。",
    hiragana: "いま、にほんごをべんきょうしているところです。",
    vietnamese: "Bây giờ tôi đang học tiếng Nhật.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S009",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "ちょうど宿題をしているところです。",
    hiragana: "ちょうどしゅくだいをしているところです。",
    vietnamese: "Đúng lúc này tôi đang làm bài tập.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S010",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "今、友達と話しているところです。",
    hiragana: "いま、ともだちとはなしているところです。",
    vietnamese: "Bây giờ tôi đang nói chuyện với bạn.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S011",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "今、晩ご飯を作っているところです。",
    hiragana: "いま、ばんごはんをつくっているところです。",
    vietnamese: "Bây giờ tôi đang nấu bữa tối.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S012",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "今、駅に向かっているところです。",
    hiragana: "いま、えきにむかっているところです。",
    vietnamese: "Bây giờ tôi đang hướng đến nhà ga.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S013",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "今、資料を読んでいるところです。",
    hiragana: "いま、しりょうをよんでいるところです。",
    vietnamese: "Bây giờ tôi đang đọc tài liệu.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S014",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "ちょうど部屋の掃除をしているところです。",
    hiragana: "ちょうどへやのそうじをしているところです。",
    vietnamese: "Đúng lúc này tôi đang dọn dẹp phòng.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S015",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "たった今、駅に着いたところです。",
    hiragana: "たったいま、えきについたところです。",
    vietnamese: "Tôi vừa mới đến nhà ga tức thì.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S016",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "今、宿題が終わったところです。",
    hiragana: "いま、しゅくだいがおわったところです。",
    vietnamese: "Bây giờ tôi vừa mới làm xong bài tập.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S017",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "ちょうどご飯を食べたところです。",
    hiragana: "ちょうどごはんをたべたところです。",
    vietnamese: "Tôi vừa mới ăn cơm xong đúng lúc này.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S018",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "たった今、家に帰ってきたところです。",
    hiragana: "たったいま、いえにかえってきたところです。",
    vietnamese: "Tôi vừa mới về đến nhà tức thì.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S019",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "今、レポートを提出したところです。",
    hiragana: "いま、レポートをていしゅつしたところです。",
    vietnamese: "Bây giờ tôi vừa mới nộp báo cáo.",
    difficulty: "normal",
    target: "ところ"
  },
  {
    id: "N3-SKZ-L01-TOKORO_S020",
    grammarId: "N3-SKZ-L01-TOKORO",
    japanese: "たった今、彼からメールが来たところです。",
    hiragana: "たったいま、かれからメールがきたところです。",
    vietnamese: "Tôi vừa mới nhận được email từ anh ấy tức thì.",
    difficulty: "normal",
    target: "ところ"
  },
];
