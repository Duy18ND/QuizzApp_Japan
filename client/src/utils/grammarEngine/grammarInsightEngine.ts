import type { MultipleChoiceQuestion } from '../../types/grammar';
import type { SmartGrammarRule } from '../../types/grammarEngine';

export interface GrammarNuanceTag {
  label: string;
  tone: 'primary' | 'sakura' | 'success' | 'warning' | 'neutral';
}

export interface ConfusableGrammarItem {
  pattern: string;
  meaning: string;
  nuance: string;
  exampleJa?: string;
  exampleVi?: string;
  isCurrent?: boolean;
}

export interface GrammarConfusableGroup {
  groupTitle: string;
  timelineSteps?: string[];
  items: ConfusableGrammarItem[];
}

export interface GrammarRightVsWrong {
  rightSentence: string;
  rightMeaning: string;
  wrongSentence: string;
  wrongReason: string;
}

export interface ScenarioOptionExplanation {
  option: string;
  isCorrect: boolean;
  reason: string;
}

export interface ScenarioQuizItem {
  id: string;
  grammarId: string;
  level: string;
  badgeLabel: string;
  prompt: string;
  options: string[];
  correctAnswer: string;
  exampleJa: string;
  exampleHiragana?: string;
  exampleVi: string;
  explanation: string;
  optionBreakdowns: ScenarioOptionExplanation[];
}

export interface GrammarDeepInsight {
  whenToUse: string[];
  nuanceTags: GrammarNuanceTag[];
  mnemonicTip: string;
  triggerWords: string[];
  confusableGroup: GrammarConfusableGroup;
  rightVsWrong: GrammarRightVsWrong;
  scenarioQuestions: ScenarioQuizItem[];
  flashcardPromptVi: string;
}

interface CuratedFamilySpec {
  matchPatterns: string[];
  groupTitle: string;
  timelineSteps?: string[];
  whenToUseMap?: Record<string, string[]>;
  mnemonicMap?: Record<string, string>;
  triggerWords: string[];
  nuanceTags: GrammarNuanceTag[];
  items: ConfusableGrammarItem[];
  rightVsWrongMap?: Record<string, GrammarRightVsWrong>;
  customScenarios?: Array<{
    targetPattern: string;
    prompt: string;
    options: string[];
    correctAnswer: string;
    exampleJa: string;
    exampleVi: string;
    explanation: string;
    optionBreakdowns: ScenarioOptionExplanation[];
  }>;
}

