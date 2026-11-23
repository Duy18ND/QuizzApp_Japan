import { allGrammarSentencesBank, grammarBooks } from '../grammar';
import type { GrammarSentence } from '../grammar/shinkanzen-n3/lesson01Sentences';
import type { SmartGrammarRule } from '../../types/grammarEngine';
import { shuffleArray } from '../../utils/shuffle';

export type PdfMode = 'vi_to_ja' | 'ja_to_vi';
export type PdfScope = 'grammar' | 'lesson';

export type GrammarPdfTopic =
  | 'all'
  | 'daily_life'
  | 'work'
  | 'study'
  | 'travel'
  | 'family'
  | 'shopping';

export const GRAMMAR_PDF_TOPICS: Array<{ id: GrammarPdfTopic; label: string }> = [
  { id: 'all', label: 'Tất cả chủ đề (Đa dạng)' },
  { id: 'daily_life', label: 'Đời sống' },
  { id: 'work', label: 'Công việc' },
  { id: 'study', label: 'Trường học' },
  { id: 'travel', label: 'Du lịch' },
  { id: 'family', label: 'Gia đình' },
  { id: 'shopping', label: 'Mua sắm & Ẩm thực' },
];

export interface GrammarPdfConfig {
  mode: PdfMode;
  scope: PdfScope;
  count: number | 'all'; // count per grammar, or count for the whole lesson if scope='lesson'
  grammarIds: string[];
  showHiragana: boolean;
  topic?: GrammarPdfTopic;
}

export interface GrammarPdfQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  hiraganaHint?: string;
  topicLabel?: string;
}

export interface GrammarPdfSet {
  id: string;
  grammarId: string;
  questions: GrammarPdfQuestion[];
}

interface TopicContextSeed {
  topic: Exclude<GrammarPdfTopic, 'all'>;
  topicLabel: string;
  jaLead: string;
  hiraLead: string;
  viLead: string;
  jaFollow: string;
  hiraFollow: string;
  viFollow: string;
}

