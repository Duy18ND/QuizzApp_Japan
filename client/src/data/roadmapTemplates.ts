import type {
  CustomRoadmapConfig,
  CustomStageOverride,
  DailyMinutesTarget,
  StageSkill,
  TotalStagesOption,
} from '../services/stageRoadmapService';
import type { StudyLevel } from '../services/userLevelService';

export interface RoadmapQuickTemplate {
  id: string;
  title: string;
  badge: string;
  summary: string;
  dailyMinutesTarget: DailyMinutesTarget;
  totalStages: TotalStagesOption;
  studyWeekdays: number[];
  skills: StageSkill[];
  includeKanaStarter?: boolean;
  nameSuffix: string;
  chunkTitles?: Record<number, string>;
}

export const ROADMAP_QUICK_TEMPLATES: RoadmapQuickTemplate[] = [
  {
    id: 'busy-worker',
    title: 'Người đi làm bận rộn',
    badge: '15p · T2–T6',
    summary: '45 buổi nhẹ nhàng trong tuần, nghỉ T7 & CN vẫn giữ đều nhịp học 5 kỹ năng.',
    dailyMinutesTarget: 15,
    totalStages: 45,
    studyWeekdays: [1, 2, 3, 4, 5],
    skills: ['vocab', 'kanji', 'grammar', 'listening', 'quiz'],
    nameSuffix: 'Đi làm T2–T6',
    chunkTitles: {
      1: 'Chặng 1 · Nền tảng giao tiếp nhanh (Buổi 1–10)',
      2: 'Chặng 2 · Mở rộng ngữ pháp & nghe hiểu (Buổi 11–20)',
      3: 'Chặng 3 · Đọc tình huống thực tế (Buổi 21–30)',
    },
  },
  {
    id: 'jlpt-sprint',
    title: 'Cấp tốc trước kỳ thi JLPT',
    badge: '30p · 30 buổi',
    summary: '30 buổi đậm đặc mỗi ngày 30 phút, tập trung Ngữ pháp, Quiz, Đọc & Nghe.',
    dailyMinutesTarget: 30,
    totalStages: 30,
    studyWeekdays: [1, 2, 3, 4, 5, 6, 0],
    skills: ['vocab', 'kanji', 'grammar', 'reading', 'listening', 'quiz', 'review'],
    nameSuffix: 'Cấp tốc 30 buổi',
    chunkTitles: {
      1: 'Chặng 1 · Khóa chặt Từ vựng & Ngữ pháp cốt lõi (1–10)',
      2: 'Chặng 2 · Tăng tốc Đọc hiểu & Nghe Mondai (11–20)',
      3: 'Chặng 3 · Tổng ôn & Chốt đề JLPT (21–30)',
    },
  },
  {
    id: 'listening-reading',
    title: 'Thực chiến Nghe – Đọc',
    badge: '20p · 20 buổi',
    summary: 'Bỏ qua lý thuyết dài dòng, tập trung thẳng vào hội thoại Nghe, Đoản văn & Quiz.',
    dailyMinutesTarget: 20,
    totalStages: 20,
    studyWeekdays: [1, 2, 3, 4, 5, 6],
    skills: ['listening', 'reading', 'quiz', 'review'],
    nameSuffix: 'Nghe – Đọc thực chiến',
  },
  {
    id: 'zero-beginner',
    title: 'Mới học từ con số 0',
    badge: '10p · 60 buổi',
    summary: 'Mỗi ngày chỉ 10 phút cực nhẹ, kèm 5 màn Hiragana & Katakana (với N5).',
    dailyMinutesTarget: 10,
    totalStages: 60,
    studyWeekdays: [1, 2, 3, 4, 5, 6, 0],
    skills: ['vocab', 'kanji', 'grammar', 'listening', 'quiz'],
    includeKanaStarter: true,
    nameSuffix: 'Khởi đầu từ số 0',
  },
];

export interface CommunityRoadmapEntry {
  id: string;
  name: string;
  authorName: string;
  tag: string;
  description: string;
  learnersCount: number;
  level: StudyLevel;
  textbookId: string;
  dailyMinutesTarget: DailyMinutesTarget;
  totalStages: TotalStagesOption;
  studyWeekdays: number[];
  skills: StageSkill[];
  includeKanaStarter?: boolean;
  chunkTitles?: Record<number, string>;
  stageOverrides?: Record<number, CustomStageOverride>;
}

