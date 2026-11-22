import type { StudyLevel } from '../services/userLevelService';

export type RoadmapSkillTag =
  | 'Từ vựng'
  | 'Kanji'
  | 'Ngữ pháp'
  | 'Flashcard'
  | 'Luyện tập'
  | 'Đọc hiểu'
  | 'Nghe hiểu'
  | 'Thi thử';

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  skill: RoadmapSkillTag;
  durationLabel: string;
  to: string;
}

export interface RoadmapPhase {
  id: string;
  phaseNumber: number;
  title: string;
  subtitle: string;
  steps: RoadmapStep[];
}

export interface LevelRoadmapSpec {
  level: StudyLevel;
  title: string;
  japaneseLabel: string;
  summary: string;
  durationWeeks: string;
  dailyMinutes: string;
  vocabTarget: string;
  kanjiTarget: string;
  grammarTarget: string;
  phases: RoadmapPhase[];
}

export const STUDY_ROADMAPS: Record<StudyLevel, LevelRoadmapSpec> = {
  N5: {
    level: 'N5',
    title: 'Sơ cấp 1 — Trọn bộ 4 Giáo trình N5 (Minna I · Shin Kanzen · Mimi · Sou Matome)',
    japaneseLabel: '初級 I · 全4教材',
    summary: 'Lộ trình 60 ngày đi trọn 25 bài Minna no Nihongo I + 3 giáo trình bổ trợ Shin Kanzen N5, Mimi kara N5, Sou Matome N5: ~884 từ vựng, 112 Kanji N5, 90 mẫu ngữ pháp, Đọc hiểu, Nghe hiểu và Thi thử JLPT N5.',
    durationWeeks: '9 tuần (60 màn)',
    dailyMinutes: '10 – 15 phút/ngày',
    vocabTarget: '43 bài (884 từ)',
    kanjiTarget: '112 chữ N5',
    grammarTarget: '30 bài (90 mẫu)',
    phases: [
      {
        id: 'n5-p1',
        phaseNumber: 1,
        title: 'Giai đoạn 1: Làm quen Từ vựng & Mặt chữ cơ bản',
        subtitle: 'Nắm chắc từ vựng chào hỏi, số đếm, thời gian và cách ghi nhớ bằng thẻ lật.',
        steps: [
          {
            id: 'n5-p1-s1',
            title: 'Học Từ vựng N5 theo từng Unit',
            description: 'Đọc bảng từ vựng N5 kèm nghĩa Việt và nghe phát âm chuẩn.',
            skill: 'Từ vựng',
            durationLabel: '20 phút',
            to: '/vocabulary/n5',
          },
          {
            id: 'n5-p1-s2',
            title: 'Ôn nhớ nhanh bằng Flashcard N5',
            description: 'Lật thẻ kiểm tra phản xạ Hiragana ↔ nghĩa tiếng Việt theo từng bài.',
            skill: 'Flashcard',
            durationLabel: '15 phút',
            to: '/flashcard/n5',
          },
          {
            id: 'n5-p1-s3',
            title: 'Làm quen 100 chữ Kanji sơ cấp',
            description: 'Nhận diện bộ thủ, nét viết và âm Hán Việt của các chữ Hán nền tảng.',
            skill: 'Kanji',
            durationLabel: '20 phút',
            to: '/kanji',
          },
        ],
      },
      {
        id: 'n5-p2',
        phaseNumber: 2,
        title: 'Giai đoạn 2: Ngữ pháp câu đơn & Luyện viết',
        subtitle: 'Ghép trợ từ cơ bản (は, が, を, に, で) và luyện gõ từ chính xác.',
        steps: [
          {
            id: 'n5-p2-s1',
            title: 'Học cấu trúc Ngữ pháp cơ bản',
            description: 'Nắm vững cấu trúc khẳng định, phủ định, quá khứ và câu hỏi.',
            skill: 'Ngữ pháp',
            durationLabel: '25 phút',
            to: '/grammar',
          },
          {
            id: 'n5-p2-s2',
            title: 'Luyện gõ & nhớ chính tả từ vựng',
            description: 'Gõ Hiragana từ nghĩa Việt hoặc nghe phát âm để tránh nhầm trường âm/âm ngắt.',
            skill: 'Luyện tập',
            durationLabel: '15 phút',
            to: '/vocabulary/writing',
          },
          {
            id: 'n5-p2-s3',
            title: 'Kiểm tra nhanh bằng Quiz 4 đáp án',
            description: 'Làm bài trắc nghiệm tổng hợp và đánh dấu các từ dễ quên.',
            skill: 'Luyện tập',
            durationLabel: '15 phút',
            to: '/vocabulary/quiz',
          },
        ],
      },
      {
        id: 'n5-p3',
        phaseNumber: 3,
        title: 'Giai đoạn 3: Đọc đoạn ngắn & Nghe phản xạ',
        subtitle: 'Luyện đọc hiểu thông báo đơn giản và nghe câu hội thoại ngắn.',
        steps: [
          {
            id: 'n5-p3-s1',
            title: 'Luyện đọc hiểu Đoản văn (Ngắn)',
            description: 'Tập nắm ý chính từ các đoạn văn ngắn 100–150 chữ và tin nhắn hằng ngày.',
            skill: 'Đọc hiểu',
            durationLabel: '20 phút',
            to: '/jlpt/reading-short',
          },
          {
            id: 'n5-p3-s2',
            title: 'Luyện Nghe hiểu phản xạ cơ bản',
            description: 'Nghe hội thoại tình huống kèm transcript để quen tốc độ nói tự nhiên.',
            skill: 'Nghe hiểu',
            durationLabel: '20 phút',
            to: '/jlpt/listening',
          },
        ],
      },
      {
        id: 'n5-p4',
        phaseNumber: 4,
        title: 'Giai đoạn 4: Tổng ôn lỗ hổng & Thi thử JLPT N5',
        subtitle: 'Rà soát toàn bộ câu làm sai và tập căn thời gian thi thật.',
        steps: [
          {
            id: 'n5-p4-s1',
            title: 'Ôn lại toàn bộ câu sai & từ chưa thuộc',
            description: 'Xử lý triệt để các câu sai đã lưu trong quá trình luyện tập.',
            skill: 'Luyện tập',
            durationLabel: '20 phút',
            to: '/vocabulary/review',
          },
          {
            id: 'n5-p4-s2',
            title: 'Làm đề Thi thử Toàn bộ (Full Test)',
            description: 'Đánh giá tổng lực Chữ Hán – Từ vựng – Ngữ pháp – Đọc – Nghe có bấm giờ.',
            skill: 'Thi thử',
            durationLabel: '45 phút',
            to: '/jlpt/full-test',
          },
        ],
      },
    ],
  },

  N4: {
    level: 'N4',
    title: 'Sơ cấp 2 — Trọn bộ Minna II, Shin Kanzen, Mimi & Sou Matome N4',
    japaneseLabel: '初級 II · 全4教材',
    summary: 'Hoàn thiện chia thể động từ & kính ngữ qua 4 bộ sách N4 (Minna II Bài 26–50, Shin Kanzen, Mimi kara, Sou Matome): 560 từ vựng, 177 Kanji N4, 48 mẫu ngữ pháp kèm Đọc – Nghe – Thi thử JLPT N4.',
    durationWeeks: '10 – 12 tuần',
    dailyMinutes: '15 – 30 phút/ngày',
    vocabTarget: '28 bài (560 từ)',
    kanjiTarget: '177 chữ N4',
    grammarTarget: '16 bài (48 mẫu)',
    phases: [
      {
        id: 'n4-p1',
        phaseNumber: 1,
        title: 'Giai đoạn 1: Mở rộng vốn Từ vựng & Kanji N4',
        subtitle: 'Học nhóm từ sinh hoạt, đi lại, mua sắm, trường học và công việc.',
        steps: [
          {
            id: 'n4-p1-s1',
            title: 'Học Từ vựng N4 theo chủ đề',
            description: 'Ghi nhớ nhóm từ đồng nghĩa, trái nghĩa và ví dụ đặt câu thực tế.',
            skill: 'Từ vựng',
            durationLabel: '25 phút',
            to: '/vocabulary/n4',
          },
          {
            id: 'n4-p1-s2',
            title: 'Ôn Flashcard & đánh dấu từ khó (★)',
            description: 'Lọc các từ hay nhầm âm đọc để ưu tiên ôn lặp lại hằng ngày.',
            skill: 'Flashcard',
            durationLabel: '15 phút',
            to: '/flashcard/n4',
          },
          {
            id: 'n4-p1-s3',
            title: 'Luyện Kanji & cách đọc On-Kun',
            description: 'Tập viết nét chuẩn và phân biệt các cặp chữ Hán gần giống nhau.',
            skill: 'Kanji',
            durationLabel: '20 phút',
            to: '/kanji',
          },
        ],
      },
      {
        id: 'n4-p2',
        phaseNumber: 2,
        title: 'Giai đoạn 2: Chia thể động từ & Ngữ pháp nối câu',
        subtitle: 'Thành thạo thể khả năng, bị động, sai khiến, điều kiện và kính ngữ cơ bản.',
        steps: [
          {
            id: 'n4-p2-s1',
            title: 'Học bài giảng Ngữ pháp trọng tâm',
            description: 'Hiểu rõ sắc thái ý nghĩa và các lỗi thường gặp khi nối mệnh đề.',
            skill: 'Ngữ pháp',
            durationLabel: '30 phút',
            to: '/grammar',
          },
          {
            id: 'n4-p2-s2',
            title: 'Luyện Mondai Ngữ pháp JLPT',
            description: 'Chọn mẫu ngữ pháp đúng ngữ cảnh trong câu và đoạn văn.',
            skill: 'Ngữ pháp',
            durationLabel: '20 phút',
            to: '/jlpt/grammar',
          },
          {
            id: 'n4-p2-s3',
            title: 'Luyện Hái sao (★) sắp xếp câu',
            description: 'Rèn tư duy trật tự từ và liên kết trợ từ chuẩn tiếng Nhật.',
            skill: 'Luyện tập',
            durationLabel: '20 phút',
            to: '/jlpt/star',
          },
        ],
      },
      {
        id: 'n4-p3',
        phaseNumber: 3,
        title: 'Giai đoạn 3: Đọc hiểu đoạn ngắn – trung & Nghe hội thoại',
        subtitle: 'Tăng tốc độ đọc hiểu email, thông báo và bắt từ khóa bài nghe.',
        steps: [
          {
            id: 'n4-p3-s1',
            title: 'Đọc hiểu Đoản văn & Thông báo',
            description: 'Tìm thông tin cốt lõi nhanh chóng mà không cần dịch từng chữ.',
            skill: 'Đọc hiểu',
            durationLabel: '25 phút',
            to: '/jlpt/reading-short',
          },
          {
            id: 'n4-p3-s2',
            title: 'Luyện Nghe hiểu tình huống đời sống',
            description: 'Nghe hội thoại và đối chiếu bản dịch/transcript sau khi chọn đáp án.',
            skill: 'Nghe hiểu',
            durationLabel: '25 phút',
            to: '/jlpt/listening',
          },
        ],
      },
      {
        id: 'n4-p4',
        phaseNumber: 4,
        title: 'Giai đoạn 4: Rà soát lỗi sai & Thi thử tổng lực',
        subtitle: 'Khắc phục toàn bộ điểm yếu và kiểm tra trình độ đạt chuẩn N4.',
        steps: [
          {
            id: 'n4-p4-s1',
            title: 'Ôn tập chuyên sâu câu sai ngữ pháp & từ vựng',
            description: 'Làm lại các câu từng trả lời nhầm cho đến khi đạt 100%.',
            skill: 'Luyện tập',
            durationLabel: '20 phút',
            to: '/grammar/mistakes',
          },
          {
            id: 'n4-p4-s2',
            title: 'Thi thử Full Test JLPT',
            description: 'Hoàn thành bộ đề chuẩn có bấm giờ để kiểm tra sức bền làm bài.',
            skill: 'Thi thử',
            durationLabel: '60 phút',
            to: '/jlpt/full-test',
          },
        ],
      },
    ],
  },

  N3: {
    level: 'N3',
    title: 'Trung cấp — Trọn bộ Mimi kara N3, Shin Kanzen, Minna Trung cấp I & Sou Matome',
    japaneseLabel: '中級 · 全4教材',
    summary: 'Chinh phục đầy đủ 4 giáo trình N3 (Mimi kara Oboeru N3, Shin Kanzen Master, Minna Trung cấp I, Sou Matome N3): 590 từ vựng, 177 Kanji N3, 47 mẫu ngữ pháp kèm bài tập ngữ cảnh, Đọc hiểu, Nghe hiểu & Full Test N3.',
    durationWeeks: '12 – 16 tuần',
    dailyMinutes: '20 – 45 phút/ngày',
    vocabTarget: '24 bài (590 từ)',
    kanjiTarget: '177 chữ N3',
    grammarTarget: '17 bài (47 mẫu)',
    phases: [
      {
        id: 'n3-p1',
        phaseNumber: 1,
        title: 'Giai đoạn 1: Từ vựng Mimi kara Oboeru & 178+ Kanji N3',
        subtitle: 'Xây kho từ vựng trung cấp, từ ghép Hán tự và cặp từ đồng nghĩa hay ra thi.',
        steps: [
          {
            id: 'n3-p1-s1',
            title: 'Học Từ vựng N3 theo từng Unit',
            description: 'Nắm chắc nghĩa, âm Hán Việt, loại từ và ví dụ ngữ cảnh của giáo trình N3.',
            skill: 'Từ vựng',
            durationLabel: '30 phút',
            to: '/vocabulary/n3',
          },
          {
            id: 'n3-p1-s2',
            title: 'Luyện Flashcard & Quiz từ vựng N3',
            description: 'Kiểm tra ghi nhớ chủ động theo từng Unit để chốt chắc kiến thức.',
            skill: 'Flashcard',
            durationLabel: '20 phút',
            to: '/flashcard/n3',
          },
          {
            id: 'n3-p1-s3',
            title: 'Tra cứu & luyện tập Kanji N3',
            description: 'Ghi nhớ âm On-Kun, từ ghép phổ biến và đánh dấu chữ Hán đã thuộc.',
            skill: 'Kanji',
            durationLabel: '25 phút',
            to: '/kanji',
          },
        ],
      },
      {
        id: 'n3-p2',
        phaseNumber: 2,
        title: 'Giai đoạn 2: Ngữ pháp Shin Kanzen Master N3 & Hái sao',
        subtitle: 'Phân biệt sắc thái các mẫu câu tương đồng và rèn tốc độ giải Mondai ngữ pháp.',
        steps: [
          {
            id: 'n3-p2-s1',
            title: 'Học Ngữ pháp theo chương Shin Kanzen',
            description: 'Nắm công thức kết hợp, sắc thái sử dụng và làm bài tập vận dụng sau mỗi chương.',
            skill: 'Ngữ pháp',
            durationLabel: '35 phút',
            to: '/grammar',
          },
          {
            id: 'n3-p2-s2',
            title: 'Luyện đề Chữ Hán & Từ vựng JLPT',
            description: 'Giải nhanh dạng bài chọn cách đọc Kanji, từ đồng nghĩa và cách dùng từ.',
            skill: 'Từ vựng',
            durationLabel: '20 phút',
            to: '/jlpt/vocab',
          },
          {
            id: 'n3-p2-s3',
            title: 'Chinh phục dạng bài Hái sao (★)',
            description: 'Luyện xếp 4 mảnh ghép câu trung cấp phức hợp để ăn trọn điểm ngữ pháp.',
            skill: 'Ngữ pháp',
            durationLabel: '20 phút',
            to: '/jlpt/star',
          },
        ],
      },
      {
        id: 'n3-p3',
        phaseNumber: 3,
        title: 'Giai đoạn 3: Đọc hiểu Trung văn & Nghe hiểu Mondai',
        subtitle: 'Nâng sức bền đọc bài 400–500 chữ và bắt mạch lập luận trong bài nghe.',
        steps: [
          {
            id: 'n3-p3-s1',
            title: 'Đọc hiểu Đoản văn & Trung văn',
            description: 'Phân tích nguyên nhân – kết quả, đại từ chỉ thị và ý định tác giả.',
            skill: 'Đọc hiểu',
            durationLabel: '30 phút',
            to: '/jlpt/reading-medium',
          },
          {
            id: 'n3-p3-s2',
            title: 'Luyện Nghe hiểu theo từng Mondai',
            description: 'Luyện nghe bắt điểm chính, câu hỏi phản xạ nhanh kèm phân tích transcript.',
            skill: 'Nghe hiểu',
            durationLabel: '30 phút',
            to: '/jlpt/listening',
          },
        ],
      },
      {
        id: 'n3-p4',
        phaseNumber: 4,
        title: 'Giai đoạn 4: Tổng ôn lỗ hổng & Thi thử JLPT N3',
        subtitle: 'Giải quyết điểm yếu từ vựng/ngữ pháp và thi thử toàn bộ cấu trúc JLPT.',
        steps: [
          {
            id: 'n3-p4-s1',
            title: 'Lọc & ôn lại Từ & Kanji chưa thuộc',
            description: 'Quét lại toàn bộ từ đánh dấu ★, từ chưa thuộc và lỗi sai tích lũy.',
            skill: 'Luyện tập',
            durationLabel: '25 phút',
            to: '/vocabulary/unmastered',
          },
          {
            id: 'n3-p4-s2',
            title: 'Thi thử Toàn bộ (Full Test)',
            description: 'Hoàn thành đề thi thử bấm giờ, kiểm tra phổ điểm từng kỹ năng.',
            skill: 'Thi thử',
            durationLabel: '75 phút',
            to: '/jlpt/full-test',
          },
        ],
      },
    ],
  },

  N2: {
    level: 'N2',
    title: 'Trung cao cấp — Công việc & Tin tức',
    japaneseLabel: '中上級',
    summary: 'Làm chủ từ vựng học thuật/văn phòng, ~1.000 Kanji, ngữ pháp trang trọng và đọc luận văn dài.',
    durationWeeks: '16 – 20 tuần',
    dailyMinutes: '50 phút/ngày',
    vocabTarget: '~6.000 từ',
    kanjiTarget: '~1.000 chữ',
    grammarTarget: '~200 mẫu',
    phases: [
      {
        id: 'n2-p1',
        phaseNumber: 1,
        title: 'Giai đoạn 1: Từ vựng N2 & Hán tự ghép nâng cao',
        subtitle: 'Tăng tốc nhận diện từ Hán-Nhật, phó từ biểu cảm và từ vựng môi trường công sở.',
        steps: [
          {
            id: 'n2-p1-s1',
            title: 'Học kho Từ vựng N2 theo Unit',
            description: 'Ghi nhớ nhóm từ đồng âm khác nghĩa và các cặp động từ phức.',
            skill: 'Từ vựng',
            durationLabel: '35 phút',
            to: '/vocabulary/n2',
          },
          {
            id: 'n2-p1-s2',
            title: 'Luyện đề Chữ Hán JLPT nâng cao',
            description: 'Kiểm tra âm On/Kun dễ gây nhiễu và nhận diện mặt chữ tốc độ cao.',
            skill: 'Kanji',
            durationLabel: '25 phút',
            to: '/jlpt/kanji',
          },
          {
            id: 'n2-p1-s3',
            title: 'Củng cố phản xạ Flashcard N2',
            description: 'Ôn ngắt quãng các nhóm từ khó để nhớ sâu trước khi đọc hiểu.',
            skill: 'Flashcard',
            durationLabel: '20 phút',
            to: '/flashcard/n2',
          },
        ],
      },
      {
        id: 'n2-p2',
        phaseNumber: 2,
        title: 'Giai đoạn 2: Ngữ pháp văn viết & Liên kết đoạn văn',
        subtitle: 'Thành thạo cấu trúc văn phong báo chí, diễn đạt trang trọng và liên từ logic.',
        steps: [
          {
            id: 'n2-p2-s1',
            title: 'Ôn hệ thống Ngữ pháp & sắc thái',
            description: 'Phân biệt các cụm ngữ pháp đồng nghĩa trong văn nói và văn viết.',
            skill: 'Ngữ pháp',
            durationLabel: '35 phút',
            to: '/grammar',
          },
          {
            id: 'n2-p2-s2',
            title: 'Luyện đề Ngữ pháp & Điền đoạn văn',
            description: 'Rèn kỹ năng đọc mạch đoạn văn để chọn chính xác ngữ pháp nối ý.',
            skill: 'Ngữ pháp',
            durationLabel: '25 phút',
            to: '/jlpt/grammar',
          },
          {
            id: 'n2-p2-s3',
            title: 'Giải Mondai Hái sao (★) nâng cao',
            description: 'Phân tích nhanh cấu trúc câu dài nhiều mệnh đề lồng nhau.',
            skill: 'Luyện tập',
            durationLabel: '20 phút',
            to: '/jlpt/star',
          },
        ],
      },
      {
        id: 'n2-p3',
        phaseNumber: 3,
        title: 'Giai đoạn 3: Đọc hiểu Trung – Trường văn & Nghe tin tức',
        subtitle: 'Xử lý bài luận dài, so sánh quan điểm hai tác giả và nghe hội thoại tốc độ cao.',
        steps: [
          {
            id: 'n2-p3-s1',
            title: 'Luyện Đọc hiểu Trung văn',
            description: 'Đọc nhanh bài 400–500 chữ và xác định luận điểm trọng tâm.',
            skill: 'Đọc hiểu',
            durationLabel: '30 phút',
            to: '/jlpt/reading-medium',
          },
          {
            id: 'n2-p3-s2',
            title: 'Luyện Đọc hiểu Trường văn (Bài luận dài)',
            description: 'Nắm mạch lập luận dài, câu hỏi tổng hợp và tìm kiếm thông tin.',
            skill: 'Đọc hiểu',
            durationLabel: '35 phút',
            to: '/jlpt/reading-long',
          },
          {
            id: 'n2-p3-s3',
            title: 'Luyện Nghe hiểu phản xạ N2',
            description: 'Nghe nắm ý ẩn, thái độ người nói và đối chiếu transcript chi tiết.',
            skill: 'Nghe hiểu',
            durationLabel: '30 phút',
            to: '/jlpt/listening',
          },
        ],
      },
      {
        id: 'n2-p4',
        phaseNumber: 4,
        title: 'Giai đoạn 4: Rà soát sai sót & Thi thử JLPT N2',
        subtitle: 'Tối ưu phân bổ thời gian cho phần Đọc hiểu dài và chốt điểm đỗ chắc chắn.',
        steps: [
          {
            id: 'n2-p4-s1',
            title: 'Tổng ôn câu sai & xuất tài liệu ôn nhanh PDF',
            description: 'Gom lại lỗi sai và xuất bảng từ/ngữ pháp trọng tâm để ôn nước rút.',
            skill: 'Luyện tập',
            durationLabel: '25 phút',
            to: '/vocabulary/review',
          },
          {
            id: 'n2-p4-s2',
            title: 'Thi thử Full Test JLPT',
            description: 'Mô phỏng áp lực phòng thi thật và đánh giá điểm mạnh/yếu từng kỹ năng.',
            skill: 'Thi thử',
            durationLabel: '90 phút',
            to: '/jlpt/full-test',
          },
        ],
      },
    ],
  },

  N1: {
    level: 'N1',
    title: 'Cao cấp — Học thuật & Chuyên sâu',
    japaneseLabel: '上級',
    summary: 'Chinh phục đỉnh cao JLPT: ~10.000 từ vựng, ~2.000 Kanji, bài bình luận chuyên sâu và nghe hiểu tự nhiên.',
    durationWeeks: '20 – 24 tuần',
    dailyMinutes: '60 phút/ngày',
    vocabTarget: '~10.000 từ',
    kanjiTarget: '~2.000 chữ',
    grammarTarget: '~250 mẫu',
    phases: [
      {
        id: 'n1-p1',
        phaseNumber: 1,
        title: 'Giai đoạn 1: Từ vựng học thuật & 2.000 Kanji chuyên sâu',
        subtitle: 'Nắm trọn từ Hán cổ điển, thành ngữ bốn chữ, từ láy và sắc thái biểu cảm tinh tế.',
        steps: [
          {
            id: 'n1-p1-s1',
            title: 'Học Từ vựng N1 chuyên sâu',
            description: 'Tích lũy từ vựng xã luận, kinh tế, khoa học và cách dùng chuẩn văn cảnh.',
            skill: 'Từ vựng',
            durationLabel: '40 phút',
            to: '/vocabulary/n1',
          },
          {
            id: 'n1-p1-s2',
            title: 'Luyện nhận diện & phân biệt Kanji N1',
            description: 'Chốt chắc các âm đọc đặc biệt, ngoại lệ và từ ghép khó.',
            skill: 'Kanji',
            durationLabel: '30 phút',
            to: '/jlpt/kanji',
          },
          {
            id: 'n1-p1-s3',
            title: 'Luyện đề Từ vựng & Đồng nghĩa JLPT',
            description: 'Giải bài chọn cách dùng từ chính xác và tìm từ đồng nghĩa sát nhất.',
            skill: 'Từ vựng',
            durationLabel: '25 phút',
            to: '/jlpt/vocab',
          },
        ],
      },
      {
        id: 'n1-p2',
        phaseNumber: 2,
        title: 'Giai đoạn 2: Ngữ pháp cổ điển – học thuật & Cấu trúc phức',
        subtitle: 'Xử lý trơn tru câu ghép nhiều tầng và các mẫu ngữ pháp trang trọng N1.',
        steps: [
          {
            id: 'n1-p2-s1',
            title: 'Hệ thống hóa Ngữ pháp cao cấp',
            description: 'So sánh tinh tế các mẫu ngữ pháp dễ nhầm trong văn nghị luận.',
            skill: 'Ngữ pháp',
            durationLabel: '35 phút',
            to: '/grammar',
          },
          {
            id: 'n1-p2-s2',
            title: 'Luyện đề Ngữ pháp & Hái sao (★) cấp độ cao',
            description: 'Phân tích khung câu dài phức tạp trong thời gian ngắn.',
            skill: 'Ngữ pháp',
            durationLabel: '30 phút',
            to: '/jlpt/star',
          },
        ],
      },
      {
        id: 'n1-p3',
        phaseNumber: 3,
        title: 'Giai đoạn 3: Đọc hiểu Trường văn chuyên luận & Nghe tốc độ bản xứ',
        subtitle: 'Đọc sâu các bài phê bình triết học, xã hội và nghe hội thoại dài không bị mất dấu.',
        steps: [
          {
            id: 'n1-p3-s1',
            title: 'Chinh phục Đọc hiểu Trường văn',
            description: 'Phân tích cấu trúc lập luận đa chiều, hàm ý ẩn và thái độ phê bình của tác giả.',
            skill: 'Đọc hiểu',
            durationLabel: '45 phút',
            to: '/jlpt/reading-long',
          },
          {
            id: 'n1-p3-s2',
            title: 'Luyện Nghe hiểu tổng hợp tốc độ tự nhiên',
            description: 'Rèn kỹ năng ghi chú nhanh ý chính cho các đoạn thảo luận dài.',
            skill: 'Nghe hiểu',
            durationLabel: '35 phút',
            to: '/jlpt/listening',
          },
        ],
      },
      {
        id: 'n1-p4',
        phaseNumber: 4,
        title: 'Giai đoạn 4: Tinh chỉnh lỗi sai & Thi thử toàn diện N1',
        subtitle: 'Tối đa hóa tốc độ xử lý đề và giữ tâm lý vững vàng suốt bài thi.',
        steps: [
          {
            id: 'n1-p4-s1',
            title: 'Rà soát toàn bộ câu sai & điểm yếu',
            description: 'Tập trung giải quyết sạch danh sách lỗi sai trước ngày thi.',
            skill: 'Luyện tập',
            durationLabel: '30 phút',
            to: '/grammar/mistakes',
          },
          {
            id: 'n1-p4-s2',
            title: 'Thi thử Full Test JLPT N1',
            description: 'Tổng duyệt toàn bộ kỹ năng trong thời gian tiêu chuẩn.',
            skill: 'Thi thử',
            durationLabel: '100 phút',
            to: '/jlpt/full-test',
          },
        ],
      },
    ],
  },
};

export function getRoadmapStepCount(level: StudyLevel): number {
  return STUDY_ROADMAPS[level].phases.reduce((sum, phase) => sum + phase.steps.length, 0);
}

export function getNextRoadmapStep(
  level: StudyLevel,
  completedStepIds: string[],
): { phase: RoadmapPhase; step: RoadmapStep } | null {
  const done = new Set(completedStepIds);
  for (const phase of STUDY_ROADMAPS[level].phases) {
    for (const step of phase.steps) {
      if (!done.has(step.id)) {
        return { phase, step };
      }
    }
  }
  return null;
}
