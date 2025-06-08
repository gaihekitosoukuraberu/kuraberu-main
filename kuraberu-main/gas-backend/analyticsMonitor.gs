/**
 * analyticsMonitor.gs - GA4データ監視とSlack通知機能
 * パフォーマンス指標の監視とアラート送信を行います
 */

// 設定値
const CONFIG = {
  // GA4 API設定
  GA4_PROPERTY_ID: '000000000', // 本番では実際のプロパティIDに置き換え
  
  // アラート閾値
  THRESHOLDS: {
    CTA_CLICK_RATE: 0.05, // CTAクリック率の最低閾値（5%）
    FORM_CONVERSION_RATE: 0.02, // フォーム送信率の最低閾値（2%）
    ERROR_COUNT: 5, // 1日あたりのエラー発生件数閾値
    BOUNCE_RATE: 0.7 // 直帰率の閾値（70%）
  },
  
  // 監視間隔
  CHECK_INTERVAL_HOURS: 6, // 6時間ごとに監視
  
  // Slackチャンネル設定
  SLACK_ALERT_CHANNEL: '#marketing-alerts', // アラート送信先
  SLACK_REPORT_CHANNEL: '#daily-reports' // 日次レポート送信先
};

/**
 * トリガーで実行される監視関数
 * GA4からデータを取得してアラート条件をチェック
 */
function monitorPerformanceMetrics() {
  try {
    console.log('パフォーマンス指標監視を開始します');
    
    // 各指標を取得
    const metrics = calculateCurrentMetrics();
    
    // 閾値と比較
    const alerts = checkAlertConditions(metrics);
    
    // アラートがある場合はSlackに通知
    if (alerts.length > 0) {
      sendSlackAlert(alerts, metrics);
    }
    
    console.log('監視完了: アラート数=' + alerts.length);
    
    // 実行ログを記録
    logMonitoringExecution(metrics, alerts);
    
  } catch (error) {
    console.error('監視処理中にエラーが発生しました:', error);
    
    // エラーをSlackに通知
    sendErrorNotification(error);
  }
}

/**
 * 現在のパフォーマンス指標を計算する
 * @returns {Object} 計算された指標
 */
function calculateCurrentMetrics() {
  // 日付範囲の設定（直近24時間）
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 1); // 24時間前
  
  // フォーマットされた日付文字列
  const startDateStr = Utilities.formatDate(startDate, 'JST', 'yyyy-MM-dd');
  const endDateStr = Utilities.formatDate(endDate, 'JST', 'yyyy-MM-dd');
  
  // モックデータ（実際にはGA4 APIからデータを取得）
  // TODO: GA4 APIと連携する実装に置き換え
  const mockData = {
    page_views: 1200,
    visitors: 850,
    cta_clicks: 68,
    form_submissions: 24,
    form_completions: 18,
    bounce_rate: 0.62,
    avg_session_duration: 125, // 秒
    error_count: 3
  };
  
  // 実際のデータを取得する場合はこちらを使用
  //const analyticsData = fetchAnalyticsData(startDateStr, endDateStr);
  
  // 指標の計算
  const metrics = {
    date_range: `${startDateStr} ~ ${endDateStr}`,
    page_views: mockData.page_views,
    visitors: mockData.visitors,
    cta_clicks: mockData.cta_clicks,
    form_submissions: mockData.form_submissions,
    form_completions: mockData.form_completions,
    bounce_rate: mockData.bounce_rate,
    avg_session_duration: mockData.avg_session_duration,
    error_count: mockData.error_count,
    
    // 計算指標
    cta_click_rate: mockData.cta_clicks / mockData.visitors,
    form_submission_rate: mockData.form_submissions / mockData.visitors,
    form_completion_rate: mockData.form_completions / mockData.form_submissions,
    
    // エラーログからエラー件数を取得（実際の実装）
    error_count: getErrorCount(startDate, endDate)
  };
  
  return metrics;
}

/**
 * エラーログからエラー件数を取得
 * @param {Date} startDate - 開始日
 * @param {Date} endDate - 終了日
 * @returns {number} エラー件数
 */
