/**
 * 環境変数ローダー（全システム共通）
 * @version 1133
 */

const ENV = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbwxvhxCEnDnsXP-KKLt58_FxRvew2NbRtr33OvoPuBwdEWSJNgoiK_18sWW1nMKvCZldQ/exec',
  STRIPE_PUBLIC_KEY: 'pk_test_51QIMnPP8DxVKK6aVqxUwqjEjN0oRWPVT4eS1vfwRKVFxQkVEEOW6UXFQF3QVFO9o7RLLZOHdNaOzmhRBmSJwu6xA00aS9V9Pxe',
  SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/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',
  ENVIRONMENT: 'production',
  DEBUG: false
};

window.GAS_URL = ENV.GAS_URL;
window.STRIPE_PUBLIC_KEY = ENV.STRIPE_PUBLIC_KEY;
window.ENV = ENV;

if (ENV.DEBUG) {
  console.log('[env-loader] Environment loaded:', ENV);
}
