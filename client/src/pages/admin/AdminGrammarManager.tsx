import { useMemo, useState } from 'react';
import { BookMarked, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { AdminImportExportModal } from '../../components/admin/AdminImportExportModal';
import { AdminPagination } from '../../components/admin/AdminPagination';
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
  deleteGrammarRule,
  saveGrammarRule,
  type CmsSnapshot,
} from '../../services/adminCmsService';
import type { AuthUser } from '../../store/slices/authSlice';
import type { AdminGrammarExample, AdminGrammarRecord } from '../../types/admin';
import type { JLPTLevel } from '../../types/quiz';

const LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const PAGE_SIZE = 12;

interface GrammarExampleDraft {
  jp: string;
  vi: string;
  hiragana?: string;
}

interface GrammarFormState {
  isEdit: boolean;
  id: string;
  level: JLPTLevel;
  bookId: string;
  customBookMode: boolean;
  customBookId: string;
  chapterId: string;
  customChapterMode: boolean;
  customChapterId: string;
  title: string;
  structure: string;
  meaning: string;
  explanation: string;
  notes: string;
  examples: GrammarExampleDraft[];
}

const emptyGrammarForm = (defaultBook = 'SHINKANZEN_N3', defaultChapter = 'L01'): GrammarFormState => ({
  isEdit: false,
  id: '',
  level: 'N3',
  bookId: defaultBook,
  customBookMode: false,
  customBookId: '',
  chapterId: defaultChapter,
  customChapterMode: false,
  customChapterId: '',
  title: '',
  structure: '',
  meaning: '',
  explanation: '',
  notes: '',
  examples: [{ jp: '', vi: '' }],
});

interface AdminGrammarManagerProps {
  snapshot: CmsSnapshot;
  actor: AuthUser | null;
  onRefresh: () => Promise<void> | void;
}

