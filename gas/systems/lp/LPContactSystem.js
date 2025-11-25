/**
 * ====================================
 * LP問い合わせフォーム管理システム
 * ====================================
 *
 * 【機能】
 * - LPフォームからの問い合わせデータをスプレッドシートに保存
 * - Slack通知送信
 *
 * 【V1845】 2025-11-21 17:30 - LP問い合わせ処理システム作成
 * - lp_contact_submit アクション対応
 * - ユーザー登録シートへの書き込み
 * - Slack通知機能実装
 */

const LPContactSystem = {
  /**
   * 名前
   */
  name: 'LPContactSystem',

  /**
   * スプレッドシートID（環境変数から取得）
   */
  get SPREADSHEET_ID() {
    return PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  },

  /**
   * POSTリクエスト処理
   * @param {Object} e - イベントオブジェクト
   * @param {Object} postData - POSTデータ
   * @return {Object} 処理結果
   */
  handlePost: function(e, postData) {
    try {
      console.log('[LPContactSystem] handlePost called');
      console.log('[LPContactSystem] postData:', JSON.stringify(postData));

      const action = postData.action || e.parameter.action;

      if (action === 'lp_contact_submit') {
        return this.saveLPContact(postData);
      }

      return {
        success: false,
        error: `Unknown action: ${action}`
      };

    } catch (error) {
      console.error('[LPContactSystem] handlePost error:', error);
      return {
        success: false,
        error: error.toString(),
        stack: error.stack
      };
    }
  },

  /**
   * LP問い合わせデータを保存
   * @param {Object} data - フォームデータ
   * @return {Object} 処理結果
   */
  saveLPContact: function(data) {
    try {
      console.log('[LPContactSystem] saveLPContact start');
      console.log('[LPContactSystem] Received data:', JSON.stringify(data));

      // データ検証
      if (!data.name || !data.email || !data.phone) {
        return {
          success: false,
          error: '必須項目が不足しています（name, email, phone）'
        };
      }

      // スプレッドシート取得
      const ss = SpreadsheetApp.openById(this.SPREADSHEET_ID);
      const sheet = ss.getSheetByName('ユーザー登録');

      if (!sheet) {
        console.error('[LPContactSystem] ユーザー登録シートが見つかりません');
        return {
          success: false,
          error: 'ユーザー登録シートが見つかりません'
        };
      }

      // タイムスタンプ
      const timestamp = new Date();

      // CVID生成（LP + タイムスタンプ）
      const cvId = 'LP' + timestamp.getTime();
      console.log('[LPContactSystem] Generated CVID:', cvId);

      // 郵便番号から住所を取得（Yahoo API）
      let prefecture = '';
      let city = '';
      let addressKana = '';

      if (data.postalCode) {
        const addressInfo = this.getAddressFromPostalCode(data.postalCode);
        if (addressInfo) {
          prefecture = addressInfo.prefecture || '';
          city = addressInfo.city || '';
          addressKana = addressInfo.kana || '';
          console.log('[LPContactSystem] Address from postal code:', addressInfo);
        }
      }

      // 電話番号フォーマット（0が抜けないように文字列として扱う）
      const phoneStr = "'" + (data.phone || '');  // 先頭にシングルクォートを付けて文字列として扱う

      // 行データを準備（73列 - CVSheetSystem準拠）
      // A-M(1-13): 基本情報
      const rowData = [
        cvId,                                    // A(1): CV ID
        timestamp,                               // B(2): 登録日時
        data.name || '',                         // C(3): 氏名
        '',                                      // D(4): フリガナ（空）
        '',                                      // E(5): 性別（空）
        '',                                      // F(6): 年齢（空）
        phoneStr,                                // G(7): 電話番号（'付き文字列）
        data.email || '',                        // H(8): メールアドレス
        '',                                      // I(9): 続柄（空）
        '',                                      // J(10): 氏名（2人目）
        '',                                      // K(11): 電話番号（2人目）
        '',                                      // L(12): 続柄（2人目）
        '',                                      // M(13): 備考（2人目）

        // N-R(14-18): 物件住所
        data.postalCode ? "'" + data.postalCode : '',  // N(14): 郵便番号（物件）（'付き文字列）
        prefecture,                              // O(15): 都道府県（物件）
        city,                                    // P(16): 市区町村（物件）
        '',                                      // Q(17): 住所詳細（物件）
        addressKana,                             // R(18): 住所フリガナ

        // S-V(19-22): 自宅住所
        'FALSE',                                 // S(19): 自宅住所フラグ
        '',                                      // T(20): 郵便番号（自宅）
        '',                                      // U(21): 都道府県（自宅）
        '',                                      // V(22): 住所詳細（自宅）

        // W-Z(23-26): 物件詳細
        '',                                      // W(23): 物件種別
        '',                                      // X(24): 築年数
        '',                                      // Y(25): 建物面積
        '',                                      // Z(26): 階数

        // AA-AQ(27-43): BOT質問回答（Q1〜Q17）
        '',                                      // AA(27): Q1_物件種別
        '',                                      // AB(28): Q2_階数
        '',                                      // AC(29): Q3_築年数
        '',                                      // AD(30): Q4_工事歴
        '',                                      // AE(31): Q5_前回施工時期
        '',                                      // AF(32): Q6_外壁材質
        '',                                      // AG(33): Q7_屋根材質
        '',                                      // AH(34): Q8_気になる箇所
        '',                                      // AI(35): Q9_希望工事内容_外壁
        '',                                      // AJ(36): Q10_希望工事内容_屋根
        '',                                      // AK(37): Q11_見積もり保有数
        '',                                      // AL(38): Q12_見積もり取得先
        '',                                      // AM(39): Q13_訪問業者有無
        '',                                      // AN(40): Q14_比較意向
        '',                                      // AO(41): Q15_訪問業者名
        '',                                      // AP(42): Q16_現在の劣化状況
        '',                                      // AQ(43): Q17_業者選定条件

        // AR-AW(44-49): CV2入力項目・運用項目
        '',                                      // AR(44): 現地調査希望日時
        '',                                      // AS(45): 業者選定履歴
        data.inquiryContent || '',               // AT(46): 案件メモ
        '',                                      // AU(47): 連絡時間帯
        '',                                      // AV(48): 見積もり送付先
        '',                                      // AW(49): ワードリンク回答

        // AX-BD(50-56): 配信・成約管理
        '未配信',                                 // AX(50): 配信ステータス
        0,                                       // AY(51): 配信先加盟店数
        '',                                      // AZ(52): 配信日時
        'FALSE',                                 // BA(53): 成約フラグ
        '',                                      // BB(54): 成約日時
        '',                                      // BC(55): 成約加盟店ID
        '',                                      // BD(56): 成約金額

        // BE-BG(57-59): 流入トラッキング
        '',                                      // BE(57): 流入元URL
        '',                                      // BF(58): 検索キーワード
        '',                                      // BG(59): UTMパラメータ

        // BH-BJ(60-62): 不正対策
        1,                                       // BH(60): 訪問回数
        timestamp,                               // BI(61): 最終訪問日時
        'FALSE',                                 // BJ(62): ブロックフラグ

        // BK-BM(63-65): フォローアップ履歴
        '',                                      // BK(63): 架電履歴
        '',                                      // BL(64): 次回架電日時
        '',                                      // BM(65): メモ

        // BN-BU(66-73): 管理用フィールド
        '新規',                                   // BN(66): 管理ステータス
        '',                                      // BO(67): 加盟店別ステータス（JSON）
        '',                                      // BP(68): 初回架電日時
        timestamp,                               // BQ(69): 最終更新日時
        '',                                      // BR(70): 配信予定日時
        '',                                      // BS(71): 担当者名
        '',                                      // BT(72): 最終架電日時
        ''                                       // BU(73): 配信先業者一覧
      ];

      console.log('[LPContactSystem] Appending row:', JSON.stringify(rowData));

      // シートに追加
      sheet.appendRow(rowData);

      console.log('[LPContactSystem] Row appended successfully');

      // Slack通知送信
      this.sendSlackNotification(Object.assign({}, data, { cvId: cvId, prefecture: prefecture, city: city }));

      return {
        success: true,
        message: 'LP問い合わせデータを保存しました',
        cvId: cvId,
        timestamp: timestamp.toISOString()
      };

    } catch (error) {
      console.error('[LPContactSystem] saveLPContact error:', error);
      return {
        success: false,
        error: error.toString(),
        stack: error.stack
      };
    }
  },

  /**
   * 郵便番号から住所を取得（Yahoo API）
   * @param {string} postalCode - 郵便番号
   * @return {Object} { prefecture, city, kana }
   */
  getAddressFromPostalCode: function(postalCode) {
    try {
      // 郵便番号のハイフンを削除
      const cleanPostalCode = postalCode.replace(/-/g, '');

      // Yahoo APIのApp ID
      const appId = PropertiesService.getScriptProperties().getProperty('YAHOO_APP_ID');
      if (!appId) {
        console.warn('[LPContactSystem] YAHOO_APP_ID not set');
        return null;
      }

      // Yahoo ジオコーダAPI
      const url = `https://map.yahooapis.jp/search/zip/V1/zipCodeSearch?appid=${appId}&query=${cleanPostalCode}&output=json`;

      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const result = JSON.parse(response.getContentText());

      if (result.ResultInfo && result.ResultInfo.Count > 0 && result.Feature && result.Feature.length > 0) {
        const feature = result.Feature[0];
        const property = feature.Property;

        // AddressElementから都道府県と市区町村を分離（推奨）
        let prefecture = '';
        let city = '';
        if (property.AddressElement && Array.isArray(property.AddressElement)) {
          property.AddressElement.forEach(element => {
            if (element.Level === 'prefecture') {
              prefecture = element.Name;
            } else if (element.Level === 'city') {
              city = element.Name;
            }
          });
        }

        // フォールバック: AddressElementが空の場合、property.Addressを都道府県に使用
        // これにより最低限、住所が表示される（V1870以前の動作互換性）
        if (!prefecture && property.Address) {
          prefecture = property.Address;
          console.log('[LPContactSystem] AddressElement not available, using fallback Address:', property.Address);
        }

        console.log('[LPContactSystem] Parsed address:', { prefecture, city, hasAddressElement: !!(property.AddressElement && property.AddressElement.length) });

        return {
          prefecture: prefecture,
          city: city,
          kana: property.Kana || ''
        };
      }

      console.warn('[LPContactSystem] No address found for postal code:', postalCode);
      return null;

    } catch (error) {
      console.error('[LPContactSystem] getAddressFromPostalCode error:', error);
      return null;
    }
  },

  /**
   * Slack通知送信
   * @param {Object} data - フォームデータ
   */
  sendSlackNotification: function(data) {
    try {
      console.log('[LPContactSystem] sendSlackNotification start');

      // Slack Webhook URLを環境変数から取得
      const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');

      if (!webhookUrl) {
        console.error('[LPContactSystem] SLACK_WEBHOOK_URLが設定されていません');
        return;
      }

      const areaText = data.prefecture && data.city ? `${data.prefecture}${data.city}` : (data.postalCode || '未入力');

      const message = {
        text: '📝 LP問い合わせが届きました',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📝 LP問い合わせフォーム送信',
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*お名前:*\n${data.name || ''}`
              },
              {
                type: 'mrkdwn',
                text: `*電話番号:*\n${data.phone || ''}`
              },
              {
                type: 'mrkdwn',
                text: `*メールアドレス:*\n${data.email || ''}`
              },
              {
                type: 'mrkdwn',
                text: `*📍 エリア:*\n${areaText}`
              },
              {
                type: 'mrkdwn',
                text: `*CV ID:*\n${data.cvId || ''}`
              }
            ]
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*お問い合わせ内容:*\n${data.inquiryContent || ''}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `👉 *<https://gaihekikuraberu.com/admin-dashboard/#assignment|案件管理画面へ>*`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `⏰ ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`
              }
            ]
          }
        ]
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(message),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(webhookUrl, options);
      const responseCode = response.getResponseCode();

      console.log('[LPContactSystem] Slack notification sent, response code:', responseCode);

      if (responseCode !== 200) {
        console.error('[LPContactSystem] Slack notification failed:', response.getContentText());
      }

    } catch (error) {
      console.error('[LPContactSystem] sendSlackNotification error:', error);
      // Slack通知失敗はエラーとして扱わない（データ保存は成功している）
    }
  }
};

/**
 * テスト関数: LPContactSystemをGASエディタから直接テスト
 */
function testLPContactSystem() {
  console.log('===== LPContactSystem Test Start =====');

  const testData = {
    action: 'lp_contact_submit',
    name: 'テスト太郎',
    email: 'test@example.com',
    phone: '090-1234-5678',
    postalCode: '123-4567',
    inquiryContent: 'これはテストです'
  };

  console.log('Test data:', JSON.stringify(testData));

  const result = LPContactSystem.handlePost({parameter: testData}, testData);

  console.log('Result:', JSON.stringify(result));
  console.log('===== LPContactSystem Test End =====');

  return result;
}
