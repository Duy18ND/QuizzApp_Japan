/**
 * Compact authoring helpers for the situation-based Reading & Listening packs.
 *
 * Japanese text is written with inline ruby: `{漢字|かんじ}を{書|か}きます。`
 * → segments [{text:'漢字',furigana:'かんじ'},{text:'を'},{text:'書',furigana:'か'},{text:'きます。'}]
 */
import type {
  FuriganaSegment,
  JLPTExamLevel,
  JLPTListeningItem,
  JLPTReadingPassage,
} from './jlptDataset';

const RUBY_RE = /\{([^|{}]+)\|([^|{}]+)\}/g;

export function ruby(text: string): FuriganaSegment[] {
  const segments: FuriganaSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(RUBY_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) segments.push({ text: text.slice(last, idx) });
    segments.push({ text: match[1], furigana: match[2] });
    last = idx + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

/** The same sentence without readings (what the TTS reads and the plain transcript shows). */
export function plainText(text: string): string {
  return text.replace(RUBY_RE, '$1');
}

type Four = [string, string, string, string];

export interface SituationReadingSpec {
  id: string;
  level: JLPTExamLevel;
  moduleId?: JLPTReadingPassage['moduleId'];
  situation: string;
  title: string;
  paragraphs: string[];
  translation: string;
  vocab: Array<[word: string, reading: string, meaning: string]>;
  questions: Array<{ prompt: string; options: Four; correct: number; explanation: string }>;
}

export function situationReading(spec: SituationReadingSpec): JLPTReadingPassage {
  return {
    id: spec.id,
    moduleId: spec.moduleId ?? 'reading-short',
    level: spec.level,
    title: spec.title,
    genre: `Tình huống · ${spec.situation}`,
    paragraphs: spec.paragraphs.map((p) => ({ segments: ruby(p) })),
    translation: spec.translation,
    vocabNotes: spec.vocab.map(([word, reading, meaning]) => ({ word, reading, meaning })),
    questions: spec.questions.map((q, idx) => {
      // Rotate options per question so the right answer doesn't sit in the same slot every time.
      const shift = (idx * 3 + spec.id.length) % 4;
      const options = q.options.map((_, i) => plainText(q.options[(i + shift) % 4])) as Four;
      return {
        id: `${spec.id}-q${idx + 1}`,
        prompt: plainText(q.prompt),
        options,
        correctIndex: (q.correct - shift + 4) % 4,
        explanation: q.explanation,
      };
    }),
  };
}

export interface SituationListeningSpec {
  id: string;
  level: JLPTExamLevel;
  mondai: string;
  situationTag: string;
  situation: string;
  questionPrompt: string;
  /** [speaker, line] — use two different speakers (男 / 女, 店員 / 客 …) so the player casts two voices */
  lines: Array<[speaker: string, text: string]>;
  options: Four;
  correct: number;
  translation: string;
  explanation: string;
  /** Textbook lesson (Minna no Nihongo) whose grammar / vocabulary the dialogue uses */
  lesson?: number;
  /** More questions on the same dialogue: each becomes its own item ("Câu 2/2", …) sharing the audio */
  followUps?: Array<{ prompt: string; options: Four; correct: number; explanation: string }>;
}

/** One dialogue → one item per question (main question first, then the follow-ups). */
export function situationListening(spec: SituationListeningSpec): JLPTListeningItem[] {
  const dialogue = spec.lines.map(([speaker, text]) => ({
    speaker,
    segments: ruby(text),
    plainText: plainText(text),
  }));
  const questions = [
    { prompt: spec.questionPrompt, options: spec.options, correct: spec.correct, explanation: spec.explanation },
    ...(spec.followUps ?? []),
  ];
  return questions.map((q, idx) => ({
    id: idx === 0 ? spec.id : `${spec.id}-q${idx + 1}`,
    level: spec.level,
    mondaiLabel: `${spec.mondai}${spec.lesson ? ` · Bài ${spec.lesson}` : ''}${
      questions.length > 1 ? ` · Câu ${idx + 1}/${questions.length}` : ''
    } (${spec.situationTag})`,
    situation: spec.situation,
    questionPrompt: plainText(q.prompt),
    dialogue,
    options: q.options.map(plainText) as Four,
    correctIndex: q.correct,
    translation: spec.translation,
    explanation: q.explanation,
  }));
}

/** Everyday situations used to group the situation packs (filter chips on the JLPT pages). */
export const SITUATION_TAGS = [
  'Trường học',
  'Mua sắm',
  'Nhà hàng',
  'Ga tàu & Giao thông',
  'Bệnh viện',
  'Làm thêm & Công ty',
  'Nhà ở & Hàng xóm',
  'Bưu điện & Ngân hàng',
  'Du lịch & Khách sạn',
  'Sự kiện & Sở thích',
] as const;

const READING_SITUATION_PREFIX = 'Tình huống · ';

export function getReadingSituation(passage: Pick<JLPTReadingPassage, 'genre'>): string | null {
  return passage.genre.startsWith(READING_SITUATION_PREFIX)
    ? passage.genre.slice(READING_SITUATION_PREFIX.length)
    : null;
}

export function getListeningSituation(item: Pick<JLPTListeningItem, 'mondaiLabel'>): string | null {
  const tag = /\(([^()]+)\)\s*$/.exec(item.mondaiLabel)?.[1] ?? null;
  return tag && (SITUATION_TAGS as readonly string[]).includes(tag) ? tag : null;
}

/** Lessons an item covers, read from "Bài 7" / "Bài 3–4" in its label (empty when untagged). */
export function getItemLessons(item: Pick<JLPTListeningItem, 'mondaiLabel'>): number[] {
  const match = /Bài\s*(\d+)(?:\s*[–-]\s*(\d+))?/.exec(item.mondaiLabel);
  if (!match) return [];
  const from = Number(match[1]);
  const to = match[2] ? Number(match[2]) : from;
  const lessons: number[] = [];
  for (let n = from; n <= Math.min(to, from + 10); n += 1) lessons.push(n);
  return lessons;
}

/** Compact row for lesson-tagged listening packs: one dialogue + one question. */
export type LessonListeningRow = [
  id: string,
  lesson: number,
  tag: string,
  mondai: 1 | 2 | 3 | 4,
  situation: string,
  prompt: string,
  lines: Array<[string, string]>,
  options: Four,
  correct: number,
  translation: string,
  explanation: string,
];

export const LESSON_MONDAI: Record<1 | 2 | 3 | 4, string> = {
  1: 'Mondai 1 · Hiểu nhiệm vụ',
  2: 'Mondai 2 · Hiểu điểm chính',
  3: 'Mondai 3 · Biểu hiện giao tiếp',
  4: 'Mondai 4 · Phản hồi nhanh',
};

/**
 * Rows → listening items with ids `${prefix}-bNN-${id}`. Options are rotated per row so the right
 * answer is spread over A–D whatever order the author wrote them in.
 */
export function buildLessonListening(
  level: JLPTExamLevel,
  prefix: string,
  rows: LessonListeningRow[],
): JLPTListeningItem[] {
  return rows.flatMap(
    ([id, lesson, tag, mondai, situation, prompt, lines, options, correct, translation, explanation], idx) => {
      const shift = (idx * 3 + lesson) % 4;
      return situationListening({
        id: `${prefix}-b${String(lesson).padStart(2, '0')}-${id}`,
        level,
        lesson,
        mondai: LESSON_MONDAI[mondai],
        situationTag: tag,
        situation,
        questionPrompt: prompt,
        lines,
        options: options.map((_, i) => options[(i + shift) % 4]) as Four,
        correct: (correct - shift + 4) % 4,
        translation,
        explanation,
      });
    },
  );
}
