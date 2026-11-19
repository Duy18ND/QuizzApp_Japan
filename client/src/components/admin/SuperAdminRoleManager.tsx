import { useEffect, useMemo, useState } from 'react';
import { Lock, ShieldCheck, ShieldOff, UserCheck } from 'lucide-react';
import {
  fetchManagedUsers,
  updateManagedUserRole,
} from '../../services/adminCmsService';
import type { AccountProviderSummary, ManagedUserProfile } from '../../types/admin';
import type { AccountRole, AuthUser } from '../../store/slices/authSlice';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Modal,
  Notice,
  SearchInput,
} from '../ui';

const ROLE_TONE: Record<AccountRole, 'sakura' | 'primary' | 'success'> = {
  SUPER_ADMIN: 'sakura',
  ADMIN: 'primary',
  USER: 'success',
};

interface SuperAdminRoleManagerProps {
  actor: AuthUser | null;
}

export function SuperAdminRoleManager({ actor }: SuperAdminRoleManagerProps) {
  const [users, setUsers] = useState<ManagedUserProfile[]>([]);
  const [summary, setSummary] = useState<AccountProviderSummary>({
    total: 0,
    google: 0,
    email: 0,
    hashed: 0,
  });
  const [source, setSource] = useState<'supabase' | 'local'>('local');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pendingAction, setPendingAction] = useState<{
    target: ManagedUserProfile;
    nextRole: Extract<AccountRole, 'ADMIN' | 'USER'>;
  } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'info' | 'success' | 'danger'; text: string } | null>(
    null,
  );

  const isSuperAdmin = actor?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    fetchManagedUsers(actor).then((res) => {
      if (cancelled) return;
      setUsers(res.users);
      setSummary(res.summary);
      setSource(res.source);
      if (!res.ok && res.error) {
        setBanner({ tone: 'danger', text: res.error });
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [actor, isSuperAdmin]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [users, search]);

  if (!isSuperAdmin) {
    return (
      <ErrorState
        title="Truy cập bị giới hạn (403)"
        description="Module Quản lý Phân quyền chỉ dành riêng cho tài khoản SUPER_ADMIN."
      />
    );
  }

  if (loading) {
    return <LoadingState label="Đang tải danh sách tài khoản..." />;
  }

  const handleConfirmRoleChange = async () => {
    if (!pendingAction) return;
    setUpdating(true);
    const res = await updateManagedUserRole({
      actor,
      targetUserId: pendingAction.target.id,
      nextRole: pendingAction.nextRole,
      currentUsers: users,
    });
    setUpdating(false);
    setPendingAction(null);

    if (!res.ok) {
      setBanner({ tone: 'danger', text: res.error ?? 'Cập nhật vai trò thất bại.' });
      return;
    }

    if (res.users) setUsers(res.users);
    setBanner({
      tone: 'success',
      text: `Đã chuyển vai trò của ${pendingAction.target.email} sang ${pendingAction.nextRole}.`,
    });
  };

  return (
    <div className="space-y-4">
      <Notice tone={source === 'supabase' ? 'info' : 'warning'}>
        {source === 'supabase'
          ? 'Đang kết nối trực tiếp bảng public.profiles qua Supabase RLS (mọi thao tác được kiểm tra lại bằng trigger protect_profiles_rbac).'
          : 'Chế độ mô phỏng cục bộ (Supabase chưa kết nối): danh sách dưới đây phục vụ kiểm thử giao diện và khóa tự hạ quyền SUPER_ADMIN.'}
      </Notice>

      {banner && <Notice tone={banner.tone}>{banner.text}</Notice>}

      <Card padding="md" className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo email, tên hiển thị hoặc vai trò..."
          className="w-full sm:w-80"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <Badge tone="neutral">Tổng TK: {summary.total}</Badge>
          <Badge tone="primary">Google: {summary.google}</Badge>
          <Badge tone="neutral">Email: {summary.email}</Badge>
          <Badge tone="success">Mã băm: {summary.hashed}</Badge>
          <Badge tone="sakura">SUPER_ADMIN: {users.filter((u) => u.role === 'SUPER_ADMIN').length}</Badge>
          <Badge tone="primary">ADMIN: {users.filter((u) => u.role === 'ADMIN').length}</Badge>
          <Badge tone="success">USER: {users.filter((u) => u.role === 'USER').length}</Badge>
        </div>
      </Card>

      {filteredUsers.length === 0 ? (
        <EmptyState
          title="Không tìm thấy người dùng"
          description="Thử nhập từ khóa email hoặc tên khác."
        />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Người dùng</th>
                  <th className="px-4 py-3 font-semibold">Phương thức</th>
                  <th className="px-4 py-3 font-semibold">Vai trò hiện tại</th>
                  <th className="px-4 py-3 text-right font-semibold">Phân quyền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === actor.id;
                  const isProtectedSuper = u.role === 'SUPER_ADMIN';

                  return (
                    <tr key={u.id} className="transition-colors hover:bg-glass-soft">
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-fg">{u.displayName}</span>
                          {isSelf && <Badge tone="neutral">Bạn</Badge>}
                        </div>
                        <p className="text-xs text-muted">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={u.authProvider === 'google' ? 'primary' : 'neutral'}>
                            {u.authProvider === 'google' ? 'Google' : 'Email'}
                          </Badge>
                          {u.hasClientHash && <Badge tone="success">PBKDF2</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {isSelf || isProtectedSuper ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-glass-soft px-2.5 py-1 text-xs text-muted">
                              <Lock className="size-3" aria-hidden />
                              {isSelf ? 'Khóa tự hạ quyền' : 'Khóa bảo vệ SUPER_ADMIN'}
                            </span>
                          ) : u.role === 'USER' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<ShieldCheck className="size-3.5" aria-hidden />}
                              onClick={() => setPendingAction({ target: u, nextRole: 'ADMIN' })}
                            >
                              Cấp quyền ADMIN
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<ShieldOff className="size-3.5" aria-hidden />}
                              onClick={() => setPendingAction({ target: u, nextRole: 'USER' })}
                            >
                              Thu hồi về USER
                            </Button>
                          )}
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
        open={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        size="sm"
        title="Xác nhận thay đổi vai trò"
        description={
          pendingAction
            ? `Chuyển quyền tài khoản "${pendingAction.target.email}" từ ${pendingAction.target.role} sang ${pendingAction.nextRole}?`
            : ''
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingAction(null)}>
              Hủy
            </Button>
            <Button
              variant="primary"
              loading={updating}
              leftIcon={<UserCheck className="size-4" aria-hidden />}
              onClick={() => void handleConfirmRoleChange()}
            >
              Xác nhận cập nhật
            </Button>
          </>
        }
      />
    </div>
  );
}
