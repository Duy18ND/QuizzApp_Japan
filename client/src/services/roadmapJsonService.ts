import { getLocalDateKey } from './notificationService';
import type {
  CustomGrammarEntry,
  CustomKanjiEntry,
  CustomLesson,
  CustomQuizEntry,
  CustomVocabEntry,
} from './customStudioService';
import type {
  CurriculumTaskPreset,
  CustomRoadmapConfig,
  CustomStageOverride,
  DailyMinutesTarget,
  StageSkill,
  StageTask,
} from './stageRoadmapService';
import type { StudyLevel } from './userLevelService';
import { resolveActiveVocabTextbook } from '../data/vocabTextbooks';

export const AI_ROADMAP_SCHEMA_VERSION = 1;

export interface AiPromptBuilderOptions {
  topic: string;
  level: StudyLevel;
  stageCount: number;
  dailyMinutesTarget: DailyMinutesTarget;
  includeVocab: boolean;
  includeGrammar: boolean;
  includeKanji: boolean;
  includeQuizzes: boolean;
  vocabPerStage: number;
  quizzesPerStage: number;
  extraNotes?: string;
}

export interface RoadmapJsonAppTaskInput {
  kind: 'vocab' | 'kanji' | 'grammar' | 'quiz' | 'reading' | 'listening' | 'review';
  title?: string;
  lesson?: number;
  topic?: string;
  catalogKey?: string;
  to?: string;
}

export interface RoadmapJsonStageInput {
  stageNumber?: number;
  title: string;
  theme?: string;
  vocab?: Array<{
    kanji?: string;
    hiragana: string;
    hanViet?: string;
    meaning: string;
    example?: string;
  }>;
  grammar?: Array<{
    structure: string;
    meaning: string;
    usage?: string;
    exampleJp?: string;
    exampleVi?: string;
  }>;
  kanji?: Array<{
    kanji: string;
    hanViet?: string;
    meaning: string;
    reading?: string;
    mnemonic?: string;
  }>;
  quizzes?: Array<{
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
    speakText?: string;
  }>;
  appTasks?: RoadmapJsonAppTaskInput[];
}

export interface RoadmapJsonDocument {
  schemaVersion: number;
  roadmap: {
    name: string;
    level: StudyLevel;
    dailyMinutesTarget?: DailyMinutesTarget;
    studyWeekdays?: number[];
    description?: string;
    authorName?: string;
    textbookId?: string;
  };
  stages: RoadmapJsonStageInput[];
}

export interface RoadmapJsonPreviewStage {
  stageNumber: number;
  title: string;
  theme?: string;
  vocabCount: number;
  grammarCount: number;
  kanjiCount: number;
  quizCount: number;
  appTaskCount: number;
}

export interface RoadmapJsonPreview {
  name: string;
  level: StudyLevel;
  dailyMinutesTarget: DailyMinutesTarget;
  studyWeekdays: number[];
  stageCount: number;
  totalVocab: number;
  totalGrammar: number;
  totalKanji: number;
  totalQuizzes: number;
  totalAppTasks: number;
  stages: RoadmapJsonPreviewStage[];
}

export type RoadmapJsonParseResult =
  | {
      ok: true;
      config: CustomRoadmapConfig;
      lessons: CustomLesson[];
      preview: RoadmapJsonPreview;
    }
  | {
      ok: false;
      errors: string[];
      fixPrompt: string;
    };

/**
 * Generates a strict, copy-paste-ready prompt for ChatGPT, Gemini, or Claude
 * so any learner can create a custom Japanese study roadmap + quizzes in JSON
 * and paste it straight into Nihongo 問.
 */
