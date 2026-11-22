import type { VocabularyItem } from '../../types/vocabulary';
import { buildUnitVocab, MINNA_N5_LESSONS_01_13 } from './minnaLessons01to13';
import { MINNA_N5_LESSONS_14_25 } from './minnaLessons14to25';

export const MINNA_N5_UNIT_TITLES: Record<number, string> = {
  1: 'Bài 1 (Minna I — Giới thiệu bản thân)',
  2: 'Bài 2 (Minna I — Đồ vật hằng ngày)',
  3: 'Bài 3 (Minna I — Địa điểm & Hỏi giá)',
  4: 'Bài 4 (Minna I — Giờ giấc & Sinh hoạt)',
  5: 'Bài 5 (Minna I — Di chuyển & Phương tiện)',
  6: 'Bài 6 (Minna I — Hành động & Ăn uống)',
  7: 'Bài 7 (Minna I — Công cụ & Cho nhận)',
  8: 'Bài 8 (Minna I — Tính từ mô tả)',
  9: 'Bài 9 (Minna I — Sở thích & Năng lực)',
  10: 'Bài 10 (Minna I — Tồn tại & Vị trí)',
  11: 'Bài 11 (Minna I — Số đếm & Lượng từ)',
  12: 'Bài 12 (Minna I — Thời tiết & So sánh)',
  13: 'Bài 13 (Minna I — Mong muốn & Mục đích)',
  14: 'Bài 14 (Minna I — Thể て & Yêu cầu)',
  15: 'Bài 15 (Minna I — Xin phép & Cấm đoán)',
  16: 'Bài 16 (Minna I — Nối hành động & Ngoại hình)',
  17: 'Bài 17 (Minna I — Thể ない & Nghĩa vụ)',
  18: 'Bài 18 (Minna I — Khả năng & Sở thích)',
  19: 'Bài 19 (Minna I — Thể た & Kinh nghiệm)',
  20: 'Bài 20 (Minna I — Thể thông thường)',
  21: 'Bài 21 (Minna I — Ý kiến & Trích dẫn)',
  22: 'Bài 22 (Minna I — Mệnh đề định ngữ)',
  23: 'Bài 23 (Minna I — Khi & Chỉ đường)',
  24: 'Bài 24 (Minna I — Cho nhận hành động)',
  25: 'Bài 25 (Minna I — Điều kiện たら & Dù ても)',
};

export const MINNA_N5_UNIT_IDS: number[] = Array.from({ length: 25 }, (_, i) => i + 1);

const ALL_TUPLES = {
  ...MINNA_N5_LESSONS_01_13,
  ...MINNA_N5_LESSONS_14_25,
};

export const n5AllUnitsMap: Record<string, VocabularyItem[]> = Object.fromEntries(
  MINNA_N5_UNIT_IDS.map((unitNum) => {
    const startId = 5000 + (unitNum - 1) * 50 + 1;
    return [String(unitNum), buildUnitVocab(unitNum, startId, ALL_TUPLES[unitNum] ?? [])];
  }),
);
