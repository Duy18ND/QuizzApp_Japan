import type {
  AdminGrammarExample,
  AdminGrammarRecord,
  AdminJlptModuleId,
  AdminJlptRecord,
  AdminKanjiRecord,
  AdminVocabRecord,
  BatchValidatedRow,
  BatchValidationReport,
  CmsEntityType,
} from '../types/admin';
import type { JLPTLevel } from '../types/quiz';

const VALID_LEVELS = new Set<JLPTLevel>(['N5', 'N4', 'N3', 'N2', 'N1']);
const VALID_JLPT_MODULES = new Set<AdminJlptModuleId>([
  'kanji',
  'vocab',
  'grammar',
  'star',
  'reading-short',
  'reading-medium',
  'reading-long',
  'listening',
]);

const normalizeText = (value: string | null | undefined): string =>
  (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

const isRecord = (val: unknown): val is Record<string, unknown> =>
  Boolean(val) && typeof val === 'object' && !Array.isArray(val);

const pickValue = (obj: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (key in obj && obj[key] !== undefined && obj[key] !== null) {
      return obj[key];
    }
  }
  const lowerMap = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj)) {
    lowerMap.set(k.trim().toLowerCase(), v);
  }
  for (const key of keys) {
    const found = lowerMap.get(key.trim().toLowerCase());
    if (found !== undefined && found !== null) return found;
  }
  return undefined;
};

const pickString = (obj: Record<string, unknown>, keys: string[]): string => {
  const raw = pickValue(obj, keys);
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return '';
};

const parseStringList = (raw: unknown): string[] => {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        // fallback to delimiter splitting
      }
    }
    const separator = trimmed.includes('|') ? '|' : trimmed.includes(';') ? ';' : ',';
    return trimmed
      .split(separator)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [];
};

const parseGrammarExamples = (raw: unknown): AdminGrammarExample[] => {
  if (Array.isArray(raw)) {
    return raw
      .filter(isRecord)
      .map((ex) => ({
        japanese: pickString(ex, ['japanese', 'sentence', 'ja']),
        hiragana: pickString(ex, ['hiragana', 'reading']),
        vietnamese: pickString(ex, ['vietnamese', 'meaning', 'vi']),
      }))
      .filter((ex) => ex.japanese || ex.vietnamese);
  }
  if (typeof raw === 'string' && raw.trim()) {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parseGrammarExamples(parsed);
      } catch {
        // fallback to line format
      }
    }
    return trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [japanese = '', hiragana = '', vietnamese = ''] = line.split('|').map((s) => s.trim());
        return { japanese, hiragana, vietnamese };
      })
      .filter((ex) => ex.japanese);
  }
  return [];
};

export function parseCsvRecords(csvText: string): {
  headers: string[];
  rows: Array<Record<string, string>>;
  error?: string;
} {
  const cleaned = csvText.replace(/^\uFEFF/, '');
  if (!cleaned.trim()) {
    return { headers: [], rows: [], error: 'Nội dung CSV trống.' };
  }

  const matrix: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(cell);
      matrix.push(row);
      row = [];
      cell = '';
      i += 1;
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell);
      matrix.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }

  if (inQuotes) {
    return {
      headers: [],
      rows: [],
      error: 'CSV không hợp lệ: có dấu ngoặc kép (") chưa được đóng.',
    };
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    matrix.push(row);
  }

  const nonEmptyRows = matrix.filter((r) => r.some((val) => val.trim() !== ''));
  if (nonEmptyRows.length < 2) {
    return {
      headers: [],
      rows: [],
      error: 'CSV cần ít nhất 1 dòng tiêu đề (header) và 1 dòng dữ liệu.',
    };
  }

  const headers = nonEmptyRows[0].map((h) => h.trim());
  const rows: Array<Record<string, string>> = [];

  for (let idx = 1; idx < nonEmptyRows.length; idx += 1) {
    const values = nonEmptyRows[idx];
    const record: Record<string, string> = {};
    for (let col = 0; col < headers.length; col += 1) {
      const header = headers[col];
      if (!header) continue;
      record[header] = (values[col] ?? '').trim();
    }
    rows.push(record);
  }

  return { headers, rows };
}

