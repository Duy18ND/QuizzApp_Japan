/** Shin Kanzen N3 読解 — passages laid out after the book's parts (第1部〜第4部). */
import type { JLPTReadingPassage } from '../jlptDataset';
import { situationReading } from '../situationPackUtils';
import { SKZ_R_PART1 } from './part1';
import { SKZ_R_PART2 } from './part2';
import { SKZ_R_PART3 } from './part3';
import { SKZ_R_PART4 } from './part4';

export const SKZ_READING_N3: JLPTReadingPassage[] = [
  ...SKZ_R_PART1,
  ...SKZ_R_PART2,
  ...SKZ_R_PART3,
  ...SKZ_R_PART4,
]
  // "[SKZ 読解 2-1] メール: Email cho bạn" → "Email cho bạn"
  .map((spec) => ({
    ...spec,
    title: spec.title.replace(/^\[[^\]]*\]\s*/, '').replace(/^[^A-Za-zÀ-ỹ]+[:：]\s*/, ''),
  }))
  .map(situationReading);

export const SKZ_READING_PART_TITLES: Record<number, string> = {
  1: 'Kỹ năng đọc nền tảng',
  2: 'Các loại văn bản',
  3: 'Quảng cáo & Thông báo',
  4: 'Luyện đề đọc',
};

/** Which book part a passage belongs to (from its id), or null for other passages. */
export function getSkzReadingPart(passage: { id: string }): number | null {
  const m = /^skzr-([1234])/.exec(passage.id);
  return m ? Number(m[1]) : null;
}
