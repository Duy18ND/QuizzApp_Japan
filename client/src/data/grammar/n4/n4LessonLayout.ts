/**
 * N4 grammar as one chapter per lesson (Bài 26–50), matching the N4 vocabulary lessons.
 * Existing points keep their ids (progress stays valid); `+CODE` points are written here.
 */
import type { GrammarChapter, SmartGrammarRule } from '../../../types/grammarEngine';
import { buildBookFromCompact, type CompactN4Rule } from './allGrammarN4';

const BOOK_ID = 'MINNA_N4';

const NEW_RULES: Record<string, CompactN4Rule[]> = {
  L27: [
    [
      'MIERU-KIKOERU', '見えます・聞こえます (Nhìn thấy / Nghe thấy)', 'みえる・きこえる',
      'Tự nhiên nhìn thấy / nghe thấy',
      'Diễn tả hình ảnh hay âm thanh tự lọt vào mắt, tai, không cần cố ý. Khác 見られます・聞けます (có điều kiện để xem, nghe).',
      'N が 見えます / 聞こえます', 'Đối tượng đi với が.',
      ['N が 見えます', 'N が 聞こえます'],
      '窓から山が見えます。', 'Từ cửa sổ nhìn thấy núi.',
      [
        ['隣の部屋から音楽が聞こえます。', 'となりのへやからおんがくがきこえます。', 'Nghe thấy nhạc từ phòng bên.', '聞こえます'],
        ['ここから海が見えますよ。', 'ここからうみがみえますよ。', 'Từ đây nhìn thấy biển đấy.', '見えます'],
        ['遠くから子どもの声が聞こえる。', 'とおくからこどものこえがきこえる。', 'Nghe thấy tiếng trẻ con từ xa.', '聞こえる'],
      ],
    ],
  ],
  L29: [
    [
      'TEIRU-STATE', 'Vて います (Trạng thái kết quả)', 'ています',
      'Đang ở trạng thái đã ~',
      'Dùng tự động từ + ています để tả trạng thái còn lại sau một sự thay đổi: cửa đang mở, cốc đang vỡ.',
      'N が + Vて (tự động từ) います', 'Phân biệt với V tha động từ + てあります (ai đó đã làm sẵn).',
      ['N が Vて います'],
      '窓が開いています。', 'Cửa sổ đang mở.',
      [
        ['コップが割れています。', 'コップがわれています。', 'Cái cốc bị vỡ.', 'ています'],
        ['教室の電気が消えています。', 'きょうしつのでんきがきえています。', 'Đèn lớp học đang tắt.', 'ています'],
        ['この道は込んでいます。', 'このみちはこんでいます。', 'Con đường này đang đông.', 'でいます'],
      ],
    ],
  ],
  L31: [
    [
      'TSUMORI', 'Vる / Vない つもりです (Dự định)', 'つもり',
      'Tôi định ~ / không định ~',
      'Nói về dự định đã suy nghĩ chắc chắn của người nói.',
      'Vる / Vない + つもりです', 'Lịch đã ấn định thì dùng 予定です.',
      ['Vる + つもりです', 'Vない + つもりです'],
      '来年、日本へ行くつもりです。', 'Năm sau tôi định đi Nhật.',
      [
        ['夏休みは国へ帰らないつもりです。', 'なつやすみはくにへかえらないつもりです。', 'Hè này tôi định không về nước.', 'つもりです'],
        ['毎日、日記を書くつもりです。', 'まいにち、にっきをかくつもりです。', 'Tôi định viết nhật ký mỗi ngày.', 'つもりです'],
        ['大学を出たら、働くつもりです。', 'だいがくをでたら、はたらくつもりです。', 'Ra trường tôi định đi làm.', 'つもりです'],
      ],
    ],
    [
      'MADA-TEIMASEN', 'まだ Vて いません (Vẫn chưa)', 'まだていません',
      'Vẫn chưa làm ~',
      'Việc chưa xảy ra tính đến hiện tại, thường là sẽ làm sau.',
      'まだ + Vて いません', 'Trả lời cho câu hỏi もう～ましたか.',
      ['まだ Vて いません'],
      'レポートはまだ書いていません。', 'Báo cáo tôi vẫn chưa viết.',
      [
        ['昼ご飯はまだ食べていません。', 'ひるごはんはまだたべていません。', 'Tôi vẫn chưa ăn trưa.', 'ていません'],
        ['その映画はまだ見ていません。', 'そのえいがはまだみていません。', 'Phim đó tôi chưa xem.', 'ていません'],
        ['返事はまだ来ていません。', 'へんじはまだきていません。', 'Hồi âm vẫn chưa đến.', 'ていません'],
      ],
    ],
  ],
  L32: [
    [
      'DESHOU-KAMO', '～でしょう・～かもしれません (Chắc là / Có lẽ)', 'でしょう・かもしれない',
      'Chắc là ~ / Có thể là ~',
      'でしょう: phỏng đoán khá chắc (hay dùng trong dự báo). かもしれません: khả năng thấp hơn.',
      'Thể thường + でしょう / かもしれません (N, Aな bỏ だ)', 'Văn nói thân mật: ～かも.',
      ['Thể thường + でしょう', 'Thể thường + かもしれません'],
      '明日は雨が降るでしょう。', 'Ngày mai chắc trời mưa.',
      [
        ['午後は雪になるかもしれません。', 'ごごはゆきになるかもしれません。', 'Buổi chiều có thể có tuyết.', 'かもしれません'],
        ['彼は忙しいから、来ないでしょう。', 'かれはいそがしいから、こないでしょう。', 'Anh ấy bận nên chắc không đến.', 'でしょう'],
        ['約束の時間に間に合わないかもしれません。', 'やくそくのじかんにまにあわないかもしれません。', 'Có thể không kịp giờ hẹn.', 'かもしれません'],
      ],
    ],
  ],
  L33: [
    [
      'TO-KAITE-TSUTAETE', '～と書いてあります・～と伝えていただけませんか (Ghi là / Nhắn rằng)', 'とかいてある',
      'Có ghi là ~ / Nhắn giúp rằng ~',
      'と đánh dấu nội dung được viết, được nói hoặc được nhắn lại.',
      'Nội dung + と + 書いてあります / 伝えてください', 'Nội dung đặt trong 「」 hoặc dùng thể thường.',
      ['～と書いてあります', '～と伝えていただけませんか'],
      'あの紙に「禁煙」と書いてあります。', 'Tờ giấy kia ghi "Cấm hút thuốc".',
      [
        ['ドアに「休み」と書いてあります。', 'ドアにやすみとかいてあります。', 'Trên cửa ghi "Nghỉ".', 'と書いてあります'],
        ['田中さんに、少し遅れると伝えていただけませんか。', 'たなかさんに、すこしおくれるとつたえていただけませんか。', 'Nhắn giúp anh Tanaka là tôi đến muộn chút được không?', 'と伝えて'],
        ['先生は、明日テストがあると言っていました。', 'せんせいは、あしたテストがあるといっていました。', 'Thầy nói là mai có kiểm tra.', 'と言っていました'],
      ],
    ],
  ],
  L37: [
    [
      'NIYOTTE-CREATOR', 'N に よって (Bị động chỉ người làm ra)', 'によって',
      'Được ~ bởi N',
      'Trong câu bị động nói về việc sáng tác, phát minh, phát hiện, người thực hiện đi với によって.',
      'N に よって + V bị động', 'Dùng với 書く・作る・建てる・発明する・発見する.',
      ['N に よって V(bị động)'],
      '電話はベルによって発明されました。', 'Điện thoại được Bell phát minh.',
      [
        ['この絵は有名な画家によって描かれました。', 'このえはゆうめいながかによってかかれました。', 'Bức tranh này do họa sĩ nổi tiếng vẽ.', 'によって'],
        ['この寺は王様によって建てられました。', 'このてらはおうさまによってたてられました。', 'Ngôi chùa này được nhà vua cho xây.', 'によって'],
        ['この星は日本人によって発見されました。', 'このほしはにほんじんによってはっけんされました。', 'Ngôi sao này do người Nhật phát hiện.', 'によって'],
      ],
    ],
  ],
  L38: [
    [
      'NO-WA-DESU', '～のは N です (Nhấn mạnh thành phần)', 'のは',
      'Cái / Người / Nơi ~ chính là N',
      'Dùng の để biến cả vế câu thành chủ đề, rồi nhấn mạnh phần thông tin ở cuối.',
      'V thể thường + のは + N です', 'Chủ ngữ trong vế trước dùng が.',
      ['V + のは N です'],
      '私が生まれたのは、小さい町です。', 'Nơi tôi sinh ra là một thị trấn nhỏ.',
      [
        ['一番大変だったのは、漢字の勉強です。', 'いちばんたいへんだったのは、かんじのべんきょうです。', 'Vất vả nhất là việc học kanji.', 'のは'],
        ['この料理を作ったのは、父です。', 'このりょうりをつくったのは、ちちです。', 'Người nấu món này là bố tôi.', 'のは'],
        ['初めて会ったのは、三年前です。', 'はじめてあったのは、さんねんまえです。', 'Lần đầu gặp là 3 năm trước.', 'のは'],
      ],
    ],
  ],
  L41: [
    [
      'ITADAKU-KUDASARU', 'いただきます・くださいます・やります (Cho – nhận lịch sự)', 'いただく・くださる',
      'Nhận từ người trên / Người trên cho / Cho người dưới',
      'いただく: nhận từ người trên. くださる: người trên cho mình. やる: cho người dưới, con vật, cây.',
      'N を いただく / くださる / やる', 'Chú ý trợ từ: 先生に(から)いただく・先生がくださる.',
      ['N を いただきます', 'N を くださいます', 'N を やります'],
      '先生に辞書をいただきました。', 'Tôi được thầy tặng từ điển.',
      [
        ['部長がお土産をくださいました。', 'ぶちょうがおみやげをくださいました。', 'Trưởng phòng cho tôi quà.', 'くださいました'],
        ['毎朝、花に水をやります。', 'まいあさ、はなにみずをやります。', 'Mỗi sáng tôi tưới hoa.', 'やります'],
        ['社長から手紙をいただきました。', 'しゃちょうからてがみをいただきました。', 'Tôi nhận được thư của giám đốc.', 'いただきました'],
      ],
    ],
    [
      'TE-ITADAKU', 'Vて いただきます・Vて くださいます (Được người trên làm cho)', 'ていただく',
      'Được (người trên) làm ~ cho',
      'Cách nói biết ơn khi người trên làm giúp mình việc gì.',
      'Vて + いただく / くださる', 'Làm cho người dưới: Vて やる.',
      ['Vて いただきます', 'Vて くださいます'],
      '先生に作文を直していただきました。', 'Tôi được thầy sửa bài văn.',
      [
        ['課長が駅まで送ってくださいました。', 'かちょうがえきまでおくってくださいました。', 'Trưởng ban đã tiễn tôi ra ga.', 'てくださいました'],
        ['先輩に仕事を教えていただきました。', 'せんぱいにしごとをおしえていただきました。', 'Tôi được đàn anh chỉ việc.', 'ていただきました'],
        ['娘に本を読んでやりました。', 'むすめにほんをよんでやりました。', 'Tôi đọc sách cho con gái.', 'てやりました'],
      ],
    ],
  ],
  L42: [
    [
      'NONI-USE', 'Vる のに / N に (Dùng để, tốn để)', 'のに',
      'Dùng vào việc ~ / Để làm ~ thì tốn…',
      'のに chỉ công dụng, mức tốn kém hay sự cần thiết cho một việc; đi với 使う・かかる・必要だ・便利だ・役に立つ.',
      'Vる のに / N に + 使います・かかります', 'Khác のに mang nghĩa "vậy mà".',
      ['Vる のに', 'N に'],
      'このはさみは花を切るのに使います。', 'Kéo này dùng để cắt hoa.',
      [
        ['家を建てるのに一年かかりました。', 'いえをたてるのにいちねんかかりました。', 'Xây nhà mất một năm.', 'のに'],
        ['この辞書は勉強するのに便利です。', 'このじしょはべんきょうするのにべんりです。', 'Từ điển này tiện cho việc học.', 'のに'],
        ['旅行にパスポートが必要です。', 'りょこうにパスポートがひつようです。', 'Đi du lịch cần hộ chiếu.', 'に'],
      ],
    ],
  ],
  L44: [
    [
      'SUGIRU', '～すぎます (Quá mức)', 'すぎる',
      '~ quá (quá mức cần thiết)',
      'Diễn tả mức độ vượt quá giới hạn, thường dẫn đến điều không tốt.',
      'Vます / Aい(bỏ い) / Aな + すぎます', 'いい → よすぎます.',
      ['Vます + すぎます', 'A + すぎます'],
      'ゆうべお酒を飲みすぎました。', 'Tối qua tôi uống quá nhiều rượu.',
      [
        ['この問題は難しすぎます。', 'このもんだいはむずかしすぎます。', 'Câu này khó quá.', 'すぎます'],
        ['食べすぎて、おなかが痛いです。', 'たべすぎて、おなかがいたいです。', 'Ăn quá nhiều nên đau bụng.', 'すぎて'],
        ['この部屋は静かすぎる。', 'このへやはしずかすぎる。', 'Phòng này yên tĩnh quá.', 'すぎる'],
      ],
    ],
    [
      'KU-NI-SURU', '～く / ～に します (Làm cho trở nên)', 'くする・にする',
      'Làm cho ~ / Chọn ~',
      'Chủ động tác động làm sự vật thay đổi trạng thái; N にします còn dùng khi lựa chọn.',
      'Aい → く します · Aな / N → に します', 'Tự thay đổi thì dùng ～くなります / ～になります.',
      ['Aく します', 'N に します'],
      'テレビの音を小さくしてください。', 'Hãy vặn nhỏ tiếng TV.',
      [
        ['髪を短くしました。', 'かみをみじかくしました。', 'Tôi đã cắt tóc ngắn.', 'くしました'],
        ['部屋をきれいにしてください。', 'へやをきれいにしてください。', 'Hãy dọn phòng sạch.', 'にして'],
        ['私はコーヒーにします。', 'わたしはコーヒーにします。', 'Tôi chọn cà phê.', 'にします'],
      ],
    ],
  ],
  L49: [
    [
      'O-KUDASAI', 'お / ご ～ください (Xin mời làm ~)', 'おください',
      'Xin quý khách vui lòng ~',
      'Cách mời, yêu cầu rất lịch sự dành cho khách hoặc người trên.',
      'お + Vます + ください · ご + N + ください', 'Không dùng cho động từ đặc biệt: 見る → ご覧ください.',
      ['お Vます ください', 'ご N ください'],
      'こちらでお待ちください。', 'Xin vui lòng chờ ở đây.',
      [
        ['どうぞおかけください。', 'どうぞおかけください。', 'Xin mời ngồi.', 'ください'],
        ['こちらの用紙にご記入ください。', 'こちらのようしにごきにゅうください。', 'Xin điền vào tờ này.', 'ご記入ください'],
        ['足元にお気をつけください。', 'あしもとにおきをつけください。', 'Xin chú ý bước chân.', 'ください'],
      ],
    ],
  ],
  L50: [
    [
      'GOZAIMASU', 'ございます・～でございます・おります (Khiêm nhường, lịch sự)', 'ございます',
      'Có / Là (rất lịch sự)',
      'ございます thay cho あります; でございます thay cho です; おります thay cho います khi nói về mình hoặc phía mình.',
      'N でございます · N が ございます', 'Hay dùng trong công việc, tiếp khách, điện thoại.',
      ['N でございます', 'N が ございます', 'おります'],
      'はい、さくら病院でございます。', 'Vâng, đây là bệnh viện Sakura.',
      [
        ['お手洗いは二階にございます。', 'おてあらいはにかいにございます。', 'Nhà vệ sinh ở tầng 2 ạ.', 'ございます'],
        ['私は営業部の山田でございます。', 'わたしはえいぎょうぶのやまだでございます。', 'Tôi là Yamada phòng kinh doanh.', 'でございます'],
        ['父はただいま外出しております。', 'ちちはただいまがいしゅつしております。', 'Bố tôi hiện đang ra ngoài ạ.', 'おります'],
      ],
    ],
  ],
};

