import React, { useCallback, useEffect, useRef } from 'react';
import { broadcastUserProgressReset } from '../hooks/useUserProgress';
import { clearInMemoryAccountData } from '../services/cloudProgressWriter';
import {
  deriveClientPasswordHash,
  PASSWORD_HASH_SCHEME,
} from '../services/passwordHash';
import { syncLocalProgressWithCloud } from '../services/progressSyncService';
import {
  isSupabaseAccountUuid,
  purgeAllLocalLearningData,
  setActiveAuthenticatedUserId,
} from '../services/sessionScope';
import {
  consumeOAuthLoginPending,
  consumePendingImplicitOAuthTokens,
  consumePendingOAuthCallbackError,
  isSupabaseConfigured,
  markOAuthLoginPending,
  supabase,
  supabasePublicAnonKey,
  supabasePublicUrl,
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
import { reloadGrammarFromSession } from '../store/slices/grammarProgressSlice';
import { reloadKanjiFromSession } from '../store/slices/kanjiSlice';
import { reloadMistakesFromSession } from '../store/slices/mistakeSlice';
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

function parseValidatedQuickPayload(raw: string | null): AuthUser | null {
  if (!raw || raw.length > 2048) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SignedQuickTestPayload>;
    const candidate = parsed?.user;
    if (
      !candidate ||
      typeof candidate.id !== 'string' ||
      typeof candidate.email !== 'string' ||
      typeof parsed.sig !== 'string'
    ) {
      return null;
    }

    const whitelisted = QUICK_TEST_ACCOUNTS.find(
      (preset) =>
        preset.email.toLowerCase() === candidate.email.toLowerCase() &&
        preset.role === candidate.role,
    );
    if (!whitelisted) {
      return null;
    }

    const cleanUser: AuthUser = {
      id: candidate.id,
      email: whitelisted.email,
      displayName: whitelisted.displayName,
      role: whitelisted.role,
    };

    if (computeQuickChecksum(cleanUser) !== parsed.sig) {
      return null;
    }

    return cleanUser;
  } catch {
    return null;
  }
}

