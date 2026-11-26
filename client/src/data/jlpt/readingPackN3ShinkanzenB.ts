/**
 * N3 reading tagged by Shin Kanzen Master N3 grammar lessons — passages for Bài 5–8.
 */
import type { JLPTReadingPassage } from './jlptDataset';
import { situationReading } from './situationPackUtils';

export const SKZ_READING_N3_B: JLPTReadingPassage[] = [
  situationReading({
    id: 'skz-n3-r5',
    level: 'N3',
    moduleId: 'reading-medium',
    situation: 'Mua sắm',
    title: 'Chiếc máy giặt rẻ bất ngờ',
    paragraphs: [
      '先月、インターネットで洗濯機を買った。有名なメーカーの製品にしては、値段がとても安かった。',
      '届いてみると、確かに安いわりに機能は多かった。ところが、説明書が全部英語だった。英語が読めないわけではないものの、専門的な言葉が多くて、使い方がよく分からなかった。',
      '妹に相談すると、「安いからといって、よく調べずに買うからだよ」と笑われた。自分だって安い服ばかり買うくせに、と思ったが、何も言わなかった。',
      '結局、メーカーに電話して、日本語の説明書を送ってもらった。電話の対応は丁寧で、残念ながら手間はかかったものの、今ではとても満足している。',
    ],
    translation:
      'Tháng trước tôi mua máy giặt trên mạng. So với sản phẩm của hãng nổi tiếng thì giá rất rẻ. Khi hàng đến, quả thật so với giá thì nhiều chức năng. Nhưng sách hướng dẫn toàn tiếng Anh. Không phải tôi không đọc được tiếng Anh, nhưng nhiều từ chuyên môn nên không hiểu rõ cách dùng. Hỏi em gái thì bị cười: "Tại chị thấy rẻ là mua mà không tìm hiểu kỹ". Tôi nghĩ "bản thân em cũng toàn mua quần áo rẻ vậy mà", nhưng không nói gì. Cuối cùng tôi gọi cho hãng để được gửi sách hướng dẫn tiếng Nhật. Họ trả lời điện thoại lịch sự, tuy rất tiếc là tốn công nhưng giờ tôi rất hài lòng.',
    vocab: [
      ['機能', 'きのう', 'chức năng'],
      ['専門的', 'せんもんてき', 'mang tính chuyên môn'],
      ['手間', 'てま', 'công sức, thời gian'],
    ],
    questions: [
      { prompt: '洗濯機の値段について、筆者はどう思いましたか。', options: ['有名なメーカーの製品なのに安い', '高すぎる', '普通だ', '機能のわりに高い'], correct: 0, explanation: '「有名なメーカーの製品にしては、値段がとても安かった」.' },
      { prompt: '「安いわりに機能は多かった」の意味はどれですか。', options: ['rẻ nên ít chức năng', 'so với giá rẻ thì chức năng nhiều', 'đắt nhưng nhiều chức năng', 'rẻ và ít chức năng'], correct: 1, explanation: '〜わりに = so với ~ thì.' },
      { prompt: '筆者が使い方が分からなかった理由は何ですか。', options: ['英語が全く読めなかったから', '説明書が英語で、専門的な言葉が多かったから', '説明書がなかったから', '機械が壊れていたから'], correct: 1, explanation: '「英語が読めないわけではないものの、専門的な言葉が多くて」.' },
      { prompt: '「ものの」と同じ使い方の文はどれですか。', options: ['買ったものの、まだ使っていない。', '買ったものだから、使った。', '買うものなら、買いたい。', '買ったもので、使った。'], correct: 0, explanation: '〜ものの = tuy ~ nhưng.' },
      { prompt: '妹は筆者にどう言いましたか。', options: ['安い物はいい物だ', '安いからといって、よく調べずに買ったのが悪い', 'もっと高い物を買うべきだ', 'メーカーに電話して'], correct: 1, explanation: '「安いからといって、よく調べずに買うからだよ」.' },
      { prompt: '「安い服ばかり買うくせに」から分かる筆者の気持ちはどれですか。', options: ['感謝', '不満', '喜び', '心配'], correct: 1, explanation: '〜くせに thể hiện sự bất mãn, trách móc.' },
      { prompt: '筆者は最後にどうしましたか。', options: ['洗濯機を返品した', 'メーカーに電話して日本語の説明書をもらった', '妹に使い方を聞いた', '新しい洗濯機を買った'], correct: 1, explanation: '「メーカーに電話して、日本語の説明書を送ってもらった」.' },
      { prompt: '筆者の今の気持ちはどれですか。', options: ['後悔している', 'とても満足している', '怒っている', 'まだ使い方が分からない'], correct: 1, explanation: '「今ではとても満足している」.' },
    ],
  }),
  situationReading({
    id: 'skz-n3-r6',
    level: 'N3',
    moduleId: 'reading-medium',
    situation: 'Bệnh viện',
    title: 'Thói quen của người trẻ hiện nay',
    paragraphs: [
      '最近、若い人の間で朝ごはんを食べない人が増えつつある。忙しい朝はつい朝食を抜きがちだが、それが体調を崩す原因になるおそれがある。',
      'ある調査によると、朝ごはんを食べない学生は、授業中に集中力が落ちる傾向があるそうだ。また、夜遅くまでスマホを見てばかりいる人は、寝不足気味になりやすい。',
      '医者は「生活のリズムが乱れると、体の調子は悪くなる一方です」と話す。',
      'まずは、起きる時間を決めることから始めてはどうだろうか。読みかけの本を寝る前に開くのもいいだろう。スマホより、ずっと眠りやすくなるはずだ。',
    ],
    translation:
      'Gần đây trong giới trẻ, số người không ăn sáng đang dần tăng lên. Buổi sáng bận rộn hay bỏ bữa sáng, nhưng điều đó có nguy cơ gây hại sức khỏe. Theo một khảo sát, sinh viên không ăn sáng có xu hướng giảm tập trung trong giờ học. Ngoài ra, người cứ xem điện thoại đến khuya dễ bị thiếu ngủ. Bác sĩ nói "Nhịp sinh hoạt rối loạn thì cơ thể sẽ ngày càng xấu đi". Trước hết, thử bắt đầu từ việc cố định giờ dậy thì sao? Mở cuốn sách đang đọc dở trước khi ngủ cũng tốt. Chắc chắn sẽ dễ ngủ hơn nhiều so với điện thoại.',
    vocab: [
      ['体調を崩す', 'たいちょうをくずす', 'sức khỏe giảm sút'],
      ['集中力', 'しゅうちゅうりょく', 'sức tập trung'],
      ['乱れる', 'みだれる', 'rối loạn'],
    ],
    questions: [
      { prompt: '「増えつつある」の意味はどれですか。', options: ['đã tăng xong', 'đang dần tăng lên', 'sắp tăng', 'không tăng'], correct: 1, explanation: '〜つつある = đang dần ~.' },
      { prompt: '朝ごはんを抜くと、どうなるおそれがありますか。', options: ['太る', '体調を崩す', '早く起きられる', '集中力が上がる'], correct: 1, explanation: '「体調を崩す原因になるおそれがある」.' },
      { prompt: '「抜きがち」の意味はどれですか。', options: ['không bao giờ bỏ', 'hay bỏ (có xu hướng)', 'phải bỏ', 'muốn bỏ'], correct: 1, explanation: '〜がち = hay, có xu hướng (tiêu cực).' },
      { prompt: '調査で分かったことは何ですか。', options: ['朝ごはんを食べない学生は集中力が落ちやすい', '朝ごはんを食べると太る', 'スマホは体にいい', '学生はよく寝ている'], correct: 0, explanation: '「授業中に集中力が落ちる傾向がある」.' },
      { prompt: '寝不足気味になりやすいのはどんな人ですか。', options: ['朝早く起きる人', '夜遅くまでスマホを見てばかりいる人', '本を読む人', '運動する人'], correct: 1, explanation: '「夜遅くまでスマホを見てばかりいる人は、寝不足気味になりやすい」.' },
      { prompt: '医者の言葉「悪くなる一方」の意味はどれですか。', options: ['tốt lên dần', 'ngày càng xấu đi', 'lúc tốt lúc xấu', 'không thay đổi'], correct: 1, explanation: '〜一方だ = ngày càng ~ (một chiều).' },
      { prompt: '筆者がすすめていることはどれですか。', options: ['朝ごはんを抜くこと', '起きる時間を決めること', '寝る前にスマホを見ること', '薬を飲むこと'], correct: 1, explanation: '「起きる時間を決めることから始めてはどうだろうか」.' },
      { prompt: '「読みかけの本」とはどんな本ですか。', options: ['まだ読んでいない本', '読み始めて途中の本', '読み終わった本', '借りた本'], correct: 1, explanation: '〜かけ = đang dở dang.' },
    ],
  }),
  situationReading({
    id: 'skz-n3-r7',
    level: 'N3',
    moduleId: 'reading-medium',
    situation: 'Nhà ở & Hàng xóm',
    title: 'Căn phòng của em trai',
    paragraphs: [
      '弟の部屋はいつも散らかっている。床は服や雑誌だらけで、歩く場所もない。',
      '昨日も、弟はエアコンをつけっぱなしで出かけてしまった。窓も開けたままだったので、母はとても怒っていた。',
      '弟は大学に入って一人暮らしを始めたきり、実家にほとんど帰ってこなかった。久しぶりに帰ってきたと思ったら、一日中寝てばかりで、何も手伝わずに遊びに行ってしまう。',
      'それでも母は、弟のために料理を作り続けている。母にとって、弟はいつまでも子どもなのだろう。',
    ],
    translation:
      'Phòng em trai tôi lúc nào cũng bừa bộn. Sàn toàn quần áo và tạp chí, không có chỗ đi. Hôm qua em lại ra ngoài để điều hòa bật nguyên. Cửa sổ cũng để mở nguyên nên mẹ rất giận. Từ khi vào đại học sống một mình, em hầu như không về nhà. Lâu lắm mới về thì cả ngày toàn ngủ, chẳng giúp gì mà đi chơi luôn. Dù vậy mẹ vẫn tiếp tục nấu ăn cho em. Đối với mẹ, chắc em trai mãi là đứa trẻ.',
    vocab: [
      ['散らかる', 'ちらかる', 'bừa bộn'],
      ['実家', 'じっか', 'nhà bố mẹ'],
      ['一人暮らし', 'ひとりぐらし', 'sống một mình'],
    ],
    questions: [
      { prompt: '弟の部屋はどんな様子ですか。', options: ['とてもきれい', '服や雑誌だらけ', '何もない', '広くて明るい'], correct: 1, explanation: '「床は服や雑誌だらけ」— だらけ = đầy, toàn là.' },
      { prompt: '母が怒ったのはなぜですか。', options: ['弟がエアコンをつけっぱなしで窓も開けたまま出かけたから', '弟が帰ってこなかったから', '弟が料理を食べなかったから', '弟が部屋を掃除したから'], correct: 0, explanation: '「エアコンをつけっぱなしで…窓も開けたままだった」.' },
      { prompt: '「つけっぱなし」の意味はどれですか。', options: ['đã tắt', 'để bật nguyên (không tắt)', 'vừa bật', 'bật lại'], correct: 1, explanation: '〜っぱなし = để nguyên trạng thái.' },
      { prompt: '「一人暮らしを始めたきり」の意味に近いものはどれですか。', options: ['bắt đầu sống một mình rồi thì không (về nhà)', 'trước khi sống một mình', 'vừa sống một mình vừa về nhà', 'nếu sống một mình'], correct: 0, explanation: '〜たきり = từ khi ~ thì cứ thế không ~.' },
      { prompt: '久しぶりに帰ってきた弟は何をしましたか。', options: ['家事を手伝った', '一日中寝てばかりいた', '料理を作った', '勉強した'], correct: 1, explanation: '「一日中寝てばかりで」.' },
      { prompt: '「何も手伝わずに」の意味はどれですか。', options: ['giúp đỡ mọi thứ', 'không giúp gì mà', 'muốn giúp', 'được giúp'], correct: 1, explanation: '〜ずに = không ~ mà.' },
      { prompt: '母は今も何をしていますか。', options: ['弟の部屋を掃除している', '弟のために料理を作り続けている', '弟に怒り続けている', '弟に電話している'], correct: 1, explanation: '「料理を作り続けている」— 〜続ける = tiếp tục.' },
      { prompt: '最後の文から分かる筆者の考えはどれですか。', options: ['母は弟に厳しすぎる', '母にとって弟はいつまでも子どもだ', '弟はもう大人だ', '母は料理が嫌いだ'], correct: 1, explanation: '「母にとって、弟はいつまでも子どもなのだろう」.' },
    ],
  }),
  situationReading({
    id: 'skz-n3-r8',
    level: 'N3',
    moduleId: 'reading-medium',
    situation: 'Sự kiện & Sở thích',
    title: 'Bài phát biểu của đội trưởng',
    paragraphs: [
      '私にとって、このチームの仲間は家族のような存在です。試合に負けた日は悔しくてたまりませんでしたが、仲間の言葉に何度も助けられました。',
      'キャプテンとして、練習を休むわけにはいきませんでした。けがをした日も、みんなの練習を見に行かずにはいられませんでした。',
      '後輩の皆さん、失敗を怖がることはありません。むしろ、失敗から学ぶべきです。最初から上手な人なんているわけがないのですから。',
      '最後に、いつも応援してくださった保護者の皆さんに対して、心から感謝を申し上げます。皆さんのおかげで、楽しくてしょうがない三年間でした。',
    ],
    translation:
      'Đối với tôi, đồng đội trong đội là như gia đình. Những ngày thua trận tôi tiếc không chịu nổi, nhưng đã nhiều lần được lời nói của đồng đội cứu giúp. Là đội trưởng, tôi không thể nghỉ tập. Kể cả hôm bị thương, tôi cũng không thể không đi xem mọi người tập. Các em khóa sau, không cần phải sợ thất bại. Ngược lại, nên học từ thất bại. Bởi vì không thể nào có người giỏi ngay từ đầu. Cuối cùng, tôi xin chân thành cảm ơn các phụ huynh đã luôn cổ vũ. Nhờ mọi người, 3 năm qua vui không tả xiết.',
    vocab: [
      ['存在', 'そんざい', 'sự tồn tại'],
      ['後輩', 'こうはい', 'đàn em, khóa sau'],
      ['保護者', 'ほごしゃ', 'phụ huynh'],
    ],
    questions: [
      { prompt: '筆者にとって、チームの仲間はどんな存在ですか。', options: ['ライバル', '家族のような存在', '先生', '知らない人'], correct: 1, explanation: '「私にとって…家族のような存在です」.' },
      { prompt: '「悔しくてたまりませんでした」の意味はどれですか。', options: ['không tiếc lắm', 'tiếc không chịu nổi', 'vui quá', 'muốn khóc nhưng không khóc'], correct: 1, explanation: '〜てたまらない = ~ không chịu nổi.' },
      { prompt: 'キャプテンとして、筆者がしなかったことは何ですか。', options: ['練習を休むこと', '練習を見に行くこと', '仲間と話すこと', '試合に出ること'], correct: 0, explanation: '「練習を休むわけにはいきませんでした」= không thể nghỉ.' },
      { prompt: 'けがをした日、筆者は何をしましたか。', options: ['家で寝ていた', '練習を見に行った', '病院に入院した', '試合に出た'], correct: 1, explanation: '「見に行かずにはいられませんでした」= không thể không đi xem.' },
      { prompt: '筆者は後輩に何と言っていますか。', options: ['失敗を怖がるべきだ', '失敗を怖がる必要はなく、失敗から学ぶべきだ', '失敗しないように練習を休むべきだ', '上手な人だけ試合に出るべきだ'], correct: 1, explanation: '「怖がることはありません…失敗から学ぶべきです」.' },
      { prompt: '「上手な人なんているわけがない」の意味はどれですか。', options: ['chắc chắn có người giỏi', 'không thể nào có người giỏi (ngay từ đầu)', 'người giỏi rất nhiều', 'người giỏi không muốn chơi'], correct: 1, explanation: '〜わけがない = không thể nào.' },
      { prompt: '筆者はだれに対して感謝していますか。', options: ['監督', '保護者の皆さん', '相手チーム', '先生'], correct: 1, explanation: '「保護者の皆さんに対して、心から感謝を申し上げます」.' },
      { prompt: '筆者は三年間をどう感じていますか。', options: ['つらかった', 'とても楽しかった', '退屈だった', '短すぎた'], correct: 1, explanation: '「楽しくてしょうがない三年間でした」.' },
    ],
  }),
];

/** Shin Kanzen lesson a reading passage is tagged with (from its id), or null. */
export function getSkzReadingLesson(passage: { id: string }): number | null {
  const m = /^skz-n3-r(\d+)$/.exec(passage.id);
  return m ? Number(m[1]) : null;
}
