// Nihongo 問 — PWA Service Worker (Installability + Background Web Push + Click Routing)
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Background Web Push handler — wakes up on iOS 16.4+ PWA & Android even when swiped closed
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Nihongo 問 · Đến giờ học tiếng Nhật!',
    body: 'Vào mở Màn hôm nay (tối thiểu 10–15 phút) để giữ chuỗi Streak và tắt nhắc.',
    url: './#/roadmap/stages',
    tag: 'nihongo-daily-stage-reminder',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        payload = {
          title: parsed.title || payload.title,
          body: parsed.body || payload.body,
          url: parsed.url || payload.url,
          tag: parsed.tag || payload.tag,
        };
      }
    } catch {
      const text = event.data.text();
      if (text) payload.body = text;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: payload.tag,
      renotify: true,
      vibrate: [180, 90, 180],
      data: { url: payload.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || './#/roadmap/stages';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            try {
              client.navigate(targetUrl);
            } catch {
              // Ignore cross-scope navigation errors
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