export function buildAiRoadmapPrompt(options: AiPromptBuilderOptions): string {
  const topic = options.topic.trim() || 'Tiếng Nhật giao tiếp thực tế hằng ngày';
  const stageCount = Math.max(1, Math.min(30, Math.round(options.stageCount || 5)));
  const vocabPerStage = Math.max(3, Math.min(20, Math.round(options.vocabPerStage || 6)));
  const quizzesPerStage = Math.max(3, Math.min(15, Math.round(options.quizzesPerStage || 5)));

  const requiredParts: string[] = [];
  if (options.includeVocab) {
    requiredParts.push(`- "vocab": đúng ${vocabPerStage} từ vựng mỗi Màn (có kanji, hiragana, meaning tiếng Việt, example tiếng Nhật).`);
  }
  if (options.includeGrammar) {
    requiredParts.push(`- "grammar": 2 mẫu ngữ pháp trọng tâm mỗi Màn (structure, meaning, exampleJp, exampleVi).`);
  }
  if (options.includeKanji) {
    requiredParts.push(`- "kanji": 3 chữ Hán tiêu biểu mỗi Màn (kanji, hanViet IN HOA, meaning, reading, mnemonic).`);
  }
  if (options.includeQuizzes) {
    requiredParts.push(`- "quizzes": đúng ${quizzesPerStage} câu hỏi trắc nghiệm 4 đáp án mỗi Màn ("options" có đúng 4 phần tử, "correctIndex" là số nguyên 0..3, "explanation" giải thích ngắn gọn bằng tiếng Việt).`);
  }

  const stageExample: Record<string, unknown> = {
    stageNumber: 1,
    title: 'Tên ngắn gọn của Màn 1',
    theme: 'Mục tiêu chính trong buổi học này',
  };
  if (options.includeVocab) {
    stageExample.vocab = [
      {
        kanji: 'いらっしゃいませ',
        hiragana: 'いらっしゃいませ',
        hanViet: '',
        meaning: 'Kính chào quý khách',
        example: 'いらっしゃいませ、何名様ですか。',
      },
    ];
  }
  if (options.includeGrammar) {
    stageExample.grammar = [
      {
        structure: 'N + は こちらです',
        meaning: 'N ở lối này ạ (lịch sự)',
        usage: 'Dùng khi chỉ hướng hoặc dẫn khách đến bàn',
        exampleJp: 'お席はこちらです。',
        exampleVi: 'Chỗ ngồi ở lối này ạ.',
      },
    ];
  }
  if (options.includeKanji) {
    stageExample.kanji = [
      {
        kanji: '席',
        hanViet: 'TỊCH',
        meaning: 'Chỗ ngồi',
        reading: 'せき',
        mnemonic: 'Mái nhà rộng có khăn trải làm chỗ ngồi',
      },
    ];
  }
  if (options.includeQuizzes) {
    stageExample.quizzes = [
      {
        prompt: 'Khi khách bước vào quán ăn, nhân viên nói câu nào?',
        options: [
          'いらっしゃいませ',
          'いただきます',
          'ごちそうさまでした',
          'おつかれさまです',
        ],
        correctIndex: 0,
        explanation: 'いらっしゃいませ dùng để chào đón khách khi vào cửa hàng hoặc nhà hàng.',
      },
    ];
  }
  stageExample.appTasks = [
    {
      kind: 'listening',
      title: 'Nghe hội thoại tình huống từ kho App',
    },
  ];

  const sampleDoc = {
    schemaVersion: AI_ROADMAP_SCHEMA_VERSION,
    roadmap: {
      name: `${options.level} · ${topic.slice(0, 48)}`,
      level: options.level,
      dailyMinutesTarget: options.dailyMinutesTarget,
      studyWeekdays: [1, 2, 3, 4, 5],
      description: `Lộ trình ${stageCount} buổi học thực chiến chủ đề: ${topic}`,
    },
    stages: [stageExample],
  };

  return [
    `Bạn là giáo viên tiếng Nhật JLPT chuyên nghiệp. Hãy thiết kế một Lộ trình học tiếng Nhật bằng JSON để tôi nhập trực tiếp vào ứng dụng Nihongo 問.`,
    ``,
    `YÊU CẦU CHÍNH:`,
    `- Chủ đề / mục tiêu: ${topic}`,
    `- Trình độ: JLPT ${options.level}`,
    `- Tổng số Màn (buổi học): đúng ${stageCount} Màn (stageNumber từ 1 đến ${stageCount})`,
    `- Thời lượng mục tiêu mỗi ngày: ${options.dailyMinutesTarget} phút`,
    ...(requiredParts.length > 0 ? requiredParts : ['- Mỗi Màn có ít nhất 5 từ vựng và 4 câu quiz.']),
    ...(options.extraNotes?.trim() ? [`- Ghi chú thêm của tôi: ${options.extraNotes.trim()}`] : []),
    ``,
    `QUY TẮC BẮT BUỘC ĐỂ KHÔNG LỖI JSON:`,
    `1. CHỈ trả về duy nhất 1 khối JSON hợp lệ (không giải thích dài dòng bên ngoài, không comment //, không dấu phẩy thừa cuối mảng).`,
    `2. Mọi câu trong "quizzes" PHẢI có "options" đúng 4 đáp án khác nhau và "correctIndex" nằm trong 0, 1, 2, 3.`,
    `3. Tiếng Việt rõ ràng, tự nhiên; tiếng Nhật chuẩn chính tả và phù hợp trình độ ${options.level}.`,
    `4. "appTasks" là tùy chọn (có thể để mảng rỗng [] hoặc chọn kind thuộc: "vocab" | "kanji" | "grammar" | "quiz" | "reading" | "listening").`,
    ``,
    `ĐỊNH DẠNG JSON MẪU (hãy sinh đủ ${stageCount} phần tử trong "stages"):`,
    '```json',
    JSON.stringify(sampleDoc, null, 2),
    '```',
  ].join('\n');
}

/**
 * Generates a follow-up prompt so the user can feed an exported JSON roadmap back to AI
 * and ask for additional advanced stages.
 */
export function buildContinuationPrompt(exportedJson: string, extraStages = 5): string {
  return [
    `Dưới đây là JSON lộ trình học tiếng Nhật hiện tại của tôi trong app Nihongo 問.`,
    `Hãy tạo một JSON MỚI theo ĐÚNG cấu trúc "schemaVersion": 1 với ${extraStages} Màn NÂNG CAO TIẾP THEO (không trùng từ vựng/câu quiz cũ), giữ nguyên định dạng hợp lệ để tôi nhập thẳng vào app.`,
    `CHỈ trả về JSON hợp lệ.`,
    ``,
    '```json',
    exportedJson,
    '```',
  ].join('\n');
}

/**
 * Extracts raw JSON from AI responses that may wrap it in markdown fences or prose.
 */
export function extractJsonBlock(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return trimmed;
}

function sanitizeLevel(raw: unknown, fallback: StudyLevel): StudyLevel {
  if (typeof raw !== 'string') return fallback;
  const up = raw.trim().toUpperCase();
  if (up === 'N5' || up === 'N4' || up === 'N3' || up === 'N2' || up === 'N1') {
    return up;
  }
  return fallback;
}

function sanitizeMinutes(raw: unknown): DailyMinutesTarget {
  const n = Number(raw);
  if (n === 10 || n === 15 || n === 20 || n === 25 || n === 30) return n;
  if (Number.isFinite(n)) {
    if (n <= 12) return 10;
    if (n <= 17) return 15;
    if (n <= 22) return 20;
    if (n <= 27) return 25;
    return 30;
  }
  return 15;
}

function sanitizeWeekdays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [1, 2, 3, 4, 5, 6, 0];
  const valid = Array.from(
    new Set(
      raw
        .map((x) => Number(x))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
    ),
  );
  return valid.length > 0 ? valid : [1, 2, 3, 4, 5, 6, 0];
}

