/**
 * キャンセル申請ハンドラー
 * 子ユーザーからのキャンセル申請を受信し、Slack通知と親ユーザー通知を送信
 */

/**
 * キャンセル申請の受信・処理メイン関数
 * @param {string} childUserId - 子ユーザーID
 * @param {string} inquiryId - 問い合わせID（キャンセル対象）
 * @param {string} reason - キャンセル理由
 * @param {string} additionalNotes - 追加メモ（任意）
 * @return {Object} 処理結果
 */
function handleCancelRequest(childUserId, inquiryId, reason, additionalNotes = '') {
  try {
    console.log('キャンセル申請処理開始:', {
      childUserId: childUserId,
      inquiryId: inquiryId,
      reason: reason
    });
    
    // 1. 子ユーザー情報取得
    const childUserInfo = getChildUserInfo_(childUserId);
    if (!childUserInfo) {
      throw new Error(`子ユーザーが見つかりません: ${childUserId}`);
    }
    
    // 2. 親加盟店情報取得
    const parentInfo = getParentPartnerInfo_(childUserInfo.parentPartnerId);
    if (!parentInfo) {
      throw new Error(`親加盟店が見つかりません: ${childUserInfo.parentPartnerId}`);
    }
    
    // 3. 問い合わせ情報取得・検証
    const inquiryInfo = getInquiryInfo_(inquiryId);
    if (!inquiryInfo) {
      throw new Error(`問い合わせが見つかりません: ${inquiryId}`);
    }
    
    // 4. キャンセル申請データを記録
    const cancelData = recordCancelRequest_(
      childUserId,
      inquiryId,
      reason,
      additionalNotes,
      childUserInfo,
      parentInfo
    );
    
    // 5. Slack通知送信（管理用）
    sendCancelNotificationToSlack_(cancelData);
    
    // 6. 親ユーザーへの通知送信
    sendCancelNotificationToParent_(cancelData, parentInfo);
    
    console.log('キャンセル申請処理完了:', cancelData.cancelId);
    
    return {
      success: true,
      cancelId: cancelData.cancelId,
      message: 'キャンセル申請を受け付けました'
    };
    
  } catch (error) {
    console.error('キャンセル申請処理エラー:', error.toString());
    throw error;
  }
}

/**
 * 子ユーザー情報取得
 * @param {string} childUserId - 子ユーザーID
 * @return {Object|null} 子ユーザー情報
 */
function getChildUserInfo_(childUserId) {
  try {
    const sheet = getSheetByName_('加盟店子ユーザー一覧');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const childUserIdColIndex = getColumnIndex_(headers, '子ユーザーID');
    const parentPartnerIdColIndex = getColumnIndex_(headers, '親加盟店ID');
    const displayNameColIndex = getColumnIndex_(headers, '氏名（表示用）');
    const emailColIndex = getColumnIndex_(headers, 'メールアドレス');
    const areaColIndex = getColumnIndex_(headers, '対応エリア（市区町村）');
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[childUserIdColIndex] === childUserId) {
        return {
          childUserId: row[childUserIdColIndex],
          parentPartnerId: row[parentPartnerIdColIndex],
          displayName: row[displayNameColIndex],
          email: row[emailColIndex],
          area: row[areaColIndex]
        };
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('子ユーザー情報取得エラー:', error.toString());
    throw error;
  }
}

/**
 * 親加盟店情報取得
 * @param {string} parentPartnerId - 親加盟店ID
 * @return {Object|null} 親加盟店情報
 */
function getParentPartnerInfo_(parentPartnerId) {
  try {
    const sheet = getSheetByName_('加盟店情報');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const partnerIdColIndex = getColumnIndex_(headers, '加盟店ID');
    const companyNameColIndex = getColumnIndex_(headers, '会社名');
    const contactNameColIndex = getColumnIndex_(headers, '担当者名');
    const contactInfoColIndex = getColumnIndex_(headers, '担当者連絡先');
    const emailColIndex = getColumnIndex_(headers, 'メールアドレス');
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[partnerIdColIndex] === parentPartnerId) {
        return {
          partnerId: row[partnerIdColIndex],
          companyName: row[companyNameColIndex],
          contactName: row[contactNameColIndex],
          contactInfo: row[contactInfoColIndex],
          email: row[emailColIndex]
        };
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('親加盟店情報取得エラー:', error.toString());
    throw error;
  }
}

