import { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2, Upload } from 'lucide-react';
import {
  deleteVocabItem,
  saveVocabItem,
  type CmsSnapshot,
} from '../../services/adminCmsService';
import type { AdminVocabRecord } from '../../types/admin';
import type { AuthUser } from '../../store/slices/authSlice';
import type { JLPTLevel } from '../../types/quiz';
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
} from '../ui';
import { AdminImportExportModal } from './AdminImportExportModal';
import { AdminPagination } from './AdminPagination';

const LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const PAGE_SIZE = 15;

interface VocabFormState {
  id?: number;
  kanji: string;
  hiragana: string;
  hanViet: string;
  meaning: string;
  wordType: string;
  level: JLPTLevel;
  unitId: string;
  exampleSentence: string;
  exampleMeaning: string;
}

const emptyForm = (): VocabFormState => ({
  kanji: '',
  hiragana: '',
  hanViet: '',
  meaning: '',
  wordType: 'Danh từ',
  level: 'N3',
  unitId: '1',
  exampleSentence: '',
  exampleMeaning: '',
});

interface VocabularyManagerProps {
  vocabularies: AdminVocabRecord[];
  actor: AuthUser | null;
  snapshot: CmsSnapshot;
  onRefresh: () => Promise<void> | void;
}

export function VocabularyManager({
  vocabularies,
  actor,
  snapshot,
  onRefresh,
}: VocabularyManagerProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | JLPTLevel>('ALL');
  const [unitFilter, setUnitFilter] = useState<'ALL' | string>('ALL');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<VocabFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminVocabRecord | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const unitOptions = useMemo(() => {
    const units = Array.from(new Set(vocabularies.map((v) => v.unitId))).sort((a, b) => a - b);
    return units;
  }, [vocabularies]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vocabularies.filter((v) => {
      if (levelFilter !== 'ALL' && v.level !== levelFilter) return false;
      if (unitFilter !== 'ALL' && String(v.unitId) !== unitFilter) return false;
      if (!q) return true;
      return (
        (v.kanji ?? '').toLowerCase().includes(q) ||
        v.hiragana.toLowerCase().includes(q) ||
        (v.hanViet ?? '').toLowerCase().includes(q) ||
        v.meaning.toLowerCase().includes(q)
      );
    });
  }, [vocabularies, search, levelFilter, unitFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const openCreateModal = () => {
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (item: AdminVocabRecord) => {
    setForm({
      id: item.id,
      kanji: item.kanji ?? '',
      hiragana: item.hiragana,
      hanViet: item.hanViet ?? '',
      meaning: item.meaning,
      wordType: item.wordType,
      level: item.level,
      unitId: String(item.unitId),
      exampleSentence: item.exampleSentence ?? '',
      exampleMeaning: item.exampleMeaning ?? '',
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    const hiragana = form.hiragana.trim();
    const meaning = form.meaning.trim();
    const unitNum = Number(form.unitId);

    if (!hiragana) {
      setFormError('Vui lòng nhập cách đọc Hiragana.');
      return;
    }
    if (!meaning) {
      setFormError('Vui lòng nhập nghĩa tiếng Việt.');
      return;
    }
    if (!Number.isInteger(unitNum) || unitNum < 1) {
      setFormError('Unit phải là số nguyên dương (>= 1).');
      return;
    }

    const nextId =
      form.id ?? vocabularies.reduce((max, item) => Math.max(max, item.id), 0) + 1;

    const record: AdminVocabRecord = {
      id: nextId,
      unitId: unitNum,
      level: form.level,
      wordNumber: nextId,
      kanji: form.kanji.trim() || null,
      hiragana,
      hanViet: form.hanViet.trim() || null,
      meaning,
      wordType: form.wordType.trim() || 'Danh từ',
      exampleSentence: form.exampleSentence.trim() || null,
      exampleMeaning: form.exampleMeaning.trim() || null,
      notes: null,
    };

    setSaving(true);
    const res = await saveVocabItem(record, actor);
    setSaving(false);

    if (!res.ok) {
      setFormError(res.error ?? 'Không thể lưu từ vựng.');
      return;
    }

    setModalOpen(false);
    setFeedbackBanner({
      tone: 'success',
      text: `${form.id ? 'Đã cập nhật' : 'Đã thêm'} từ vựng "${record.kanji || record.hiragana}".`,
    });
    await onRefresh();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const res = await deleteVocabItem(deleteTarget.id, actor);
    setSaving(false);
    setDeleteTarget(null);
    if (!res.ok) {
      setFeedbackBanner({ tone: 'danger', text: res.error ?? 'Xóa thất bại.' });
      return;
    }
    setFeedbackBanner({
      tone: 'success',
      text: `Đã xóa từ vựng "${deleteTarget.kanji || deleteTarget.hiragana}".`,
    });
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      {feedbackBanner && (
        <Notice tone={feedbackBanner.tone}>{feedbackBanner.text}</Notice>
      )}

      <Card padding="md" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Tìm Kanji, Hiragana, Hán Việt, Nghĩa..."
              className="w-full sm:w-64"
            />
            <Select
              aria-label="Lọc cấp độ JLPT"
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
            <Select
              aria-label="Lọc theo Unit"
              value={unitFilter}
              onChange={(e) => {
                setUnitFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Tất cả Unit</option>
              {unitOptions.map((u) => (
                <option key={u} value={String(u)}>
                  Unit {u}
                </option>
              ))}
            </Select>
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
              Thêm từ vựng
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted">
          Đang hiển thị <strong className="tabular text-fg">{filtered.length}</strong> /{' '}
          <span className="tabular">{vocabularies.length}</span> từ vựng.
        </p>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="Không có từ vựng phù hợp"
          description="Thử thay đổi bộ lọc cấp độ/từ khóa hoặc thêm từ vựng mới."
          action={
            <Button variant="primary" size="sm" onClick={openCreateModal}>
              Thêm từ vựng mới
            </Button>
          }
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Từ vựng</th>
                  <th className="px-4 py-3 font-semibold">Hán Việt</th>
                  <th className="px-4 py-3 font-semibold">Nghĩa &amp; Từ loại</th>
                  <th className="px-4 py-3 font-semibold">Cấp / Unit</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paginated.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-glass-soft">
                    <td className="px-4 py-3">
                      <p lang="ja" className="font-bold text-fg">
                        {item.kanji || item.hiragana}
                      </p>
                      {item.kanji && (
                        <p lang="ja" className="text-xs text-muted">
                          {item.hiragana}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-primary-fg">
                      {item.hanViet || <span className="text-subtle">—</span>}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="font-medium text-fg">{item.meaning}</p>
                      <p className="text-xs text-muted">{item.wordType}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="primary">{item.level}</Badge>
                        <Badge tone="neutral">Unit {item.unitId}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          aria-label={`Sửa ${item.kanji || item.hiragana}`}
                          onClick={() => openEditModal(item)}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          aria-label={`Xóa ${item.kanji || item.hiragana}`}
                          onClick={() => setDeleteTarget(item)}
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

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        size="lg"
        title={form.id ? `Chỉnh sửa từ vựng #${form.id}` : 'Thêm từ vựng mới'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void handleSave()}>
              {form.id ? 'Lưu thay đổi' : 'Tạo từ vựng'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {formError && <Notice tone="danger">{formError}</Notice>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Kanji (nếu có)" htmlFor="vocab-kanji">
              <Input
                id="vocab-kanji"
                lang="ja"
                value={form.kanji}
                onChange={(e) => setForm({ ...form, kanji: e.target.value })}
                placeholder="約束"
              />
            </Field>
            <Field label="Hiragana *" htmlFor="vocab-hiragana">
              <Input
                id="vocab-hiragana"
                lang="ja"
                value={form.hiragana}
                onChange={(e) => setForm({ ...form, hiragana: e.target.value })}
                placeholder="やくそく"
                required
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Âm Hán Việt" htmlFor="vocab-hanviet">
              <Input
                id="vocab-hanviet"
                value={form.hanViet}
                onChange={(e) => setForm({ ...form, hanViet: e.target.value })}
                placeholder="ƯỚC THÚC"
              />
            </Field>
            <Field label="Từ loại" htmlFor="vocab-wordtype">
              <Input
                id="vocab-wordtype"
                value={form.wordType}
                onChange={(e) => setForm({ ...form, wordType: e.target.value })}
                placeholder="Danh từ / Động từ..."
              />
            </Field>
          </div>

          <Field label="Nghĩa tiếng Việt *" htmlFor="vocab-meaning">
            <Input
              id="vocab-meaning"
              value={form.meaning}
              onChange={(e) => setForm({ ...form, meaning: e.target.value })}
              placeholder="Lời hứa, cuộc hẹn"
              required
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cấp độ JLPT *" htmlFor="vocab-level">
              <Select
                id="vocab-level"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value as JLPTLevel })}
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Unit *" htmlFor="vocab-unit">
              <Input
                id="vocab-unit"
                type="number"
                min={1}
                value={form.unitId}
                onChange={(e) => setForm({ ...form, unitId: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Câu ví dụ (tiếng Nhật)" htmlFor="vocab-example-ja">
            <Textarea
              id="vocab-example-ja"
              lang="ja"
              rows={2}
              value={form.exampleSentence}
              onChange={(e) => setForm({ ...form, exampleSentence: e.target.value })}
              placeholder="友達と約束をしました。"
            />
          </Field>

          <Field label="Dịch câu ví dụ" htmlFor="vocab-example-vi">
            <Input
              id="vocab-example-vi"
              value={form.exampleMeaning}
              onChange={(e) => setForm({ ...form, exampleMeaning: e.target.value })}
              placeholder="Tôi đã hẹn với bạn."
            />
          </Field>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        size="sm"
        title="Xác nhận xóa từ vựng"
        description={`Bạn có chắc chắn muốn xóa từ "${deleteTarget?.kanji || deleteTarget?.hiragana}"?`}
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
          key="vocabulary"
          open={importOpen}
          onClose={() => setImportOpen(false)}
          entityType="vocabulary"
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
