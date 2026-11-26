/** Compact row for Shin Kanzen 聴解 items, laid out after the book's sections. */
export type SkzListeningRow = [
  /** book section, e.g. "2-1" = II-1, "4-2" = IV-2 */
  section: string,
  id: string,
  tag: string,
  situation: string,
  prompt: string,
  lines: Array<[speaker: string, text: string]>,
  options: [string, string, string, string],
  correct: number,
  translation: string,
  explanation: string,
];

export const T = 'Trường học';
export const S = 'Mua sắm';
export const R = 'Nhà hàng';
export const G = 'Ga tàu & Giao thông';
export const B = 'Bệnh viện';
export const C = 'Làm thêm & Công ty';
export const N = 'Nhà ở & Hàng xóm';
export const P = 'Bưu điện & Ngân hàng';
export const D = 'Du lịch & Khách sạn';
export const E = 'Sự kiện & Sở thích';
