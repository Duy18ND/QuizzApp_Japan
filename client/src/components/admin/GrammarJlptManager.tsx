import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Upload } from 'lucide-react';
import {
  deleteGrammarRule,
  deleteJlptQuestion,
  saveGrammarRule,
  saveJlptQuestion,
  type CmsSnapshot,
} from '../../services/adminCmsService';
import type {
  AdminGrammarExample,
  AdminGrammarRecord,
  AdminJlptModuleId,
  AdminJlptRecord,
} from '../../types/admin';
import type { AuthUser } from '../../store/slices/authSlice';
import type { JLPTLevel } from '../../types/quiz';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Input,
  Modal,
  Notice,
  SearchInput,
  Select,
  Textarea,
} from '../ui';
import { AdminImportExportModal } from './AdminImportExportModal';
import { AdminPagination } from './AdminPagination';

const LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const JLPT_MODULE_OPTIONS: Array<{ value: AdminJlptModuleId; label: string }> = [
  { value: 'kanji', label: 'Chữ Hán (kanji)' },
  { value: 'vocab', label: 'Từ vựng (vocab)' },
  { value: 'grammar', label: 'Ngữ pháp (grammar)' },
  { value: 'star', label: 'Hái sao (star)' },
  { value: 'reading-short', label: 'Đọc ngắn (reading-short)' },
  { value: 'reading-medium', label: 'Đọc trung (reading-medium)' },
  { value: 'reading-long', label: 'Đọc dài (reading-long)' },
  { value: 'listening', label: 'Nghe hiểu (listening)' },
];
const PAGE_SIZE = 15;

interface GrammarFormState {
  isEdit: boolean;
  id: string;
  bookId: string;
  chapterId: string;
  level: JLPTLevel;
  title: string;
  structure: string;
  meaning: string;
  explanation: string;
  notes: string;
  examplesText: string;
}

interface JlptFormState {
  isEdit: boolean;
  id: string;
  moduleId: AdminJlptModuleId;
  level: JLPTLevel;
  prompt: string;
  passage: string;
  optionsText: string;
  correctIndex: number;
  explanation: string;
  audioText: string;
}

const emptyGrammarForm = (): GrammarFormState => ({
  isEdit: false,
  id: '',
  bookId: 'SHINKANZEN_N3',
  chapterId: 'L01',
  level: 'N3',
  title: '',
  structure: '',
  meaning: '',
  explanation: '',
  notes: '',
  examplesText: '',
});

const emptyJlptForm = (): JlptFormState => ({
  isEdit: false,
  id: '',
  moduleId: 'vocab',
  level: 'N3',
  prompt: '',
  passage: '',
  optionsText: '\n\n\n',
  correctIndex: 0,
  explanation: '',
  audioText: '',
});

const formatExamplesToText = (examples: AdminGrammarExample[]): string =>
  examples.map((ex) => `${ex.japanese} | ${ex.hiragana} | ${ex.vietnamese}`).join('\n');

const parseExamplesText = (text: string): AdminGrammarExample[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [japanese = '', hiragana = '', vietnamese = ''] = line.split('|').map((s) => s.trim());
      return { japanese, hiragana, vietnamese };
    })
    .filter((ex) => ex.japanese || ex.vietnamese);

interface GrammarJlptManagerProps {
  grammars: AdminGrammarRecord[];
  jlptQuestions: AdminJlptRecord[];
  actor: AuthUser | null;
  snapshot: CmsSnapshot;
  onRefresh: () => Promise<void> | void;
}

