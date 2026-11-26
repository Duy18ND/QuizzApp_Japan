/** Shin Kanzen N3 読解 — 第3部 広告・お知らせから情報を探そう (written for this app). */
import type { SituationReadingSpec } from '../situationPackUtils';

export const SKZ_R_PART3: SituationReadingSpec[] = [
  {
    id: 'skzr-3-1', level: 'N3', moduleId: 'reading-medium', situation: 'Mua sắm',
    title: '[SKZ 読解 3-1] 商品の広告: Quảng cáo bình giữ nhiệt',
    paragraphs: [
      '「あったか君」水筒　新発売！　朝入れたお茶が、夕方まで温かいまま。冷たい飲み物も六時間冷たさを保ちます。',
      '大きさは三種類。S（三百五十ミリ）二千円、M（五百ミリ）二千五百円、L（八百ミリ）三千二百円。色は白・青・赤の三色。ただしLサイズは白と青だけです。',
      '今月末までに二本以上お買い上げの方は、合計金額から一割引き。インターネットからのご注文は、三千円以上で送料無料になります。',
    ],
    translation: 'Bình giữ nhiệt "Attaka-kun" mới ra mắt! Trà rót buổi sáng đến chiều vẫn ấm; đồ lạnh giữ lạnh 6 tiếng. 3 cỡ: S (350ml) 2.000 yên, M (500ml) 2.500 yên, L (800ml) 3.200 yên. 3 màu trắng/xanh/đỏ, riêng cỡ L chỉ trắng và xanh. Đến cuối tháng, mua từ 2 bình được giảm 10% tổng tiền. Đặt qua mạng từ 3.000 yên được miễn phí ship.',
    vocab: [['新発売', 'しんはつばい', 'mới bán'], ['送料', 'そうりょう', 'phí vận chuyển']],
    questions: [
      { prompt: '赤いLサイズの水筒は買えますか。', options: ['買える', '買えない（Lは白と青だけ）', '今月だけ買える', 'インターネットだけで買える'], correct: 1, explanation: '「Lサイズは白と青だけ」.' },
      { prompt: 'SとMを一本ずつ今月買うといくらになりますか。', options: ['四千五百円', '四千五十円', '四千円', '三千六百円'], correct: 1, explanation: '(2000+2500)×0.9 = 4050 yên.' },
      { prompt: 'インターネットでSを一本だけ注文すると、送料はどうなりますか。', options: ['無料', 'かかる（三千円未満だから）', '一割引き', '分からない'], correct: 1, explanation: 'Chỉ 2.000 yên < 3.000 yên nên mất phí ship.' },
      { prompt: 'この水筒の特長として書かれていないものはどれですか。', options: ['温かさが続く', '冷たさも保つ', 'とても軽い', '大きさが選べる'], correct: 2, explanation: 'Không nhắc đến độ nhẹ.' },
    ],
  },
  {
    id: 'skzr-3-2', level: 'N3', moduleId: 'reading-medium', situation: 'Làm thêm & Công ty',
    title: '[SKZ 読解 3-2] 募集広告: Tuyển nhân viên làm thêm',
    paragraphs: [
      'カフェ「みどり」アルバイト募集。仕事内容：接客、飲み物作り、掃除。時間：七時から二十二時の間で、一日四時間以上、週三日以上できる方。',
      '時給：千五十円（二十一時以降は千三百円）。土日どちらかに入れる方は特に歓迎します。経験がなくても大丈夫です。研修期間（一か月）の時給は千円です。',
      '応募方法：まず電話で面接の日を決めてください。面接には写真をはった履歴書を持ってきてください。受付は午前十時から午後五時までです。',
    ],
    translation: 'Quán cà phê "Midori" tuyển làm thêm. Việc: phục vụ, pha chế, dọn dẹp. Giờ: trong khoảng 7h–22h, mỗi ngày từ 4 tiếng, mỗi tuần từ 3 ngày. Lương giờ 1.050 yên (sau 21h là 1.300). Ưu tiên người làm được T7 hoặc CN. Không cần kinh nghiệm. Thời gian đào tạo (1 tháng) lương 1.000 yên. Ứng tuyển: gọi điện đặt lịch phỏng vấn trước. Mang sơ yếu lý lịch dán ảnh. Tiếp nhận từ 10h đến 17h.',
    vocab: [['接客', 'せっきゃく', 'tiếp khách'], ['履歴書', 'りれきしょ', 'sơ yếu lý lịch'], ['研修', 'けんしゅう', 'đào tạo']],
    questions: [
      { prompt: '応募できないのはどんな人ですか。', options: ['経験がない人', '週二日だけ働きたい人', '土曜日に働ける人', '一日五時間働ける人'], correct: 1, explanation: 'Yêu cầu từ 3 ngày/tuần.' },
      { prompt: '研修が終わった後、二十時に働くと時給はいくらですか。', options: ['千円', '千五十円', '千三百円', '千百円'], correct: 1, explanation: '20h chưa đến 21h nên 1.050 yên.' },
      { prompt: '面接の日はどうやって決めますか。', options: ['店に行って決める', '電話で決める', 'メールで決める', '履歴書を送る'], correct: 1, explanation: '「まず電話で面接の日を決めてください」.' },
      { prompt: '面接に何を持っていきますか。', options: ['写真をはった履歴書', 'パスポートだけ', '研修の書類', 'お金'], correct: 0, explanation: '「写真をはった履歴書」.' },
      { prompt: '電話をかけていい時間はいつですか。', options: ['午前九時', '午後三時', '午後六時', '午後九時'], correct: 1, explanation: 'Tiếp nhận 10h–17h.' },
    ],
  },
  {
    id: 'skzr-3-3', level: 'N3', moduleId: 'reading-medium', situation: 'Du lịch & Khách sạn',
    title: '[SKZ 読解 3-3] パンフレット: Tờ rơi bảo tàng',
    paragraphs: [
      '市立科学博物館のご案内。開館時間：午前九時半〜午後五時（入館は四時半まで）。休館日：毎週月曜日（月曜日が祝日の場合は翌日）。',
      '入館料：大人六百円、大学生四百円、高校生以下は無料。二十人以上の団体は大人も学生も百円引きになります。',
      '毎週土曜日の午後二時から、子ども向けの実験教室があります。参加は無料ですが、定員三十名で、当日の朝九時半から受付で申し込みが必要です。',
    ],
    translation: 'Hướng dẫn bảo tàng khoa học thành phố. Mở 9:30–17:00 (vào cửa đến 16:30). Nghỉ thứ Hai (nếu thứ Hai là ngày lễ thì nghỉ hôm sau). Vé: người lớn 600 yên, sinh viên đại học 400, cấp ba trở xuống miễn phí. Đoàn từ 20 người, người lớn và sinh viên giảm 100 yên. Thứ Bảy 14h có lớp thí nghiệm cho trẻ em, miễn phí, giới hạn 30 người, đăng ký tại quầy từ 9:30 sáng cùng ngày.',
    vocab: [['休館日', 'きゅうかんび', 'ngày nghỉ'], ['定員', 'ていいん', 'số người giới hạn']],
    questions: [
      { prompt: '月曜日が祝日の場合、休みはいつですか。', options: ['月曜日', '火曜日', '日曜日', '休みはない'], correct: 1, explanation: 'Nghỉ hôm sau (火曜日).' },
      { prompt: '大学生の団体二十五人の一人分はいくらですか。', options: ['四百円', '三百円', '五百円', '無料'], correct: 1, explanation: '400 − 100 = 300 yên.' },
      { prompt: '午後四時四十分に着いた人はどうなりますか。', options: ['入館できる', '入館できない', '半額で入れる', '無料で入れる'], correct: 1, explanation: 'Vào cửa đến 16:30.' },
      { prompt: '実験教室に参加するにはどうしますか。', options: ['電話で前日に予約する', '当日の朝九時半から受付で申し込む', '午後二時に直接行く', 'お金を払う'], correct: 1, explanation: '当日の朝9:30から受付.' },
    ],
  },
  {
    id: 'skzr-3-4', level: 'N3', moduleId: 'reading-medium', situation: 'Nhà ở & Hàng xóm',
    title: '[SKZ 読解 3-4] お知らせ①: Thông báo cắt nước',
    paragraphs: [
      '住民の皆様へ。水道管の工事を行いますので、下の日時は水が使えません。十月十二日（水）午後一時〜午後四時。ただし、雨の場合は十四日（金）の同じ時間に行います。',
      '工事の前に、飲み水やトイレで使う水を用意しておいてください。工事が終わった後は、しばらく濁った水が出ることがあります。透明になるまで水を流してから使ってください。',
      'ご質問は管理人室（一階）までお願いします。電話での受付は午後五時までです。',
    ],
    translation: 'Gửi cư dân. Sẽ thi công đường ống nước, thời gian sau không dùng được nước: 12/10 (T4) 13h–16h. Nếu mưa thì chuyển sang 14/10 (T6) cùng giờ. Trước khi thi công hãy chuẩn bị nước uống và nước dội vệ sinh. Sau thi công có thể ra nước đục một lúc, xả đến khi trong rồi mới dùng. Thắc mắc đến phòng quản lý (tầng 1). Nhận điện thoại đến 17h.',
    vocab: [['濁る', 'にごる', 'đục'], ['透明', 'とうめい', 'trong suốt']],
    questions: [
      { prompt: '雨が降った場合、工事はいつになりますか。', options: ['中止', '十月十三日', '十月十四日の午後一時から', '次の週'], correct: 2, explanation: '14日（金）の同じ時間.' },
      { prompt: '工事の前に何をしておくべきですか。', options: ['水を用意する', '管理人に電話する', '窓を閉める', '洗濯をする'], correct: 0, explanation: 'Chuẩn bị nước uống và nước dội.' },
      { prompt: '工事の後、濁った水が出たらどうしますか。', options: ['そのまま飲む', '透明になるまで流してから使う', '管理人室に持っていく', '翌日まで使わない'], correct: 1, explanation: '「透明になるまで水を流してから」.' },
      { prompt: '質問がある場合はどうしますか。', options: ['工事の人に聞く', '管理人室に聞く', '市役所に行く', '掲示板に書く'], correct: 1, explanation: '管理人室（一階）.' },
    ],
  },
  {
    id: 'skzr-3-5', level: 'N3', moduleId: 'reading-medium', situation: 'Trường học',
    title: '[SKZ 読解 3-5] お知らせ②: Thư viện đổi quy định',
    paragraphs: [
      '図書館からのお知らせ。来年四月から貸出の方法が変わります。本は一人十冊まで、期間は二週間です。（これまでは五冊まで、一週間でした。）',
      '予約が入っていない本は、一回だけ期間を延ばすことができます。延長は返却日の前日までに、カウンターか図書館のホームページで手続きしてください。',
      '返却が遅れると、遅れた日数と同じ期間は新しい本を借りられません。雑誌と辞書は貸し出ししていませんので、館内でご利用ください。',
    ],
    translation: 'Thông báo từ thư viện. Từ tháng 4 năm sau đổi cách mượn: mỗi người tối đa 10 cuốn, 2 tuần (trước đây 5 cuốn, 1 tuần). Sách chưa có người đặt trước được gia hạn 1 lần, làm thủ tục trước ngày trả một ngày ở quầy hoặc trang web. Trả trễ thì số ngày trễ bằng số ngày không được mượn sách mới. Tạp chí và từ điển không cho mượn, đọc tại chỗ.',
    vocab: [['貸出', 'かしだし', 'cho mượn'], ['返却', 'へんきゃく', 'trả lại']],
    questions: [
      { prompt: '来年四月から何冊借りられますか。', options: ['五冊まで', '十冊まで', '二冊まで', '何冊でも'], correct: 1, explanation: '一人十冊まで.' },
      { prompt: '期間を延ばせないのはどんな本ですか。', options: ['予約が入っている本', '新しい本', '厚い本', '外国の本'], correct: 0, explanation: 'Chỉ sách chưa có đặt trước mới gia hạn.' },
      { prompt: '返却が三日遅れた場合、どうなりますか。', options: ['罰金を払う', '三日間新しい本を借りられない', '一週間借りられない', '何も起きない'], correct: 1, explanation: 'Số ngày trễ = số ngày bị khóa mượn.' },
      { prompt: '辞書を使いたい人はどうすればいいですか。', options: ['借りて家で使う', '館内で使う', '予約して借りる', 'ホームページで見る'], correct: 1, explanation: '「館内でご利用ください」.' },
    ],
  },
  {
    id: 'skzr-3-6', level: 'N3', moduleId: 'reading-medium', situation: 'Bệnh viện',
    title: '[SKZ 読解 3-6] 薬の飲み方: Hướng dẫn uống thuốc',
    paragraphs: [
      'この薬は、熱や頭の痛みを抑える薬です。一回の量：大人（十五歳以上）は二錠、十一歳から十四歳は一錠。十歳以下は飲まないでください。',
      '一日三回まで。ただし、飲んでから次に飲むまで四時間以上あけてください。空腹の時は避け、できるだけ食後に飲んでください。',
      '飲んだ後、眠くなることがありますので、車の運転はしないでください。三日飲んでも熱が下がらない場合は、薬をやめて医者に相談してください。',
    ],
    translation: 'Thuốc này hạ sốt, giảm đau đầu. Liều: người lớn (từ 15 tuổi) 2 viên, 11–14 tuổi 1 viên. Từ 10 tuổi trở xuống không uống. Tối đa 3 lần/ngày, các lần cách nhau ít nhất 4 tiếng. Tránh uống khi đói, nên uống sau ăn. Có thể buồn ngủ nên không lái xe. Uống 3 ngày mà không hạ sốt thì ngừng thuốc và hỏi bác sĩ.',
    vocab: [['錠', 'じょう', 'viên (thuốc)'], ['空腹', 'くうふく', 'bụng đói']],
    questions: [
      { prompt: '十三歳の子どもは一回何錠飲みますか。', options: ['飲まない', '一錠', '二錠', '三錠'], correct: 1, explanation: '11–14 tuổi: 1 viên.' },
      { prompt: '朝八時に飲んだ人が次に飲めるのは早くても何時ですか。', options: ['九時', '十時', '十一時', '十二時'], correct: 3, explanation: 'Cách ít nhất 4 tiếng → 12h.' },
      { prompt: '飲んだ後にしてはいけないことはどれですか。', options: ['寝ること', '車を運転すること', '食事すること', '水を飲むこと'], correct: 1, explanation: 'Không lái xe.' },
      { prompt: '三日たっても熱が下がらない時はどうしますか。', options: ['量を増やす', 'やめて医者に相談する', 'もう三日飲む', '別の薬も飲む'], correct: 1, explanation: 'Đoạn cuối.' },
    ],
  },
  {
    id: 'skzr-3-7', level: 'N3', moduleId: 'reading-medium', situation: 'Mua sắm',
    title: '[SKZ 読解 3-7] グラフ: Cách người trẻ mua sắm',
    paragraphs: [
      '下の結果は、若者三百人に「服をどこで買うことが多いか」を聞いた調査である。（一人一つ回答）',
      '五年前：デパート二十％、専門店四十五％、インターネット十五％、その他二十％。今年：デパート十％、専門店三十％、インターネット四十五％、その他十五％。',
      'この五年で、インターネットで買う人は大きく増え、ほかはすべて減っている。特に専門店は今も二番目に多いが、十五ポイント減った。',
    ],
    translation: 'Kết quả khảo sát 300 người trẻ "hay mua quần áo ở đâu" (chọn 1). 5 năm trước: bách hóa 20%, cửa hàng chuyên 45%, Internet 15%, khác 20%. Năm nay: bách hóa 10%, cửa hàng chuyên 30%, Internet 45%, khác 15%. 5 năm qua người mua qua mạng tăng mạnh, các kênh khác đều giảm. Cửa hàng chuyên vẫn đứng thứ hai nhưng giảm 15 điểm.',
    vocab: [['回答', 'かいとう', 'câu trả lời'], ['割合', 'わりあい', 'tỷ lệ']],
    questions: [
      { prompt: '今年いちばん多い買い方はどれですか。', options: ['デパート', '専門店', 'インターネット', 'その他'], correct: 2, explanation: 'Internet 45%.' },
      { prompt: 'インターネットで服を買う人の割合はどう変わりましたか。', options: ['十五％から四十五％に増えた', '四十五％から十五％に減った', '二十％から十％に減った', '変わらない'], correct: 0, explanation: '15% → 45%.' },
      { prompt: '専門店は何ポイント減りましたか。', options: ['五', '十', '十五', '三十'], correct: 2, explanation: '45 → 30.' },
      { prompt: '今年デパートで買う人は三百人のうち何人ですか。', options: ['三十人', '六十人', '九十人', '百三十五人'], correct: 0, explanation: '300 × 10% = 30.' },
    ],
  },
  {
    id: 'skzr-3-8', level: 'N3', moduleId: 'reading-medium', situation: 'Làm thêm & Công ty',
    title: '[SKZ 読解 3-8] メール（ビジネス）: Email công việc',
    paragraphs: [
      'あおい商事　営業部　田中様。いつもお世話になっております。みどり工業の中村でございます。',
      '先日ご注文いただいた商品Aですが、工場の機械の故障により、納品が予定の五月十日から五月十七日に遅れる見込みです。大変申し訳ございません。',
      '商品Bは予定どおり十日にお届けできますので、先にBだけ発送することも可能です。ご希望をお知らせください。お返事は今週の金曜日までにいただけますと幸いです。今後ともよろしくお願い申し上げます。',
    ],
    translation: 'Kính gửi anh Tanaka, phòng kinh doanh Aoi. Tôi là Nakamura, công ty Midori. Hàng A anh đặt, do máy ở nhà máy hỏng nên giao hàng dự kiến dời từ 10/5 sang 17/5. Chúng tôi rất xin lỗi. Hàng B vẫn giao đúng ngày 10 nên có thể gửi B trước. Xin cho biết ý muốn. Mong nhận hồi âm trước thứ Sáu tuần này.',
    vocab: [['納品', 'のうひん', 'giao hàng'], ['発送', 'はっそう', 'gửi hàng'], ['見込み', 'みこみ', 'dự kiến']],
    questions: [
      { prompt: 'このメールの目的は何ですか。', options: ['新しい注文を受けたい', '納品の遅れを知らせて希望を聞きたい', '値段を上げたい', '商品Bを断りたい'], correct: 1, explanation: 'Báo trễ giao hàng và hỏi ý muốn.' },
      { prompt: '商品Aの新しい納品日はいつですか。', options: ['五月十日', '五月十三日', '五月十七日', '来月'], correct: 2, explanation: '5月17日.' },
      { prompt: '遅れる理由は何ですか。', options: ['注文が多いから', '工場の機械の故障', '天気が悪いから', '人が足りないから'], correct: 1, explanation: '「工場の機械の故障により」.' },
      { prompt: '田中さんは何をしなければなりませんか。', options: ['工場へ行く', '金曜日までに希望を返事する', 'すぐに支払う', '商品Bをキャンセルする'], correct: 1, explanation: 'Trả lời trước thứ Sáu.' },
    ],
  },
];