/**
 * 問い合わせ情報取得
 * @param {string} inquiryId - 問い合わせID
 * @return {Object|null} 問い合わせ情報
 */
function getInquiryInfo_(inquiryId) {
  try {
    const sheet = getSheetByName_('問い合わせ履歴');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const historyIdColIndex = getColumnIndex_(headers, '履歴ID');
    const userIdColIndex = getColumnIndex_(headers, 'ユーザーID');
    const categoryColIndex = getColumnIndex_(headers, '問い合わせ内容カテゴリ');
    const statusColIndex = getColumnIndex_(headers, '対応状況');
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[historyIdColIndex] === inquiryId) {
        return {
          inquiryId: row[historyIdColIndex],
          userId: row[userIdColIndex],
          category: row[categoryColIndex],
          status: row[statusColIndex]
        };
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('問い合わせ情報取得エラー:', error.toString());
    throw error;
  }
}

/**
 * キャンセル申請データを記録
 * @param {string} childUserId - 子ユーザーID
 * @param {string} inquiryId - 問い合わせID
 * @param {string} reason - キャンセル理由
 * @param {string} additionalNotes - 追加メモ
 * @param {Object} childUserInfo - 子ユーザー情報
 * @param {Object} parentInfo - 親加盟店情報
 * @return {Object} 記録されたキャンセルデータ
 */
function recordCancelRequest_(childUserId, inquiryId, reason, additionalNotes, childUserInfo, parentInfo) {
  try {
    // キャンセル申請IDを生成（例: CANCEL-20250531-001）
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = String(now.getTime()).slice(-3);
    const cancelId = `CANCEL-${dateStr}-${timeStr}`;
    
    const timestamp = now.toLocaleString('ja-JP');
    
    // システムログにキャンセル申請を記録
    const logSheet = getSheetByName_('システムログ');
    const logData = logSheet.getDataRange().getValues();
    const logHeaders = logData[0];
    
    const logIdColIndex = getColumnIndex_(logHeaders, 'ログID');
    const timestampColIndex = getColumnIndex_(logHeaders, 'タイムスタンプ');
    const logLevelColIndex = getColumnIndex_(logHeaders, 'ログレベル');
    const sourceColIndex = getColumnIndex_(logHeaders, '発生元');
    const eventTypeColIndex = getColumnIndex_(logHeaders, 'イベントタイプ');
    const messageColIndex = getColumnIndex_(logHeaders, 'メッセージ');
    const relatedIdColIndex = getColumnIndex_(logHeaders, '関連ID');
    
    const logId = `LOG-${String(Date.now()).slice(-10)}`;
    const logMessage = `キャンセル申請受付: ${childUserInfo.displayName}(${childUserId}) - 問い合わせ${inquiryId} - 理由: ${reason}`;
    
    logSheet.appendRow([
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ]);
    
    const lastRow = logSheet.getLastRow();
    logSheet.getRange(lastRow, logIdColIndex + 1).setValue(logId);
    logSheet.getRange(lastRow, timestampColIndex + 1).setValue(timestamp);
    logSheet.getRange(lastRow, logLevelColIndex + 1).setValue('INFO');
    logSheet.getRange(lastRow, sourceColIndex + 1).setValue('キャンセル申請');
    logSheet.getRange(lastRow, eventTypeColIndex + 1).setValue('キャンセル申請受付');
    logSheet.getRange(lastRow, messageColIndex + 1).setValue(logMessage);
    logSheet.getRange(lastRow, relatedIdColIndex + 1).setValue(inquiryId);
    
    return {
      cancelId: cancelId,
      childUserId: childUserId,
      inquiryId: inquiryId,
      reason: reason,
      additionalNotes: additionalNotes,
      timestamp: timestamp,
      childUserInfo: childUserInfo,
      parentInfo: parentInfo
    };
    
  } catch (error) {
    console.error('キャンセル申請データ記録エラー:', error.toString());
    throw error;
  }
}

/**
 * Slack通知送信（管理用）
 * @param {Object} cancelData - キャンセル申請データ
 */
