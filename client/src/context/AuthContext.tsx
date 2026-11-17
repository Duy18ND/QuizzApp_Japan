import React, { useCallback, useEffect } from 'react';
import { syncLocalProgressWithCloud } from '../services/progressSyncService';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setAuthError,
  setAuthLoading,
  setAuthUser,
  setGuestSession,
  setSyncStatus,
  type AccountRole,
} from '../store/slices/authSlice';
import { AuthContext, type AuthContextValue } from './auth-context';

const normalizeRole = (raw?: string | null): AccountRole => {
  if (raw === 'SUPER_ADMIN' || raw === 'ADMIN' || raw === 'USER') return raw;
  return 'USER';
};

async function fetchProfileForUser(userId: string, fallbackEmail: string) {
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
    role: 'USER' as AccountRole,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  const runCloudSync = useCallback(
    async (userId: string) => {
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
    if (!supabase) {
      dispatch(setGuestSession({ mode: 'guest' }));
      return;
    }

    let cancelled = false;
    dispatch(setAuthLoading({ mode: 'supabase' }));

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        const sessionUser = data.session?.user;
        if (!sessionUser) {
          dispatch(setGuestSession({ mode: 'supabase' }));
          return;
        }
        const profile = await fetchProfileForUser(sessionUser.id, sessionUser.email || '');
        if (!cancelled && profile) {
          dispatch(setAuthUser({ user: profile, mode: 'supabase' }));
          void runCloudSync(profile.id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          dispatch(setGuestSession({ mode: 'supabase' }));
        }
      });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (!session?.user) {
        dispatch(setGuestSession({ mode: 'supabase' }));
        return;
      }
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
    async (email: string, password: string) => {
      if (!supabase) {
        return { ok: false, error: 'Chưa cấu hình kết nối Supabase.' };
      }
      dispatch(setAuthError(null));
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        dispatch(setAuthError(error.message));
        return { ok: false, error: error.message };
      }
      return { ok: true };
    },
    [dispatch],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!supabase) {
        return { ok: false, error: 'Chưa cấu hình kết nối Supabase.' };
      }
      dispatch(setAuthError(null));
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
        },
      });
      if (error) {
        dispatch(setAuthError(error.message));
        return { ok: false, error: error.message };
      }
      return {
        ok: true,
        needsEmailConfirmation: Boolean(data.user && !data.session),
      };
    },
    [dispatch],
  );

  const signOut = useCallback(async () => {
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
    signOut,
    syncNow,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
