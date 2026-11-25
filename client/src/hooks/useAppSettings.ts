import { useCallback, useEffect, useState } from 'react';

export type TtsGenderPref = 'auto' | 'female' | 'male';

export interface AppSettings {
  ttsRate: number;
  ttsAutoPlay: boolean;
  /** Optional specific OS SpeechSynthesisVoice.voiceURI (empty = auto) */
  ttsVoiceUri: string;
  /** Preferred voice gender when ttsVoiceUri is empty */
  ttsGenderPref: TtsGenderPref;
}

export const SETTINGS_STORAGE_KEY = 'nihonmaster_settings';
const SETTINGS_SYNC_EVENT = 'nihonmaster:settings-sync';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ttsRate: 1.0,
  ttsAutoPlay: true,
  ttsVoiceUri: '',
  ttsGenderPref: 'auto',
};

export function sanitizeAppSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_APP_SETTINGS;
  }
  const obj = raw as Record<string, unknown>;
  const rawRate = typeof obj.ttsRate === 'number' && Number.isFinite(obj.ttsRate) ? obj.ttsRate : 1.0;
  const ttsRate = Math.max(0.6, Math.min(1.5, Number(rawRate.toFixed(2))));
  const ttsAutoPlay = typeof obj.ttsAutoPlay === 'boolean' ? obj.ttsAutoPlay : true;
  const ttsVoiceUri = typeof obj.ttsVoiceUri === 'string' ? obj.ttsVoiceUri.trim() : '';
  const ttsGenderPref: TtsGenderPref =
    obj.ttsGenderPref === 'female' || obj.ttsGenderPref === 'male' ? obj.ttsGenderPref : 'auto';
  return { ttsRate, ttsAutoPlay, ttsVoiceUri, ttsGenderPref };
}

export function loadAppSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_APP_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    return sanitizeAppSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(next: AppSettings): void {
  const clean = sanitizeAppSettings(next);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // ignore quota / private mode storage errors
  }
  window.dispatchEvent(new CustomEvent<AppSettings>(SETTINGS_SYNC_EVENT, { detail: clean }));
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());

  useEffect(() => {
    const onSync = (event: Event) => {
      const custom = event as CustomEvent<AppSettings>;
      setSettings(custom.detail ? sanitizeAppSettings(custom.detail) : loadAppSettings());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === SETTINGS_STORAGE_KEY) {
        setSettings(loadAppSettings());
      }
    };

    window.addEventListener(SETTINGS_SYNC_EVENT, onSync);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SETTINGS_SYNC_EVENT, onSync);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    const latest = loadAppSettings();
    const next = sanitizeAppSettings({ ...latest, ...patch });
    saveAppSettings(next);
    setSettings(next);
  }, []);

  return {
    settings,
    updateSettings,
  };
}
