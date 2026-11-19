import { useMemo, useState } from 'react';
import { Layers, Pencil, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import { AdminImportExportModal } from '../../components/admin/AdminImportExportModal';
import { AdminPagination } from '../../components/admin/AdminPagination';
import {
  bulkDeleteVocabItems,
  bulkUpdateVocabItems,
  deleteVocabItem,
  saveVocabItem,
  type CmsSnapshot,
} from '../../services/adminCmsService';
import { parseDbUnitNumber, toDbUnitId } from '../../services/migrationService';
import type { AuthUser } from '../../store/slices/authSlice';
import type { AdminVocabRecord } from '../../types/admin';
import type { JLPTLevel } from '../../types/quiz';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Modal,
  Notice,
  SearchInput,
  Select,
  Textarea,
} from '../../components/ui';

const LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const WORD_TYPE_FILTERS = [
  'Tất cả',
  'Danh từ',
  'Động từ',
  'Tính từ -na',
  'Tính từ đuôi i',
  'Tính từ -i',
  'Phó từ',
  'Liên từ',
  'Cụm từ',
] as const;
const PAGE_SIZE = 15;

interface VocabFormState {
  id?: number;
  level: JLPTLevel;
  dbUnitId: string;
  wordNumber: string;
  kanji: string;
  hiragana: string;
  hanViet: string;
  meaning: string;
  wordType: string;
  exampleSentence: string;
  exampleMeaning: string;
  notes: string;
  tagsText: string;
  semanticRolesText: string;
}

const emptyForm = (defaultLevel: JLPTLevel, defaultDbUnitId: string): VocabFormState => ({
  level: defaultLevel,
  dbUnitId: defaultDbUnitId,
  wordNumber: '',
  kanji: '',
  hiragana: '',
  hanViet: '',
  meaning: '',
  wordType: 'Danh từ',
  exampleSentence: '',
  exampleMeaning: '',
  notes: '',
  tagsText: '',
  semanticRolesText: '',
});

const parseCsvTags = (raw: string): string[] =>
  raw
    .split(/[,|;]/)
    .map((s) => s.trim())
    .filter(Boolean);

interface AdminVocabManagerProps {
  snapshot: CmsSnapshot;
  actor: AuthUser | null;
  onRefresh: () => Promise<void> | void;
  initialFilter?: { level?: JLPTLevel; dbUnitId?: string; nonce?: number } | null;
}