/** lesson → [title, refs]. A ref is an existing grammar id or `+CODE` from NEW_RULES. */
const LESSONS: Record<number, [title: string, refs: string[]]> = {
  26: ['Giải thích & Nhờ vả', ['N4-MNN-L26-NDESU', 'N4-MNN-L26-ITADAKEMASENKA']],
  27: ['Khả năng & Nhìn – nghe', ['N4-MNN-L26-POTENTIAL', '+MIERU-KIKOERU', 'N4-SKZ-SK4-01-SHIKA-NAI']],
  28: ['Vừa làm vừa & Liệt kê lý do', ['N4-MNN-L28-NAGARA', 'N4-MNN-L28-SHI-REASON']],
  29: ['Trạng thái & Lỡ làm', ['+TEIRU-STATE', 'N4-MNN-L28-TE-SHIMAU']],
  30: ['Chuẩn bị sẵn', ['N4-MNN-L30-TE-ARU', 'N4-MNN-L30-TE-OKU']],
  31: ['Ý định & Dự định', ['N4-MNN-L30-VOLITIONAL-TO-OMOU', '+TSUMORI', '+MADA-TEIMASEN']],
  32: ['Lời khuyên & Phỏng đoán', ['N4-MNN-L32-HOU-GA-II', '+DESHOU-KAMO']],
  33: ['Mệnh lệnh, Biển báo & Lời nhắn', ['N4-MNN-L32-IMPERATIVE-PROHIBITIVE', 'N4-MNN-L32-TO-IU-IMI', '+TO-KAITE-TSUTAETE']],
  34: ['Làm theo & Trình tự', ['N4-MNN-L34-TOORI-NI', 'N4-MNN-L34-NAIDE-ATO-DE']],
  35: ['Điều kiện', ['N4-MNN-L34-BA-CONDITION', 'N4-SKZ-SK4-06-NARA-TARA-BA-TO']],
  36: ['Mục tiêu & Thay đổi', ['N4-MNN-L36-YOUNI-GOAL', 'N4-MNN-L36-YOUNI-NARU']],
  37: ['Thể bị động', ['N4-MNN-L36-PASSIVE-VOICE', '+NIYOTTE-CREATOR']],
  38: ['Danh từ hóa bằng の', ['N4-MNN-L38-NO-DESU-GA', '+NO-WA-DESU']],
  39: ['Nguyên nhân & Lý do', ['N4-MNN-L38-TE-REASON', 'N4-MNN-L38-NODE-POLITE-REASON', 'N4-SKZ-SK4-04-OKAGE-DE', 'N4-SKZ-SK4-04-SEI-DE']],
  40: ['Câu hỏi gián tiếp & Làm thử', ['N4-MNN-L40-KADOUKA', 'N4-MNN-L40-TEMIRU', 'N4-SKZ-SK4-06-KA-SHIRA-KANA']],
  41: ['Cho – nhận lịch sự', ['+ITADAKU-KUDASARU', '+TE-ITADAKU', 'N4-SKZ-SK4-03-SHIKATA-GA-NAI']],
  42: ['Mục đích & Công dụng', ['N4-SKZ-SK4-05-TAME-NI', '+NONI-USE']],
  43: ['Trông có vẻ & Đi rồi về', ['N4-MNN-L40-SOU-DESU-APPEAR', 'N4-SKZ-SK4-01-TEKURU-TEIKU']],
  44: ['Quá mức & Dễ – khó', ['+SUGIRU', 'N4-MNN-L44-YASUI-NIKUI', '+KU-NI-SURU']],
  45: ['Trường hợp & Trái mong đợi', ['N4-MNN-L44-BA-AI-WA', 'N4-SKZ-SK4-04-NONI-CONTRAST', 'N4-SKZ-SK4-06-TO-SHITEMO-TEMO']],
  46: ['Thời điểm & Chắc chắn', ['N4-MNN-L44-TOKORO-ASPECT', 'N4-SKZ-SK4-01-TABAKARI', 'N4-SKZ-SK4-03-HAZU-DA']],
  47: ['Nghe nói & Có vẻ', ['N4-MNN-L47-SOU-DESU-HEARSAY', 'N4-SKZ-SK4-05-YOU-DA', 'N4-SKZ-SK4-05-RASHII-INFERENCE']],
  48: ['Sai khiến & Xin phép', ['N4-SKZ-SK4-02-SHIEKI', 'N4-SKZ-SK4-02-SASETE-KUDASAI', 'N4-SKZ-SK4-02-SHIEKI-UKEMI', 'N4-SKZ-SK4-03-WA-KE-DEWA-NAI']],
  49: ['Tôn kính ngữ', ['N4-MNN-L47-SONKEIGO', '+O-KUDASAI']],
  50: ['Khiêm nhường ngữ', ['N4-MNN-L47-KENJOUGO', '+GOZAIMASU']],
};

