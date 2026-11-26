import type { PracticeType } from '../../../types/grammar';
import type { GrammarBook, GrammarChapter, SmartGrammarRule } from '../../../types/grammarEngine';
import type { GrammarSentence } from './lesson01Sentences';

const N3_PRACTICE_TYPES: PracticeType[] = [
  'multiple_choice',
  'fill_blank',
  'sentence_ordering',
  'star_question',
  'ja_to_vi',
  'vi_to_ja',
  'grammar_selection',
  'mixed',
];

export type CompactN3Rule = [
  code: string,
  name: string,
  hiragana: string,
  meaning: string,
  explanation: string,
  usage: string,
  notes: string,
  patterns: string[],
  templatePattern: string,
  templateVi: string,
  examples: Array<[japanese: string, hiragana: string, vietnamese: string, target: string]>,
];

export interface CompactN3Chapter {
  id: string;
  number: number;
  title: string;
  topics: string[];
  rules: CompactN3Rule[];
}

export function buildN3FromCompact(
  bookId: string,
  idPrefix: string,
  chaptersSpec: CompactN3Chapter[],
): { chapters: GrammarChapter[]; sentences: GrammarSentence[] } {
  const sentences: GrammarSentence[] = [];
  const chapters: GrammarChapter[] = chaptersSpec.map((chSpec) => {
    const grammars: SmartGrammarRule[] = chSpec.rules.map((raw) => {
      const [
        code,
        name,
        hiragana,
        meaning,
        explanation,
        usage,
        notes,
        patterns,
        templatePattern,
        templateVi,
        examples,
      ] = raw;
      const id = `${idPrefix}-${chSpec.id}-${code}`;
      examples.forEach(([japanese, exHiragana, vietnamese, target], idx) => {
        sentences.push({
          id: `${id}_S${String(idx + 1).padStart(2, '0')}`,
          grammarId: id,
          japanese,
          hiragana: exHiragana,
          vietnamese,
          difficulty: 'normal',
          target,
        });
      });
      return {
        id,
        bookId,
        chapterId: chSpec.id,
        level: 'N3',
        name,
        hiragana,
        meaning,
        explanation,
        usage,
        notes,
        category: 'relation',
        semanticFunction: code.toLowerCase(),
        allowedRelationTypes: [code.toLowerCase()],
        practiceTypes: N3_PRACTICE_TYPES,
        patterns: patterns.map((p) => ({ pattern: p, target: p })),
        templates: [
          {
            id: `${id}_T1`,
            grammarId: id,
            pattern: templatePattern,
            vietnamesePattern: templateVi,
            slots: [
              { name: 'A', allowedTypes: ['noun', 'verb'], allowedForms: ['N', 'Vる'] },
              { name: 'B', allowedTypes: ['verb'], allowedForms: ['Vる'] },
            ],
          },
        ],
      };
    });

    return {
      id: chSpec.id,
      bookId,
      chapterNumber: chSpec.number,
      title: chSpec.title,
      topics: chSpec.topics,
      grammars,
    };
  });

  return { chapters, sentences };
}

