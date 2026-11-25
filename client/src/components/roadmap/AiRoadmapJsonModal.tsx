import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ClipboardCopy,
  Download,
  FileJson,
  Plus,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Chip,
  Field,
  Input,
  Modal,
  Notice,
  Select,
  Tabs,
  Textarea,
  useToast,
} from '../ui';
import type { CustomLesson } from '../../services/customStudioService';
import type {
  CurriculumTaskPreset,
  CustomRoadmapConfig,
  DailyMinutesTarget,
} from '../../services/stageRoadmapService';
import {
  buildAiRoadmapPrompt,
  buildContinuationPrompt,
  exportRoadmapToJson,
  parseAndValidateRoadmapJson,
  SAMPLE_AI_ROADMAP_JSON,
} from '../../services/roadmapJsonService';
import type { StudyLevel } from '../../services/userLevelService';

export type AiJsonModalTab = 'prompt' | 'import' | 'export';

interface AiRoadmapJsonModalProps {
  open: boolean;
  initialTab?: AiJsonModalTab;
  onClose: () => void;
  defaultLevel: StudyLevel;
  defaultTextbookId: string;
  todayKey: string;
  catalog: CurriculumTaskPreset[];
  customRoadmaps: CustomRoadmapConfig[];
  activeCustomRoadmapId: string | null;
  studioLessons: CustomLesson[];
  onImportCommit: (payload: {
    config: CustomRoadmapConfig;
    lessons: CustomLesson[];
  }) => void;
}

const LEVELS: StudyLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const STAGE_COUNT_PRESETS = [3, 5, 7, 10, 15, 20, 30];
const MINUTE_OPTIONS: DailyMinutesTarget[] = [10, 15, 20, 25, 30];

