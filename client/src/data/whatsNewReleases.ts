export type ReleaseHighlightTone = 'primary' | 'sakura' | 'success' | 'warning';

export interface ReleaseHighlightItem {
  id: string;
  tag: string;
  tone: ReleaseHighlightTone;
  glyph: string;
  title: string;
  description: string;
  to: string;
  ctaLabel: string;
}

export interface WhatsNewRelease {
  version: string;
  date: string;
  badge: string;
  title: string;
  summary: string;
  highlights: ReleaseHighlightItem[];
}

const WHATS_NEW_SEEN_KEY = 'nihonmaster_whats_new_seen_version_v1';

/**
 * Bump this version string whenever a new update is deployed.
 * Any user whose stored version differs will automatically see the expanded What's New board on HomePage.
 */
export const CURRENT_RELEASE_VERSION = 'v2.5.0';

export const WHATS_NEW_RELEASES: WhatsNewRelease[] = [
  {
    version: 'v2.5.0',
    date: '22/11/2026',
    badge: 'Bản cập nhật lớn · Mới nhất',
    title: 'Lộ trình Chuẩn 5 Kỹ Năng, Chặng 0 Bảng chữ cái Kana & Chia sẻ Lộ trình kèm Bài tự tạo',
    summary:
      'Tối ưu thứ tự Bước 1 → Bước 2 → Bước 3 trong từng Màn học, bổ sung tùy chọn học từ Bảng chữ cái Hiragana/Katakana cho người mới N5 và mở khóa chia sẻ mã lộ trình toàn diện.',
    highlights: [
      {
        id: 'v250-5skill-kana',
        tag: 'Bản đồ Màn · Mới',
        tone: 'sakura',
        glyph: '道',
        title: 'Chặng 0 Bảng chữ cái Kana (5 màn) & Chu kỳ 5 Kỹ năng/ngày',
        description:
          'Người học N5 có thể bật/tắt 5 màn khởi động Hiragana & Katakana hoặc vào thẳng Bài 1. Mỗi màn tự động sắp xếp Bước 1 → Bước 2 → Bước 3 không trùng kỹ năng.',
        to: '/roadmap',
        ctaLabel: 'Mở Bản đồ Màn',
      },
      {
        id: 'v250-share-bundle',
        tag: 'Chia sẻ · Beta Free',
        tone: 'primary',
        glyph: '結',
        title: 'Chia sẻ Mã Lộ trình (NIHON-...) đính kèm cả Bài tự tạo Studio',
        description:
          'Xuất mã & Link chia sẻ lộ trình miễn phí cho bạn bè. Khi lộ trình có gắn bài tự soạn trong Studio, người nhận nhập mã sẽ nhận được cả bài học đó.',
        to: '/roadmap',
        ctaLabel: 'Thử Chia sẻ / Nhập mã',
      },
      {
        id: 'v250-studio-preset',
        tag: 'Creator Studio',
        tone: 'success',
        glyph: '創',
        title: 'Sinh nhanh Bản đồ tự vẽ Chuẩn 5 Kỹ năng chỉ với 1 chạm',
        description:
          'Trong Studio Vẽ Bản Đồ Lộ Trình, bấm "+ Sinh nhanh Mẫu 5 Kỹ năng" để tạo ngay sơ đồ 7 chặng: Từ vựng → Kanji → Ngữ pháp → Nghe → Đọc → Dojo → Full Test.',
        to: '/studio?tab=canvas',
        ctaLabel: 'Vào Bảng vẽ Studio',
      },
      {
        id: 'v250-full-n5n4n3',
        tag: 'Kho dữ liệu N5–N3',
        tone: 'warning',
        glyph: '書',
        title: 'Hoàn thiện 12 Giáo trình N5 · N4 · N3 (2.034 từ · 513 Kanji · 185 Ngữ pháp)',
        description:
          'Đầy đủ Minna I & II, Shin Kanzen, Mimi kara Oboeru, Sou Matome từ N5 đến N3 kèm 568 câu ví dụ ngữ pháp và 430 câu luyện đề Đọc – Nghe – Hái sao ★.',
        to: '/vocabulary',
        ctaLabel: 'Khám phá Giáo trình',
      },
    ],
  },
  {
    version: 'v2.4.0',
    date: '22/11/2026',
    badge: 'Creator Studio',
    title: 'Ra mắt Studio Tự Tạo Bài & Bảng Tự Vẽ Lộ Trình Kéo-Thả (Giai đoạn 1 & 2)',
    summary:
      'Cho phép mọi người học tự soạn bài Từ vựng (nhập tay hoặc dán nhanh từ Excel), Ngữ pháp, Kanji như Admin và chơi ngay trên Flashcard, Quiz & 6 Mini-game.',
    highlights: [
      {
        id: 'v240-studio-cms',
        tag: 'Tự tạo bài học',
        tone: 'primary',
        glyph: '筆',
        title: 'Soạn bài Từ vựng · Ngữ pháp · Kanji & Dán nhanh nhiều dòng',
        description:
          'Tự tạo bộ từ vựng riêng, mở thẻ lật Flashcard, làm Quiz trắc nghiệm và đưa thẳng bài tự tạo vào 6 trò chơi trong Phòng Mini-game Dojo.',
        to: '/studio',
        ctaLabel: 'Tự tạo bài ngay',
      },
      {
        id: 'v240-visual-canvas',
        tag: 'Visual Canvas',
        tone: 'sakura',
        glyph: '図',
        title: 'Bảng vẽ kéo-thả Node (x, y), nối dây mở khóa & tự căn đường chữ S',
        description:
          'Tự thiết kế sơ đồ nhánh học tập theo ý thích, bấm "Tự căn đường uốn lượn" và chuyển sang chế độ Chơi để mở khóa từng chặng.',
        to: '/studio?tab=canvas',
        ctaLabel: 'Mở Bảng vẽ',
      },
    ],
  },
  {
    version: 'v2.3.0',
    date: '22/11/2026',
    badge: 'Dojo & Đồng bộ',
    title: '6 Mini-game Phản xạ Dojo, Chọn bài chơi linh hoạt & Đồng bộ Thời gian Online 1s',
    summary:
      'Cập nhật tốc độ Yōkai vừa phải, cho phép chọn từng bài học cụ thể trong Phòng Mini-game và tự động sao lưu thời gian học lên đám mây theo thời gian thực.',
    highlights: [
      {
        id: 'v230-dojo-games',
        tag: '6 Mini-game',
        tone: 'sakura',
        glyph: '剣',
        title: 'Chém Từ Vựng Cầu Anh Đào, Chém Hoa Quả, Nối Cặp & Thính Giác Ninja',
        description:
          'Tốc độ quái di chuyển mượt và dễ quan sát hơn, cố định hiển thị Hiragana đầy đủ và chọn chơi theo bất kỳ Bài/Unit nào.',
        to: '/games',
        ctaLabel: 'Vào Phòng Mini-game',
      },
    ],
  },
];

export function getSeenWhatsNewVersion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(WHATS_NEW_SEEN_KEY);
  } catch {
    return null;
  }
}

export function isLatestReleaseUnread(): boolean {
  return getSeenWhatsNewVersion() !== CURRENT_RELEASE_VERSION;
}

export function markLatestReleaseSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WHATS_NEW_SEEN_KEY, CURRENT_RELEASE_VERSION);
  } catch {
    // Ignore storage quota issues
  }
}
