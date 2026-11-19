import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  deleteUnitItem,
  saveUnitItem,
  type CmsSnapshot,
} from '../../services/adminCmsService';
import { toDbUnitId } from '../../services/migrationService';
import type { AuthUser } from '../../store/slices/authSlice';
import type { AdminUnitRecord } from '../../types/admin';
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
  Switch,
} from '../../components/ui';

const LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

interface UnitFormState {
  isEdit: boolean;
  id: string;
  idTouched: boolean;
  level: JLPTLevel;
  unitNumber: string;
  title: string;
  description: string;
  orderIndex: string;
  isPublished: boolean;
}

const emptyUnitForm = (nextOrder = 1): UnitFormState => ({
  isEdit: false,
  id: toDbUnitId('N3', 1),
  idTouched: false,
  level: 'N3',
  unitNumber: '1',
  title: '',
  description: '',
  orderIndex: String(nextOrder),
  isPublished: true,
});

interface AdminUnitsManagerProps {
  snapshot: CmsSnapshot;
  actor: AuthUser | null;
  onRefresh: () => Promise<void> | void;
  onJumpToUnitVocab: (level: JLPTLevel, unitNumber: number, dbUnitId: string) => void;
}

export function AdminUnitsManager({
  snapshot,
  actor,
  onRefresh,
  onJumpToUnitVocab,
}: AdminUnitsManagerProps) {
  const [levelFilter, setLevelFilter] = useState<'ALL' | JLPTLevel>('ALL');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<UnitFormState>(() => emptyUnitForm(snapshot.units.length + 1));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUnitRecord | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const vocabCountsByUnit = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of snapshot.vocabularies) {
      const dbId = v.dbUnitId || toDbUnitId(v.level, v.unitId);
      counts.set(dbId, (counts.get(dbId) ?? 0) + 1);
      const fallbackKey = `${v.level}#${v.unitId}`;
      counts.set(fallbackKey, (counts.get(fallbackKey) ?? 0) + 1);
    }
    return counts;
  }, [snapshot.vocabularies]);

  const getUnitVocabCount = (u: AdminUnitRecord): number =>
    vocabCountsByUnit.get(u.id) ?? vocabCountsByUnit.get(`${u.level}#${u.unitNumber}`) ?? 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...snapshot.units]
      .sort((a, b) => a.orderIndex - b.orderIndex || a.unitNumber - b.unitNumber)
      .filter((u) => {
        if (levelFilter !== 'ALL' && u.level !== levelFilter) return false;
        if (!q) return true;
        return (
          u.id.toLowerCase().includes(q) ||
          u.title.toLowerCase().includes(q) ||
          u.description.toLowerCase().includes(q)
        );
      });
  }, [snapshot.units, levelFilter, search]);

  const openCreateModal = () => {
    const nextUnitNumber =
      Math.max(
        0,
        ...snapshot.units.filter((u) => u.level === 'N3').map((u) => u.unitNumber),
      ) + 1;
    setForm({
      ...emptyUnitForm(snapshot.units.length + 1),
      id: toDbUnitId('N3', nextUnitNumber),
      unitNumber: String(nextUnitNumber),
      title: `Unit ${nextUnitNumber} (N3)`,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (u: AdminUnitRecord) => {
    setForm({
      isEdit: true,
      id: u.id,
      idTouched: true,
      level: u.level,
      unitNumber: String(u.unitNumber),
      title: u.title,
      description: u.description,
      orderIndex: String(u.orderIndex),
      isPublished: u.isPublished,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);
    const unitNum = Number(form.unitNumber);
    const orderNum = Number(form.orderIndex);
    const title = form.title.trim();
    const id = form.id.trim() || toDbUnitId(form.level, Number.isInteger(unitNum) ? unitNum : 1);

    if (!Number.isInteger(unitNum) || unitNum < 1) {
      setFormError('Số Unit (unit_number) phải là số nguyên >= 1.');
      return;
    }
    if (!title) {
      setFormError('Vui lòng nhập tên học phần (title).');
      return;
    }

    setSaving(true);
    const res = await saveUnitItem(
      {
        id,
        level: form.level,
        unitNumber: unitNum,
        title,
        description: form.description.trim(),
        orderIndex: Number.isFinite(orderNum) ? orderNum : unitNum,
        isPublished: form.isPublished,
      },
      actor,
      { isNew: !form.isEdit },
    );
    setSaving(false);

    if (!res.ok) {
      setFormError(res.error ?? 'Lưu học phần thất bại.');
      return;
    }

    setModalOpen(false);
    setBanner({
      tone: 'success',
      text: `${form.isEdit ? 'Đã cập nhật' : 'Đã tạo'} Unit "${title}" (${id}).`,
    });
    await onRefresh();
  };

  const handleTogglePublished = async (u: AdminUnitRecord) => {
    setTogglingId(u.id);
    const res = await saveUnitItem({ ...u, isPublished: !u.isPublished }, actor, { isNew: false });
    setTogglingId(null);
    if (!res.ok) {
      setBanner({ tone: 'danger', text: res.error ?? 'Không thể đổi trạng thái xuất bản.' });
      return;
    }
    setBanner({
      tone: 'success',
      text: `Unit "${u.title}" đã chuyển sang ${!u.isPublished ? 'Đã xuất bản' : 'Ẩn'}.`,
    });
    await onRefresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const res = await deleteUnitItem(deleteTarget.id, actor);
    setSaving(false);
    setDeleteTarget(null);
    if (!res.ok) {
      setBanner({ tone: 'danger', text: res.error ?? 'Xóa Unit thất bại.' });
      return;
    }
    setBanner({ tone: 'success', text: `Đã xóa Unit ${deleteTarget.id}.` });
    await onRefresh();
  };

  const deleteVocabCount = deleteTarget ? getUnitVocabCount(deleteTarget) : 0;

  return (
    <div className="space-y-4">
      {banner && <Notice tone={banner.tone}>{banner.text}</Notice>}

      <Card padding="md" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary-fg" aria-hidden />
            <h2 className="text-base font-semibold text-fg">
              Học phần (Units) — {filtered.length} học phần
            </h2>
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="size-4" aria-hidden />}
            onClick={openCreateModal}
          >
            + Tạo Unit mới
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as 'ALL' | JLPTLevel)}
            aria-label="Lọc theo cấp độ JLPT"
          >
            <option value="ALL">Tất cả cấp độ (ALL)</option>
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                JLPT {lvl}
              </option>
            ))}
          </Select>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo ID (N3-U1), tên Unit, mô tả..."
            className="sm:col-span-2"
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="Không có Unit phù hợp" description="Hãy đổi bộ lọc hoặc tạo Unit mới." />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID / Cấp độ</th>
                  <th className="px-4 py-3 font-semibold">Tên học phần &amp; Mô tả</th>
                  <th className="px-4 py-3 font-semibold">Từ vựng</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((u) => {
                  const vocabCount = getUnitVocabCount(u);
                  return (
                    <tr key={u.id} className="transition-colors hover:bg-surface-2/60">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Badge tone="primary">{u.level}</Badge>
                          <span className="font-mono text-xs font-semibold text-fg">{u.id}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted tabular">
                          Unit #{u.unitNumber} · Thứ tự {u.orderIndex}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-fg">{u.title}</p>
                        <p className="text-xs text-muted">{u.description || '—'}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge tone={vocabCount > 0 ? 'success' : 'neutral'} className="tabular">
                          {vocabCount} từ
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Switch
                          checked={u.isPublished}
                          disabled={togglingId === u.id}
                          label={u.isPublished ? 'Đang mở' : 'Đang ẩn'}
                          onChange={() => void handleTogglePublished(u)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            variant="soft"
                            size="sm"
                            leftIcon={<ArrowRight className="size-3.5" aria-hidden />}
                            onClick={() => onJumpToUnitVocab(u.level, u.unitNumber, u.id)}
                          >
                            Mở danh sách Từ vựng của Unit này
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Pencil className="size-3.5" aria-hidden />}
                            onClick={() => openEditModal(u)}
                          >
                            Sửa Unit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            leftIcon={<Trash2 className="size-3.5" aria-hidden />}
                            onClick={() => setDeleteTarget(u)}
                          >
                            Xóa Unit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.isEdit ? `Chỉnh sửa Unit ${form.id}` : 'Tạo Unit học phần mới'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Hủy
            </Button>
            <Button variant="primary" loading={saving} onClick={() => void handleSave()}>
              {form.isEdit ? 'Lưu thay đổi' : 'Tạo Unit'}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          {formError && <Notice tone="danger">{formError}</Notice>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Cấp độ (level)">
              <Select
                value={form.level}
                disabled={form.isEdit}
                onChange={(e) => {
                  const nextLevel = e.target.value as JLPTLevel;
                  const num = Math.max(1, Number(form.unitNumber) || 1);
                  setForm((f) => ({
                    ...f,
                    level: nextLevel,
                    id: f.isEdit || f.idTouched ? f.id : toDbUnitId(nextLevel, num),
                  }));
                }}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Số Unit (unit_number)">
              <Input
                type="number"
                min={1}
                value={form.unitNumber}
                onChange={(e) => {
                  const raw = e.target.value;
                  const num = Math.max(1, Number(raw) || 1);
                  setForm((f) => ({
                    ...f,
                    unitNumber: raw,
                    id: f.isEdit || f.idTouched ? f.id : toDbUnitId(f.level, num),
                  }));
                }}
              />
            </Field>
            <Field label="ID bảng units (id)">
              <Input
                value={form.id}
                disabled={form.isEdit}
                placeholder="N3-U1"
                onChange={(e) =>
                  setForm((f) => ({ ...f, id: e.target.value, idTouched: true }))
                }
              />
            </Field>
          </div>

          <Field label="Tên học phần (title) *">
            <Input
              required
              value={form.title}
              placeholder="Unit 1 (N3 - Mimi kara Oboeru)"
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </Field>

          <Field label="Mô tả (description)">
            <Input
              value={form.description}
              placeholder="130 từ vựng chuẩn JLPT N3"
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Thứ tự sắp xếp (order_index)">
              <Input
                type="number"
                value={form.orderIndex}
                onChange={(e) => setForm((f) => ({ ...f, orderIndex: e.target.value }))}
              />
            </Field>
            <div className="flex items-end pb-1">
              <Switch
                checked={form.isPublished}
                label="Xuất bản (is_published)"
                description="Hiển thị với người học"
                onChange={(checked) => setForm((f) => ({ ...f, isPublished: checked }))}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Xác nhận xóa Unit"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button variant="danger" loading={saving} onClick={() => void handleDelete()}>
              Xác nhận xóa
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          {deleteVocabCount > 0 && (
            <Notice tone="danger">
              Cảnh báo: Unit này đang chứa <strong>{deleteVocabCount} từ vựng</strong>. Xóa Unit có thể xóa dây chuyền các từ vựng liên kết trên PostgreSQL (`on delete cascade`).
            </Notice>
          )}
          <p className="text-muted">
            Bạn có chắc muốn xóa Unit <strong className="text-fg">{deleteTarget?.title}</strong> (
            <code>{deleteTarget?.id}</code>)?
          </p>
        </div>
      </Modal>
    </div>
  );
}
