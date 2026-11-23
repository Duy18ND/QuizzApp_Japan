import { useMemo, useState } from 'react';
import { Pencil, Plus, Square, Target, Trash2, Upload, Volume2 } from 'lucide-react';
import { AdminImportExportModal } from '../../components/admin/AdminImportExportModal';
import { AdminPagination } from '../../components/admin/AdminPagination';
import { AudioSpeechPlayer } from '../../components/jlpt/AudioSpeechPlayer';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Notice,
  SearchInput,
  Select,
  Textarea,
} from '../../components/ui';
import {
  deleteJlptQuestion,
  saveJlptQuestion,
  type CmsSnapshot,
} from '../../services/adminCmsService';
import type { AuthUser } from '../../store/slices/authSlice';
import type { AdminJlptModuleId, AdminJlptRecord } from '../../types/admin';
import type { JLPTLevel } from '../../types/quiz';
import { parsePlainDialogueScript } from '../../utils/dialogueAudioEngine';
import { isSpeechSupported, speakJapanese, stopJapaneseSpeech } from '../../utils/tts';

const LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const PAGE_SIZE = 12;

const JLPT_MODULE_OPTIONS: Array<{ value: AdminJlptModuleId; label: string }> = [
  { value: 'kanji', label: '1. Chữ Hán (kanji)' },
  { value: 'vocab', label: '2. Từ vựng (vocab)' },
  { value: 'grammar', label: '3. Ngữ pháp (grammar)' },
  { value: 'star', label: '4. Ghép sao ★ (star)' },
  { value: 'reading-short', label: '5. Đọc ngắn (reading-short)' },
  { value: 'reading-medium', label: '6. Đọc trung (reading-medium)' },
  { value: 'reading-long', label: '7. Đọc dài (reading-long)' },
  { value: 'listening', label: '8. Nghe hiểu (listening)' },
];

const QUESTION_TYPES: Array<AdminJlptRecord['questionType']> = [
  'mcq',
  'star',
  'reading',
  'listening',
];

const inferQuestionType = (moduleId: AdminJlptModuleId): AdminJlptRecord['questionType'] => {
  if (moduleId === 'star') return 'star';
  if (moduleId.startsWith('reading-')) return 'reading';
  if (moduleId === 'listening') return 'listening';
  return 'mcq';
};

interface JlptFormState {
  isEdit: boolean;
  id: string;
  moduleId: AdminJlptModuleId;
  level: JLPTLevel;
  questionType: AdminJlptRecord['questionType'];
  prompt: string;
  passage: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  audioText: string;
}

const emptyJlptForm = (moduleId: AdminJlptModuleId = 'vocab', level: JLPTLevel = 'N3'): JlptFormState => ({
  isEdit: false,
  id: '',
  moduleId,
  level,
  questionType: inferQuestionType(moduleId),
  prompt: '',
  passage: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  explanation: '',
  audioText: '',
});

interface AdminJlptManagerProps {
  snapshot: CmsSnapshot;
  actor: AuthUser | null;
  onRefresh: () => Promise<void> | void;
}