const SHINKANZEN_N3_EXTRA_SPEC: CompactN3Chapter[] = [
  {
    id: 'L03',
    number: 3,
    title: 'Bài 3: Nguyên nhân & Lý do (～によって・せいで・おかげで・ばかりに)',
    topics: ['cause', 'reason'],
    rules: [
      [
        'BAKARINI',
        '～ばかりに (Chỉ vì... mà ra nông nỗi)',
        'ばかりに',
        'Chỉ vì... mà lại (dẫn tới hậu quả đáng tiếc)',
        'Nhấn mạnh một lý do tưởng nhỏ hoặc đáng tiếc duy nhất khiến sự việc trở nên tồi tệ.',
        'V/A(thường) + ばかりに · Nである/Aな + ばかりに',
        'Vế sau luôn mang ý nghĩa tiêu cực, hối tiếc.',
        ['V(thường) + ばかりに'],
        '一言謝らなかったばかりに、関係が悪くなった。',
        'Chỉ vì không xin lỗi một câu mà quan hệ trở nên xấu đi.',
        [
          ['うっかり寝坊したばかりに、大切な飛行機に乗り遅れた。', 'うっかりねぼうしたばかりに、たいせつなひこうきにのりおくれた。', 'Chỉ vì lỡ ngủ quên mà trễ mất chuyến bay quan trọng.', 'ばかりに'],
          ['確認しなかったばかりに、大きなミスをしてしまった。', 'かくにんしなかったばかりに、おおきなミスをしてしまった。', 'Chỉ vì không kiểm tra kỹ mà mắc phải sai lầm lớn.', 'ばかりに'],
        ],
      ],
      [
        'KOTO-KARA',
        '～ことから (Từ việc... mà dẫn đến tên gọi/kết luận)',
        'ことから',
        'Từ việc / Xuất phát từ chuyện...',
        'Giải thích nguồn gốc tên gọi, biệt danh hoặc lý do dẫn đến một nhận định chung.',
        'V/A(thường) + ことから · N + のことから',
        'Thường đi với các động từ ở vế sau như 「呼ばれる・名付けられる・分かる」.',
        ['V(thường) + ことから'],
        '富士山の形に似ていることから、「小富士」と呼ばれている。',
        'Từ việc giống hình dáng núi Phú Sĩ nên được gọi là "Tiểu Phú Sĩ".',
        [
          ['毎日挨拶を欠かさないことから、彼はみんなに信頼されている。', 'まいにちあいさつをかかさないことから、かれはみんなにしんらいされている。', 'Từ việc ngày nào cũng chào hỏi, cậu ấy được mọi người tin tưởng.', 'ことから'],
          ['道が濡れていることから、夜中に雨が降ったことが分かる。', 'みちがぬれていることから、よなかにあめがふったことがわかる。', 'Từ việc đường bị ướt có thể biết đêm qua trời đã mưa.', 'ことから'],
        ],
      ],
      [
        'DAKE-ATTE',
        '～だけに / ～だけあって (Chính vì... nên quả nhiên)',
        'だけに',
        'Đúng là... có khác / Chính vì... nên càng...',
        'Nhấn mạnh kết quả xảy ra hoàn toàn xứng đáng hoặc tương ứng với nguyên nhân phía trước.',
        'V/A/N(thường) + だけに (N/Aな giữ な/である)',
        '「だけに」 dùng được cho cả khen lẫn chê; 「だけあって」 dùng nhiều để khen ngợi.',
        ['Thể thường + だけに', 'Thể thường + だけあって'],
        'さすがプロだけあって、演奏が素晴らしい。',
        'Đúng là nghệ sĩ chuyên nghiệp có khác, màn biểu diễn thật tuyệt vời.',
        [
          ['長年練習しただけあって、日本語がとても自然です。', 'ながねんれんしゅうしただけあって、にほんごがとてもしぜんです。', 'Đúng là luyện tập nhiều năm có khác, tiếng Nhật thật tự nhiên.', 'だけあって'],
          ['期待が大きかっただけに、負けたときは悔しかった。', 'きたいがおおきかっただけに、まけたときはくやしかった。', 'Chính vì kỳ vọng lớn nên lúc thua càng thấy tiếc.', 'だけに'],
        ],
      ],
    ],
  },
  {
    id: 'L04',
    number: 4,
    title: 'Bài 4: Điều kiện & Giả định (～としたら・さえ～ば・ないことには)',
    topics: ['condition', 'hypothesis'],
    rules: [
      [
        'TO-SHITARA',
        '～としたら / ～とすれば (Nếu giả sử là...)',
        'としたら',
        'Giả sử như... thì sao / Nếu cho là...',
        'Đặt ra một giả thuyết chưa có thật để suy luận kết quả hoặc nêu ý kiến.',
        'Thể thông thường + としたら / とすれば',
        'Hay đi kèm 「もし / 仮に」 ở đầu câu.',
        ['Thể thường + としたら'],
        'もしタイムマシンがあるとしたら、過去に戻りたいです。',
        'Nếu giả sử có cỗ máy thời gian thì tôi muốn quay về quá khứ.',
        [
          ['今から電車に乗るとしたら、三時には着くでしょう。', 'いまからでんしゃにのるとしたら、さんじにはつくでしょう。', 'Nếu bây giờ lên tàu điện thì khoảng 3 giờ sẽ tới nơi nhỉ.', 'としたら'],
          ['一億円当たったとすれば、まず家を買います。', 'いちおくえんあたったとすれば、まずいえをかいます。', 'Giả sử trúng 100 triệu yên, trước tiên tôi sẽ mua nhà.', 'とすれば'],
        ],
      ],
      [
        'SAE-BA',
        '～さえ ～ば (Chỉ cần... là đủ)',
        'さえ～ば',
        'Miễn là có... / Chỉ cần... thì...',
        'Đưa ra một điều kiện tối thiểu duy nhất: chỉ cần thỏa điều kiện đó thì mọi chuyện đều ổn.',
        'N + (で)さえ + Vえば/Aければ · Vます + さえ + すれば',
        'Mang sắc thái nhấn mạnh điều kiện duy nhất.',
        ['N + さえ + Vえば'],
        '健康でありさえすれば、他に何もいらない。',
        'Miễn là có sức khỏe thì chẳng cần gì thêm nữa.',
        [
          ['毎日三十分勉強さえすれば、きっと合格できます。', 'まいにちさんじゅっぷんべんきょうさえすれば、きっとごうかくできます。', 'Chỉ cần mỗi ngày học 30 phút thì chắc chắn đỗ được.', 'さえすれば'],
          ['スマホさえあれば、道に迷うことはありません。', 'スマホさえあれば、みちにまようことはありません。', 'Chỉ cần có điện thoại thông minh là không lo lạc đường.', 'さえあれば'],
        ],
      ],
      [
        'NAI-KOTONIWA',
        '～ないことには ～ない (Nếu không... thì không thể...)',
        'ないことには',
        'Hễ mà chưa / nếu không làm A thì B cũng chịu',
        'Khẳng định A là điều kiện tiên quyết bắt buộc; nếu chưa làm A thì kết quả B không thể xảy ra.',
        'Vない / Aくない + ことには、～ない / 難しい',
        'Vế sau luôn mang tính phủ định hoặc khó thực hiện.',
        ['Vない + ことには'],
        '実際に行ってみないことには、良さは分からない。',
        'Nếu chưa thử đi thực tế thì không thể hiểu được cái hay đâu.',
        [
          ['まず始めてみないことには、できるかどうか分かりません。', 'まずはじめてみないことには、できるかどうかわかりません。', 'Nếu chưa thử bắt đầu thì chẳng biết có làm được hay không.', 'ないことには'],
          ['本人の話を聞かないことには、判断できません。', 'ほんにんのはなしをきかないことには、はんだんできません。', 'Nếu không nghe chính chủ nói thì tôi không phán đoán được.', 'ないことには'],
        ],
      ],
    ],
  },
  {
    id: 'L05',
    number: 5,
    title: 'Bài 5: Nghịch tiếp & Nhượng bộ (～くせに・にもかかわらず・といっても)',
    topics: ['concession', 'contrast'],
    rules: [
      [
        'KUSE-NI',
        '～くせに (Vậy mà / Thế mà lại... — phê phán)',
        'くせに',
        'Mang tiếng là / Biết rõ thế vậy mà lại...',
        'Diễn tả thái độ chê trách, bực mình trước sự mâu thuẫn của đối phương.',
        'V/Aい + くせに · Nの / Aなな + くせに',
        'KHÔNG dùng cho chính bản thân mình; không dùng với câu kính trọng.',
        ['Thể thường + くせに'],
        '自分で何もできないくせに、文句ばかり言う。',
        'Bản thân chẳng làm được gì thế mà suốt ngày phàn nàn.',
        [
          ['知っているくせに、知らないふりをしている。', 'しっているくせに、しらないふりをしている。', 'Rõ ràng là biết mà cứ giả vờ không biết.', 'くせに'],
          ['もうすぐテストのくせに、ちっとも勉強しない。', 'もうすぐテストのくせに、ちっともべんきょうしない。', 'Sắp thi đến nơi rồi vậy mà chẳng học chút nào.', 'くせに'],
        ],
      ],
      [
        'NIMOKAKAWARAZU',
        '～にもかかわらず (Bất chấp / Mặc dù...)',
        'にもかかわらず',
        'Mặc dù / Bất chấp (trang trọng)',
        'Nêu kết quả trái hẳn với điều kiện thông thường; hay dùng trong tin tức, bài phát biểu.',
        'V/A(thường) + にもかかわらず · N/Aな + にもかかわらず',
        'Trang trọng hơn 「のに」 và dùng được sau Danh từ trực tiếp (không có な/の).',
        ['N/V(thường) + にもかかわらず'],
        '大雨にもかかわらず、大勢の人が集まった。',
        'Mặc dù trời mưa lớn nhưng rất đông người đã tụ họp.',
        [
          ['何度も注意したにもかかわらず、また同じミスをした。', 'なんどもちゅういしたにもかかわらず、またおなじミスをした。', 'Dù đã nhắc nhở bao lần vậy mà lại mắc cùng lỗi cũ.', 'にもかかわらず'],
          ['忙しいにもかかわらず、わざわざ来ていただきありがとうございます。', 'いそがしいにもかかわらず、わざわざきていただきありがとうございます。', 'Dù anh bận rộn nhưng vẫn cất công tới, xin cảm ơn.', 'にもかかわらず'],
        ],
      ],
      [
        'TO-ITTEMO',
        '～といっても (Nói là... nhưng thực ra...)',
        'といっても',
        'Nói là vậy thôi chứ thực chất mức độ không như người nghe tưởng',
        'Đính chính hoặc làm rõ giới hạn thực tế so với ấn tượng ban đầu của từ vừa nói.',
        'V/A/N(thường) + といっても',
        'Ví dụ: Nói là biết nấu ăn nhưng chỉ làm được món trứng rán thôi.',
        ['N/V + といっても'],
        '料理ができるといっても、目玉焼きくらいです。',
        'Nói là biết nấu ăn thôi chứ chỉ cỡ trứng ốp la thôi.',
        [
          ['北海道は涼しいといっても、昼間は少し暑いです。', 'ほっかいどうはすずしいといっても、ひるまはすこしあついです。', 'Nói Hokkaido mát thôi chứ ban trưa vẫn hơi nóng đấy.', 'といっても'],
          ['一人暮らしといっても、実家のすぐ近くです。', 'ひとりぐらしといっても、じっかのすぐちかくです。', 'Nói là sống một mình thôi chứ ở ngay sát nhà bố mẹ.', 'といっても'],
        ],
      ],
    ],
  },
  {
    id: 'L06',
    number: 6,
    title: 'Bài 6: Xu hướng & Trạng thái (～がち・～ぎみ・～っぽい・～かける)',
    topics: ['tendency', 'aspect'],
    rules: [
      [
        'GACHI',
        'Vます / N + がちだ (Hay có xu hướng xấu)',
        'がち',
        'Thường hay bị / Có khuynh hướng thiên về (thường tiêu cực)',
        'Chỉ thói quen hoặc hiện tượng không tốt dễ lặp đi lặp lại.',
        'V(bỏ ます) + がちだ · N + がちだ',
        'VD: 休みがち (hay nghỉ), 忘れがち (hay quên), 病気がち (hay ốm vặt).',
        ['Vます + がち', 'N + がち'],
        '冬は運動不足になりがちです。',
        'Mùa đông thường dễ bị thiếu vận động.',
        [
          ['最近は忙しくて、連絡を忘れがちです。', 'さいきんはいそがしくて、れんらくをわすれがちです。', 'Gần đây bận quá nên tôi rất hay quên liên lạc.', 'がちです'],
          ['一人暮らしだと野菜が不足しがちになる。', 'ひとりぐらしだとやさいがふそくしがちになる。', 'Sống một mình thường hay bị thiếu hụt rau củ.', 'がちになる'],
        ],
      ],
      [
        'GIMI',
        'Vます / N + ぎみ (Có hơi hướng / Hơi có dấu hiệu)',
        'ぎみ',
        'Hơi có vẻ / Cảm thấy hơi bị... (trạng thái cơ thể, tình hình)',
        'Diễn tả dấu hiệu nhẹ của một trạng thái đang xuất hiện (hơi cảm, hơi mệt, hơi muộn).',
        'V(bỏ ます) + ぎみ · N + ぎみ',
        'Khác với 「がち」 (tần suất nhiều lần), 「ぎみ」 nói trạng thái hiện tại.',
        ['Vます/N + ぎみ'],
        '昨日から少し風邪ぎみです。',
        'Từ hôm qua tôi hơi có dấu hiệu bị cảm một chút.',
        [
          ['最近少し太りぎみなので、運動を始めました。', 'さいきんすこしふとりぎみなので、うんどうをはじめました。', 'Gần đây hơi tăng cân chút nên tôi bắt đầu tập thể dục.', 'ぎみ'],
          ['電車は五分ほど遅れぎみに走っています。', 'でんしゃはごふんほどおくれぎみにはしっています。', 'Tàu điện đang chạy hơi trễ khoảng 5 phút.', 'ぎみに'],
        ],
      ],
      [
        'KAKERU',
        'Vます + かける (Đang làm dở / Sắp sửa)',
        'かける',
        'Làm dở dang giữa chừng / Sắp sửa',
        'Chỉ hành động bắt đầu làm nhưng dừng giữa chừng, hoặc sắp sửa xảy ra ngay tức khắc.',
        'V(bỏ ます) + かける · V(bỏ ます) + かけの + N',
        'VD: 読みかけの本 (cuốn sách đang đọc dở), 消えかける (sắp tắt lịm).',
        ['Vます + かける', 'Vます + かけの + N'],
        '机の上に読みかけの本が置いてある。',
        'Trên bàn có đặt quyển sách đang đọc dở.',
        [
          ['何か言いかけたのに、急に黙ってしまった。', 'なにかいいかけたのに、きゅうにだまってしまった。', 'Định nói điều gì đó dở lời vậy mà lại im bặt.', 'かけた'],
          ['沈みかけた太陽がとても綺麗でした。', 'しずみかけたたいようがとてもきれいでした。', 'Mặt trời lúc sắp lặn trông đẹp tuyệt vời.', 'かけた'],
        ],
      ],
    ],
  },
  {
    id: 'L07',
    number: 7,
    title: 'Bài 7: Trạng thái Kéo dài (～きり・～っぱなし・～だらけ)',
    topics: ['state', 'degree'],
    rules: [
      [
        'PPANASHI',
        'Vます + っぱなし (Cứ để nguyên vậy chẳng dọn)',
        'っぱなし',
        'Làm xong rồi để mặc nguyên trạng như vậy (trách móc / lơ đễnh)',
        'Chê trách việc làm gì đó rồi bỏ mặc không xử lý bước tiếp theo (bật đèn quên tắt, mở cửa quên đóng).',
        'V(bỏ ます) + っぱなしにする / だ',
        'Dùng với động từ hành động một lần rồi kéo dài hậu quả.',
        ['Vます + っぱなし'],
        'エアコンをつけっぱなしにして出かけてしまった。',
        'Tôi bật điều hòa rồi để nguyên thế ra ngoài mất rồi.',
        [
          ['窓を開けっぱなしにすると虫が入ってきますよ。', 'まどをあけっぱなしにするとむしがはいってきますよ。', 'Cứ mở toang cửa sổ để nguyên thế thì côn trùng bay vào đấy.', 'っぱなし'],
          ['電車の中で二時間も立ちっぱなしで足が痛い。', 'でんしゃのなかでにじかんもたちっぱなしであしがいたい。', 'Đứng suốt 2 tiếng trên tàu không nghỉ làm chân đau quá.', 'っぱなし'],
        ],
      ],
      [
        'KIRI',
        'Vた + きり / N + きり (Kể từ đó tới nay không... nữa)',
        'きり',
        'Kể từ sau lần đó là thôi biệt tăm / Chỉ có ngần ấy',
        'Nghĩa 1: Vた + きり chỉ từ lúc sự việc ấy xảy ra xong không thấy tiếp diễn nữa. Nghĩa 2: 二人きり (chỉ có hai người).',
        'Vた + きり ～ない / N + きり',
        'Văn nói cũng dùng 「～っきり」.',
        ['Vた + きり', 'N + きり'],
        '彼女とは三年前に会ったきり、一度も会っていない。',
        'Kể từ lần gặp 3 năm trước tới nay tôi chưa gặp lại cô ấy lần nào.',
        [
          ['息子は部屋に入ったきり、外に出てこない。', 'むすこはへやにはいったきり、そとにでてこない。', 'Con trai vào phòng xong là ở lì trong đó chẳng ra ngoài.', 'きり'],
          ['二人きりでゆっくり話したいことがあります。', 'ふたりきりでゆっくりはなしたいことがあります。', 'Tôi có chuyện muốn nói riêng chỉ hai người với nhau.', 'きり'],
        ],
      ],
      [
        'DARAKE',
        'N + だらけ (Toàn là / Đầy rẫy — nghĩa tiêu cực)',
        'だらけ',
        'Đầy dẫy, toàn là (những thứ lộn xộn / bẩn / sai)',
        'Diễn tả bề mặt hoặc nội dung bị phủ kín bởi thứ không mong muốn (bùn đất, lỗi sai, vết xước).',
        'N + だらけだ / だらけの + N',
        'Khác với 「ばかり」 hoặc 「いっぱい」 không mang nghĩa tiêu cực thuần như 「だらけ」.',
        ['N + だらけ'],
        'この作文は漢字の間違いだらけだ。',
        'Bài văn này toàn là lỗi sai chữ Hán.',
        [
          ['雨の日にサッカーをして靴が泥だらけになった。', 'あめのひにサッカーをしてくつがどろだらけになった。', 'Đá bóng ngày mưa nên giày dính đầy bùn đất.', 'だらけ'],
          ['机の上が古い書類だらけで片付かない。', 'つくえのうえがふるいしょるいだらけでかたづかない。', 'Trên bàn toàn giấy tờ cũ lộn xộn không dọn nổi.', 'だらけ'],
        ],
      ],
    ],
  },
  {
    id: 'L08',
    number: 8,
    title: 'Bài 8: Thái độ, Lập trường & Cảm xúc (～にとって・～てたまらない・～わけがない)',
    topics: ['stance', 'emotion'],
    rules: [
      [
        'NI-TOTTE',
        'N + にとって (Đối với — xét trên lập trường của N)',
        'にとって',
        'Đối với ai đó mà nói (đánh giá giá trị/tầm quan trọng)',
        'Đưa ra nhận xét, đánh giá đứng từ góc nhìn của một cá nhân hay tập thể.',
        'N(người/tổ chức) + にとって(は/も) + Đánh giá',
        'Phân biệt với 「に対して」 (hành động/thái độ hướng vào đối tượng).',
        ['N + にとって'],
        '留学生にとって、アルバイトの経験は貴重だ。',
        'Đối với du học sinh mà nói, kinh nghiệm làm thêm rất quý giá.',
        [
          ['私にとって、家族の笑顔が一番大切です。', 'わたしにとって、かぞくのえがおがいちばんたいせつです。', 'Đối với tôi, nụ cười của gia đình là quan trọng nhất.', 'にとって'],
          ['この漢字辞典は初心者にとってとても使いやすい。', 'このかんじじてんはしょしんしゃにとってとてもつかいやすい。', 'Cuốn từ điển Kanji này rất dễ dùng đối với người mới học.', 'にとって'],
        ],
      ],
      [
        'TE-TAMARANAI',
        '～てたまらない / ～てしかたがない',
        'てたまらない',
        'Rất... không thể chịu nổi (cảm xúc mãnh liệt)',
        'Diễn tả cảm giác cơ thể hoặc tâm lý dâng trào tự nhiên đến mức không kìm nén được.',
        'Vて / Aくて / Aなで + たまらない / しかたがない',
        'Thường đi với từ chỉ cảm xúc/sinh lý: 嬉しい, 眠い, 寂しい, 会いたい.',
        ['Aくて/Vて + たまらない'],
        '早く家族に会いたくてたまらない。',
        'Tôi muốn sớm gặp gia đình đến mức không chịu nổi.',
        [
          ['夏休みで国へ帰れるので、嬉しくてたまらない。', 'なつやすみでくにへかえるので、うれしくてたまらない。', 'Nghỉ hè được về nước nên tôi vui sướng vô cùng.', 'てたまらない'],
          ['夜遅くまで起きていたので、眠くてしかたがない。', 'よるおそくまでおきていたので、ねむくてしかたがない。', 'Thức khuya quá nên giờ buồn ngủ không chịu nổi.', 'てしかたがない'],
        ],
      ],
      [
        'WAKE-GA-NAI',
        '～わけがない / ～わけにはいかない',
        'わけがない / わけにはいかない',
        'Làm gì có chuyện... / Không thể làm được vì ràng buộc đạo lý',
        '「わけがない」: phủ định tuyệt đối theo logic. 「わけにはいかない」: dù muốn cũng không thể vì lý do xã hội/trách nhiệm.',
        'V(thường) + わけがない · Vる + わけにはいかない',
        'Cặp ngữ pháp hay xuất hiện cùng nhau trong đề thi N3.',
        ['Vる + わけがない', 'Vる + わけにはいかない'],
        '試験の前日なので、遊びに行くわけにはいかない。',
        'Vì là hôm trước ngày thi nên không thể đi chơi được.',
        [
          ['練習もせずに上手になるわけがない。', 'れんしゅうもせずにじょうずになるわけがない。', 'Không luyện tập mà đòi giỏi lên thì làm gì có chuyện đó.', 'わけがない'],
          ['みんなが頑張っているので、私だけ休むわけにはいきません。', 'みんなががんばっているので、わたしだけやすむわけにはいきません。', 'Mọi người đều đang cố gắng nên mình tôi nghỉ sao được.', 'わけにはいきません'],
        ],
      ],
    ],
  },
];