function getErrorCount(startDate, endDate) {
  try {
    // アプリケーション設定を取得
    const config = getAppConfig();
    
    // スプレッドシートを開く
    const ss = SpreadsheetApp.openById(config.spreadsheetId);
    
    // エラーログシートを取得
    const errorSheet = ss.getSheetByName('エラーログ');
    if (!errorSheet) {
      console.log('エラーログシートが見つかりません');
      return 0;
    }
    
    // データを取得
    const data = errorSheet.getDataRange().getValues();
    
    // ヘッダー行をスキップ
    const headerRow = data[0];
    const dateColumnIndex = headerRow.indexOf('タイムスタンプ');
    
    if (dateColumnIndex === -1) {
      console.log('タイムスタンプ列が見つかりません');
      return 0;
    }
    
    // 日付範囲内のエラー数をカウント
    let errorCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const errorDate = new Date(data[i][dateColumnIndex]);
      
      if (errorDate >= startDate && errorDate <= endDate) {
        errorCount++;
      }
    }
    
    return errorCount;
    
  } catch (e) {
    console.error('エラー数取得中にエラーが発生しました:', e);
    return 0;
  }
}

/**
 * アラート条件をチェック
 * @param {Object} metrics - 現在の指標
 * @returns {Array} アラート配列
 */
function checkAlertConditions(metrics) {
  const alerts = [];
  
  // CTAクリック率のチェック
  if (metrics.cta_click_rate < CONFIG.THRESHOLDS.CTA_CLICK_RATE) {
    alerts.push({
      type: 'cta_click_rate',
      severity: 'warning',
      message: `CTAクリック率が低下しています: ${(metrics.cta_click_rate * 100).toFixed(2)}% (閾値: ${CONFIG.THRESHOLDS.CTA_CLICK_RATE * 100}%)`
    });
  }
  
  // フォーム送信率のチェック
  if (metrics.form_submission_rate < CONFIG.THRESHOLDS.FORM_CONVERSION_RATE) {
    alerts.push({
      type: 'form_conversion_rate',
      severity: 'warning',
      message: `フォーム送信率が低下しています: ${(metrics.form_submission_rate * 100).toFixed(2)}% (閾値: ${CONFIG.THRESHOLDS.FORM_CONVERSION_RATE * 100}%)`
    });
  }
  
  // エラー件数のチェック
  if (metrics.error_count > CONFIG.THRESHOLDS.ERROR_COUNT) {
    alerts.push({
      type: 'error_count',
      severity: 'error',
      message: `エラー発生件数が多くなっています: ${metrics.error_count}件 (閾値: ${CONFIG.THRESHOLDS.ERROR_COUNT}件)`
    });
  }
  
  // 直帰率のチェック
  if (metrics.bounce_rate > CONFIG.THRESHOLDS.BOUNCE_RATE) {
    alerts.push({
      type: 'bounce_rate',
      severity: 'warning',
      message: `直帰率が高くなっています: ${(metrics.bounce_rate * 100).toFixed(2)}% (閾値: ${CONFIG.THRESHOLDS.BOUNCE_RATE * 100}%)`
    });
  }
  
  return alerts;
}

/**
 * Slackにアラートを送信
 * @param {Array} alerts - アラート配列
 * @param {Object} metrics - 現在の指標
 */
function sendSlackAlert(alerts, metrics) {
  // アプリケーション設定を取得
  const config = getAppConfig();
  
  // Webhookがなければ終了
  if (!config.slackWebhookUrl) {
    console.log('Slack Webhook URLが設定されていないため通知できません');
    return;
  }
  
  // 優先度の高いアラートがあるか確認
  const hasCriticalAlert = alerts.some(alert => alert.severity === 'error');
  
  // メッセージの構築
  let message = {
    text: hasCriticalAlert ? '🚨 重要なアラートが発生しています' : '⚠️ パフォーマンスアラート',
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: hasCriticalAlert ? "🚨 重要なパフォーマンスアラート" : "⚠️ パフォーマンスアラート",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*期間:* ${metrics.date_range}`
        }
      },
      {
        type: "divider"
      }
    ]
  };
  
  // アラートの追加
  alerts.forEach(alert => {
    let emoji = '⚠️';
    if (alert.severity === 'error') emoji = '🚨';
    else if (alert.severity === 'info') emoji = 'ℹ️';
    
    message.blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *${alert.message}*`
      }
    });
  });
  
  // 指標サマリーの追加
  message.blocks.push(
    {
      type: "divider"
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*現在の指標サマリー:*"
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*訪問者数:*\n${metrics.visitors}`
        },
        {
          type: "mrkdwn",
          text: `*ページビュー:*\n${metrics.page_views}`
        },
        {
          type: "mrkdwn",
          text: `*CTAクリック率:*\n${(metrics.cta_click_rate * 100).toFixed(2)}%`
        },
        {
          type: "mrkdwn",
          text: `*フォーム送信率:*\n${(metrics.form_submission_rate * 100).toFixed(2)}%`
        }
      ]
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*フォーム完了率:*\n${(metrics.form_completion_rate * 100).toFixed(2)}%`
        },
        {
          type: "mrkdwn",
          text: `*直帰率:*\n${(metrics.bounce_rate * 100).toFixed(2)}%`
        },
        {
          type: "mrkdwn",
          text: `*平均セッション時間:*\n${Math.floor(metrics.avg_session_duration / 60)}分${metrics.avg_session_duration % 60}秒`
        },
        {
          type: "mrkdwn",
          text: `*エラー件数:*\n${metrics.error_count}件`
        }
      ]
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `自動生成レポート | ${new Date().toISOString()} | 外壁塗装くらべる`
        }
      ]
    }
  );
  
  // Webhookに送信
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(message)
  };
  
  try {
    UrlFetchApp.fetch(config.slackWebhookUrl, options);
    console.log('Slackにアラートを送信しました');
  } catch (e) {
    console.error('Slack通知の送信中にエラーが発生しました:', e);
  }
}

