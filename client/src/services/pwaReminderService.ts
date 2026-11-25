/**
 * Nihongo 問 — PWA 1-Tap Install, Repeat Notification & Server Web Push (VAPID)
 *
 * - Registers `./sw.js` for 1-tap Home Screen installation + background Push events.
 * - Subscribes devices to Web Push via `VITE_VAPID_PUBLIC_KEY` and syncs schedule/completion
 *   status to Supabase `public.user_push_subscriptions` so notifications fire even when the
 *   user swipes the app closed from Recent Apps — and automatically stop once today's Stage
 *   + 10–15 minute online target is completed.
 */

import { DEFAULT_TIMEZONE } from './notificationService';
import { isSupabaseAccountUuid } from './sessionScope';
import { supabase } from './supabaseClient';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

export interface WebPushSchedulePayload {
  userId: string;
  notificationsEnabled: boolean;
  reminderTime: string;
  repeatIntervalMinutes: number;
  studyWeekdays: number[];
  dailyMinutesTarget: number;
  lastCompletedDate: string | null;
  activeStageLabel?: string;
}

export const PWA_INSTALL_CHANGE_EVENT = 'nihonmaster:pwa-install-change';

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let swInitialized = false;

export function getVapidPublicKey(): string {
  return (import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();
}

export function isWebPushConfigured(): boolean {
  return getVapidPublicKey().length >= 32;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    nav.standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function hasNativeInstallPrompt(): boolean {
  return deferredInstallPrompt !== null;
}

export function initPwaInstallAndServiceWorker(): void {
  if (typeof window === 'undefined' || swInitialized) return;
  swInitialized = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent(PWA_INSTALL_CHANGE_EVENT));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent(PWA_INSTALL_CHANGE_EVENT));
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.register('./sw.js').catch(() => {
        // Non-blocking: dev or restricted origins still work normally
      });
    });
  }
}

export async function triggerOneTapPwaInstall(): Promise<
  'accepted' | 'dismissed' | 'ios-guide' | 'already-installed' | 'unavailable'
> {
  if (isRunningStandalone()) return 'already-installed';
  if (deferredInstallPrompt) {
    const promptEvt = deferredInstallPrompt;
    deferredInstallPrompt = null;
    await promptEvt.prompt();
    const choice = await promptEvt.userChoice;
    window.dispatchEvent(new CustomEvent(PWA_INSTALL_CHANGE_EVENT));
    return choice.outcome;
  }
  if (isIosDevice()) return 'ios-guide';
  return 'unavailable';
}

export type BrowserNotificationState = NotificationPermission | 'unsupported';

export function getBrowserNotificationPermission(): BrowserNotificationState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function isWebPushSubscribedOnDevice(): Promise<boolean> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return Boolean(sub);
  } catch {
    return false;
  }
}

/**
 * Registers or refreshes the device's VAPID Web Push subscription and upserts it to
 * Supabase `public.user_push_subscriptions` so server cron can push even when swiped closed.
 */
export async function subscribeAndSyncWebPush(
  payload: WebPushSchedulePayload,
): Promise<{ ok: boolean; reason?: 'no-vapid' | 'no-sw' | 'denied' | 'no-supabase' | 'error' }> {
  if (!supabase || !isSupabaseAccountUuid(payload.userId)) {
    return { ok: false, reason: 'no-supabase' };
  }
  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) {
    return { ok: false, reason: 'no-vapid' };
  }
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return { ok: false, reason: 'no-sw' };
  }
  if (getBrowserNotificationPermission() !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }
    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      return { ok: false, reason: 'error' };
    }

    const { error } = await supabase.from('user_push_subscriptions').upsert(
      {
        user_id: payload.userId,
        endpoint,
        p256dh,
        auth,
        notifications_enabled: payload.notificationsEnabled,
        reminder_time: payload.reminderTime,
        repeat_interval_minutes: payload.repeatIntervalMinutes,
        study_weekdays: payload.studyWeekdays,
        daily_minutes_target: payload.dailyMinutesTarget,
        last_completed_date: payload.lastCompletedDate,
        active_stage_label: payload.activeStageLabel ?? null,
        timezone: DEFAULT_TIMEZONE,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' },
    );

    return error ? { ok: false, reason: 'error' } : { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/**
 * Syncs schedule settings or today's completion state (`last_completed_date`) to all
 * registered push devices for this user so server-side push stops immediately when done.
 */
export async function syncWebPushScheduleToCloud(
  payload: WebPushSchedulePayload,
): Promise<void> {
  if (!supabase || !isSupabaseAccountUuid(payload.userId)) return;
  try {
    await supabase
      .from('user_push_subscriptions')
      .update({
        notifications_enabled: payload.notificationsEnabled,
        reminder_time: payload.reminderTime,
        repeat_interval_minutes: payload.repeatIntervalMinutes,
        study_weekdays: payload.studyWeekdays,
        daily_minutes_target: payload.dailyMinutesTarget,
        last_completed_date: payload.lastCompletedDate,
        active_stage_label: payload.activeStageLabel ?? null,
        timezone: DEFAULT_TIMEZONE,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', payload.userId);
  } catch {
    // Non-blocking if migration hasn't been executed yet
  }
}

export async function dispatchStudyReminderNotification(payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const targetUrl =
    payload.url || `${window.location.origin}${window.location.pathname}#/roadmap`;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(payload.title, {
          body: payload.body,
          icon: './icons/icon-192.png',
          badge: './icons/icon-192.png',
          tag: payload.tag || 'nihongo-daily-stage-reminder',
          data: { url: targetUrl },
        });
        return true;
      }
    }
    const notif = new Notification(payload.title, {
      body: payload.body,
      icon: './icons/icon-192.png',
      tag: payload.tag || 'nihongo-daily-stage-reminder',
    });
    notif.onclick = () => {
      window.focus();
      window.location.hash = '#/roadmap';
      notif.close();
    };
    return true;
  } catch {
    return false;
  }
}
