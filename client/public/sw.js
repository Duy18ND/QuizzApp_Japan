/* Nihongo 問 — iOS 16.4+ APNs, Android FCM & Desktop WNS Web Push Service Worker */

const seenMessageDeliveryKeys = new Set();

function recordMessageKeyOnce(key) {
  if (!key) return true;
  if (seenMessageDeliveryKeys.has(key)) return false;
  seenMessageDeliveryKeys.add(key);
  if (seenMessageDeliveryKeys.size > 200) {
    const first = seenMessageDeliveryKeys.values().next().value;
    if (first) seenMessageDeliveryKeys.delete(first);
  }
  return true;
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function buildNotificationOptions(payload) {
  const data = payload || {};
  const targetUrl = data.url || './#/vocabulary/review';
  const deliveryKey = data.deliveryKey || data.tag || 'nihongo-study-reminder';
  return {
    body:
      data.body ||
      'Đã đến giờ học tiếng Nhật hôm nay! Dành 15 phút ôn Kanji, Từ vựng và Ngữ pháp nhé.',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200],
    // Using a deterministic `tag` with `renotify: false` deduplicates notifications at the OS level
    // while always satisfying iOS WebKit's mandatory `userVisibleOnly: true` showNotification() call.
    tag: deliveryKey,
    renotify: Boolean(data.renotify),
    requireInteraction: Boolean(data.requireInteraction),
    data: {
      url: targetUrl,
      deliveryKey,
      slotId: data.slotId || null,
      slotTime: data.slotTime || null,
      snoozeMinutes: Number(data.snoozeMinutes) || 5,
    },
    actions: [
      { action: 'study_now', title: '📖 Vào học ngay' },
      { action: 'snooze_5m', title: '⏳ Nhắc lại sau 5 phút' },
    ],
  };
}

// CRITICAL FOR iOS 16.4+ HOME SCREEN WEB APPS:
// Every `push` event from APNs MUST call `event.waitUntil(self.registration.showNotification(...))`
// unconditionally. Returning early without calling showNotification() causes iOS WebKit to penalize
// or revoke background push delivery when the PWA is closed or the screen is locked.
self.addEventListener('push', (event) => {
  let payload = {
    title: '⏰ Nhắc học Nihongo 問',
    body: 'Đã đến giờ học của bạn! Bấm để bắt đầu ôn tập ngay.',
    url: './#/vocabulary/review',
    deliveryKey: 'nihongo-push-default',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        payload = { ...payload, ...parsed };
      }
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(
      payload.title || '⏰ Nhắc học Nihongo 問',
      buildNotificationOptions(payload),
    ),
  );
});

self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'SHOW_STUDY_REMINDER') {
    if (msg.deliveryKey && !recordMessageKeyOnce(msg.deliveryKey)) {
      return;
    }
    const title = msg.title || '⏰ Đến giờ học tiếng Nhật (Nihongo 問)';
    event.waitUntil(
      self.registration.showNotification(title, buildNotificationOptions(msg)),
    );
  }
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      let newSubJson = null;
      try {
        const options = event.oldSubscription ? event.oldSubscription.options : null;
        if (options && options.applicationServerKey) {
          const newSub = await self.registration.pushManager.subscribe(options);
          newSubJson = newSub.toJSON();
        }
      } catch {
        // Ignore if re-subscribe requires user gesture
      }

      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        client.postMessage({
          type: 'PUSH_SUBSCRIPTION_CHANGED',
          subscription: newSubJson,
        });
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  const targetUrl = data.url || './#/vocabulary/review';
  notification.close();

  if (event.action === 'snooze_5m') {
    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            client.postMessage({
              type: 'SNOOZE_STUDY_REMINDER',
              minutes: Number(data.snoozeMinutes) || 5,
            });
          }
        }),
    );
    return;
  }

  // Open/focus study page WITHOUT auto-completing the study streak.
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'STUDY_REMINDER_OPENED',
            url: targetUrl,
            slotId: data.slotId || null,
          });
        }
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl).catch(() => {});
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});
