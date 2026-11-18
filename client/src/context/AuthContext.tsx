import React, { useCallback, useEffect, useRef } from 'react';
import { syncLocalProgressWithCloud } from '../services/progressSyncService';
import {
  isSupabaseConfigured,
  setAuthPresenceCookie,
  supabase,
} from '../services/supabaseClient';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setAuthError,
  setAuthLoading,
  setAuthUser,
  setGuestSession,
  setSyncStatus,
  type AccountRole,
  type AuthUser,
} from '../store/slices/authSlice';
import {
  AuthContext,
  isQuickTestAllowed,
  QUICK_TEST_ACCOUNTS,
  translateSupabaseAuthError,
  type AuthActionResult,
  type AuthContextValue,
} from './auth-context';

const QUICK_TEST_STORAGE_KEY = 'nihongo_quick_test_user_v1';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000;

interface SignedQuickTestPayload {
  user: AuthUser;
  sig: string;
  issuedAt: number;
}

const computeQuickChecksum = (user: AuthUser): string => {
  const raw = `nihon_qt_v1:${user.id}:${user.email}:${user.role}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
};

const normalizeRole = (raw?: string | null): AccountRole => {
  if (raw === 'SUPER_ADMIN' || raw === 'ADMIN' || raw === 'USER') return raw;
  return 'USER';
};

function loadQuickTestUser(): AuthUser | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  if (!isQuickTestAllowed()) {
    try {
      window.sessionStorage.removeItem(QUICK_TEST_STORAGE_KEY);
    } catch {
      // Ignore
    }
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(QUICK_TEST_STORAGE_KEY);
    if (!raw || raw.length > 2048) return null;
    const parsed = JSON.parse(raw) as Partial<SignedQuickTestPayload>;
    const candidate = parsed?.user;
    if (
      !candidate ||
      typeof candidate.id !== 'string' ||
      typeof candidate.email !== 'string' ||
      typeof parsed.sig !== 'string'
    ) {
      window.sessionStorage.removeItem(QUICK_TEST_STORAGE_KEY);
      return null;
    }

    const whitelisted = QUICK_TEST_ACCOUNTS.find(
      (preset) =>
        preset.email.toLowerCase() === candidate.email.toLowerCase() &&
        preset.role === candidate.role,
    );
    if (!whitelisted) {
      window.sessionStorage.removeItem(QUICK_TEST_STORAGE_KEY);
      return null;
    }

    const cleanUser: AuthUser = {
      id: candidate.id,
      email: whitelisted.email,
      displayName: whitelisted.displayName,
      role: whitelisted.role,
    };

    if (computeQuickChecksum(cleanUser) !== parsed.sig) {
      window.sessionStorage.removeItem(QUICK_TEST_STORAGE_KEY);
      return null;
    }

    return cleanUser;
  } catch {
    return null;
  }
}

function saveQuickTestUser(user: AuthUser | null): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    if (!user || !isQuickTestAllowed()) {
      window.sessionStorage.removeItem(QUICK_TEST_STORAGE_KEY);
      setAuthPresenceCookie(false);
    } else {
      const payload: SignedQuickTestPayload = {
        user,
        sig: computeQuickChecksum(user),
        issuedAt: Date.now(),
      };
      window.sessionStorage.setItem(QUICK_TEST_STORAGE_KEY, JSON.stringify(payload));
      setAuthPresenceCookie(true, 60 * 60 * 4);
    }
  } catch {
    // Ignore storage quota errors
  }
}

async function fetchProfileForUser(userId: string, fallbackEmail: string): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, email, display_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (data) {
    return {
      id: String(data.id),
      email: String(data.email || fallbackEmail),
      displayName: String(data.display_name || fallbackEmail.split('@')[0] || 'Học viên'),
      role: normalizeRole(data.role),
    };
  }

  return {
    id: userId,
    email: fallbackEmail,
    displayName: fallbackEmail.split('@')[0] || 'Học viên',
    role: 'USER',
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);
  const failedAttemptsRef = useRef<{ count: number; lockedUntil: number }>({
    count: 0,
    lockedUntil: 0,
  });

  const runCloudSync = useCallback(
    async (userId: string) => {
      if (userId.startsWith('quick-test-')) return;
      dispatch(setSyncStatus({ status: 'syncing' }));
      try {
        const res = await syncLocalProgressWithCloud(userId, dispatch);
        if (res.ok) {
          dispatch(setSyncStatus({ status: 'synced', lastSyncedAt: res.syncedAt ?? new Date().toISOString() }));
        } else {
          dispatch(setSyncStatus({ status: 'idle' }));
        }
      } catch (err) {
        console.warn('Cloud progress sync failed:', err);
        dispatch(setSyncStatus({ status: 'error' }));
      }
    },
    [dispatch],
  );

  useEffect(() => {
    const savedQuickUser = loadQuickTestUser();
    if (!supabase) {
      if (savedQuickUser) {
        dispatch(setAuthUser({ user: savedQuickUser, mode: 'guest' }));
      } else {
        dispatch(setGuestSession({ mode: 'guest' }));
      }
      return;
    }

    let cancelled = false;
    if (savedQuickUser) {
      dispatch(setAuthUser({ user: savedQuickUser, mode: 'supabase' }));
    } else {
      dispatch(setAuthLoading({ mode: 'supabase' }));
    }

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        const sessionUser = data.session?.user;
        if (!sessionUser) {
          const activeQuick = loadQuickTestUser();
          if (activeQuick) {
            dispatch(setAuthUser({ user: activeQuick, mode: 'supabase' }));
          } else {
            setAuthPresenceCookie(false);
            dispatch(setGuestSession({ mode: 'supabase' }));
          }
          return;
        }
        setAuthPresenceCookie(true);
        const profile = await fetchProfileForUser(sessionUser.id, sessionUser.email || '');
        if (!cancelled && profile) {
          dispatch(setAuthUser({ user: profile, mode: 'supabase' }));
          void runCloudSync(profile.id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const activeQuick = loadQuickTestUser();
          if (activeQuick) {
            dispatch(setAuthUser({ user: activeQuick, mode: 'supabase' }));
          } else {
            dispatch(setGuestSession({ mode: 'supabase' }));
          }
        }
      });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (!session?.user) {
        const activeQuick = loadQuickTestUser();
        if (activeQuick) {
          dispatch(setAuthUser({ user: activeQuick, mode: 'supabase' }));
        } else {
          setAuthPresenceCookie(false);
          dispatch(setGuestSession({ mode: 'supabase' }));
        }
        return;
      }
      setAuthPresenceCookie(true);
      const profile = await fetchProfileForUser(session.user.id, session.user.email || '');
      if (!cancelled && profile) {
        dispatch(setAuthUser({ user: profile, mode: 'supabase' }));
        if (event === 'SIGNED_IN') {
          void runCloudSync(profile.id);
        }
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [dispatch, runCloudSync]);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (!supabase) {
        return { ok: false, error: 'Chưa cấu hình kết nối Supabase.' };
      }

      const now = Date.now();
      if (failedAttemptsRef.current.lockedUntil > now) {
        const waitSec = Math.ceil((failedAttemptsRef.current.lockedUntil - now) / 1000);
        const lockMsg = `Nhập sai quá ${MAX_FAILED_ATTEMPTS} lần. Vui lòng đợi ${waitSec} giây trước khi thử lại.`;
        dispatch(setAuthError(lockMsg));
        return { ok: false, error: lockMsg };
      }

      saveQuickTestUser(null);
      dispatch(setAuthError(null));
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        failedAttemptsRef.current.count += 1;
        if (failedAttemptsRef.current.count >= MAX_FAILED_ATTEMPTS) {
          failedAttemptsRef.current.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
          failedAttemptsRef.current.count = 0;
        }
        const msg = translateSupabaseAuthError(error.message);
        dispatch(setAuthError(msg));
        return { ok: false, error: msg };
      }

      failedAttemptsRef.current = { count: 0, lockedUntil: 0 };
      setAuthPresenceCookie(true);

      if (data.user) {
        const profile = await fetchProfileForUser(data.user.id, data.user.email || email.trim());
        if (profile) {
          dispatch(setAuthUser({ user: profile, mode: 'supabase' }));
          return { ok: true, user: profile };
        }
      }

      return { ok: true };
    },
    [dispatch],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string): Promise<AuthActionResult> => {
      if (!supabase) {
        return { ok: false, error: 'Chưa cấu hình kết nối Supabase.' };
      }
      saveQuickTestUser(null);
      dispatch(setAuthError(null));
      const cleanName = displayName.trim().slice(0, 80);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: cleanName,
          },
        },
      });
      if (error) {
        const msg = translateSupabaseAuthError(error.message);
        dispatch(setAuthError(msg));
        return { ok: false, error: msg };
      }

      const needsEmailConfirmation = Boolean(data.user && !data.session);
      if (data.session?.user) {
        setAuthPresenceCookie(true);
        const profile = await fetchProfileForUser(
          data.session.user.id,
          data.session.user.email || email.trim(),
        );
        if (profile) {
          dispatch(setAuthUser({ user: profile, mode: 'supabase' }));
          return { ok: true, user: profile, needsEmailConfirmation: false };
        }
      }

      return {
        ok: true,
        needsEmailConfirmation,
      };
    },
    [dispatch],
  );

  const quickLoginAsRole = useCallback(
    (role: AccountRole): AuthUser => {
      const preset = QUICK_TEST_ACCOUNTS.find((item) => item.role === role) ?? QUICK_TEST_ACCOUNTS[0];
      const testUser: AuthUser = {
        id: `quick-test-${preset.role.toLowerCase()}`,
        email: preset.email,
        displayName: preset.displayName,
        role: preset.role,
      };
      if (!isQuickTestAllowed()) {
        return testUser;
      }
      saveQuickTestUser(testUser);
      dispatch(setAuthError(null));
      dispatch(setAuthUser({ user: testUser, mode: isSupabaseConfigured ? 'supabase' : 'guest' }));
      return testUser;
    },
    [dispatch],
  );

  const quickSignInWithPreset = useCallback(
    async (role: AccountRole): Promise<AuthActionResult> => {
      if (!isQuickTestAllowed()) {
        return {
          ok: false,
          error: 'Chế độ đăng nhập nhanh chỉ cho phép trên môi trường Local / Dev.',
        };
      }

      const preset = QUICK_TEST_ACCOUNTS.find((item) => item.role === role) ?? QUICK_TEST_ACCOUNTS[0];
      if (!supabase) {
        const fallbackUser = quickLoginAsRole(role);
        return { ok: true, user: fallbackUser };
      }

      dispatch(setAuthError(null));
      const signInRes = await supabase.auth.signInWithPassword({
        email: preset.email,
        password: preset.password,
      });

      if (!signInRes.error && signInRes.data.user) {
        setAuthPresenceCookie(true);
        const profile = await fetchProfileForUser(signInRes.data.user.id, preset.email);
        const effectiveUser: AuthUser = {
          id: profile?.id ?? signInRes.data.user.id,
          email: preset.email,
          displayName: profile?.displayName ?? preset.displayName,
          role: preset.role,
        };
        saveQuickTestUser(effectiveUser);
        dispatch(setAuthUser({ user: effectiveUser, mode: 'supabase' }));
        return { ok: true, user: effectiveUser };
      }

      const signUpRes = await supabase.auth.signUp({
        email: preset.email,
        password: preset.password,
        options: {
          data: {
            display_name: preset.displayName,
          },
        },
      });

      if (!signUpRes.error && signUpRes.data.user) {
        setAuthPresenceCookie(true);
        const effectiveUser: AuthUser = {
          id: signUpRes.data.user.id,
          email: preset.email,
          displayName: preset.displayName,
          role: preset.role,
        };
        saveQuickTestUser(effectiveUser);
        dispatch(setAuthUser({ user: effectiveUser, mode: 'supabase' }));
        return {
          ok: true,
          user: effectiveUser,
          needsEmailConfirmation: Boolean(signUpRes.data.user && !signUpRes.data.session),
        };
      }

      const fallbackUser = quickLoginAsRole(role);
      return { ok: true, user: fallbackUser };
    },
    [dispatch, quickLoginAsRole],
  );

  const signOut = useCallback(async () => {
    saveQuickTestUser(null);
    setAuthPresenceCookie(false);
    if (supabase) {
      await supabase.auth.signOut();
    }
    dispatch(setGuestSession({ mode: isSupabaseConfigured ? 'supabase' : 'guest' }));
  }, [dispatch]);

  const currentUserId = auth.user?.id;

  const syncNow = useCallback(async () => {
    if (!currentUserId) return;
    await runCloudSync(currentUserId);
  }, [currentUserId, runCloudSync]);

  const value: AuthContextValue = {
    ...auth,
    isSupabaseConfigured,
    signInWithEmail,
    signUpWithEmail,
    quickLoginAsRole,
    quickSignInWithPreset,
    signOut,
    syncNow,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