const CURATED_GRAMMAR_FAMILIES: CuratedFamilySpec[] = [
  {
    matchPatterns: ['上げる', '終わる', 'かける', '直す', '始める', '쏖ける', '続ける', '出す', '切る'],
    groupTitle: 'Nhóm Động từ ghép chỉ Giai đoạn & Mức độ hoàn thành (V-ます + ...)',
    timelineSteps: [
      'Bắt đầu: ～始める / ～出す',
      'Đang làm dở: ～かける',
      'Tiếp tục: ～続ける',
      'Kết thúc: ～終わる',
      'Hoàn tất đỉnh cao: ～上げる / ～切る',
      'Làm lại: ～直す',
    ],
    triggerWords: ['ついに (cuối cùng đã)', '苦労して (vất vả mãi mới)', '途中で (giữa chừng)', 'もう一度 (một lần nữa)'],
    nuanceTags: [
      { label: 'Động từ ghép N4–N3', tone: 'primary' },
      { label: 'Giai đoạn hành động', tone: 'sakura' },
      { label: 'Hay bẫy trong JLPT', tone: 'warning' },
    ],
    items: [
      {
        pattern: '～上げる',
        meaning: 'Làm xong trọn vẹn / Hoàn tất đạt thành tựu',
        nuance: 'Dùng khi hoàn thành một tác phẩm, kế hoạch hoặc công việc tốn nhiều tâm huyết, đạt độ hoàn chỉnh cao.',
        exampleJa: '職人は6ヶ月かけて木の像を彫り上げた。',
        exampleVi: 'Người nghệ nhân mất 6 tháng chạm khắc hoàn chỉnh bức tượng gỗ.',
      },
      {
        pattern: '～終わる',
        meaning: 'Kết thúc một hành động thông thường',
        nuance: 'Chỉ đơn thuần báo hiệu hành động có điểm đầu-cuối đã dừng lại, không mang sắc thái kỳ công hay kiệt tác.',
        exampleJa: '昼ごはんを食べ終わった。',
        exampleVi: 'Tôi đã ăn xong bữa trưa.',
      },
      {
        pattern: '～かける',
        meaning: 'Đang làm dở dang / Sắp sửa xảy ra',
        nuance: 'Hành động mới bắt đầu được một nửa thì dừng lại giữa chừng, hoặc trạng thái sắp xảy ra.',
        exampleJa: '読みかけの本が机の上にある。',
        exampleVi: 'Cuốn sách đang đọc dở nằm trên bàn.',
      },
      {
        pattern: '～直す',
        meaning: 'Làm lại từ đầu / Sửa lại cho tốt hơn',
        nuance: 'Làm lại một hành động vì lần trước chưa đạt hoặc bị sai.',
        exampleJa: 'レポートを書き直した。',
        exampleVi: 'Tôi đã viết lại bản báo cáo.',
      },
      {
        pattern: '～切る',
        meaning: 'Làm hết sạch / Vượt qua tới tận cùng sức lực',
        nuance: 'Tiêu dùng hết 100% số lượng hoặc dốc cạn sức lực vượt qua thử thách (chạy hết 42km, đọc hết sách dày).',
        exampleJa: '42キロを走り切った。',
        exampleVi: 'Tôi đã chạy hết trọn vẹn 42km marathon.',
      },
    ],
    customScenarios: [
      {
        targetPattern: '上げる',
        prompt:
          'Một người nghệ nhân đã dồn hết tâm huyết, thời gian và tay nghề đỉnh cao suốt 6 tháng ròng để hoàn thành một bức tượng gỗ tinh xảo mang tính kiệt tác. Để diễn tả thành quả này với sắc thái đạt được thành tựu sau bao nỗ lực, cấu trúc nào là phù hợp nhất?',
        options: ['～上げる', '～終わる', '～かける', '～直す'],
        correctAnswer: '～上げる',
        exampleJa: '職人は6ヶ月かけて、精巧な木彫りの像を彫り上げた。',
        exampleVi: 'Người nghệ nhân đã mất 6 tháng ròng để chạm khắc hoàn tất bức tượng gỗ tinh xảo.',
        explanation:
          '「V-ます + 上げる」nhấn mạnh việc hoàn tất trọn vẹn một sản phẩm/công việc đòi hỏi nhiều công sức và đạt tới kết quả hoàn chỉnh đáng tự hào.',
        optionBreakdowns: [
          {
            option: '～上げる',
            isCorrect: true,
            reason: 'Đúng! Diễn tả hoàn tất trọn vẹn một tác phẩm/công việc lớn sau nhiều nỗ lực (彫り上げる、書き上げる、作り上げる).',
          },
          {
            option: '～終わる',
            isCorrect: false,
            reason: 'Chỉ diễn tả việc kết thúc một hoạt động thường ngày (ăn xong, đọc xong), thiếu sắc thái tạo ra thành quả hoàn chỉnh.',
          },
          {
            option: '～かける',
            isCorrect: false,
            reason: 'Diễn tả hành động đang làm dở dang giữa chừng (chưa hoàn thành).',
          },
          {
            option: '～直す',
            isCorrect: false,
            reason: 'Diễn tả hành động làm lại từ đầu để sửa lỗi hoặc cải thiện.',
          },
        ],
      },
      {
        targetPattern: 'かける',
        prompt:
          'Bạn đang uống dở cốc cà phê trên bàn thì có điện thoại gấp phải chạy ra ngoài ngay, cốc cà phê vẫn còn một nửa. Để tả trạng thái "cốc cà phê đang uống dở", bạn chọn cấu trúc nào?',
        options: ['～かける', '～上げる', '～終わる', '～直す'],
        correctAnswer: '～かける',
        exampleJa: 'テーブルの上に飲みかけのコーヒーが置いてある。',
        exampleVi: 'Trên bàn có để cốc cà phê đang uống dở.',
        explanation:
          '「V-ます + かける / かけの + N」diễn tả hành động mới diễn ra được một phần và vẫn đang dang dở chưa kết thúc.',
        optionBreakdowns: [
          {
            option: '～かける',
            isCorrect: true,
            reason: 'Đúng! Nhấn mạnh trạng thái bắt đầu rồi nhưng bị bỏ dở giữa chừng (飲みかけ、読みかけ、言いかける).',
          },
          {
            option: '～上げる',
            isCorrect: false,
            reason: 'Mang nghĩa hoàn tất trọn vẹn 100%, trái ngược với đang làm dở.',
          },
          {
            option: '～終わる',
            isCorrect: false,
            reason: 'Mang nghĩa đã uống hết/xong hoàn toàn.',
          },
          {
            option: '～直す',
            isCorrect: false,
            reason: 'Mang nghĩa làm lại lần nữa từ đầu.',
          },
        ],
      },
    ],
  },
  {
    matchPatterns: ['うちに', '間に', '間', 'とき', '最中に', 'てから'],
    groupTitle: 'Nhóm Thời gian & Khoảng thời gian (～うちに vs ～間に vs ～最中に)',
    timelineSteps: [
      'Tranh thủ trước khi đổi trạng thái: ～うちに',
      'Suốt toàn bộ khoảng thời gian: ～間',
      'Một khoảnh khắc nằm trong khoảng: ～間に',
      'Đúng lúc đang cao trào thì bị cắt ngang: ～最中に',
    ],
    triggerWords: ['温かいうちに (khi còn nóng)', '若いうちに (khi còn trẻ)', '留守の間に (trong lúc vắng nhà)', '会議の最中に (đang giữa cuộc họp)'],
    nuanceTags: [
      { label: 'Thời gian & Tranh thủ', tone: 'primary' },
      { label: 'Cặp dễ nhầm số 1 N3', tone: 'warning' },
    ],
    items: [
      {
        pattern: '～うちに',
        meaning: 'Tranh thủ trong lúc còn... (trước khi trạng thái thay đổi)',
        nuance: 'Nhấn mạnh nếu không làm ngay thì trạng thái sẽ mất đi (còn nóng, còn trẻ, trời chưa mưa, chưa quên).',
        exampleJa: 'スープが温かいうちに飲んでください。',
        exampleVi: 'Hãy tranh thủ uống lúc súp còn đang nóng.',
      },
      {
        pattern: '～間に',
        meaning: 'Trong khoảng thời gian... (một sự việc ngắn xảy ra)',
        nuance: 'Chỉ một hành động xảy ra tại một điểm nằm trong khung thời gian của việc khác, không mang sắc thái "tranh thủ sợ mất cơ hội".',
        exampleJa: '母が昼寝をしている間に、買い物に行った。',
        exampleVi: 'Trong lúc mẹ đang ngủ trưa, tôi đã đi mua đồ.',
      },
      {
        pattern: '～間',
        meaning: 'Suốt trong thời gian... (kéo dài liên tục từ đầu đến cuối)',
        nuance: 'Hành động ở vế sau diễn ra liên tục suốt toàn bộ khoảng thời gian của vế trước (không có trợ từ に).',
        exampleJa: '夏休みの間、毎日泳いでいた。',
        exampleVi: 'Suốt kỳ nghỉ hè, ngày nào tôi cũng đi bơi.',
      },
      {
        pattern: '～最中に',
        meaning: 'Đúng vào lúc đang cao trào thì... (bị sự cố bất ngờ xen vào)',
        nuance: 'Vế sau luôn là sự việc bất ngờ, ngoài ý muốn làm gián đoạn hành động đang diễn ra sôi nổi ở vế trước.',
        exampleJa: '会議の最中に停電になった。',
        exampleVi: 'Đúng lúc đang họp căng thẳng thì bị mất điện.',
      },
    ],
    customScenarios: [
      {
        targetPattern: 'うちに',
        prompt:
          'Mẹ vừa nấu xong bát súp nóng hổi và khuyên bạn nên ăn ngay kẻo để lâu súp sẽ nguội mất không còn ngon nữa. Để diễn tả sắc thái "tranh thủ làm trước khi trạng thái tốt hiện tại biến mất", cấu trúc nào chuẩn nhất?',
        options: ['～うちに', '～間に', '～最中に', '～てから'],
        correctAnswer: '～うちに',
        exampleJa: 'スープが温かいうちに、早く食べなさい。',
        exampleVi: 'Hãy ăn nhanh tranh thủ lúc súp còn đang nóng.',
        explanation:
          '「～うちに」dùng khi muốn tranh thủ thực hiện hành động trước khi trạng thái hiện tại thay đổi sang hướng bất lợi (nguội đi, tối đi, quên mất).',
        optionBreakdowns: [
          {
            option: '～うちに',
            isCorrect: true,
            reason: 'Đúng! Nhấn mạnh tranh thủ làm ngay khi trạng thái (còn nóng, còn sáng, còn trẻ) vẫn còn duy trì.',
          },
          {
            option: '～間に',
            isCorrect: false,
            reason: 'Chỉ mốc thời gian khách quan xảy ra một sự việc, không có sắc thái "tranh thủ kẻo nguội/mất cơ hội".',
          },
          {
            option: '～最中に',
            isCorrect: false,
            reason: 'Chỉ dùng khi đang làm việc gì đó ở đỉnh điểm thì bị một sự cố bất ngờ cắt ngang (không dùng cho câu mệnh lệnh/khuyên nhủ).',
          },
          {
            option: '～てから',
            isCorrect: false,
            reason: 'Mang nghĩa "sau khi làm xong A mới làm B".',
          },
        ],
      },
    ],
  },
  {
    matchPatterns: ['おかげで', 'せいで', 'ために', 'ので', 'から'],
    groupTitle: 'Nhóm Nguyên nhân & Kết quả (Biết ơn ～おかげで vs Đổ lỗi ～せいで vs Khách quan ～ために)',
    timelineSteps: [
      'Kết quả TỐT + Biết ơn: ～おかげで',
      'Kết quả XẤU + Đổ lỗi/Tiếc nuối: ～せいで',
      'Nguyên nhân khách quan / Văn viết: ～ために',
      'Lý do nhẹ nhàng, lịch sự: ～ので',
    ],
    triggerWords: ['先生のおかげで (nhờ có thầy cô)', '雨のせいで (tại trời mưa)', '事故のために (do tai nạn)'],
    nuanceTags: [
      { label: 'Nguyên nhân – Kết quả', tone: 'primary' },
      { label: 'Sắc thái Tích cực / Tiêu cực rõ rệt', tone: 'sakura' },
    ],
    items: [
      {
        pattern: '～おかげで',
        meaning: 'Nhờ có... (dẫn đến kết quả tốt đẹp, mang lòng biết ơn)',
        nuance: 'Luôn đi với kết quả tích cực và thể hiện sự cảm kích của người nói.',
        exampleJa: '先生のおかげで、JLPT N3に合格できました。',
        exampleVi: 'Nhờ có thầy giáo mà em đã đỗ được JLPT N3.',
      },
      {
        pattern: '～せいで',
        meaning: 'Tại vì / Do... (dẫn đến kết quả xấu, mang ý đổ lỗi hoặc bức xúc)',
        nuance: 'Luôn đi với kết quả tiêu cực, thất bại hoặc phiền toái.',
        exampleJa: 'バスのせいで、遅刻してしまった。',
        exampleVi: 'Tại xe buýt mà tôi bị muộn học.',
      },
      {
        pattern: '～ために',
        meaning: 'Do / Vì... (nguyên nhân khách quan trong thông báo, tin tức)',
        nuance: 'Không mang cảm xúc biết ơn hay oán trách cá nhân; dùng nhiều trong văn viết hoặc thông báo.',
        exampleJa: '台風のために、電車が止まりました。',
        exampleVi: 'Do bão nên tàu điện đã ngừng chạy.',
      },
    ],
    customScenarios: [
      {
        targetPattern: 'おかげで',
        prompt:
          'Sau nhiều tháng được người bạn thân kiên nhẫn chỉ bài mỗi tối, bạn đã thi đỗ kỳ thi JLPT với số điểm rất cao. Khi muốn bày tỏ lòng biết ơn vì nguyên nhân mang lại kết quả tốt đẹp này, bạn dùng cấu trúc nào?',
        options: ['～おかげで', '～せいで', '～くせに', '～わりに'],
        correctAnswer: '～おかげで',
        exampleJa: '友達が毎日教えてくれたおかげで、試験に合格できた。',
        exampleVi: 'Nhờ có người bạn ngày nào cũng chỉ bài giúp mà tôi đã thi đỗ.',
        explanation:
          '「～おかげで」dùng khi nguyên nhân ở vế trước dẫn tới một kết quả may mắn, tốt đẹp kèm thái độ trân trọng, biết ơn.',
        optionBreakdowns: [
          {
            option: '～おかげで',
            isCorrect: true,
            reason: 'Đúng! Chuyên dùng cho nguyên nhân mang lại kết quả tích cực và bày tỏ sự biết ơn.',
          },
          {
            option: '～せいで',
            isCorrect: false,
            reason: 'Dùng để đổ lỗi khi dẫn đến kết quả xấu/thất bại (trái nghĩa hoàn toàn với ～おかげで).',
          },
          {
            option: '～くせに',
            isCorrect: false,
            reason: 'Dùng để chê bai, trách móc khi ai đó làm trái với lời nói/vị thế của họ ("mặc dù... vậy mà lại...").',
          },
          {
            option: '～わりに',
            isCorrect: false,
            reason: 'Diễn tả sự bất ngờ vì kết quả khác với tiêu chuẩn thông thường ("tuy... nhưng lại khá...").',
          },
        ],
      },
    ],
  },
  {
    matchPatterns: ['とおり', 'によって', 'たびに', 'につれて', 'にしたがって'],
    groupTitle: 'Nhóm Tương ứng, Tùy thuộc & Biến đổi tỷ lệ thuận (Bài 2 N3)',
    timelineSteps: [
      'Làm y hệt khuôn mẫu: ～とおり（に）',
      'Tùy thuộc đối tượng / Phương tiện / Nguyên nhân: ～によって',
      'Cứ mỗi lần lặp lại A thì B: ～たびに',
      'Càng A thì càng kéo theo B thay đổi: ～につれて',
    ],
    triggerWords: ['説明書どおりに (đúng như hướng dẫn)', '国によって (tùy từng quốc gia)', '会うたびに (cứ mỗi lần gặp)'],
    nuanceTags: [
      { label: 'Quy luật & Tương quan', tone: 'primary' },
      { label: 'Trọng tâm Shin Kanzen N3', tone: 'sakura' },
    ],
    items: [
      {
        pattern: '～とおり（に）',
        meaning: 'Đúng như / Y hệt như...',
        nuance: 'Làm theo đúng một hình mẫu, lời dặn, sách hướng dẫn hoặc thực tế đã diễn ra không sai lệch.',
        exampleJa: '説明書のとおりに組み立ててください。',
        exampleVi: 'Hãy lắp ráp đúng y như sách hướng dẫn.',
      },
      {
        pattern: '～によって',
        meaning: 'Tùy theo / Bằng phương tiện / Do bởi...',
        nuance: 'Diễn tả sự khác nhau tùy theo từng trường hợp (国によって違う), hoặc chỉ phương pháp/tác nhân.',
        exampleJa: '習慣は国によって違います。',
        exampleVi: 'Tập quán thì khác nhau tùy theo từng quốc gia.',
      },
      {
        pattern: '～たびに',
        meaning: 'Cứ mỗi lần... thì lại...',
        nuance: 'Mỗi khi hành động/sự việc A lặp lại thì kết quả B luôn xảy ra như một quy luật hoặc thói quen.',
        exampleJa: 'この曲を聞くたびに、故郷を思い出す。',
        exampleVi: 'Cứ mỗi lần nghe bài hát này, tôi lại nhớ về quê hương.',
      },
      {
        pattern: '～につれて',
        meaning: 'Cùng với việc... / Càng... thì càng...',
        nuance: 'Hai sự thay đổi diễn ra song song theo một chiều thuận tự nhiên.',
        exampleJa: '台風が近づくにつれて、風が強くなった。',
        exampleVi: 'Khi bão càng tiến lại gần thì gió càng mạnh lên.',
      },
    ],
  },
];