export function parseBatchInputText(
  rawText: string,
  formatHint: 'auto' | 'json' | 'csv' = 'auto',
): {
  format: 'json' | 'csv';
  records: Array<Record<string, unknown>>;
  error?: string;
} {
  const trimmed = rawText.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    return { format: 'json', records: [], error: 'Vui lòng nhập hoặc tải lên dữ liệu JSON / CSV.' };
  }

  const looksJson =
    formatHint === 'json' ||
    (formatHint === 'auto' && (trimmed.startsWith('[') || trimmed.startsWith('{')));

  if (looksJson) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      let list: unknown[] | null = null;
      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (isRecord(parsed)) {
        const candidate = parsed.items ?? parsed.data ?? parsed.vocabularies ?? parsed.records;
        if (Array.isArray(candidate)) list = candidate;
      }

      if (!list) {
        return {
          format: 'json',
          records: [],
          error: 'JSON phải là một mảng ([...]) hoặc object chứa mảng records/vocabularies/items.',
        };
      }

      return {
        format: 'json',
        records: list.map((item) => (isRecord(item) ? item : { __invalidType: typeof item })),
      };
    } catch (err) {
      return {
        format: 'json',
        records: [],
        error: `Lỗi cú pháp JSON: ${err instanceof Error ? err.message : 'Không thể đọc JSON.'}`,
      };
    }
  }

  const csvResult = parseCsvRecords(trimmed);
  if (csvResult.error) {
    return { format: 'csv', records: [], error: csvResult.error };
  }
  return { format: 'csv', records: csvResult.rows };
}

export interface ExistingCmsLookup {
  vocabularies: AdminVocabRecord[];
  kanjis: AdminKanjiRecord[];
  grammars: AdminGrammarRecord[];
  jlptQuestions: AdminJlptRecord[];
}

export function buildVocabCompositeKey(
  kanji: string | null | undefined,
  hiragana: string,
  level: string,
): string {
  return `${normalizeText(kanji)}|${normalizeText(hiragana)}|${level.trim().toUpperCase()}`;
}

