/**
 * Nihongo 問 — Auth Session Persistence & Account-Isolated Cache Scope
 *
 * Strict Storage Rules:
 * - Auth session stays persisted (`nihonmaster_sb_auth_v1` + 365-day cookies) across reloads
 *   and browser restarts until the user explicitly clicks `Đăng xuất`.
 * - Quiz answers, wrong words, grammar mistakes, Kanji progress, quiz history, and study progress
 *   are NEVER written to `localStorage` or mistake cookies. Authenticated accounts save directly
 *   to Supabase per `user_id`.
 * - Guests (`userId === null`) never persist progress anywhere.
 */

export const AUTH_COOKIE_NAME = 'nihonmaster_auth_state';
export const ACTIVE_UID_COOKIE_NAME = 'nihonmaster_active_uid';
export const MISTAKE_SESSION_COOKIE_NAME = 'nihonmaster_session_mistakes';
export const ACTIVE_UID_STORAGE_KEY = 'nihonmaster_active_uid_v1';
export const PERSISTENT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 365 days until explicit logout

export const LEGACY_UNSCOPED_PROGRESS_KEYS = [
  'nihonmaster_user_progress',
  'nihonmaster_kanji_progress',
  'nihonmaster_grammar_progress',
  'nihonmaster_grammar_mistakes',
  'nihonmaster_quiz_history',
  'nihonmaster_study_schedule_v1',
  'nihonmaster_online_time_v1',
] as const;

const VALID_UID_REGEX = /^[a-zA-Z0-9._-]{1,96}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let inMemoryActiveUserId: string | null = null;
const sessionChangeListeners = new Set<(userId: string | null) => void>();

export function isValidSessionUserId(raw: unknown): raw is string {
  return typeof raw === 'string' && VALID_UID_REGEX.test(raw.trim());
}

export function isSupabaseAccountUuid(raw: unknown): raw is string {
  return typeof raw === 'string' && UUID_REGEX.test(raw.trim());
}

function getCookieSecureFlag(): string {
  const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  return isHttps ? '; Secure' : '';
}

function readCookieValue(name: string): string | null {
  if (typeof document === 'undefined' || typeof document.cookie !== 'string') return null;
  const prefix = `${name}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }
  return null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return;
  try {
    const secureFlag = getCookieSecureFlag();
    document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secureFlag}`;
  } catch {
    // Ignore cookie write errors in restricted environments
  }
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  try {
    const secureFlag = getCookieSecureFlag();
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`;
  } catch {
    // Ignore
  }
}

function hasBackingAuthSessionToken(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const hasSupabase = Boolean(window.localStorage?.getItem('nihonmaster_sb_auth_v1'));
    const hasQuickLocal = Boolean(window.localStorage?.getItem('nihongo_quick_test_user_v1'));
    const hasQuickSession = Boolean(window.sessionStorage?.getItem('nihongo_quick_test_user_v1'));
    return hasSupabase || hasQuickLocal || hasQuickSession;
  } catch {
    return false;
  }
}

export function setAuthPresenceCookie(
  active: boolean,
  maxAgeSeconds = PERSISTENT_COOKIE_MAX_AGE,
): void {
  if (active) {
    writeCookie(AUTH_COOKIE_NAME, 'authenticated', maxAgeSeconds);
  } else {
    deleteCookie(AUTH_COOKIE_NAME);
  }
}

export function hasAuthPresenceCookie(): boolean {
  return readCookieValue(AUTH_COOKIE_NAME) === 'authenticated';
}

/**
 * Returns the currently signed-in user ID, or `null` when browsing as an unauthenticated Guest.
 */
export function getActiveAuthenticatedUserId(): string | null {
  if (isValidSessionUserId(inMemoryActiveUserId)) {
    return inMemoryActiveUserId;
  }

  if (typeof window === 'undefined') return null;

  if (!hasBackingAuthSessionToken()) {
    return null;
  }

  try {
    const fromStorage = window.localStorage?.getItem(ACTIVE_UID_STORAGE_KEY);
    if (isValidSessionUserId(fromStorage)) {
      inMemoryActiveUserId = fromStorage.trim();
      return inMemoryActiveUserId;
    }
  } catch {
    // Ignore
  }

  const fromCookie = readCookieValue(ACTIVE_UID_COOKIE_NAME);
  if (fromCookie) {
    try {
      const decoded = decodeURIComponent(fromCookie);
      if (isValidSessionUserId(decoded)) {
        inMemoryActiveUserId = decoded.trim();
        return inMemoryActiveUserId;
      }
    } catch {
      // Ignore malformed cookie
    }
  }

  return null;
}

/**
 * Binds or clears the active authenticated session (persisting across browser restarts via
 * auth token + 365-day auth cookies until explicit logout).
 */
export function setActiveAuthenticatedUserId(userId: string | null): void {
  const cleanUid = isValidSessionUserId(userId) ? userId.trim() : null;
  const changed = inMemoryActiveUserId !== cleanUid;
  inMemoryActiveUserId = cleanUid;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (cleanUid) {
        window.localStorage.setItem(ACTIVE_UID_STORAGE_KEY, cleanUid);
      } else {
        window.localStorage.removeItem(ACTIVE_UID_STORAGE_KEY);
      }
    } catch {
      // Ignore storage quota errors
    }
  }

  if (cleanUid) {
    setAuthPresenceCookie(true, PERSISTENT_COOKIE_MAX_AGE);
    writeCookie(ACTIVE_UID_COOKIE_NAME, encodeURIComponent(cleanUid), PERSISTENT_COOKIE_MAX_AGE);
  } else {
    setAuthPresenceCookie(false);
    deleteCookie(ACTIVE_UID_COOKIE_NAME);
  }

  // Ensure legacy local mistake cookie is always scrubbed
  deleteCookie(MISTAKE_SESSION_COOKIE_NAME);

  if (changed) {
    for (const listener of sessionChangeListeners) {
      try {
        listener(cleanUid);
      } catch {
        // Ignore subscriber errors
      }
    }
  }
}

export function onActiveSessionUserChange(listener: (userId: string | null) => void): () => void {
  sessionChangeListeners.add(listener);
  return () => {
    sessionChangeListeners.delete(listener);
  };
}

/**
 * Removes any legacy or scoped quiz/progress/mistake keys from localStorage and clears legacy mistake cookies
 * so all learning data lives exclusively in Supabase per account + active session memory.
 */
export function purgeAllLocalLearningData(): void {
  deleteCookie(MISTAKE_SESSION_COOKIE_NAME);
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      const matchesLearningPrefix = LEGACY_UNSCOPED_PROGRESS_KEYS.some(
        (prefix) => k === prefix || k.startsWith(`${prefix}::`),
      );
      if (matchesLearningPrefix) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      window.localStorage.removeItem(k);
    }
    // Also check known legacy keys directly in case Storage mock omits key()/length
    for (const prefix of LEGACY_UNSCOPED_PROGRESS_KEYS) {
      window.localStorage.removeItem(prefix);
    }
  } catch {
    // Ignore storage access errors
  }
}

export function clearLegacyUnscopedProgress(): void {
  purgeAllLocalLearningData();
}
