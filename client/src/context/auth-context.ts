import { createContext, useContext } from 'react';
import type { StudyLevel } from '../services/userLevelService';
import type { AuthState, AuthUser } from '../store/slices/authSlice';

export interface AuthActionResult {
  ok: boolean;
  error?: string;
  user?: AuthUser;
  needsEmailConfirmation?: boolean;
}

export interface AuthContextValue extends AuthState {
  isSupabaseConfigured: boolean;
  studyLevel: StudyLevel | null;
  studyTextbookId: string | null;
  updateStudyLevel: (level: StudyLevel, textbookId?: string | null) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<AuthActionResult>;
  signInWithGoogle: () => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export function translateSupabaseAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return 'Đăng nhập bằng Google hiện tạm thời chưa khả dụng. Vui lòng sử dụng Email và mật khẩu.';
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
    return 'Tài khoản chưa xác nhận email. Vui lòng kiểm tra hộp thư đến để kích hoạt tài khoản.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Bạn đã gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng đợi ít phút rồi thử lại.';
  }
  if (lower.includes('password should be at least')) {
    return 'Mật khẩu phải có tối thiểu 6 ký tự.';
  }
  if (lower.includes('unable to validate email') || lower.includes('invalid format')) {
    return 'Định dạng địa chỉ Email không hợp lệ.';
  }
  if (lower.includes('signups not allowed') || lower.includes('signup is disabled')) {
    return 'Chức năng đăng ký tài khoản mới hiện đang tạm khóa.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra lại kết nối mạng.';
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
