import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { AdminImportExportModal } from '../../components/admin/AdminImportExportModal';
import { AdminPagination } from '../../components/admin/AdminPagination';
import {
  deleteKanjiItem,
  saveKanjiItem,
  type CmsSnapshot,
} from '../../services/adminCmsService';
import type { AuthUser } from '../../store/slices/authSlice';
import type { AdminKanjiExample, AdminKanjiRecord } from '../../types/admin';
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
} from '../../components/ui';

const LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const PAGE_SIZE = 15;
type HanVietStatusFilter = 'all' | 'missing' | 'complete';

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
  examples: AdminKanjiExample[];
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
  examples: [],
});

interface AdminKanjiManagerProps {
  snapshot: CmsSnapshot;
  actor: AuthUser | null;
  onRefresh: () => Promise<void> | void;
}

export function AdminKanjiManager({ snapshot, actor, onRefresh }: AdminKanjiManagerProps) {
  const kanjis = snapshot.kanjis;
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | JLPTLevel>('ALL');
  const [statusFilter, setStatusFilter] = useState<HanVietStatusFilter>('all');
  const [page, setPage] = useState(1);

  const [inlineEdits, setInlineEdits] = useState<Record<string, { hanViet: string; meaning: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<KanjiFormState>(emptyKanjiForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminKanjiRecord | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const missingCount = useMemo(
    () => kanjis.filter((k) => k.hanViet.trim() === '').length,
    [kanjis],
  );
  const completeCount = kanjis.length - missingCount;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return kanjis.filter((k) => {
      if (levelFilter !== 'ALL' && k.jlptLevel !== levelFilter) return false;
      if (statusFilter === 'missing' && k.hanViet.trim() !== '') return false;
      if (statusFilter === 'complete' && k.hanViet.trim() === '') return false;
      if (!q) return true;
      return (
        k.kanji.includes(q) ||
        k.hanViet.toLowerCase().includes(q) ||
        k.meanings.some((m) => m.toLowerCase().includes(q)) ||
        k.onReadings.some((r) => r.toLowerCase().includes(q)) ||
        k.kunReadings.some((r) => r.toLowerCase().includes(q))
      );
    });
  }, [kanjis, search, levelFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const handleInlineSave = async (item: AdminKanjiRecord) => {
    const draft = inlineEdits[item.id];
    if (!draft) return;
    const nextMeanings = draft.meaning
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setSavingId(item.id);
    const res = await saveKanjiItem(
      {
        ...item,
        hanViet: draft.hanViet.trim(),
        meanings: nextMeanings.length > 0 ? nextMeanings : item.meanings,
      },
      actor,
      { isNew: false },
    );
    setSavingId(null);

    if (!res.ok) {
      setBanner({ tone: 'danger', text: res.error ?? 'Cập nhật nhanh thất bại.' });
      return;
    }

    setInlineEdits((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    setBanner({
      tone: 'success',
      text: `Đã lưu Hán Việt cho chữ "${item.kanji}".`,
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
      examples: (item.examples ?? []).map((ex) => ({ ...ex })),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleModalSave = async () => {
    setFormError(null);
    const ch = form.kanji.trim();
    if (!ch) {
      setFormError('Vui lòng nhập ký tự Kanji.');
      return;
    }

    const record: AdminKanjiRecord = {
      id: form.id.trim() || ch,
      kanji: ch,
      hanViet: form.hanViet.trim(),
      meanings: form.meanings.split(',').map((s) => s.trim()).filter(Boolean),
      onReadings: form.onReadings.split(',').map((s) => s.trim()).filter(Boolean),
      kunReadings: form.kunReadings.split(',').map((s) => s.trim()).filter(Boolean),
      strokeCount: Math.max(0, Number(form.strokeCount) || 0),
      jlptLevel: form.jlptLevel,
      examples: form.examples.filter((ex) => ex.word.trim() || ex.meaning.trim()),
    };

    setSaving(true);
    const res = await saveKanjiItem(record, actor, { isNew: !form.isEdit });
    setSaving(false);

    if (!res.ok) {
      setFormError(res.error ?? 'Lưu Kanji thất bại.');
      return;
    }

    setModalOpen(false);
    setBanner({
      tone: 'success',
      text: `${form.isEdit ? 'Đã cập nhật' : 'Đã thêm mới'} chữ Kanji "${ch}".`,
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
      setBanner({ tone: 'danger', text: res.error ?? 'Xóa Kanji thất bại.' });
      return;
    }
    setBanner({ tone: 'success', text: `Đã xóa chữ "${deleteTarget.kanji}".` });
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      {banner && <Notice tone={banner.tone}>{banner.text}</Notice>}

      <Card padding="md" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-fg">
              Chữ Hán (Kanjis) — {filtered.length} chữ
            </h2>
            <Chip
              selected={statusFilter === 'all'}
              onClick={() => {
                setStatusFilter('all');
                setPage(1);
              }}
            >
              Tất cả ({kanjis.length})
            </Chip>
            <Chip
              selected={statusFilter === 'missing'}
              onClick={() => {
                setStatusFilter('missing');
                setPage(1);
              }}
            >
              ⚠️ Chưa có âm Hán Việt ({missingCount})
            </Chip>
            <Chip
              selected={statusFilter === 'complete'}
              onClick={() => {
                setStatusFilter('complete');
                setPage(1);
              }}
            >
              ✅ Đã đủ Hán Việt ({completeCount})
            </Chip>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Upload className="size-4" aria-hidden />}
              onClick={() => setImportOpen(true)}
            >
              Import / Export ({filtered.length})
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value as 'ALL' | JLPTLevel);
              setPage(1);
            }}
            aria-label="Lọc cấp độ Kanji"
          >
            <option value="ALL">Tất cả cấp độ</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                JLPT {l}
              </option>
            ))}
          </Select>
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Tìm Kanji, âm On/Kun, Hán Việt, nghĩa..."
            className="sm:col-span-2"
          />
        </div>
      </Card>

      {paginated.length === 0 ? (
        <EmptyState title="Không tìm thấy chữ Kanji" description="Thử đổi bộ lọc." />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Kanji / Cấp độ</th>
                  <th className="px-4 py-3 font-semibold">Sửa nhanh Âm Hán Việt (Enter để lưu)</th>
                  <th className="px-4 py-3 font-semibold">Nghĩa (nhập nhanh, phẩy)</th>
                  <th className="px-4 py-3 font-semibold">On / Kun / Ví dụ</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paginated.map((item) => {
                  const draft = inlineEdits[item.id];
                  const valHv = draft?.hanViet ?? item.hanViet;
                  const valMeanings = draft?.meaning ?? item.meanings.join(', ');
                  const isMissing = valHv.trim() === '';
                  const dirty =
                    Boolean(draft) &&
                    (draft.hanViet !== item.hanViet || draft.meaning !== item.meanings.join(', '));

                  return (
                    <tr
                      key={item.id}
                      className={
                        isMissing
                          ? 'bg-warning-soft/35 transition-colors'
                          : 'transition-colors hover:bg-surface-2/60'
                      }
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span
                            lang="ja"
                            className="grid size-10 place-items-center rounded-xl bg-primary-soft text-xl font-bold text-primary-fg"
                          >
                            {item.kanji}
                          </span>
                          <div>
                            <Badge tone="primary">{item.jlptLevel}</Badge>
                            <p className="mt-1 text-xs text-muted tabular">{item.strokeCount} nét</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={valHv}
                          placeholder="⚠️ Nhập Hán Việt..."
                          className={
                            isMissing ? 'h-8 min-w-36 border-warning-line bg-warning-soft/50' : 'h-8 min-w-36'
                          }
                          aria-label={`Âm Hán Việt cho ${item.kanji}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && dirty) {
                              e.preventDefault();
                              void handleInlineSave(item);
                            }
                          }}
                          onChange={(e) =>
                            setInlineEdits((prev) => ({
                              ...prev,
                              [item.id]: {
                                hanViet: e.target.value,
                                meaning: prev[item.id]?.meaning ?? item.meanings.join(', '),
                              },
                            }))
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={valMeanings}
                          className="h-8 min-w-44"
                          aria-label={`Nghĩa cho ${item.kanji}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && dirty) {
                              e.preventDefault();
                              void handleInlineSave(item);
                            }
                          }}
                          onChange={(e) =>
                            setInlineEdits((prev) => ({
                              ...prev,
                              [item.id]: {
                                hanViet: prev[item.id]?.hanViet ?? item.hanViet,
                                meaning: e.target.value,
                              },
                            }))
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">
                        <p lang="ja">On: {item.onReadings.join('・') || '—'}</p>
                        <p lang="ja">Kun: {item.kunReadings.join('・') || '—'}</p>
                        <p className="text-primary-fg">{item.examples.length} ví dụ</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {dirty && (
                            <Button
                              variant="primary"
                              size="sm"
                              loading={savingId === item.id}
                              leftIcon={<Check className="size-3.5" aria-hidden />}
                              onClick={() => void handleInlineSave(item)}
                            >
                              Lưu
                            </Button>
                          )}
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Pencil className="size-3.5" aria-hidden />}
                            onClick={() => openEditModal(item)}
                          >
                            Sửa
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            leftIcon={<Trash2 className="size-3.5" aria-hidden />}
                            onClick={() => setDeleteTarget(item)}
                          >
                            Xóa
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination
            page={safePage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.isEdit ? `Chỉnh sửa Kanji "${form.kanji}"` : 'Thêm Kanji mới'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void handleModalSave()}>
              Lưu Kanji
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {formError && <Notice tone="danger">{formError}</Notice>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Chữ Kanji (character / id) *">
              <Input
                required
                value={form.kanji}
                disabled={form.isEdit}
                onChange={(e) => setForm((f) => ({ ...f, kanji: e.target.value, id: e.target.value }))}
              />
            </Field>
            <Field label="Âm Hán Việt (han_viet)">
              <Input
                value={form.hanViet}
                placeholder="NAM"
                onChange={(e) => setForm((f) => ({ ...f, hanViet: e.target.value }))}
              />
            </Field>
            <Field label="Cấp độ (jlpt_level)">
              <Select
                value={form.jlptLevel}
                onChange={(e) => setForm((f) => ({ ...f, jlptLevel: e.target.value as JLPTLevel }))}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Nghĩa (meanings — phân cách dấu phẩy)">
            <Input
              value={form.meanings}
              onChange={(e) => setForm((f) => ({ ...f, meanings: e.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Âm On (onyomi — phẩy)">
              <Input
                value={form.onReadings}
                onChange={(e) => setForm((f) => ({ ...f, onReadings: e.target.value }))}
              />
            </Field>
            <Field label="Âm Kun (kunyomi — phẩy)">
              <Input
                value={form.kunReadings}
                onChange={(e) => setForm((f) => ({ ...f, kunReadings: e.target.value }))}
              />
            </Field>
            <Field label="Số nét (stroke_count)">
              <Input
                type="number"
                min={0}
                value={form.strokeCount}
                onChange={(e) => setForm((f) => ({ ...f, strokeCount: e.target.value }))}
              />
            </Field>
          </div>

          <div className="space-y-2 rounded-xl border border-line bg-surface-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-fg">
                Danh sách từ vựng ví dụ (JSONB examples: [{`vocabularyId, word, hiragana, meaning`}])
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="size-3.5" aria-hidden />}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    examples: [...f.examples, { vocabularyId: '', word: '', hiragana: '', meaning: '' }],
                  }))
                }
              >
                Thêm ví dụ
              </Button>
            </div>
            {form.examples.length === 0 ? (
              <p className="text-xs text-muted">Chưa có ví dụ nào.</p>
            ) : (
              <div className="space-y-2">
                {form.examples.map((ex, idx) => (
                  <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                    <Input
                      className="sm:col-span-2"
                      placeholder="vocabId"
                      value={String(ex.vocabularyId)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          examples: f.examples.map((item, i) =>
                            i === idx ? { ...item, vocabularyId: e.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <Input
                      className="sm:col-span-3"
                      placeholder="Từ (男性)"
                      value={ex.word}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          examples: f.examples.map((item, i) =>
                            i === idx ? { ...item, word: e.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <Input
                      className="sm:col-span-3"
                      placeholder="Hiragana"
                      value={ex.hiragana}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          examples: f.examples.map((item, i) =>
                            i === idx ? { ...item, hiragana: e.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <Input
                      className="sm:col-span-3"
                      placeholder="Nghĩa"
                      value={ex.meaning}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          examples: f.examples.map((item, i) =>
                            i === idx ? { ...item, meaning: e.target.value } : item,
                          ),
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      aria-label="Xóa ví dụ"
                      className="sm:col-span-1"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          examples: f.examples.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa Kanji"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button variant="danger" loading={saving} onClick={() => void handleConfirmDelete()}>
              Xác nhận xóa
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Xóa chữ Kanji <strong className="text-fg">{deleteTarget?.kanji}</strong>?
        </p>
      </Modal>

      <AdminImportExportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityType="kanji"
        snapshot={snapshot}
        actor={actor}
        onCommitted={onRefresh}
        filteredExportData={filtered}
        filteredExportLabel={`Xuất ${filtered.length} Kanji đang lọc`}
      />
    </div>
  );
}