const MULTI_TOPIC_CONTEXT_SEEDS: TopicContextSeed[] = [
  {
    topic: 'daily_life',
    topicLabel: 'Đời sống',
    jaLead: '毎日、朝早く起きて',
    hiraLead: 'まいにち、あさはやくおきて',
    viLead: 'Mỗi ngày dậy sớm',
    jaFollow: '健康的な生活を送っています。',
    hiraFollow: 'けんこうてきなせいかつをおくっています。',
    viFollow: 'tôi duy trì một lối sống lành mạnh.',
  },
  {
    topic: 'daily_life',
    topicLabel: 'Đời sống',
    jaLead: '週末は近所の公園で散歩して',
    hiraLead: 'しゅうまつはきんじょのこうえんでさんぽして',
    viLead: 'Cuối tuần đi dạo ở công viên gần nhà',
    jaFollow: 'ゆっくり休むようにしています。',
    hiraFollow: 'ゆっくりやすむようにしています。',
    viFollow: 'tôi cố gắng nghỉ ngơi thư giãn.',
  },
  {
    topic: 'work',
    topicLabel: 'Công việc',
    jaLead: '会社の会議の前に資料を確認して',
    hiraLead: 'かいしゃのかいぎのまえにしりょうをかくにんして',
    viLead: 'Trước cuộc họp công ty kiểm tra tài liệu',
    jaFollow: '上司にわかりやすく報告しました。',
    hiraFollow: 'じょうしにわかりやすくほうこくしました。',
    viFollow: 'tôi đã báo cáo rõ ràng với cấp trên.',
  },
  {
    topic: 'work',
    topicLabel: 'Công việc',
    jaLead: '忙しい時期でも同僚と協力して',
    hiraLead: 'いそがしいじきでもどうりょうときょうりょくして',
    viLead: 'Ngay cả lúc bận rộn, phối hợp cùng đồng nghiệp',
    jaFollow: '無事にプロジェクトを完成させました。',
    hiraFollow: 'ぶじにぷろじぇくとをかんせいさせました。',
    viFollow: 'chúng tôi đã hoàn thành dự án suôn sẻ.',
  },
  {
    topic: 'study',
    topicLabel: 'Trường học',
    jaLead: 'JLPTの試験に合格するために毎日練習して',
    hiraLead: 'JLPTのしけんにごうかくするためにまいにちれんしゅうして',
    viLead: 'Luyện tập mỗi ngày để đỗ kỳ thi JLPT',
    jaFollow: '少しずつ日本語がわかるようになりました。',
    hiraFollow: 'すこしずつにほんごがわかるようになりました。',
    viFollow: 'tôi đã dần dần hiểu tiếng Nhật rõ hơn.',
  },
  {
    topic: 'study',
    topicLabel: 'Trường học',
    jaLead: '図書館で新しい単語と漢字を復習して',
    hiraLead: 'としょかんであたらしいたんごとかんじをふくしゅうして',
    viLead: 'Ôn tập từ mới và Kanji ở thư viện',
    jaFollow: 'ノートに大切なポイントをまとめました。',
    hiraFollow: 'のーとにたいせつなぽいんとをまとめました。',
    viFollow: 'tôi đã tổng hợp các điểm quan trọng vào vở.',
  },
  {
    topic: 'travel',
    topicLabel: 'Du lịch',
    jaLead: '今年の秋は新幹線で京都へ旅行して',
    hiraLead: 'ことしのあきはしんかんせんできょうとへりょこうして',
    viLead: 'Mùa thu năm nay đi du lịch Kyoto bằng Shinkansen',
    jaFollow: '美しい紅葉とお寺の写真を撮りました。',
    hiraFollow: 'うつくしいこうようとおてらのしゃしんをとりました。',
    viFollow: 'tôi đã chụp ảnh lá đỏ và những ngôi chùa cổ.',
  },
  {
    topic: 'travel',
    topicLabel: 'Du lịch',
    jaLead: '空港に着く前にパスポートとチケットを確かめて',
    hiraLead: 'くうこうにつくまえにぱすぽーととちけっとをたしかめて',
    viLead: 'Kiểm tra hộ chiếu và vé trước khi ra sân bay',
    jaFollow: '余裕を持って出発ゲートへ向かいました。',
    hiraFollow: 'よゆうをもってしゅっぱつげーとへむかいました。',
    viFollow: 'tôi thong thả di chuyển tới cửa khởi hành.',
  },
  {
    topic: 'family',
    topicLabel: 'Gia đình',
    jaLead: '休みの日に家族みんなで集まって',
    hiraLead: 'やすみのひにかぞくみんなであつまって',
    viLead: 'Ngày nghỉ cả gia đình quây quần bên nhau',
    jaFollow: 'おいしい手料理を食べながら話しました。',
    hiraFollow: 'おいしいてりょうりをたべながらはなしました。',
    viFollow: 'vừa ăn cơm nhà ngon vừa trò chuyện vui vẻ.',
  },
  {
    topic: 'family',
    topicLabel: 'Gia đình',
    jaLead: '遠くに住んでいる両親に電話をかけて',
    hiraLead: 'とおくにすんでいるりょうしんにでんわをかけて',
    viLead: 'Gọi điện cho bố mẹ ở xa',
    jaFollow: '最近の元気な様子を伝えました。',
    hiraFollow: 'さいきんのげんきなようすをつたえました。',
    viFollow: 'tôi đã kể về tình hình khỏe mạnh gần đây.',
  },
  {
    topic: 'shopping',
    topicLabel: 'Mua sắm & Ẩm thực',
    jaLead: '駅前の新しいスーパーで新鮮な野菜を買って',
    hiraLead: 'えきまえのあたらしいすーぱーでしんせんなやさいをかって',
    viLead: 'Mua rau tươi ở siêu thị mới trước ga',
    jaFollow: '今夜の晩ごはんを作る予定です。',
    hiraFollow: 'こんやのばんごはんをつくるよていです。',
    viFollow: 'tôi dự định nấu bữa tối hôm nay.',
  },
  {
    topic: 'shopping',
    topicLabel: 'Mua sắm & Ẩm thực',
    jaLead: '人気のあるラーメン屋で少し並んで',
    hiraLead: 'にんきのあるらーめんやですこしならんで',
    viLead: 'Xếp hàng một chút ở quán Ramen nổi tiếng',
    jaFollow: 'あたたかいラーメンを美味しくいただきました。',
    hiraFollow: 'あたたかいらーめんをおいしくいただきました。',
    viFollow: 'tôi đã thưởng thức bát ramen nóng hổi thơm ngon.',
  },
];

