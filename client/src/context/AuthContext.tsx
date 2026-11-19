import React, { useCallback, useEffect, useRef } from 'react';
import { broadcastUserProgressReset } from '../hooks/useUserProgress';
import { clearInMemoryAccountData } from '../services/cloudProgressWriter';
import { clearLastPracticeTarget } from '../services/lastPracticeService';
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
import {
  cacheRoadmapCompletedSteps,
  cacheStudyLevel,
  loadCachedStudyLevel,
  persistStudyLevel,
  purgeGuestStudyLevelStorage,
  sanitizeCompletedRoadmapSteps,
  sanitizeStudyLevel,
  type StudyLevel,
} from '../services/userLevelService';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setAuthError,
  setAuthLoading,
  setAuthUser,
  setAuthUserStudyLevel,
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
  translateSupabaseAuthError,
  type AuthActionResult,
  type AuthContextValue,
} from './auth-context';

const LEGACY_QUICK_TEST_STORAGE_KEY = 'nihongo_quick_test_user_v1';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30_000;

const normalizeRole = (raw?: string | null): AccountRole => {
  if (raw === 'SUPER_ADMIN' || raw === 'ADMIN' || raw === 'USER') return raw;
  return 'USER';
};

function purgeLegacyQuickTestStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.removeItem(LEGACY_QUICK_TEST_STORAGE_KEY);
  } catch {
    // Ignore
  }
  try {
    window.sessionStorage?.removeItem(LEGACY_QUICK_TEST_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

function extractMetadataDisplayName(meta?: Record<string, unknown> | null): string {
  if (!meta || typeof meta !== 'object') return '';
  const candidate = meta.display_name || meta.full_name || meta.name;
  return typeof candidate === 'string' ? candidate.trim().slice(0, 80) : '';
}

function extractMetadataStudyLevel(meta?: Record<string, unknown> | null): StudyLevel | null {
  if (!meta || typeof meta !== 'object') return null;
  return sanitizeStudyLevel(meta.study_level);
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
  metadataStudyLevel: StudyLevel | null = null,
): Promise<AuthUser | null> {
  if (!supabase) return null;

  let data: Record<string, unknown> | null = null;
  const fullSelect = await supabase
    .from('profiles')
    .select('id, email, display_name, role, study_level')
    .eq('id', userId)
    .maybeSingle();

  if (fullSelect.error) {
    // Graceful fallback if study_level column hasn't been migrated yet
    const baseSelect = await supabase
      .from('profiles')
      .select('id, email, display_name, role')
      .eq('id', userId)
      .maybeSingle();
    data = (baseSelect.data as Record<string, unknown> | null) ?? null;
  } else {
    data = (fullSelect.data as Record<string, unknown> | null) ?? null;
  }

  const resolvedFallbackName =
    metadataDisplayName || fallbackEmail.split('@')[0] || 'Học viên';

  const profileLevel = sanitizeStudyLevel(data?.study_level);
  const cachedLevel = loadCachedStudyLevel(userId);
  const resolvedLevel = profileLevel ?? metadataStudyLevel ?? cachedLevel ?? null;
  if (resolvedLevel) {
    cacheStudyLevel(resolvedLevel, userId);
  }

  if (data) {
    const profileName =
      typeof data.display_name === 'string' && data.display_name.trim()
        ? data.display_name.trim()
        : resolvedFallbackName;
    return {
      id: String(data.id),
      email: String(data.email || fallbackEmail),
      displayName: profileName,
      role: normalizeRole(typeof data.role === 'string' ? data.role : null),
      studyLevel: resolvedLevel,
    };
  }

  return {
    id: userId,
    email: fallbackEmail,
    displayName: resolvedFallbackName,
    role: 'USER',
    studyLevel: resolvedLevel,
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
      clearLastPracticeTarget();
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
        console.warn('Progress sync failed:', err);
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
    purgeLegacyQuickTestStorage();
    purgeGuestStudyLevelStorage();
    purgeAllLocalLearningData();
    const oauthCallbackError = consumePendingOAuthCallbackError();
    const implicitTokens = consumePendingImplicitOAuthTokens();

    if (!supabase) {
      applyGuestSession('guest');
      if (oauthCallbackError) {
        dispatch(setAuthError(translateSupabaseAuthError(oauthCallbackError)));
      }
      return;
    }

    const sbClient = supabase;
    let cancelled = false;
    dispatch(setAuthLoading({ mode: 'supabase' }));

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
          applyGuestSession('supabase');
          restorePendingOAuthError();
          return;
        }
        pendingOAuthErrRef.current = null;
        const meta = sessionUser.user_metadata as Record<string, unknown> | undefined;
        if (meta && Array.isArray(meta.roadmap_completed_steps)) {
          cacheRoadmapCompletedSteps(sanitizeCompletedRoadmapSteps(meta.roadmap_completed_steps), sessionUser.id);
        }
        const profile = await fetchProfileForUser(
          sessionUser.id,
          sessionUser.email || '',
          extractMetadataDisplayName(meta),
          extractMetadataStudyLevel(meta),
        );
        if (!cancelled && profile) {
          applyAuthenticatedSession(profile, 'supabase');
          void runCloudSync(profile.id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          applyGuestSession('supabase');
          restorePendingOAuthError();
        }
      });

    const { data: sub } = sbClient.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (!session?.user) {
        applyGuestSession('supabase');
        if (event === 'INITIAL_SESSION') {
          restorePendingOAuthError();
        } else {
          pendingOAuthErrRef.current = null;
        }
        return;
      }
      pendingOAuthErrRef.current = null;
      const meta = session.user.user_metadata as Record<string, unknown> | undefined;
      const profile = await fetchProfileForUser(
        session.user.id,
        session.user.email || '',
        extractMetadataDisplayName(meta),
        extractMetadataStudyLevel(meta),
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
        return { ok: false, error: 'Dịch vụ đăng nhập hiện tạm thời chưa sẵn sàng.' };
      }

      const now = Date.now();
      if (failedAttemptsRef.current.lockedUntil > now) {
        const waitSec = Math.ceil((failedAttemptsRef.current.lockedUntil - now) / 1000);
        const lockMsg = `Nhập sai quá ${MAX_FAILED_ATTEMPTS} lần. Vui lòng đợi ${waitSec} giây trước khi thử lại.`;
        dispatch(setAuthError(lockMsg));
        return { ok: false, error: lockMsg };
      }

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
        const meta = data.user.user_metadata as Record<string, unknown> | undefined;
        const profile = await fetchProfileForUser(
          data.user.id,
          data.user.email || email.trim(),
          extractMetadataDisplayName(meta),
          extractMetadataStudyLevel(meta),
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
        return { ok: false, error: 'Dịch vụ đăng ký hiện tạm thời chưa sẵn sàng.' };
      }
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
        const meta = data.session.user.user_metadata as Record<string, unknown> | undefined;
        const profile = await fetchProfileForUser(
          data.session.user.id,
          data.session.user.email || email.trim(),
          cleanName,
          extractMetadataStudyLevel(meta),
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
      return { ok: false, error: 'Đăng nhập bằng Google hiện tạm thời chưa khả dụng.' };
    }
    pendingOAuthErrRef.current = null;
    dispatch(setAuthError(null));

    if (supabasePublicUrl && supabasePublicAnonKey) {
      try {
        const settingsRes = await fetch(`${supabasePublicUrl}/auth/v1/settings`, {
          headers: { apikey: supabasePublicAnonKey },
        });
        if (settingsRes.ok) {
          const settingsJson = (await settingsRes.json()) as { external?: { google?: boolean } };
          if (settingsJson.external && settingsJson.external.google === false) {
            const msg =
              'Đăng nhập bằng Google hiện đang tạm tắt. Vui lòng sử dụng Email và mật khẩu bên dưới.';
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

  const signOut = useCallback(async () => {
    purgeLegacyQuickTestStorage();
    purgeGuestStudyLevelStorage();
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

  const updateStudyLevel = useCallback(
    async (level: StudyLevel) => {
      if (!currentUserId) return;
      dispatch(setAuthUserStudyLevel(level));
      await persistStudyLevel(level, currentUserId);
    },
    [currentUserId, dispatch],
  );

  const syncNow = useCallback(async () => {
    if (!currentUserId) return;
    await runCloudSync(currentUserId);
  }, [currentUserId, runCloudSync]);

  const studyLevel: StudyLevel | null = auth.user ? (auth.user.studyLevel ?? null) : null;

  const value: AuthContextValue = {
    ...auth,
    isSupabaseConfigured,
    studyLevel,
    updateStudyLevel,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    syncNow,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