export const COMMUNITY_ROADMAP_GALLERY: CommunityRoadmapEntry[] = [
  {
    id: 'comm-n5-worker-30',
    name: 'N5 Cấp Tốc 30 Buổi (Đi làm T2–T6)',
    authorName: 'Sensei Minh · JLPT N1',
    tag: 'Phổ biến nhất',
    description:
      'Gom gọn 25 bài Minna I thành 30 buổi học 30p/ngày (nghỉ T7–CN), ưu tiên hội thoại mua sắm, nhà hàng và đi lại.',
    learnersCount: 428,
    level: 'N5',
    textbookId: 'minna-n5',
    dailyMinutesTarget: 30,
    totalStages: 30,
    studyWeekdays: [1, 2, 3, 4, 5],
    skills: ['vocab', 'kanji', 'grammar', 'listening', 'reading', 'quiz'],
    chunkTitles: {
      1: 'Chặng 1 · Sinh tồn & Giao tiếp cơ bản (Buổi 1–10)',
      2: 'Chặng 2 · Mua sắm, Đi lại & Đời sống (Buổi 11–20)',
      3: 'Chặng 3 · Tổng ôn & Về đích JLPT N5 (Buổi 21–30)',
    },
    stageOverrides: {
      1: {
        title: 'Khởi động N5: Chào hỏi & Tự giới thiệu nhanh',
        extraTasks: [
          {
            id: 'comm-n5-extra-1',
            title: 'Luyện nghe phản hồi nhanh chào hỏi (5 câu)',
            subtitle: 'Bài bổ trợ giao tiếp ngày đầu tiên từ kho Lộ trình Cộng đồng.',
            skill: 'listening',
            minutes: 5,
            to: '/jlpt/listening?level=N5&limit=5',
            isCustomAdded: true,
          },
        ],
      },
    },
  },
  {
    id: 'comm-n5-zero-60',
    name: 'N5 Từ Số 0 Nhẹ Nhàng (10p/ngày · 60 Buổi)',
    authorName: 'Lan Anh · Tự học đỗ N5',
    tag: 'Cho người mới',
    description:
      'Bật sẵn Chặng 0 Hiragana & Katakana (5 màn), mỗi ngày học nhẹ 10 phút không áp lực cho người mới bắt đầu.',
    learnersCount: 312,
    level: 'N5',
    textbookId: 'minna-n5',
    dailyMinutesTarget: 10,
    totalStages: 60,
    studyWeekdays: [1, 2, 3, 4, 5, 6, 0],
    skills: ['vocab', 'kanji', 'grammar', 'listening', 'quiz'],
    includeKanaStarter: true,
  },
  {
    id: 'comm-n4-minna-30',
    name: 'Chinh phục N4 Minna II trong 30 Buổi',
    authorName: 'CLB Nihongo Hà Nội',
    tag: 'Chuẩn Minna II',
    description:
      'Luyện đều 5 kỹ năng trọng tâm N4 (Thể khả năng, Kính ngữ sơ cấp, Đọc đoạn văn trung bình & Nghe Mondai 4).',
    learnersCount: 256,
    level: 'N4',
    textbookId: 'minna-n4',
    dailyMinutesTarget: 30,
    totalStages: 30,
    studyWeekdays: [1, 2, 3, 4, 5, 6],
    skills: ['vocab', 'kanji', 'grammar', 'reading', 'listening', 'quiz'],
    chunkTitles: {
      1: 'Chặng 1 · Thể Khả năng, Ý định & Điều kiện (1–10)',
      2: 'Chặng 2 · Bị động, Sai khiến & Tôn kính ngữ (11–20)',
      3: 'Chặng 3 · Đọc hiểu & Nghe phản hồi nhanh N4 (21–30)',
    },
  },
  {
    id: 'comm-n4-listen-read-20',
    name: 'N4 Bứt tốc Nghe & Đọc hiểu (20 Buổi)',
    authorName: 'Hùng Kenji · IT BrSE',
    tag: 'Nghe – Đọc',
    description:
      'Dành cho bạn đã học qua ngữ pháp N4 nhưng hay liệt điểm Nghe/Đọc — luyện tập trung tình huống thực tế mỗi ngày 20p.',
    learnersCount: 184,
    level: 'N4',
    textbookId: 'minna-n4',
    dailyMinutesTarget: 20,
    totalStages: 20,
    studyWeekdays: [1, 2, 3, 4, 5],
    skills: ['listening', 'reading', 'quiz', 'review'],
  },
  {
    id: 'comm-n3-sprint-30',
    name: 'N3 Về Đích 30 Buổi (Shin Kanzen + Đọc/Nghe)',
    authorName: 'Nhóm Ôn Thi JLPT Tháng 12',
    tag: 'Ôn thi N3',
    description:
      'Lộ trình 30 buổi chuyên sâu 30p/ngày bám sát đề JLPT N3: từ vựng Hán tự, ngữ pháp dễ nhầm và bài nghe 2 câu hỏi.',
    learnersCount: 295,
    level: 'N3',
    textbookId: 'shin-kanzen-n3',
    dailyMinutesTarget: 30,
    totalStages: 30,
    studyWeekdays: [1, 2, 3, 4, 5, 6, 0],
    skills: ['vocab', 'kanji', 'grammar', 'reading', 'listening', 'quiz', 'review'],
  },
  {
    id: 'comm-n3-worker-45',
    name: 'N3 Cho Người Đi Làm (15p/ngày · 45 Buổi)',
    authorName: 'Thảo Vy · Kỹ sư Nhật Bản',
    tag: 'N3 Đi làm',
    description:
      'Chia nhỏ kiến thức N3 thành 45 buổi ngắn 15p vào buổi tối T2–T6 để vừa đi làm vừa ôn thi bền bỉ.',
    learnersCount: 169,
    level: 'N3',
    textbookId: 'mimi-kara-n3',
    dailyMinutesTarget: 15,
    totalStages: 45,
    studyWeekdays: [1, 2, 3, 4, 5],
    skills: ['vocab', 'kanji', 'grammar', 'reading', 'listening'],
  },
];

export function buildConfigFromCommunityEntry(
  entry: CommunityRoadmapEntry,
  startDate: string,
): CustomRoadmapConfig {
  return {
    id: `community-${entry.id}-${Date.now().toString(36)}`,
    name: entry.name,
    level: entry.level,
    textbookId: entry.textbookId,
    startDate,
    dailyMinutesTarget: entry.dailyMinutesTarget,
    totalStages: entry.totalStages,
    studyWeekdays: [...entry.studyWeekdays],
    skills: [...entry.skills],
    reminderTime: '20:00',
    repeatIntervalMinutes: 10,
    includeKanaStarter: Boolean(entry.includeKanaStarter),
    chunkTitles: entry.chunkTitles ? { ...entry.chunkTitles } : {},
    stageOverrides: entry.stageOverrides ? { ...entry.stageOverrides } : {},
    authorName: entry.authorName,
  };
}
