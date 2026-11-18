/* Nihongo 問 — Cross-Platform Web Push & Study Reminder Service Worker */

const seenDeliveryKeys = new Set();

function recordDeliveryKeyOnce(key) {
  if (!key) return true;
  if (seenDeliveryKeys.has(key)) return false;
  seenDeliveryKeys.add(key);
  if (seenDeliveryKeys.size > 200) {
    const first = seenDeliveryKeys.values().next().value;
    if (first) seenDeliveryKeys.delete(first);
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

self.addEventListener('push', (event) => {
  let payload = {
    title: '⏰ Nhắc học Nihongo 問',
    body: 'Đã đến giờ học của bạn! Bấm để bắt đầu ôn tập ngay.',
    url: './#/vocabulary/review',
    deliveryKey: '',
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

  if (payload.deliveryKey && !recordDeliveryKeyOnce(payload.deliveryKey)) {
    return;
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
    if (msg.deliveryKey && !recordDeliveryKeyOnce(msg.deliveryKey)) {
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
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
          });
        }
      }),
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
  // Study streak only increments when the user completes an actual study activity or clicks the completion button.
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
