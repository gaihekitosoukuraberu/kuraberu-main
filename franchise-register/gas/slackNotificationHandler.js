/**
 * Slack通知ハンドラー
 * 加盟店登録時の通知と承認フローを管理
 */

/**
 * 加盟店登録をSlackに通知
 * @param {Object} registrationData - 登録データ
 * @return {Object} 通知結果
 */
function sendSlackRegistrationNotification(registrationData) {
  try {
    const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');

    if (!webhookUrl) {
      console.error('Slack Webhook URLが設定されていません');
      return { success: false, message: 'Slack設定エラー' };
    }

    // 登録IDを生成または取得
    const registrationId = registrationData.registrationId || 'FR' + Utilities.formatDate(new Date(), 'JST', 'MMddHHmm');

    // 支店情報のフォーマット
    const branches = registrationData.companyInfo?.branches || [];
    const branchText = branches.length > 0
      ? branches.map(b => `• ${b.name}: ${b.address}`).join('\n')
      : '支店情報なし';

    // 過去データチェック（V1708: 包括的な警告システム実装）
    let pastDataWarning = '';
    let foundData = false;
    let warningMessages = [];
    let criticalLevel = 0; // 0=問題なし, 1=注意, 2=警告, 3=重大, 4=却下推奨

    try {
      const companyName = registrationData.companyInfo?.legalName || registrationData.companyName;
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const pastDataSheet = ss.getSheetByName('過去データ');

      if (pastDataSheet && companyName) {
        const pastData = pastDataSheet.getDataRange().getValues();
        const pastHeaders = pastData[0];

        // V1708: 全カラムのインデックスを取得
        const businessNameIndex = pastHeaders.indexOf('業者名');
        const bankruptcyFlagIndex = pastHeaders.indexOf('貸倒フラグ');
        const warningStatusIndex = pastHeaders.indexOf('要注意先ステータス');
        const contractCountIndex = pastHeaders.indexOf('成約件数');
        const hiddenContractIndex = pastHeaders.indexOf('成約隠し件数');
        const unpaidRateIndex = pastHeaders.indexOf('未入金発生率');
        const avgDelayPerInvoiceIndex = pastHeaders.indexOf('1請求あたり平均遅延日数');
        const complaintCountIndex = pastHeaders.indexOf('ユーザークレーム回数');
        const complaintContentIndex = pastHeaders.indexOf('クレーム詳細・内容');
        const delayIndex = pastHeaders.indexOf('遅延日数合計');

        // 過去データを検索
        for (let i = 1; i < pastData.length; i++) {
          if (pastData[i][businessNameIndex] === companyName) {
            foundData = true;

            // V1708 Priority 1: 貸倒フラグチェック（最高優先度）
            const bankruptcyFlag = pastData[i][bankruptcyFlagIndex];
            if (bankruptcyFlag === true || bankruptcyFlag === 'TRUE' || bankruptcyFlag === '○' || bankruptcyFlag === 'YES') {
              warningMessages.push('🔴🔴 *【却下推奨】貸倒発生あり*');
              criticalLevel = Math.max(criticalLevel, 4);
            }

            // V1708 Priority 1: 要注意先ステータスチェック
            const warningStatus = pastData[i][warningStatusIndex];
            if (warningStatus && warningStatus !== '' && warningStatus !== '-') {
              warningMessages.push(`🟠 *要注意先指定:* ${warningStatus}`);
              criticalLevel = Math.max(criticalLevel, 2);
            }

            // V1708 Priority 2: 成約隠し件数チェック（比率計算）
            const contractCount = parseFloat(pastData[i][contractCountIndex]) || 0;
            const hiddenCount = parseFloat(pastData[i][hiddenContractIndex]) || 0;
            if (contractCount > 0 && hiddenCount > 0) {
              const hiddenRate = (hiddenCount / contractCount * 100).toFixed(1);
              if (parseFloat(hiddenRate) >= 30) {
                warningMessages.push(`🔴 *成約隠し率: ${hiddenRate}%* (${hiddenCount}件/${contractCount}件)`);
                criticalLevel = Math.max(criticalLevel, 3);
              } else if (parseFloat(hiddenRate) >= 15) {
                warningMessages.push(`🟠 *成約隠し率: ${hiddenRate}%* (${hiddenCount}件/${contractCount}件)`);
                criticalLevel = Math.max(criticalLevel, 2);
              } else if (hiddenCount > 0) {
                warningMessages.push(`🟡 *成約隠し: ${hiddenCount}件* (全${contractCount}件中 ${hiddenRate}%)`);
                criticalLevel = Math.max(criticalLevel, 1);
              }
            }

            // V1708 Priority 3: ユーザークレームチェック（1件でも報告）
            const complaintCount = parseFloat(pastData[i][complaintCountIndex]) || 0;
            const complaintContent = pastData[i][complaintContentIndex] || '';
            if (complaintCount > 0) {
              if (complaintCount >= 3) {
                warningMessages.push(`🔴 *ユーザークレーム: ${complaintCount}件*`);
                criticalLevel = Math.max(criticalLevel, 3);
              } else if (complaintCount >= 2) {
                warningMessages.push(`🟠 *ユーザークレーム: ${complaintCount}件*`);
                criticalLevel = Math.max(criticalLevel, 2);
              } else {
                warningMessages.push(`🟡 *ユーザークレーム: ${complaintCount}件*`);
                criticalLevel = Math.max(criticalLevel, 1);
              }

              // クレーム内容を添付
              if (complaintContent && complaintContent !== '' && complaintContent !== '-') {
                warningMessages.push(`   内容: ${complaintContent}`);
              }
            }

            // V1708 Priority 4: 未入金分析（発生率＋平均遅延日数）
            const unpaidRate = parseFloat(pastData[i][unpaidRateIndex]) || 0;
            const avgDelayPerInvoice = parseFloat(pastData[i][avgDelayPerInvoiceIndex]) || 0;

            if (unpaidRate > 0 || avgDelayPerInvoice > 0) {
              let unpaidWarning = '';
              if (unpaidRate >= 30 && avgDelayPerInvoice >= 15) {
                unpaidWarning = `🔴 *未入金リスク高:* 発生率 ${unpaidRate.toFixed(1)}% / 平均遅延 ${avgDelayPerInvoice.toFixed(1)}日`;
                criticalLevel = Math.max(criticalLevel, 3);
              } else if (unpaidRate >= 15 || avgDelayPerInvoice >= 10) {
                unpaidWarning = `🟠 *未入金リスク中:* 発生率 ${unpaidRate.toFixed(1)}% / 平均遅延 ${avgDelayPerInvoice.toFixed(1)}日`;
                criticalLevel = Math.max(criticalLevel, 2);
              } else if (unpaidRate >= 5 || avgDelayPerInvoice >= 5) {
                unpaidWarning = `🟡 未入金あり: 発生率 ${unpaidRate.toFixed(1)}% / 平均遅延 ${avgDelayPerInvoice.toFixed(1)}日`;
                criticalLevel = Math.max(criticalLevel, 1);
              }
              if (unpaidWarning) {
                warningMessages.push(unpaidWarning);
              }
            }

            // 既存の遅延日数合計チェック（参考情報として継続）
            const paymentDelay = parseFloat(pastData[i][delayIndex]) || 0;
            if (paymentDelay > 0) {
              if (paymentDelay >= 60) {
                warningMessages.push(`🔴 支払遅延累計: ${paymentDelay}日`);
                criticalLevel = Math.max(criticalLevel, 3);
              } else if (paymentDelay >= 30) {
                warningMessages.push(`🟠 支払遅延累計: ${paymentDelay}日`);
                criticalLevel = Math.max(criticalLevel, 2);
              } else {
                warningMessages.push(`🟡 支払遅延累計: ${paymentDelay}日`);
                criticalLevel = Math.max(criticalLevel, 1);
              }
            }

            break;
          }
        }

        // V1710: 過去業者リスト照合（名前変更業者の検出）
        try {
          const pastMerchantsListSheet = ss.getSheetByName('過去業者リスト');

          if (pastMerchantsListSheet) {
            console.log('[V1710] 過去業者リスト照合開始');
            const listData = pastMerchantsListSheet.getDataRange().getValues();
            const listHeaders = listData[0];
            const listRows = listData.slice(1);

            const registrationPhone = registrationData.companyInfo?.phone || '';
            const registrationAddress = registrationData.companyInfo?.fullAddress || '';

            const listColIndex = {
              clientName: listHeaders.indexOf('クライアント名'),
              address: listHeaders.indexOf('住所'),
              mainPhone: listHeaders.indexOf('代表電話'),
              contactPhone1: listHeaders.indexOf('担当電話番号1'),
              contactPhone2: listHeaders.indexOf('担当電話番号2'),
              warningStatus: listHeaders.indexOf('要注意先')
            };

            const normalizedRegPhone = normalizePhoneForSlack(registrationPhone);
            const normalizedRegAddress = normalizeAddressForSlack(registrationAddress);

            console.log(`[V1710] 照合対象: ${companyName} / Tel: ${normalizedRegPhone} / Address: ${normalizedRegAddress}`);

            for (let j = 0; j < listRows.length; j++) {
              const listClientName = listRows[j][listColIndex.clientName] || '';
              const listMainPhone = normalizePhoneForSlack(listRows[j][listColIndex.mainPhone]);
              const listContactPhone1 = normalizePhoneForSlack(listRows[j][listColIndex.contactPhone1]);
              const listContactPhone2 = normalizePhoneForSlack(listRows[j][listColIndex.contactPhone2]);
              const listAddress = normalizeAddressForSlack(listRows[j][listColIndex.address]);
              const listWarningStatus = listRows[j][listColIndex.warningStatus];

              // 電話番号マッチング
              const phoneMatch = normalizedRegPhone && (
                normalizedRegPhone === listMainPhone ||
                normalizedRegPhone === listContactPhone1 ||
                normalizedRegPhone === listContactPhone2
              );

              // 住所マッチング（部分一致）
              const addressMatch = normalizedRegAddress && listAddress &&
                normalizedRegAddress.length > 5 && listAddress.length > 5 &&
                (normalizedRegAddress.indexOf(listAddress) !== -1 || listAddress.indexOf(normalizedRegAddress) !== -1);

              if (phoneMatch || addressMatch) {
                const nameMatch = companyName === listClientName;

                if (!nameMatch) {
                  // 名前が異なる！過去にやらかした業者が名前を変えて再加盟の疑い
                  console.log(`[V1710] 🚨 名前変更検出: ${companyName} ≠ ${listClientName}`);
                  warningMessages.push(`🔴🔴 *【名前変更の疑い】過去業者リストと照合*`);
                  warningMessages.push(`   過去の名前: ${listClientName}`);
                  warningMessages.push(`   照合方法: ${phoneMatch ? '電話番号' : '住所'}一致`);
                  if (listWarningStatus && listWarningStatus !== '' && listWarningStatus !== '-') {
                    warningMessages.push(`   過去の要注意先: ${listWarningStatus}`);
                  }
                  criticalLevel = Math.max(criticalLevel, 4);
                  break; // 1件見つかれば十分
                } else {
                  console.log(`[V1710] 同一業者を確認: ${companyName}`);
                }
              }
            }

            console.log('[V1710] 過去業者リスト照合完了');
          } else {
            console.log('[V1710] 過去業者リストシートが見つかりません');
          }
        } catch (listErr) {
          console.error('[V1710] 過去業者リスト照合エラー:', listErr);
        }

        // 警告メッセージの生成
        if (foundData && warningMessages.length > 0) {
          let recommendationText = '';
          if (criticalLevel === 4) {
            recommendationText = '\n\n⛔️ *【推奨アクション】登録却下を検討*';
          } else if (criticalLevel === 3) {
            recommendationText = '\n\n⚠️ *【推奨アクション】サイレント承認 + 厳重監視*';
          } else if (criticalLevel === 2) {
            recommendationText = '\n\n⚠️ *【推奨アクション】サイレント承認を推奨*';
          } else if (criticalLevel === 1) {
            recommendationText = '\n\nℹ️ 注意事項あり - 要確認';
          }

          pastDataWarning = warningMessages.join('\n') + recommendationText;
        } else if (foundData && warningMessages.length === 0) {
          pastDataWarning = '✅ 過去データあり（問題なし）';
        } else {
          pastDataWarning = 'ℹ️ 過去データなし（新規加盟店）';
        }
      } else {
        // 過去データシートが見つからない場合
        pastDataWarning = 'ℹ️ 過去データなし（新規加盟店）';
      }
    } catch (err) {
      console.error('[Slack] 過去データチェックエラー:', err);
      pastDataWarning = 'ℹ️ 過去データチェックエラー: ' + err.toString();
    }

    // Slackメッセージの構築
    const message = {
      text: '@channel 🎉 新規加盟店登録がありました',
      attachments: [
        {
          color: 'good',
          title: '加盟店登録申請',
          fields: [
            {
              title: '登録ID',
              value: registrationId,
              short: true
            },
            {
              title: '会社名',
              value: registrationData.companyInfo?.legalName || registrationData.companyName,
              short: true
            },
            {
              title: '代表者名',
              value: registrationData.companyInfo?.representative || '未入力',
              short: true
            },
            {
              title: '電話番号',
              value: registrationData.companyInfo?.phone || '未入力',
              short: true
            },
            {
              title: '住所',
              value: registrationData.companyInfo?.fullAddress || '未入力',
              short: false
            },
            {
              title: '対応エリア',
              value: registrationData.selectedPrefectures?.join(', ') || '未選択',
              short: false
            },
            {
              title: '支店情報',
              value: branchText,
              short: false
            },
            {
              title: '登録日時',
              value: Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss'),
              short: true
            },
            {
              title: 'ステータス',
              value: '承認待ち',
              short: true
            }
          ].concat(pastDataWarning ? [{
            title: '⚠️ 過去データ警告',
            value: pastDataWarning,
            short: false
          }] : []),
          footer: '外壁塗装くらべるAI',
          ts: Math.floor(Date.now() / 1000)
        }
      ],
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*新規加盟店登録*\n会社名: *${registrationData.companyInfo?.legalName || registrationData.companyName}*`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '✅ 承認',
                emoji: true
              },
              style: 'primary',
              value: `approve_${registrationId}`,
              action_id: 'approve_registration'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🔇 サイレントで承認',
                emoji: true
              },
              style: 'primary',
              value: `approve_silent_${registrationId}`,
              action_id: 'approve_silent_registration'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '❌ 却下',
                emoji: true
              },
              style: 'danger',
              value: `reject_${registrationId}`,
              action_id: 'reject_registration'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📊 スプレッドシートを開く',
                emoji: true
              },
              url: getSpreadsheetUrl(),
              action_id: 'open_spreadsheet'
            }
          ]
        }
      ]
    };

    // Slack APIにPOST
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(message),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(webhookUrl, options);

    if (response.getResponseCode() === 200) {
      console.log('Slack通知送信成功:', registrationId);
      return {
        success: true,
        message: 'Slack通知を送信しました',
        registrationId: registrationId
      };
    } else {
      console.error('Slack通知送信失敗:', response.getContentText());
      return {
        success: false,
        message: 'Slack通知の送信に失敗しました'
      };
    }

  } catch (error) {
    console.error('Slack通知エラー:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * 承認処理の実行
 * @param {string} registrationId - 登録ID
 * @param {string} approver - 承認者（Slackユーザー名）
 * @return {Object} 処理結果
 */
function approveRegistration(registrationId, approver = 'Slack承認') {
  try {
    console.log('承認処理開始:', registrationId);

    // スプレッドシートのステータスと承認者を更新
    updateRegistrationStatus(registrationId, '承認済み', approver);

    // 承認完了通知をSlackに送信
    sendApprovalNotification(registrationId, true, approver);

    // 初回ログインURL生成とメール送信
    // TODO: メール送信機能は後で実装
    // 現在は承認ステータスの更新とSlack通知のみ実行
    /*
    try {
      const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();

      // 登録IDで該当行を検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === registrationId) {
          const email = data[i][22] || data[i][21]; // W列(営業)またはV列(請求)メールアドレス
          const companyName = data[i][2]; // C列：会社名

          if (email) {
            // 初回ログインURL生成とメール送信
            // const loginUrl = generateFirstLoginUrl(registrationId);
            // sendWelcomeEmail(email, companyName, loginUrl);
            console.log(`メール送信予定: ${email} (${registrationId})`);
          } else {
            console.warn('メールアドレスが登録されていません');
          }
          break;
        }
      }
    } catch (emailError) {
      console.error('メール送信エラー:', emailError);
      // メール送信に失敗しても承認処理は続行
    }
    */

    return {
      success: true,
      message: '承認処理が完了しました'
    };

  } catch (error) {
    console.error('承認処理エラー:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * 却下処理の実行
 * @param {string} registrationId - 登録ID
 * @param {string} reason - 却下理由
 * @param {string} rejector - 却下者（Slackユーザー名）
 * @return {Object} 処理結果
 */
function rejectRegistration(registrationId, reason = '', rejector = 'Slack却下') {
  try {
    console.log('却下処理開始:', registrationId);

    // スプレッドシートのステータス、却下者、理由を更新
    updateRegistrationStatus(registrationId, '却下', rejector, reason);

    // 却下通知をSlackに送信
    sendApprovalNotification(registrationId, false, rejector, reason);

    return {
      success: true,
      message: '却下処理が完了しました'
    };

  } catch (error) {
    console.error('却下処理エラー:', error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * 承認/却下の結果をSlackに通知
 * @param {string} registrationId - 登録ID
 * @param {boolean} isApproved - 承認/却下
 * @param {string} user - 処理者
 * @param {string} reason - 却下理由（却下時のみ）
 */
function sendApprovalNotification(registrationId, isApproved, user = '', reason = '') {
  try {
    const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');

    if (!webhookUrl) {
      console.error('[Slack] Webhook URLが設定されていません');
      return;
    }

    const fields = [
      {
        title: 'ステータス',
        value: isApproved ? '承認済み' : '却下',
        short: true
      },
      {
        title: '処理者',
        value: user || (isApproved ? '管理者' : '管理者'),
        short: true
      },
      {
        title: '処理日時',
        value: Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss'),
        short: true
      }
    ];

    // 却下理由がある場合は追加
    if (!isApproved && reason) {
      fields.push({
        title: '却下理由',
        value: reason,
        short: false
      });
    }

    const message = {
      text: isApproved
        ? `@channel ✅ 登録ID: ${registrationId} が承認されました`
        : `@channel ❌ 登録ID: ${registrationId} が却下されました`,
      attachments: [
        {
          color: isApproved ? 'good' : 'danger',
          fields: fields
        }
      ]
    };

    console.log('[Slack] 通知送信中 - ID:', registrationId, 'Approved:', isApproved);

    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(message),
      muteHttpExceptions: true
    });

    if (response.getResponseCode() === 200) {
      console.log('[Slack] 通知送信成功 - ID:', registrationId);
    } else {
      console.error('[Slack] 通知送信失敗:', response.getContentText());
    }

  } catch (error) {
    console.error('[Slack] 通知エラー:', error);
  }
}

/**
 * スプレッドシートのステータスを更新
 * @param {string} registrationId - 登録ID
 * @param {string} status - 新しいステータス
 * @param {string} user - 処理者（承認者/却下者）
 * @param {string} reason - 却下理由（却下時のみ）
 */
function updateRegistrationStatus(registrationId, status, user = '', reason = '') {
  try {
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!spreadsheetId) {
      throw new Error('スプレッドシートIDが設定されていません');
    }

    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('加盟店登録');
    if (!sheet) {
      throw new Error('加盟店登録シートが見つかりません');
    }

    // 登録IDで行を検索
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    let found = false;
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === registrationId) { // B列が登録ID（インデックス1）
        const row = i + 1;

        // AJ列（36列目）：ステータスを更新
        // 承認済みの場合は「準備中」に、却下の場合は「却下」に設定
        const ajStatus = status === '承認済み' ? '準備中' : '却下';
        sheet.getRange(row, 36).setValue(ajStatus);

        // AK列（37列目）：承認ステータスを更新
        sheet.getRange(row, 37).setValue(status);

        // AL列（38列目）：処理日時を更新
        sheet.getRange(row, 38).setValue(new Date());

        // AM列（39列目）：処理者（承認者/却下者）を更新
        if (user) {
          sheet.getRange(row, 39).setValue(user);
        }

        // AN列（40列目）：却下理由を更新（却下時のみ）
        if (status === '却下' && reason) {
          sheet.getRange(row, 40).setValue(reason);
        }

        // 承認時に初回ログインメールを送信
        if (status === '承認済み') {
          try {
            console.log('[SlackNotification] 初回ログインメール送信開始');

            const email = values[i][22]; // W列: 営業用メールアドレス
            const companyName = values[i][2]; // C列: 会社名

            console.log('[SlackNotification] メール送信先:', email);
            console.log('[SlackNotification] 会社名:', companyName);

            if (email && companyName) {
              // 初回ログインURL生成
              console.log('[SlackNotification] URL生成中...');
              const loginUrl = generateFirstLoginUrl(registrationId);
              console.log('[SlackNotification] 生成されたURL:', loginUrl);

              // メール送信
              console.log('[SlackNotification] メール送信中...');
              sendWelcomeEmail(email, companyName, loginUrl);
              console.log('[SlackNotification] 初回ログインメール送信成功:', email, registrationId);
            } else {
              console.error('[SlackNotification] メールアドレスまたは会社名が見つかりません');
              console.error('[SlackNotification] Email:', email, 'CompanyName:', companyName, 'ID:', registrationId);
            }
          } catch (emailErr) {
            console.error('[SlackNotification] 初回ログインメール送信エラー:', emailErr);
            console.error('[SlackNotification] エラー詳細:', emailErr.stack);
          }
        }

        // 更新後に明示的に保存
        SpreadsheetApp.flush();
        console.log(`ステータス更新完了: ${registrationId} → ${status} (処理者: ${user})`);
        found = true;
        break;
      }
    }

    // 該当する登録IDが見つからなかった場合
    if (!found) {
      console.error(`[updateRegistrationStatus] 登録IDが見つかりません: ${registrationId}`);
      throw new Error(`登録IDが見つかりません: ${registrationId}`);
    }

  } catch (error) {
    console.error('ステータス更新エラー:', error);
    throw error;
  }
}

/**
 * スプレッドシートのURLを取得
 * @return {string} スプレッドシートのURL
 */
function getSpreadsheetUrl() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (spreadsheetId) {
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  }
  return 'https://docs.google.com/spreadsheets/';
}


/**
 * Slack Interactionの処理（main.gsから呼び出される）
 * @param {Object} data - リクエストデータ
 * @return {Object} 処理結果
 */
function handleSlackInteraction(data) {
  try {
    // data.payloadが既にオブジェクトの場合とJSON文字列の場合の両方に対応
    const payload = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;
    console.log('[Slack Interaction] 処理開始:', payload.type);

    if (payload.type === 'block_actions') {
      const action = payload.actions[0];
      const user = payload.user ? payload.user.name : 'Slackユーザー';

      console.log('[Slack Interaction] Action:', action.action_id);

      if (action.action_id === 'approve_registration') {
        const registrationId = action.value.replace('approve_', '');
        console.log('[Slack Interaction] 承認処理:', registrationId);

        // updateRegistrationStatusでステータス更新のみ実行（通知は送らない）
        updateRegistrationStatus(registrationId, '承認済み', user);

        // 承認完了通知を1回だけ送信
        sendApprovalNotification(registrationId, true, user);

        // Slackに即座にレスポンスを返す（200 OK）
        return ContentService
          .createTextOutput(JSON.stringify({
            text: `✅ 承認処理を実行しました\nID: ${registrationId}\n処理者: ${user}`
          }))
          .setMimeType(ContentService.MimeType.JSON);

      } else if (action.action_id === 'reject_registration') {
        const registrationId = action.value.replace('reject_', '');
        console.log('[Slack Interaction] 却下処理:', registrationId);

        // updateRegistrationStatusでステータス更新のみ実行（通知は送らない）
        updateRegistrationStatus(registrationId, '却下', user, '');

        // 却下通知を1回だけ送信
        sendApprovalNotification(registrationId, false, user, '');

        // Slackに即座にレスポンスを返す（200 OK）
        return ContentService
          .createTextOutput(JSON.stringify({
            text: `❌ 却下処理を実行しました\nID: ${registrationId}\n処理者: ${user}`
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // デフォルトレスポンス
    return ContentService
      .createTextOutput(JSON.stringify({text: 'OK'}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Slack Webhook処理エラー:', error);
    // エラーでも200 OKを返す
    return ContentService
      .createTextOutput(JSON.stringify({
        text: `エラーが発生しました: ${error.toString()}`
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * V1710: 電話番号の正規化（比較用）
 * @param {string} phone - 電話番号
 * @return {string} 正規化された電話番号
 */
function normalizePhoneForSlack(phone) {
  if (!phone) return '';
  return String(phone)
    .replace(/[^0-9]/g, '') // 数字以外を削除（ハイフン、括弧など）
    .replace(/^0+/, ''); // 先頭の0を削除（03-1234-5678 → 312345678）
}

/**
 * V1710: 住所の正規化（比較用）
 * @param {string} address - 住所
 * @return {string} 正規化された住所
 */
function normalizeAddressForSlack(address) {
  if (!address) return '';
  return String(address)
    .replace(/\s+/g, '') // 空白削除
    .replace(/[０-９]/g, function(s) { // 全角数字を半角に
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
}