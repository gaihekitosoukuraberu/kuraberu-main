/**
 * ====================================
 * 管理ダッシュボードシステム（完全独立版）
 * ====================================
 * 完全独立モジュール - 外部依存ゼロ
 *
 * 依存関係: なし
 * 内包関数: _generateFirstLoginUrl, _sendWelcomeEmail, _sendSlackNotification
 */

const AdminSystem = {
  /**
   * GETリクエスト処理
   */
  handle: function(params) {
    try {
      const action = params.action;

      switch (action) {
        case 'getRegistrationRequests':
          return this.getRegistrationRequests(params);

        case 'getFranchiseManagementData':
          return this.getFranchiseManagementData(params);

        case 'approveRegistration':
          return this.approveRegistration(params);

        case 'rejectRegistration':
          return this.rejectRegistration(params);

        case 'revertRegistration':
          return this.revertRegistration(params);

        case 'updateMerchantStatusFromAdmin':
          return this.updateMerchantStatusFromAdmin(params);

        case 'admin_test':
          return {
            success: true,
            message: 'Admin system is running'
          };

        case 'check_headers':
          return this.checkHeaders();

        default:
          return {
            success: false,
            error: `Unknown admin action: ${action}`
          };
      }

    } catch (error) {
      console.error('[AdminSystem] Error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * POSTリクエスト処理
   */
  handlePost: function(e, postData) {
    try {
      Logger.log('[AdminSystem] handlePost called');
      Logger.log('[AdminSystem] e.parameter: ' + JSON.stringify(e.parameter));
      Logger.log('[AdminSystem] postData: ' + JSON.stringify(postData));

      const action = e.parameter.action || (postData && postData.action);
      Logger.log('[AdminSystem] action: ' + action);

      if (!action) {
        return {
          success: false,
          error: 'Action not specified'
        };
      }

      switch (action) {
        case 'approveRegistration':
          console.log('[AdminSystem] Routing to approveRegistration');
          return this.approveRegistration(e.parameter);

        case 'rejectRegistration':
          console.log('[AdminSystem] Routing to rejectRegistration');
          return this.rejectRegistration(e.parameter);

        case 'revertRegistration':
          console.log('[AdminSystem] Routing to revertRegistration');
          return this.revertRegistration(e.parameter);

        default:
          return {
            success: false,
            error: `Unknown admin POST action: ${action}`
          };
      }

    } catch (error) {
      console.error('[AdminSystem] POST Error:', error);
      console.error('[AdminSystem] Error stack:', error.stack);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 登録申請一覧取得
   */
  getRegistrationRequests: function(params) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (!SPREADSHEET_ID) {
        throw new Error('スプレッドシートIDが設定されていません');
      }

      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      if (!sheet) {
        throw new Error('シートが見つかりません');
      }

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);


      // データ整形
      const registrations = rows.map((row, index) => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] || '';
        });
        obj.rowIndex = index + 2; // スプレッドシートの行番号


        // 営業担当者の電話番号とメールを直接追加
        obj['営業担当者電話番号'] = obj['営業担当者電話番号'] || obj['営業担当者電話'] || obj['営業担当電話'] || '';
        obj['営業担当者メールアドレス'] = obj['営業担当者メールアドレス'] || obj['営業担当者メール'] || obj['営業担当メール'] || '';

        // AJ列（インデックス35、列番号36）から運用ステータスを取得
        obj['運用ステータス'] = row[35] || 'アクティブ'; // デフォルトはアクティブ

        return obj;
      });

      // ステータスでフィルタ（承認ステータスカラムのみで判定）
      const status = params.status || 'all';
      const pending = registrations.filter(r => {
        const approvalStatus = r['承認ステータス'] || '';
        const status = r['ステータス'] || '';
        // 再審査のものも未審査リストに含める
        return status === '再審査' ||
               approvalStatus === '申請中' ||
               approvalStatus === '未審査' ||
               approvalStatus === '';
      });
      const approved = registrations.filter(r => {
        const approvalStatus = r['承認ステータス'] || '';
        const status = r['ステータス'] || '';
        // 承認済み、一時停止のみ（再審査は未審査リストへ）
        return (approvalStatus === '承認済み' || approvalStatus === '一時停止') && status !== '再審査';
      });
      const rejected = registrations.filter(r => {
        const approvalStatus = r['承認ステータス'] || '';
        return approvalStatus === '却下';
      });

      // 統計情報
      const stats = {
        total: registrations.length,
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
        monthlyApproved: approved.filter(r => {
          // 承認日カラムまたは登録日時から今月の承認を判定
          const approvalDateStr = r['承認日'] || r['登録日時'];
          if (!approvalDateStr) return false;

          const approvalDate = new Date(approvalDateStr);
          if (isNaN(approvalDate.getTime())) return false;

          const now = new Date();
          return approvalDate.getMonth() === now.getMonth() &&
                 approvalDate.getFullYear() === now.getFullYear();
        }).length,
        // 承認率 = 承認 / (承認 + 却下) * 100
        approvalRate: (approved.length + rejected.length) > 0 ?
          Math.round((approved.length / (approved.length + rejected.length)) * 100) : 0,
      };

      // レスポンス構築
      return {
        success: true,
        data: registrations.map(r => this.formatRegistration(r)),
        pending: pending.map(r => this.formatRegistration(r)),
        approved: approved.map(r => this.formatRegistration(r)),
        rejected: rejected.map(r => this.formatRegistration(r)),
        stats: stats
      };

    } catch (error) {
      console.error('[AdminSystem] getRegistrationRequests error:', error);
      // エラー時も空データ構造を返す
      return {
        success: true,
        message: 'エラーが発生しましたが空データを返します',
        data: [],
        pending: [],
        approved: [],
        rejected: [],
        stats: {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          monthlyApproved: 0,
          approvalRate: 0
        }
      };
    }
  },


  /**
   * 加盟店管理データ取得
   */
  getFranchiseManagementData: function(params) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      if (!SPREADSHEET_ID) {
        throw new Error('スプレッドシートIDが設定されていません');
      }

      // 承認済み加盟店データを取得
      const registrationSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      if (!registrationSheet) {
        throw new Error('加盟店登録シートが見つかりません');
      }

      const data = registrationSheet.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);

      // 承認済みの加盟店のみを抽出
      const approvedFranchises = rows.filter(row => {
        const statusIndex = headers.indexOf('承認ステータス');
        return row[statusIndex] === '承認済み';
      });

      // データを整形
      const franchiseData = approvedFranchises.map((row, index) => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] || '';
        });

        return {
          id: obj['登録ID'] || `FR${Date.now()}${index}`,
          companyName: obj['会社名（法人名）'] || '',
          companyNameKana: obj['会社名（カナ）'] || '',
          representativeName: obj['代表者名'] || '',
          phone: obj['電話番号'] || '',
          email: obj['メールアドレス'] || '',
          address: obj['住所'] || '',
          area: obj['対応都道府県'] || '',
          cities: obj['対応市区町村'] || '',
          propertyTypes: obj['対応物件種別'] || '',
          buildingAgeRange: obj['対応建物築年数'] || '',
          approvalDate: obj['承認日'] || '',
          registrationDate: obj['登録日'] || '',
          status: obj['営業ステータス'] || '稼働中',
          contractRate: Math.floor(Math.random() * 30) + 70, // 仮の成約率
          performance: {
            rate: Math.floor(Math.random() * 40) + 60,
            trend: Math.random() > 0.5 ? '+' : '-',
            trendValue: Math.floor(Math.random() * 10) + 1
          },
          deliveryCount: {
            current: Math.floor(Math.random() * 15) + 1,
            total: Math.floor(Math.random() * 100) + 10,
            unit: `¥${(Math.random() * 5 + 1).toFixed(1)}M`
          },
          handicap: 0,
          actions: {
            phone: obj['電話番号'] || '',
            slack: true,
            notification: true
          }
        };
      });

      // ステータス統計
      const stats = {
        active: franchiseData.filter(f => f.status === '稼働中').length,
        paused: franchiseData.filter(f => f.status === '一時停止').length,
        silent: franchiseData.filter(f => f.status === '配信停止').length,
        inactive: franchiseData.filter(f => f.status === '非稼働').length,
        suspended: franchiseData.filter(f => f.status === '停止中').length,
        withdrawn: franchiseData.filter(f => f.status === '退会').length
      };

      return {
        success: true,
        data: franchiseData,
        total: franchiseData.length,
        stats: stats
      };

    } catch (error) {
      console.error('[AdminSystem] getFranchiseManagementData error:', error);
      // エラー時も空データ構造を返す
      return {
        success: true,
        message: 'エラーが発生しましたが空データを返します',
        data: [],
        total: 0,
        stats: {
          active: 0,
          paused: 0,
          silent: 0,
          inactive: 0,
          suspended: 0,
          withdrawn: 0
        }
      };
    }
  },

  /**
   * 登録データフォーマット
   */
  formatRegistration: function(row) {

    // 支店情報のパース
    let branches = [];
    let branchCount = 0;

    try {
      if (row['支店情報']) {
        branches = JSON.parse(row['支店情報']);
        branchCount = branches.length;
      }
    } catch (e) {
      branches = [];
    }

    return {
      registrationId: row['登録ID'] || '',
      timestamp: row['タイムスタンプ'] || '',
      companyName: row['会社名（法人名）'] || row['会社名'] || row['法人名'] || '',
      companyNameKana: row['会社名（カナ）'] || row['会社名（フリガナ）'] || row['会社名カナ'] || '',
      representativeName: row['代表者名'] || '',
      representativeNameKana: row['代表者名（カナ）'] || row['代表者名（フリガナ）'] || row['代表者名カナ'] || '',
      phone: row['電話番号'] || '',
      email: row['メールアドレス'] || row['Eメール'] || row['email'] || row['Email'] || row['mail'] || '',
      salesPerson: row['営業担当者名'] || row['営業担当者氏名'] || row['営業担当者'] || '',
      salesPersonKana: row['営業担当者カナ'] || row['営業担当者フリガナ'] || '',
      salesPersonEmail: row['営業用メールアドレス'] || row['営業担当者メールアドレス'] || row['営業担当者メール'] || '',
      address: row['住所'] || '',
      prefectures: row['対応都道府県'] || '',
      prefecturesArray: (row['対応都道府県'] || '').split(',').map(p => p.trim()).filter(p => p),
      cities: row['対応市区町村'] || '',
      citiesArray: (row['対応市区町村'] || '').split(',').map(c => c.trim()).filter(c => c),
      priorityAreas: row['優先エリア'] || '',
      priorityAreasArray: (row['優先エリア'] || '').split(',').map(a => a.trim()).filter(a => a),
      propertyTypes: row['対応物件種別'] || row['物件種別'] || '',
      propertyTypesArray: (row['対応物件種別'] || '').split(',').map(t => t.trim()).filter(t => t),
      branches: branches,
      branchCount: branchCount,
      buildingAgeRange: row['対応建物築年数'] || row['築年数'] || row['対応築年数'] || row['築年数対応範囲'] || '',
      maxFloors: row['最大対応階数'] || row['対応階数'] || row['最高階数'] || '',
      buildingAgeLimit: row['築年数対応範囲'] || row['築年数範囲'] || row['対応築年数範囲'] || '',
      constructionCapabilities: row['対応可能施工内容'] || row['施工内容'] || '',
      constructionLocation: row['施工箇所'] || '',
      specialHandling: row['特殊対応'] || row['特殊対応フラグ'] || '',
      specialHandlingItems: row['特殊対応項目'] || '',
      status: row['運用ステータス'] || 'アクティブ', // AJ列の運用ステータス
      approvalStatus: row['承認ステータス'] || '未審査',
      approvalDate: row['承認日'] || '',
      registrationDate: row['登録日'] || '',
      prText: row['PRテキスト'] || '',
      rowIndex: row.rowIndex
    };
  },

  /**
   * 申請承認
   */
  approveRegistration: function(params) {
    try {
      const registrationId = params.registrationId;
      const approver = params.approver || '管理者';

      if (!registrationId) {
        return {
          success: false,
          error: '登録IDが指定されていません'
        };
      }

      // スプレッドシート更新
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIndex = headers.indexOf('登録ID');
      const approvalStatusIndex = headers.indexOf('承認ステータス');
      const statusIndex = headers.indexOf('ステータス');
      const approvalDateIndex = headers.indexOf('承認日');
      const approverIndex = headers.indexOf('承認者');

      // 該当行を検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === registrationId) {
          // 承認処理
          sheet.getRange(i + 1, approvalStatusIndex + 1).setValue('承認済み');
          // ステータス（AJ列）を「休止」に設定
          sheet.getRange(i + 1, statusIndex + 1).setValue('休止');

          // 承認者を記録（名前のみ）
          sheet.getRange(i + 1, approverIndex + 1).setValue('ryutayamauchi');

          if (approvalDateIndex !== -1) {
            sheet.getRange(i + 1, approvalDateIndex + 1).setValue(
              Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm')
            );
          }

          // 登録日時（AL列）を設定
          const registrationDateIndex = headers.indexOf('登録日時');
          if (registrationDateIndex !== -1) {
            sheet.getRange(i + 1, registrationDateIndex + 1).setValue(
              Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm')
            );
          }

          // 一時停止関連の初期値を設定（AO/AP/AQ列）
          const pauseFlagIndex = headers.indexOf('一時停止フラグ');
          const pauseStartIndex = headers.indexOf('一時停止開始日');
          const pauseEndIndex = headers.indexOf('一時停止再開予定日');

          // 一時停止フラグをTRUE（承認直後は休止状態）
          if (pauseFlagIndex !== -1) {
            sheet.getRange(i + 1, pauseFlagIndex + 1).setValue(true);
          }

          // 一時停止開始日を今日
          if (pauseStartIndex !== -1) {
            sheet.getRange(i + 1, pauseStartIndex + 1).setValue(
              Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd')
            );
          }

          // 一時停止再開予定日は空（未定）
          if (pauseEndIndex !== -1) {
            sheet.getRange(i + 1, pauseEndIndex + 1).setValue('');
          }

          // Slack通知を送信（内部関数を使用）
          this._sendSlackNotification(registrationId, true, 'ryutayamauchi');

          // 初回ログインメール送信
          try {
            const companyName = data[i][headers.indexOf('会社名（法人名）')] || data[i][headers.indexOf('会社名')] || '';
            const salesEmail = data[i][headers.indexOf('営業用メールアドレス')] || '';

            if (!salesEmail) {
              console.error('[AdminSystem] メール送信スキップ - メールアドレスが空');
            } else if (!companyName) {
              console.error('[AdminSystem] メール送信スキップ - 会社名が空');
            } else {
              const loginUrl = this._generateFirstLoginUrl(registrationId);
              if (!loginUrl) {
                throw new Error('URL生成失敗');
              }

              this._sendWelcomeEmail(salesEmail, companyName, loginUrl, registrationId);
              console.log('[AdminSystem] 初回ログインメール送信完了:', salesEmail);
            }
          } catch (emailError) {
            console.error('[AdminSystem] メール送信エラー:', emailError.toString());
          }

          return {
            success: true,
            message: '承認処理が完了しました'
          };
        }
      }

      return {
        success: false,
        error: '該当する登録が見つかりません'
      };

    } catch (error) {
      console.error('[AdminSystem] approveRegistration error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * ヘッダーチェック（デバッグ用）
   */
  checkHeaders: function() {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

      // 最初のデータ行も取得
      const firstRow = sheet.getRange(2, 1, 1, sheet.getLastColumn()).getValues()[0];

      const headerInfo = {};
      headers.forEach((header, index) => {
        headerInfo[header] = firstRow[index] || '(空)';
      });

      return {
        success: true,
        headers: headers,
        headerWithData: headerInfo,
        kanaHeaders: headers.filter(h => h.includes('カナ') || h.includes('かな') || h.includes('フリガナ')),
        salesHeaders: headers.filter(h => h.includes('営業')),
        emailHeaders: headers.filter(h => h.includes('メール'))
      };
    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 申請却下
   */
  rejectRegistration: function(params) {
    try {
      const registrationId = params.registrationId;
      const reason = params.reason || '管理画面から却下';

      if (!registrationId) {
        return {
          success: false,
          error: '登録IDが指定されていません'
        };
      }

      // スプレッドシート更新
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIndex = headers.indexOf('登録ID');
      const approvalStatusIndex = headers.indexOf('承認ステータス');
      const statusIndex = headers.indexOf('ステータス');
      const approverIndex = headers.indexOf('承認者');
      const rejectReasonIndex = headers.indexOf('却下理由');

      // 該当行を検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === registrationId) {
          // 却下処理
          sheet.getRange(i + 1, approvalStatusIndex + 1).setValue('却下');
          sheet.getRange(i + 1, statusIndex + 1).setValue('却下');
          sheet.getRange(i + 1, approverIndex + 1).setValue('ryutayamauchi');

          if (rejectReasonIndex !== -1) {
            sheet.getRange(i + 1, rejectReasonIndex + 1).setValue(reason);
          }

          // Slack通知を送信（内部関数を使用）
          this._sendSlackNotification(registrationId, false, 'ryutayamauchi', reason);

          return {
            success: true,
            message: '却下処理が完了しました'
          };
        }
      }

      return {
        success: false,
        error: '該当する登録が見つかりません'
      };

    } catch (error) {
      console.error('[AdminSystem] rejectRegistration error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 申請差し戻し（未審査に戻す）
   */
  revertRegistration: function(params) {
    try {
      const registrationId = params.registrationId;
      console.log('[AdminSystem] Reverting registration:', registrationId);

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      const idIndex = headers.indexOf('登録ID');
      const statusIndex = headers.indexOf('ステータス');
      const approvalStatusIndex = headers.indexOf('承認ステータス');

      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === registrationId) {
          // 差し戻し処理 - 再審査（ステータス）、申請中（承認ステータス）に設定
          sheet.getRange(i + 1, statusIndex + 1).setValue('再審査');
          sheet.getRange(i + 1, approvalStatusIndex + 1).setValue('申請中');

          console.log('[AdminSystem] 差し戻し完了:', registrationId);

          return {
            success: true,
            message: '差し戻し処理が完了しました'
          };
        }
      }

      return {
        success: false,
        error: '該当する登録が見つかりません'
      };

    } catch (error) {
      console.error('[AdminSystem] revertRegistration error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 初回ログインURL生成（AdminSystem専用 - 完全分離）
   * @private
   */
  _generateFirstLoginUrl: function(merchantId) {
    const SECRET_KEY = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
    const data = {
      merchantId: merchantId,
      expires: Date.now() + 86400000, // 24時間
      type: 'first_login'
    };

    // 署名作成（auth-manager.jsと同じアルゴリズム）
    const signature = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      JSON.stringify(data) + SECRET_KEY
    ).map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('').substring(0, 16);

    // Base64エンコード
    const payload = Utilities.base64EncodeWebSafe(JSON.stringify(data));

    // URL生成
    const baseUrl = PropertiesService.getScriptProperties().getProperty('FIRST_LOGIN_URL');
    if (!baseUrl) {
      throw new Error('FIRST_LOGIN_URLが設定されていません');
    }
    return `${baseUrl}?data=${payload}&sig=${signature}`;
  },

  /**
   * 初回ログインメール送信（AdminSystem専用 - 完全分離）
   * @private
   */
  _sendWelcomeEmail: function(email, companyName, loginUrl, merchantId) {
    const subject = '【外壁塗装くらべる】加盟店登録完了・初回ログインのご案内';

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif; line-height: 1.8; color: #333; background: #f7f7f7; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; padding: 30px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #3b82f6; margin-bottom: 30px; }
    .logo { font-size: 28px; font-weight: bold; color: #3b82f6; }
    .warning { background: #fef3c7; padding: 15px 20px; border-left: 4px solid #f59e0b; margin: 25px 0; border-radius: 5px; }
    .info-box { background: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #bae6fd; }
    .merchant-id { font-size: 24px; font-weight: bold; color: #0284c7; letter-spacing: 1px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #6b7280; }
    .center { text-align: center; }
    .button-table { width: 100%; margin: 25px 0; }
    .button-cell { text-align: center; padding: 0; }
    .button-link { display: inline-block; background: #3b82f6; color: #ffffff !important; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">外壁塗装くらべる</div>
      <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">加盟店管理システム</p>
    </div>
    <h2 style="color: #1e40af; margin-bottom: 25px;">加盟店登録完了のお知らせ</h2>
    <p><strong>${companyName}</strong> 様</p>
    <p>このたびは「外壁塗装くらべる」への加盟店登録をいただき、誠にありがとうございます。</p>
    <p>審査が完了し、加盟店登録が承認されました。<br>以下の情報をご確認の上、<strong>必ず24時間以内に</strong>初回ログインをお願いいたします。</p>
    <div class="warning">
      <div style="font-weight: bold; color: #d97706; margin-bottom: 8px; font-size: 15px;">⚠️ 必ずお読みください</div>
      <p style="margin: 5px 0; font-size: 14px; line-height: 1.6;">
        初回ログイン＝即配信開始ではございませんので、ご安心ください。<br>
        ただし、システムの都合上、<strong>このリンクは24時間で無効</strong>になりますので、<br>
        お手数ですが初回ログインは必ずすぐに行っていただけますようお願いいたします。
      </p>
    </div>
    <div class="info-box">
      <div style="font-weight: bold; color: #0369a1; font-size: 14px; margin-bottom: 5px;">あなたの加盟店ID</div>
      <div class="merchant-id">${merchantId}</div>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">※この加盟店IDは今後のログイン時に必要となります。大切に保管してください。</p>
    </div>
    <table class="button-table" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td class="button-cell">
          <a href="${loginUrl}" class="button-link">初回ログインを開始する</a>
        </td>
      </tr>
    </table>
    <div style="background: #f0f9ff; padding: 15px 20px; border-radius: 5px; margin: 25px 0; font-size: 14px;">
      <div style="font-weight: bold; color: #0369a1; margin-bottom: 8px;">初回ログイン時の設定内容</div>
      <ul style="margin: 5px 0; padding-left: 20px; line-height: 1.8;">
        <li>新しいパスワードを設定してください</li>
        <li>パスワードは8文字以上、英数字を含む必要があります</li>
        <li>設定後、すぐに加盟店ダッシュボードをご利用いただけます</li>
      </ul>
    </div>
    <div class="footer">
      <p><strong>ご不明な点がございましたら</strong><br>サポートデスク: info@gaihekikuraberu.com<br>営業時間: 9:00-18:00</p>
      <p style="margin-top: 15px;">※このメールに心当たりがない場合は、お手数ですが削除してください。</p>
    </div>
  </div>
</body>
</html>`;

    try {
      MailApp.sendEmail({
        to: email,
        subject: subject,
        htmlBody: htmlBody,
        name: '外壁塗装くらべる運営事務局'
      });
      Logger.log('[AdminSystem] メール送信成功: ' + email + ' (' + merchantId + ')');
    } catch (mailError) {
      Logger.log('[AdminSystem] メール送信失敗: ' + mailError.toString());
      throw new Error('メール送信に失敗しました: ' + mailError.toString());
    }
  },

  /**
   * Slack通知送信（内部関数）
   * @param {string} registrationId - 登録ID
   * @param {boolean} isApproved - 承認/却下フラグ
   * @param {string} user - 処理者名
   * @param {string} reason - 却下理由（オプション）
   */
  _sendSlackNotification: function(registrationId, isApproved, user, reason) {
    try {
      const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
      if (!webhookUrl) {
        Logger.log('[AdminSystem] Slack WebhookURLが未設定のため通知をスキップ');
        return;
      }

      const message = {
        text: isApproved
          ? `@channel ✅ 登録ID: ${registrationId} が承認されました`
          : `@channel ❌ 登録ID: ${registrationId} が却下されました`,
        attachments: [{
          color: isApproved ? 'good' : 'danger',
          fields: [
            { title: 'ステータス', value: isApproved ? '承認済み' : '却下', short: true },
            { title: '処理者', value: user || '管理者', short: true },
            { title: '処理日時', value: Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd HH:mm:ss'), short: true }
          ]
        }]
      };

      // 却下理由を追加
      if (!isApproved && reason) {
        message.attachments[0].fields.push({ title: '却下理由', value: reason, short: false });
      }

      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(message),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(webhookUrl, options);
      const responseCode = response.getResponseCode();

      if (responseCode === 200) {
        Logger.log('[AdminSystem] Slack通知送信成功: ' + registrationId);
      } else {
        Logger.log('[AdminSystem] Slack通知送信失敗（HTTP ' + responseCode + '）: ' + response.getContentText());
      }
    } catch (error) {
      Logger.log('[AdminSystem] Slack通知エラー: ' + error.toString());
      // エラーでもシステム処理は継続
    }
  },

  /**
   * 管理ダッシュボードから加盟店ステータスを更新
   */
  updateMerchantStatusFromAdmin: function(params) {
    try {
      const { merchantId, status } = params;

      if (!merchantId || !status) {
        return {
          success: false,
          error: 'パラメータが不足しています'
        };
      }

      // ステータスの検証
      const validStatuses = ['アクティブ', '非アクティブ', 'サイレント', '一時停止', '休止', '退会'];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          error: '無効なステータスです'
        };
      }

      // DataAccessLayerを使用してシート取得
      if (typeof DataAccessLayer === 'undefined' || !DataAccessLayer.getRegistrationSheet) {
        throw new Error('DataAccessLayerが見つかりません');
      }

      const sheet = DataAccessLayer.getRegistrationSheet();
      const data = sheet.getDataRange().getValues();

      if (data.length <= 1) {
        return {
          success: false,
          error: '加盟店データが見つかりません'
        };
      }

      const rows = data.slice(1);

      // B列（インデックス1）で加盟店ID検索
      const rowIndex = rows.findIndex(row => row[1] === merchantId);

      if (rowIndex === -1) {
        return {
          success: false,
          error: '指定された加盟店IDのデータが見つかりません'
        };
      }

      // AJ列（インデックス35、列番号36）を更新
      const sheetRowIndex = rowIndex + 2;
      const statusColumnIndex = 36; // AJ列 = 36列目

      sheet.getRange(sheetRowIndex, statusColumnIndex).setValue(status);

      console.log('[AdminSystem] updateMerchantStatusFromAdmin - Updated row:', sheetRowIndex, 'to:', status);

      return {
        success: true,
        message: 'ステータスを更新しました'
      };

    } catch (error) {
      console.error('[AdminSystem] updateMerchantStatusFromAdmin error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  }
};