export const AiRoadmapJsonModal: React.FC<AiRoadmapJsonModalProps> = ({
  open,
  initialTab = 'prompt',
  onClose,
  defaultLevel,
  defaultTextbookId,
  todayKey,
  catalog,
  customRoadmaps,
  activeCustomRoadmapId,
  studioLessons,
  onImportCommit,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [tab, setTab] = useState<AiJsonModalTab>(initialTab);
  const [lastOpen, setLastOpen] = useState(false);

  // Sync tab when modal re-opens
  if (open && !lastOpen) {
    setLastOpen(true);
    setTab(initialTab);
  } else if (!open && lastOpen) {
    setLastOpen(false);
  }

  // Tab 1: Prompt Builder state
  const [topic, setTopic] = useState('Tiếng Nhật giao tiếp quán ăn & đi làm thực tế');
  const [promptLevel, setPromptLevel] = useState<StudyLevel>(defaultLevel);
  const [stageCount, setStageCount] = useState<number>(5);
  const [dailyMinutes, setDailyMinutes] = useState<DailyMinutesTarget>(15);
  const [includeVocab, setIncludeVocab] = useState(true);
  const [includeGrammar, setIncludeGrammar] = useState(true);
  const [includeKanji, setIncludeKanji] = useState(false);
  const [includeQuizzes, setIncludeQuizzes] = useState(true);
  const [vocabPerStage, setVocabPerStage] = useState(6);
  const [quizzesPerStage, setQuizzesPerStage] = useState(5);
  const [extraNotes, setExtraNotes] = useState('');

  // Tab 2: JSON Import state
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [selectedCatalogKey, setSelectedCatalogKey] = useState('');
  const [extraAppTasksByStage, setExtraAppTasksByStage] = useState<
    Record<number, CurriculumTaskPreset[]>
  >({});
  const [targetStageForAppTask, setTargetStageForAppTask] = useState<number>(1);

  // Tab 3: JSON Export state
  const [exportRoadmapId, setExportRoadmapId] = useState<string>(
    activeCustomRoadmapId || customRoadmaps[0]?.id || '',
  );

  const generatedPrompt = useMemo(
    () =>
      buildAiRoadmapPrompt({
        topic,
        level: promptLevel,
        stageCount,
        dailyMinutesTarget: dailyMinutes,
        includeVocab,
        includeGrammar,
        includeKanji,
        includeQuizzes,
        vocabPerStage,
        quizzesPerStage,
        extraNotes,
      }),
    [
      topic,
      promptLevel,
      stageCount,
      dailyMinutes,
      includeVocab,
      includeGrammar,
      includeKanji,
      includeQuizzes,
      vocabPerStage,
      quizzesPerStage,
      extraNotes,
    ],
  );

  const parsedResult = useMemo(() => {
    if (!rawJsonInput.trim()) return null;
    return parseAndValidateRoadmapJson(rawJsonInput, {
      levelFallback: defaultLevel,
      textbookId: defaultTextbookId,
      todayKey,
      catalog,
    });
  }, [rawJsonInput, defaultLevel, defaultTextbookId, todayKey, catalog]);

  const effectiveExportId =
    customRoadmaps.some((r) => r.id === exportRoadmapId)
      ? exportRoadmapId
      : activeCustomRoadmapId && customRoadmaps.some((r) => r.id === activeCustomRoadmapId)
        ? activeCustomRoadmapId
        : customRoadmaps[0]?.id || '';

  const exportTargetRoadmap = useMemo(
    () => customRoadmaps.find((r) => r.id === effectiveExportId) ?? null,
    [customRoadmaps, effectiveExportId],
  );

  const exportedJsonText = useMemo(() => {
    if (!exportTargetRoadmap) return '';
    return exportRoadmapToJson(exportTargetRoadmap, studioLessons);
  }, [exportTargetRoadmap, studioLessons]);

  const handleCopyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: successMessage, tone: 'success' });
    } catch {
      toast({
        title: 'Không thể tự động sao chép — bạn hãy chọn toàn bộ ô chữ và nhấn Ctrl+C.',
        tone: 'warning',
      });
    }
  };

  const handleUploadJsonFile = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setRawJsonInput(content);
      setExtraAppTasksByStage({});
      toast({ title: `Đã đọc file ${file.name}`, tone: 'info' });
    };
    reader.readAsText(file, 'utf-8');
    ev.target.value = '';
  };

  const handleDownloadExportedJson = () => {
    if (!exportedJsonText || !exportTargetRoadmap) return;
    const slug = exportTargetRoadmap.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const blob = new Blob([exportedJsonText], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nihongo-roadmap-${slug || 'custom'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'Đã tải xuống file .json lộ trình!', tone: 'success' });
  };

  const handleAddAppPresetToImportStage = () => {
    if (!selectedCatalogKey || !parsedResult || !parsedResult.ok) return;
    const preset = catalog.find((p) => p.key === selectedCatalogKey);
    if (!preset) return;
    const safeStage = Math.max(
      1,
      Math.min(parsedResult.preview.stageCount, targetStageForAppTask),
    );
    setExtraAppTasksByStage((prev) => {
      const list = prev[safeStage] ?? [];
      if (list.some((x) => x.key === preset.key)) return prev;
      return {
        ...prev,
        [safeStage]: [...list, preset],
      };
    });
    setSelectedCatalogKey('');
    toast({
      title: `Đã gắn "${preset.title}" từ Kho App vào Màn ${safeStage}`,
      tone: 'success',
    });
  };

  const handleConfirmImport = () => {
    if (!parsedResult || !parsedResult.ok) return;

    // Merge any additional App Library tasks picked by user in the preview panel
    const mergedOverrides = { ...(parsedResult.config.stageOverrides ?? {}) };
    for (const [stageStr, presets] of Object.entries(extraAppTasksByStage)) {
      const stageNum = Number(stageStr);
      const existing = mergedOverrides[stageNum];
      if (!existing) continue;
      const appended = presets.map((p, idx) => ({
        id: `mix-app-${stageNum}-${idx + 1}-${Date.now().toString(36)}`,
        title: p.title,
        subtitle: p.subtitle,
        skill: p.skill,
        minutes: p.minutes,
        to: p.to,
        isCustomAdded: true,
      }));
      mergedOverrides[stageNum] = {
        ...existing,
        extraTasks: [...(existing.extraTasks ?? []), ...appended],
      };
    }

    onImportCommit({
      config: {
        ...parsedResult.config,
        stageOverrides: mergedOverrides,
      },
      lessons: parsedResult.lessons,
    });
    setRawJsonInput('');
    setExtraAppTasksByStage({});
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Lộ trình riêng bằng AI & JSON (Input / Output)"
      description="Lấy Prompt chuẩn đưa cho ChatGPT / Gemini / Claude tạo nội dung + Quiz 4 đáp án, dán JSON vào để biến thành Lộ trình học ngay, trộn thêm bài từ Kho App hoặc xuất JSON chia sẻ."
      footer={
        tab === 'prompt' ? (
          <>
            <Button type="button" variant="secondary" onClick={onClose}>
              Đóng
            </Button>
            <Button
              type="button"
              variant="soft"
              leftIcon={<ClipboardCopy className="size-4" aria-hidden />}
              onClick={() =>
                void handleCopyText(
                  generatedPrompt,
                  'Đã copy Prompt chuẩn! Dán vào ChatGPT / Gemini / Claude rồi quay lại tab Nhúng JSON.',
                )
              }
            >
              Copy Prompt cho AI
            </Button>
            <Button
              type="button"
              variant="primary"
              leftIcon={<Upload className="size-4" aria-hidden />}
              onClick={() => setTab('import')}
            >
              Sang bước Nhúng JSON →
            </Button>
          </>
        ) : tab === 'import' ? (
          <>
            <Button type="button" variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!parsedResult || !parsedResult.ok}
              leftIcon={<Sparkles className="size-4" aria-hidden />}
              onClick={handleConfirmImport}
            >
              Lưu thành Lộ trình riêng
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={onClose}>
              Đóng
            </Button>
            {exportedJsonText && (
              <>
                <Button
                  type="button"
                  variant="soft"
                  leftIcon={<ClipboardCopy className="size-4" aria-hidden />}
                  onClick={() =>
                    void handleCopyText(exportedJsonText, 'Đã copy toàn bộ JSON lộ trình!')
                  }
                >
                  Copy JSON
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  leftIcon={<Download className="size-4" aria-hidden />}
                  onClick={handleDownloadExportedJson}
                >
                  Tải file .json
                </Button>
              </>
            )}
          </>
        )
      }
    >
      <div className="space-y-4">
        <Tabs
          aria-label="Chế độ AI và JSON"
          variant="pill"
          value={tab}
          onChange={(v) => setTab(v as AiJsonModalTab)}
          items={[
            { value: 'prompt', label: '1. Tạo Prompt AI' },
            { value: 'import', label: '2. Nhúng JSON (Input)' },
            { value: 'export', label: '3. Xuất JSON (Output)' },
          ]}
        />

        {/* TAB 1: AI PROMPT BUILDER */}
        {tab === 'prompt' && (
          <div className="space-y-3.5">
            <Notice tone="info">
              <p className="text-xs leading-relaxed">
                <strong className="text-fg">Cách dùng trong 30 giây:</strong> Chọn chủ đề bên dưới → bấm{' '}
                <strong className="text-fg">Copy Prompt cho AI</strong> → dán sang ChatGPT / Gemini / Claude → copy khối JSON AI trả về và dán ở tab{' '}
                <strong className="text-fg">2. Nhúng JSON</strong>. Miễn phí 100%, không cần API key.
              </p>
            </Notice>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Chủ đề / Mục tiêu học" htmlFor="ai-prompt-topic">
                <Input
                  id="ai-prompt-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="VD: Tiếng Nhật nhà hàng, IT BrSE, ôn Minna Bài 8–12..."
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Trình độ JLPT" htmlFor="ai-prompt-level">
                  <Select
                    id="ai-prompt-level"
                    value={promptLevel}
                    onChange={(e) => setPromptLevel(e.target.value as StudyLevel)}
                  >
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        JLPT {lvl}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Số Màn (buổi)" htmlFor="ai-prompt-stages">
                  <Select
                    id="ai-prompt-stages"
                    value={stageCount}
                    onChange={(e) => setStageCount(Number(e.target.value))}
                  >
                    {STAGE_COUNT_PRESETS.map((n) => (
                      <option key={n} value={n}>
                        {n} buổi
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Thời lượng/ngày" htmlFor="ai-prompt-minutes">
                <Select
                  id="ai-prompt-minutes"
                  value={dailyMinutes}
                  onChange={(e) => setDailyMinutes(Number(e.target.value) as DailyMinutesTarget)}
                >
                  {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} phút / ngày
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Số từ vựng / Màn" htmlFor="ai-prompt-vocab-count">
                <Input
                  id="ai-prompt-vocab-count"
                  type="number"
                  min={3}
                  max={20}
                  value={vocabPerStage}
                  onChange={(e) => setVocabPerStage(Number(e.target.value) || 6)}
                />
              </Field>
              <Field label="Số câu Quiz / Màn" htmlFor="ai-prompt-quiz-count">
                <Input
                  id="ai-prompt-quiz-count"
                  type="number"
                  min={3}
                  max={15}
                  value={quizzesPerStage}
                  onChange={(e) => setQuizzesPerStage(Number(e.target.value) || 5)}
                />
              </Field>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-fg">Thành phần nhờ AI sinh cho mỗi Màn:</span>
              <div className="flex flex-wrap gap-1.5">
                <Chip selected={includeVocab} onClick={() => setIncludeVocab((v) => !v)}>
                  Từ vựng (Flashcard + TTS)
                </Chip>
                <Chip selected={includeGrammar} onClick={() => setIncludeGrammar((v) => !v)}>
                  Ngữ pháp &amp; Ví dụ
                </Chip>
                <Chip selected={includeKanji} onClick={() => setIncludeKanji((v) => !v)}>
                  Chữ Hán (Kanji)
                </Chip>
                <Chip selected={includeQuizzes} onClick={() => setIncludeQuizzes((v) => !v)}>
                  Quiz 4 đáp án + Giải thích
                </Chip>
              </div>
            </div>

            <Field label="Ghi chú thêm cho AI (tùy chọn)" htmlFor="ai-prompt-notes">
              <Input
                id="ai-prompt-notes"
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                placeholder="VD: Tập trung câu hay bẫy ở đề JLPT, giải thích ngắn dễ nhớ..."
              />
            </Field>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-fg">
                  Prompt chuẩn (đã khóa schema JSON):
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  leftIcon={<ClipboardCopy className="size-3.5" aria-hidden />}
                  onClick={() =>
                    void handleCopyText(generatedPrompt, 'Đã copy Prompt chuẩn cho AI!')
                  }
                >
                  Copy nhanh
                </Button>
              </div>
              <Textarea
                readOnly
                rows={7}
                value={generatedPrompt}
                className="font-mono text-xs leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* TAB 2: JSON IMPORT (INPUT) */}
        {tab === 'import' && (
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  leftIcon={<Wand2 className="size-3.5" aria-hidden />}
                  onClick={() => {
                    setRawJsonInput(SAMPLE_AI_ROADMAP_JSON);
                    setExtraAppTasksByStage({});
                    toast({
                      title: 'Đã nạp mẫu JSON demo 3 buổi (Quán ăn N5 + Quiz + Nghe hiểu Kho App)!',
                      tone: 'success',
                    });
                  }}
                >
                  Nạp mẫu JSON thử ngay (3 buổi)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  leftIcon={<Upload className="size-3.5" aria-hidden />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Chọn file .json
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json,text/plain"
                  onChange={handleUploadJsonFile}
                  className="hidden"
                />
              </div>
              {rawJsonInput.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setRawJsonInput('');
                    setExtraAppTasksByStage({});
                  }}
                  className="cursor-pointer text-xs font-medium text-muted hover:text-danger-fg"
                >
                  Xóa trắng
                </button>
              )}
            </div>

            <Field
              label="Dán JSON từ ChatGPT / Gemini / Claude (tự bóc bỏ ```json và lời thừa)"
              htmlFor="ai-json-input"
            >
              <Textarea
                id="ai-json-input"
                rows={7}
                value={rawJsonInput}
                onChange={(e) => {
                  setRawJsonInput(e.target.value);
                  setExtraAppTasksByStage({});
                }}
                placeholder='Dán nguyên phản hồi từ AI vào đây... VD: { "schemaVersion": 1, "roadmap": { ... }, "stages": [ ... ] }'
                className="font-mono text-xs leading-relaxed"
              />
            </Field>

            {/* Validation Errors + Auto-Fix Prompt */}
            {parsedResult && !parsedResult.ok && (
              <Notice tone="warning">
                <div className="space-y-2 text-xs">
                  <p className="font-bold text-fg">
                    JSON chưa hợp lệ ({parsedResult.errors.length} lỗi cần chỉnh):
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-muted">
                    {parsedResult.errors.slice(0, 6).map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                  {parsedResult.fixPrompt && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      leftIcon={<ClipboardCopy className="size-3.5" aria-hidden />}
                      onClick={() =>
                        void handleCopyText(
                          parsedResult.fixPrompt,
                          'Đã copy câu nhắc sửa lỗi — dán lại cho AI để sửa 1 phát ăn ngay!',
                        )
                      }
                    >
                      Copy câu nhắc nhờ AI sửa lỗi này
                    </Button>
                  )}
                </div>
              </Notice>
            )}

            {/* Valid JSON Preview + Optional Mix with App Library */}
            {parsedResult && parsedResult.ok && (
              <div className="space-y-3 rounded-xl border border-success-line bg-success-soft/25 p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="success">
                        <CheckCircle2 className="mr-1 inline size-3" aria-hidden />
                        JSON hợp lệ
                      </Badge>
                      <Badge tone="primary">JLPT {parsedResult.preview.level}</Badge>
                      <Badge tone="neutral" className="tabular">
                        {parsedResult.preview.stageCount} Màn · {parsedResult.preview.dailyMinutesTarget}p/ngày
                      </Badge>
                    </div>
                    <h3 className="text-sm font-bold text-fg">{parsedResult.preview.name}</h3>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted">
                  <span className="rounded-lg bg-surface px-2 py-1 ring-1 ring-line tabular">
                    Từ vựng: <strong className="text-fg">{parsedResult.preview.totalVocab}</strong>
                  </span>
                  <span className="rounded-lg bg-surface px-2 py-1 ring-1 ring-line tabular">
                    Ngữ pháp: <strong className="text-fg">{parsedResult.preview.totalGrammar}</strong>
                  </span>
                  <span className="rounded-lg bg-surface px-2 py-1 ring-1 ring-line tabular">
                    Quiz 4 đáp án: <strong className="text-fg">{parsedResult.preview.totalQuizzes}</strong>
                  </span>
                  <span className="rounded-lg bg-surface px-2 py-1 ring-1 ring-line tabular">
                    Bài từ Kho App:{' '}
                    <strong className="text-fg">
                      {parsedResult.preview.totalAppTasks +
                        Object.values(extraAppTasksByStage).reduce((s, list) => s + list.length, 0)}
                    </strong>
                  </span>
                </div>

                {/* Stage list preview */}
                <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                  {parsedResult.preview.stages.map((st) => {
                    const extraPicked = extraAppTasksByStage[st.stageNumber] ?? [];
                    return (
                      <div
                        key={st.stageNumber}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs"
                      >
                        <span className="font-semibold text-fg">
                          Màn {st.stageNumber}: {st.title}
                        </span>
                        <span className="text-[11px] text-muted tabular">
                          {[
                            st.vocabCount > 0 ? `${st.vocabCount} từ` : null,
                            st.grammarCount > 0 ? `${st.grammarCount} ngữ pháp` : null,
                            st.kanjiCount > 0 ? `${st.kanjiCount} Kanji` : null,
                            st.quizCount > 0 ? `${st.quizCount} quiz` : null,
                            st.appTaskCount + extraPicked.length > 0
                              ? `${st.appTaskCount + extraPicked.length} bài App`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Mix additional App Library tasks right before saving */}
                {catalog.length > 0 && (
                  <div className="space-y-2 border-t border-line/70 pt-2.5">
                    <p className="text-xs font-semibold text-fg">
                      Trộn thêm Quiz / Bài đọc / Bài nghe có sẵn của App vào Màn (tùy chọn):
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Select
                        aria-label="Chọn Màn muốn gắn bài App"
                        value={targetStageForAppTask}
                        onChange={(e) => setTargetStageForAppTask(Number(e.target.value))}
                        className="sm:w-28"
                      >
                        {parsedResult.preview.stages.map((st) => (
                          <option key={st.stageNumber} value={st.stageNumber}>
                            Màn {st.stageNumber}
                          </option>
                        ))}
                      </Select>
                      <Select
                        aria-label="Chọn bài học từ Kho App"
                        value={selectedCatalogKey}
                        onChange={(e) => setSelectedCatalogKey(e.target.value)}
                        className="flex-1"
                      >
                        <option value="">-- Chọn Quiz / Bài học có sẵn của App --</option>
                        {Array.from(new Set(catalog.map((p) => p.group))).map((group) => (
                          <optgroup key={group} label={group}>
                            {catalog
                              .filter((p) => p.group === group)
                              .map((preset) => (
                                <option key={preset.key} value={preset.key}>
                                  {preset.title}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={!selectedCatalogKey}
                        leftIcon={<Plus className="size-3.5" aria-hidden />}
                        onClick={handleAddAppPresetToImportStage}
                      >
                        Gắn thêm
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: JSON EXPORT (OUTPUT) */}
        {tab === 'export' && (
          <div className="space-y-3.5">
            {customRoadmaps.length === 0 ? (
              <Notice tone="info">
                <p className="text-xs">
                  Bạn chưa có <strong className="text-fg">Lộ trình riêng</strong> nào để xuất JSON. Hãy tạo bằng tab{' '}
                  <strong className="text-fg">1. Tạo Prompt AI</strong> hoặc{' '}
                  <strong className="text-fg">2. Nhúng JSON</strong> trước nhé!
                </p>
              </Notice>
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <Field label="Chọn Lộ trình riêng cần xuất Output JSON" htmlFor="export-roadmap-select">
                      <Select
                        id="export-roadmap-select"
                        value={effectiveExportId}
                        onChange={(e) => setExportRoadmapId(e.target.value)}
                      >
                        {customRoadmaps.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} ({plan.level} · {plan.totalStages} Màn)
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="soft"
                    leftIcon={<FileJson className="size-3.5" aria-hidden />}
                    onClick={() =>
                      void handleCopyText(
                        buildContinuationPrompt(exportedJsonText, 5),
                        'Đã copy Prompt + JSON để nhờ AI tạo tiếp 5 Màn nâng cao!',
                      )
                    }
                  >
                    Nhờ AI tạo tiếp 5 Màn
                  </Button>
                </div>

                <Field label="Nội dung JSON (gồm cả từ vựng, ngữ pháp, Quiz tự tạo & liên kết bài App)" htmlFor="export-json-box">
                  <Textarea
                    id="export-json-box"
                    readOnly
                    rows={10}
                    value={exportedJsonText}
                    className="font-mono text-xs leading-relaxed"
                  />
                </Field>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