export function validateBatchImport(
  rawText: string,
  entityType: CmsEntityType,
  existing: ExistingCmsLookup,
  formatHint: 'auto' | 'json' | 'csv' = 'auto',
): BatchValidationReport {
  const parsed = parseBatchInputText(rawText, formatHint);
  if (parsed.error) {
    return {
      entityType,
      sourceFormat: parsed.format,
      parseError: parsed.error,
      rows: [],
      counts: { total: 0, valid: 0, duplicate: 0, invalid: 0 },
    };
  }

  if (entityType === 'vocabulary') {
    const idMap = new Map<number, AdminVocabRecord>();
    const compositeMap = new Map<string, AdminVocabRecord>();
    for (const item of existing.vocabularies) {
      idMap.set(item.id, item);
      compositeMap.set(buildVocabCompositeKey(item.kanji, item.hiragana, item.level), item);
    }

    const batchSeenKeys = new Set<string>();
    const batchSeenIds = new Set<number>();
    let maxExistingId = existing.vocabularies.reduce((max, item) => Math.max(max, item.id), 0);

    const rows: BatchValidatedRow<AdminVocabRecord>[] = parsed.records.map((raw, idx) => {
      const rowNumber = idx + 1;
      if ('__invalidType' in raw) {
        return {
          rowNumber,
          status: 'invalid',
          errors: [`Dòng ${rowNumber} không phải object hợp lệ.`],
          normalized: null,
          raw,
          summaryLabel: `Dòng #${rowNumber}`,
        };
      }

      const errors: string[] = [];
      const hiragana = pickString(raw, ['hiragana', 'reading', 'kana']);
      const meaning = pickString(raw, ['meaning', 'vietnamese', 'nghia']);
      const kanjiRaw = pickString(raw, ['kanji', 'word']);
      const kanji = kanjiRaw || null;
      const hanViet = pickString(raw, ['hanViet', 'han_viet', 'hanviet']) || null;
      const wordType = pickString(raw, ['wordType', 'word_type', 'type']) || 'Danh từ';
      const levelStr = (pickString(raw, ['level', 'jlptLevel', 'jlpt_level']) || 'N3').toUpperCase();
      const unitRaw = pickValue(raw, ['unitId', 'unit_id']);
      const idRaw = pickValue(raw, ['id']);
      const wordNumberRaw = pickValue(raw, ['wordNumber', 'word_number']);

      if (!hiragana) errors.push('Thiếu hiragana');
      if (!meaning) errors.push('Thiếu nghĩa (meaning)');
      if (!VALID_LEVELS.has(levelStr as JLPTLevel)) {
        errors.push(`Cấp độ không hợp lệ: "${levelStr}" (cần N5–N1)`);
      }

      let unitId = 1;
      if (unitRaw !== undefined && String(unitRaw).trim() !== '') {
        const parsedUnit = Number(unitRaw);
        if (!Number.isInteger(parsedUnit) || parsedUnit < 1) {
          errors.push(`unitId không hợp lệ: "${String(unitRaw)}"`);
        } else {
          unitId = parsedUnit;
        }
      }

      let explicitId: number | null = null;
      if (idRaw !== undefined && String(idRaw).trim() !== '') {
        const n = Number(idRaw);
        if (!Number.isInteger(n) || n <= 0) {
          errors.push(`id không hợp lệ: "${String(idRaw)}"`);
        } else {
          explicitId = n;
        }
      }

      const summaryLabel = `${kanji || hiragana || `#${rowNumber}`} (${hiragana || '?'})`;

      if (errors.length > 0) {
        return { rowNumber, status: 'invalid', errors, normalized: null, raw, summaryLabel };
      }

      const level = levelStr as JLPTLevel;
      const compositeKey = buildVocabCompositeKey(kanji, hiragana, level);
      const dupById = explicitId !== null ? idMap.get(explicitId) : undefined;
      const dupByComposite = compositeMap.get(compositeKey);
      const dupMatch = dupById ?? dupByComposite;

      const isWithinBatchDup =
        batchSeenKeys.has(compositeKey) || (explicitId !== null && batchSeenIds.has(explicitId));

      const assignedId = dupMatch?.id ?? explicitId ?? ++maxExistingId;
      batchSeenKeys.add(compositeKey);
      if (explicitId !== null) batchSeenIds.add(explicitId);

      const normalized: AdminVocabRecord = {
        id: assignedId,
        unitId,
        level,
        wordNumber:
          typeof wordNumberRaw === 'number' && Number.isFinite(wordNumberRaw)
            ? wordNumberRaw
            : Number(wordNumberRaw) > 0
              ? Number(wordNumberRaw)
              : assignedId,
        kanji,
        hiragana,
        hanViet,
        meaning,
        wordType,
        exampleSentence: pickString(raw, ['exampleSentence', 'example_sentence', 'example']) || null,
        exampleMeaning: pickString(raw, ['exampleMeaning', 'example_meaning']) || null,
        notes: pickString(raw, ['notes', 'note']) || null,
      };

      if (dupMatch || isWithinBatchDup) {
        return {
          rowNumber,
          status: 'duplicate',
          errors: [],
          duplicateOf: dupMatch
            ? `Trùng từ có sẵn (ID ${dupMatch.id})`
            : 'Trùng dòng trong cùng tệp import',
          duplicateMatchId: dupMatch?.id,
          normalized,
          raw,
          summaryLabel,
        };
      }

      return { rowNumber, status: 'valid', errors: [], normalized, raw, summaryLabel };
    });

    return summarizeReport('vocabulary', parsed.format, rows);
  }

  if (entityType === 'kanji') {
    const byId = new Map<string, AdminKanjiRecord>();
    const byChar = new Map<string, AdminKanjiRecord>();
    for (const k of existing.kanjis) {
      byId.set(k.id, k);
      byChar.set(k.kanji.trim(), k);
    }
    const batchSeen = new Set<string>();

    const rows: BatchValidatedRow<AdminKanjiRecord>[] = parsed.records.map((raw, idx) => {
      const rowNumber = idx + 1;
      if ('__invalidType' in raw) {
        return {
          rowNumber,
          status: 'invalid',
          errors: [`Dòng ${rowNumber} không phải object hợp lệ.`],
          normalized: null,
          raw,
          summaryLabel: `Dòng #${rowNumber}`,
        };
      }

      const errors: string[] = [];
      const character = pickString(raw, ['kanji', 'character']);
      const explicitId = pickString(raw, ['id']) || character;
      const hanViet = pickString(raw, ['hanViet', 'han_viet', 'hanviet']);
      const meanings = parseStringList(pickValue(raw, ['meanings', 'meaning']));
      const onReadings = parseStringList(pickValue(raw, ['onReadings', 'onyomi', 'on']));
      const kunReadings = parseStringList(pickValue(raw, ['kunReadings', 'kunyomi', 'kun']));
      const levelStr = (pickString(raw, ['jlptLevel', 'jlpt_level', 'level']) || 'N3').toUpperCase();
      const strokeRaw = pickValue(raw, ['strokeCount', 'stroke_count', 'strokes']);

      if (!character) errors.push('Thiếu ký tự Kanji (kanji/character)');
      if (meanings.length === 0 && !hanViet) {
        errors.push('Cần ít nhất meaning hoặc hanViet');
      }
      if (!VALID_LEVELS.has(levelStr as JLPTLevel)) {
        errors.push(`Cấp độ JLPT không hợp lệ: "${levelStr}"`);
      }

      let strokeCount = 0;
      if (strokeRaw !== undefined && String(strokeRaw).trim() !== '') {
        const parsedStroke = Number(strokeRaw);
        if (!Number.isFinite(parsedStroke) || parsedStroke < 0) {
          errors.push(`Số nét không hợp lệ: "${String(strokeRaw)}"`);
        } else {
          strokeCount = Math.round(parsedStroke);
        }
      }

      const summaryLabel = `${character || '?'} ${hanViet ? `(${hanViet})` : ''}`.trim();

      if (errors.length > 0) {
        return { rowNumber, status: 'invalid', errors, normalized: null, raw, summaryLabel };
      }

      const dupMatch = byId.get(explicitId) ?? byChar.get(character);
      const isBatchDup = batchSeen.has(character) || batchSeen.has(explicitId);
      batchSeen.add(character);
      batchSeen.add(explicitId);

      const normalized: AdminKanjiRecord = {
        id: dupMatch?.id ?? explicitId,
        kanji: character,
        hanViet,
        meanings: meanings.length > 0 ? meanings : [hanViet],
        onReadings,
        kunReadings,
        strokeCount,
        jlptLevel: levelStr as JLPTLevel,
        examples: Array.isArray(raw.examples) ? (raw.examples as AdminKanjiRecord['examples']) : [],
      };

      if (dupMatch || isBatchDup) {
        return {
          rowNumber,
          status: 'duplicate',
          errors: [],
          duplicateOf: dupMatch ? `Kanji "${dupMatch.kanji}" đã tồn tại` : 'Trùng Kanji trong batch',
          duplicateMatchId: dupMatch?.id,
          normalized,
          raw,
          summaryLabel,
        };
      }

      return { rowNumber, status: 'valid', errors: [], normalized, raw, summaryLabel };
    });

    return summarizeReport('kanji', parsed.format, rows);
  }

  if (entityType === 'grammar') {
    const byId = new Map<string, AdminGrammarRecord>();
    const byTitleLevel = new Map<string, AdminGrammarRecord>();
    for (const g of existing.grammars) {
      byId.set(g.id, g);
      byTitleLevel.set(`${normalizeText(g.title)}|${g.level}`, g);
    }
    const batchSeen = new Set<string>();

    const rows: BatchValidatedRow<AdminGrammarRecord>[] = parsed.records.map((raw, idx) => {
      const rowNumber = idx + 1;
      if ('__invalidType' in raw) {
        return {
          rowNumber,
          status: 'invalid',
          errors: [`Dòng ${rowNumber} không phải object hợp lệ.`],
          normalized: null,
          raw,
          summaryLabel: `Dòng #${rowNumber}`,
        };
      }

      const errors: string[] = [];
      const title = pickString(raw, ['title', 'name']);
      const structure = pickString(raw, ['structure', 'pattern', 'hiragana']);
      const meaning = pickString(raw, ['meaning', 'vietnamese']);
      const levelStr = (pickString(raw, ['level']) || 'N3').toUpperCase();
      const bookId = pickString(raw, ['bookId', 'book_id']) || 'SHINKANZEN_N3';
      const chapterId = pickString(raw, ['chapterId', 'chapter_id']) || 'L01';
      const explanation = pickString(raw, ['explanation']);
      const notes = pickString(raw, ['notes', 'note']);
      const examples = parseGrammarExamples(pickValue(raw, ['examples', 'example']));

      if (!title) errors.push('Thiếu tên mẫu ngữ pháp (title)');
      if (!structure) errors.push('Thiếu công thức/cấu trúc (structure)');
      if (!meaning) errors.push('Thiếu nghĩa tiếng Việt (meaning)');
      if (!VALID_LEVELS.has(levelStr as JLPTLevel)) {
        errors.push(`Cấp độ không hợp lệ: "${levelStr}"`);
      }

      const explicitId =
        pickString(raw, ['id']) ||
        `${levelStr}-CUSTOM-${normalizeText(title).replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf]+/gi, '-')}-${rowNumber}`;
      const summaryLabel = title || structure || `#${rowNumber}`;

      if (errors.length > 0) {
        return { rowNumber, status: 'invalid', errors, normalized: null, raw, summaryLabel };
      }

      const level = levelStr as JLPTLevel;
      const titleKey = `${normalizeText(title)}|${level}`;
      const dupMatch = byId.get(explicitId) ?? byTitleLevel.get(titleKey);
      const isBatchDup = batchSeen.has(explicitId) || batchSeen.has(titleKey);
      batchSeen.add(explicitId);
      batchSeen.add(titleKey);

      const normalized: AdminGrammarRecord = {
        id: dupMatch?.id ?? explicitId,
        bookId,
        chapterId,
        level,
        title,
        structure,
        meaning,
        explanation,
        notes,
        examples,
      };

      if (dupMatch || isBatchDup) {
        return {
          rowNumber,
          status: 'duplicate',
          errors: [],
          duplicateOf: dupMatch ? `Ngữ pháp "${dupMatch.title}" đã tồn tại` : 'Trùng mẫu trong batch',
          duplicateMatchId: dupMatch?.id,
          normalized,
          raw,
          summaryLabel,
        };
      }

      return { rowNumber, status: 'valid', errors: [], normalized, raw, summaryLabel };
    });

    return summarizeReport('grammar', parsed.format, rows);
  }

  // JLPT Questions validation
  const byId = new Map<string, AdminJlptRecord>();
  const byPrompt = new Map<string, AdminJlptRecord>();
  for (const q of existing.jlptQuestions) {
    byId.set(q.id, q);
    byPrompt.set(`${q.moduleId}|${q.level}|${normalizeText(q.prompt)}`, q);
  }
  const batchSeen = new Set<string>();

  const rows: BatchValidatedRow<AdminJlptRecord>[] = parsed.records.map((raw, idx) => {
    const rowNumber = idx + 1;
    if ('__invalidType' in raw) {
      return {
        rowNumber,
        status: 'invalid',
        errors: [`Dòng ${rowNumber} không phải object hợp lệ.`],
        normalized: null,
        raw,
        summaryLabel: `Dòng #${rowNumber}`,
      };
    }

    const errors: string[] = [];
    const rawModule = pickString(raw, ['moduleId', 'module_id', 'module']) || 'vocab';
    const moduleId = (rawModule === 'reading' ? 'reading-short' : rawModule) as AdminJlptModuleId;
    const levelStr = (pickString(raw, ['level']) || 'N3').toUpperCase();
    const prompt = pickString(raw, ['prompt', 'question']);
    const options = parseStringList(pickValue(raw, ['options', 'answers', 'choices']));
    const correctRaw = pickValue(raw, ['correctIndex', 'correct_index', 'answerIndex']);
    const passage = pickString(raw, ['passage']) || null;
    const explanation = pickString(raw, ['explanation']);
    const audioText = pickString(raw, ['audioText', 'audio_text']) || null;

    if (!VALID_JLPT_MODULES.has(moduleId)) {
      errors.push(`moduleId không hợp lệ: "${rawModule}"`);
    }
    if (!VALID_LEVELS.has(levelStr as JLPTLevel)) {
      errors.push(`Cấp độ không hợp lệ: "${levelStr}"`);
    }
    if (!prompt) errors.push('Thiếu đề bài / câu hỏi (prompt)');
    if (options.length < 2) errors.push('options cần ít nhất 2 lựa chọn');

    const correctIndex = Number(correctRaw ?? 0);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || (options.length > 0 && correctIndex >= options.length)) {
      errors.push(`correctIndex không hợp lệ: "${String(correctRaw)}"`);
    }

    const questionType: AdminJlptRecord['questionType'] =
      moduleId === 'star'
        ? 'star'
        : moduleId === 'listening'
          ? 'listening'
          : moduleId.startsWith('reading')
            ? 'reading'
            : 'mcq';

    const explicitId = pickString(raw, ['id']) || `jlpt-${moduleId}-${Date.now()}-${rowNumber}`;
    const summaryLabel = prompt ? prompt.slice(0, 48) : `Câu #${rowNumber}`;

    if (errors.length > 0) {
      return { rowNumber, status: 'invalid', errors, normalized: null, raw, summaryLabel };
    }

    const level = levelStr as JLPTLevel;
    const promptKey = `${moduleId}|${level}|${normalizeText(prompt)}`;
    const dupMatch = byId.get(explicitId) ?? byPrompt.get(promptKey);
    const isBatchDup = batchSeen.has(explicitId) || batchSeen.has(promptKey);
    batchSeen.add(explicitId);
    batchSeen.add(promptKey);

    const normalized: AdminJlptRecord = {
      id: dupMatch?.id ?? explicitId,
      moduleId,
      level,
      questionType,
      prompt,
      passage,
      options,
      correctIndex,
      explanation,
      audioText,
    };

    if (dupMatch || isBatchDup) {
      return {
        rowNumber,
        status: 'duplicate',
        errors: [],
        duplicateOf: dupMatch ? `Câu hỏi ID "${dupMatch.id}" đã tồn tại` : 'Trùng câu hỏi trong batch',
        duplicateMatchId: dupMatch?.id,
        normalized,
        raw,
        summaryLabel,
      };
    }

    return { rowNumber, status: 'valid', errors: [], normalized, raw, summaryLabel };
  });

  return summarizeReport('jlpt', parsed.format, rows);
}

