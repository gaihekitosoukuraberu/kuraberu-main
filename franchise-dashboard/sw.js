/**
 * Service Worker for くらべる加盟店管理 PWA
 * Firebase Cloud Messaging (FCM) 対応版
 */

// Firebase SDK をインポート（FCM用）
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const CACHE_NAME = 'kuraberu-v6';
const STATIC_ASSETS = [
  '/franchise-dashboard/index.html',
  '/franchise-dashboard/merchant-portal/login.html',
  '/franchise-dashboard/images/5.png'
];

// Firebase設定（メッセージで受け取る）
let firebaseConfig = null;
let messaging = null;

// インストール時にキャッシュ
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// アクティベート時に古いキャッシュ削除
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ====================================
// Firebase初期化（メッセージで設定を受け取る）
// ====================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    initializeFirebase();
  }

  // V2120: アプリが開かれた時にバッジをクリア
  if (event.data && event.data.type === 'CLEAR_BADGE') {
    clearBadge();
    console.log('[SW] Badge cleared by app open');
  }
});

function initializeFirebase() {
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    console.warn('[SW] Firebase config not provided');
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    messaging = firebase.messaging();

    // バックグラウンドメッセージハンドラー
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] FCM Background message:', payload);

      const notificationTitle = payload.notification?.title || 'くらべる通知';
      // V2120: アクションを明確に
      const actionTitle = payload.data?.actionTitle || '詳細を確認';
      const notificationOptions = {
        body: payload.notification?.body || '新しい通知があります',
        icon: '/franchise-dashboard/images/5.png',
        badge: '/franchise-dashboard/images/5.png',
        tag: 'kuraberu-fcm',
        vibrate: [200, 100, 200],
        requireInteraction: true, // V2120: ユーザーが操作するまで表示を維持
        data: payload.data || {},
        actions: [
          { action: 'open', title: actionTitle },
          { action: 'close', title: '後で' }
        ]
      };

      // バッジを表示（未読数をインクリメント）
      incrementBadge();

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });

    console.log('[SW] Firebase initialized');
  } catch (error) {
    console.error('[SW] Firebase init error:', error);
  }
}

// ====================================
// Push通知受信（FCM以外のフォールバック）
// ====================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    title: 'くらべる通知',
    body: '新しい通知があります',
    icon: '/franchise-dashboard/images/5.png',
    badge: '/franchise-dashboard/images/5.png',
    tag: 'kuraberu-notification',
    data: {}
  };

  // Push データがあればパース
  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || data.tag,
        data: payload.data || {}
      };
    } catch (e) {
      // テキストとして扱う
      data.body = event.data.text();
    }
  }

  // V2120: アクションを明確に（通知タイプに応じて変更）
  const actionTitle = data.data?.actionTitle || '詳細を確認';
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [200, 100, 200],
    requireInteraction: true, // V2120: ユーザーが操作するまで表示を維持
    actions: [
      { action: 'open', title: actionTitle },
      { action: 'close', title: '後で' }
    ]
  };

  // バッジを表示
  incrementBadge();

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ====================================
// バッジ管理
// ====================================
let badgeCount = 0;

function incrementBadge() {
  badgeCount++;
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(badgeCount).catch(err => {
      console.warn('[SW] Badge error:', err);
    });
  }
  console.log('[SW] Badge incremented:', badgeCount);
}

function clearBadge() {
  badgeCount = 0;
  if ('clearAppBadge' in navigator) {
    navigator.clearAppBadge().catch(err => {
      console.warn('[SW] Clear badge error:', err);
    });
  }
  console.log('[SW] Badge cleared');
}

// ====================================
// 通知クリック処理
// ====================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();
  clearBadge();

  if (event.action === 'close') {
    return;
  }

  // 通知データからURLを取得、なければダッシュボードを開く
  const urlToOpen = event.notification.data?.url || '/franchise-dashboard/index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 既に開いているウィンドウがあればフォーカス
        for (const client of clientList) {
          if (client.url.includes('franchise-dashboard') && 'focus' in client) {
            return client.focus();
          }
        }
        // なければ新しいウィンドウを開く
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// フェッチ時はネットワーク優先、失敗時にキャッシュ
self.addEventListener('fetch', (event) => {
  // API呼び出しはキャッシュしない
  if (event.request.url.includes('script.google.com') ||
      event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功したらキャッシュに保存
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // オフライン時はキャッシュから返す
        return caches.match(event.request);
      })
  );
});