export function AdminGrammarManager({ snapshot, actor, onRefresh }: AdminGrammarManagerProps) {
  const [levelFilter, setLevelFilter] = useState<'ALL' | JLPTLevel>('ALL');
  const [bookFilter, setBookFilter] = useState<string>('ALL');
  const [chapterFilter, setChapterFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState<GrammarFormState>(() => emptyGrammarForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminGrammarRecord | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const bookOptions = useMemo(() => {
    const set = new Set<string>(['SHINKANZEN_N3']);
    for (const g of snapshot.grammars) {
      if (levelFilter !== 'ALL' && g.level !== levelFilter) continue;
      if (g.bookId) set.add(g.bookId);
    }
    return Array.from(set).sort();
  }, [snapshot.grammars, levelFilter]);

  const chapterOptions = useMemo(() => {
    const set = new Set<string>(['L01', 'L02']);
    for (const g of snapshot.grammars) {
      if (levelFilter !== 'ALL' && g.level !== levelFilter) continue;
      if (bookFilter !== 'ALL' && g.bookId !== bookFilter) continue;
      if (g.chapterId) set.add(g.chapterId);
    }
    return Array.from(set).sort();
  }, [snapshot.grammars, levelFilter, bookFilter]);

  const allBooks = useMemo(() => {
    const set = new Set<string>(['SHINKANZEN_N3']);
    snapshot.grammars.forEach((g) => {
      if (g.bookId) set.add(g.bookId);
    });
    return Array.from(set).sort();
  }, [snapshot.grammars]);

  const allChapters = useMemo(() => {
    const set = new Set<string>(['L01', 'L02']);
    snapshot.grammars.forEach((g) => {
      if (g.chapterId) set.add(g.chapterId);
    });
    return Array.from(set).sort();
  }, [snapshot.grammars]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return snapshot.grammars.filter((g) => {
      if (levelFilter !== 'ALL' && g.level !== levelFilter) return false;
      if (bookFilter !== 'ALL' && g.bookId !== bookFilter) return false;
      if (chapterFilter !== 'ALL' && g.chapterId !== chapterFilter) return false;
      if (!q) return true;
      return (
        g.id.toLowerCase().includes(q) ||
        g.title.toLowerCase().includes(q) ||
        g.structure.toLowerCase().includes(q) ||
        g.meaning.toLowerCase().includes(q) ||
        g.explanation.toLowerCase().includes(q)
      );
    });
  }, [snapshot.grammars, levelFilter, bookFilter, chapterFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openCreate = () => {
    const defaultBook = bookFilter !== 'ALL' ? bookFilter : allBooks[0] ?? 'SHINKANZEN_N3';
    const defaultChapter = chapterFilter !== 'ALL' ? chapterFilter : allChapters[0] ?? 'L01';
    const nextIdx = String(snapshot.grammars.length + 1).padStart(2, '0');
    const level: JLPTLevel = levelFilter !== 'ALL' ? levelFilter : 'N3';
    setForm({
      ...emptyGrammarForm(defaultBook, defaultChapter),
      level,
      id: `${level}-SKZ-${defaultChapter}-RULE-${nextIdx}`,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (item: AdminGrammarRecord) => {
    const bookKnown = allBooks.includes(item.bookId);
    const chapterKnown = allChapters.includes(item.chapterId);
    setForm({
      isEdit: true,
      id: item.id,
      level: item.level,
      bookId: bookKnown ? item.bookId : allBooks[0] ?? 'SHINKANZEN_N3',
      customBookMode: !bookKnown,
      customBookId: !bookKnown ? item.bookId : '',
      chapterId: chapterKnown ? item.chapterId : allChapters[0] ?? 'L01',
      customChapterMode: !chapterKnown,
      customChapterId: !chapterKnown ? item.chapterId : '',
      title: item.title,
      structure: item.structure,
      meaning: item.meaning,
      explanation: item.explanation,
      notes: item.notes,
      examples:
        item.examples.length > 0
          ? item.examples.map((ex) => ({
              jp: ex.jp ?? ex.japanese ?? '',
              vi: ex.vi ?? ex.vietnamese ?? '',
              hiragana: ex.hiragana,
            }))
          : [{ jp: '', vi: '' }],
    });
    setFormError(null);
    setModalOpen(true);
  };

  const addExampleRow = () => {
    setForm((prev) => ({
      ...prev,
      examples: [...prev.examples, { jp: '', vi: '' }],
    }));
  };

  const updateExampleRow = (index: number, patch: Partial<GrammarExampleDraft>) => {
    setForm((prev) => ({
      ...prev,
      examples: prev.examples.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)),
    }));
  };

  const removeExampleRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      examples:
        prev.examples.length <= 1
          ? [{ jp: '', vi: '' }]
          : prev.examples.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    const resolvedBookId = (form.customBookMode ? form.customBookId : form.bookId).trim();
    const resolvedChapterId = (form.customChapterMode ? form.customChapterId : form.chapterId).trim();
    const resolvedId = form.id.trim();

    if (!resolvedId) {
      setFormError('Vui lòng nhập ID mẫu ngữ pháp (ví dụ: N3-SKZ-L01-UCHINI-01).');
      return;
    }
    if (!resolvedBookId || !resolvedChapterId) {
      setFormError('Vui lòng chọn hoặc nhập mã giáo trình (book_id) và bài học (chapter_id).');
      return;
    }
    if (!form.title.trim() || !form.structure.trim() || !form.meaning.trim()) {
      setFormError('Tên ngữ pháp, cấu trúc (joined "/") và nghĩa tiếng Việt là bắt buộc.');
      return;
    }

    if (
      !form.isEdit &&
      snapshot.grammars.some((g) => g.id.toLowerCase() === resolvedId.toLowerCase())
    ) {
      setFormError(`ID "${resolvedId}" đã tồn tại trong hệ thống.`);
      return;
    }

    const cleanedExamples: AdminGrammarExample[] = form.examples
      .filter((ex) => ex.jp.trim().length > 0 || ex.vi.trim().length > 0)
      .map((ex) => ({
        jp: ex.jp.trim(),
        vi: ex.vi.trim(),
        japanese: ex.jp.trim(),
        vietnamese: ex.vi.trim(),
        ...(ex.hiragana?.trim() ? { hiragana: ex.hiragana.trim() } : {}),
      }));

    setSaving(true);
    setFormError(null);
    const record: AdminGrammarRecord = {
      id: resolvedId,
      bookId: resolvedBookId,
      chapterId: resolvedChapterId,
      level: form.level,
      title: form.title.trim(),
      structure: form.structure.trim(),
      meaning: form.meaning.trim(),
      explanation: form.explanation.trim(),
      notes: form.notes.trim(),
      examples: cleanedExamples,
    };

    const res = await saveGrammarRule(record, actor, { isNew: !form.isEdit });
    setSaving(false);

    if (!res.ok) {
      setFormError(res.error ?? 'Không thể lưu mẫu ngữ pháp.');
      return;
    }

    setModalOpen(false);
    setBanner({
      tone: 'success',
      text: `${form.isEdit ? 'Đã cập nhật' : 'Đã tạo'} ngữ pháp "${record.title}" (${record.id}) và đồng bộ Live Client.`,
    });
    await onRefresh();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const res = await deleteGrammarRule(deleteTarget.id, actor);
    setSaving(false);
    setDeleteTarget(null);
    if (!res.ok) {
      setBanner({ tone: 'danger', text: res.error ?? 'Không thể xóa ngữ pháp.' });
      return;
    }
    setBanner({
      tone: 'success',
      text: `Đã xóa mẫu ngữ pháp "${deleteTarget.title}" (${deleteTarget.id}).`,
    });
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">
            Quản trị Ngữ pháp (<code>public.grammar_rules</code>)
          </h2>
          <p className="text-xs text-muted">
            Phân cấp Level → Giáo trình (<code>book_id</code>) → Bài (<code>chapter_id</code>) kèm trình sửa cặp ví dụ JP/VI.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Import / Export JSON
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Thêm ngữ pháp
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
              setBookFilter('ALL');
              setChapterFilter('ALL');
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

        <Field label="Giáo trình (book_id)">
          <Select
            value={bookFilter}
            onChange={(e) => {
              setBookFilter(e.target.value);
              setChapterFilter('ALL');
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả giáo trình ({bookOptions.length})</option>
            {bookOptions.map((book) => (
              <option key={book} value={book}>
                {book}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Bài học (chapter_id)">
          <Select
            value={chapterFilter}
            onChange={(e) => {
              setChapterFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả bài ({chapterOptions.length})</option>
            {chapterOptions.map((chap) => (
              <option key={chap} value={chap}>
                {chap}
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
            placeholder="Tên mẫu, cấu trúc, nghĩa..."
          />
        </Field>
      </Card>

      {/* Table */}
      <Card padding="none" className="overflow-hidden">
        {pageItems.length === 0 ? (
          <EmptyState
            icon={<BookMarked className="h-6 w-6" />}
            title="Không tìm thấy mẫu ngữ pháp"
            description="Thử thay đổi bộ lọc Level / Book / Chapter hoặc tạo mẫu ngữ pháp mới."
            action={
              <Button variant="primary" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Thêm ngữ pháp
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">ID &amp; Phân loại</th>
                  <th className="px-4 py-3">Mẫu câu &amp; Cấu trúc</th>
                  <th className="px-4 py-3">Ý nghĩa &amp; Ghi chú</th>
                  <th className="px-4 py-3">Ví dụ JP/VI</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageItems.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-glass-soft">
                    <td className="px-4 py-3 align-top">
                      <div className="font-mono text-xs font-semibold text-fg">{item.id}</div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Badge tone="primary">{item.level}</Badge>
                        <Badge tone="neutral">{item.bookId}</Badge>
                        <Badge tone="sakura">{item.chapterId}</Badge>
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-3 align-top">
                      <div className="font-jp text-base font-semibold text-fg">{item.title}</div>
                      <div className="mt-1 rounded-md border border-line bg-surface-2 px-2 py-1 font-jp text-xs text-muted">
                        {item.structure}
                      </div>
                    </td>
                    <td className="max-w-sm px-4 py-3 align-top">
                      <div className="font-medium text-fg">{item.meaning}</div>
                      {item.explanation && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted">{item.explanation}</p>
                      )}
                      {item.notes && (
                        <p className="mt-1 line-clamp-1 text-xs text-warning">{item.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge tone={item.examples.length > 0 ? 'success' : 'warning'}>
                        {item.examples.length} ví dụ
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                          title="Chỉnh sửa ngữ pháp"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(item)}
                          title="Xóa ngữ pháp"
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

      {/* Add/Edit Grammar Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.isEdit ? `Chỉnh sửa ngữ pháp: ${form.id}` : 'Thêm mẫu ngữ pháp mới'}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void handleSave()}>
              {form.isEdit ? 'Lưu thay đổi' : 'Tạo ngữ pháp'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {formError && <Notice tone="danger">{formError}</Notice>}

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Field label="ID (Primary Key) *">
              <Input
                required
                value={form.id}
                disabled={form.isEdit}
                onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))}
                placeholder="N3-SKZ-L01-UCHINI-01"
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

            <Field
              label="Giáo trình (book_id) *"
              hint={
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, customBookMode: !p.customBookMode }))}
                  className="text-xs font-medium text-primary underline"
                >
                  {form.customBookMode ? 'Chọn từ danh sách' : '+ Nhập book_id mới'}
                </button>
              }
            >
              {form.customBookMode ? (
                <Input
                  value={form.customBookId}
                  onChange={(e) => setForm((p) => ({ ...p, customBookId: e.target.value }))}
                  placeholder="VD: MIMIKARA_N3"
                />
              ) : (
                <Select
                  value={form.bookId}
                  onChange={(e) => setForm((p) => ({ ...p, bookId: e.target.value }))}
                >
                  {allBooks.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field
              label="Bài học (chapter_id) *"
              hint={
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, customChapterMode: !p.customChapterMode }))}
                  className="text-xs font-medium text-primary underline"
                >
                  {form.customChapterMode ? 'Chọn từ danh sách' : '+ Nhập chapter_id mới'}
                </button>
              }
            >
              {form.customChapterMode ? (
                <Input
                  value={form.customChapterId}
                  onChange={(e) => setForm((p) => ({ ...p, customChapterId: e.target.value }))}
                  placeholder="VD: L03"
                />
              ) : (
                <Select
                  value={form.chapterId}
                  onChange={(e) => setForm((p) => ({ ...p, chapterId: e.target.value }))}
                >
                  {allChapters.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Tên ngữ pháp (title / SmartGrammarRule.name) *">
              <Input
                required
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="～うちに（状態）"
                className="font-jp"
              />
            </Field>

            <Field label="Cấu trúc (structure, nối các patterns bằng ' / ') *">
              <Input
                required
                value={form.structure}
                onChange={(e) => setForm((p) => ({ ...p, structure: e.target.value }))}
                placeholder="Vている + うちに / Vない + うちに"
                className="font-jp"
              />
            </Field>
          </div>

          <Field label="Ý nghĩa tiếng Việt (meaning) *">
            <Input
              required
              value={form.meaning}
              onChange={(e) => setForm((p) => ({ ...p, meaning: e.target.value }))}
              placeholder="Trong lúc trạng thái đang diễn ra..."
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Giải thích chi tiết (explanation)">
              <Textarea
                rows={3}
                value={form.explanation}
                onChange={(e) => setForm((p) => ({ ...p, explanation: e.target.value }))}
                placeholder="Phân tích ngữ cảnh dùng và sắc thái..."
              />
            </Field>
            <Field label="Lưu ý / Cách chia (notes & usage)">
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Chú ý giới hạn động từ hoặc nhầm lẫn thường gặp..."
              />
            </Field>
          </div>

          {/* Dynamic JP/VI Examples Editor */}
          <div className="rounded-xl border border-line bg-surface-2 p-3.5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-fg">
                  Danh sách ví dụ (<code>examples: Array&lt;&#123; jp, vi &#125;&gt;</code>)
                </div>
                <p className="text-xs text-muted">
                  Thêm hoặc xóa trực tiếp từng cặp câu tiếng Nhật và nghĩa tiếng Việt.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={addExampleRow}>
                <Plus className="h-3.5 w-3.5" />
                Thêm câu ví dụ
              </Button>
            </div>

            <div className="space-y-2.5">
              {form.examples.map((ex, idx) => (
                <div
                  key={idx}
                  className="grid gap-2 rounded-lg border border-line bg-surface p-2.5 md:grid-cols-[1fr_1fr_auto]"
                >
                  <Input
                    value={ex.jp}
                    onChange={(e) => updateExampleRow(idx, { jp: e.target.value })}
                    placeholder={`Câu tiếng Nhật #${idx + 1}`}
                    className="font-jp"
                  />
                  <Input
                    value={ex.vi}
                    onChange={(e) => updateExampleRow(idx, { vi: e.target.value })}
                    placeholder={`Nghĩa tiếng Việt #${idx + 1}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExampleRow(idx)}
                    title="Xóa ví dụ này"
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa mẫu ngữ pháp"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button variant="danger" loading={saving} onClick={() => void confirmDelete()}>
              Xóa ngữ pháp
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg">
          Bạn chắc chắn muốn xóa mẫu ngữ pháp{' '}
          <strong className="font-jp">{deleteTarget?.title}</strong> (<code>{deleteTarget?.id}</code>)?
        </p>
      </Modal>

      {/* Import/Export Modal */}
      <AdminImportExportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityType="grammar"
        snapshot={snapshot}
        actor={actor}
        onCommitted={onRefresh}
        filteredExportData={filtered}
        filteredExportLabel={`Export ${filtered.length} mẫu ngữ pháp đang lọc`}
      />
    </div>
  );
}
