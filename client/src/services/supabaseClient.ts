import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  AUTH_COOKIE_NAME,
  hasAuthPresenceCookie,
  setAuthPresenceCookie,
} from './sessionScope';

export { AUTH_COOKIE_NAME, hasAuthPresenceCookie, setAuthPresenceCookie };

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

export const AUTH_STORAGE_KEY = 'nihonmaster_sb_auth_v1';
export const OAUTH_PENDING_LOGIN_KEY = 'nihonmaster_oauth_login_pending_v1';
const MAX_AUTH_PAYLOAD_BYTES = 32_768;
const UNSAFE_JSON_PATTERN = /"(__proto__|constructor|prototype)"\s*:/;

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

const secureAuthStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      if (raw.length > MAX_AUTH_PAYLOAD_BYTES || UNSAFE_JSON_PATTERN.test(raw)) {
        window.localStorage.removeItem(key);
        setAuthPresenceCookie(false);
        return null;
      }
      return raw;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      if (typeof value !== 'string' || value.length > MAX_AUTH_PAYLOAD_BYTES || UNSAFE_JSON_PATTERN.test(value)) {
        return;
      }
      window.localStorage.setItem(key, value);
      setAuthPresenceCookie(true);
    } catch {
      // Ignore storage quota errors
    }
  },
  removeItem(key: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.removeItem(key);
      setAuthPresenceCookie(false);
    } catch {
      // Ignore storage errors
    }
  },
};

export const isSupabaseConfigured = Boolean(rawUrl && rawAnonKey && isValidHttpUrl(rawUrl));
export const supabasePublicUrl = isSupabaseConfigured ? rawUrl.replace(/\/+$/, '') : '';
export const supabasePublicAnonKey = isSupabaseConfigured ? rawAnonKey : '';

export interface PendingImplicitOAuthTokens {
  access_token: string;
  refresh_token: string;
}

let pendingImplicitOAuthTokens: PendingImplicitOAuthTokens | null = null;
let pendingOAuthCallbackError: string | null = null;

export function markOAuthLoginPending(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem(OAUTH_PENDING_LOGIN_KEY, '1');
  } catch {
    // Ignore storage quota/access errors
  }
}

export function consumeOAuthLoginPending(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = window.sessionStorage?.getItem(OAUTH_PENDING_LOGIN_KEY);
    if (val === '1') {
      window.sessionStorage?.removeItem(OAUTH_PENDING_LOGIN_KEY);
      return true;
    }
  } catch {
    // Ignore storage access errors
  }
  return false;
}

/**
 * HashRouter (`#/`) uses `window.location.hash` for routes, so an implicit OAuth
 * callback returning `#access_token=...` or `#error=...` would trigger a 404 route
 * unless parsed and normalized before HashRouter mounts.
 */
export function interceptOAuthCallbackForHashRouter(): void {
  if (typeof window === 'undefined' || !window.location) return;
  try {
    const currentUrl = new URL(window.location.href);
    const rawHash = currentUrl.hash.startsWith('#') ? currentUrl.hash.slice(1) : currentUrl.hash;
    const isHashOAuthFragment =
      Boolean(rawHash) &&
      !rawHash.startsWith('/') &&
      /(^|&)(access_token|refresh_token|error|error_description)=/.test(rawHash);

    const hasPkceCode = currentUrl.searchParams.has('code');
    if (hasPkceCode) {
      markOAuthLoginPending();
    }

    const searchError =
      currentUrl.searchParams.get('error_description') || currentUrl.searchParams.get('error');

    if (!isHashOAuthFragment && !searchError) {
      return;
    }

    if (isHashOAuthFragment) {
      const hashParams = new URLSearchParams(rawHash);
      const hashError = hashParams.get('error_description') || hashParams.get('error');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (hashError) {
        pendingOAuthCallbackError = hashError;
      } else if (accessToken && refreshToken) {
        markOAuthLoginPending();
        pendingImplicitOAuthTokens = {
          access_token: accessToken,
          refresh_token: refreshToken,
        };
      }

      const nextHash = hashError ? '#/login' : '#/';
      window.history.replaceState(
        window.history.state,
        '',
        `${currentUrl.pathname}${currentUrl.search}${nextHash}`,
      );
    }

    if (searchError && !pendingOAuthCallbackError) {
      pendingOAuthCallbackError = searchError;
    }

    if (searchError) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('error');
      cleanUrl.searchParams.delete('error_code');
      cleanUrl.searchParams.delete('error_description');
      window.history.replaceState(
        window.history.state,
        '',
        `${cleanUrl.pathname}${cleanUrl.search}#/login`,
      );
    }
  } catch {
    // Ignore malformed callback URL fragments
  }
}

export function consumePendingImplicitOAuthTokens(): PendingImplicitOAuthTokens | null {
  const tokens = pendingImplicitOAuthTokens;
  pendingImplicitOAuthTokens = null;
  return tokens;
}

export function consumePendingOAuthCallbackError(): string | null {
  const err = pendingOAuthCallbackError;
  pendingOAuthCallbackError = null;
  return err;
}

interceptOAuthCallbackForHashRouter();

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawAnonKey, {
      auth: {
        storageKey: AUTH_STORAGE_KEY,
        storage: secureAuthStorage,
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
