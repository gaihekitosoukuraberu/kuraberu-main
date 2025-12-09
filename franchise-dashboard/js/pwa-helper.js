/**
 * PWA Helper - ブラウザ判定・インストール促進
 */

const PWAHelper = {
  deferredPrompt: null,

  /**
   * ブラウザ/環境判定
   */
  detectEnvironment: function() {
    const ua = navigator.userAgent.toLowerCase();

    return {
      // LINEアプリ内ブラウザ
      isLine: ua.includes('line'),
      // iOS
      isIOS: /iphone|ipad|ipod/.test(ua),
      // Android
      isAndroid: ua.includes('android'),
      // Safari
      isSafari: ua.includes('safari') && !ua.includes('chrome') && !ua.includes('crios'),
      // Chrome
      isChrome: ua.includes('chrome') || ua.includes('crios'),
      // スタンドアロン（既にホーム画面から起動）
      isStandalone: window.matchMedia('(display-mode: standalone)').matches ||
                    window.navigator.standalone === true,
      // PWAインストール可能か
      canInstall: false
    };
  },

  /**
   * 初期化
   */
  init: function() {
    console.log('[PWA] Initializing...');

    // Service Worker登録
    this.registerServiceWorker();

    // beforeinstallpromptイベント（Android Chrome用）
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] beforeinstallprompt fired');
      e.preventDefault();
      this.deferredPrompt = e;
      this.detectEnvironment().canInstall = true;
    });

    // インストール完了イベント
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed');
      this.deferredPrompt = null;
      localStorage.setItem('pwaInstalled', 'true');
    });
  },

  /**
   * Service Worker登録
   */
  registerServiceWorker: function() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/franchise-dashboard/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    }
  },

  /**
   * インストールプロンプト表示が必要か
   */
  shouldShowPrompt: function() {
    const env = this.detectEnvironment();

    // 既にインストール済み
    if (env.isStandalone || localStorage.getItem('pwaInstalled') === 'true') {
      return false;
    }

    // 「あとで」を選んで24時間以内
    const dismissedAt = localStorage.getItem('pwaDismissedAt');
    if (dismissedAt) {
      const hoursSinceDismiss = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60);
      if (hoursSinceDismiss < 24) {
        return false;
      }
    }

    return true;
  },

  /**
   * 初回ログイン後に呼び出すメイン関数
   * @param {boolean} force - trueなら条件チェックをスキップして強制表示
   */
  showInstallPrompt: function(force = false) {
    if (!force && !this.shouldShowPrompt()) {
      console.log('[PWA] Prompt not needed');
      return;
    }

    const env = this.detectEnvironment();
    console.log('[PWA] Environment:', env);

    if (env.isLine) {
      // LINEブラウザ → 外部ブラウザ誘導
      this.showLineBrowserModal();
    } else if (env.isStandalone) {
      // 既にPWAとして起動中
      console.log('[PWA] Already running as PWA');
    } else if (env.isIOS) {
      // iOS → Safari手順表示
      this.showIOSInstallModal();
    } else if (this.deferredPrompt) {
      // Android Chrome → ネイティブインストール
      this.showAndroidInstallModal();
    } else {
      // その他 → 汎用案内
      this.showGenericInstallModal();
    }
  },

  /**
   * LINEブラウザ警告モーダル
   */
  showLineBrowserModal: function() {
    const currentUrl = window.location.href;

    const modal = document.createElement('div');
    modal.id = 'pwaLineModal';
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
          <div class="text-5xl mb-4">🔗</div>
          <h3 class="text-xl font-bold text-gray-800 mb-3">ブラウザで開いてください</h3>
          <p class="text-gray-600 text-sm mb-6">
            LINEアプリ内では一部機能が制限されています。<br>
            Safari または Chrome で開くと快適に使えます。
          </p>
          <div class="space-y-3">
            <button onclick="PWAHelper.openInExternalBrowser('${currentUrl}')"
                    class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
              Safari/Chrome で開く
            </button>
            <button onclick="PWAHelper.dismissModal('pwaLineModal')"
                    class="w-full py-2 text-gray-500 text-sm hover:text-gray-700">
              このまま続ける
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  /**
   * iOS用インストール案内モーダル
   */
  showIOSInstallModal: function() {
    const modal = document.createElement('div');
    modal.id = 'pwaIOSModal';
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
          <div class="text-center mb-4">
            <div class="text-5xl mb-2">📱</div>
            <h3 class="text-xl font-bold text-gray-800">アプリとして使えます</h3>
          </div>
          <p class="text-gray-600 text-sm mb-4 text-center">
            ホーム画面に追加すると、アプリのようにすぐ開けます
          </p>
          <div class="bg-gray-50 rounded-xl p-4 mb-4">
            <p class="text-sm font-bold text-gray-700 mb-3">追加手順：</p>
            <div class="space-y-3 text-sm">
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">1</span>
                <span>画面下の <span class="inline-block px-2 py-0.5 bg-gray-200 rounded text-xs">共有</span> ボタンをタップ</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">2</span>
                <span>「ホーム画面に追加」をタップ</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">3</span>
                <span>「追加」をタップして完了！</span>
              </div>
            </div>
          </div>
          <button onclick="PWAHelper.dismissModal('pwaIOSModal', true)"
                  class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors mb-2">
            OK、わかりました
          </button>
          <button onclick="PWAHelper.dismissModal('pwaIOSModal', true)"
                  class="w-full py-2 text-gray-500 text-sm hover:text-gray-700">
            あとで
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  /**
   * Android用インストールモーダル
   */
  showAndroidInstallModal: function() {
    const modal = document.createElement('div');
    modal.id = 'pwaAndroidModal';
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
          <div class="text-5xl mb-4">📱</div>
          <h3 class="text-xl font-bold text-gray-800 mb-3">アプリとして使えます</h3>
          <p class="text-gray-600 text-sm mb-6">
            ホーム画面に追加すると<br>
            アプリのようにすぐ開けます
          </p>
          <div class="space-y-3">
            <button onclick="PWAHelper.installPWA()"
                    class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
              ホーム画面に追加
            </button>
            <button onclick="PWAHelper.dismissModal('pwaAndroidModal', true)"
                    class="w-full py-2 text-gray-500 text-sm hover:text-gray-700">
              あとで
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  /**
   * 汎用インストール案内モーダル
   */
  showGenericInstallModal: function() {
    const modal = document.createElement('div');
    modal.id = 'pwaGenericModal';
    modal.innerHTML = `
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
          <div class="text-5xl mb-4">💡</div>
          <h3 class="text-xl font-bold text-gray-800 mb-3">ヒント</h3>
          <p class="text-gray-600 text-sm mb-6">
            このページをブックマークに追加すると<br>
            次回から素早くアクセスできます
          </p>
          <button onclick="PWAHelper.dismissModal('pwaGenericModal', true)"
                  class="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
            OK
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  /**
   * Android PWAインストール実行
   */
  installPWA: function() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult) => {
        console.log('[PWA] User choice:', choiceResult.outcome);
        this.deferredPrompt = null;
      });
    }
    this.dismissModal('pwaAndroidModal');
  },

  /**
   * 外部ブラウザで開く（LINE用）
   */
  openInExternalBrowser: function(url) {
    // iOSの場合
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      window.location.href = url;
    } else {
      // Androidの場合、intent URLを使う
      window.location.href = 'intent://' + url.replace(/^https?:\/\//, '') +
        '#Intent;scheme=https;package=com.android.chrome;end';
    }
    this.dismissModal('pwaLineModal');
  },

  /**
   * モーダルを閉じる
   */
  dismissModal: function(modalId, remember = false) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.remove();
    }
    if (remember) {
      localStorage.setItem('pwaDismissedAt', Date.now().toString());
    }
  }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  PWAHelper.init();

  // 初回ログイン後のPWAプロンプト表示チェック
  setTimeout(() => {
    if (sessionStorage.getItem('showPwaPrompt') === 'true') {
      sessionStorage.removeItem('showPwaPrompt');
      PWAHelper.showInstallPrompt();
    }
  }, 1500); // ダッシュボード表示後1.5秒後に表示
});