function resolveAppTaskFromInput(
  input: RoadmapJsonAppTaskInput,
  level: StudyLevel,
  bookId: string,
  catalog: CurriculumTaskPreset[],
  stageIdx: number,
  taskIdx: number,
): StageTask {
  if (input.catalogKey) {
    const exact = catalog.find((p) => p.key === input.catalogKey);
    if (exact) {
      return {
        id: `json-app-${stageIdx + 1}-${taskIdx + 1}`,
        title: input.title?.trim() || exact.title,
        subtitle: exact.subtitle,
        skill: exact.skill,
        minutes: exact.minutes,
        to: exact.to,
        isCustomAdded: true,
      };
    }
  }

  if (input.to && input.to.startsWith('/')) {
    return {
      id: `json-app-${stageIdx + 1}-${taskIdx + 1}`,
      title: input.title?.trim() || 'Bài luyện từ kho App',
      subtitle: 'Nhiệm vụ liên kết từ kho bài học của Nihongo 問.',
      skill: input.kind,
      minutes: 5,
      to: input.to,
      isCustomAdded: true,
    };
  }

  const lvlLower = level.toLowerCase();
  const jlptQuery = level === 'N5' || level === 'N4' || level === 'N3' ? `?level=${level}` : '';
  const lessonNum =
    typeof input.lesson === 'number' && Number.isFinite(input.lesson) && input.lesson >= 1
      ? Math.round(input.lesson)
      : stageIdx + 1;

  // Try matching a real catalog item first for richer linking
  const matchingCatalog = catalog.find((p) => p.skill === input.kind);
  switch (input.kind) {
    case 'listening':
      return {
        id: `json-app-${stageIdx + 1}-${taskIdx + 1}`,
        title: input.title?.trim() || `Nghe hiểu ${level} (Kho App · Bài ${lessonNum})`,
        subtitle: input.topic
          ? `Luyện nghe hội thoại chủ đề "${input.topic}" trong kho App.`
          : 'Luyện nghe hội thoại + câu hỏi phản hồi nhanh trong kho App.',
        skill: 'listening',
        minutes: 5,
        to: `/jlpt/listening${jlptQuery}${jlptQuery ? '&' : '?'}lesson=${lessonNum}`,
        isCustomAdded: true,
      };
    case 'reading':
      return {
        id: `json-app-${stageIdx + 1}-${taskIdx + 1}`,
        title: input.title?.trim() || `Đọc hiểu ${level} (Kho App · Bài ${lessonNum})`,
        subtitle: 'Luyện đọc hiểu đoản văn có giải thích & lưu tiến độ ✓.',
        skill: 'reading',
        minutes: 5,
        to: `/jlpt/reading-short${jlptQuery}${jlptQuery ? '&' : '?'}lesson=${lessonNum}`,
        isCustomAdded: true,
      };
    case 'grammar':
      return {
        id: `json-app-${stageIdx + 1}-${taskIdx + 1}`,
        title: input.title?.trim() || `Ngữ pháp ${level} (Kho App)`,
        subtitle: 'Ôn cấu trúc ngữ pháp & làm quiz từ kho App.',
        skill: 'grammar',
        minutes: 6,
        to: matchingCatalog?.to ?? '/grammar',
        isCustomAdded: true,
      };
    case 'kanji':
      return {
        id: `json-app-${stageIdx + 1}-${taskIdx + 1}`,
        title: input.title?.trim() || `Trắc nghiệm Kanji ${level} (Kho App)`,
        subtitle: 'Luyện đọc Hán tự & nghĩa tiếng Việt từ kho App.',
        skill: 'kanji',
        minutes: 5,
        to: `/jlpt/kanji${jlptQuery}${jlptQuery ? '&' : '?'}lesson=${lessonNum}`,
        isCustomAdded: true,
      };
    case 'quiz':
      return {
        id: `json-app-${stageIdx + 1}-${taskIdx + 1}`,
        title: input.title?.trim() || `Quiz tổng hợp ${level} (Kho App · Bài ${lessonNum})`,
        subtitle: 'Luyện trắc nghiệm chấm điểm ngay từ kho câu hỏi của App.',
        skill: 'quiz',
        minutes: 5,
        to: `/vocabulary/quiz?level=${level}&book=${encodeURIComponent(bookId)}`,
        isCustomAdded: true,
      };
    case 'review':
      return {
        id: `json-app-${stageIdx + 1}-${taskIdx + 1}`,
        title: input.title?.trim() || 'Tổng ôn & Sửa lỗi sai (Kho App)',
        subtitle: 'Làm lại toàn bộ câu từng sai và từ đánh dấu ★.',
        skill: 'review',
        minutes: 5,
        to: '/grammar/mistakes',
        isCustomAdded: true,
      };
    default:
      return {
        id: `json-app-${stageIdx + 1}-${taskIdx + 1}`,
        title: input.title?.trim() || `Từ vựng & Flashcard ${level} (Kho App)`,
        subtitle: 'Lật Flashcard & luyện từ vựng từ giáo trình có sẵn.',
        skill: 'vocab',
        minutes: 5,
        to: `/flashcard/${lvlLower}/book/${encodeURIComponent(bookId)}`,
        isCustomAdded: true,
      };
  }
}

function buildFixPrompt(errors: string[], rawJson: string): string {
  return [
    `JSON lộ trình bạn vừa tạo cho app Nihongo 問 đang có lỗi sau:`,
    ...errors.slice(0, 8).map((e, i) => `${i + 1}. ${e}`),
    ``,
    `Hãy sửa các lỗi trên và trả về LẠI toàn bộ JSON hợp lệ (chỉ trả về JSON, không giải thích thừa):`,
    '```json',
    rawJson.slice(0, 4000),
    '```',
  ].join('\n');
}

/**
 * Parses, validates, and compiles a JSON roadmap document into:
 * - a `CustomRoadmapConfig` (with `replaceBaseTasks: true` so stages show exact JSON + App tasks)
 * - generated `CustomLesson[]` (vocab, grammar, kanji, and 4-option quiz lessons)
 * - a structured `RoadmapJsonPreview` for confirmation before saving.
 */