export function AdminJlptManager({ snapshot, actor, onRefresh }: AdminJlptManagerProps) {
  const [levelFilter, setLevelFilter] = useState<'ALL' | JLPTLevel>('ALL');
  const [moduleFilter, setModuleFilter] = useState<'ALL' | AdminJlptModuleId>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AdminJlptRecord['questionType']>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState<JlptFormState>(() => emptyJlptForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminJlptRecord | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return snapshot.jlptQuestions.filter((item) => {
      if (levelFilter !== 'ALL' && item.level !== levelFilter) return false;
      if (moduleFilter !== 'ALL' && item.moduleId !== moduleFilter) return false;
      if (typeFilter !== 'ALL' && item.questionType !== typeFilter) return false;
      if (!q) return true;
      return (
        item.id.toLowerCase().includes(q) ||
        item.prompt.toLowerCase().includes(q) ||
        (item.passage ?? '').toLowerCase().includes(q) ||
        (item.audioText ?? '').toLowerCase().includes(q) ||
        item.options.some((opt) => opt.toLowerCase().includes(q))
      );
    });
  }, [snapshot.jlptQuestions, levelFilter, moduleFilter, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openCreate = () => {
    const mod: AdminJlptModuleId = moduleFilter !== 'ALL' ? moduleFilter : 'vocab';
    const lv: JLPTLevel = levelFilter !== 'ALL' ? levelFilter : 'N3';
    const nextSeq = String(snapshot.jlptQuestions.length + 1).padStart(3, '0');
    setForm({
      ...emptyJlptForm(mod, lv),
      id: `${lv.toLowerCase()}-${mod}-${nextSeq}`,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: AdminJlptRecord) => {
    const opts: [string, string, string, string] = [
      item.options[0] ?? '',
      item.options[1] ?? '',
      item.options[2] ?? '',
      item.options[3] ?? '',
    ];
    setForm({
      isEdit: true,
      id: item.id,
      moduleId: item.moduleId,
      level: item.level,
      questionType: item.questionType,
      prompt: item.prompt,
      passage: item.passage ?? '',
      options: opts,
      correctIndex: Math.min(3, Math.max(0, item.correctIndex)),
      explanation: item.explanation,
      audioText: item.audioText ?? '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    stopJapaneseSpeech();
    setIsSpeaking(false);
    setModalOpen(false);
  };

  const handleToggleTts = () => {
    if (isSpeaking) {
      stopJapaneseSpeech();
      setIsSpeaking(false);
      return;
    }
    const text = form.audioText.trim() || form.prompt.trim();
    if (!text) return;
    const started = speakJapanese(text);
    setIsSpeaking(started);
  };

  const handleSave = async () => {
    const resolvedId = form.id.trim();
    if (!resolvedId) {
      setFormError('Vui lòng nhập ID câu hỏi JLPT.');
      return;
    }
    if (!form.prompt.trim()) {
      setFormError('Vui lòng nhập đề bài (prompt).');
      return;
    }
    const cleanedOptions = form.options.map((o) => o.trim());
    if (cleanedOptions.some((o) => !o)) {
      setFormError(
        form.moduleId === 'star'
          ? 'Bài Ghép sao (★) phải có đủ 4 mảnh ghép (Chunks 1..4).'
          : 'Vui lòng điền đủ 4 đáp án A, B, C, D.',
      );
      return;
    }
    if (form.moduleId.startsWith('reading-') && !form.passage.trim()) {
      setFormError('Câu hỏi đọc hiểu yêu cầu nhập đoạn văn (passage).');
      return;
    }
    if (form.moduleId === 'listening' && !form.audioText.trim()) {
      setFormError('Câu hỏi nghe hiểu yêu cầu nhập nội dung hội thoại (audio_text).');
      return;
    }
    if (
      !form.isEdit &&
      snapshot.jlptQuestions.some((q) => q.id.toLowerCase() === resolvedId.toLowerCase())
    ) {
      setFormError(`ID câu hỏi "${resolvedId}" đã tồn tại.`);
      return;
    }

    setSaving(true);
    setFormError(null);
    const record: AdminJlptRecord = {
      id: resolvedId,
      moduleId: form.moduleId,
      level: form.level,
      questionType: form.questionType,
      prompt: form.prompt.trim(),
      passage: form.passage.trim() || null,
      options: cleanedOptions,
      correctIndex: form.correctIndex,
      explanation: form.explanation.trim(),
      audioText: form.moduleId === 'listening' ? form.audioText.trim() || null : null,
    };

    const res = await saveJlptQuestion(record, actor, { isNew: !form.isEdit });
    setSaving(false);

    if (!res.ok) {
      setFormError(res.error ?? 'Không thể lưu câu hỏi JLPT.');
      return;
    }

    closeModal();
    setBanner({
      tone: 'success',
      text: `${form.isEdit ? 'Đã cập nhật' : 'Đã tạo'} câu hỏi "${record.id}" (${record.moduleId}) và đồng bộ Live Client.`,
    });
    await onRefresh();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const res = await deleteJlptQuestion(deleteTarget.id, actor);
    setSaving(false);
    setDeleteTarget(null);
    if (!res.ok) {
      setBanner({ tone: 'danger', text: res.error ?? 'Không thể xóa câu hỏi JLPT.' });
      return;
    }
    setBanner({ tone: 'success', text: `Đã xóa câu hỏi JLPT "${deleteTarget.id}".` });
    await onRefresh();
  };

  const isStar = form.moduleId === 'star';
  const isReading = form.moduleId.startsWith('reading-');
  const isListening = form.moduleId === 'listening';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">
            Ngân hàng Đề JLPT — 8 Data Modules / 9 Practice Views (<code>public.jlpt_questions</code>)
          </h2>
          <p className="text-xs text-muted">
            Trình biên tập thích ứng cho Trắc nghiệm (MCQ), Ghép sao ★, Đọc hiểu 3 cấp độ và Nghe hiểu có nút nghe thử TTS.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import / Export JSON
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm câu hỏi JLPT
          </Button>
        </div>
      </div>

      {banner && <Notice tone={banner.tone}>{banner.text}</Notice>}

      {/* Hierarchical Filters */}
      <Card padding="sm" className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Field label="Cấp độ JLPT">
          <Select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value as 'ALL' | JLPTLevel);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả Level</option>
            {LEVELS.map((lv) => (
              <option key={lv} value={lv}>
                {lv}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Module (module_id)">
          <Select
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value as 'ALL' | AdminJlptModuleId);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả 8 module dữ liệu</option>
            {JLPT_MODULE_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Loại câu hỏi (question_type)">
          <Select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as 'ALL' | AdminJlptRecord['questionType']);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả loại câu hỏi</option>
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Tìm kiếm">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="ID, đề bài, đoạn văn, audio..."
          />
        </Field>
      </Card>

      {/* Table */}
      <Card padding="none" className="overflow-hidden">
        {pageItems.length === 0 ? (
          <EmptyState
            icon={<Target className="h-6 w-6" />}
            title="Chưa có câu hỏi JLPT khớp bộ lọc"
            description="Thử chọn bộ lọc khác hoặc tạo câu hỏi JLPT mới."
            action={
              <Button variant="primary" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Thêm câu hỏi JLPT
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">ID &amp; Module</th>
                  <th className="px-4 py-3">Đề bài / Ngữ liệu</th>
                  <th className="px-4 py-3">Đáp án / Mảnh ghép</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageItems.map((q) => (
                  <tr key={q.id} className="transition-colors hover:bg-glass-soft">
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-xs font-semibold text-fg">{q.id}</div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Badge tone="primary">{q.level}</Badge>
                        <Badge tone="sakura">{q.moduleId}</Badge>
                        <Badge tone="neutral">{q.questionType}</Badge>
                      </div>
                    </td>
                    <td className="max-w-md px-4 py-3 align-top">
                      {q.passage && (
                        <div className="mb-1 line-clamp-2 rounded-md border border-line bg-surface-2 px-2 py-1 font-jp text-xs text-muted">
                          {q.passage}
                        </div>
                      )}
                      <div className="font-jp text-sm font-medium text-fg">{q.prompt}</div>
                      {q.audioText && (
                        <div className="mt-1 line-clamp-1 font-jp text-xs text-primary">
                          Audio: {q.audioText}
                        </div>
                      )}
                    </td>
                    <td className="max-w-xs px-4 py-3 align-top">
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {q.options.map((opt, idx) => (
                          <div
                            key={idx}
                            className={
                              idx === q.correctIndex
                                ? 'truncate rounded border border-success bg-success-soft px-1.5 py-0.5 font-jp font-semibold text-success'
                                : 'truncate rounded border border-line bg-surface-2 px-1.5 py-0.5 font-jp text-muted'
                            }
                            title={opt}
                          >
                            {q.moduleId === 'star' ? `${idx + 1}: ` : `${String.fromCharCode(65 + idx)}. `}
                            {opt}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(q)}
                          title="Chỉnh sửa câu hỏi"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(q)}
                          title="Xóa câu hỏi"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AdminPagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
      </Card>

      {/* Adaptive Question Editor Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={form.isEdit ? `Chỉnh sửa câu hỏi JLPT: ${form.id}` : 'Thêm câu hỏi JLPT mới'}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeModal}>
              Hủy
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void handleSave()}>
              {form.isEdit ? 'Lưu câu hỏi' : 'Tạo câu hỏi'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && <Notice tone="danger">{formError}</Notice>}

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Field label="ID Câu hỏi *">
              <Input
                required
                value={form.id}
                disabled={form.isEdit}
                onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
                placeholder="n3-vocab-001"
              />
            </Field>

            <Field label="Level *">
              <Select
                value={form.level}
                onChange={(e) => setForm((p) => ({ ...p, level: e.target.value as JLPTLevel }))}
              >
                {LEVELS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Module (module_id) *">
              <Select
                value={form.moduleId}
                onChange={(e) => {
                  const nextMod = e.target.value as AdminJlptModuleId;
                  setForm((p) => ({
                    ...p,
                    moduleId: nextMod,
                    questionType: inferQuestionType(nextMod),
                  }));
                }}
              >
                {JLPT_MODULE_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Kiểu câu hỏi (question_type) *">
              <Select
                value={form.questionType}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    questionType: e.target.value as AdminJlptRecord['questionType'],
                  }))
                }
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Reading passage above prompt */}
          {isReading && (
            <Field label="Đoạn văn đọc hiểu (passage) *">
              <Textarea
                required
                rows={6}
                value={form.passage}
                onChange={(e) => setForm((p) => ({ ...p, passage: e.target.value }))}
                placeholder="Nhập toàn bộ đoạn văn tiếng Nhật để học viên đọc hiểu..."
                className="font-jp"
              />
            </Field>
          )}

          {/* Listening situation + audio_text + TTS */}
          {isListening && (
            <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-3.5">
              <Field label="Tình huống nghe (passage / situation)">
                <Input
                  value={form.passage}
                  onChange={(e) => setForm((p) => ({ ...p, passage: e.target.value }))}
                  placeholder="VD: Hai đồng nghiệp đang trao đổi về lịch họp ngày mai."
                />
              </Field>
              <Field
                label="Nội dung hội thoại TTS (audio_text / dialogue) *"
                hint={
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!isSpeechSupported() || (!form.audioText.trim() && !form.prompt.trim())}
                    onClick={handleToggleTts}
                  >
                    {isSpeaking ? (
                      <>
                        <Square className="h-3.5 w-3.5" />
                        Dừng đọc
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-3.5 w-3.5" />
                        Nghe thử (TTS)
                      </>
                    )}
                  </Button>
                }
              >
                <Textarea
                  required
                  rows={4}
                  value={form.audioText}
                  onChange={(e) => setForm((p) => ({ ...p, audioText: e.target.value }))}
                  placeholder="女：すみません、会議の時間は何時からですか。&#10;男：午後２時からです。"
                  className="font-jp"
                />
              </Field>
              {form.audioText.trim().length > 0 && (
                <AudioSpeechPlayer
                  dialogue={parsePlainDialogueScript(form.audioText)}
                  situation={form.passage}
                  questionPrompt={form.prompt}
                />
              )}
            </div>
          )}

          {/* Prompt */}
          <Field
            label={isStar ? 'Câu có chỗ trống ★ (prompt) *' : 'Đề bài / Câu hỏi (prompt) *'}
          >
            <Textarea
              required
              rows={2}
              value={form.prompt}
              onChange={(e) => setForm((p) => ({ ...p, prompt: e.target.value }))}
              placeholder={
                isStar
                  ? '昨日＿＿ ＿＿ ★ ＿＿ 忘れました。'
                  : 'Nhập đề bài câu hỏi JLPT...'
              }
              className="font-jp"
            />
          </Field>

          {/* Star fullSentence mapped to passage */}
          {isStar && (
            <Field label="Câu hoàn chỉnh sau khi ghép (passage / fullSentence)">
              <Input
                value={form.passage}
                onChange={(e) => setForm((p) => ({ ...p, passage: e.target.value }))}
                placeholder="昨日買った傘を電車の中に忘れました。"
                className="font-jp"
              />
            </Field>
          )}

          {/* Optional passage field for non-star/non-reading/non-listening */}
          {!isStar && !isReading && !isListening && (
            <Field label="Ngữ cảnh bổ sung (passage - tùy chọn)">
              <Input
                value={form.passage}
                onChange={(e) => setForm((p) => ({ ...p, passage: e.target.value }))}
                placeholder="Để trống nếu không có đoạn văn phụ..."
              />
            </Field>
          )}

          {/* 4 Options + Correct Radio */}
          <div className="rounded-xl border border-line bg-surface-2 p-3.5">
            <div className="mb-2.5 text-sm font-semibold text-fg">
              {isStar
                ? '4 Mảnh ghép (Chunks 1..4) & Chọn vị trí dấu sao ★ (starIndex: 0..3)'
                : '4 Đáp án (A, B, C, D) & Chọn đáp án đúng (correct_index)'}
            </div>
            <div className="grid gap-2.5 md:grid-cols-2">
              {form.options.map((opt, idx) => {
                const labelText = isStar
                  ? `Mảnh ghép ${idx + 1} (Chunk ${idx + 1})`
                  : `Đáp án ${String.fromCharCode(65 + idx)}`;
                const radioLabel = isStar ? `Vị trí ★ (${idx})` : `Đáp án đúng`;
                const isSelected = form.correctIndex === idx;
                return (
                  <div
                    key={idx}
                    className={
                      isSelected
                        ? 'rounded-lg border border-success bg-success-soft/30 p-2.5'
                        : 'rounded-lg border border-line bg-surface p-2.5'
                    }
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-fg">{labelText}</span>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-fg">
                        <input
                          type="radio"
                          name="jlpt-correct-index"
                          checked={isSelected}
                          onChange={() => setForm((p) => ({ ...p, correctIndex: idx }))}
                          className="accent-primary"
                        />
                        {radioLabel}
                      </label>
                    </div>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((p) => {
                          const next: [string, string, string, string] = [...p.options] as [
                            string,
                            string,
                            string,
                            string,
                          ];
                          next[idx] = val;
                          return { ...p, options: next };
                        });
                      }}
                      placeholder={isStar ? `Mảnh ${idx + 1}...` : `Nhập lựa chọn ${String.fromCharCode(65 + idx)}...`}
                      className="font-jp"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <Field label="Giải thích đáp án (explanation)">
            <Textarea
              rows={2}
              value={form.explanation}
              onChange={(e) => setForm((p) => ({ ...p, explanation: e.target.value }))}
              placeholder="Giải thích ngắn gọn lý do chọn đáp án..."
            />
          </Field>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa câu hỏi JLPT"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button variant="danger" loading={saving} onClick={() => void confirmDelete()}>
              Xóa câu hỏi
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg">
          Bạn chắc chắn muốn xóa câu hỏi JLPT <code>{deleteTarget?.id}</code>?
        </p>
      </Modal>

      {/* Import/Export Modal */}
      <AdminImportExportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityType="jlpt"
        snapshot={snapshot}
        actor={actor}
        onCommitted={onRefresh}
        filteredExportData={filtered}
        filteredExportLabel={`Export ${filtered.length} câu hỏi JLPT đang lọc`}
      />
    </div>
  );
}