const TOPIC_KEYWORDS: Record<Exclude<GrammarPdfTopic, 'all'>, string[]> = {
  daily_life: ['毎日', '朝', '夜', '天気', '雨', '部屋', '散歩', '健康', '生活', 'hằng ngày', 'thời tiết', 'sức khỏe'],
  work: ['会社', '仕事', '会議', '部長', '上司', '資料', '出張', 'アルバイト', 'công ty', 'công việc', 'họp'],
  study: ['学校', '勉強', '日本語', '試験', 'テスト', '図書館', '宿題', '先生', 'học', 'trường', 'thi', 'tiếng Nhật'],
  travel: ['旅行', '電車', '駅', '空港', '京都', '新幹線', 'ホテル', '地図', 'du lịch', 'tàu', 'sân bay'],
  family: ['家族', '母', '父', '友達', '両親', '子ども', '兄弟', 'gia đình', 'bố', 'mẹ', 'bạn'],
  shopping: ['店', 'スーパー', '買', '料理', '食べ', '飲', 'レストラン', 'コーヒー', 'mua', 'ăn', 'uống', 'quán'],
};

function inferTopicFromSentence(ja: string, vi: string): Exclude<GrammarPdfTopic, 'all'> {
  const combined = `${ja} ${vi}`.toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS) as Array<
    [Exclude<GrammarPdfTopic, 'all'>, string[]]
  >) {
    if (keywords.some((kw) => combined.includes(kw.toLowerCase()))) {
      return topic;
    }
  }
  return 'daily_life';
}

function getTopicLabel(topic: Exclude<GrammarPdfTopic, 'all'>): string {
  return GRAMMAR_PDF_TOPICS.find((t) => t.id === topic)?.label ?? 'Đời sống';
}

const RULE_LOOKUP = new Map<string, SmartGrammarRule>();
for (const book of grammarBooks) {
  for (const ch of book.chapters) {
    for (const gr of ch.grammars) {
      RULE_LOOKUP.set(gr.id, gr);
    }
  }
}

/**
 * Ensures EVERY grammar rule across N5, N4, N3 has rich multi-topic practice sentences
 * (at least 10 sentences spanning Daily Life, Work, Study, Travel, Family, Shopping)
 * by combining all handcrafted sentences in `allGrammarSentencesBank` with
 * contextual multi-topic variations built from the rule's own templates & examples.
 */
function buildExpandedSentencesForGrammar(
  grammarId: string,
  topicFilter: GrammarPdfTopic = 'all',
): Array<{
  id: string;
  japanese: string;
  hiragana: string;
  vietnamese: string;
  topic: Exclude<GrammarPdfTopic, 'all'>;
  topicLabel: string;
}> {
  const baseRecords: GrammarSentence[] = allGrammarSentencesBank.filter(
    (s) => s.grammarId === grammarId,
  );
  const rule = RULE_LOOKUP.get(grammarId);

  const collected = baseRecords.map((s) => {
    const topic = inferTopicFromSentence(s.japanese, s.vietnamese);
    return {
      id: s.id,
      japanese: s.japanese,
      hiragana: s.hiragana,
      vietnamese: s.vietnamese,
      topic,
      topicLabel: getTopicLabel(topic),
    };
  });

  // Synthesize additional multi-topic contextual variations so every grammar has >= 12 varied items
  if (rule) {
    const existingJa = new Set(collected.map((c) => c.japanese));
    const cleanPattern = rule.name.replace(/^[～〜~]/, '').trim();
    const baseTemplate = rule.templates?.[0]?.pattern || '';
    const baseViTemplate = rule.templates?.[0]?.vietnamesePattern || '';

    for (let i = 0; i < MULTI_TOPIC_CONTEXT_SEEDS.length; i += 1) {
      const seed = MULTI_TOPIC_CONTEXT_SEEDS[i];
      let jaSentence = '';
      let hiraSentence = '';
      let viSentence = '';

      if (baseTemplate.includes('{A}') && baseTemplate.includes('{B}')) {
        jaSentence = baseTemplate
          .replace(/\{A\}/g, seed.jaLead.replace(/て$/, ''))
          .replace(/\{B\}/g, seed.jaFollow);
        hiraSentence = baseTemplate
          .replace(/\{A\}/g, seed.hiraLead.replace(/て$/, ''))
          .replace(/\{B\}/g, seed.hiraFollow);
        viSentence = baseViTemplate
          ? baseViTemplate
              .replace(/\{A\}/g, seed.viLead)
              .replace(/\{B\}/g, seed.viFollow)
          : `${seed.viLead} (${rule.meaning}), ${seed.viFollow}`;
      } else {
        // Contextual multi-topic prompt anchored on the grammar's real example or formula
        const anchor = baseRecords[i % Math.max(1, baseRecords.length)];
        if (anchor) {
          jaSentence = `${seed.jaLead}、${anchor.japanese}`;
          hiraSentence = `${seed.hiraLead}、${anchor.hiragana}`;
          viSentence = `[${seed.topicLabel}] ${seed.viLead}, ${anchor.vietnamese.charAt(0).toLowerCase()}${anchor.vietnamese.slice(1)}`;
        } else {
          jaSentence = `${seed.jaLead}${cleanPattern}、${seed.jaFollow}`;
          hiraSentence = `${seed.hiraLead}${rule.hiragana || cleanPattern}、${seed.hiraFollow}`;
          viSentence = `[${seed.topicLabel}] ${seed.viLead} (${rule.meaning}), ${seed.viFollow}`;
        }
      }

      if (!existingJa.has(jaSentence)) {
        existingJa.add(jaSentence);
        collected.push({
          id: `mt-${grammarId}-${seed.topic}-${i + 1}`,
          japanese: jaSentence,
          hiragana: hiraSentence,
          vietnamese: viSentence,
          topic: seed.topic,
          topicLabel: seed.topicLabel,
        });
      }
    }
  }

  if (topicFilter === 'all') {
    return collected;
  }
  const topicMatched = collected.filter((c) => c.topic === topicFilter);
  return topicMatched.length > 0 ? topicMatched : collected;
}

