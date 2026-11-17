import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import type { AccountRole } from '../../store/slices/authSlice';
import { ErrorState, LoadingState, PageContainer } from '../ui';

interface ProtectedRouteProps {
  allowedRoles: AccountRole[];
  children?: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { status, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (status === 'loading') {
    return (
      <PageContainer size="sm" className="py-12">
        <LoadingState label="Đang kiểm tra quyền truy cập..." />
      </PageContainer>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <PageContainer size="sm" className="py-10">
        <ErrorState
          title="Không có quyền truy cập (403)"
          description={`Tài khoản của bạn đang ở vai trò ${user.role}. Trang này chỉ dành cho: ${allowedRoles.join(', ')}.`}
          onRetry={() => navigate('/')}
          retryLabel="Về trang chủ"
        />
      </PageContainer>
    );
  }

  return <>{children ?? <Outlet />}</>;
}