export function GrammarJlptManager({
  grammars,
  jlptQuestions,
  actor,
  snapshot,
  onRefresh,
}: GrammarJlptManagerProps) {
  const [subMode, setSubMode] = useState<'grammar' | 'jlpt'>('grammar');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | JLPTLevel>('ALL');
  const [jlptModuleFilter, setJlptModuleFilter] = useState<'ALL' | AdminJlptModuleId>('ALL');
  const [page, setPage] = useState(1);

  const [grammarModalOpen, setGrammarModalOpen] = useState(false);
  const [grammarForm, setGrammarForm] = useState<GrammarFormState>(emptyGrammarForm);

  const [jlptModalOpen, setJlptModalOpen] = useState(false);
  const [jlptForm, setJlptForm] = useState<JlptFormState>(emptyJlptForm);

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    { kind: 'grammar'; item: AdminGrammarRecord } | { kind: 'jlpt'; item: AdminJlptRecord } | null
  >(null);
  const [importOpen, setImportOpen] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const filteredGrammars = useMemo(() => {
    const q = search.trim().toLowerCase();
    return grammars.filter((g) => {
      if (levelFilter !== 'ALL' && g.level !== levelFilter) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.structure.toLowerCase().includes(q) ||
        g.meaning.toLowerCase().includes(q)
      );
    });
  }, [grammars, search, levelFilter]);

  const filteredJlpt = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jlptQuestions.filter((item) => {
      if (levelFilter !== 'ALL' && item.level !== levelFilter) return false;
      if (jlptModuleFilter !== 'ALL' && item.moduleId !== jlptModuleFilter) return false;
      if (!q) return true;
      return (
        item.prompt.toLowerCase().includes(q) ||
        item.explanation.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [jlptQuestions, search, levelFilter, jlptModuleFilter]);

  const activeListLength = subMode === 'grammar' ? filteredGrammars.length : filteredJlpt.length;
  const totalPages = Math.max(1, Math.ceil(activeListLength / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const paginatedGrammars = useMemo(
    () => filteredGrammars.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredGrammars, safePage],
  );

  const paginatedJlpt = useMemo(
    () => filteredJlpt.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredJlpt, safePage],
  );

  const openCreate = () => {
    setFormError(null);
    if (subMode === 'grammar') {
      setGrammarForm(emptyGrammarForm());
      setGrammarModalOpen(true);
    } else {
      setJlptForm(emptyJlptForm());
      setJlptModalOpen(true);
    }
  };

  const openEditGrammar = (g: AdminGrammarRecord) => {
    setFormError(null);
    setGrammarForm({
      isEdit: true,
      id: g.id,
      bookId: g.bookId,
      chapterId: g.chapterId,
      level: g.level,
      title: g.title,
      structure: g.structure,
      meaning: g.meaning,
      explanation: g.explanation,
      notes: g.notes,
      examplesText: formatExamplesToText(g.examples),
    });
    setGrammarModalOpen(true);
  };

  const openEditJlpt = (q: AdminJlptRecord) => {
    setFormError(null);
    setJlptForm({
      isEdit: true,
      id: q.id,
      moduleId: q.moduleId,
      level: q.level,
      prompt: q.prompt,
      passage: q.passage ?? '',
      optionsText: q.options.join('\n'),
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      audioText: q.audioText ?? '',
    });
    setJlptModalOpen(true);
  };

  const handleSaveGrammar = async () => {
    setFormError(null);
    if (!grammarForm.title.trim() || !grammarForm.structure.trim() || !grammarForm.meaning.trim()) {
      setFormError('Vui lòng nhập đầy đủ Tên mẫu, Công thức và Nghĩa tiếng Việt.');
      return;
    }
    const id = grammarForm.id.trim() || `${grammarForm.level}-CUSTOM-${Date.now()}`;
    const record: AdminGrammarRecord = {
      id,
      bookId: grammarForm.bookId.trim() || 'SHINKANZEN_N3',
      chapterId: grammarForm.chapterId.trim() || 'L01',
      level: grammarForm.level,
      title: grammarForm.title.trim(),
      structure: grammarForm.structure.trim(),
      meaning: grammarForm.meaning.trim(),
      explanation: grammarForm.explanation.trim(),
      notes: grammarForm.notes.trim(),
      examples: parseExamplesText(grammarForm.examplesText),
    };

    setSaving(true);
    const res = await saveGrammarRule(record, actor);
    setSaving(false);
    if (!res.ok) {
      setFormError(res.error ?? 'Không thể lưu ngữ pháp.');
      return;
    }
    setGrammarModalOpen(false);
    setBanner({
      tone: 'success',
      text: `${grammarForm.isEdit ? 'Đã cập nhật' : 'Đã thêm'} ngữ pháp "${record.title}".`,
    });
    await onRefresh();
  };

  const handleSaveJlpt = async () => {
    setFormError(null);
    const prompt = jlptForm.prompt.trim();
    const options = jlptForm.optionsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!prompt) {
      setFormError('Vui lòng nhập câu hỏi / đề bài.');
      return;
    }
    if (options.length < 2) {
      setFormError('Cần ít nhất 2 phương án trả lời (mỗi dòng một phương án).');
      return;
    }
    if (jlptForm.correctIndex < 0 || jlptForm.correctIndex >= options.length) {
      setFormError('Vị trí đáp án đúng vượt quá số lượng phương án hiện có.');
      return;
    }

    const questionType: AdminJlptRecord['questionType'] =
      jlptForm.moduleId === 'star'
        ? 'star'
        : jlptForm.moduleId === 'listening'
          ? 'listening'
          : jlptForm.moduleId.startsWith('reading')
            ? 'reading'
            : 'mcq';

    const record: AdminJlptRecord = {
      id: jlptForm.id.trim() || `jlpt-${jlptForm.moduleId}-${Date.now()}`,
      moduleId: jlptForm.moduleId,
      level: jlptForm.level,
      questionType,
      prompt,
      passage: jlptForm.passage.trim() || null,
      options,
      correctIndex: jlptForm.correctIndex,
      explanation: jlptForm.explanation.trim(),
      audioText: jlptForm.audioText.trim() || null,
    };

    setSaving(true);
    const res = await saveJlptQuestion(record, actor);
    setSaving(false);
    if (!res.ok) {
      setFormError(res.error ?? 'Không thể lưu câu hỏi JLPT.');
      return;
    }
    setJlptModalOpen(false);
    setBanner({
      tone: 'success',
      text: `${jlptForm.isEdit ? 'Đã cập nhật' : 'Đã thêm'} câu hỏi JLPT (${record.moduleId}).`,
    });
    await onRefresh();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const res =
      deleteTarget.kind === 'grammar'
        ? await deleteGrammarRule(deleteTarget.item.id, actor)
        : await deleteJlptQuestion(deleteTarget.item.id, actor);
    setSaving(false);
    setDeleteTarget(null);

    if (!res.ok) {
      setBanner({ tone: 'danger', text: res.error ?? 'Xóa thất bại.' });
      return;
    }
    setBanner({ tone: 'success', text: 'Đã xóa bản ghi thành công.' });
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      {banner && <Notice tone={banner.tone}>{banner.text}</Notice>}

      <Card padding="md" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Chip
              selected={subMode === 'grammar'}
              onClick={() => {
                setSubMode('grammar');
                setSearch('');
                setPage(1);
              }}
            >
              Ngữ pháp ({grammars.length})
            </Chip>
            <Chip
              selected={subMode === 'jlpt'}
              onClick={() => {
                setSubMode('jlpt');
                setSearch('');
                setPage(1);
              }}
            >
              Câu hỏi JLPT ({jlptQuestions.length})
            </Chip>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Upload className="size-4" aria-hidden />}
              onClick={() => setImportOpen(true)}
            >
              Import / Export
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="size-4" aria-hidden />}
              onClick={openCreate}
            >
              {subMode === 'grammar' ? 'Thêm ngữ pháp' : 'Thêm câu JLPT'}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder={
              subMode === 'grammar'
                ? 'Tìm mẫu câu, cấu trúc, nghĩa...'
                : 'Tìm đề bài, giải thích, ID...'
            }
            className="w-full sm:w-64"
          />
          <Select
            aria-label="Lọc cấp độ"
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value as 'ALL' | JLPTLevel);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả cấp độ</option>
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </Select>

          {subMode === 'jlpt' && (
            <Select
              aria-label="Lọc dạng bài JLPT"
              value={jlptModuleFilter}
              onChange={(e) => {
                setJlptModuleFilter(e.target.value as 'ALL' | AdminJlptModuleId);
                setPage(1);
              }}
            >
              <option value="ALL">Tất cả dạng Mondai</option>
              {JLPT_MODULE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          )}
        </div>
      </Card>

      {activeListLength === 0 ? (
        <EmptyState
          title="Không có dữ liệu phù hợp"
          description="Hãy đổi điều kiện lọc hoặc thêm mới dữ liệu."
        />
      ) : subMode === 'grammar' ? (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Mẫu ngữ pháp</th>
                  <th className="px-4 py-3 font-semibold">Cấu trúc &amp; Nghĩa</th>
                  <th className="px-4 py-3 font-semibold">Cấp / Ví dụ</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paginatedGrammars.map((g) => (
                  <tr key={g.id} className="transition-colors hover:bg-glass-soft">
                    <td className="px-4 py-3">
                      <p lang="ja" className="font-bold text-fg">
                        {g.title}
                      </p>
                      <p className="text-xs text-muted">
                        {g.bookId} · {g.chapterId}
                      </p>
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <p lang="ja" className="text-xs font-medium text-primary-fg">
                        {g.structure}
                      </p>
                      <p className="mt-0.5 text-sm text-fg">{g.meaning}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="primary">{g.level}</Badge>
                        <Badge tone="neutral">{g.examples.length} ví dụ</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Sửa ${g.title}`}
                          onClick={() => openEditGrammar(g)}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          aria-label={`Xóa ${g.title}`}
                          onClick={() => setDeleteTarget({ kind: 'grammar', item: g })}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Module / Cấp</th>
                  <th className="px-4 py-3 font-semibold">Câu hỏi &amp; Phương án</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paginatedJlpt.map((q) => (
                  <tr key={q.id} className="transition-colors hover:bg-glass-soft">
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone="primary">{q.level}</Badge>
                        <Badge tone="neutral">{q.moduleId}</Badge>
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-muted">{q.id}</p>
                    </td>
                    <td className="max-w-lg px-4 py-3">
                      <p lang="ja" className="font-medium text-fg">
                        {q.prompt}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Đáp án đúng:{' '}
                        <strong className="text-success-fg">
                          {q.options[q.correctIndex] ?? `#${q.correctIndex + 1}`}
                        </strong>{' '}
                        ({q.options.length} lựa chọn)
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Sửa câu hỏi ${q.id}`}
                          onClick={() => openEditJlpt(q)}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          aria-label={`Xóa câu hỏi ${q.id}`}
                          onClick={() => setDeleteTarget({ kind: 'jlpt', item: q })}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AdminPagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
        </Card>
      )}

      {/* Grammar Modal */}
      <Modal
        open={grammarModalOpen}
        onClose={() => setGrammarModalOpen(false)}
        size="lg"
        title={grammarForm.isEdit ? `Sửa ngữ pháp: ${grammarForm.title}` : 'Thêm mẫu ngữ pháp mới'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setGrammarModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void handleSaveGrammar()}>
              {grammarForm.isEdit ? 'Lưu thay đổi' : 'Tạo ngữ pháp'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {formError && <Notice tone="danger">{formError}</Notice>}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Cấp độ" htmlFor="gr-level">
              <Select
                id="gr-level"
                value={grammarForm.level}
                onChange={(e) => setGrammarForm({ ...grammarForm, level: e.target.value as JLPTLevel })}
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mã sách" htmlFor="gr-book">
              <Input
                id="gr-book"
                value={grammarForm.bookId}
                onChange={(e) => setGrammarForm({ ...grammarForm, bookId: e.target.value })}
              />
            </Field>
            <Field label="Mã bài" htmlFor="gr-chapter">
              <Input
                id="gr-chapter"
                value={grammarForm.chapterId}
                onChange={(e) => setGrammarForm({ ...grammarForm, chapterId: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên mẫu *" htmlFor="gr-title">
              <Input
                id="gr-title"
                lang="ja"
                value={grammarForm.title}
                onChange={(e) => setGrammarForm({ ...grammarForm, title: e.target.value })}
                placeholder="～わけではない"
              />
            </Field>
            <Field label="Công thức / Cấu trúc *" htmlFor="gr-structure">
              <Input
                id="gr-structure"
                lang="ja"
                value={grammarForm.structure}
                onChange={(e) => setGrammarForm({ ...grammarForm, structure: e.target.value })}
                placeholder="V/A/Naな/Nの + わけではない"
              />
            </Field>
          </div>

          <Field label="Nghĩa tiếng Việt *" htmlFor="gr-meaning">
            <Input
              id="gr-meaning"
              value={grammarForm.meaning}
              onChange={(e) => setGrammarForm({ ...grammarForm, meaning: e.target.value })}
              placeholder="Không hẳn là..."
            />
          </Field>

          <Field label="Giải thích chi tiết" htmlFor="gr-explanation">
            <Textarea
              id="gr-explanation"
              rows={2}
              value={grammarForm.explanation}
              onChange={(e) => setGrammarForm({ ...grammarForm, explanation: e.target.value })}
            />
          </Field>

          <Field
            label="Câu ví dụ (mỗi dòng: Tiếng Nhật | Hiragana | Nghĩa Việt)"
            htmlFor="gr-examples"
          >
            <Textarea
              id="gr-examples"
              rows={3}
              className="font-mono text-xs"
              value={grammarForm.examplesText}
              onChange={(e) => setGrammarForm({ ...grammarForm, examplesText: e.target.value })}
              placeholder="日本料理が嫌いなわけではない。 | にほんりょうりがきらいなわけではない。 | Không hẳn là tôi ghét món Nhật."
            />
          </Field>
        </div>
      </Modal>

      {/* JLPT Modal */}
      <Modal
        open={jlptModalOpen}
        onClose={() => setJlptModalOpen(false)}
        size="lg"
        title={jlptForm.isEdit ? `Sửa câu hỏi JLPT` : 'Thêm câu hỏi JLPT mới'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setJlptModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void handleSaveJlpt()}>
              {jlptForm.isEdit ? 'Lưu thay đổi' : 'Tạo câu hỏi'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {formError && <Notice tone="danger">{formError}</Notice>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dạng bài JLPT *" htmlFor="jlpt-module">
              <Select
                id="jlpt-module"
                value={jlptForm.moduleId}
                onChange={(e) =>
                  setJlptForm({ ...jlptForm, moduleId: e.target.value as AdminJlptModuleId })
                }
              >
                {JLPT_MODULE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cấp độ *" htmlFor="jlpt-level">
              <Select
                id="jlpt-level"
                value={jlptForm.level}
                onChange={(e) => setJlptForm({ ...jlptForm, level: e.target.value as JLPTLevel })}
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Câu hỏi / Đề bài *" htmlFor="jlpt-prompt">
            <Textarea
              id="jlpt-prompt"
              lang="ja"
              rows={2}
              value={jlptForm.prompt}
              onChange={(e) => setJlptForm({ ...jlptForm, prompt: e.target.value })}
            />
          </Field>

          {(jlptForm.moduleId.startsWith('reading') || jlptForm.moduleId === 'star') && (
            <Field label="Đoạn văn / Câu đầy đủ" htmlFor="jlpt-passage">
              <Textarea
                id="jlpt-passage"
                lang="ja"
                rows={3}
                value={jlptForm.passage}
                onChange={(e) => setJlptForm({ ...jlptForm, passage: e.target.value })}
              />
            </Field>
          )}

          {jlptForm.moduleId === 'listening' && (
            <Field label="Transcript hội thoại (Audio Text)" htmlFor="jlpt-audio">
              <Textarea
                id="jlpt-audio"
                lang="ja"
                rows={3}
                value={jlptForm.audioText}
                onChange={(e) => setJlptForm({ ...jlptForm, audioText: e.target.value })}
              />
            </Field>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label="4 phương án (mỗi dòng 1 phương án) *"
              htmlFor="jlpt-options"
              className="sm:col-span-2"
            >
              <Textarea
                id="jlpt-options"
                lang="ja"
                rows={4}
                value={jlptForm.optionsText}
                onChange={(e) => setJlptForm({ ...jlptForm, optionsText: e.target.value })}
              />
            </Field>
            <Field label="Đáp án đúng *" htmlFor="jlpt-correct">
              <Select
                id="jlpt-correct"
                value={String(jlptForm.correctIndex)}
                onChange={(e) =>
                  setJlptForm({ ...jlptForm, correctIndex: Number(e.target.value) })
                }
              >
                <option value="0">Phương án 1 (A)</option>
                <option value="1">Phương án 2 (B)</option>
                <option value="2">Phương án 3 (C)</option>
                <option value="3">Phương án 4 (D)</option>
              </Select>
            </Field>
          </div>

          <Field label="Giải thích" htmlFor="jlpt-explanation">
            <Textarea
              id="jlpt-explanation"
              rows={2}
              value={jlptForm.explanation}
              onChange={(e) => setJlptForm({ ...jlptForm, explanation: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title="Xác nhận xóa"
        description={
          deleteTarget?.kind === 'grammar'
            ? `Xóa mẫu ngữ pháp "${deleteTarget.item.title}"?`
            : `Xóa câu hỏi JLPT "${deleteTarget?.item.id}"?`
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              loading={saving}
              onClick={() => void handleConfirmDelete()}
            >
              Xóa vĩnh viễn
            </Button>
          </>
        }
      />

      {importOpen && (
        <AdminImportExportModal
          key={subMode}
          open={importOpen}
          onClose={() => setImportOpen(false)}
          entityType={subMode}
          snapshot={snapshot}
          actor={actor}
          onCommitted={onRefresh}
          filteredExportData={subMode === 'grammar' ? filteredGrammars : filteredJlpt}
          filteredExportLabel={`Xuất bộ lọc (${activeListLength})`}
        />
      )}
    </div>
  );
}