export function parseAndValidateRoadmapJson(
  rawInput: string,
  context: {
    levelFallback: StudyLevel;
    textbookId?: string | null;
    todayKey?: string;
    catalog?: CurriculumTaskPreset[];
  },
): RoadmapJsonParseResult {
  const extracted = extractJsonBlock(rawInput);
  if (!extracted) {
    return {
      ok: false,
      errors: ['Ô JSON đang trống. Hãy dán JSON từ AI hoặc bấm "Nạp mẫu JSON thử ngay".'],
      fixPrompt: '',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Cú pháp JSON không hợp lệ';
    const errors = [
      `Không đọc được JSON (${msg}). Hãy kiểm tra dấu ngoặc nhọn {}, dấu ngoặc kép "" hoặc dấu phẩy thừa.`,
    ];
    return { ok: false, errors, fixPrompt: buildFixPrompt(errors, extracted) };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const errors = ['Dữ liệu gốc phải là một object JSON `{ "roadmap": {...}, "stages": [...] }`.'];
    return { ok: false, errors, fixPrompt: buildFixPrompt(errors, extracted) };
  }

  const doc = parsed as Partial<RoadmapJsonDocument>;
  const errors: string[] = [];

  if (!doc.roadmap || typeof doc.roadmap !== 'object') {
    errors.push('Thiếu đối tượng "roadmap" (chứa name, level, dailyMinutesTarget).');
  }
  if (!Array.isArray(doc.stages) || doc.stages.length === 0) {
    errors.push('Thiếu mảng "stages" hoặc mảng "stages" đang rỗng (cần ít nhất 1 Màn).');
  }
  if (Array.isArray(doc.stages) && doc.stages.length > 60) {
    errors.push('Số Màn tối đa hỗ trợ là 60 Màn trong một lộ trình.');
  }

  if (errors.length > 0) {
    return { ok: false, errors, fixPrompt: buildFixPrompt(errors, extracted) };
  }

  const todayKey = context.todayKey || getLocalDateKey();
  const roadmapMeta = doc.roadmap!;
  const level = sanitizeLevel(roadmapMeta.level, context.levelFallback);
  const book = resolveActiveVocabTextbook(
    level,
    null,
    typeof roadmapMeta.textbookId === 'string' ? roadmapMeta.textbookId : context.textbookId ?? null,
  );
  const dailyMinutesTarget = sanitizeMinutes(roadmapMeta.dailyMinutesTarget);
  const studyWeekdays = sanitizeWeekdays(roadmapMeta.studyWeekdays);
  const roadmapName =
    typeof roadmapMeta.name === 'string' && roadmapMeta.name.trim()
      ? roadmapMeta.name.trim().slice(0, 80)
      : `Lộ trình AI · ${level}`;

  const catalog = context.catalog ?? [];
  const batchId = `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
  const nowIso = new Date().toISOString();
  const rawStages = doc.stages!;

  const generatedLessons: CustomLesson[] = [];
  const stageOverrides: Record<number, CustomStageOverride> = {};
  const previewStages: RoadmapJsonPreviewStage[] = [];
  const usedSkills = new Set<StageSkill>();

  let totalVocab = 0;
  let totalGrammar = 0;
  let totalKanji = 0;
  let totalQuizzes = 0;
  let totalAppTasks = 0;

  rawStages.forEach((st, idx) => {
    const stageNum = idx + 1;
    if (!st || typeof st !== 'object') {
      errors.push(`Màn ${stageNum}: dữ liệu Màn không hợp lệ.`);
      return;
    }

    const stageTitle =
      typeof st.title === 'string' && st.title.trim()
        ? st.title.trim().slice(0, 100)
        : `Màn ${stageNum}`;
    const stageTheme =
      typeof st.theme === 'string' && st.theme.trim() ? st.theme.trim().slice(0, 140) : undefined;

    const extraTasks: StageTask[] = [];

    // 1. Custom Vocab
    const cleanVocab: CustomVocabEntry[] = Array.isArray(st.vocab)
      ? st.vocab
          .map((v, vi): CustomVocabEntry | null => {
            if (!v || typeof v !== 'object') return null;
            const kanji = typeof v.kanji === 'string' ? v.kanji.trim() : '';
            const hiragana = typeof v.hiragana === 'string' ? v.hiragana.trim() : kanji;
            const meaning = typeof v.meaning === 'string' ? v.meaning.trim() : '';
            if ((!kanji && !hiragana) || !meaning) return null;
            return {
              id: `${batchId}-s${stageNum}-v${vi + 1}`,
              kanji: kanji || hiragana,
              hiragana: hiragana || kanji,
              hanViet: typeof v.hanViet === 'string' && v.hanViet.trim() ? v.hanViet.trim() : undefined,
              meaning,
              example: typeof v.example === 'string' && v.example.trim() ? v.example.trim() : undefined,
            };
          })
          .filter((x): x is CustomVocabEntry => x !== null)
      : [];

    if (cleanVocab.length > 0) {
      const lessonId = `cl-${batchId}-s${stageNum}-vocab`;
      generatedLessons.push({
        id: lessonId,
        kind: 'vocab',
        title: `${stageTitle} · Từ vựng`,
        level,
        description: stageTheme || `Từ vựng Màn ${stageNum} (${roadmapName})`,
        vocabItems: cleanVocab,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      extraTasks.push({
        id: `${batchId}-s${stageNum}-task-vocab`,
        title: `Từ vựng tự tạo: ${stageTitle} (${cleanVocab.length} từ)`,
        subtitle: 'Lật Flashcard + nghe phát âm TTS + Mini-game với bộ từ của Màn này.',
        skill: 'vocab',
        minutes: Math.max(3, Math.min(10, Math.ceil(cleanVocab.length * 0.6))),
        to: `/studio?lesson=${encodeURIComponent(lessonId)}`,
        isCustomAdded: true,
      });
      usedSkills.add('vocab');
      totalVocab += cleanVocab.length;
    }

    // 2. Custom Grammar
    const cleanGrammar: CustomGrammarEntry[] = Array.isArray(st.grammar)
      ? st.grammar
          .map((g, gi): CustomGrammarEntry | null => {
            if (!g || typeof g !== 'object') return null;
            const structure = typeof g.structure === 'string' ? g.structure.trim() : '';
            const meaning = typeof g.meaning === 'string' ? g.meaning.trim() : '';
            if (!structure || !meaning) return null;
            return {
              id: `${batchId}-s${stageNum}-g${gi + 1}`,
              structure,
              meaning,
              usage: typeof g.usage === 'string' && g.usage.trim() ? g.usage.trim() : undefined,
              exampleJp:
                typeof g.exampleJp === 'string' && g.exampleJp.trim() ? g.exampleJp.trim() : undefined,
              exampleVi:
                typeof g.exampleVi === 'string' && g.exampleVi.trim() ? g.exampleVi.trim() : undefined,
            };
          })
          .filter((x): x is CustomGrammarEntry => x !== null)
      : [];

    if (cleanGrammar.length > 0) {
      const lessonId = `cl-${batchId}-s${stageNum}-grammar`;
      generatedLessons.push({
        id: lessonId,
        kind: 'grammar',
        title: `${stageTitle} · Ngữ pháp`,
        level,
        description: stageTheme || `Ngữ pháp Màn ${stageNum} (${roadmapName})`,
        grammarItems: cleanGrammar,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      extraTasks.push({
        id: `${batchId}-s${stageNum}-task-grammar`,
        title: `Ngữ pháp tự tạo: ${stageTitle} (${cleanGrammar.length} mẫu)`,
        subtitle: 'Học cấu trúc, ví dụ tiếng Nhật có phát âm & ôn nhanh.',
        skill: 'grammar',
        minutes: Math.max(4, Math.min(10, cleanGrammar.length * 2)),
        to: `/studio?lesson=${encodeURIComponent(lessonId)}`,
        isCustomAdded: true,
      });
      usedSkills.add('grammar');
      totalGrammar += cleanGrammar.length;
    }

    // 3. Custom Kanji
    const cleanKanji: CustomKanjiEntry[] = Array.isArray(st.kanji)
      ? st.kanji
          .map((k, ki): CustomKanjiEntry | null => {
            if (!k || typeof k !== 'object') return null;
            const kanji = typeof k.kanji === 'string' ? k.kanji.trim() : '';
            const meaning = typeof k.meaning === 'string' ? k.meaning.trim() : '';
            if (!kanji || !meaning) return null;
            return {
              id: `${batchId}-s${stageNum}-k${ki + 1}`,
              kanji,
              hanViet: typeof k.hanViet === 'string' ? k.hanViet.trim().toUpperCase() : '',
              meaning,
              reading: typeof k.reading === 'string' && k.reading.trim() ? k.reading.trim() : undefined,
              mnemonic:
                typeof k.mnemonic === 'string' && k.mnemonic.trim() ? k.mnemonic.trim() : undefined,
            };
          })
          .filter((x): x is CustomKanjiEntry => x !== null)
      : [];

    if (cleanKanji.length > 0) {
      const lessonId = `cl-${batchId}-s${stageNum}-kanji`;
      generatedLessons.push({
        id: lessonId,
        kind: 'kanji',
        title: `${stageTitle} · Kanji`,
        level,
        description: stageTheme || `Kanji Màn ${stageNum} (${roadmapName})`,
        kanjiItems: cleanKanji,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      extraTasks.push({
        id: `${batchId}-s${stageNum}-task-kanji`,
        title: `Kanji tự tạo: ${stageTitle} (${cleanKanji.length} chữ)`,
        subtitle: 'Học âm Hán Việt, cách đọc & mẹo nhớ chữ Hán.',
        skill: 'kanji',
        minutes: Math.max(3, Math.min(10, cleanKanji.length)),
        to: `/studio?lesson=${encodeURIComponent(lessonId)}`,
        isCustomAdded: true,
      });
      usedSkills.add('kanji');
      totalKanji += cleanKanji.length;
    }

    // 4. Custom Quizzes (4-option multiple choice + explanations)
    const cleanQuizzes: CustomQuizEntry[] = [];
    if (Array.isArray(st.quizzes)) {
      st.quizzes.forEach((q, qi) => {
        if (!q || typeof q !== 'object') {
          errors.push(`Màn ${stageNum}, Quiz câu ${qi + 1}: định dạng câu hỏi không hợp lệ.`);
          return;
        }
        const prompt = typeof q.prompt === 'string' ? q.prompt.trim() : '';
        const options = Array.isArray(q.options)
          ? q.options
              .map((o) => (typeof o === 'string' ? o.trim() : String(o ?? '').trim()))
              .filter(Boolean)
          : [];
        const correctIndex = Number(q.correctIndex);
        if (!prompt) {
          errors.push(`Màn ${stageNum}, Quiz câu ${qi + 1}: thiếu nội dung câu hỏi ("prompt").`);
          return;
        }
        if (options.length < 2) {
          errors.push(
            `Màn ${stageNum}, Quiz câu ${qi + 1}: cần ít nhất 2 đáp án trong mảng "options" (khuyên dùng 4 đáp án).`,
          );
          return;
        }
        if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
          errors.push(
            `Màn ${stageNum}, Quiz câu ${qi + 1}: "correctIndex" phải nằm từ 0 đến ${options.length - 1}.`,
          );
          return;
        }
        cleanQuizzes.push({
          id: `${batchId}-s${stageNum}-q${qi + 1}`,
          prompt,
          options,
          correctIndex,
          explanation:
            typeof q.explanation === 'string' && q.explanation.trim()
              ? q.explanation.trim()
              : undefined,
          speakText:
            typeof q.speakText === 'string' && q.speakText.trim() ? q.speakText.trim() : undefined,
        });
      });
    }

    if (cleanQuizzes.length > 0) {
      const lessonId = `cl-${batchId}-s${stageNum}-quiz`;
      generatedLessons.push({
        id: lessonId,
        kind: 'quiz',
        title: `${stageTitle} · Quiz (${cleanQuizzes.length} câu)`,
        level,
        description: stageTheme || `Bộ Quiz trắc nghiệm tự tạo cho Màn ${stageNum}`,
        quizItems: cleanQuizzes,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
      extraTasks.push({
        id: `${batchId}-s${stageNum}-task-quiz`,
        title: `Quiz tự tạo: ${stageTitle} (${cleanQuizzes.length} câu)`,
        subtitle: 'Trắc nghiệm 4 đáp án kèm giải thích tiếng Việt chi tiết từng câu.',
        skill: 'quiz',
        minutes: Math.max(3, Math.min(12, Math.ceil(cleanQuizzes.length * 0.8))),
        to: `/studio?lesson=${encodeURIComponent(lessonId)}`,
        isCustomAdded: true,
      });
      usedSkills.add('quiz');
      totalQuizzes += cleanQuizzes.length;
    }

    // 5. Built-in App Library Tasks (optional)
    let stageAppCount = 0;
    if (Array.isArray(st.appTasks)) {
      st.appTasks.forEach((appTask, ti) => {
        if (!appTask || typeof appTask !== 'object') return;
        const allowedKinds = new Set([
          'vocab',
          'kanji',
          'grammar',
          'quiz',
          'reading',
          'listening',
          'review',
        ]);
        const kind =
          typeof appTask.kind === 'string' && allowedKinds.has(appTask.kind)
            ? (appTask.kind as RoadmapJsonAppTaskInput['kind'])
            : 'quiz';
        const resolved = resolveAppTaskFromInput(
          { ...appTask, kind },
          level,
          book.id,
          catalog,
          idx,
          ti,
        );
        extraTasks.push(resolved);
        usedSkills.add(resolved.skill);
        stageAppCount += 1;
        totalAppTasks += 1;
      });
    }

    if (extraTasks.length === 0) {
      errors.push(
        `Màn ${stageNum} ("${stageTitle}"): chưa có nội dung nào (cần ít nhất 1 trong: vocab, grammar, kanji, quizzes, hoặc appTasks).`,
      );
      return;
    }

    stageOverrides[stageNum] = {
      title: stageTitle,
      theme: stageTheme || `Màn ${stageNum}/${rawStages.length} · Lộ trình tự tạo (JSON)`,
      extraTasks,
      replaceBaseTasks: true,
    };

    previewStages.push({
      stageNumber: stageNum,
      title: stageTitle,
      theme: stageTheme,
      vocabCount: cleanVocab.length,
      grammarCount: cleanGrammar.length,
      kanjiCount: cleanKanji.length,
      quizCount: cleanQuizzes.length,
      appTaskCount: stageAppCount,
    });
  });

  if (errors.length > 0) {
    return { ok: false, errors, fixPrompt: buildFixPrompt(errors, extracted) };
  }

  const config: CustomRoadmapConfig = {
    id: `custom-${batchId}`,
    name: roadmapName,
    level,
    textbookId: book.id,
    startDate: todayKey,
    dailyMinutesTarget,
    totalStages: rawStages.length,
    studyWeekdays,
    skills: usedSkills.size > 0 ? Array.from(usedSkills) : ['vocab', 'quiz'],
    reminderTime: '20:00',
    repeatIntervalMinutes: 10,
    stageOverrides,
    chunkTitles: {
      1: roadmapName,
    },
    authorName:
      typeof roadmapMeta.authorName === 'string' && roadmapMeta.authorName.trim()
        ? roadmapMeta.authorName.trim().slice(0, 48)
        : 'Tự tạo bằng AI / JSON',
    includeKanaStarter: false,
  };

  return {
    ok: true,
    config,
    lessons: generatedLessons,
    preview: {
      name: roadmapName,
      level,
      dailyMinutesTarget,
      studyWeekdays,
      stageCount: rawStages.length,
      totalVocab,
      totalGrammar,
      totalKanji,
      totalQuizzes,
      totalAppTasks,
      stages: previewStages,
    },
  };
}

/**
 * Exports any CustomRoadmapConfig (along with all referenced Studio custom lessons)
 * into a clean, re-importable `schemaVersion: 1` JSON string.
 */
export function exportRoadmapToJson(
  config: CustomRoadmapConfig,
  studioLessons: CustomLesson[],
): string {
  const lessonById = new Map<string, CustomLesson>();
  for (const lesson of studioLessons) {
    lessonById.set(lesson.id, lesson);
  }

  const stages: RoadmapJsonStageInput[] = [];
  for (let i = 1; i <= config.totalStages; i += 1) {
    const ov = config.stageOverrides?.[i];
    const stageEntry: RoadmapJsonStageInput = {
      stageNumber: i,
      title: ov?.title?.trim() || `Màn ${i} · ${config.name}`,
      ...(ov?.theme ? { theme: ov.theme } : {}),
    };

    const vocab: NonNullable<RoadmapJsonStageInput['vocab']> = [];
    const grammar: NonNullable<RoadmapJsonStageInput['grammar']> = [];
    const kanji: NonNullable<RoadmapJsonStageInput['kanji']> = [];
    const quizzes: NonNullable<RoadmapJsonStageInput['quizzes']> = [];
    const appTasks: RoadmapJsonAppTaskInput[] = [];

    for (const task of ov?.extraTasks ?? []) {
      const m = task.to.match(/[?&](?:lesson|customLesson)=([A-Za-z0-9_-]+)/);
      const linkedLesson = m ? lessonById.get(m[1]) : undefined;
      if (linkedLesson) {
        if (linkedLesson.kind === 'vocab' && linkedLesson.vocabItems) {
          linkedLesson.vocabItems.forEach((v) =>
            vocab.push({
              kanji: v.kanji,
              hiragana: v.hiragana,
              ...(v.hanViet ? { hanViet: v.hanViet } : {}),
              meaning: v.meaning,
              ...(v.example ? { example: v.example } : {}),
            }),
          );
        } else if (linkedLesson.kind === 'grammar' && linkedLesson.grammarItems) {
          linkedLesson.grammarItems.forEach((g) =>
            grammar.push({
              structure: g.structure,
              meaning: g.meaning,
              ...(g.usage ? { usage: g.usage } : {}),
              ...(g.exampleJp ? { exampleJp: g.exampleJp } : {}),
              ...(g.exampleVi ? { exampleVi: g.exampleVi } : {}),
            }),
          );
        } else if (linkedLesson.kind === 'kanji' && linkedLesson.kanjiItems) {
          linkedLesson.kanjiItems.forEach((k) =>
            kanji.push({
              kanji: k.kanji,
              ...(k.hanViet ? { hanViet: k.hanViet } : {}),
              meaning: k.meaning,
              ...(k.reading ? { reading: k.reading } : {}),
              ...(k.mnemonic ? { mnemonic: k.mnemonic } : {}),
            }),
          );
        } else if (linkedLesson.kind === 'quiz' && linkedLesson.quizItems) {
          linkedLesson.quizItems.forEach((q) =>
            quizzes.push({
              prompt: q.prompt,
              options: q.options,
              correctIndex: q.correctIndex,
              ...(q.explanation ? { explanation: q.explanation } : {}),
              ...(q.speakText ? { speakText: q.speakText } : {}),
            }),
          );
        }
      } else {
        appTasks.push({
          kind: task.skill,
          title: task.title,
          to: task.to,
        });
      }
    }

    if (vocab.length > 0) stageEntry.vocab = vocab;
    if (grammar.length > 0) stageEntry.grammar = grammar;
    if (kanji.length > 0) stageEntry.kanji = kanji;
    if (quizzes.length > 0) stageEntry.quizzes = quizzes;
    if (appTasks.length > 0) {
      stageEntry.appTasks = appTasks;
    } else if (
      vocab.length === 0 &&
      grammar.length === 0 &&
      kanji.length === 0 &&
      quizzes.length === 0
    ) {
      stageEntry.appTasks = [
        {
          kind: config.skills[0] ?? 'quiz',
          title: `Bài luyện Màn ${i} từ kho App`,
          lesson: i,
        },
      ];
    }

    stages.push(stageEntry);
  }

  const doc: RoadmapJsonDocument = {
    schemaVersion: AI_ROADMAP_SCHEMA_VERSION,
    roadmap: {
      name: config.name,
      level: config.level,
      dailyMinutesTarget: config.dailyMinutesTarget,
      studyWeekdays: config.studyWeekdays,
      textbookId: config.textbookId,
      ...(config.authorName ? { authorName: config.authorName } : {}),
    },
    stages,
  };

  return JSON.stringify(doc, null, 2);
}

/**
 * Ready-to-test 3-stage N5 JSON sample so users can experience AI JSON Import
 * in 1 click without switching tabs first.
 */
export const SAMPLE_AI_ROADMAP_JSON = JSON.stringify(
  {
    schemaVersion: 1,
    roadmap: {
      name: 'N5 · Tiếng Nhật Quán Ăn (3 Buổi Thực Chiến)',
      level: 'N5',
      dailyMinutesTarget: 15,
      studyWeekdays: [1, 2, 3, 4, 5],
      description: 'Mẫu JSON demo gồm Từ vựng, Ngữ pháp, Quiz 4 đáp án và bài Nghe hiểu từ kho App.',
      authorName: 'AI Demo · Nihongo 問',
    },
    stages: [
      {
        stageNumber: 1,
        title: 'Chào đón & Dẫn khách vào bàn',
        theme: 'Phản xạ giao tiếp ngay khi khách bước vào quán',
        vocab: [
          {
            kanji: 'いらっしゃいませ',
            hiragana: 'いらっしゃいませ',
            meaning: 'Kính chào quý khách',
            example: 'いらっしゃいませ、何名様ですか。',
          },
          {
            kanji: '何名様',
            hiragana: 'なんめいさま',
            hanViet: 'HÀ DANH DẠNG',
            meaning: 'Mấy vị khách ạ',
            example: '何名様でいらっしゃいますか。',
          },
          {
            kanji: 'お席',
            hiragana: 'おせき',
            hanViet: 'TỊCH',
            meaning: 'Chỗ ngồi (kính ngữ)',
            example: 'お席へご案内いたします。',
          },
          {
            kanji: 'こちら',
            hiragana: 'こちら',
            meaning: 'Lối này / Đằng này (lịch sự)',
            example: 'こちらへどうぞ。',
          },
        ],
        grammar: [
          {
            structure: 'N + へ どうぞ',
            meaning: 'Xin mời đi lối N ạ',
            usage: 'Dùng khi hướng dẫn khách ngồi hoặc di chuyển',
            exampleJp: 'こちらのお席へどうぞ。',
            exampleVi: 'Xin mời quý khách ngồi ở bàn này ạ.',
          },
        ],
        quizzes: [
          {
            prompt: 'Khi khách mở cửa bước vào nhà hàng, nhân viên cần nói câu nào đầu tiên?',
            options: [
              'いらっしゃいませ',
              'いただきます',
              'おやすみなさい',
              'ただいま',
            ],
            correctIndex: 0,
            explanation: 'いらっしゃいませ là câu chào đón khách tiêu chuẩn tại mọi cửa hàng và nhà hàng Nhật.',
          },
          {
            prompt: 'Muốn hỏi lịch sự "Quý khách đi mấy người ạ?", bạn nói câu nào?',
            options: [
              '何名様ですか。',
              'いくらですか。',
              '何時ですか。',
              'どこですか。',
            ],
            correctIndex: 0,
            explanation: '何名様ですか (なんめいさまですか) là cách hỏi số lượng khách lịch sự trong nhà hàng.',
          },
          {
            prompt: 'Câu "こちらへどうぞ" có nghĩa là gì?',
            options: [
              'Xin mời đi lối này ạ',
              'Xin vui lòng chờ một chút',
              'Hết món này rồi ạ',
              'Cảm ơn quý khách đã thanh toán',
            ],
            correctIndex: 0,
            explanation: 'こちら (lối này, lịch sự) + へどうぞ (xin mời).',
          },
        ],
        appTasks: [
          {
            kind: 'listening',
            title: 'Nghe hội thoại tình huống Nhà hàng (Kho App)',
            topic: 'restaurant',
            lesson: 1,
          },
        ],
      },
      {
        stageNumber: 2,
        title: 'Gọi món & Xác nhận yêu cầu',
        theme: 'Nghe hiểu order đồ ăn, đồ uống và xác nhận lại cho khách',
        vocab: [
          {
            kanji: 'ご注文',
            hiragana: 'ごちゅうもん',
            hanViet: 'CHÚ VĂN',
            meaning: 'Gọi món (lịch sự)',
            example: 'ご注文はお決まりですか。',
          },
          {
            kanji: 'お水',
            hiragana: 'おみず',
            hanViet: 'THỦY',
            meaning: 'Nước lọc',
            example: 'お水を一つお願いします。',
          },
          {
            kanji: 'おすすめ',
            hiragana: 'おすすめ',
            meaning: 'Món gợi ý / đặc sản của quán',
            example: '今日のおすすめはラーメンです。',
          },
          {
            kanji: '少々お待ちください',
            hiragana: 'しょうしょうおまちください',
            meaning: 'Xin vui lòng chờ một chút ạ',
            example: 'かしこまりました。少々お待ちください。',
          },
        ],
        quizzes: [
          {
            prompt: 'Khách giơ tay muốn gọi món, nhân viên hỏi lịch sự như thế nào?',
            options: [
              'ご注文はお決まりですか。',
              'お名前は何ですか。',
              'お元気ですか。',
              'おいくつですか。',
            ],
            correctIndex: 0,
            explanation: 'ご注文はお決まりですか = Quý khách đã chọn được món chưa ạ?',
          },
          {
            prompt: 'Từ "かしこまりました" dùng khi nào?',
            options: [
              'Khi xác nhận "Vâng, tôi hiểu rồi ạ" một cách rất lịch sự với khách',
              'Khi xin lỗi vì làm đổ nước',
              'Khi tạm biệt khách ra về',
              'Khi hỏi khách có ăn cay không',
            ],
            correctIndex: 0,
            explanation: 'かしこまりました là kính ngữ cao nhất của わかりました, cực kỳ hay dùng trong ngành dịch vụ.',
          },
          {
            prompt: '"少々お待ちください" có nghĩa là gì?',
            options: [
              'Xin vui lòng chờ một lát ạ',
              'Mời quý khách dùng bữa',
              'Quán sắp đóng cửa ạ',
              'Xin mời thanh toán ở quầy',
            ],
            correctIndex: 0,
            explanation: '少々 (một chút) + お待ちください (vui lòng đợi).',
          },
        ],
        appTasks: [
          {
            kind: 'reading',
            title: 'Đọc hiểu tình huống mua sắm & gọi món (Kho App)',
            lesson: 2,
          },
        ],
      },
      {
        stageNumber: 3,
        title: 'Thanh toán & Tiễn khách',
        theme: 'Báo tổng tiền, hỏi hình thức thanh toán và chào tạm biệt',
        vocab: [
          {
            kanji: 'お会計',
            hiragana: 'おかいけい',
            hanViet: 'HỘI KẾ',
            meaning: 'Tính tiền / thanh toán',
            example: 'お会計をお願いします。',
          },
          {
            kanji: 'レシート',
            hiragana: 'レシート',
            meaning: 'Hóa đơn bán lẻ',
            example: 'レシートは必要ですか。',
          },
          {
            kanji: 'お釣り',
            hiragana: 'おつり',
            meaning: 'Tiền thừa / tiền thối',
            example: '200円のお釣りです。',
          },
          {
            kanji: 'またお越しくださいませ',
            hiragana: 'またおこくださいませ',
            meaning: 'Hẹn gặp lại quý khách lần sau ạ',
            example: 'ありがとうございました。またお越しくださいませ。',
          },
        ],
        quizzes: [
          {
            prompt: 'Khách nói "お会計をお願いします", khách muốn làm gì?',
            options: [
              'Muốn thanh toán tính tiền',
              'Muốn gọi thêm nước lọc',
              'Muốn đổi bàn khác',
              'Muốn hỏi nhà vệ sinh ở đâu',
            ],
            correctIndex: 0,
            explanation: 'お会計 (おかいけい) nghĩa là tính tiền / thanh toán.',
          },
          {
            prompt: 'Tiền thừa trả lại cho khách trong tiếng Nhật gọi là gì?',
            options: ['お釣り (おつり)', 'お水 (おみず)', 'お席 (おせき)', 'お箸 (おはし)'],
            correctIndex: 0,
            explanation: 'お釣り (おつり) là tiền thừa / tiền thối lại cho khách.',
          },
          {
            prompt: 'Khi khách thanh toán xong và bước ra cửa, câu tiễn khách chuẩn là:',
            options: [
              'ありがとうございました。またお越しくださいませ。',
              'いらっしゃいませ。何名様ですか。',
              'ご注文はお決まりですか。',
              '少々お待ちください。',
            ],
            correctIndex: 0,
            explanation: 'Cảm ơn quý khách và hẹn gặp lại lần sau (またお越しくださいませ).',
          },
        ],
        appTasks: [
          {
            kind: 'quiz',
            title: 'Luyện Quiz tổng hợp N5 (Kho App)',
            lesson: 3,
          },
        ],
      },
    ],
  },
  null,
  2,
);
