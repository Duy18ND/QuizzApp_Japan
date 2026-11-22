import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { StudyLevel } from '../../services/userLevelService';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'GUEST';
export type AccountRole = Exclude<UserRole, 'GUEST'>;

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: AccountRole;
  studyLevel?: StudyLevel | null;
  studyTextbookId?: string | null;
}

export interface AuthState {
  status: 'loading' | 'authenticated' | 'guest';
  mode: 'supabase' | 'guest';
  user: AuthUser | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt: string | null;
  error: string | null;
}

const initialState: AuthState = {
  status: 'loading',
  mode: 'guest',
  user: null,
  syncStatus: 'idle',
  lastSyncedAt: null,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthLoading(state, action: PayloadAction<{ mode: 'supabase' | 'guest' }>) {
      state.status = 'loading';
      state.mode = action.payload.mode;
      state.error = null;
    },
    setAuthUser(
      state,
      action: PayloadAction<{ user: AuthUser; mode: 'supabase' | 'guest' }>,
    ) {
      state.status = 'authenticated';
      state.mode = action.payload.mode;
      state.user = action.payload.user;
      state.error = null;
    },
    setGuestSession(state, action: PayloadAction<{ mode: 'supabase' | 'guest' }>) {
      state.status = 'guest';
      state.mode = action.payload.mode;
      state.user = null;
      state.syncStatus = 'idle';
      state.error = null;
    },
    setAuthError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setAuthUserStudyLevel(state, action: PayloadAction<StudyLevel | null>) {
      if (state.user) {
        state.user.studyLevel = action.payload;
      }
    },
    setAuthUserStudyContext(
      state,
      action: PayloadAction<{ level: StudyLevel | null; textbookId?: string | null }>,
    ) {
      if (state.user) {
        state.user.studyLevel = action.payload.level;
        state.user.studyTextbookId = action.payload.textbookId ?? null;
      }
    },
    setSyncStatus(
      state,
      action: PayloadAction<{
        status: AuthState['syncStatus'];
        lastSyncedAt?: string | null;
      }>,
    ) {
      state.syncStatus = action.payload.status;
      if (action.payload.lastSyncedAt !== undefined) {
        state.lastSyncedAt = action.payload.lastSyncedAt;
      }
    },
  },
});

export const {
  setAuthLoading,
  setAuthUser,
  setGuestSession,
  setAuthError,
  setAuthUserStudyLevel,
  setAuthUserStudyContext,
  setSyncStatus,
} = authSlice.actions;

export default authSlice.reducer;