function summarizeReport<T>(
  entityType: CmsEntityType,
  sourceFormat: 'json' | 'csv',
  rows: BatchValidatedRow<T>[],
): BatchValidationReport<T> {
  let valid = 0;
  let duplicate = 0;
  let invalid = 0;
  for (const r of rows) {
    if (r.status === 'valid') valid += 1;
    else if (r.status === 'duplicate') duplicate += 1;
    else invalid += 1;
  }
  return {
    entityType,
    sourceFormat,
    parseError: null,
    rows,
    counts: { total: rows.length, valid, duplicate, invalid },
  };
}

export function downloadJsonFile(filename: string, payload: unknown): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const BATCH_SAMPLE_TEMPLATES: Record<CmsEntityType, { json: string; csv: string }> = {
  vocabulary: {
    json: JSON.stringify(
      [
        {
          kanji: '約束',
          hiragana: 'やくそく',
          hanViet: 'ƯỚC THÚC',
          meaning: 'Lời hứa, cuộc hẹn',
          wordType: 'Danh từ',
          level: 'N3',
          unitId: 1,
          exampleSentence: '友達と約束をしました。',
          exampleMeaning: 'Tôi đã hẹn với bạn.',
        },
      ],
      null,
      2,
    ),
    csv: 'kanji,hiragana,hanViet,meaning,wordType,level,unitId,exampleSentence,exampleMeaning\n約束,やくそく,ƯỚC THÚC,"Lời hứa, cuộc hẹn",Danh từ,N3,1,友達と約束をしました。,Tôi đã hẹn với bạn.',
  },
  kanji: {
    json: JSON.stringify(
      [
        {
          kanji: '鶴',
          hanViet: 'HẠC',
          meanings: ['Chim hạc'],
          onReadings: ['カク'],
          kunReadings: ['つる'],
          strokeCount: 21,
          jlptLevel: 'N1',
        },
      ],
      null,
      2,
    ),
    csv: 'kanji,hanViet,meanings,onReadings,kunReadings,strokeCount,jlptLevel\n鶴,HẠC,Chim hạc,カク,つる,21,N1',
  },
  grammar: {
    json: JSON.stringify(
      [
        {
          id: 'N3-CUSTOM-WAKE',
          bookId: 'SHINKANZEN_N3',
          chapterId: 'L01',
          level: 'N3',
          title: '～わけではない',
          structure: 'V/A/Naな/Nの + わけではない',
          meaning: 'Không hẳn là...',
          explanation: 'Dùng để phủ nhận một phần kết luận dễ bị suy diễn từ bối cảnh.',
          examples: [
            {
              japanese: '日本料理が嫌いなわけではない。',
              hiragana: 'にほんりょうりがきらいなわけではない。',
              vietnamese: 'Không hẳn là tôi ghét món Nhật.',
            },
          ],
        },
      ],
      null,
      2,
    ),
    csv: 'id,bookId,chapterId,level,title,structure,meaning,explanation\nN3-CUSTOM-WAKE,SHINKANZEN_N3,L01,N3,～わけではない,V/A + わけではない,Không hẳn là...,Phủ nhận một phần suy diễn.',
  },
  jlpt: {
    json: JSON.stringify(
      [
        {
          id: 'jlpt-sample-n3-01',
          moduleId: 'vocab',
          level: 'N3',
          prompt: '新しい計画について、みんなで（　）しました。',
          options: ['相談', '反対', '出発', '掃除'],
          correctIndex: 0,
          explanation: '相談 (tư vấn / bàn bạc) phù hợp nhất với ngữ cảnh thảo luận kế hoạch mới.',
        },
      ],
      null,
      2,
    ),
    csv: 'id,moduleId,level,prompt,options,correctIndex,explanation\njlpt-sample-n3-01,vocab,N3,新しい計画について、みんなで（　）しました。,相談|反対|出発|掃除,0,相談 là bàn bạc cùng mọi người.',
  },
};