const SOUMATOME_N3_SPEC: CompactN3Chapter[] = [
  {
    id: 'W01',
    number: 1,
    title: 'Tuần 1: Thời điểm & Khoảng thời gian (～うちに・～たとたん・～最中に)',
    topics: ['time'],
    rules: [
      [
        'TOTAN',
        'Vた + とたん(に) (Ngay khoảnh khắc vừa mới... thì bất ngờ)',
        'とたんに',
        'Ngay vừa lúc... thì bỗng nhiên (điều bất ngờ xảy ra)',
        'Hai sự việc nối tiếp nhau ngay trong tích tắc; vế sau mang tính bất ngờ ngoài dự đoán.',
        'Vた + とたん(に)',
        'Vế sau KHÔNG dùng câu ý chí/mệnh lệnh.',
        ['Vた + とたんに'],
        '立ち上がったとたんに、めまいがした。',
        'Ngay khoảnh khắc vừa đứng dậy thì tôi bị chóng mặt.',
        [
          ['窓を開けたとたん、強い風が入ってきた。', 'まどをあけたとたん、つよいかぜがはいってきた。', 'Vừa mở cửa sổ ra thì gió mạnh thổi ùa vào.', 'とたん'],
          ['電車を降りたとたんに、雨が降り出した。', 'でんしゃをおりたとたんに、あめがふりだした。', 'Ngay lúc vừa bước xuống tàu thì trời đổ mưa.', 'とたんに'],
        ],
      ],
      [
        'SAICHUU',
        'Vている / Nの + 最中に (Đúng ngay giữa lúc đang...)',
        '最中に',
        'Đúng ngay lúc đang làm gì thì có chuyện xen vào',
        'Nhấn mạnh hành động đang diễn ra ở cao trào nhất thì sự việc khác bất ngờ cắt ngang.',
        'Vている + 最中に · N(hành động) + の最中に',
        'N là danh từ mang tính sự kiện (会議・授業・食事).',
        ['Vている/Nの + 最中に'],
        '会議の最中に携帯が鳴ってしまった。',
        'Đúng ngay giữa cuộc họp thì điện thoại reo mất.',
        [
          ['試験を受けている最中に、急に停電になった。', 'しけんをうけているさいちゅうに、きゅうにていでんになった。', 'Đúng lúc đang làm bài thi thì bỗng nhiên mất điện.', '最中に'],
          ['大事な話をしている最中に、邪魔をしないでほしい。', 'だいじなはなしをしているさいちゅうに、じゃまをしないでほしい。', 'Đúng lúc đang nói chuyện quan trọng đừng làm phiền nhé.', '最中に'],
        ],
      ],
    ],
  },
  {
    id: 'W02',
    number: 2,
    title: 'Tuần 2: Quan hệ & Đối tượng (～について・～に対して・～をめぐって)',
    topics: ['relation'],
    rules: [
      [
        'NI-TAISHITE',
        'N + に対して (Đối với / Trái ngược với)',
        'に対して',
        'Hướng thái độ/hành động tới đối tượng N / Trong khi ngược lại...',
        'Nghĩa 1: Thái độ, ứng xử đối với ai đó. Nghĩa 2: So sánh tương phản giữa hai đối tượng.',
        'N + に対して · Mệnh đề + のに対して',
        'Phân biệt với 「にとって」 (đánh giá từ góc nhìn của N).',
        ['N + に対して'],
        '目上の人に対して丁寧な言葉を使います。',
        'Dùng ngôn từ lịch sự đối với người bề trên.',
        [
          ['客に対して失礼な態度をとってはいけません。', 'きゃくにたいしてしつれいなたいどをとってはいけません。', 'Không được có thái độ thất lễ đối với khách hàng.', 'に対して'],
          ['兄が活発なのに対して、弟は静かだ。', 'あにがかっぱつなのに対して、おとうとはしずかだ。', 'Trái với anh trai năng động, em trai rất trầm tính.', 'のに対して'],
        ],
      ],
      [
        'WO-MEGUTTE',
        'N + をめぐって (Xoay quanh vấn đề tranh luận)',
        'をめぐって',
        'Xoay quanh chủ đề / tranh cãi về vấn đề N',
        'Nhiều người cùng tranh luận, bàn bạc hoặc cạnh tranh xoay quanh một chủ đề trọng tâm.',
        'N + をめぐって + V · N + をめぐる + N',
        'Vế sau thường là 議論する・話し合う・対立する.',
        ['N + をめぐって'],
        '新しい規則をめぐって、活発な議論が行われた。',
        'Cuộc thảo luận sôi nổi đã diễn ra xoay quanh quy định mới.',
        [
          ['環境問題をめぐって、各国の代表が話し合っている。', 'かんきょうもんだいをめぐって、かっこくのだいひょうがはなしあっている。', 'Đại biểu các nước đang bàn bạc xoay quanh vấn đề môi trường.', 'をめぐって'],
          ['計画の方針をめぐって意見が対立した。', 'けいかくのほうしんをめぐっていけんがたいりつした。', 'Ý kiến đối lập nhau xoay quanh phương châm kế hoạch.', 'をめぐって'],
        ],
      ],
    ],
  },
  {
    id: 'W03',
    number: 3,
    title: 'Tuần 3: Giới hạn & Đưa ra ví dụ (～をはじめ・～を中心に・～とは限らない)',
    topics: ['scope', 'example'],
    rules: [
      [
        'WO-HAJIME',
        'N + をはじめ(として) (Trước hết phải kể đến / Tiêu biểu là...)',
        'をはじめ',
        'Tiêu biểu như N, và còn nhiều thứ khác tương tự',
        'Nêu ra một đại diện tiêu biểu nhất trước khi liệt kê phạm vi rộng hơn.',
        'N + をはじめ(として) + Danh từ rộng hơn',
        'Trang trọng, hay gặp trong tin tức và giới thiệu văn hóa.',
        ['N + をはじめ'],
        '日本には寿司をはじめ、美味しい料理がたくさんある。',
        'Nhật Bản có rất nhiều món ngon, tiêu biểu trước hết phải kể đến Sushi.',
        [
          ['東京をはじめ、日本の大都市はどこも交通が便利だ。', 'とうきょうをはじめ、にほんのだいとしはどこもこうつうがべんりだ。', 'Các thành phố lớn ở Nhật tiêu biểu là Tokyo nơi nào giao thông cũng tiện.', 'をはじめ'],
          ['部長をはじめ、社員全員がその計画に賛成した。', 'ぶちょうをはじめ、しゃいんぜんいんがそのけいかくにさんせいした。', 'Từ trưởng phòng cho tới toàn thể nhân viên đều đồng ý kế hoạch.', 'をはじめ'],
        ],
      ],
      [
        'TOWA-KAGIRANAI',
        '～とは限らない (Chưa chắc đã... / Không hẳn lúc nào cũng...)',
        'とは限らない',
        'Chưa chắc đã / Không nhất thiết lúc nào cũng đúng như vậy',
        'Phủ định nhẹ một nhận định chung có tính tuyệt đối, thường đi với 「いつも・必ずしも・みんな」.',
        'Thể thông thường + とは限らない',
        'Hay thi ở phần Ngữ pháp N3 & Đọc hiểu!',
        ['Thể thường + とは限らない'],
        '高いものが必ずしもいいとは限らない。',
        'Đồ đắt tiền chưa chắc lúc nào cũng tốt.',
        [
          ['有名な店だからといって、いつも美味しいとは限らない。', 'ゆうめいなみせだからといって、いつもおいしいとはかぎらない。', 'Không phải cứ là quán nổi tiếng thì lúc nào cũng ngon.', 'とは限らない'],
          ['日本人がみんな漢字を全部書けるとは限りません。', 'にほんじんがみんなかんじをぜんぶかけるとはかぎりません。', 'Không hẳn mọi người Nhật đều viết được hết tất cả Kanji.', 'とは限りません'],
        ],
      ],
    ],
  },
  {
    id: 'W04',
    number: 4,
    title: 'Tuần 4: Phương tiện, Căn cứ & Dựa vào (～をもとに・～を通じて)',
    topics: ['means', 'basis'],
    rules: [
      [
        'WO-MOTONI',
        'N + をもとに(して) (Dựa trên cơ sở, chất liệu gốc là N)',
        'をもとに',
        'Dựa trên / Lấy cảm hứng từ nguyên bản N để sáng tạo ra...',
        'Lấy dữ liệu, câu chuyện thật, tiểu thuyết làm nền tảng để viết phim, báo cáo hoặc tạo tác phẩm mới.',
        'N + をもとに(して) + V',
        'Thường dùng trong sản xuất phim ảnh, nghiên cứu, viết báo cáo.',
        ['N + をもとに'],
        'この映画は実話をもとにして作られた。',
        'Bộ phim này được làm dựa trên câu chuyện có thật.',
        [
          ['アンケートの結果をもとに、新しい商品を開発します。', 'アンケートのけっかをもとに、あたらしいしょうひんをかいはつします。', 'Phát triển sản phẩm mới dựa trên kết quả khảo sát.', 'をもとに'],
          ['昔の有名な小説をもとにアニメが制作された。', 'むかしのゆうめいなしょうせつをもとにアニメがせいさくされた。', 'Bộ Anime được sản xuất dựa trên cuốn tiểu thuyết nổi tiếng xưa.', 'をもとに'],
        ],
      ],
      [
        'WO-TSUUJITE',
        'N + を通じて / を通して (Thông qua N / Suốt khoảng thời gian N)',
        'を通じて / を通して',
        'Thông qua cầu nối N / Xuyên suốt cả giai đoạn N',
        'Nghĩa 1: qua trung gian người/phương tiện. Nghĩa 2: diễn ra đều đặn suốt một năm/bốn mùa.',
        'N + を通じて / N + を通して',
        '「一年を通じて暖かい」 = ấm áp suốt cả năm.',
        ['N + を通じて', 'N + を通して'],
        'アルバイトを通じて、日本のマナーを学んだ。',
        'Thông qua công việc làm thêm tôi đã học được tác phong Nhật.',
        [
          ['この地域は一年を通して気候が温暖で住みやすい。', 'このちいきはいちねんをとおしてきこうがおんだんですみやすい。', 'Khu vực này khí hậu ôn hòa dễ sống suốt cả năm.', 'を通して'],
          ['友人を通じて、今の仕事を紹介してもらいました。', 'ゆうじんをつうじて、いまのしごとをしょうかいしてもらいました。', 'Thông qua bạn bè tôi được giới thiệu công việc hiện tại.', 'を通じて'],
        ],
      ],
    ],
  },
  {
    id: 'W05',
    number: 5,
    title: 'Tuần 5: Diễn tả Dự đoán, Khuynh hướng & Khẳng định nhẹ (～恐れがある・～に違いない)',
    topics: ['conjecture'],
    rules: [
      [
        'NI-CHIGAINAI',
        '～に違いない (Chắc chắn không sai được)',
        'に違いない',
        'Chắc chắn là... (suy đoán đầy tin tưởng của người nói)',
        'Người nói tin chắc gần như 90% dựa trên trực giác hoặc bằng chứng bản thân nắm rõ.',
        'V/A/N(thường, bỏ だ) + に違いない',
        'Khác 「はずだ」 (dựa trên quy luật khách quan), 「に違いない」 mang chủ quan mạnh hơn.',
        ['Thể thường + に違いない'],
        'あの二人は昔から親しいので、きっとうまくいくに違いない。',
        'Hai người họ thân từ lâu rồi nên chắc chắn sẽ suôn sẻ thôi.',
        [
          ['こんな時間に連絡が来るなんて、何かあったに違いない。', 'こんなじかんにれんらくがくるなんて、なにかあったにちがいない。', 'Giờ này mà có người gọi chắc chắn là có chuyện gì rồi.', 'に違いない'],
          ['彼の日本語の発音なら、面接も合格するに違いありません。', 'かれのにほんごのはつおんなら、めんせつもごうかくするにちがいありません。', 'Với phát âm tiếng Nhật của cậu ấy thì chắc chắn sẽ đỗ phỏng vấn.', 'に違いありません'],
        ],
      ],
      [
        'OSORE-GA-ARU',
        'Vる / Nの + 恐れがある (E rằng có nguy cơ...)',
        '恐れがある',
        'Có nguy cơ / E rằng sẽ xảy ra sự việc xấu',
        'Thường dùng trong dự báo thiên tai, y tế, tin tức cảnh báo rủi ro có thể xảy ra.',
        'Vる + 恐れがある · N + の + 恐れがある',
        'LUÔN dùng với kết quả tiêu cực hoặc nguy hiểm.',
        ['Vる/Nの + 恐れがある'],
        '今夜、大きな台風が近づく恐れがあります。',
        'Đêm nay có nguy cơ một cơn bão lớn sẽ tiến lại gần.',
        [
          ['このまま雨が降り続けば、川があふれる恐れがある。', 'このままあめがふりつづけば、かわがあふれるおそれがある。', 'Nếu trời cứ mưa tiếp thế này thì có nguy cơ sông bị tràn bờ.', '恐れがある'],
          ['操作を間違えるとデータが消える恐れがあります。', 'そうさをまちがえるとデータがきえるおそれがあります。', 'Nếu thao tác nhầm thì có nguy cơ dữ liệu sẽ bị mất.', '恐れがあります'],
        ],
      ],
    ],
  },
  {
    id: 'W06',
    number: 6,
    title: 'Tuần 6: Bắt buộc & Đánh giá tổng kết (～ざるを得ない・～ことになっている)',
    topics: ['obligation', 'rule'],
    rules: [
      [
        'KOTO-NI-NATTEIRU',
        'Vる / Vない + ことになっている',
        'ことになっている',
        'Theo quy định / Theo lịch trình đã định thì...',
        'Diễn tả nội quy, quy tắc, truyền thống hoặc lịch trình đã được tập thể/tổ chức ấn định sẵn.',
        'Vる / Vない + ことになっている',
        'Phân biệt với 「ことにしている」 (thói quen tự bản thân đặt ra).',
        ['Vる/Vない + ことになっている'],
        'この教室では日本語しか話してはいけないことになっている。',
        'Theo nội quy lớp này thì chỉ được phép nói tiếng Nhật.',
        [
          ['来月から新しいプロジェクトが始まることになっています。', 'らいげつからあたらしいプロジェクトがはじまることになっています。', 'Theo kế hoạch thì tháng sau dự án mới sẽ bắt đầu.', 'ことになっています'],
          ['このアパートではペットを飼ってはいけないことになっている。', 'このアパートではペットをかってはいけないことになっている。', 'Theo quy định chung cư này thì không được nuôi thú cưng.', 'ことになっている'],
        ],
      ],
      [
        'ZARU-WO-ENAI',
        'Vない + ざるを得ない (Đành phải / Không còn cách nào khác)',
        'ざるを得ない',
        'Đành phải làm (dù không muốn nhưng buộc phải làm)',
        'Tình thế bắt buộc khiến bản thân dù không thích vẫn phải chấp nhận làm.',
        'Vない(bỏ ない) + ざるを得ない · する -> せざるを得ない',
        'Lưu ý bất quy tắc 「する」 biến thành 「せざるを得ない」.',
        ['Vない(gốc) + ざるを得ない'],
        '台風が近づいているので、旅行は中止せざるを得ない。',
        'Vì bão đang đến gần nên đành phải hủy chuyến du lịch thôi.',
        [
          ['他に人がいないので、私が引き受けざるを得なかった。', 'ほかにひとがいないので、わたしがひきうけざるをえなかった。', 'Vì chẳng còn ai khác nên tôi đành phải nhận lấy việc đó.', 'ざるを得なかった'],
          ['これほど証拠がそろっていては、事実を認めざるを得ない。', 'これほどしょうこがそろっていては、じじつをみとめざるをえない。', 'Bằng chứng đầy đủ thế này rồi thì đành phải thừa nhận sự thật.', 'ざるを得ない'],
        ],
      ],
    ],
  },
];