function sendCancelNotificationToSlack_(cancelData) {
  try {
    const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_CANCEL_WEBHOOK_URL');
    
    if (!webhookUrl) {
      throw new Error('SLACK_CANCEL_WEBHOOK_URL が設定されていません');
    }
    
    const message = `🚨 キャンセル申請を受け付けました

📌 子ユーザー名: ${cancelData.childUserInfo.displayName}
🏢 加盟店ID: ${cancelData.parentInfo.partnerId}
🏭 会社名: ${cancelData.parentInfo.companyName}
📋 問い合わせID: ${cancelData.inquiryId}
📅 申請日時: ${cancelData.timestamp}
📝 理由: ${cancelData.reason}
${cancelData.additionalNotes ? `💬 追加メモ: ${cancelData.additionalNotes}` : ''}

対応をお願いします。`;
    
    const payload = {
      text: message
    };
    
    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`Slack通知送信失敗: ${response.getResponseCode()} - ${response.getContentText()}`);
    }
    
    console.log('Slack通知送信成功:', cancelData.cancelId);
    
  } catch (error) {
    console.error('Slack通知送信エラー:', error.toString());
    throw error;
  }
}

/**
 * 親ユーザーへの通知送信
 * @param {Object} cancelData - キャンセル申請データ
 * @param {Object} parentInfo - 親加盟店情報
 */
function sendCancelNotificationToParent_(cancelData, parentInfo) {
  try {
    // メール通知を送信
    const subject = '【重要】キャンセル申請のお知らせ';
    const body = `${parentInfo.contactName} 様

いつもお世話になっております。
外壁塗装くらべるAI運営事務局です。

以下のキャンセル申請を受け付けましたのでご連絡いたします。

■ キャンセル申請詳細
申請者: ${cancelData.childUserInfo.displayName}
問い合わせID: ${cancelData.inquiryId}
申請日時: ${cancelData.timestamp}
キャンセル理由: ${cancelData.reason}
${cancelData.additionalNotes ? `追加メモ: ${cancelData.additionalNotes}` : ''}

■ 今後の対応
管理画面から詳細をご確認いただき、必要に応じて対応をお願いいたします。

ご不明な点がございましたら、お気軽にお問い合わせください。

---
外壁塗装くらべるAI運営事務局`;
    
    // メール送信
    if (parentInfo.email) {
      MailApp.sendEmail({
        to: parentInfo.email,
        subject: subject,
        body: body
      });
      
      console.log('親ユーザーメール通知送信成功:', parentInfo.email);
    } else {
      console.warn('親ユーザーのメールアドレスが設定されていません:', parentInfo.partnerId);
    }
    
  } catch (error) {
    console.error('親ユーザー通知送信エラー:', error.toString());
    // 親ユーザー通知の失敗は全体処理を停止させない
    console.warn('親ユーザー通知は失敗しましたが、処理を継続します');
  }
}

/**
 * キャンセル申請処理のテスト関数
 */
function testHandleCancelRequest() {
  try {
    console.log('=== キャンセル申請テスト開始 ===');
    
    // テストデータ
    const testData = {
      childUserId: 'CHILD-001',
      inquiryId: 'INQ-00001',
      reason: '工事スケジュールの都合により一時中断',
      additionalNotes: 'お客様との再調整後、改めて連絡予定'
    };
    
    console.log('テストデータ:', testData);
    
    // キャンセル申請処理実行
    const result = handleCancelRequest(
      testData.childUserId,
      testData.inquiryId,
      testData.reason,
      testData.additionalNotes
    );
    
    console.log('テスト結果:', result);
    console.log('=== キャンセル申請テスト完了 ===');
    
    return result;
    
  } catch (error) {
    console.error('テスト実行エラー:', error.toString());
    console.log('=== キャンセル申請テスト失敗 ===');
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * 簡易テスト（データ確認のみ）
 */
function testDataRetrieval() {
  try {
    console.log('=== データ取得テスト開始 ===');
    
    // 子ユーザー情報テスト
    const childInfo = getChildUserInfo_('CHILD-001');
    console.log('子ユーザー情報:', childInfo);
    
    if (childInfo) {
      // 親加盟店情報テスト
      const parentInfo = getParentPartnerInfo_(childInfo.parentPartnerId);
      console.log('親加盟店情報:', parentInfo);
    }
    
    // 問い合わせ情報テスト
    const inquiryInfo = getInquiryInfo_('INQ-00001');
    console.log('問い合わせ情報:', inquiryInfo);
    
    console.log('=== データ取得テスト完了 ===');
    
    return true;
    
  } catch (error) {
    console.error('データ取得テストエラー:', error.toString());
    return false;
  }
}