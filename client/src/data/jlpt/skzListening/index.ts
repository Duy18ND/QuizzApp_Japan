/** Shin Kanzen N3 聴解 — items laid out after the book's sections II–VI. */
import type { JLPTListeningItem } from '../jlptDataset';
import { situationListening } from '../situationPackUtils';
import { SKZ_L_ROWS_23 } from './rows23';
import { SKZ_L_ROWS_456 } from './rows456';
import { SKZ_L_MORE_23 } from './more23';
import { SKZ_L_MORE_456 } from './more456';

export const SKZ_LISTENING_SECTION_TITLES: Record<string, string> = {
  '2-1': 'Phát ngôn: tả tình huống',
  '2-2': 'Phát ngôn: xin phép & nhờ vả',
  '2-3': 'Phát ngôn: báo vấn đề, đề nghị giúp',
  '2-4': 'Phát ngôn: chào hỏi',
  '3-1': 'Phản xạ: hành động của ai',
  '3-2': 'Phản xạ: cách đáp cố định',
  '3-3': 'Phản xạ: trả lời gián tiếp',
  '4-1': 'Hiểu nhiệm vụ: việc cần làm',
  '4-2': 'Hiểu nhiệm vụ: việc làm trước',
  '5-1': 'Điểm chính: từ giống đáp án',
  '5-2': 'Điểm chính: đồng ý hay từ chối',
  '5-3': 'Điểm chính: thông tin thêm',
  '6-1': 'Khái quát: chủ đề',
  '6-2': 'Khái quát: ý định',
  '6-3': 'Khái quát: ý kiến',
};

const SECTION_MONDAI: Record<string, string> = {
  '2': 'Nghe · Phát ngôn',
  '3': 'Nghe · Phản xạ nhanh',
  '4': 'Nghe · Hiểu nhiệm vụ',
  '5': 'Nghe · Điểm chính',
  '6': 'Nghe · Khái quát',
};

export const SKZ_LISTENING_N3: JLPTListeningItem[] = [...SKZ_L_ROWS_23, ...SKZ_L_ROWS_456, ...SKZ_L_MORE_23, ...SKZ_L_MORE_456].flatMap(
  ([section, id, tag, situation, prompt, lines, options, correct, translation, explanation], idx) => {
    // Rotate options so the correct answer is spread over A–D.
    const shift = (idx * 3 + 1) % 4;
    return situationListening({
      id: `skzl-${section}-${id}`,
      level: 'N3',
      mondai: SECTION_MONDAI[section[0]],
      situationTag: tag,
      situation,
      questionPrompt: prompt,
      lines,
      options: options.map((_, i) => options[(i + shift) % 4]) as typeof options,
      correct: (correct - shift + 4) % 4,
      translation,
      explanation,
    });
  },
);

/** Book section a listening item belongs to (from its id), or null for other items. */
export function getSkzListeningSection(item: { id: string }): string | null {
  const m = /^skzl-(\d-\d)/.exec(item.id);
  return m ? m[1] : null;
}
