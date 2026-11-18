import { createContext, useContext } from 'react';
import type { AccountRole, AuthState, AuthUser } from '../store/slices/authSlice';

export interface AuthActionResult {
  ok: boolean;
  error?: string;
  user?: AuthUser;
  needsEmailConfirmation?: boolean;
}

export interface QuickTestAccountPreset {
  role: AccountRole;
  label: string;
  shortLabel: string;
  email: string;
  password: string;
  displayName: string;
  description: string;
  targetRoute: string;
}

export const QUICK_TEST_ACCOUNTS: QuickTestAccountPreset[] = [
  {
    role: 'USER',
    label: 'Học viên (USER)',
    shortLabel: 'Test USER',
    email: 'hocvien@nihongo.vn',
    password: 'User@123456',
    displayName: 'Học Viên N3 (Test)',
    description: 'Học từ vựng, Kanji, ngữ pháp, luyện đề JLPT và lưu tiến độ cá nhân.',
    targetRoute: '/',
  },
  {
    role: 'ADMIN',
    label: 'Quản trị học liệu (ADMIN)',
    shortLabel: 'Test ADMIN',
    email: 'admin@nihongo.vn',
    password: 'Admin@123456',
    displayName: 'Admin Học Liệu (Test)',
    description: 'Truy cập /admin, Thêm / Sửa / Xóa học liệu và chạy Migrate / Auto-Test.',
    targetRoute: '/admin',
  },
  {
    role: 'SUPER_ADMIN',
    label: 'Quản trị tối cao (SUPER_ADMIN)',
    shortLabel: 'Test SUPER_ADMIN',
    email: 'superadmin@nihongo.vn',
    password: 'Admin@123456',
    displayName: 'Super Admin (Test)',
    description: 'Toàn quyền hệ thống: Migrate All, Auto-Test E2E CRUD, CRUD học liệu và Phân quyền Users.',
    targetRoute: '/admin',
  },
];

/**
 * Security Guard: Quick-Test role switching is strictly limited to local development
 * (`localhost` / `127.0.0.1` / `import.meta.env.DEV`) or when explicitly enabled via env.
 * On public production domains (e.g. GitHub Pages), it is automatically disabled.
 */
export function isQuickTestAllowed(): boolean {
  if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_QUICK_TEST === 'true') {
    return true;
  }
  if (typeof window === 'undefined' || !window.location) {
    return true;
  }
  const host = (window.location.hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';
}

export interface AuthContextValue extends AuthState {
  isSupabaseConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<AuthActionResult>;
  signInWithGoogle: () => Promise<AuthActionResult>;
  quickLoginAsRole: (role: AccountRole) => AuthUser;
  quickSignInWithPreset: (role: AccountRole) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export function translateSupabaseAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return 'Đăng nhập Google chưa được bật trên Supabase (cần bật Google trong Authentication ➔ Providers trên Supabase Dashboard).';
  }
  if (lower.includes('access_denied')) {
    return 'Bạn đã hủy quá trình đăng nhập Google.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Email hoặc mật khẩu không chính xác.';
  }
  if (lower.includes('already registered') || lower.includes('user already exists')) {
    return 'Email này đã được đăng ký trước đó. Vui lòng chuyển sang Đăng nhập.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Tài khoản chưa xác nhận email. Vui lòng kiểm tra hộp thư đến hoặc tắt Confirm Email trong Supabase Auth.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Gửi quá nhiều yêu cầu trong thời gian ngắn (Rate limit). Vui lòng đợi ít phút rồi thử lại.';
  }
  if (lower.includes('password should be at least')) {
    return 'Mật khẩu phải có tối thiểu 6 ký tự.';
  }
  if (lower.includes('unable to validate email') || lower.includes('invalid format')) {
    return 'Định dạng địa chỉ Email không hợp lệ.';
  }
  if (lower.includes('signups not allowed') || lower.includes('signup is disabled')) {
    return 'Chức năng đăng ký tài khoản mới đang bị tắt trong cấu hình Supabase Auth.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Không thể kết nối tới máy chủ Supabase. Vui lòng kiểm tra lại kết nối mạng.';
  }
  return message;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