/**
 * エラー発生時にSlackに通知
 * @param {Error} error - 発生したエラー
 */
function sendErrorNotification(error) {
  // アプリケーション設定を取得
  const config = getAppConfig();
  
  // Webhookがなければ終了
  if (!config.slackWebhookUrl) {
    console.log('Slack Webhook URLが設定されていないため通知できません');
    return;
  }
  
  // メッセージの構築
  let message = {
    text: '🔥 Analytics Monitor エラー',
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🔥 Analytics Monitor エラー",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `監視スクリプトの実行中にエラーが発生しました。`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*エラー内容:*\n\`\`\`${error.message}\`\`\``
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `エラー発生時刻: ${new Date().toISOString()} | スクリプト: analyticsMonitor.gs`
          }
        ]
      }
    ]
  };
  
  // Webhookに送信
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(message)
  };
  
  try {
    UrlFetchApp.fetch(config.slackWebhookUrl, options);
    console.log('Slackにエラー通知を送信しました');
  } catch (e) {
    console.error('Slack通知の送信中にエラーが発生しました:', e);
  }
}

/**
 * 監視実行ログを記録
 * @param {Object} metrics - 監視した指標
 * @param {Array} alerts - 発生したアラート
 */
function logMonitoringExecution(metrics, alerts) {
  try {
    // アプリケーション設定を取得
    const config = getAppConfig();
    
    // スプレッドシートを開く
    const ss = SpreadsheetApp.openById(config.spreadsheetId);
    
    // 監視ログシートを取得または作成
    let monitorSheet = ss.getSheetByName('監視ログ');
    if (!monitorSheet) {
      monitorSheet = ss.insertSheet('監視ログ');
      
      // ヘッダー行を追加
      monitorSheet.appendRow([
        'タイムスタンプ',
        '監視期間',
        '訪問者数',
        'ページビュー',
        'CTAクリック数',
        'CTAクリック率',
        'フォーム送信数',
        'フォーム送信率',
        'フォーム完了数',
        'フォーム完了率',
        '直帰率',
        '平均セッション時間',
        'エラー件数',
        'アラート数',
        'アラート内容'
      ]);
      
      // 書式設定
      monitorSheet.getRange(1, 1, 1, 15).setBackground('#E0E0E0').setFontWeight('bold');
    }
    
    // アラート内容をJSON文字列化
    const alertsJson = JSON.stringify(alerts.map(a => a.message));
    
    // ログ行を追加
    monitorSheet.appendRow([
      new Date(),
      metrics.date_range,
      metrics.visitors,
      metrics.page_views,
      metrics.cta_clicks,
      metrics.cta_click_rate,
      metrics.form_submissions,
      metrics.form_submission_rate,
      metrics.form_completions,
      metrics.form_completion_rate,
      metrics.bounce_rate,
      metrics.avg_session_duration,
      metrics.error_count,
      alerts.length,
      alertsJson
    ]);
    
  } catch (e) {
    console.error('監視ログの記録中にエラーが発生しました:', e);
  }
}

/**
 * 日次レポートを生成してSlackに送信（午前9時に実行）
 */