export function AdminVocabManager({
  snapshot,
  actor,
  onRefresh,
  initialFilter,
}: AdminVocabManagerProps) {
  const [levelFilter, setLevelFilter] = useState<'ALL' | JLPTLevel>(initialFilter?.level ?? 'ALL');
  const [unitFilter, setUnitFilter] = useState<'ALL' | string>(initialFilter?.dbUnitId ?? 'ALL');
  const [wordTypeFilter, setWordTypeFilter] = useState<string>('Tất cả');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkUnitId, setBulkUnitId] = useState('');
  const [bulkWordType, setBulkWordType] = useState('');
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<VocabFormState>(() =>
    emptyForm('N3', snapshot.units[0]?.id ?? toDbUnitId('N3', 1)),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminVocabRecord | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const unitDropdownList = useMemo(() => {
    const units = snapshot.units.filter((u) => levelFilter === 'ALL' || u.level === levelFilter);
    return [...units].sort((a, b) => a.orderIndex - b.orderIndex || a.unitNumber - b.unitNumber);
  }, [snapshot.units, levelFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return snapshot.vocabularies.filter((v) => {
      if (levelFilter !== 'ALL' && v.level !== levelFilter) return false;
      const vDbUnit = v.dbUnitId || toDbUnitId(v.level, v.unitId);
      if (unitFilter !== 'ALL') {
        const targetNum = parseDbUnitNumber(unitFilter);
        if (vDbUnit !== unitFilter && !(v.unitId === targetNum && v.level === (levelFilter === 'ALL' ? v.level : levelFilter))) {
          return false;
        }
      }
      if (wordTypeFilter !== 'Tất cả' && v.wordType !== wordTypeFilter) return false;
      if (!q) return true;
      return (
        (v.kanji ?? '').toLowerCase().includes(q) ||
        v.hiragana.toLowerCase().includes(q) ||
        (v.hanViet ?? '').toLowerCase().includes(q) ||
        v.meaning.toLowerCase().includes(q)
      );
    });
  }, [snapshot.vocabularies, levelFilter, unitFilter, wordTypeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allPageSelected =
    paginated.length > 0 && paginated.every((item) => selectedSet.has(item.id));

  const toggleSelectAllOnPage = (checked: boolean) => {
    if (checked) {
      const merged = new Set([...selectedIds, ...paginated.map((item) => item.id)]);
      setSelectedIds(Array.from(merged));
    } else {
      const pageIdSet = new Set(paginated.map((item) => item.id));
      setSelectedIds(selectedIds.filter((id) => !pageIdSet.has(id)));
    }
  };

  const toggleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((item) => item !== id),
    );
  };

  const openCreateModal = () => {
    const fallbackLevel: JLPTLevel = levelFilter === 'ALL' ? 'N3' : levelFilter;
    const preferredUnit =
      snapshot.units.find((u) => u.level === fallbackLevel && u.unitNumber === 1) ??
      snapshot.units.find((u) => u.level === fallbackLevel) ??
      unitDropdownList[0];
    const fallbackUnit =
      unitFilter !== 'ALL'
        ? unitFilter
        : preferredUnit?.id ?? toDbUnitId(fallbackLevel, 1);
    setForm(emptyForm(fallbackLevel, fallbackUnit));
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: AdminVocabRecord) => {
    setForm({
      id: item.id,
      level: item.level,
      dbUnitId: item.dbUnitId || toDbUnitId(item.level, item.unitId),
      wordNumber: String(item.wordNumber ?? ''),
      kanji: item.kanji ?? '',
      hiragana: item.hiragana,
      hanViet: item.hanViet ?? '',
      meaning: item.meaning,
      wordType: item.wordType,
      exampleSentence: item.exampleSentence ?? '',
      exampleMeaning: item.exampleMeaning ?? '',
      notes: item.notes ?? '',
      tagsText: (item.tags ?? []).join(', '),
      semanticRolesText: (item.semanticRoles ?? []).join(', '),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    const hiragana = form.hiragana.trim();
    const meaning = form.meaning.trim();
    if (!hiragana) {
      setFormError('Vui lòng nhập cách đọc Hiragana.');
      return;
    }
    if (!meaning) {
      setFormError('Vui lòng nhập nghĩa tiếng Việt.');
      return;
    }

    const selectedUnit = snapshot.units.find((u) => u.id === form.dbUnitId);
    const unitNum = selectedUnit?.unitNumber ?? parseDbUnitNumber(form.dbUnitId);
    const wordNumParsed = Number(form.wordNumber);
    const isNew = typeof form.id !== 'number';
    const nextId = isNew
      ? Math.max(131, ...snapshot.vocabularies.map((v) => v.id)) + 1
      : form.id!;

    setSaving(true);
    const res = await saveVocabItem(
      {
        id: nextId,
        unitId: unitNum,
        dbUnitId: form.dbUnitId,
        level: selectedUnit?.level ?? form.level,
        wordNumber: Number.isInteger(wordNumParsed) && wordNumParsed > 0 ? wordNumParsed : nextId,
        kanji: form.kanji.trim() || null,
        hiragana,
        hanViet: form.hanViet.trim() || null,
        meaning,
        wordType: form.wordType,
        exampleSentence: form.exampleSentence.trim() || null,
        exampleMeaning: form.exampleMeaning.trim() || null,
        notes: form.notes.trim() || null,
        tags: parseCsvTags(form.tagsText),
        semanticRoles: parseCsvTags(form.semanticRolesText),
      },
      actor,
      { isNew },
    );
    setSaving(false);

    if (!res.ok) {
      setFormError(res.error ?? 'Lưu từ vựng thất bại.');
      return;
    }

    setModalOpen(false);
    setBanner({
      tone: 'success',
      text: `${isNew ? 'Đã thêm từ mới' : 'Đã cập nhật'}: "${form.kanji.trim() || hiragana}".`,
    });
    await onRefresh();
  };

  const handleSingleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const res = await deleteVocabItem(deleteTarget.id, actor);
    setSaving(false);
    setDeleteTarget(null);
    if (!res.ok) {
      setBanner({ tone: 'danger', text: res.error ?? 'Xóa từ vựng thất bại.' });
      return;
    }
    setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
    setBanner({ tone: 'success', text: `Đã xóa từ "${deleteTarget.kanji || deleteTarget.hiragana}".` });
    await onRefresh();
  };

  const handleBulkDelete = async () => {
    setSaving(true);
    const res = await bulkDeleteVocabItems(selectedIds, actor);
    setSaving(false);
    setBulkConfirmOpen(false);
    if (!res.ok) {
      setBanner({ tone: 'danger', text: res.error ?? 'Xóa hàng loạt thất bại.' });
      return;
    }
    setSelectedIds([]);
    setBanner({ tone: 'success', text: `Đã xóa ${res.count} từ vựng được chọn.` });
    await onRefresh();
  };

  const handleBulkApplyPatch = async () => {
    if (!bulkUnitId && !bulkWordType) return;
    const targetItems = snapshot.vocabularies.filter((v) => selectedSet.has(v.id));
    if (targetItems.length === 0) return;

    const unitObj = bulkUnitId ? snapshot.units.find((u) => u.id === bulkUnitId) : undefined;
    setSaving(true);
    const res = await bulkUpdateVocabItems(
      targetItems,
      {
        ...(bulkUnitId
          ? {
              dbUnitId: bulkUnitId,
              unitId: unitObj?.unitNumber ?? parseDbUnitNumber(bulkUnitId),
              level: unitObj?.level,
            }
          : {}),
        ...(bulkWordType ? { wordType: bulkWordType } : {}),
      },
      actor,
    );
    setSaving(false);
    if (!res.ok) {
      setBanner({ tone: 'danger', text: res.error ?? 'Cập nhật hàng loạt thất bại.' });
      return;
    }
    setSelectedIds([]);
    setBulkUnitId('');
    setBulkWordType('');
    setBanner({ tone: 'success', text: `Đã cập nhật hàng loạt ${res.count} từ vựng.` });
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      {banner && <Notice tone={banner.tone}>{banner.text}</Notice>}

      <Card padding="md" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-fg">
              Từ vựng (Vocabularies) — {filtered.length} bản ghi
            </h2>
            {unitFilter !== 'ALL' && <Badge tone="primary">{unitFilter}</Badge>}
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
              Thêm từ vựng
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value as 'ALL' | JLPTLevel);
              setUnitFilter('ALL');
              setPage(1);
            }}
            aria-label="Lọc theo cấp độ"
          >
            <option value="ALL">Tất cả cấp độ</option>
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                JLPT {lvl}
              </option>
            ))}
          </Select>

          <Select
            value={unitFilter}
            onChange={(e) => {
              setUnitFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Lọc theo Unit"
          >
            <option value="ALL">Tất cả Unit ({unitDropdownList.length})</option>
            {unitDropdownList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.id} — {u.title}
              </option>
            ))}
          </Select>

          <Select
            value={wordTypeFilter}
            onChange={(e) => {
              setWordTypeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Lọc theo từ loại"
          >
            {WORD_TYPE_FILTERS.map((wt) => (
              <option key={wt} value={wt}>
                Từ loại: {wt}
              </option>
            ))}
          </Select>

          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Tìm Kanji, Hiragana, Hán Việt, nghĩa..."
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary bg-primary-soft px-3 py-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary-fg">
              <Layers className="size-4" aria-hidden />
              <span>Đã chọn {selectedIds.length} từ vựng</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={bulkUnitId}
                onChange={(e) => setBulkUnitId(e.target.value)}
                className="h-8 w-44 text-xs"
                aria-label="Chuyển sang Unit"
              >
                <option value="">Đổi sang Unit...</option>
                {snapshot.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id} ({u.level})
                  </option>
                ))}
              </Select>
              <Select
                value={bulkWordType}
                onChange={(e) => setBulkWordType(e.target.value)}
                className="h-8 w-36 text-xs"
                aria-label="Đổi từ loại"
              >
                <option value="">Đổi từ loại...</option>
                {WORD_TYPE_FILTERS.filter((w) => w !== 'Tất cả').map((wt) => (
                  <option key={wt} value={wt}>
                    {wt}
                  </option>
                ))}
              </Select>
              <Button
                variant="primary"
                size="sm"
                loading={saving}
                disabled={!bulkUnitId && !bulkWordType}
                onClick={() => void handleBulkApplyPatch()}
              >
                Áp dụng
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setBulkConfirmOpen(true)}
              >
                Xóa đã chọn
              </Button>
            </div>
          </div>
        )}
      </Card>

      {paginated.length === 0 ? (
        <EmptyState title="Không tìm thấy từ vựng" description="Thử thay đổi bộ lọc hoặc thêm từ mới." />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs text-muted uppercase">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <Checkbox
                      label=""
                      aria-label="Chọn tất cả trang này"
                      checked={allPageSelected}
                      onChange={toggleSelectAllOnPage}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">ID / Unit</th>
                  <th className="px-4 py-3 font-semibold">Kanji / Hiragana</th>
                  <th className="px-4 py-3 font-semibold">Hán Việt &amp; Nghĩa</th>
                  <th className="px-4 py-3 font-semibold">Loại &amp; Engine Tags</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paginated.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="px-3 py-3">
                      <Checkbox
                        label=""
                        aria-label={`Chọn ${item.hiragana}`}
                        checked={selectedSet.has(item.id)}
                        onChange={(checked) => toggleSelectOne(item.id, checked)}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs text-muted">#{item.id}</span>
                      <div className="mt-1 flex items-center gap-1">
                        <Badge tone="primary">{item.level}</Badge>
                        <Badge tone="neutral">{item.dbUnitId || toDbUnitId(item.level, item.unitId)}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p lang="ja" className="text-base font-bold text-fg">
                        {item.kanji || item.hiragana}
                      </p>
                      <p lang="ja" className="text-xs text-muted">
                        {item.hiragana}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {item.hanViet && (
                        <p className="text-xs font-semibold text-primary-fg">{item.hanViet}</p>
                      )}
                      <p className="text-sm text-fg">{item.meaning}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{item.wordType}</Badge>
                      {((item.tags?.length ?? 0) > 0 || (item.semanticRoles?.length ?? 0) > 0) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(item.tags ?? []).map((t) => (
                            <Badge key={`t-${t}`} tone="sakura">
                              #{t}
                            </Badge>
                          ))}
                          {(item.semanticRoles ?? []).map((r) => (
                            <Badge key={`r-${r}`} tone="success">
                              role:{r}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
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
                ))}
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
        title={form.id ? `Chỉnh sửa từ #${form.id}` : 'Thêm từ vựng mới (Variant A + B)'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void handleSave()}>
              Lưu từ vựng
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {formError && <Notice tone="danger">{formError}</Notice>}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Thuộc Unit (unit_id)">
              <Select
                value={form.dbUnitId}
                onChange={(e) => {
                  const unit = snapshot.units.find((u) => u.id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    dbUnitId: e.target.value,
                    level: unit?.level ?? f.level,
                  }));
                }}
              >
                {snapshot.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id} — {u.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cấp độ (level)">
              <Select
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as JLPTLevel }))}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="STT trong bài (word_number)">
              <Input
                type="number"
                min={1}
                value={form.wordNumber}
                onChange={(e) => setForm((f) => ({ ...f, wordNumber: e.target.value }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Kanji">
              <Input
                value={form.kanji}
                placeholder="男性"
                onChange={(e) => setForm((f) => ({ ...f, kanji: e.target.value }))}
              />
            </Field>
            <Field label="Hiragana *">
              <Input
                required
                value={form.hiragana}
                placeholder="だんせい"
                onChange={(e) => setForm((f) => ({ ...f, hiragana: e.target.value }))}
              />
            </Field>
            <Field label="Âm Hán Việt (han_viet)">
              <div className="flex gap-1.5">
                <Input
                  value={form.hanViet}
                  placeholder="NAM TÍNH"
                  onChange={(e) => setForm((f) => ({ ...f, hanViet: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  title="Viết hoa toàn bộ"
                  onClick={() => setForm((f) => ({ ...f, hanViet: f.hanViet.toUpperCase() }))}
                >
                  <Sparkles className="size-3.5" aria-hidden />
                </Button>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Nghĩa tiếng Việt *" className="sm:col-span-2">
              <Input
                required
                value={form.meaning}
                placeholder="đàn ông, nam giới"
                onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))}
              />
            </Field>
            <Field label="Từ loại (word_type)">
              <Select
                value={form.wordType}
                onChange={(e) => setForm((f) => ({ ...f, wordType: e.target.value }))}
              >
                {WORD_TYPE_FILTERS.filter((wt) => wt !== 'Tất cả').map((wt) => (
                  <option key={wt} value={wt}>
                    {wt}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Câu ví dụ (example_sentence)">
              <Input
                value={form.exampleSentence}
                onChange={(e) => setForm((f) => ({ ...f, exampleSentence: e.target.value }))}
              />
            </Field>
            <Field label="Nghĩa ví dụ (example_meaning)">
              <Input
                value={form.exampleMeaning}
                onChange={(e) => setForm((f) => ({ ...f, exampleMeaning: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="Ghi chú (notes)">
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface-2 p-3 sm:grid-cols-2">
            <Field label="Variant B · Tags (phân cách bằng dấu phẩy)">
              <Input
                value={form.tagsText}
                placeholder="food, task, restaurant"
                onChange={(e) => setForm((f) => ({ ...f, tagsText: e.target.value }))}
              />
            </Field>
            <Field label="Variant B · Semantic Roles (phân cách dấu phẩy)">
              <Input
                value={form.semanticRolesText}
                placeholder="task, free_time"
                onChange={(e) => setForm((f) => ({ ...f, semanticRolesText: e.target.value }))}
              />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa từ vựng"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button variant="danger" loading={saving} onClick={() => void handleSingleDelete()}>
              Xác nhận xóa
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Xóa từ <strong className="text-fg">{deleteTarget?.kanji || deleteTarget?.hiragana}</strong> (
          {deleteTarget?.meaning})?
        </p>
      </Modal>

      <Modal
        open={bulkConfirmOpen}
        onClose={() => setBulkConfirmOpen(false)}
        title="Xóa hàng loạt từ vựng"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBulkConfirmOpen(false)}>
              Hủy
            </Button>
            <Button variant="danger" loading={saving} onClick={() => void handleBulkDelete()}>
              Xóa {selectedIds.length} từ
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Thao tác này sẽ xóa vĩnh viễn <strong className="text-fg">{selectedIds.length} từ vựng</strong> đang được chọn khỏi bộ dữ liệu.
        </p>
      </Modal>

      <AdminImportExportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        entityType="vocabulary"
        snapshot={snapshot}
        actor={actor}
        onCommitted={onRefresh}
        filteredExportData={filtered}
        filteredExportLabel={`Xuất ${filtered.length} từ đang lọc`}
      />
    </div>
  );
}