function clearQuickTestStorages(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.removeItem(QUICK_TEST_STORAGE_KEY);
  } catch {
    // Ignore
  }
  try {
    window.sessionStorage?.removeItem(QUICK_TEST_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

function loadQuickTestUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  if (!isQuickTestAllowed()) {
    clearQuickTestStorages();
    return null;
  }

  // Enforce anti-tampering strictly across both sessionStorage and localStorage
  try {
    const rawSession = window.sessionStorage?.getItem(QUICK_TEST_STORAGE_KEY);
    if (rawSession !== null && rawSession !== undefined) {
      const validated = parseValidatedQuickPayload(rawSession);
      if (!validated) {
        clearQuickTestStorages();
        return null;
      }
      return validated;
    }
  } catch {
    // Ignore
  }

  try {
    const rawLocal = window.localStorage?.getItem(QUICK_TEST_STORAGE_KEY);
    if (rawLocal !== null && rawLocal !== undefined) {
      const validated = parseValidatedQuickPayload(rawLocal);
      if (!validated) {
        clearQuickTestStorages();
        return null;
      }
      return validated;
    }
  } catch {
    // Ignore
  }

  return null;
}

function saveQuickTestUser(user: AuthUser | null): void {
  if (typeof window === 'undefined') return;
  if (!user || !isQuickTestAllowed()) {
    clearQuickTestStorages();
    return;
  }
  const payload: SignedQuickTestPayload = {
    user,
    sig: computeQuickChecksum(user),
    issuedAt: Date.now(),
  };
  const json = JSON.stringify(payload);
  try {
    // Persist across tab closes & browser restarts until explicit signOut()
    window.localStorage?.setItem(QUICK_TEST_STORAGE_KEY, json);
  } catch {
    // Ignore
  }
  try {
    window.sessionStorage?.setItem(QUICK_TEST_STORAGE_KEY, json);
  } catch {
    // Ignore
  }
}

function extractMetadataDisplayName(meta?: Record<string, unknown> | null): string {
  if (!meta || typeof meta !== 'object') return '';
  const candidate = meta.display_name || meta.full_name || meta.name;
  return typeof candidate === 'string' ? candidate.trim().slice(0, 80) : '';
}

/**
 * Signs in with a deterministic PBKDF2-SHA256 client-side password digest first so
 * raw passwords never traverse the wire; transparently upgrades pre-existing unhashed
 * accounts on their first successful legacy login without locking anyone out.
 */
async function signInWithHashedOrLegacyPassword(
  sbClient: NonNullable<typeof supabase>,
  rawEmail: string,
  rawPassword: string,
) {
  const normalizedEmail = rawEmail.trim();
  const hashedPassword = await deriveClientPasswordHash(normalizedEmail, rawPassword);
  const hashedAttempt = await sbClient.auth.signInWithPassword({
    email: normalizedEmail,
    password: hashedPassword,
  });

  if (!hashedAttempt.error || !hashedAttempt.error.message.toLowerCase().includes('invalid login credentials')) {
    return hashedAttempt;
  }

  const legacyAttempt = await sbClient.auth.signInWithPassword({
    email: normalizedEmail,
    password: rawPassword,
  });

  if (!legacyAttempt.error && legacyAttempt.data.user) {
    const scheme = (legacyAttempt.data.user.user_metadata as Record<string, unknown> | undefined)
      ?.password_hash_scheme;
    if (scheme !== PASSWORD_HASH_SCHEME) {
      void sbClient.auth.updateUser({
        password: hashedPassword,
        data: { password_hash_scheme: PASSWORD_HASH_SCHEME },
      });
    }
  }

  return legacyAttempt;
}

async function fetchProfileForUser(
  userId: string,
  fallbackEmail: string,
  metadataDisplayName = '',
): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('profiles')
    .select('id, email, display_name, role')
    .eq('id', userId)
    .maybeSingle();

  const resolvedFallbackName =
    metadataDisplayName || fallbackEmail.split('@')[0] || 'Học viên';

  if (data) {
    const profileName =
      typeof data.display_name === 'string' && data.display_name.trim()
        ? data.display_name.trim()
        : resolvedFallbackName;
    return {
      id: String(data.id),
      email: String(data.email || fallbackEmail),
      displayName: profileName,
      role: normalizeRole(data.role),
    };
  }

  return {
    id: userId,
    email: fallbackEmail,
    displayName: resolvedFallbackName,
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
  const syncInFlightUserRef = useRef<string | null>(null);
  const pendingOAuthErrRef = useRef<string | null>(null);

  const rehydrateScopedStores = useCallback(() => {
    dispatch(reloadKanjiFromSession());
    dispatch(reloadGrammarFromSession());
    dispatch(reloadMistakesFromSession());
  }, [dispatch]);

  const applyAuthenticatedSession = useCallback(
    (user: AuthUser, mode: 'supabase' | 'guest') => {
      purgeAllLocalLearningData();
      setActiveAuthenticatedUserId(user.id);
      rehydrateScopedStores();
      dispatch(setAuthUser({ user, mode }));
    },
    [dispatch, rehydrateScopedStores],
  );

  const applyGuestSession = useCallback(
    (mode: 'supabase' | 'guest') => {
      setActiveAuthenticatedUserId(null);
      purgeAllLocalLearningData();
      clearInMemoryAccountData();
      rehydrateScopedStores();
      broadcastUserProgressReset();
      dispatch(setGuestSession({ mode }));
    },
    [dispatch, rehydrateScopedStores],
  );

  const runCloudSync = useCallback(
    async (userId: string) => {
      if (!isSupabaseAccountUuid(userId)) return;
      if (syncInFlightUserRef.current === userId) return;
      syncInFlightUserRef.current = userId;
      dispatch(setSyncStatus({ status: 'syncing' }));
      try {
        const res = await syncLocalProgressWithCloud(userId, dispatch);
        if (res.ok) {
          dispatch(
            setSyncStatus({
              status: 'synced',
              lastSyncedAt: res.syncedAt ?? new Date().toISOString(),
            }),
          );
        } else {
          dispatch(setSyncStatus({ status: 'idle' }));
        }
      } catch (err) {
        console.warn('Cloud progress sync failed:', err);
        dispatch(setSyncStatus({ status: 'error' }));
      } finally {
        if (syncInFlightUserRef.current === userId) {
          syncInFlightUserRef.current = null;
        }
      }
    },
    [dispatch],
  );

  useEffect(() => {
    purgeAllLocalLearningData();
    const savedQuickUser = loadQuickTestUser();
    const oauthCallbackError = consumePendingOAuthCallbackError();
    const implicitTokens = consumePendingImplicitOAuthTokens();

    if (!supabase) {
      if (savedQuickUser) {
        applyAuthenticatedSession(savedQuickUser, 'guest');
      } else {
        applyGuestSession('guest');
      }
      if (oauthCallbackError) {
        dispatch(setAuthError(translateSupabaseAuthError(oauthCallbackError)));
      }
      return;
    }

    const sbClient = supabase;
    let cancelled = false;
    if (savedQuickUser) {
      applyAuthenticatedSession(savedQuickUser, 'supabase');
    } else {
      dispatch(setAuthLoading({ mode: 'supabase' }));
    }

    if (oauthCallbackError) {
      pendingOAuthErrRef.current = translateSupabaseAuthError(oauthCallbackError);
    }

    const restorePendingOAuthError = () => {
      if (pendingOAuthErrRef.current) {
        dispatch(setAuthError(pendingOAuthErrRef.current));
      }
    };

    const bootstrapSession = async () => {
      if (implicitTokens) {
        const { error: setErr } = await sbClient.auth.setSession(implicitTokens);
        if (setErr && !cancelled) {
          pendingOAuthErrRef.current = translateSupabaseAuthError(setErr.message);
          dispatch(setAuthError(pendingOAuthErrRef.current));
        }
      }
      return sbClient.auth.getSession();
    };

    bootstrapSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        const sessionUser = data.session?.user;
        if (!sessionUser) {
          const activeQuick = loadQuickTestUser();
          if (activeQuick) {
            applyAuthenticatedSession(activeQuick, 'supabase');
          } else {
            applyGuestSession('supabase');
            restorePendingOAuthError();
          }
          return;
        }
        pendingOAuthErrRef.current = null;
        const metaName = extractMetadataDisplayName(
          sessionUser.user_metadata as Record<string, unknown> | undefined,
        );
        const profile = await fetchProfileForUser(
          sessionUser.id,
          sessionUser.email || '',
          metaName,
        );
        if (!cancelled && profile) {
          applyAuthenticatedSession(profile, 'supabase');
          void runCloudSync(profile.id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const activeQuick = loadQuickTestUser();
          if (activeQuick) {
            applyAuthenticatedSession(activeQuick, 'supabase');
          } else {
            applyGuestSession('supabase');
            restorePendingOAuthError();
          }
        }
      });

    const { data: sub } = sbClient.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (!session?.user) {
        const activeQuick = loadQuickTestUser();
        if (activeQuick && event !== 'SIGNED_OUT') {
          applyAuthenticatedSession(activeQuick, 'supabase');
        } else {
          saveQuickTestUser(null);
          applyGuestSession('supabase');
          if (event === 'INITIAL_SESSION') {
            restorePendingOAuthError();
          } else {
            pendingOAuthErrRef.current = null;
          }
        }
        return;
      }
      pendingOAuthErrRef.current = null;
      const metaName = extractMetadataDisplayName(
        session.user.user_metadata as Record<string, unknown> | undefined,
      );
      const profile = await fetchProfileForUser(
        session.user.id,
        session.user.email || '',
        metaName,
      );
      if (!cancelled && profile) {
        applyAuthenticatedSession(profile, 'supabase');
        if (event === 'SIGNED_IN') {
          void runCloudSync(profile.id);
        }
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [applyAuthenticatedSession, applyGuestSession, dispatch, runCloudSync]);

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
      pendingOAuthErrRef.current = null;
      dispatch(setAuthError(null));
      const { data, error } = await signInWithHashedOrLegacyPassword(supabase, email, password);
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

      if (data.user) {
        const metaName = extractMetadataDisplayName(
          data.user.user_metadata as Record<string, unknown> | undefined,
        );
        const profile = await fetchProfileForUser(
          data.user.id,
          data.user.email || email.trim(),
          metaName,
        );
        if (profile) {
          applyAuthenticatedSession(profile, 'supabase');
          void runCloudSync(profile.id);
          return { ok: true, user: profile };
        }
      }

      return { ok: true };
    },
    [applyAuthenticatedSession, dispatch, runCloudSync],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string): Promise<AuthActionResult> => {
      if (!supabase) {
        return { ok: false, error: 'Chưa cấu hình kết nối Supabase.' };
      }
      saveQuickTestUser(null);
      pendingOAuthErrRef.current = null;
      dispatch(setAuthError(null));
      const cleanEmail = email.trim();
      const cleanName = displayName.trim().slice(0, 80);
      const hashedPassword = await deriveClientPasswordHash(cleanEmail, password);
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: hashedPassword,
        options: {
          data: {
            display_name: cleanName,
            password_hash_scheme: PASSWORD_HASH_SCHEME,
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
        const profile = await fetchProfileForUser(
          data.session.user.id,
          data.session.user.email || email.trim(),
          cleanName,
        );
        if (profile) {
          applyAuthenticatedSession(profile, 'supabase');
          void runCloudSync(profile.id);
          return { ok: true, user: profile, needsEmailConfirmation: false };
        }
      }

      return {
        ok: true,
        needsEmailConfirmation,
      };
    },
    [applyAuthenticatedSession, dispatch, runCloudSync],
  );

  const signInWithGoogle = useCallback(async (): Promise<AuthActionResult> => {
    if (!supabase) {
      return { ok: false, error: 'Chưa cấu hình kết nối Supabase.' };
    }
    saveQuickTestUser(null);
    pendingOAuthErrRef.current = null;
    dispatch(setAuthError(null));

    // Pre-check Supabase external provider status so users never get dumped onto a raw 400 JSON page
    if (supabasePublicUrl && supabasePublicAnonKey) {
      try {
        const settingsRes = await fetch(`${supabasePublicUrl}/auth/v1/settings`, {
          headers: { apikey: supabasePublicAnonKey },
        });
        if (settingsRes.ok) {
          const settingsJson = (await settingsRes.json()) as { external?: { google?: boolean } };
          if (settingsJson.external && settingsJson.external.google === false) {
            const msg =
              'Đăng nhập Google đang TẮT trên Supabase Project này (Authentication ➔ Providers ➔ Google = Disabled). Hãy bật Google Provider và nhập Google Client ID / Secret trong Supabase Dashboard, hoặc tự tạo tài khoản / đăng nhập bằng Email ngay bên dưới.';
            dispatch(setAuthError(msg));
            return { ok: false, error: msg };
          }
        }
      } catch {
        // Proceed cleanly to signInWithOAuth if preflight network check cannot reach settings
      }
    }

    const redirectTo =
      typeof window !== 'undefined' && window.location
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;
    markOAuthLoginPending();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
    if (error) {
      consumeOAuthLoginPending();
      const msg = translateSupabaseAuthError(error.message);
      dispatch(setAuthError(msg));
      return { ok: false, error: msg };
    }
    return { ok: true };
  }, [dispatch]);

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
      applyAuthenticatedSession(testUser, isSupabaseConfigured ? 'supabase' : 'guest');
      return testUser;
    },
    [applyAuthenticatedSession, dispatch],
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

      pendingOAuthErrRef.current = null;
      dispatch(setAuthError(null));
      const signInRes = await signInWithHashedOrLegacyPassword(supabase, preset.email, preset.password);

      if (!signInRes.error && signInRes.data.user) {
        const profile = await fetchProfileForUser(signInRes.data.user.id, preset.email, preset.displayName);
        const effectiveUser: AuthUser = {
          id: profile?.id ?? signInRes.data.user.id,
          email: preset.email,
          displayName: profile?.displayName ?? preset.displayName,
          role: preset.role,
        };
        saveQuickTestUser(effectiveUser);
        applyAuthenticatedSession(effectiveUser, 'supabase');
        return { ok: true, user: effectiveUser };
      }

      const hashedPresetPassword = await deriveClientPasswordHash(preset.email, preset.password);
      const signUpRes = await supabase.auth.signUp({
        email: preset.email,
        password: hashedPresetPassword,
        options: {
          data: {
            display_name: preset.displayName,
            password_hash_scheme: PASSWORD_HASH_SCHEME,
          },
        },
      });

      if (!signUpRes.error && signUpRes.data.user) {
        const effectiveUser: AuthUser = {
          id: signUpRes.data.user.id,
          email: preset.email,
          displayName: preset.displayName,
          role: preset.role,
        };
        saveQuickTestUser(effectiveUser);
        applyAuthenticatedSession(effectiveUser, 'supabase');
        return {
          ok: true,
          user: effectiveUser,
          needsEmailConfirmation: Boolean(signUpRes.data.user && !signUpRes.data.session),
        };
      }

      const fallbackUser = quickLoginAsRole(role);
      return { ok: true, user: fallbackUser };
    },
    [applyAuthenticatedSession, dispatch, quickLoginAsRole],
  );

  const signOut = useCallback(async () => {
    saveQuickTestUser(null);
    clearInMemoryAccountData();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore network error on local logout
      }
    }
    applyGuestSession(isSupabaseConfigured ? 'supabase' : 'guest');
  }, [applyGuestSession]);

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
    signInWithGoogle,
    quickLoginAsRole,
    quickSignInWithPreset,
    signOut,
    syncNow,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
