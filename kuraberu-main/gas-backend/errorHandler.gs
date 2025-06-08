/**
 * errorHandler.gs - 統一エラーハンドリングモジュール
 * 全アプリケーションでの一貫したエラー処理と詳細ログ記録を提供
 */

const ErrorHandler = {
  /**
   * エラーログを記録する
   * @param {Error} error - 発生したエラー
   * @param {string} context - エラー発生コンテキスト
   * @param {Object} additionalInfo - 追加情報（省略可）
   * @returns {string} - エラーログID（参照用）
   */
  logError: function(error, context, additionalInfo = {}) {
    try {
      // エラーログID生成
      const logId = `ERR_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      // エラーオブジェクトの詳細を抽出
      const errorDetails = {
        message: error.message || 'エラーメッセージなし',
        stack: error.stack || 'スタックトレースなし',
        name: error.name || 'Error',
        timestamp: new Date().toISOString(),
        context: context || 'コンテキスト不明',
        additionalInfo: additionalInfo,
        errorId: logId
      };
      
      // ログの出力（コンソール）
      console.error(`[ERROR] ${errorDetails.context}: ${errorDetails.message}`, errorDetails);
      
      // ログをスプレッドシートに記録（存在する場合）
      this.writeToErrorLog(errorDetails);
      
      // エラー発生を通知（管理者向け、重大なエラーのみ）
      if (this.isCriticalError(error)) {
        this.notifyAdmin(errorDetails);
      }
      
      return logId;
    } catch (logError) {
      // エラーログ機能自体のエラー（最終的なフォールバック）
      console.error('エラーロギングに失敗:', logError);
      return 'ERR_LOG_FAILED';
    }
  },
  
  /**
   * エラーログをスプレッドシートに記録する
   * @param {Object} errorDetails - エラーの詳細情報
   */
  writeToErrorLog: function(errorDetails) {
    try {
      // アプリケーション設定を取得
      const config = getAppConfig();
      
      // スプレッドシートを開く
      const ss = SpreadsheetApp.openById(config.spreadsheetId);
      
      // エラーログシートを取得または作成
      let errorSheet = ss.getSheetByName('エラーログ');
      if (!errorSheet) {
        errorSheet = ss.insertSheet('エラーログ');
        
        // ヘッダー行を追加
        errorSheet.appendRow([
          'タイムスタンプ',
          'エラーID',
          'コンテキスト',
          'エラー種類',
          'メッセージ',
          'スタックトレース',
          '追加情報'
        ]);
        
        // 書式設定
        errorSheet.getRange(1, 1, 1, 7).setBackground('#E0E0E0').setFontWeight('bold');
        errorSheet.setColumnWidth(1, 180);  // タイムスタンプ
        errorSheet.setColumnWidth(2, 150);  // エラーID
        errorSheet.setColumnWidth(3, 150);  // コンテキスト
        errorSheet.setColumnWidth(4, 120);  // エラー種類
        errorSheet.setColumnWidth(5, 300);  // メッセージ
        errorSheet.setColumnWidth(6, 500);  // スタックトレース
        errorSheet.setColumnWidth(7, 300);  // 追加情報
      }
      
      // 追加情報をJSON文字列に変換
      let additionalInfoStr = '';
      try {
        additionalInfoStr = JSON.stringify(errorDetails.additionalInfo);
      } catch (e) {
        additionalInfoStr = '変換不可: ' + Object.keys(errorDetails.additionalInfo || {}).join(', ');
      }
      
      // エラーログ行を追加
      errorSheet.appendRow([
        new Date(),                // タイムスタンプ
        errorDetails.errorId,      // エラーID
        errorDetails.context,      // コンテキスト
        errorDetails.name,         // エラー種類
        errorDetails.message,      // メッセージ
        errorDetails.stack,        // スタックトレース
        additionalInfoStr          // 追加情報
      ]);
      
    } catch (sheetError) {
      // スプレッドシートへの記録に失敗した場合はコンソールにフォールバック
      console.error('エラーログシートへの書き込みに失敗:', sheetError);
    }
  },
  
  /**
   * 重大なエラーかどうかを判断する
   * @param {Error} error - 評価するエラー
   * @returns {boolean} - 重大なエラーの場合はtrue
   */
  isCriticalError: function(error) {
    // 重大なエラー条件を定義
    const criticalErrors = [
      'SyntaxError',
      'ReferenceError',
      'TypeError',
      'RangeError',
      'URIError',
      'SpreadsheetError',
      'DatabaseError'
    ];
    
    // エラー名が重大エラーリストに含まれているか
    return criticalErrors.includes(error.name) ||
           // または「重大」「クリティカル」というワードが含まれているか
           (error.message && (
             error.message.includes('重大') ||
             error.message.includes('critical') ||
             error.message.includes('Critical')
           ));
  },
  
  /**
   * 管理者に通知する
   * @param {Object} errorDetails - エラーの詳細情報
   */
  notifyAdmin: function(errorDetails) {
    try {
      // SlackNotifierがあれば使用
      if (typeof SlackNotifier !== 'undefined' && SlackNotifier.sendNotification) {
        // 通知用のペイロードを作成
        const notificationData = {
          text: '🚨 *重大なエラーが発生しました*',
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: "🚨 重大なエラーが発生しました",
                emoji: true
              }
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*エラーID:*\n${errorDetails.errorId}`
                },
                {
                  type: "mrkdwn",
                  text: `*発生時刻:*\n${new Date(errorDetails.timestamp).toLocaleString('ja-JP')}`
                }
              ]
            },
            {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: `*コンテキスト:*\n${errorDetails.context}`
                },
                {
                  type: "mrkdwn",
                  text: `*エラー種類:*\n${errorDetails.name}`
                }
              ]
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*エラーメッセージ:*\n\`\`\`${errorDetails.message}\`\`\``
              }
            }
          ]
        };
        
        // エラー通知用のチャンネルに送信
        SlackNotifier.sendNotification({
          message: JSON.stringify(notificationData),
          channel: 'error-alerts', // エラー専用チャンネル
          errorDetails: errorDetails
        });
      }
    } catch (notifyError) {
      console.error('管理者通知に失敗:', notifyError);
    }
  },
  
  /**
   * ユーザー向けのエラーメッセージを生成する
   * @param {Error} error - 発生したエラー
   * @param {string} userContext - ユーザー向けコンテキスト
   * @returns {Object} - ユーザー向けエラーオブジェクト
   */
  formatUserError: function(error, userContext) {
    // エラーの詳細をログに記録
    const errorId = this.logError(error, userContext);
    
    // ユーザー向けのエラーメッセージを生成
    return {
      status: 'error',
      userMessage: this.getUserFriendlyMessage(error),
      errorId: errorId,
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * ユーザーフレンドリーなエラーメッセージを取得する
   * @param {Error} error - 発生したエラー
   * @returns {string} - ユーザー向けエラーメッセージ
   */
  getUserFriendlyMessage: function(error) {
    // エラー種類に基づいたユーザーフレンドリーメッセージマッピング
    const errorMessages = {
      'SyntaxError': 'システムエラーが発生しました。管理者に報告されます。',
      'ReferenceError': 'システムエラーが発生しました。管理者に報告されます。',
      'TypeError': 'システムエラーが発生しました。管理者に報告されます。',
      'NetworkError': 'ネットワーク接続に問題があります。インターネット接続を確認し、再度お試しください。',
      'TimeoutError': 'サーバーからの応答がありませんでした。時間をおいて再度お試しください。',
      'ValidationError': '入力データに問題があります。内容を確認して再度お試しください。',
      'AuthorizationError': '認証に失敗しました。ログインし直してください。',
      'ResourceNotFoundError': '要求されたリソースが見つかりませんでした。',
      'DatabaseError': 'データベースエラーが発生しました。管理者に報告されます。',
      'SpreadsheetError': 'データ保存中にエラーが発生しました。管理者に報告されます。'
    };
    
    // エラー名に一致するメッセージがあればそれを返す
    if (error.name && errorMessages[error.name]) {
      return errorMessages[error.name];
    }
    
    // エラーメッセージに「タイムアウト」が含まれる場合
    if (error.message && error.message.includes('タイムアウト')) {
      return 'サーバーからの応答がありませんでした。時間をおいて再度お試しください。';
    }
    
    // その他のエラーは汎用メッセージを返す
    return '処理中にエラーが発生しました。時間をおいて再度お試しいただくか、お電話でお問い合わせください。';
  },
  
  /**
   * try-catchでラップした関数実行
   * @param {Function} fn - 実行する関数
   * @param {string} context - エラー発生コンテキスト
   * @param {Object} params - 関数に渡すパラメータ
   * @returns {Object} - 関数の結果またはエラー情報
   */
  tryCatch: function(fn, context, params) {
    try {
      // 関数を実行
      const result = fn(params);
      return {
        success: true,
        result: result
      };
    } catch (error) {
      // エラーをログに記録
      const errorId = this.logError(error, context, { params: params });
      
      // エラー情報を返す
      return {
        success: false,
        error: error,
        errorId: errorId,
        userMessage: this.getUserFriendlyMessage(error)
      };
    }
  }
};