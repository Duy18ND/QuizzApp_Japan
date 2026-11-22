/**
 * Exports static client datasets (unitData, unit1, kanjiDataset, grammar, jlptDataset)
 * into deterministic JSON & idempotent PostgreSQL seed SQL (`supabase/seed.json` & `supabase/seed.sql`).
 *
 * Usage (from repository root):
 *   node scripts/seedDatabase.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../client/node_modules/vite/dist/node/index.js';

interface SeedUnitRow {
  id: string;
  level: string;
  unit_number: number;
  textbook_id: string | null;
  title: string;
  description: string;
  order_index: number;
  is_published: boolean;
}

interface SeedVocabRow {
  id: number;
  unit_id: string;
  word_number: number | null;
  kanji: string | null;
  hiragana: string;
  han_viet: string | null;
  meaning: string;
  word_type: string;
  example_sentence: string | null;
  example_meaning: string | null;
  notes: string | null;
  level: string;
  tags: string[];
  semantic_roles: string[];
}

interface SeedKanjiRow {
  id: string;
  character: string;
  han_viet: string;
  meanings: string[];
  onyomi: string[];
  kunyomi: string[];
  stroke_count: number;
  jlpt_level: string;
  examples: unknown[];
}

interface SeedGrammarRow {
  id: string;
  book_id: string;
  chapter_id: string;
  level: string;
  title: string;
  structure: string;
  meaning: string;
  explanation: string;
  notes: string;
  examples: unknown[];
}

interface SeedJlptRow {
  id: string;
  module_id: string;
  level: string;
  question_type: string;
  prompt: string;
  passage: string | null;
  options: unknown;
  correct_index: number;
  explanation: string;
  audio_text: string | null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CLIENT_DIR = path.join(ROOT_DIR, 'client');
const OUT_DIR = path.join(ROOT_DIR, 'supabase');

const sqlStr = (val: string | null | undefined): string => {
  if (val === null || val === undefined) return 'null';
  return `'${String(val).replace(/'/g, "''")}'`;
};

const sqlJsonb = (val: unknown): string => `${sqlStr(JSON.stringify(val ?? []))}::jsonb`;

const sqlTextArray = (arr: string[] = []): string => {
  if (!arr || arr.length === 0) return `'{}'::text[]`;
  return `array[${arr.map((item) => sqlStr(item)).join(', ')}]::text[]`;
};

async function main() {
  const vite = await createServer({
    root: CLIENT_DIR,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });

  try {
    const [{ UNIT_DATA }, { allVocabularyData }, kanjiRaw, { grammarBooks, allGrammarSentencesBank }, jlptMod] = await Promise.all([
      vite.ssrLoadModule('/src/data/unitData.ts'),
      vite.ssrLoadModule('/src/data/index.ts'),
      fs.promises.readFile(path.join(CLIENT_DIR, 'src/data/kanji/kanjiDataset.json'), 'utf8'),
      vite.ssrLoadModule('/src/data/grammar/index.ts'),
      vite.ssrLoadModule('/src/data/jlpt/jlptDataset.ts'),
    ]);

    const allSentences = allGrammarSentencesBank as Array<{ grammarId: string; japanese: string; hiragana: string; vietnamese: string }>;

    const units: SeedUnitRow[] = [];
    let orderCounter = 1;
    for (const [level, list] of Object.entries(UNIT_DATA as Record<string, Array<{ id: number; name: string; totalWords: number; textbookId?: string }>>)) {
      for (const u of list) {
        units.push({
          id: `${level.toLowerCase()}-unit-${u.id}`,
          level,
          unit_number: u.id,
          textbook_id: u.textbookId ?? null,
          title: u.name,
          description: u.totalWords > 0 ? `${u.totalWords} từ vựng chuẩn JLPT ${level}` : 'Sắp ra mắt',
          order_index: orderCounter++,
          is_published: u.totalWords > 0,
        });
      }
    }

    const vocabularies: SeedVocabRow[] = [];
    for (const [lvlKey, unitMap] of Object.entries(
      allVocabularyData as Record<string, Record<string, Array<Record<string, unknown>>>>,
    )) {
      for (const [unitKey, words] of Object.entries(unitMap)) {
        const level = lvlKey.toUpperCase();
        const unit_id = `${lvlKey.toLowerCase()}-unit-${unitKey}`;
        for (const w of words) {
          vocabularies.push({
            id: Number(w.id),
            unit_id,
            word_number: typeof w.wordNumber === 'number' ? w.wordNumber : null,
            kanji: typeof w.kanji === 'string' && w.kanji.trim() ? w.kanji.trim() : null,
            hiragana: String(w.hiragana || ''),
            han_viet: typeof w.hanViet === 'string' && w.hanViet.trim() ? w.hanViet.trim() : null,
            meaning: String(w.meaning || ''),
            word_type: String(w.wordType || 'Khác'),
            example_sentence: typeof w.exampleSentence === 'string' ? w.exampleSentence : null,
            example_meaning: typeof w.exampleMeaning === 'string' ? w.exampleMeaning : null,
            notes: typeof w.notes === 'string' ? w.notes : null,
            level: typeof w.level === 'string' ? w.level : level,
            tags: Array.isArray(w.tags) ? w.tags.map(String) : [],
            semantic_roles: Array.isArray(w.semanticRoles) ? w.semanticRoles.map(String) : [],
          });
        }
      }
    }

    const parsedKanji = JSON.parse(kanjiRaw) as Array<Record<string, unknown>>;
    const kanjis: SeedKanjiRow[] = parsedKanji.map((k) => ({
      id: String(k.id || k.kanji),
      character: String(k.kanji),
      han_viet: String(k.hanViet || ''),
      meanings: Array.isArray(k.meanings) ? k.meanings.map(String) : [],
      onyomi: Array.isArray(k.onReadings) ? k.onReadings.map(String) : [],
      kunyomi: Array.isArray(k.kunReadings) ? k.kunReadings.map(String) : [],
      stroke_count: typeof k.strokeCount === 'number' ? k.strokeCount : 0,
      jlpt_level: String(k.jlptLevel || 'N3'),
      examples: Array.isArray(k.examples) ? k.examples : [],
    }));

    const grammarRules: SeedGrammarRow[] = [];
    for (const book of grammarBooks as Array<{
      id: string;
      chapters: Array<{ id: string; grammars: Array<Record<string, unknown>> }>;
    }>) {
      for (const ch of book.chapters) {
        for (const g of ch.grammars) {
          const gid = String(g.id);
          const examples = allSentences
            .filter((s: { grammarId: string }) => s.grammarId === gid)
            .slice(0, 5)
            .map((s: { japanese: string; hiragana: string; vietnamese: string }) => ({
              japanese: s.japanese,
              hiragana: s.hiragana,
              vietnamese: s.vietnamese,
            }));

          grammarRules.push({
            id: gid,
            book_id: String(g.bookId || book.id),
            chapter_id: String(g.chapterId || ch.id),
            level: String(g.level || 'N3'),
            title: String(g.name || gid),
            structure: Array.isArray(g.patterns)
              ? (g.patterns as Array<{ pattern?: string }>).map((p) => p.pattern).filter(Boolean).join(' / ')
              : String(g.hiragana || ''),
            meaning: String(g.meaning || ''),
            explanation: String(g.explanation || ''),
            notes: String(g.notes || ''),
            examples,
          });
        }
      }
    }

    const jlptQuestions: SeedJlptRow[] = [];
    for (const mod of ['kanji', 'vocab', 'grammar'] as const) {
      for (const q of jlptMod.getJLPTMcqQuestions(mod, 'ALL')) {
        jlptQuestions.push({
          id: q.id,
          module_id: q.moduleId,
          level: q.level,
          question_type: 'mcq',
          prompt: q.prompt,
          passage: null,
          options: q.options,
          correct_index: q.correctIndex,
          explanation: q.explanation,
          audio_text: null,
        });
      }
    }
    for (const star of jlptMod.getJLPTStarQuestions('ALL')) {
      jlptQuestions.push({
        id: star.id,
        module_id: 'star',
        level: star.level,
        question_type: 'star',
        prompt: `${star.prefix} ____ ____ ★ ____ ${star.suffix}`.trim(),
        passage: star.fullSentence,
        options: star.chunks,
        correct_index: star.starIndex,
        explanation: star.explanation,
        audio_text: null,
      });
    }
    for (const rMod of ['reading-short', 'reading-medium', 'reading-long'] as const) {
      for (const passage of jlptMod.getJLPTReadingPassages(rMod, 'ALL')) {
        for (const q of passage.questions) {
          jlptQuestions.push({
            id: `${passage.id}_${q.id}`,
            module_id: passage.moduleId,
            level: passage.level,
            question_type: 'reading',
            prompt: q.prompt,
            passage: passage.title,
            options: q.options,
            correct_index: q.correctIndex,
            explanation: q.explanation,
            audio_text: null,
          });
        }
      }
    }
    for (const listen of jlptMod.getJLPTListeningItems('ALL')) {
      jlptQuestions.push({
        id: listen.id,
        module_id: 'listening',
        level: listen.level,
        question_type: 'listening',
        prompt: listen.questionPrompt || '',
        passage: null,
        options: listen.options,
        correct_index: listen.correctIndex,
        explanation: listen.explanation,
        audio_text: Array.isArray(listen.dialogue)
          ? listen.dialogue.map((d: { plainText: string }) => d.plainText).join('\n')
          : null,
      });
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });

    const jsonPayload = {
      generatedAt: new Date().toISOString(),
      counts: {
        units: units.length,
        vocabularies: vocabularies.length,
        kanjis: kanjis.length,
        grammar_rules: grammarRules.length,
        jlpt_questions: jlptQuestions.length,
      },
      units,
      vocabularies,
      kanjis,
      grammar_rules: grammarRules,
      jlpt_questions: jlptQuestions,
    };

    fs.writeFileSync(path.join(OUT_DIR, 'seed.json'), JSON.stringify(jsonPayload, null, 2), 'utf8');

    const sqlLines: string[] = [
      '-- Auto-generated seed data from client/src/data/ via scripts/seedDatabase.ts',
      'begin;',
      '',
    ];

    for (const u of units) {
      sqlLines.push(
        `insert into public.units (id, level, unit_number, textbook_id, title, description, order_index, is_published) values (${sqlStr(u.id)}, ${sqlStr(u.level)}, ${u.unit_number}, ${sqlStr(u.textbook_id)}, ${sqlStr(u.title)}, ${sqlStr(u.description)}, ${u.order_index}, ${u.is_published}) on conflict (id) do update set level = excluded.level, unit_number = excluded.unit_number, textbook_id = excluded.textbook_id, title = excluded.title, description = excluded.description, order_index = excluded.order_index, is_published = excluded.is_published;`,
      );
    }
    sqlLines.push('');

    for (const v of vocabularies) {
      sqlLines.push(
        `insert into public.vocabularies (id, unit_id, word_number, kanji, hiragana, han_viet, meaning, word_type, example_sentence, example_meaning, notes, level, tags, semantic_roles) values (${v.id}, ${sqlStr(v.unit_id)}, ${v.word_number ?? 'null'}, ${sqlStr(v.kanji)}, ${sqlStr(v.hiragana)}, ${sqlStr(v.han_viet)}, ${sqlStr(v.meaning)}, ${sqlStr(v.word_type)}, ${sqlStr(v.example_sentence)}, ${sqlStr(v.example_meaning)}, ${sqlStr(v.notes)}, ${sqlStr(v.level)}, ${sqlTextArray(v.tags)}, ${sqlTextArray(v.semantic_roles)}) on conflict (id) do update set unit_id = excluded.unit_id, word_number = excluded.word_number, kanji = excluded.kanji, hiragana = excluded.hiragana, han_viet = excluded.han_viet, meaning = excluded.meaning, word_type = excluded.word_type, example_sentence = excluded.example_sentence, example_meaning = excluded.example_meaning, notes = excluded.notes, level = excluded.level, tags = excluded.tags, semantic_roles = excluded.semantic_roles;`,
      );
    }
    sqlLines.push('');

    for (const k of kanjis) {
      sqlLines.push(
        `insert into public.kanjis (id, character, han_viet, meanings, onyomi, kunyomi, stroke_count, jlpt_level, examples) values (${sqlStr(k.id)}, ${sqlStr(k.character)}, ${sqlStr(k.han_viet)}, ${sqlJsonb(k.meanings)}, ${sqlJsonb(k.onyomi)}, ${sqlJsonb(k.kunyomi)}, ${k.stroke_count}, ${sqlStr(k.jlpt_level)}, ${sqlJsonb(k.examples)}) on conflict (id) do update set character = excluded.character, han_viet = excluded.han_viet, meanings = excluded.meanings, onyomi = excluded.onyomi, kunyomi = excluded.kunyomi, stroke_count = excluded.stroke_count, jlpt_level = excluded.jlpt_level, examples = excluded.examples;`,
      );
    }
    sqlLines.push('');

    for (const g of grammarRules) {
      sqlLines.push(
        `insert into public.grammar_rules (id, book_id, chapter_id, level, title, structure, meaning, explanation, notes, examples) values (${sqlStr(g.id)}, ${sqlStr(g.book_id)}, ${sqlStr(g.chapter_id)}, ${sqlStr(g.level)}, ${sqlStr(g.title)}, ${sqlStr(g.structure)}, ${sqlStr(g.meaning)}, ${sqlStr(g.explanation)}, ${sqlStr(g.notes)}, ${sqlJsonb(g.examples)}) on conflict (id) do update set book_id = excluded.book_id, chapter_id = excluded.chapter_id, level = excluded.level, title = excluded.title, structure = excluded.structure, meaning = excluded.meaning, explanation = excluded.explanation, notes = excluded.notes, examples = excluded.examples;`,
      );
    }
    sqlLines.push('');

    for (const q of jlptQuestions) {
      sqlLines.push(
        `insert into public.jlpt_questions (id, module_id, level, question_type, prompt, passage, options, correct_index, explanation, audio_text) values (${sqlStr(q.id)}, ${sqlStr(q.module_id)}, ${sqlStr(q.level)}, ${sqlStr(q.question_type)}, ${sqlStr(q.prompt)}, ${sqlStr(q.passage)}, ${sqlJsonb(q.options)}, ${q.correct_index}, ${sqlStr(q.explanation)}, ${sqlStr(q.audio_text)}) on conflict (id) do update set module_id = excluded.module_id, level = excluded.level, question_type = excluded.question_type, prompt = excluded.prompt, passage = excluded.passage, options = excluded.options, correct_index = excluded.correct_index, explanation = excluded.explanation, audio_text = excluded.audio_text;`,
      );
    }
    sqlLines.push('');
    sqlLines.push("select setval(pg_get_serial_sequence('public.vocabularies', 'id'), coalesce((select max(id) from public.vocabularies), 1));");
    sqlLines.push('commit;');

    fs.writeFileSync(path.join(OUT_DIR, 'seed.sql'), sqlLines.join('\n'), 'utf8');

    console.log('Seed files generated:', jsonPayload.counts);
  } finally {
    await vite.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
