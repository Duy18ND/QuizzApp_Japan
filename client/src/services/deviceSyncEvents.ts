/** Fired by every writer of device-cached learning data; deviceSyncService uploads it. */
export const DEVICE_DATA_CHANGED_EVENT = 'nihonmaster:device-data-changed';

export function notifyDeviceDataChanged(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(DEVICE_DATA_CHANGED_EVENT));
  }
}

export const HIGH_SCORE_KEY = 'nihonmaster_minigame_highscores_v1';
export const HIGH_SCORE_SYNC_EVENT = 'nihonmaster:minigame-highscores-sync';
