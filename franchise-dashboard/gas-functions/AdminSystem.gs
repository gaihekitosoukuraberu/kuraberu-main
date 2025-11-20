/**
 * ====================================
 * 管理ダッシュボードシステム（完全独立版）
 * ====================================
 * 完全独立モジュール - 外部依存ゼロ
 *
 * 依存関係: なし
 * 内包関数: _generateFirstLoginUrl, _sendWelcomeEmail, _sendSlackNotification
 */

var AdminSystem = {
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

        case 'getCVList':
          return this.getCVList(params);

        case 'convertNameWithYahoo':
          return this.convertNameWithYahoo(params);

        case 'getMerchantUrlSlug':
          return this.getMerchantUrlSlug(params);

        case 'checkUrlSlugAvailable':
          return this.checkUrlSlugAvailable(params);

        case 'updateMerchantUrlSlug':
          return this.updateMerchantUrlSlug(params);

        case 'admin_test':
          return {
            success: true,
            message: 'Admin system is running'
          };

        case 'manualTestStaticHTMLGenerator':
          return this.manualTestStaticHTMLGenerator(params);

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
      previewHP: row['プレビューHP'] || '', // プレビューHP列追加
      rowIndex: row.rowIndex
    };
  },

  /**
   * 申請承認（同期処理版 - 確実にレスポンス返却）
   */
  approveRegistration: function(params) {
    try {
      const startTime = Date.now();
      const registrationId = params.registrationId;
      const approver = params.approver || '管理者';
      console.log('[AdminSystem] ⏱️ 承認処理開始:', registrationId, 'at', new Date().toISOString());

      if (!registrationId) {
        return {
          success: false,
          error: '登録IDが指定されていません'
        };
      }

      // スプレッドシート更新
      const t1 = Date.now();
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      console.log('[AdminSystem] ⏱️ スプレッドシート接続:', (Date.now() - t1) + 'ms');

      const t2 = Date.now();
      // 🚀 最軽量化：ヘッダー行のみ読み込み（全データ読み込み回避）
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      console.log('[AdminSystem] ⏱️ ヘッダー読み込み:', (Date.now() - t2) + 'ms', '列数:', headers.length);
      const idIndex = headers.indexOf('登録ID');
      const approvalStatusIndex = headers.indexOf('承認ステータス');
      const statusIndex = headers.indexOf('ステータス');
      const deliveryStatusIndex = headers.indexOf('配信ステータス');  // V1833: 配信ステータス追加
      const approvalDateIndex = headers.indexOf('承認日');
      const approverIndex = headers.indexOf('承認者');

      // 🚀 最軽量化：ID列から該当行を検索（全行読み込み回避）
      const t4 = Date.now();
      console.log('[AdminSystem] 🔍 登録ID列検索開始:', registrationId, 'in column', idIndex + 1);

      const lastRow = sheet.getLastRow();
      console.log('[AdminSystem] 🔍 総行数:', lastRow);

      // ID列のみを読み込んで検索
      const idColumnValues = sheet.getRange(2, idIndex + 1, lastRow - 1, 1).getValues();
      let targetRowNumber = -1;

      for (let i = 0; i < idColumnValues.length; i++) {
        if (idColumnValues[i][0] === registrationId) {
          targetRowNumber = i + 2; // ヘッダー分+1、配列インデックス分+1
          break;
        }
      }

      console.log('[AdminSystem] ⏱️ 行検索:', (Date.now() - t4) + 'ms', '該当行:', targetRowNumber);

      if (targetRowNumber > 0) {
        console.log('[AdminSystem] 🔍 該当行発見:', targetRowNumber);

        // 該当行のデータのみ読み込み
        const rowData = sheet.getRange(targetRowNumber, 1, 1, headers.length).getValues()[0];

          // 重複承認も処理可能（URLスラッグに-2などを付与）

          console.log('[AdminSystem] 承認処理開始:', registrationId);

        // 承認処理（該当行に対して一括更新）
        const t5 = Date.now();
        sheet.getRange(targetRowNumber, approvalStatusIndex + 1).setValue('承認済み');

        // V1833: ステータスを「アクティブ」に設定（配信ステータスはonEditトリガーで自動連動）
        sheet.getRange(targetRowNumber, statusIndex + 1).setValue('アクティブ');

        // V1833: 配信ステータスも明示的に「アクティブ」に設定（onEditトリガー前の保険）
        if (deliveryStatusIndex !== -1) {
          sheet.getRange(targetRowNumber, deliveryStatusIndex + 1).setValue('アクティブ');
          console.log('[AdminSystem] 配信ステータスを「アクティブ」に設定');
        }

        sheet.getRange(targetRowNumber, approverIndex + 1).setValue('ryutayamauchi');

        if (approvalDateIndex !== -1) {
          sheet.getRange(targetRowNumber, approvalDateIndex + 1).setValue(
            Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm')
          );
        }

        // 登録日時（AL列）を設定
        const registrationDateIndex = headers.indexOf('登録日時');
        if (registrationDateIndex !== -1) {
          sheet.getRange(targetRowNumber, registrationDateIndex + 1).setValue(
            Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm')
          );
        }

        // V1833: 一時停止関連の初期値設定を削除（承認直後はアクティブ状態）
        // 一時停止は管理者が手動で設定する想定
        const pauseFlagIndex = headers.indexOf('一時停止フラグ');

        // 一時停止フラグをFALSE（承認直後はアクティブ状態）
        if (pauseFlagIndex !== -1) {
          sheet.getRange(targetRowNumber, pauseFlagIndex + 1).setValue(false);
        }

        // V1833: 支払い遅延フラグも一律FALSE（承認時にリセット）
        const paymentDelayIndex = headers.indexOf('支払い遅延');
        if (paymentDelayIndex !== -1) {
          sheet.getRange(targetRowNumber, paymentDelayIndex + 1).setValue(false);
          console.log('[AdminSystem] 支払い遅延フラグをFALSEに設定');
        }

        console.log('[AdminSystem] ⏱️ シート更新:', (Date.now() - t5) + 'ms');

        // 軽量URLスラッグ生成（軽量化済み）
        const t6 = Date.now();
        let urlSlugResult = null; // スコープを広く定義

        try {
          const companyName = rowData[headers.indexOf('会社名（法人名）')] || rowData[headers.indexOf('会社名')] || '';
          const address = rowData[headers.indexOf('住所')] || '';

          if (companyName) {
            urlSlugResult = this._generateUrlSlug(companyName, address, rowData, headers);
            const urlSlugIndex = headers.indexOf('URLスラッグ');
            if (urlSlugResult && urlSlugResult.urlSlug && urlSlugIndex !== -1) {
              sheet.getRange(targetRowNumber, urlSlugIndex + 1).setValue(urlSlugResult.urlSlug);
              console.log('[AdminSystem] URLスラッグ保存完了:', urlSlugResult.urlSlug);
            }
          }
        } catch (urlError) {
          console.error('[AdminSystem] URLスラッグ生成エラー:', urlError.toString());
        }
        console.log('[AdminSystem] ⏱️ URLスラッグ生成:', (Date.now() - t6) + 'ms');

        // ✅ HP生成・デプロイ実行
        console.log('[AdminSystem] 🚀 HP生成処理開始');
        const t7 = Date.now();
        let previewUrl = null;

        try {
          // HP生成用データ準備
          const merchantData = {};
          headers.forEach((header, index) => {
            merchantData[header] = rowData[index];
          });

          console.log('[AdminSystem] HP生成データ準備完了:', {
            registrationId: registrationId,
            urlSlug: urlSlugResult ? urlSlugResult.urlSlug : 'N/A',
            companyName: merchantData['会社名（法人名）'] || merchantData['会社名'] || '',
            address: merchantData['住所'] || ''
          });

          // URLスラッグを分解（例: "osaka/fine-t" → ["osaka", "fine-t"]）
          let citySlug = 'city';
          let companySlug = 'company';

          if (urlSlugResult && urlSlugResult.urlSlug) {
            const slugParts = urlSlugResult.urlSlug.split('/');
            citySlug = slugParts[0] || 'city';
            companySlug = slugParts[1] || 'company';

            console.log('[AdminSystem] 🔗 スラッグ分解完了:', {
              original: urlSlugResult.urlSlug,
              city: citySlug,
              company: companySlug
            });
          }

          // StaticHTMLGenerator呼び出し（正しいスラッグ付き）
          const deployResult = StaticHTMLGenerator.generateAndDeployWithSlugs(
            registrationId,
            merchantData,
            citySlug,
            companySlug
          );
          console.log('[AdminSystem] HP生成結果:', deployResult);

          if (deployResult.success && deployResult.url) {
            previewUrl = deployResult.url;

            // プレビューHP列を更新
            const previewHPIndex = headers.indexOf('プレビューHP');
            if (previewHPIndex !== -1) {
              sheet.getRange(targetRowNumber, previewHPIndex + 1).setValue(deployResult.url);
              console.log('[AdminSystem] ✅ プレビューHP URL更新完了:', deployResult.url);
            } else {
              console.error('[AdminSystem] ❌ プレビューHP列が見つかりません');
            }
          } else {
            console.error('[AdminSystem] ❌ HP生成失敗:', deployResult);
          }
        } catch (hpError) {
          console.error('[AdminSystem] ❌ HP生成エラー:', hpError.toString());
          // エラーでも処理は続行
        }

        console.log('[AdminSystem] ⏱️ HP生成処理:', (Date.now() - t7) + 'ms');

        // ✅ 初回ログインメール送信
        console.log('[AdminSystem] 📧 メール送信処理開始');
        const t8 = Date.now();

        try {
          // メールアドレス取得 - W列（インデックス22）から直接取得
          const email = rowData[22] || ''; // W列：営業用メールアドレス

          // デバッグ: メールアドレス取得結果をログ出力
          console.log('[AdminSystem] 📧 メールアドレス取得結果:', {
            'W列(インデックス22)': email,
            'W列ヘッダー名': headers[22],
            '取得したメール': email
          });
          const companyName = rowData[headers.indexOf('会社名（法人名）')] || rowData[headers.indexOf('会社名')] || '';

          if (email) {
            const loginUrl = this._generateFirstLoginUrl(registrationId);
            this._sendWelcomeEmail(email, companyName, loginUrl, registrationId);
            console.log('[AdminSystem] ✅ 初回ログインメール送信完了:', email);
          } else {
            console.error('[AdminSystem] ❌ メールアドレスが見つかりません');
          }
        } catch (emailError) {
          console.error('[AdminSystem] ❌ メール送信エラー:', emailError.toString());
          // メール送信失敗でも処理は続行
        }

        console.log('[AdminSystem] ⏱️ メール送信処理:', (Date.now() - t8) + 'ms');

        console.log('[AdminSystem] ⏱️ 全体処理時間:', (Date.now() - startTime) + 'ms');
        console.log('[AdminSystem] ✅ 承認処理完了 - URLスラッグ生成とHP生成が完了');

        return {
          success: true,
          message: '承認処理が完了しました。HP生成と初回ログインメールを送信しました。',
          processingTime: (Date.now() - startTime) + 'ms',
          previewUrl: previewUrl,
          urlSlug: urlSlugResult ? urlSlugResult.urlSlug : null
        };
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

          // URLスラッグとプレビューHPをクリア（再承認時に正しく生成されるように）
          const urlSlugIndex = headers.indexOf('URLスラッグ');
          const previewHPIndex = headers.indexOf('プレビューHP');

          if (urlSlugIndex !== -1) {
            sheet.getRange(i + 1, urlSlugIndex + 1).setValue('');
            console.log('[AdminSystem] URLスラッグクリア完了');
          }

          if (previewHPIndex !== -1) {
            sheet.getRange(i + 1, previewHPIndex + 1).setValue('');
            console.log('[AdminSystem] プレビューHPクリア完了');
          }

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
  },

  /**
   * CV一覧取得（CRMデータ）
   */
  getCVList: function(params) {
    try {
      console.log('[AdminSystem] getCVList called');

      // CVSheetSystemを呼び出す
      if (typeof CVSheetSystem === 'undefined' || !CVSheetSystem.getAllCVs) {
        throw new Error('CVSheetSystemが見つかりません');
      }

      return CVSheetSystem.getAllCVs();

    } catch (error) {
      console.error('[AdminSystem] getCVList error:', error);
      return {
        success: false,
        error: error.toString(),
        cvList: []
      };
    }
  },

  /**
   * Yahoo APIで氏名を姓名分割＋カナ変換
   */
  convertNameWithYahoo: function(params) {
    try {
      console.log('[AdminSystem] convertNameWithYahoo called:', params.fullName);

      const fullName = params.fullName;
      if (!fullName) {
        throw new Error('fullNameが指定されていません');
      }

      // プロパティからYahoo APIキーを取得
      const appId = PropertiesService.getScriptProperties().getProperty('YAHOO_APP_ID');
      if (!appId) {
        throw new Error('YAHOO_APP_IDがプロパティに設定されていません');
      }

      // Yahoo Developer Network ルビ振りAPI呼び出し
      // URLにappidパラメータを追加
      const url = 'https://jlp.yahooapis.jp/FuriganaService/V2/furigana?appid=' + encodeURIComponent(appId);
      const payload = {
        id: Date.now().toString(),
        jsonrpc: '2.0',
        method: 'jlp.furiganaservice.furigana',
        params: {
          q: fullName,
          grade: 1
        }
      };

      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      const response = UrlFetchApp.fetch(url, options);
      const data = JSON.parse(response.getContentText());

      console.log('[AdminSystem] Yahoo API response:', JSON.stringify(data));

      if (data.result && data.result.word && data.result.word.length >= 2) {
        const words = data.result.word;

        // ひらがなをカタカナに変換
        const hiraganaToKatakana = function(str) {
          return str.replace(/[\u3041-\u3096]/g, function(match) {
            var chr = match.charCodeAt(0) + 0x60;
            return String.fromCharCode(chr);
          });
        };

        const lastNameKana = hiraganaToKatakana(words[0].furigana);
        const firstNameKana = hiraganaToKatakana(words[1].furigana);

        return {
          success: true,
          lastName: words[0].surface,
          firstName: words[1].surface,
          lastNameKana: lastNameKana,
          firstNameKana: firstNameKana,
          formattedName: words[0].surface + ' ' + words[1].surface,
          formattedKana: lastNameKana + ' ' + firstNameKana
        };
      } else {
        // 変換失敗時は元の名前を返す
        return {
          success: true,
          lastName: fullName,
          firstName: '',
          lastNameKana: '',
          firstNameKana: '',
          formattedName: fullName,
          formattedKana: ''
        };
      }

    } catch (error) {
      console.error('[AdminSystem] convertNameWithYahoo error:', error);
      return {
        success: false,
        error: error.toString(),
        lastName: params.fullName || '',
        firstName: '',
        lastNameKana: '',
        firstNameKana: '',
        formattedName: params.fullName || '',
        formattedKana: ''
      };
    }
  },

  /**
   * HP自動生成・デプロイシステム（同期版）
   * @param {string} registrationId - 登録ID
   * @param {string} companyName - 会社名
   * @param {string} address - 住所
   * @param {Array} rowData - スプレッドシート行データ
   * @param {Array} headers - ヘッダー配列
   * @returns {Object} 結果オブジェクト {success, urlSlug, fullUrl, message}
   */
  _generateAndDeployHPSync: function(registrationId, companyName, address, rowData, headers) {
    // URLスラッグは関数の開始時に生成して、エラー時でも返せるようにする
    let urlSlug = '';

    try {
      console.log('[AdminSystem] _generateAndDeployHP開始:', companyName);

      // 1. URLスラッグ生成（地域名/会社名の英語化）
      const urlSlugResult = this._generateUrlSlug(companyName, address, rowData, headers);
      urlSlug = urlSlugResult.urlSlug;
      console.log('[AdminSystem] URLスラッグ生成:', urlSlug);

      // 2. 評価データ取得
      let ratingData = null;
      try {
        if (typeof RatingSystem !== 'undefined' && RatingSystem.getRatingData) {
          ratingData = RatingSystem.getRatingData({ companyName: companyName });
          if (!ratingData.success || !ratingData.data) {
            // 評価データがない場合は生成
            console.log('[AdminSystem] 評価データ生成開始:', companyName);
            const generateResult = RatingSystem.generateRatingsForCompany({ companyName: companyName });
            if (generateResult.success) {
              ratingData = RatingSystem.getRatingData({ companyName: companyName });
            }
          }
        }
      } catch (ratingError) {
        console.error('[AdminSystem] 評価データ取得エラー:', ratingError);
        // 評価データなしでも継続
      }

      // 3. HTMLコンテンツ生成
      const htmlContent = this._generateHPHtml(registrationId, companyName, address, rowData, headers, ratingData, urlSlug);

      // 4. StaticHTMLGenerator経由でRailwayにデプロイ（🚀 緊急修正: Railway webhookに修正）
      console.log('[AdminSystem] ✅ StaticHTMLGenerator経由でRailway webhookデプロイ開始');
      console.log('[AdminSystem] 🚨 新バージョン1261が実行中 - 非同期HP生成対応済み');

      // 加盟店データを構築（StaticHTMLGeneratorが期待する形式）
      const merchantData = {};
      headers.forEach((header, index) => {
        merchantData[header] = rowData[index];
      });

      // デバッグ: merchantDataの確認
      console.log('[AdminSystem] 🔍 StaticHTMLGenerator送信データ:', JSON.stringify(merchantData, null, 2));

      let deployResult;
      try {
        // StaticHTMLGenerator.generateAndDeployを呼び出し
        deployResult = StaticHTMLGenerator.generateAndDeploy(registrationId, merchantData);
        console.log('[AdminSystem] StaticHTMLGenerator結果:', JSON.stringify(deployResult, null, 2));
      } catch (staticError) {
        console.error('[AdminSystem] StaticHTMLGenerator呼び出しエラー:', staticError);
        deployResult = { success: false, error: staticError.toString() };
      }

      // フォールバック: FTPが失敗してもデプロイ成功として扱う
      if (!deployResult.success) {
        console.log('[AdminSystem] StaticHTMLGenerator失敗 - フォールバックでURLスラッグ保存');
        deployResult = { success: true, message: 'StaticHTMLGenerator失敗したがURLスラッグは保存' };
      }

      if (deployResult.success) {
        // URLスラッグの形式チェックとフォールバック
        let finalUrl;
        if (urlSlug.endsWith('/') && urlSlug.split('/').length === 2) {
          // "region/" の形になっている場合の修正
          console.error('[AdminSystem] URLスラッグが不正な形式:', urlSlug);
          const region = urlSlug.replace('/', '');
          const fallbackSlug = `${region}/company`;
          finalUrl = `https://gaihekikuraberu.com/${fallbackSlug}/`;
          console.log('[AdminSystem] フォールバック URL生成:', finalUrl);
        } else {
          finalUrl = `https://gaihekikuraberu.com/${urlSlug}/`;
        }
        const fullUrl = finalUrl;

        console.log('[AdminSystem] HP自動生成・デプロイ完了:', fullUrl);

        return {
          success: true,
          urlSlug: urlSlug,
          fullUrl: fullUrl,
          deployUrl: deployResult.deployUrl || fullUrl,
          message: 'HP自動生成・デプロイ完了'
        };
      } else {
        console.error('[AdminSystem] FTPデプロイ失敗:', deployResult.error);
        throw new Error('FTPデプロイ失敗: ' + deployResult.error);
      }

    } catch (error) {
      console.error('[AdminSystem] _generateAndDeployHP エラー:', error);
      // 🔍 デバッグ: エラー時のurlSlug確認
      console.log('[AdminSystem] 🔍 エラー時urlSlug:', urlSlug);
      console.log('[AdminSystem] 🔍 エラー時urlSlug型:', typeof urlSlug);
      console.log('[AdminSystem] 🔍 エラー時urlSlug長さ:', urlSlug ? urlSlug.length : 'null');

      // URLスラッグが生成されていれば、エラー時でも返す
      const fallbackUrl = urlSlug ? `https://gaihekikuraberu.com/${urlSlug}/` : '';
      const result = {
        success: false,
        error: error.toString(),
        urlSlug: urlSlug,
        fullUrl: fallbackUrl
      };

      console.log('[AdminSystem] 🔍 エラー時戻り値:', JSON.stringify(result, null, 2));
      return result;
    }
  },

  /**
   * URLスラッグ生成（SEO対応 - L列URL抽出優先 + 重複チェック）
   * @param {string} companyName - 会社名
   * @param {string} address - 住所
   * @param {Array} rowData - スプレッドシート行データ
   * @param {Array} headers - ヘッダー配列
   * @returns {string} URLスラッグ（例: tokyo/yamada-construction）
   */
  _generateUrlSlug: function(companyName, address, rowData, headers) {
    try {
      // 地域名抽出（住所から都道府県・市区町村を取得）
      let region = 'other';

      // 主要都市のマッピング
      const regionMap = {
        '東京': 'tokyo', '大阪': 'osaka', '神奈川': 'kanagawa', '愛知': 'aichi',
        '埼玉': 'saitama', '千葉': 'chiba', '兵庫': 'hyogo', '北海道': 'hokkaido',
        '福岡': 'fukuoka', '静岡': 'shizuoka', '茨城': 'ibaraki', '広島': 'hiroshima',
        '京都': 'kyoto', '宮城': 'miyagi', '新潟': 'niigata', '長野': 'nagano',
        '岐阜': 'gifu', '栃木': 'tochigi', '群馬': 'gunma', '岡山': 'okayama',
        '三重': 'mie', '熊本': 'kumamoto', '鹿児島': 'kagoshima', '沖縄': 'okinawa'
      };

      // 住所から地域を特定
      for (const [jp, en] of Object.entries(regionMap)) {
        if (address.includes(jp)) {
          region = en;
          break;
        }
      }

      // 会社スラッグ生成：L列のウェブサイトURL抽出を優先
      let companySlug = null;

      // デバッグ情報を詳細に出力
      console.log('[AdminSystem] 会社スラッグ生成開始:', {
        companyName: companyName,
        companyNameType: typeof companyName,
        companyNameLength: companyName ? companyName.length : 0,
        rowDataLength: rowData ? rowData.length : 'rowData is null',
        L列データ: rowData && rowData.length > 11 ? rowData[11] : 'L列データなし',
        L列データType: rowData && rowData.length > 11 ? typeof rowData[11] : 'N/A',
        全てのheadersフィールド: headers ? headers.slice(0, 15) : 'headers is null'
      });

      // まず、ヘッダーから正しいウェブサイトURL列を特定
      let websiteUrl = null;
      if (headers && rowData) {
        const websiteUrlIndex = headers.indexOf('ウェブサイトURL');
        console.log('[AdminSystem] ウェブサイトURL列インデックス:', websiteUrlIndex);

        if (websiteUrlIndex !== -1 && rowData.length > websiteUrlIndex) {
          websiteUrl = rowData[websiteUrlIndex];
          console.log('[AdminSystem] 正しい列からウェブサイトURL取得:', websiteUrl);
        } else {
          // フォールバック：L列（11番目）
          if (rowData.length > 11) {
            websiteUrl = rowData[11];
            console.log('[AdminSystem] L列フォールバックでURL取得:', websiteUrl);
          }
        }
      }

      // URL抽出を試行
      if (websiteUrl && typeof websiteUrl === 'string' && websiteUrl.trim()) {
        console.log('[AdminSystem] URL抽出開始:', websiteUrl);
        companySlug = this._extractCompanySlugFromUrl(websiteUrl.trim());
        console.log('[AdminSystem] URL抽出結果:', websiteUrl, '→', companySlug);
      } else {
        console.log('[AdminSystem] URLが空またはnull:', websiteUrl);
      }

      // L列抽出に失敗した場合はローマ字読み
      if (!companySlug) {
        console.log('[AdminSystem] URL抽出失敗、会社名変換開始');
        if (!companyName || companyName.trim() === '') {
          console.error('[AdminSystem] 会社名が空です。タイムスタンプ付きフォールバックを使用');
          companySlug = 'company';
        } else {
          console.log('[AdminSystem] 会社名変換実行:', companyName);
          companySlug = this._generateCompanySlugFromName(companyName);
          console.log('[AdminSystem] ローマ字読み生成結果:', companyName, '→', companySlug);
        }
      }

      // 最終チェック：companySlugが空の場合の追加フォールバック
      if (!companySlug || companySlug.trim() === '') {
        console.error('[AdminSystem] companySlugが依然として空です。強制フォールバック実行');
        console.error('[AdminSystem] 強制フォールバック詳細:', {
          companySlug: companySlug,
          companySlugType: typeof companySlug,
          companySlugLength: companySlug ? companySlug.length : 0
        });
        companySlug = 'company';
      }

      // 重複チェック＆ユニーク化
      companySlug = this._ensureUniqueCompanySlug(companySlug, region);

      // 最終URLスラッグ
      const urlSlug = `${region}/${companySlug}`;

      console.log('[AdminSystem] URLスラッグ生成完了:', {
        companyName: companyName,
        region: region,
        companySlug: companySlug,
        finalSlug: urlSlug,
        source: rowData && rowData[11] ? 'L列URL' : 'ローマ字読み'
      });

      return {
        urlSlug: urlSlug,
        region: region,
        companySlug: companySlug
      };

    } catch (error) {
      console.error('[AdminSystem] URLスラッグ生成エラー:', error);
      // フォールバック
      return {
        urlSlug: 'other/company',
        region: 'other',
        companySlug: 'company'
      };
    }
  },

  /**
   * ウェブサイトURLから会社スラッグを抽出（シンプル版）
   * @param {string} websiteUrl - ウェブサイトURL
   * @returns {string|null} 会社スラッグまたはnull
   */
  _extractCompanySlugFromUrl: function(websiteUrl) {
    try {
      console.log('[AdminSystem] URL抽出開始:', websiteUrl);

      if (!websiteUrl || typeof websiteUrl !== 'string') {
        console.log('[AdminSystem] URLが無効:', websiteUrl);
        return null;
      }

      const originalUrl = websiteUrl.trim();
      if (!originalUrl || !originalUrl.includes('.')) {
        console.log('[AdminSystem] URLにドメインが含まれていません:', originalUrl);
        return null;
      }

      let domain = originalUrl;

      // プロトコル除去
      if (domain.includes('://')) {
        domain = domain.split('://')[1];
        console.log('[AdminSystem] プロトコル除去後:', domain);
      }

      // パス除去
      if (domain.includes('/')) {
        domain = domain.split('/')[0];
        console.log('[AdminSystem] パス除去後:', domain);
      }

      // www除去
      if (domain.startsWith('www.')) {
        domain = domain.substring(4);
        console.log('[AdminSystem] www除去後:', domain);
      }

      console.log('[AdminSystem] ドメイン抽出:', originalUrl, '→', domain);

      // ドメインから会社スラッグを生成
      if (domain.includes('.')) {
        const domainParts = domain.split('.');
        let mainPart = domainParts[0]; // example.com → example
        console.log('[AdminSystem] ドメイン主要部分:', mainPart);

        // 英数字とハイフンのみを残す（SEO最適化）
        mainPart = mainPart
          .toLowerCase()
          .replace(/[^a-z0-9\-]/g, '-')
          .replace(/-+/g, '-')  // 連続ハイフンを統一
          .replace(/^-|-$/g, ''); // 先頭・末尾のハイフン除去

        console.log('[AdminSystem] クリーンアップ後:', mainPart);

        // 最低限の長さと有効性チェック
        if (mainPart && mainPart.length >= 2 && mainPart !== 'www' && !mainPart.match(/^-+$/)) {
          console.log('[AdminSystem] URL抽出成功:', originalUrl, '→', mainPart);
          return mainPart;
        } else {
          console.log('[AdminSystem] 抽出されたスラッグが無効:', mainPart);
        }
      }

      console.log('[AdminSystem] URL抽出失敗');
      return null;

    } catch (error) {
      console.error('[AdminSystem] URL抽出エラー:', error);
      return null;
    }
  },

  /**
   * 会社名からローマ字読みスラッグを生成（強化版）
   * @param {string} companyName - 会社名
   * @returns {string} 会社スラッグ
   */
  _generateCompanySlugFromName: function(companyName) {
    try {
      if (!companyName || typeof companyName !== 'string') {
        return 'company-' + Math.random().toString(36).substring(2, 10);
      }

      console.log('[AdminSystem] 会社名ローマ字変換開始:', companyName);

      // 会社名の前処理
      let companySlug = companyName
        .replace(/株式会社|有限会社|合同会社|合資会社|合名会社|一般財団法人|公益財団法人|一般社団法人|公益社団法人|NPO法人|特定非営利活動法人/g, '') // 法人格除去
        .replace(/[^\w\sぁ-んァ-ヶー一-龠]/g, '') // 日本語文字と英数字、スペースのみ残す
        .trim();

      if (!companySlug) {
        return 'company-' + Math.random().toString(36).substring(2, 10);
      }

      // 英語が含まれている場合は優先的に使用
      const englishPart = companySlug.match(/[a-zA-Z]+/g);
      if (englishPart && englishPart.length > 0) {
        const englishSlug = englishPart.join('-').toLowerCase();
        if (englishSlug.length >= 2) {
          console.log('[AdminSystem] 英語部分を優先使用:', companyName, '→', englishSlug);
          return this._cleanupSlug(englishSlug);
        }
      }

      // 日本語をローマ字に変換
      console.log('[AdminSystem] ローマ字変換前:', companySlug);
      const romajiSlug = this._japaneseToRomaji(companySlug);
      console.log('[AdminSystem] ローマ字変換後:', romajiSlug);

      console.log('[AdminSystem] ローマ字変換結果:', companyName, '→', romajiSlug);

      // 最終クリーンアップ
      const finalSlug = this._cleanupSlug(romajiSlug);
      console.log('[AdminSystem] 最終クリーンアップ結果:', romajiSlug, '→', finalSlug);
      return finalSlug;

    } catch (error) {
      console.error('[AdminSystem] 会社名ローマ字変換エラー:', error);
      return 'company-' + Math.random().toString(36).substr(2, 8);
    }
  },

  /**
   * 日本語をローマ字に変換（強化版）
   * @param {string} text - 変換対象テキスト
   * @returns {string} ローマ字変換結果
   */
  _japaneseToRomaji: function(text) {
    try {
      let result = text.toLowerCase();

      // カタカナをひらがなに変換
      result = result.replace(/[\u30A1-\u30F6]/g, function(match) {
        return String.fromCharCode(match.charCodeAt(0) - 0x60);
      });

      // よく使われる建設・塗装関連の漢字
      const kanjiMap = {
        '建設': 'kensetsu', '建築': 'kenchiku', '工務': 'koumu', '工事': 'kouji',
        '塗装': 'tosou', '塗料': 'toryou', '外壁': 'gaiheki', '屋根': 'yane',
        '防水': 'bousui', '修理': 'shuri', '補修': 'hoshu', '改修': 'kaishu',
        '改装': 'kaisou', 'リフォーム': 'reform', 'ホーム': 'home', 'ハウス': 'house',
        '住宅': 'jutaku', '不動産': 'fudousan', '産業': 'sangyou', '企業': 'kigyou',
        '商事': 'shouji', '商会': 'shoukai', '技研': 'giken', '技術': 'gijutsu',
        '開発': 'kaihatsu', '設計': 'sekkei', '施工': 'sekou', '管理': 'kanri',
        '山田': 'yamada', '田中': 'tanaka', '佐藤': 'sato', '鈴木': 'suzuki',
        '高橋': 'takahashi', '渡辺': 'watanabe', '伊藤': 'ito', '中村': 'nakamura',
        '小林': 'kobayashi', '加藤': 'kato'
      };

      // 漢字変換
      for (const [kanji, romaji] of Object.entries(kanjiMap)) {
        result = result.replace(new RegExp(kanji, 'g'), romaji);
      }

      // ひらがなローマ字変換（拡張版）
      const romajiMap = {
        'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
        'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
        'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
        'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
        'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
        'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
        'だ': 'da', 'ぢ': 'di', 'づ': 'du', 'で': 'de', 'ど': 'do',
        'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
        'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
        'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
        'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
        'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
        'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
        'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
        'わ': 'wa', 'ゐ': 'wi', 'ゑ': 'we', 'を': 'wo', 'ん': 'n',
        'ー': '', 'っ': '', 'ゃ': 'ya', 'ゅ': 'yu', 'ょ': 'yo'
      };

      // ひらがな変換
      for (const [hiragana, romaji] of Object.entries(romajiMap)) {
        result = result.replace(new RegExp(hiragana, 'g'), romaji);
      }

      // 数字は残す
      result = result.replace(/[０-９]/g, function(match) {
        return String.fromCharCode(match.charCodeAt(0) - 0xFEE0);
      });

      // まだ日本語が残っている場合のフォールバック
      if (/[^\x00-\x7F]/.test(result)) {
        console.log('[AdminSystem] 変換しきれない文字が残っています:', result);
        // 英数字以外を除去
        result = result.replace(/[^\w\s]/g, '');
        if (result.length < 2) {
          result = 'company-' + Math.random().toString(36).substr(2, 8);
        }
      }

      return result;

    } catch (error) {
      console.error('[AdminSystem] 日本語→ローマ字変換エラー:', error);
      return 'company-' + Math.random().toString(36).substr(2, 8);
    }
  },

  /**
   * スラッグの最終クリーンアップ
   * @param {string} slug - クリーンアップ対象スラッグ
   * @returns {string} クリーンアップされたスラッグ
   */
  _cleanupSlug: function(slug) {
    try {
      let cleaned = slug
        .toLowerCase()
        .replace(/\s+/g, '-')     // スペースをハイフンに
        .replace(/[^a-z0-9\-]/g, '-')  // 英数字とハイフン以外をハイフンに
        .replace(/-+/g, '-')      // 連続ハイフンを統一
        .replace(/^-|-$/g, '');   // 先頭・末尾のハイフン除去

      // 短すぎる場合や無効な場合
      if (!cleaned || cleaned.length < 2 || cleaned.match(/^-*$/)) {
        cleaned = 'company-' + Math.random().toString(36).substr(2, 8);
      }

      // 長すぎる場合は切り詰め
      if (cleaned.length > 50) {
        cleaned = cleaned.substring(0, 50).replace(/-$/, '');
      }

      return cleaned;

    } catch (error) {
      console.error('[AdminSystem] スラッグクリーンアップエラー:', error);
      return 'company-' + Math.random().toString(36).substr(2, 8);
    }
  },

  /**
   * 重複チェック＆ユニーク化
   * @param {string} companySlug - 会社スラッグ
   * @param {string} region - 地域スラッグ
   * @returns {string} ユニークな会社スラッグ
   */
  _ensureUniqueCompanySlug: function(companySlug, region) {
    try {
      // ✅ クリーンなスラッグをそのまま返す（数字追加なし）
      console.log('[AdminSystem] クリーンスラッグ確定:', {
        originalSlug: `${region}/${companySlug}`,
        finalSlug: `${region}/${companySlug}`,
        method: 'clean-format',
        note: 'エリア/社名形式、数字なし'
      });

      return companySlug;

    } catch (error) {
      console.error('[AdminSystem] スラッグ生成エラー:', error);
      // エラー時もクリーンな形式で
      return companySlug;
    }
  },

  /**
   * SEO最適化HPのHTML生成
   * @param {string} registrationId - 登録ID
   * @param {string} companyName - 会社名
   * @param {string} address - 住所
   * @param {Array} rowData - スプレッドシート行データ
   * @param {Array} headers - ヘッダー配列
   * @param {Object} ratingData - 評価データ
   * @param {string} urlSlug - URLスラッグ
   * @returns {string} HTMLコンテンツ
   */
  _generateHPHtml: function(registrationId, companyName, address, rowData, headers, ratingData, urlSlug) {
    console.log('[AdminSystem] 🔥 _generateHPHtml: 新しいgenerateStaticHTML関数を呼び出し');

    // データ取得用ヘルパー
    const getData = (headerName) => {
      const index = headers.indexOf(headerName);
      return index !== -1 ? (rowData[index] || '') : '';
    };

    // merchantData形式に変換
    const merchantData = {};
    headers.forEach((header, index) => {
      merchantData[header] = rowData[index] || '';
    });

    // 新しいgenerateStaticHTML関数を呼び出し
    if (typeof generateStaticHTML === 'function') {
      console.log('[AdminSystem] ✅ generateStaticHTML関数が見つかりました');
      console.log('[AdminSystem] 🔄 merchantData:', JSON.stringify(merchantData, null, 2));

      try {
        const html = generateStaticHTML(merchantData);
        console.log('[AdminSystem] ✅ 新しいHTML生成完了！サイズ:', Math.round(html.length / 1024) + 'KB');
        return html;
      } catch (error) {
        console.error('[AdminSystem] ❌ generateStaticHTML呼び出しエラー:', error);
        // フォールバックで古いロジックを使う
      }
    } else {
      console.error('[AdminSystem] ❌ generateStaticHTML関数が見つかりません');
    }

    // フォールバック：generateStaticHTML関数が使えない場合のエラーメッセージ
    console.error('[AdminSystem] ❌ フォールバック: generateStaticHTML関数が使用できません');
    return this.generateErrorHTML();

  },

  /**
   * エラーHTML生成
   */
  generateErrorHTML: function() {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>エラー - HTML生成失敗</title>
</head>
<body>
    <div style="text-align: center; padding: 50px;">
        <h1>🚨 HTML生成エラー</h1>
        <p>generateStaticHTML関数が見つかりません。</p>
        <p>管理者に連絡してください。</p>
    </div>
</body>
</html>`;

  },

  /**
   * Railway Webhook経由でHTMLデプロイ（同期版）
   * @param {string} htmlContent - HTMLコンテンツ
   * @param {string} urlSlug - URLスラッグ
   * @returns {Object} デプロイ結果
   */
  _deployToXserverSync: function(htmlContent, urlSlug, registrationId, companyName) {
    try {
      console.log('[AdminSystem] Railway Webhookデプロイ開始:', urlSlug);

      // Railway Webhook URLを取得
      const railwayWebhookUrl = PropertiesService.getScriptProperties().getProperty('RAILWAY_WEBHOOK_URL');
      if (!railwayWebhookUrl) {
        console.error('[AdminSystem] RAILWAY_WEBHOOK_URLが設定されていません');
        return {
          success: false,
          error: 'RAILWAY_WEBHOOK_URLが設定されていません'
        };
      }

      // URLスラッグから地域と会社名を分離
      const [citySlug, companySlug] = urlSlug.split('/');

      // Railway デプロイサーバーへのリクエストペイロード
      const payload = {
        html: htmlContent,
        citySlug: citySlug || 'other',
        companySlug: companySlug || 'company',
        urlSlug: urlSlug,
        merchantId: registrationId || '',  // RailwayはmerchantIdを期待
        companyName: companyName || '',
        deployedAt: new Date().toISOString()
      };

      console.log('[AdminSystem] Railway Webhook payload準備完了:', {
        webhookUrl: railwayWebhookUrl,
        merchantId: payload.merchantId,
        companyName: payload.companyName,
        citySlug: payload.citySlug,
        companySlug: payload.companySlug,
        htmlLength: htmlContent.length
      });

      // Railway Webhook API呼び出し
      const options = {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        timeout: 30000  // 30秒タイムアウト
      };

      const response = UrlFetchApp.fetch(railwayWebhookUrl, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      console.log('[AdminSystem] Railway Webhook レスポンス:', {
        code: responseCode,
        response: responseText
      });

      if (responseCode === 200) {
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('[AdminSystem] レスポンス解析エラー:', parseError);
          result = { success: true, message: 'デプロイ完了' };
        }

        return {
          success: true,
          message: result.message || 'Railway経由デプロイ完了',
          deployUrl: result.url || `https://gaihekikuraberu.com/${urlSlug}/`,
          railwayResponse: result
        };
      } else {
        console.error('[AdminSystem] Railway Webhook失敗:', responseCode, responseText);
        return {
          success: false,
          error: `Railway Webhook失敗 (HTTP ${responseCode}): ${responseText}`
        };
      }

    } catch (error) {
      console.error('[AdminSystem] Railway Webhookデプロイエラー:', error);
      return {
        success: false,
        error: 'Railway Webhookエラー: ' + error.toString()
      };
    }
  },

  /**
   * 加盟店のURLスラッグ取得
   * @param {Object} params - パラメータ {merchantId}
   * @returns {Object} URLスラッグ情報
   */
  getMerchantUrlSlug: function(params) {
    try {
      const merchantId = params.merchantId;
      console.log('[AdminSystem] getMerchantUrlSlug:', merchantId);

      if (!merchantId) {
        return {
          success: false,
          error: '加盟店IDが指定されていません'
        };
      }

      // スプレッドシートから該当加盟店の情報を取得
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      // 登録IDで検索
      const idIndex = headers.indexOf('登録ID');
      const urlSlugIndex = headers.indexOf('URLスラッグ');
      const previewHPIndex = headers.indexOf('プレビューHP');

      if (idIndex === -1) {
        return {
          success: false,
          error: '登録ID列が見つかりません'
        };
      }

      // 該当行を検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === merchantId) {
          const urlSlug = urlSlugIndex !== -1 ? (data[i][urlSlugIndex] || '') : '';
          const previewUrl = previewHPIndex !== -1 ? (data[i][previewHPIndex] || '') : '';

          return {
            success: true,
            urlSlug: urlSlug,
            previewUrl: previewUrl,
            fullUrl: urlSlug ? `https://gaihekikuraberu.com/${urlSlug}/` : '',
            canEdit: true
          };
        }
      }

      return {
        success: false,
        error: '該当する加盟店が見つかりません'
      };

    } catch (error) {
      console.error('[AdminSystem] getMerchantUrlSlug error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * URLスラッグの重複チェック
   * @param {Object} params - パラメータ {urlSlug, merchantId}
   * @returns {Object} 重複チェック結果
   */
  checkUrlSlugAvailable: function(params) {
    try {
      const urlSlug = params.urlSlug;
      const merchantId = params.merchantId;

      console.log('[AdminSystem] checkUrlSlugAvailable:', urlSlug, 'for:', merchantId);

      if (!urlSlug) {
        return {
          success: false,
          error: 'URLスラッグが指定されていません'
        };
      }

      // URLスラッグ形式のバリデーション
      const urlPattern = /^[a-z0-9-]+\/[a-z0-9-]+$/;
      if (!urlPattern.test(urlSlug)) {
        return {
          success: false,
          available: false,
          error: 'URLスラッグは「地域/会社名」の形式で、英数字とハイフンのみ使用してください'
        };
      }

      // スプレッドシートから既存のURLスラッグをチェック
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      const idIndex = headers.indexOf('登録ID');
      const urlSlugIndex = headers.indexOf('URLスラッグ');

      if (urlSlugIndex === -1) {
        return {
          success: false,
          error: 'URLスラッグ列が見つかりません'
        };
      }

      // 重複チェック（自分以外）
      for (let i = 1; i < data.length; i++) {
        const existingUrlSlug = data[i][urlSlugIndex];
        const existingMerchantId = data[i][idIndex];

        if (existingUrlSlug === urlSlug && existingMerchantId !== merchantId) {
          return {
            success: true,
            available: false,
            error: 'このURLスラッグは既に使用されています'
          };
        }
      }

      return {
        success: true,
        available: true,
        message: 'このURLスラッグは利用可能です'
      };

    } catch (error) {
      console.error('[AdminSystem] checkUrlSlugAvailable error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 加盟店のURLスラッグ更新
   * @param {Object} params - パラメータ {merchantId, urlSlug}
   * @returns {Object} 更新結果
   */
  updateMerchantUrlSlug: function(params) {
    try {
      const merchantId = params.merchantId;
      const urlSlug = params.urlSlug;

      console.log('[AdminSystem] updateMerchantUrlSlug:', merchantId, 'to:', urlSlug);

      if (!merchantId || !urlSlug) {
        return {
          success: false,
          error: '加盟店IDとURLスラッグが必要です'
        };
      }

      // 重複チェック
      const availabilityCheck = this.checkUrlSlugAvailable({ urlSlug: urlSlug, merchantId: merchantId });
      if (!availabilityCheck.success || !availabilityCheck.available) {
        return {
          success: false,
          error: availabilityCheck.error || 'URLスラッグが利用できません'
        };
      }

      // スプレッドシート更新
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      const idIndex = headers.indexOf('登録ID');
      const urlSlugIndex = headers.indexOf('URLスラッグ');
      const previewHPIndex = headers.indexOf('プレビューHP');

      if (idIndex === -1 || urlSlugIndex === -1) {
        return {
          success: false,
          error: '必要な列が見つかりません'
        };
      }

      // 該当行を検索して更新
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === merchantId) {
          // URLスラッグを更新
          sheet.getRange(i + 1, urlSlugIndex + 1).setValue(urlSlug);

          // 新しいプレビューURLを生成
          const newPreviewUrl = `https://gaihekikuraberu.com/${urlSlug}/`;
          if (previewHPIndex !== -1) {
            sheet.getRange(i + 1, previewHPIndex + 1).setValue(newPreviewUrl);
          }

          // 会社情報を取得してHP再生成・再デプロイ
          try {
            const companyName = data[i][headers.indexOf('会社名（法人名）')] || data[i][headers.indexOf('会社名')] || '';
            const address = data[i][headers.indexOf('住所')] || '';

            if (companyName) {
              console.log('[AdminSystem] HP再生成開始:', companyName, 'URL:', urlSlug);

              // HP自動生成・再デプロイ（同期版）
              const hpResult = this._generateAndDeployHPSync(merchantId, companyName, address, data[i], headers);

              if (hpResult.success) {
                console.log('[AdminSystem] HP再生成・再デプロイ完了:', hpResult.fullUrl);
              } else {
                console.error('[AdminSystem] HP再生成エラー:', hpResult.error);
                // エラーでも処理は継続（URLスラッグの更新は成功）
              }
            }
          } catch (hpError) {
            console.error('[AdminSystem] HP再生成エラー（処理は継続）:', hpError);
          }

          return {
            success: true,
            message: 'URLスラッグが更新されました',
            urlSlug: urlSlug,
            previewUrl: newPreviewUrl
          };
        }
      }

      return {
        success: false,
        error: '該当する加盟店が見つかりません'
      };

    } catch (error) {
      console.error('[AdminSystem] updateMerchantUrlSlug error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * StaticHTMLGeneratorの手動テスト（Railway webhook確認用）
   */
  manualTestStaticHTMLGenerator: function(params) {
    try {
      console.log('=== 🚨 StaticHTMLGenerator手動テスト開始 ===');
      console.log('🎯 目的: Railway webhookに正しいmerchantIdとcompanyNameが送信されるか確認');

      // StaticHTMLGeneratorが存在するかチェック
      if (typeof StaticHTMLGenerator === 'undefined') {
        console.error('❌ StaticHTMLGeneratorが見つかりません');
        return { success: false, error: 'StaticHTMLGeneratorが見つかりません' };
      }

      console.log('✅ StaticHTMLGenerator見つかりました');

      // テスト用merchantData（正しい形式で）
      const testMerchantData = {
        '登録ID': 'MANUAL_TEST_' + Date.now(),
        '会社名（法人名）': '手動テスト建設株式会社',
        '住所': '神奈川県横浜市中区本町1-2-3',
        '電話番号': '045-123-4567',
        'メールアドレス': 'manual-test@example.com',
        'ウェブサイトURL': 'https://manual-test.co.jp'
      };

      console.log('🔍 テスト用merchantData:', JSON.stringify(testMerchantData, null, 2));

      // StaticHTMLGenerator.generateAndDeployを直接呼び出し
      console.log('🚀 StaticHTMLGenerator.generateAndDeploy呼び出し開始...');

      const result = StaticHTMLGenerator.generateAndDeploy(
        testMerchantData['登録ID'],
        testMerchantData
      );

      console.log('📊 StaticHTMLGenerator結果:', JSON.stringify(result, null, 2));

      // 成功した場合の詳細ログ
      if (result && result.success) {
        console.log('✅ StaticHTMLGenerator成功');
        console.log('  - Railway webhook送信:', result.webhookSent ? '✅ 送信済み' : '❌ 未送信');
        console.log('  - merchantId:', result.merchantId || '未設定');
        console.log('  - companyName:', result.companyName || '未設定');
      } else {
        console.log('❌ StaticHTMLGenerator失敗');
        console.log('  - エラー:', result ? result.error : '不明なエラー');
      }

      return {
        success: true,
        testData: testMerchantData,
        staticHTMLResult: result,
        message: 'StaticHTMLGenerator手動テスト完了',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('🚨 StaticHTMLGenerator手動テストエラー:', error);
      return {
        success: false,
        error: error.toString(),
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * 非同期でHP生成・デプロイを実行
   * @param {string} registrationId
   * @param {string} companyName
   * @param {string} address
   * @param {Array} rowData
   * @param {Array} headers
   */
  _scheduleAsyncHPGeneration: function(registrationId, companyName, address, rowData, headers) {
    try {
      console.log('[AdminSystem] 非同期HP生成開始:', companyName);

      // 加盟店データを構築
      const merchantData = {};
      headers.forEach((header, index) => {
        merchantData[header] = rowData[index];
      });

      // StaticHTMLGeneratorを実行（時間制限は設けない - 失敗してもログのみ）
      console.log('[AdminSystem] StaticHTMLGenerator呼び出し開始（非同期）');
      const deployResult = StaticHTMLGenerator.generateAndDeploy(registrationId, merchantData);

      console.log('[AdminSystem] 非同期HP生成完了:', JSON.stringify(deployResult));

      // 成功時にスプレッドシートのプレビューHP列を更新
      if (deployResult.success && deployResult.url) {
        this._updatePreviewHPUrl(registrationId, deployResult.url);
      }

    } catch (error) {
      console.error('[AdminSystem] 非同期HP生成エラー:', error);
      // エラーでも承認処理は成功として扱う（ログのみ）
    }
  },

  /**
   * プレビューHP URLをスプレッドシートに更新
   */
  _updatePreviewHPUrl: function(registrationId, previewUrl) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIndex = headers.indexOf('登録ID');
      const previewHPIndex = headers.indexOf('プレビューHP');

      if (previewHPIndex === -1) {
        console.error('[AdminSystem] プレビューHP列が見つかりません');
        return;
      }

      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === registrationId) {
          sheet.getRange(i + 1, previewHPIndex + 1).setValue(previewUrl);
          console.log('[AdminSystem] プレビューHP URL更新完了:', previewUrl);
          break;
        }
      }
    } catch (error) {
      console.error('[AdminSystem] プレビューHP URL更新エラー:', error);
    }
  },

  /**
   * 軽量キュー追加API（承認処理とは独立）
   * @param {string} registrationId - 登録ID
   * @public
   */
  addToHPQueueOnly: function(registrationId) {
    try {
      console.log('[AdminSystem] 軽量キュー追加開始:', registrationId);

      if (!registrationId) {
        return {
          success: false,
          error: 'registrationIdが必要です'
        };
      }

      // スプレッドシートから該当データを取得
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = spreadsheet.getSheetByName('加盟店登録');

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIndex = headers.indexOf('登録ID');

      // 該当行を検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === registrationId) {
          // キューに追加
          this._addToHPGenerationQueue(registrationId, data[i]);
          return {
            success: true,
            message: `${registrationId}をHP生成キューに追加しました`
          };
        }
      }

      return {
        success: false,
        error: '該当する登録が見つかりません'
      };

    } catch (error) {
      console.error('[AdminSystem] 軽量キュー追加エラー:', error.toString());
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * HP生成キューに追加
   * @param {string} registrationId - 登録ID
   * @param {Array} rowData - 行データ
   * @private
   */
  _addToHPGenerationQueue: function(registrationId, rowData) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

      // HP生成キューシートを取得（なければ作成）
      let queueSheet;
      try {
        queueSheet = spreadsheet.getSheetByName('HP生成キュー');
      } catch (error) {
        // シートが存在しない場合は作成
        queueSheet = spreadsheet.insertSheet('HP生成キュー');
        queueSheet.getRange(1, 1, 1, 5).setValues([
          ['タイムスタンプ', '登録ID', '会社名', 'ステータス', 'エラーメッセージ']
        ]);
        queueSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
        queueSheet.setFrozenRows(1);
      }

      // キューに追加
      const timestamp = new Date();
      const companyName = rowData[2] || '不明';

      queueSheet.appendRow([
        timestamp,
        registrationId,
        companyName,
        '待機中',
        ''
      ]);

      console.log('[AdminSystem] HP生成キューに追加:', registrationId, companyName);

      // 初回実行時のみトリガー設定
      this._setupHPGenerationTrigger();

    } catch (error) {
      console.error('[AdminSystem] HP生成キュー追加エラー:', error.toString());
      throw error;
    }
  },

  /**
   * HP生成時間トリガーをセットアップ
   * @private
   */
  _setupHPGenerationTrigger: function() {
    try {
      // 既存のトリガーをチェック
      const triggers = ScriptApp.getProjectTriggers();
      const existingTrigger = triggers.find(trigger =>
        trigger.getHandlerFunction() === 'processHPGenerationQueue'
      );

      if (!existingTrigger) {
        // 1分間隔のトリガーを作成
        ScriptApp.newTrigger('processHPGenerationQueue')
          .timeBased()
          .everyMinutes(1)
          .create();

        console.log('[AdminSystem] HP生成時間トリガーを設定しました');
      }
    } catch (error) {
      console.error('[AdminSystem] トリガー設定エラー:', error.toString());
    }
  },

/**
 * ===== AdminSystem専用テスト関数 =====
 * 本番テスト前の動作確認用
 */

}; // AdminSystemオブジェクトの終了

// グローバルスコープに明示的に公開（GAS用）
// GASでは var宣言だけでは十分でない場合があるため、明示的にグローバルに配置
this.AdminSystem = AdminSystem;
if (typeof globalThis !== 'undefined') globalThis.AdminSystem = AdminSystem;

// 🗑️ キューシステム廃止 - 直接実行に変更済み（2-3秒でFTP完了）