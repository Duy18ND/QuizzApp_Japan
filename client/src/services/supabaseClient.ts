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
