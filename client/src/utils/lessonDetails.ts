/** Turns a roadmap lesson (built-in or self-made) into rows for the preview dialog. */
import type { CmsSnapshot } from '../services/adminCmsService';
import {
  getLiveGrammarBooks,
  getLiveJlptListeningItems,
  getLiveJlptMcqQuestions,
  getLiveJlptReadingPassages,
  getLiveJlptStarQuestions,
  getLiveKanjis,
  getLiveVocabForUnit,
} from '../services/curriculumStore';
import type { CustomLesson } from '../services/customStudioService';
import type { CurriculumTaskPreset } from '../services/stageRoadmapService';
import { getListeningSituation, getReadingSituation } from '../data/jlpt/situationPackUtils';
import type { JLPTLevelFilter } from '../data/jlpt/jlptDataset';
import type { JLPTLevel } from '../types/quiz';

export interface LessonDetailRow {
  main: string;
  sub?: string;
  options?: string[];
  correctIndex?: number;
}

export interface LessonDetail {
  title: string;
  summary: string;
  rows: LessonDetailRow[];
  /** How many rows are not shown */
  more: number;
}

const MAX_ROWS = 50;

const build = (title: string, summary: string, rows: LessonDetailRow[]): LessonDetail => ({
  title,
  summary,
  rows: rows.slice(0, MAX_ROWS),
  more: Math.max(0, rows.length - MAX_ROWS),
});

export function describeCustomLesson(lesson: CustomLesson): LessonDetail {
  const rows: LessonDetailRow[] =
    lesson.kind === 'quiz'
      ? (lesson.quizItems ?? []).map((q) => ({
          main: q.prompt || q.speakText || '(câu nghe)',
          sub: q.explanation,
          options: q.options,
          correctIndex: q.correctIndex,
        }))
      : lesson.kind === 'grammar'
        ? (lesson.grammarItems ?? []).map((g) => ({
            main: g.structure,
            sub: [g.meaning, g.exampleJp].filter(Boolean).join(' · '),
          }))
        : lesson.kind === 'kanji'
          ? (lesson.kanjiItems ?? []).map((k) => ({
              main: k.kanji,
              sub: [k.hanViet, k.meaning, k.reading].filter(Boolean).join(' · '),
            }))
          : (lesson.vocabItems ?? []).map((v) => ({
              main: v.kanji && v.kanji !== v.hiragana ? `${v.kanji}（${v.hiragana}）` : v.hiragana,
              sub: v.meaning,
            }));
  return build(lesson.title, `${lesson.level} · ${rows.length} mục`, rows);
}

export function describeCatalogLesson(
  preset: CurriculumTaskPreset,
  level: JLPTLevel,
  snapshot: CmsSnapshot,
): LessonDetail {
  const [path, query = ''] = preset.to.split('?');
  const params = new URLSearchParams(query);
  const segments = path.split('/').filter(Boolean);
  const summary = `${preset.group} · khoảng ${preset.minutes} phút. ${preset.subtitle}`;
  const done = (rows: LessonDetailRow[]) => build(preset.title, summary, rows);

  // Vocabulary of one unit: reading list, flashcards, quiz or a mini-game on it
  const unitKey =
    segments[0] === 'vocabulary' && segments[2] === 'book'
      ? segments[4]
      : segments[0] === 'flashcard'
        ? segments[segments.length - 1]
        : (params.get('unitDbId') ?? params.get('unit'));
  if (unitKey && (segments[0] === 'vocabulary' || segments[0] === 'flashcard' || segments[0] === 'games')) {
    const words = getLiveVocabForUnit(snapshot, level, Number.isNaN(Number(unitKey)) ? unitKey : Number(unitKey));
    return done(
      words.map((w) => ({
        main: w.kanji && w.kanji !== w.hiragana ? `${w.kanji}（${w.hiragana}）` : w.hiragana,
        sub: w.meaning,
      })),
    );
  }

  if (segments[0] === 'grammar' && segments.length >= 3) {
    const chapter = getLiveGrammarBooks(snapshot)
      .find((b) => b.id === segments[1])
      ?.chapters.find((c) => c.id === segments[2]);
    return done((chapter?.grammars ?? []).map((g) => ({ main: g.name, sub: g.meaning })));
  }

  if (segments[0] === 'kanji' && params.get('group')) {
    const size = Number(params.get('size')) || 10;
    const start = (Number(params.get('group')) - 1) * size;
    return done(
      getLiveKanjis(snapshot)
        .filter((k) => k.jlptLevel === level)
        .slice(start, start + size)
        .map((k) => ({ main: k.kanji, sub: `${k.hanViet} · ${k.meanings.join(', ')}` })),
    );
  }

  if (segments[0] === 'jlpt') {
    const jlptLevel = level as JLPTLevelFilter;
    const moduleId = segments[1];
    const topic = params.get('topic');
    if (moduleId === 'reading-short' || moduleId === 'reading-medium' || moduleId === 'reading-long') {
      return done(
        getLiveJlptReadingPassages(snapshot, moduleId, jlptLevel)
          .filter((p) => !topic || getReadingSituation(p) === topic)
          .map((p) => ({ main: p.title, sub: `${p.questions.length} câu hỏi` })),
      );
    }
    if (moduleId === 'listening') {
      return done(
        getLiveJlptListeningItems(snapshot, jlptLevel)
          .filter((i) => !topic || getListeningSituation(i) === topic)
          .map((i) => ({ main: i.questionPrompt, sub: i.situation })),
      );
    }
    if (moduleId === 'kanji' || moduleId === 'vocab' || moduleId === 'grammar') {
      return done(
        getLiveJlptMcqQuestions(snapshot, moduleId, jlptLevel).map((q) => ({
          main: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
        })),
      );
    }
    if (moduleId === 'star') {
      return done(
        getLiveJlptStarQuestions(snapshot, jlptLevel).map((q) => ({ main: q.fullSentence, sub: q.meaning })),
      );
    }
  }

  return done([]);
}