let newSentences: ReturnType<typeof buildBookFromCompact>['sentences'] = [];

/** Build the 25 lesson chapters from the points the app already had plus the new ones. */
export function buildN4LessonChapters(existing: SmartGrammarRule[]): GrammarChapter[] {
  const built = buildBookFromCompact(
    BOOK_ID,
    BOOK_ID,
    'N4-MNN',
    Object.entries(NEW_RULES).map(([id, rules]) => ({ id, number: 0, title: id, topics: [], rules })),
  );
  newSentences = built.sentences;
  const byId = new Map(existing.map((g) => [g.id, g]));
  const fresh = new Map<string, SmartGrammarRule>();
  for (const ch of built.book.chapters) {
    for (const g of ch.grammars) fresh.set(`${ch.id}|${g.id.slice(`N4-MNN-${ch.id}-`.length)}`, g);
  }
  const used = new Set<string>();
  const chapters: GrammarChapter[] = Object.entries(LESSONS).map(([num, [title, refs]]) => {
    const id = `L${num}`;
    const grammars: SmartGrammarRule[] = [];
    for (const ref of refs) {
      const rule = ref.startsWith('+') ? fresh.get(`${id}|${ref.slice(1)}`) : byId.get(ref);
      if (!rule) continue;
      used.add(rule.id);
      grammars.push({ ...rule, bookId: BOOK_ID, chapterId: id });
    }
    return { id, bookId: BOOK_ID, chapterNumber: Number(num), title: `Bài ${num} · ${title}`, topics: ['n4'], grammars };
  });
  // Nothing may silently disappear: any unplaced point joins the closest lesson list at the end.
  const leftovers = existing.filter((g) => !used.has(g.id));
  if (leftovers.length > 0) {
    chapters.push({
      id: 'EXTRA',
      bookId: BOOK_ID,
      chapterNumber: 51,
      title: 'Bổ sung',
      topics: ['n4'],
      grammars: leftovers.map((g) => ({ ...g, bookId: BOOK_ID, chapterId: 'EXTRA' })),
    });
  }
  return chapters;
}

export const getN4LessonNewSentences = () => newSentences;