export function getAvailableSentenceCountForGrammar(
  grammarId: string,
  topicFilter: GrammarPdfTopic = 'all',
): number {
  return buildExpandedSentencesForGrammar(grammarId, topicFilter).length;
}

export const generateGrammarPdfDataset = (config: GrammarPdfConfig): GrammarPdfSet[] => {
  const topicFilter = config.topic ?? 'all';

  if (config.scope === 'lesson') {
    let availableSentences = config.grammarIds.flatMap((gId) =>
      buildExpandedSentencesForGrammar(gId, topicFilter),
    );
    availableSentences = shuffleArray(availableSentences);

    if (config.count !== 'all') {
      availableSentences = availableSentences.slice(0, config.count);
    }

    const questions: GrammarPdfQuestion[] = availableSentences.map((s) => {
      const q: GrammarPdfQuestion = {
        id: s.id,
        question:
          config.mode === 'vi_to_ja'
            ? s.vietnamese.startsWith('[')
              ? s.vietnamese
              : `[${s.topicLabel}] ${s.vietnamese}`
            : s.japanese,
        correctAnswer: config.mode === 'vi_to_ja' ? s.japanese : s.vietnamese,
        topicLabel: s.topicLabel,
      };
      if (config.showHiragana && config.mode === 'vi_to_ja') {
        q.hiraganaHint = s.hiragana;
      }
      return q;
    });

    return [
      {
        id: 'lesson-mixed-set',
        grammarId: 'mixed',
        questions,
      },
    ];
  }

  // Scope is 'grammar': generate a rich multi-topic set for each grammarId independently
  return config.grammarIds
    .map((gId) => {
      let sentences = buildExpandedSentencesForGrammar(gId, topicFilter);
      // Prioritize handcrafted authentic sentences first, then shuffle diverse multi-topic sentences
      const nativeCount = allGrammarSentencesBank.filter((s) => s.grammarId === gId).length;
      const nativePart = shuffleArray(sentences.slice(0, nativeCount));
      const extraPart = shuffleArray(sentences.slice(nativeCount));
      sentences = [...nativePart, ...extraPart];

      if (config.count !== 'all') {
        sentences = sentences.slice(0, config.count);
      }

      const questions: GrammarPdfQuestion[] = sentences.map((s) => {
        const q: GrammarPdfQuestion = {
          id: s.id,
          question:
            config.mode === 'vi_to_ja'
              ? s.vietnamese.startsWith('[')
                ? s.vietnamese
                : `[${s.topicLabel}] ${s.vietnamese}`
              : s.japanese,
          correctAnswer: config.mode === 'vi_to_ja' ? s.japanese : s.vietnamese,
          topicLabel: s.topicLabel,
        };
        if (config.showHiragana && config.mode === 'vi_to_ja') {
          q.hiraganaHint = s.hiragana;
        }
        return q;
      });

      return {
        id: `set-${gId}-${Date.now()}`,
        grammarId: gId,
        questions,
      };
    })
    .filter((set) => set.questions.length > 0);
};
