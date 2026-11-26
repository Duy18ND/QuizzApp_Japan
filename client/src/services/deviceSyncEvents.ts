/** Fired by every writer of device-cached learning data; deviceSyncService uploads it. */
export const DEVICE_DATA_CHANGED_EVENT = 'nihonmaster:device-data-changed';

export function notifyDeviceDataChanged(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(DEVICE_DATA_CHANGED_EVENT));
  }
}

export const UI_MARKS_KEY = 'nihonmaster_ui_marks_v1';

export type UiChoiceName = 'theme' | 'app' | 'voice';

/** Call when the user changes a setting: the latest choice wins across devices. */
export function markUiChoice(name: UiChoiceName): void {
  try {
    const marks = JSON.parse(window.localStorage.getItem(UI_MARKS_KEY) ?? '{}') as Record<string, number>;
    marks[name] = Date.now();
    window.localStorage.setItem(UI_MARKS_KEY, JSON.stringify(marks));
  } catch {
    // Storage blocked: the setting still applies on this device
  }
  notifyDeviceDataChanged();
}

export const HIGH_SCORE_KEY = 'nihonmaster_minigame_highscores_v1';
export const HIGH_SCORE_SYNC_EVENT = 'nihonmaster:minigame-highscores-sync';
