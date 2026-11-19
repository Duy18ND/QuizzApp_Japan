import { useCallback, useEffect, useMemo, useState } from 'react';
import { History, RefreshCw, ShieldAlert } from 'lucide-react';
import { SuperAdminRoleManager } from '../../components/admin/SuperAdminRoleManager';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Notice,
  SearchInput,
  Select,
} from '../../components/ui';
import { fetchAuditLogs } from '../../services/adminCmsService';
import type { AuthUser } from '../../store/slices/authSlice';
import type { AuditLogRecord } from '../../types/admin';

interface AdminUsersAuditManagerProps {
  actor: AuthUser | null;
}

export function AdminUsersAuditManager({ actor }: AdminUsersAuditManagerProps) {
  const isSuperAdmin = actor?.role === 'SUPER_ADMIN';

  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [logSource, setLogSource] = useState<'supabase' | 'local'>('local');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    setLogError(null);
    const res = await fetchAuditLogs(actor, 60);
    setLoadingLogs(false);
    if (!res.ok) {
      setLogError(res.error ?? 'Không thể tải nhật ký thao tác.');
      setLogs([]);
      return;
    }
    setLogSource(res.source);
    setLogs(res.logs);
  }, [actor]);

  useEffect(() => {
    let cancelled = false;
    void fetchAuditLogs(actor, 60).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setLogError(res.error ?? 'Không thể tải nhật ký thao tác.');
        setLogs([]);
        return;
      }
      setLogError(null);
      setLogSource(res.source);
      setLogs(res.logs);
    });
    return () => {
      cancelled = true;
    };
  }, [actor]);

  const entityTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.entityType) set.add(l.entityType);
    });
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (entityFilter !== 'ALL' && log.entityType !== entityFilter) return false;
      if (!q) return true;
      return (
        log.action.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q) ||
        JSON.stringify(log.detailsJson).toLowerCase().includes(q)
      );
    });
  }, [logs, entityFilter, search]);

  return (
    <div className="space-y-6">
      {/* Strictly isolated RBAC block: ONLY rendered for SUPER_ADMIN */}
      {isSuperAdmin ? (
        <SuperAdminRoleManager actor={actor} />
      ) : (
        <Notice tone="info">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong>Giới hạn RBAC:</strong> Tài khoản quyền <code>ADMIN</code> chỉ xem được Nhật ký hệ thống bên dưới. Chỉ <code>SUPER_ADMIN</code> mới được quản lý vai trò tài khoản.
            </div>
          </div>
        </Notice>
      )}

      {/* Audit Logs Viewer */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
              <History className="h-4 w-4 text-primary" />
              Nhật ký thao tác CMS (<code>public.audit_logs</code>)
            </h2>
            <p className="mt-1 text-xs text-muted">
              Theo dõi mọi lần thêm/sửa/xóa, Migration, Batch Import và Auto-Test gần nhất (nguồn:{' '}
              <strong>{logSource === 'supabase' ? 'Supabase Cloud' : 'Bộ đệm Local'}</strong>).
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            loading={loadingLogs}
            onClick={() => void loadLogs()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Làm mới nhật ký
          </Button>
        </div>

        {logError && <Notice tone="danger">{logError}</Notice>}

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Lọc theo đối tượng (entity_type)">
            <Select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="ALL">Tất cả đối tượng ({logs.length})</option>
              {entityTypes.map((et) => (
                <option key={et} value={et}>
                  {et}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tìm trong nhật ký">
            <SearchInput
              value={search}
              onChange={(val) => setSearch(val)}
              placeholder="Hành động, entity_id, chi tiết..."
            />
          </Field>
        </div>

        {filteredLogs.length === 0 ? (
          <EmptyState
            icon={<History className="h-6 w-6" />}
            title="Chưa có bản ghi nhật ký nào"
            description="Thực hiện lưu/xóa học liệu hoặc chạy Migration / Auto-Test để hệ thống ghi nhận nhật ký."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[740px] text-left text-xs">
              <thead className="border-b border-line bg-surface-2 uppercase text-muted">
                <tr>
                  <th className="px-3 py-2.5">Thời gian</th>
                  <th className="px-3 py-2.5">Hành động</th>
                  <th className="px-3 py-2.5">Đối tượng</th>
                  <th className="px-3 py-2.5">Actor ID</th>
                  <th className="px-3 py-2.5">Chi tiết JSON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-glass-soft">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-muted">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        tone={
                          log.action.includes('DELETE')
                            ? 'danger'
                            : log.action.includes('TEST') || log.action.includes('MIGRATE')
                              ? 'sakura'
                              : 'primary'
                        }
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-fg">
                      <span className="font-semibold">{log.entityType}</span>
                      <span className="mx-1 text-muted">·</span>
                      <code className="text-muted">{log.entityId}</code>
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2 font-mono text-muted">
                      {log.actorId ?? 'local'}
                    </td>
                    <td className="max-w-sm truncate px-3 py-2 font-mono text-muted" title={JSON.stringify(log.detailsJson)}>
                      {JSON.stringify(log.detailsJson)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