const MINNA_N3_SPEC: CompactN3Chapter[] = [
  {
    id: 'MN3-01',
    number: 1,
    title: 'Bài 1–2: Mở rộng câu nhờ vả & Giải thích nhẹ nhàng',
    topics: ['communication'],
    rules: [
      [
        'TE-ITADAKEMASHOU',
        '～ていただけませんか / ～てもらえませんか',
        'ていただけませんか',
        'Xin vui lòng giúp tôi... được không ạ?',
        'Cách nhờ vả lịch sự trong công sở và giao tiếp với người Nhật.',
        'Vて + いただけませんか / いただけないでしょうか',
        '「～ていただけないでしょうか」 còn lịch sự và mềm hơn nữa.',
        ['Vて + いただけないでしょうか'],
        '少しこの文章をチェックしていただけないでしょうか。',
        'Anh kiểm tra giúp tôi đoạn văn này một chút được không ạ?',
        [
          ['お忙しいところ恐縮ですが、サインをしていただけませんか。', 'おいそがしいところきょうしゅくですが、サインをしていただけませんか。', 'Biết anh bận nhưng anh ký xác nhận giúp tôi được không ạ?', 'ていただけませんか'],
          ['もう一回ゆっくり説明していただけないでしょうか。', 'もういっかいゆっくりせつめいしていただけないでしょうか。', 'Anh giải thích lại chậm hơn một lần nữa được không ạ?', 'ていただけないでしょうか'],
        ],
      ],
      [
        'MONODA',
        'Vる + ものだ / Vた + ものだ',
        'ものだ',
        'Vốn dĩ là đương nhiên / Hồi xưa thường hay...',
        'Vる+ものだ diễn tả chân lý hiển nhiên hoặc đạo lý chung; Vた+ものだ gợi nhớ kỷ niệm xa xưa thường hay làm gì.',
        'Vる + ものだ (đạo lý) · Vた + ものだ (hồi ức)',
        'Ngữ khí sâu lắng, chiêm nghiệm.',
        ['Vる + ものだ', 'Vた + ものだ'],
        '子供のころ、よく川で泳いだものだ。',
        'Hồi nhỏ tôi thường hay ra sông bơi lắm.',
        [
          ['時間はあっという間に過ぎるものですね。', 'じかんはあっというまにすぎるものですね。', 'Thời gian trôi nhanh như chớp mắt ấy nhỉ.', 'ものですね'],
          ['若いときはよく友達と夜遅くまで語り合ったものだ。', 'わかいときはよくともだちとよるおそくまでかたりあったものだ。', 'Thời trẻ tôi thường trò chuyện cùng bạn tới tận khuya.', 'ものだ'],
        ],
      ],
    ],
  },
  {
    id: 'MN3-02',
    number: 2,
    title: 'Bài 3–4: Trích dẫn truyền đạt 「～とのこと・～と言われている」',
    topics: ['quotation'],
    rules: [
      [
        'TONOKOTO',
        '～とのことだ (Nghe báo lại rằng / Theo tin nhắn thì...)',
        'とのことだ',
        'Nghe nói là / Được thông báo là... (trích dẫn gián tiếp lịch sự)',
        'Truyền đạt lại lời nhắn qua điện thoại, email, thông báo từ người khác một cách trang trọng.',
        'Thể thông thường + とのことです',
        'Dùng rất nhiều trong môi trường công sở Nhật Bản khi nghe điện thoại chuyển lời.',
        ['Thể thường + とのことです'],
        '山田部長は三時ごろ戻られるとのことです。',
        'Trưởng phòng Yamada nhắn là khoảng 3 giờ ngài sẽ quay lại ạ.',
        [
          ['受付の方によると、今日の会議は一時間遅れるとのことです。', 'うけつけのかたによると、きょうのかいぎはいちじかんおくれるとのことです。', 'Theo nhân viên lễ tân báo lại thì cuộc họp hôm nay trễ 1 tiếng.', 'とのことです'],
          ['メールが届いて、明日の予定が変更になったとのことだ。', 'メールがとどいて、あしたのよていがへんこうになったとのことだ。', 'Email gửi tới báo rằng lịch trình ngày mai đã thay đổi.', 'とのことだ'],
        ],
      ],
      [
        'TO-IWARETEIRU',
        '～と 言われている (Được người ta nói rằng / Tương truyền rằng)',
        'と言われている',
        'Được cho là / Người ta vẫn nói là...',
        'Đưa ra nhận định chung phổ biến trong xã hội hoặc kiến thức khoa học được công nhận rộng rãi.',
        'Thể thông thường + と言われている',
        'Thường xuất hiện trong các đoạn văn giải thích khoa học và văn hóa.',
        ['Thể thường + と言われている'],
        '緑茶は体にとてもいいと言われている。',
        'Trà xanh được cho là rất tốt cho sức khỏe.',
        [
          ['日本は四季がはっきりしている国だと言われています。', 'にほんはしきがはっきりしているくにだといわれています。', 'Nhật Bản được nói là đất nước có bốn mùa rõ rệt.', 'と言われています'],
          ['十分な睡眠をとると記憶力が上がると言われている。', 'じゅうぶんなすいみんをとるときおくりょくがあがるといわれている。', 'Người ta nói ngủ đủ giấc sẽ giúp tăng trí nhớ.', 'と言われている'],
        ],
      ],
    ],
  },
  {
    id: 'MN3-03',
    number: 3,
    title: 'Bài 5–6: Nỗ lực hoàn thành 「～ていく・～てみる」 & Tổng kết N3',
    topics: ['effort', 'completion'],
    rules: [
      [
        'KOTONI-SURU',
        'Vる / Vない + ことにしている (Đặt làm thói quen cá nhân)',
        'ことにしている',
        'Tôi luôn giữ thói quen làm / không làm...',
        'Chỉ quy tắc cá nhân tự đặt ra và duy trì đều đặn trong sinh hoạt.',
        'Vる / Vない + ことにしている',
        'Phân biệt rõ với 「ことになっている」 (quy định chung).',
        ['Vる/Vない + ことにしている'],
        '毎朝、単語を十個覚えることにしている。',
        'Mỗi sáng tôi đều đặt ra thói quen nhớ 10 từ vựng.',
        [
          ['健康のために、エレベーターを使わず階段を使うことにしています。', 'けんこうのために、エレベーターをつかわずかいだんをつかうことにしています。', 'Vì sức khỏe tôi giữ thói quen đi cầu thang bộ thay thang máy.', 'ことにしています'],
          ['太りたくないので、夜九時以降は何も食べないことにしている。', 'ふとりたくないので、よるくじいこうはなにもたべないことにしている。', 'Không muốn tăng cân nên tôi tự đặt ra thói quen không ăn gì sau 9h tối.', 'ことにしている'],
        ],
      ],
      [
        'NAKA-DE-KAKE',
        '～おかげで・～せいで (Mở rộng trung cấp)',
        'わりに',
        'Tuy... vậy mà lại (so với tiêu chuẩn chung)',
        '「わりに」 so sánh mức độ thực tế tốt hơn hoặc bất ngờ hơn so với vẻ ngoài/giá cả/tuổi tác.',
        'V/A(thường) + わりに · Nの + わりに',
        'VD: Giá rẻ mà ngon (安いわりにおいしい).',
        ['V/A(thường)/Nの + わりに'],
        'このレストランは値段が安いわりに、とても美味しい。',
        'Nhà hàng này tuy giá rẻ vậy mà đồ ăn lại rất ngon.',
        [
          ['彼はまだ来日して半年なわりに、日本語がとても上手だ。', 'かれはまだらいにちしてはんとしなわりに、にほんごがとてもじょうずだ。', 'Cậu ấy mới tới Nhật nửa năm mà tiếng Nhật đã giỏi đến bất ngờ.', 'わりに'],
          ['よく食べたわりに、体重がまったく増えていない。', 'よくたべたわりに、たいじゅうがまったくふえていない。', 'Tuy ăn khá nhiều nhưng cân nặng hoàn toàn không tăng.', 'わりに'],
        ],
      ],
    ],
  },
];

const BUILT_SK3 = buildN3FromCompact('SHINKANZEN_N3', 'N3-SKZ', SHINKANZEN_N3_EXTRA_SPEC);
const BUILT_SMT3 = buildN3FromCompact('SOUMATOME_N3', 'N3-SMT', SOUMATOME_N3_SPEC);
const BUILT_MN3 = buildN3FromCompact('MINNA_N3', 'N3-MN3', MINNA_N3_SPEC);

export const shinkanzenN3ExtraChapters: GrammarChapter[] = BUILT_SK3.chapters;

export const soumatomeN3Book: GrammarBook = {
  id: 'SOUMATOME_N3',
  title: 'Nihongo Sou Matome Ngữ pháp N3',
  level: 'N3',
  chapters: BUILT_SMT3.chapters,
};

export const minnaN3GrammarBook: GrammarBook = {
  id: 'MINNA_N3',
  title: 'Minna no Nihongo Trung cấp I — Ngữ pháp N3',
  level: 'N3',
  chapters: BUILT_MN3.chapters,
};

export const allN3ExtraGrammarSentences: GrammarSentence[] = [
  ...BUILT_SK3.sentences,
  ...BUILT_SMT3.sentences,
  ...BUILT_MN3.sentences,
];
