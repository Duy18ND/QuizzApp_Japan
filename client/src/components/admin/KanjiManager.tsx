import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import {
  deleteKanjiItem,
  saveKanjiItem,
  type CmsSnapshot,
} from '../../services/adminCmsService';
import type { AdminKanjiRecord } from '../../types/admin';
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
} from '../ui';
import { AdminImportExportModal } from './AdminImportExportModal';
import { AdminPagination } from './AdminPagination';

const LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const PAGE_SIZE = 15;

interface KanjiFormState {
  isEdit: boolean;
  id: string;
  kanji: string;
  hanViet: string;
  meanings: string;
  onReadings: string;
  kunReadings: string;
  strokeCount: string;
  jlptLevel: JLPTLevel;
}

const emptyKanjiForm = (): KanjiFormState => ({
  isEdit: false,
  id: '',
  kanji: '',
  hanViet: '',
  meanings: '',
  onReadings: '',
  kunReadings: '',
  strokeCount: '0',
  jlptLevel: 'N3',
});

interface KanjiManagerProps {
  kanjis: AdminKanjiRecord[];
  actor: AuthUser | null;
  snapshot: CmsSnapshot;
  onRefresh: () => Promise<void> | void;
}

export function KanjiManager({ kanjis, actor, snapshot, onRefresh }: KanjiManagerProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | JLPTLevel>('ALL');
  const [missingViOnly, setMissingViOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [inlineEdits, setInlineEdits] = useState<Record<string, { hanViet: string; meaning: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<KanjiFormState>(emptyKanjiForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminKanjiRecord | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const missingViCount = useMemo(
    () => kanjis.filter((k) => k.hanViet.trim() === '').length,
    [kanjis],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return kanjis.filter((k) => {
      if (levelFilter !== 'ALL' && k.jlptLevel !== levelFilter) return false;
      if (missingViOnly && k.hanViet.trim() !== '') return false;
      if (!q) return true;
      return (
        k.kanji.includes(q) ||
        k.hanViet.toLowerCase().includes(q) ||
        k.meanings.some((m) => m.toLowerCase().includes(q)) ||
        k.onReadings.some((r) => r.toLowerCase().includes(q)) ||
        k.kunReadings.some((r) => r.toLowerCase().includes(q))
      );
    });
  }, [kanjis, search, levelFilter, missingViOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const handleInlineSave = async (item: AdminKanjiRecord) => {
    const draft = inlineEdits[item.id];
    if (!draft) return;
    const nextHanViet = draft.hanViet.trim();
    const nextMeanings = draft.meaning
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setSavingId(item.id);
    const res = await saveKanjiItem(
      {
        ...item,
        hanViet: nextHanViet,
        meanings: nextMeanings.length > 0 ? nextMeanings : item.meanings,
      },
      actor,
      { isNew: false },
    );
    setSavingId(null);

    if (!res.ok) {
      setFeedbackBanner({ tone: 'danger', text: res.error ?? 'Cập nhật thất bại.' });
      return;
    }

    setInlineEdits((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    setFeedbackBanner({
      tone: 'success',
      text: `Đã cập nhật nhanh Hán Việt cho chữ "${item.kanji}".`,
    });
    await onRefresh();
  };

  const openCreateModal = () => {
    setForm(emptyKanjiForm());
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: AdminKanjiRecord) => {
    setForm({
      isEdit: true,
      id: item.id,
      kanji: item.kanji,
      hanViet: item.hanViet,
      meanings: item.meanings.join(', '),
      onReadings: item.onReadings.join(', '),
      kunReadings: item.kunReadings.join(', '),
      strokeCount: String(item.strokeCount),
      jlptLevel: item.jlptLevel,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveModal = async () => {
    setFormError(null);
    const char = form.kanji.trim();
    if (!char) {
      setFormError('Vui lòng nhập ký tự Kanji.');
      return;
    }

    const meanings = form.meanings
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const hanViet = form.hanViet.trim();
    if (meanings.length === 0 && !hanViet) {
      setFormError('Vui lòng nhập ít nhất Nghĩa hoặc âm Hán Việt.');
      return;
    }

    const strokeCount = Math.max(0, Math.round(Number(form.strokeCount) || 0));
    const record: AdminKanjiRecord = {
      id: form.id.trim() || char,
      kanji: char,
      hanViet,
      meanings: meanings.length > 0 ? meanings : [hanViet],
      onReadings: form.onReadings
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      kunReadings: form.kunReadings
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      strokeCount,
      jlptLevel: form.jlptLevel,
      examples: form.isEdit
        ? kanjis.find((k) => k.id === form.id)?.examples ?? []
        : [],
    };

    setSaving(true);
    const res = await saveKanjiItem(record, actor, { isNew: !form.isEdit });
    setSaving(false);

    if (!res.ok) {
      setFormError(res.error ?? 'Không thể lưu Kanji.');
      return;
    }

    setModalOpen(false);
    setFeedbackBanner({
      tone: 'success',
      text: `${form.isEdit ? 'Đã cập nhật' : 'Đã thêm'} Kanji "${record.kanji}".`,
    });
    await onRefresh();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const res = await deleteKanjiItem(deleteTarget.id, actor);
    setSaving(false);
    setDeleteTarget(null);
    if (!res.ok) {
      setFeedbackBanner({ tone: 'danger', text: res.error ?? 'Xóa thất bại.' });
      return;
    }
    setFeedbackBanner({ tone: 'success', text: `Đã xóa Kanji "${deleteTarget.kanji}".` });
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      {feedbackBanner && <Notice tone={feedbackBanner.tone}>{feedbackBanner.text}</Notice>}

      <Card padding="md" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Tìm Kanji, Hán Việt, Âm On/Kun, Nghĩa..."
              className="w-full sm:w-64"
            />
            <Select
              aria-label="Lọc cấp độ Kanji"
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
            <Chip
              selected={missingViOnly}
              onClick={() => {
                setMissingViOnly((v) => !v);
                setPage(1);
              }}
            >
              Thiếu Hán Việt ({missingViCount})
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
              onClick={openCreateModal}
            >
              Thêm Kanji
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted">
          Hiển thị <strong className="tabular text-fg">{filtered.length}</strong> /{' '}
          <span className="tabular">{kanjis.length}</span> chữ Kanji. Có thể sửa nhanh Hán Việt &amp; nghĩa ngay trên bảng.
        </p>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="Không tìm thấy chữ Kanji phù hợp"
          description="Thử tắt bộ lọc 'Thiếu Hán Việt' hoặc đổi từ khóa."
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs text-muted uppercase">
                <tr>
                  <th className="w-20 px-4 py-3 font-semibold">Kanji</th>
                  <th className="w-48 px-4 py-3 font-semibold">Hán Việt (sửa nhanh)</th>
                  <th className="px-4 py-3 font-semibold">Nghĩa (phân tách dấu phẩy)</th>
                  <th className="px-4 py-3 font-semibold">On / Kun &amp; Cấp</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paginated.map((item) => {
                  const draft = inlineEdits[item.id] ?? {
                    hanViet: item.hanViet,
                    meaning: item.meanings.join(', '),
                  };
                  const isDirty =
                    draft.hanViet !== item.hanViet || draft.meaning !== item.meanings.join(', ');

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-glass-soft">
                      <td className="px-4 py-3">
                        <span lang="ja" className="text-2xl font-bold text-fg">
                          {item.kanji}
                        </span>
                        {item.hanViet === '' && (
                          <div className="mt-1">
                            <Badge tone="warning" className="text-[10px]">
                              Thiếu HV
                            </Badge>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          aria-label={`Hán Việt cho ${item.kanji}`}
                          value={draft.hanViet}
                          placeholder="NHẬT..."
                          className="h-8 text-xs"
                          onChange={(e) =>
                            setInlineEdits((prev) => ({
                              ...prev,
                              [item.id]: { ...draft, hanViet: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="min-w-48 px-4 py-3">
                        <Input
                          aria-label={`Nghĩa cho ${item.kanji}`}
                          value={draft.meaning}
                          placeholder="Mặt trời, ngày..."
                          className="h-8 text-xs"
                          onChange={(e) =>
                            setInlineEdits((prev) => ({
                              ...prev,
                              [item.id]: { ...draft, meaning: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge tone="primary">{item.jlptLevel}</Badge>
                          <span className="text-muted">
                            {item.strokeCount > 0 ? `${item.strokeCount} nét` : ''}
                          </span>
                        </div>
                        <p lang="ja" className="mt-1 truncate text-muted">
                          On: {item.onReadings.join('・') || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {isDirty && (
                            <Button
                              variant="primary"
                              size="sm"
                              loading={savingId === item.id}
                              aria-label={`Lưu nhanh ${item.kanji}`}
                              onClick={() => void handleInlineSave(item)}
                            >
                              <Check className="size-3.5" aria-hidden />
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-label={`Sửa chi tiết ${item.kanji}`}
                            onClick={() => openEditModal(item)}
                          >
                            <Pencil className="size-3.5" aria-hidden />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            aria-label={`Xóa Kanji ${item.kanji}`}
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <AdminPagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
        </Card>
      )}

      {/* Create / Edit Kanji Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        title={form.isEdit ? `Chỉnh sửa Kanji ${form.kanji}` : 'Thêm Kanji mới'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void handleSaveModal()}>
              {form.isEdit ? 'Lưu thay đổi' : 'Tạo Kanji'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {formError && <Notice tone="danger">{formError}</Notice>}
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Ký tự Kanji *" htmlFor="kanji-char">
              <Input
                id="kanji-char"
                lang="ja"
                value={form.kanji}
                onChange={(e) => setForm({ ...form, kanji: e.target.value })}
                placeholder="希"
                disabled={form.isEdit}
              />
            </Field>
            <Field label="Âm Hán Việt" htmlFor="kanji-hanviet">
              <Input
                id="kanji-hanviet"
                value={form.hanViet}
                onChange={(e) => setForm({ ...form, hanViet: e.target.value })}
                placeholder="HI"
              />
            </Field>
            <Field label="Cấp độ JLPT" htmlFor="kanji-level">
              <Select
                id="kanji-level"
                value={form.jlptLevel}
                onChange={(e) => setForm({ ...form, jlptLevel: e.target.value as JLPTLevel })}
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Nghĩa (cách nhau bởi dấu phẩy)" htmlFor="kanji-meanings">
            <Input
              id="kanji-meanings"
              value={form.meanings}
              onChange={(e) => setForm({ ...form, meanings: e.target.value })}
              placeholder="Hy vọng, Hiếm"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Onyomi (phẩy)" htmlFor="kanji-on">
              <Input
                id="kanji-on"
                lang="ja"
                value={form.onReadings}
                onChange={(e) => setForm({ ...form, onReadings: e.target.value })}
                placeholder="キ"
              />
            </Field>
            <Field label="Kunyomi (phẩy)" htmlFor="kanji-kun">
              <Input
                id="kanji-kun"
                lang="ja"
                value={form.kunReadings}
                onChange={(e) => setForm({ ...form, kunReadings: e.target.value })}
                placeholder="まれ"
              />
            </Field>
            <Field label="Số nét" htmlFor="kanji-strokes">
              <Input
                id="kanji-strokes"
                type="number"
                min={0}
                value={form.strokeCount}
                onChange={(e) => setForm({ ...form, strokeCount: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title="Xác nhận xóa Kanji"
        description={`Bạn có chắc chắn muốn xóa Kanji "${deleteTarget?.kanji}"?`}
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
          key="kanji"
          open={importOpen}
          onClose={() => setImportOpen(false)}
          entityType="kanji"
          snapshot={snapshot}
          actor={actor}
          onCommitted={onRefresh}
          filteredExportData={filtered}
          filteredExportLabel={`Xuất bộ lọc (${filtered.length})`}
        />
      )}
    </div>
  );
}
