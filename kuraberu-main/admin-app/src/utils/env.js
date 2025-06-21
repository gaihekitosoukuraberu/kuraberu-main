/**
 * 環境変数ユーティリティ
 * Vue CLI の環境変数を安全に取得する
 */

class EnvUtils {
  /**
   * GAS WebApp URL を取得
   * @returns {string} GAS WebApp URL
   */
  static getGasWebAppUrl() {
    const url = process.env.VUE_APP_GAS_WEBAPP_URL
    if (!url || url.includes('YOUR_SCRIPT_ID')) {
      console.error('❌ GAS WebApp URL が設定されていません。.env.local ファイルを確認してください。')
      throw new Error('GAS WebApp URL が設定されていません')
    }
    return url
  }

  /**
   * 開発環境かどうかを判定
   * @returns {boolean} 開発環境の場合true
   */
  static isDevelopment() {
    return process.env.NODE_ENV === 'development'
  }

  /**
   * 本番環境かどうかを判定
   * @returns {boolean} 本番環境の場合true
   */
  static isProduction() {
    return process.env.NODE_ENV === 'production'
  }

  /**
   * デバッグモードかどうかを判定
   * @returns {boolean} デバッグモードの場合true
   */
  static isDebugMode() {
    return process.env.VUE_APP_DEBUG === 'true'
  }

  /**
   * アプリケーション名を取得
   * @returns {string} アプリケーション名
   */
  static getAppName() {
    return process.env.VUE_APP_NAME || '外壁塗装くらべるAI管理画面'
  }

  /**
   * アプリケーションバージョンを取得
   * @returns {string} バージョン
   */
  static getAppVersion() {
    return process.env.VUE_APP_VERSION || '1.0.0'
  }

  /**
   * API設定を取得
   * @returns {Object} API設定オブジェクト
   */
  static getApiConfig() {
    return {
      baseUrl: this.getGasWebAppUrl(),
      timeout: parseInt(process.env.VUE_APP_API_TIMEOUT) || 30000,
      retryCount: parseInt(process.env.VUE_APP_API_RETRY_COUNT) || 3
    }
  }

  /**
   * 全ての環境変数をログ出力（開発環境のみ）
   */
  static logEnvironmentInfo() {
    if (this.isDevelopment()) {
      console.group('🔧 環境変数情報')
      console.log('NODE_ENV:', process.env.NODE_ENV)
      console.log('VUE_APP_ENV:', process.env.VUE_APP_ENV)
      console.log('VUE_APP_DEBUG:', process.env.VUE_APP_DEBUG)
      console.log('VUE_APP_NAME:', this.getAppName())
      console.log('VUE_APP_VERSION:', this.getAppVersion())
      console.log('VUE_APP_GAS_WEBAPP_URL:', process.env.VUE_APP_GAS_WEBAPP_URL ? '設定済み' : '未設定')
      console.groupEnd()
    }
  }

  /**
   * 必須環境変数の検証
   * @throws {Error} 必須環境変数が不足している場合
   */
  static validateRequiredEnvVars() {
    const required = ['VUE_APP_GAS_WEBAPP_URL']
    const missing = []

    required.forEach(varName => {
      const value = process.env[varName]
      if (!value || value.includes('YOUR_SCRIPT_ID')) {
        missing.push(varName)
      }
    })

    if (missing.length > 0) {
      const message = `必須環境変数が設定されていません: ${missing.join(', ')}`
      console.error('❌', message)
      if (this.isDevelopment()) {
        console.info('💡 .env.local ファイルに適切な値を設定してください')
      }
      throw new Error(message)
    }
  }
}

export default EnvUtils