function findMatchingFamily(rule: SmartGrammarRule): CuratedFamilySpec | null {
  const cleanName = rule.name.replace(/^[～〜~]/, '').trim();
  for (const fam of CURATED_GRAMMAR_FAMILIES) {
    if (fam.matchPatterns.some((pat) => cleanName.includes(pat) || rule.name.includes(pat))) {
      return fam;
    }
  }
  return null;
}

function deriveConnectFormula(rule: SmartGrammarRule): string {
  if (rule.patterns && rule.patterns.length > 0) {
    return rule.patterns.map((p) => p.pattern).join('  /  ');
  }
  if (rule.templates && rule.templates.length > 0) {
    return rule.templates[0].pattern;
  }
  return rule.name;
}

export function buildGrammarDeepInsight(
  rule: SmartGrammarRule,
  peerRulesInChapter: SmartGrammarRule[] = [],
  allLevelRules: SmartGrammarRule[] = [],
): GrammarDeepInsight {
  const family = findMatchingFamily(rule);
  const cleanName = rule.name.replace(/^[～〜~]/, '').trim();
  const formula = deriveConnectFormula(rule);

  const primaryExampleJa =
    rule.templates?.[0]?.pattern
      ?.replace(/\{A\}/g, '毎日練習して')
      ?.replace(/\{B\}/g, '日本語が上手になった') ??
    `この文法「${rule.name}」を使って文を作ります。`;
  const primaryExampleVi =
    rule.templates?.[0]?.vietnamesePattern
      ?.replace(/\{A\}/g, 'luyện tập mỗi ngày')
      ?.replace(/\{B\}/g, 'tiếng Nhật đã giỏi lên') ??
    `Áp dụng mẫu "${rule.name}" (${rule.meaning}) trong câu thực tế.`;

  // 1. When to use (🎯 Dùng khi nào?)
  const whenToUse: string[] = [];
  if (family?.whenToUseMap?.[cleanName]) {
    whenToUse.push(...family.whenToUseMap[cleanName]);
  } else {
    whenToUse.push(
      `Khi người nói muốn diễn đạt ý "${rule.meaning}" trong ngữ cảnh ${rule.level === 'N5' ? 'giao tiếp sơ cấp hằng ngày' : rule.level === 'N4' ? 'hội thoại đời sống & công việc cơ bản' : 'diễn đạt sắc thái, lập luận và đọc hiểu trung cấp'}.`,
    );
    if (rule.usage) {
      whenToUse.push(rule.usage);
    } else if (rule.explanation) {
      whenToUse.push(rule.explanation);
    }
    whenToUse.push(
      `Cấu trúc nối từ bắt buộc: ${formula}. Hãy chú ý chia đúng thể của từ đứng ngay trước "${rule.name}".`,
    );
  }

  // 2. Nuance tags (🎭 Thẻ sắc thái)
  const nuanceTags: GrammarNuanceTag[] = family?.nuanceTags ?? [
    { label: `Trọng tâm JLPT ${rule.level}`, tone: 'primary' },
    {
      label:
        rule.level === 'N5' || rule.level === 'N4'
          ? 'Giao tiếp & Đề thi'
          : 'Đọc hiểu & Ngữ cảnh N3',
      tone: 'sakura',
    },
    {
      label: rule.notes ? 'Có lưu ý đặc biệt' : 'Cấu trúc cốt lõi',
      tone: rule.notes ? 'warning' : 'success',
    },
  ];

  // 3. Mnemonic tip (💡 Mẹo nhớ 3 giây)
  const mnemonicTip =
    family?.mnemonicMap?.[cleanName] ??
    `Nhớ theo cụm khóa: [${rule.name} (${rule.hiragana || cleanName}) = "${rule.meaning}"]. Khi làm đề ${rule.level}, hễ thấy ngữ cảnh cần diễn tả "${rule.meaning}" kèm công thức nối [${formula}] thì khoanh ngay "${rule.name}".`;

  // 4. Trigger words (🔑 Từ khóa tín hiệu)
  const triggerWords =
    family?.triggerWords ??
    [
      `${rule.name} → ${rule.meaning}`,
      ...(rule.patterns?.slice(0, 2).map((p) => p.pattern) ?? [formula]),
    ];

  // 5. Confusable group (⚖️ So sánh cặp dễ nhầm)
  const peerPool =
    peerRulesInChapter.filter((r) => r.id !== rule.id).length >= 2
      ? peerRulesInChapter.filter((r) => r.id !== rule.id)
      : allLevelRules.filter((r) => r.id !== rule.id);

  const confusableGroup: GrammarConfusableGroup = family
    ? {
        groupTitle: family.groupTitle,
        timelineSteps: family.timelineSteps,
        items: family.items.map((item) => ({
          ...item,
          isCurrent: item.pattern.includes(cleanName) || rule.name.includes(item.pattern.replace(/^[～〜~]/, '')),
        })),
      }
    : {
        groupTitle: `So sánh "${rule.name}" với các cấu trúc cùng bài / cùng nhóm (${rule.level})`,
        timelineSteps: [
          `Bước 1: Xác định ý chính (${rule.meaning})`,
          `Bước 2: Kiểm tra từ đứng trước (${formula})`,
          'Bước 3: Đối chiếu sắc thái với các mẫu bên dưới',
        ],
        items: [
          {
            pattern: rule.name,
            meaning: rule.meaning,
            nuance: rule.usage || rule.explanation || `Dùng khi muốn nhấn mạnh "${rule.meaning}".`,
            isCurrent: true,
          },
          ...peerPool.slice(0, 3).map((peer) => ({
            pattern: peer.name,
            meaning: peer.meaning,
            nuance:
              peer.usage ||
              peer.explanation ||
              `Mang nghĩa "${peer.meaning}" — không dùng thay thế khi câu cần sắc thái của ${rule.name}.`,
            isCurrent: false,
          })),
        ],
      };

  // 6. Right vs Wrong (✅ Đúng ○ vs ❌ Sai ×)
  const matchedFamilyItem = family?.items.find(
    (it) => it.pattern.includes(cleanName) || rule.name.includes(it.pattern.replace(/^[～〜~]/, '')),
  );
  const distractorPeer = peerPool[0];
  const rightVsWrong: GrammarRightVsWrong = family?.rightVsWrongMap?.[cleanName] ?? {
    rightSentence: matchedFamilyItem?.exampleJa || primaryExampleJa,
    rightMeaning: `${matchedFamilyItem?.exampleVi || primaryExampleVi} (Đúng vì khớp hoàn toàn với sắc thái "${rule.meaning}" và quy tắc nối từ của ${rule.name}).`,
    wrongSentence: distractorPeer
      ? `× Dùng nhầm sang 「${distractorPeer.name}」 khi đang muốn nói "${rule.meaning}"`
      : `× Ghép sai thể của từ đứng trước 「${rule.name}」 (không tuân theo ${formula})`,
    wrongReason:
      rule.notes ||
      (distractorPeer
        ? `Sai vì 「${distractorPeer.name}」 mang nghĩa "${distractorPeer.meaning}", trong khi ngữ cảnh câu đang đòi hỏi sắc thái "${rule.meaning}" của 「${rule.name}」.`
        : `Sai vì trước 「${rule.name}」 bắt buộc phải chia đúng theo công thức: ${formula}.`),
  };

  // 7. Situational / Nuance Scenario Questions (Giống Hình 1)
  const distractors =
    family && family.items.length >= 4
      ? family.items
          .filter((it) => !it.pattern.includes(cleanName))
          .slice(0, 3)
          .map((it) => ({
            name: it.pattern,
            meaning: it.meaning,
            nuance: it.nuance,
          }))
      : peerPool.slice(0, 3).map((p) => ({
          name: p.name,
          meaning: p.meaning,
          nuance: p.usage || p.explanation || `Dùng để diễn tả "${p.meaning}".`,
        }));

  while (distractors.length < 3) {
    const fallbacks = [
      { name: '～おかげで', meaning: 'Nhờ có (kết quả tốt)', nuance: 'Chỉ dùng khi mang lại kết quả tích cực và biết ơn.' },
      { name: '～せいで', meaning: 'Tại vì (đổ lỗi kết quả xấu)', nuance: 'Chỉ dùng khi dẫn tới kết quả tiêu cực, thất bại.' },
      { name: '～うちに', meaning: 'Tranh thủ trong lúc còn...', nuance: 'Dùng khi tranh thủ làm trước khi trạng thái thay đổi.' },
      { name: '～たびに', meaning: 'Cứ mỗi lần... thì lại...', nuance: 'Dùng khi sự việc lặp đi lặp lại theo quy luật.' },
    ];
    const nextFb = fallbacks.find(
      (f) => f.name !== rule.name && !distractors.some((d) => d.name === f.name),
    );
    if (!nextFb) break;
    distractors.push(nextFb);
  }

  const customScenario = family?.customScenarios?.find(
    (sc) => cleanName.includes(sc.targetPattern) || rule.name.includes(sc.targetPattern),
  );

  const scenario1: ScenarioQuizItem = customScenario
    ? {
        id: `scenario-1-${rule.id}`,
        grammarId: rule.id,
        level: rule.level,
        badgeLabel: 'Tình huống & Sắc thái thực tế',
        prompt: customScenario.prompt,
        options: customScenario.options,
        correctAnswer: customScenario.correctAnswer,
        exampleJa: customScenario.exampleJa,
        exampleVi: customScenario.exampleVi,
        explanation: customScenario.explanation,
        optionBreakdowns: customScenario.optionBreakdowns,
      }
    : {
        id: `scenario-1-${rule.id}`,
        grammarId: rule.id,
        level: rule.level,
        badgeLabel: 'Tình huống & Sắc thái thực tế',
        prompt: `Trong một tình huống giao tiếp hoặc bài đọc JLPT ${rule.level}, người nói muốn diễn đạt sắc thái: "${rule.meaning}"${
          rule.usage
            ? ` (${rule.usage.replace(/\.$/, '')})`
            : rule.explanation
              ? ` (${rule.explanation.replace(/\.$/, '')})`
              : ''
        }. Để truyền tải đúng ý nghĩa và ngữ cảnh này, cấu trúc nào dưới đây là phù hợp nhất?`,
        options: [rule.name, ...distractors.slice(0, 3).map((d) => d.name)],
        correctAnswer: rule.name,
        exampleJa: matchedFamilyItem?.exampleJa || primaryExampleJa,
        exampleVi: matchedFamilyItem?.exampleVi || primaryExampleVi,
        explanation:
          rule.explanation ||
          rule.usage ||
          `Cấu trúc 「${rule.name}」 được dùng để diễn tả chính xác ý "${rule.meaning}".`,
        optionBreakdowns: [
          {
            option: rule.name,
            isCorrect: true,
            reason: `Đúng! 「${rule.name}」 mang nghĩa "${rule.meaning}" — khớp hoàn toàn với tình huống đề bài yêu cầu.`,
          },
          ...distractors.slice(0, 3).map((d) => ({
            option: d.name,
            isCorrect: false,
            reason: `Chưa đúng: 「${d.name}」 dùng khi muốn diễn tả "${d.meaning}" (${d.nuance}).`,
          })),
        ],
      };

  const scenario2: ScenarioQuizItem = {
    id: `scenario-2-${rule.id}`,
    grammarId: rule.id,
    level: rule.level,
    badgeLabel: 'Chọn đúng ngữ cảnh áp dụng',
    prompt: `Khi bắt gặp cấu trúc 「${rule.name}」 (${rule.hiragana || cleanName}) trong đề thi JLPT ${rule.level}, người học cần hiểu người viết đang muốn nhấn mạnh điều gì và dùng trong hoàn cảnh nào?`,
    options: [
      `Diễn tả "${rule.meaning}" — ${rule.usage || rule.explanation || `kết hợp theo công thức ${formula}`}`,
      ...distractors.slice(0, 3).map(
        (d) => `Diễn tả "${d.meaning}" — ${d.nuance}`,
      ),
    ],
    correctAnswer: `Diễn tả "${rule.meaning}" — ${rule.usage || rule.explanation || `kết hợp theo công thức ${formula}`}`,
    exampleJa: matchedFamilyItem?.exampleJa || primaryExampleJa,
    exampleVi: matchedFamilyItem?.exampleVi || primaryExampleVi,
    explanation: `Cấu trúc 「${rule.name}」 luôn gắn liền với ý nghĩa cốt lõi là "${rule.meaning}".`,
    optionBreakdowns: [
      {
        option: `Diễn tả "${rule.meaning}" — ${rule.usage || rule.explanation || `kết hợp theo công thức ${formula}`}`,
        isCorrect: true,
        reason: `Chính xác! Đây là ý nghĩa và ngữ cảnh chuẩn của 「${rule.name}」.`,
      },
      ...distractors.slice(0, 3).map((d) => ({
        option: `Diễn tả "${d.meaning}" — ${d.nuance}`,
        isCorrect: false,
        reason: `Đây là cách dùng của cấu trúc 「${d.name}」, không phải 「${rule.name}」.`,
      })),
    ],
  };

  return {
    whenToUse,
    nuanceTags,
    mnemonicTip,
    triggerWords,
    confusableGroup,
    rightVsWrong,
    scenarioQuestions: [scenario1, scenario2],
    flashcardPromptVi: `Tình huống cần nói: "${rule.meaning}" (${rule.usage || rule.explanation || `Trình độ ${rule.level}`}) → Dùng cấu trúc nào & nối từ ra sao?`,
  };
}

/**
 * Converts a `ScenarioQuizItem` into a `MultipleChoiceQuestion` compatible with `GrammarPractice`
 * so the existing Redux practice slice & mistake tracker work seamlessly with Scenario Mode.
 */
export function toScenarioPracticeQuestion(
  item: ScenarioQuizItem,
  rule: SmartGrammarRule,
  shuffledOptions: string[],
): MultipleChoiceQuestion {
  const breakdownText = item.optionBreakdowns
    .map(
      (b) =>
        `${b.isCorrect ? '✅' : '❌'} ${b.option}: ${b.reason}`,
    )
    .join('\n');

  return {
    id: `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    grammarId: rule.id,
    type: 'grammar_selection',
    instruction: item.badgeLabel,
    question: item.prompt,
    answers: shuffledOptions,
    correctAnswer: item.correctAnswer,
    explanation: `${item.explanation}\n\n${breakdownText}`,
    metadata: {
      isScenarioQuestion: true,
      badgeLabel: item.badgeLabel,
      japanese: item.exampleJa,
      vietnamese: item.exampleVi,
      grammarName: rule.name,
      grammarMeaning: rule.meaning,
      grammarExplanation: item.explanation,
      optionBreakdowns: item.optionBreakdowns,
    },
  };
}