function sendDailyReport() {
  try {
    console.log('日次レポートの生成を開始します');
    
    // 日付範囲の設定（前日の0時〜23時59分）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startDate = new Date(yesterday);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(yesterday);
    endDate.setHours(23, 59, 59, 999);
    
    // フォーマットされた日付文字列
    const dateStr = Utilities.formatDate(yesterday, 'JST', 'yyyy/MM/dd');
    
    // 前日のデータを取得（モックデータ、実際にはGA4 APIから取得）
    const metrics = calculateCurrentMetrics(); // 同じ関数を活用（実際には日付範囲を明示的に指定）
    
    // 前週同日との比較データ（モック、実際にはGA4から取得）
    const lastWeekMetrics = {
      visitors: 820,
      cta_click_rate: 0.078,
      form_submission_rate: 0.025,
      form_completion_rate: 0.7
    };
    
    // Looker Studioへのリンク
    const dashboardUrl = "https://lookerstudio.google.com/xxxxxxxxxxxx";
    
    // 日次レポートをSlackに送信
    sendSlackDailyReport(dateStr, metrics, lastWeekMetrics, dashboardUrl);
    
    console.log('日次レポートの送信が完了しました');
    
  } catch (error) {
    console.error('日次レポート生成中にエラーが発生しました:', error);
    sendErrorNotification(error);
  }
}

/**
 * Slackに日次レポートを送信
 * @param {string} dateStr - 日付文字列
 * @param {Object} metrics - 現在の指標
 * @param {Object} lastWeekMetrics - 前週同日の指標
 * @param {string} dashboardUrl - ダッシュボードURL
 */
function sendSlackDailyReport(dateStr, metrics, lastWeekMetrics, dashboardUrl) {
  // アプリケーション設定を取得
  const config = getAppConfig();
  
  // Webhookがなければ終了
  if (!config.slackWebhookUrl) {
    console.log('Slack Webhook URLが設定されていないため通知できません');
    return;
  }
  
  // 前週比の計算
  const visitorChange = ((metrics.visitors / lastWeekMetrics.visitors) - 1) * 100;
  const ctaRateChange = ((metrics.cta_click_rate / lastWeekMetrics.cta_click_rate) - 1) * 100;
  const submissionRateChange = ((metrics.form_submission_rate / lastWeekMetrics.form_submission_rate) - 1) * 100;
  const completionRateChange = ((metrics.form_completion_rate / lastWeekMetrics.form_completion_rate) - 1) * 100;
  
  // 変化率の表示用関数
  const formatChange = (change) => {
    const prefix = change >= 0 ? '↑' : '↓';
    const emoji = change >= 0 ? '🔼' : '🔽';
    return `${prefix} ${Math.abs(change).toFixed(1)}% ${emoji}`;
  };
  
  // メッセージの構築
  let message = {
    text: `📊 外壁塗装くらべる 日次レポート (${dateStr})`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📊 日次パフォーマンスレポート (${dateStr})`,
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `外壁塗装くらべるLPの昨日の成果指標です。`
        }
      },
      {
        type: "divider"
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*訪問者数:*\n${metrics.visitors} (前週比: ${formatChange(visitorChange)})`
          },
          {
            type: "mrkdwn",
            text: `*CTAクリック率:*\n${(metrics.cta_click_rate * 100).toFixed(2)}% (前週比: ${formatChange(ctaRateChange)})`
          }
        ]
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*フォーム送信率:*\n${(metrics.form_submission_rate * 100).toFixed(2)}% (前週比: ${formatChange(submissionRateChange)})`
          },
          {
            type: "mrkdwn",
            text: `*フォーム完了率:*\n${(metrics.form_completion_rate * 100).toFixed(2)}% (前週比: ${formatChange(completionRateChange)})`
          }
        ]
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*直帰率:*\n${(metrics.bounce_rate * 100).toFixed(2)}%`
          },
          {
            type: "mrkdwn",
            text: `*エラー件数:*\n${metrics.error_count}件`
          }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `詳細なレポートは <${dashboardUrl}|Looker Studioダッシュボード> で確認できます。`
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `自動生成レポート | ${new Date().toISOString()} | 外壁塗装くらべる`
          }
        ]
      }
    ]
  };
  
  // Webhookに送信
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(message)
  };
  
  try {
    UrlFetchApp.fetch(config.slackWebhookUrl, options);
    console.log('Slackに日次レポートを送信しました');
  } catch (e) {
    console.error('Slack通知の送信中にエラーが発生しました:', e);
  }
}

/**
 * 時間トリガー設定
 * このスクリプトを定期的に実行するためのトリガーを設定
 */
function setupTimeBasedTriggers() {
  // 既存のトリガーをすべて削除
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  // 6時間ごとのパフォーマンス監視トリガー
  ScriptApp.newTrigger('monitorPerformanceMetrics')
    .timeBased()
    .everyHours(CONFIG.CHECK_INTERVAL_HOURS)
    .create();
  
  // 毎朝9時の日次レポートトリガー
  ScriptApp.newTrigger('sendDailyReport')
    .timeBased()
    .atHour(9)
    .everyDays(1)
    .create();
  
  console.log('トリガーが正常に設定されました');
}