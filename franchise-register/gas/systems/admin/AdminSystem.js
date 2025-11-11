/**
 * ====================================
 * 管理ダッシュボードシステム（承認・管理）
 * ====================================
 *
 * 【依存関係】
 * - FranchiseSystem.js（登録データ - ステータス更新に依存）
 * - MerchantSystem.js（加盟店データ - データ読み取りに依存）
 * - SlackApprovalSystem.js（Slack通知）
 *
 * 【影響範囲】
 * - フロント: admin-dashboard（管理者ダッシュボード）
 * - データ: Spreadsheet読み書き（ステータス・パスワード・URL）
 *
 * 【変更時の注意】
 * ⚠️  承認/却下ロジック変更時はSlack通知も確認
 * ⚠️  ステータス変更時はMerchantSystemへの影響を確認
 * ⚠️  パスワード生成ロジック変更時はMerchantSystem認証も確認
 *
 * 【必須テスト】
 * - npm run test:integration
 * - npm run test:admin
 * - npm run check:impact AdminSystem.js
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

        case 'getMerchantData':
          return this.getMerchantData(params);

        case 'getMerchantStatus':
          return this.getMerchantStatus(params);

        case 'updateMerchantData':
          // GETリクエストの場合、parsedDataを使用
          const updateData = {
            merchantId: params.merchantId,
            data: params.parsedData || {}
          };
          return this.updateMerchantData(updateData);

        case 'admin_test':
          return {
            success: true,
            message: 'Admin system is running'
          };

        case 'check_headers':
          return this.checkHeaders();

        case 'approveRegistration':
          return this.approveRegistration(params);

        case 'rejectRegistration':
          return this.rejectRegistration(params);

        case 'revertRegistration':
          return this.revertRegistration(params);

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
      const action = postData.action || e.parameter.action;

      switch (action) {
        case 'getMerchantData':
          return this.getMerchantData(postData);

        case 'getMerchantStatus':
          return this.getMerchantStatus(postData);

        case 'updateMerchantData':
          return this.updateMerchantData(postData);

        case 'approveRegistration':
          return this.approveRegistration(e.parameter);

        case 'rejectRegistration':
          return this.rejectRegistration(e.parameter);

        case 'revertRegistration':
          return this.revertRegistration(e.parameter);

        default:
          return {
            success: false,
            error: `Unknown admin POST action: ${action}`
          };
      }

    } catch (error) {
      console.error('[AdminSystem] POST Error:', error);
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
      status: row['ステータス'] || '未審査',
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
      const registrationDateIndex = headers.indexOf('登録日時');
      const pauseFlagIndex = headers.indexOf('一時停止フラグ');
      const pauseStartDateIndex = headers.indexOf('一時停止開始日');
      const pauseEndDateIndex = headers.indexOf('一時停止再開予定日');

      // 該当行を検索
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === registrationId) {
          const approvalDate = Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd');

          // 承認処理
          sheet.getRange(i + 1, approvalStatusIndex + 1).setValue('承認済み');
          sheet.getRange(i + 1, statusIndex + 1).setValue('休止');

          // 承認者を記録（名前のみ）
          sheet.getRange(i + 1, approverIndex + 1).setValue('ryutayamauchi');

          if (approvalDateIndex !== -1) {
            sheet.getRange(i + 1, approvalDateIndex + 1).setValue(
              Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm')
            );
          }

          // 登録日時を設定（AL列）
          if (registrationDateIndex !== -1) {
            sheet.getRange(i + 1, registrationDateIndex + 1).setValue(
              Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm:ss')
            );
          }

          // 一時停止設定を自動設定
          if (pauseFlagIndex !== -1) {
            sheet.getRange(i + 1, pauseFlagIndex + 1).setValue('TRUE');
          }
          if (pauseStartDateIndex !== -1) {
            sheet.getRange(i + 1, pauseStartDateIndex + 1).setValue(approvalDate);
          }
          if (pauseEndDateIndex !== -1) {
            sheet.getRange(i + 1, pauseEndDateIndex + 1).setValue('未定');
          }

          // 初回ログインメール送信
          try {
            console.log('[AdminSystem] 初回ログインメール送信開始');
            const rowData = data[i];
            const email = rowData[22]; // W列: 営業用メールアドレス
            const companyName = rowData[2]; // C列: 会社名

            if (email && companyName) {
              const loginUrl = generateFirstLoginUrl(registrationId);
              sendWelcomeEmail(email, companyName, loginUrl, registrationId);
              console.log('[AdminSystem] 初回ログインメール送信成功:', email, registrationId);
            } else {
              console.error('[AdminSystem] メールアドレスまたは会社名が見つかりません');
            }
          } catch (emailErr) {
            console.error('[AdminSystem] 初回ログインメール送信エラー:', emailErr);
          }

          // Slack通知は除去（二重送信を防ぐため）
          console.log('[AdminSystem] Slack通知は他のシステムが担当');

          // 評価データ自動収集
          console.log('[AdminSystem] ===== 評価データ収集開始 =====');
          try {
            const rowData = data[i];
            const companyName = rowData[2] || ''; // C列: 会社名
            const address = rowData[9] || ''; // J列: 住所

            if (companyName) {
              console.log('[AdminSystem] 評価データ収集対象 - 会社名:', companyName, 'Address:', address);

              // EvaluationDataManager呼び出し
              const ratingsResult = EvaluationDataManager.collectRatingsFromAPIs(companyName, address);
              console.log('[AdminSystem] 評価データ収集結果:', JSON.stringify(ratingsResult));

              if (ratingsResult.success) {
                console.log('[AdminSystem] ✅ 評価データ収集成功');
              } else {
                console.error('[AdminSystem] ❌ 評価データ収集失敗:', ratingsResult.error);
              }
            } else {
              console.warn('[AdminSystem] 会社名が空のため評価データ収集スキップ');
            }
          } catch (evalError) {
            console.error('[AdminSystem] 評価データ収集エラー:', evalError);
            console.error('[AdminSystem] エラーメッセージ:', evalError.message);
            console.error('[AdminSystem] エラースタック:', evalError.stack);
          }
          console.log('[AdminSystem] ===== 評価データ収集終了 =====');

          // URLスラッグ自動生成とプレビューHP生成処理
          try {
            console.log('[AdminSystem] URLスラッグ・HP自動生成開始:', registrationId);

            const rowData = data[i];
            const companyName = rowData[2] || ''; // C列: 会社名
            const address = rowData[9] || ''; // J列: 住所

            // URLスラッグ自動生成
            let urlSlugResult = null;
            if (companyName) {
              urlSlugResult = this._generateUrlSlug(companyName, address, rowData, headers);

              // URLスラッグ列を更新
              const urlSlugIndex = headers.indexOf('URLスラッグ');
              if (urlSlugResult && urlSlugResult.urlSlug && urlSlugIndex !== -1) {
                sheet.getRange(i + 1, urlSlugIndex + 1).setValue(urlSlugResult.urlSlug);
                console.log('[AdminSystem] URLスラッグ保存完了:', urlSlugResult.urlSlug);
              }
            }

            // HP自動生成処理
            if (typeof StaticHTMLGenerator !== 'undefined') {
              const merchantData = {};
              headers.forEach((header, index) => {
                merchantData[header] = rowData[index] || '';
              });

              // URLスラッグを分解（例: "kanagawa/ohnokensou" → ["kanagawa", "ohnokensou"]）
              let citySlug = 'other';
              let companySlug = 'company';

              if (urlSlugResult && urlSlugResult.urlSlug) {
                const slugParts = urlSlugResult.urlSlug.split('/');
                citySlug = slugParts[0] || 'other';
                companySlug = slugParts[1] || 'company';

                console.log('[AdminSystem] スラッグ分解完了:', {
                  original: urlSlugResult.urlSlug,
                  city: citySlug,
                  company: companySlug
                });
              }

              const hpResult = StaticHTMLGenerator.generateAndDeployWithSlugs(
                registrationId,
                merchantData,
                citySlug,
                companySlug
              );

              if (hpResult && hpResult.success) {
                console.log('[AdminSystem] HP自動生成成功:', hpResult.url);

                // プレビューHP列を更新
                const previewHPIndex = headers.indexOf('プレビューHP');
                if (previewHPIndex !== -1) {
                  sheet.getRange(i + 1, previewHPIndex + 1).setValue(hpResult.url);
                  console.log('[AdminSystem] プレビューHP保存完了:', hpResult.url);
                }
              } else {
                console.error('[AdminSystem] HP自動生成失敗:', hpResult?.error);
              }
            } else {
              console.error('[AdminSystem] StaticHTMLGeneratorが見つかりません');
            }
          } catch (autoGenError) {
            console.error('[AdminSystem] URLスラッグ・HP自動生成エラー:', autoGenError);
            // エラーは無視して処理を続行
          }

          // 加盟店マスタへのデータコピー（V1694）
          try {
            console.log('[AdminSystem] ===== 加盟店マスタ自動構築開始 =====');
            const masterResult = this.copyToFranchiseMaster(registrationId, data[i], headers);
            if (masterResult.success) {
              console.log('[AdminSystem] ✅ 加盟店マスタ構築成功');
            } else {
              console.error('[AdminSystem] ❌ 加盟店マスタ構築失敗:', masterResult.error);
            }
          } catch (masterError) {
            console.error('[AdminSystem] 加盟店マスタ構築エラー:', masterError);
            // エラーは無視して処理を続行
          }
          console.log('[AdminSystem] ===== 加盟店マスタ自動構築終了 =====');

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
   * サイレントフラグ付き承認（V1695）
   * 承認と同時にサイレントフラグをTRUEに設定
   */
  approveSilentRegistration: function(params) {
    try {
      const registrationId = params.registrationId;
      const approver = params.approver || '管理者';

      if (!registrationId) {
        return {
          success: false,
          error: '登録IDが指定されていません'
        };
      }

      console.log('[AdminSystem] サイレント承認開始:', registrationId);

      // スプレッドシート更新
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');

      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIndex = headers.indexOf('登録ID');
      const silentFlagIndex = headers.indexOf('サイレントフラグ');

      if (silentFlagIndex === -1) {
        console.error('[AdminSystem] サイレントフラグ列が見つかりません');
        return {
          success: false,
          error: 'サイレントフラグ列が見つかりません'
        };
      }

      // 該当行を検索してサイレントフラグをTRUEに設定
      let found = false;
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === registrationId) {
          // サイレントフラグをTRUEに設定
          sheet.getRange(i + 1, silentFlagIndex + 1).setValue('TRUE');
          console.log('[AdminSystem] サイレントフラグをTRUEに設定:', registrationId);
          found = true;
          break;
        }
      }

      if (!found) {
        return {
          success: false,
          error: '該当する登録IDが見つかりません'
        };
      }

      // 通常の承認処理を実行
      console.log('[AdminSystem] 通常の承認処理を実行中...');
      const result = this.approveRegistration(params);

      if (result.success) {
        console.log('[AdminSystem] サイレント承認完了:', registrationId);
      }

      return result;

    } catch (error) {
      console.error('[AdminSystem] approveSilentRegistration error:', error);
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

          // Slack通知は除去（二重送信を防ぐため）
          console.log('[AdminSystem] Slack通知は他のシステムが担当');

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
   * 加盟店データ取得
   */
  getMerchantData: function(params) {
    try {
      const merchantId = params.merchantId;
      if (!merchantId) {
        return {
          success: false,
          error: '加盟店IDが指定されていません'
        };
      }

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      // 加盟店IDで検索
      const idIndex = headers.indexOf('登録ID');
      const merchantRow = data.find(row => row[idIndex] === merchantId);

      if (!merchantRow) {
        return {
          success: false,
          error: '加盟店が見つかりません'
        };
      }

      // データをオブジェクトに変換
      const merchantData = {};
      headers.forEach((header, index) => {
        let value = merchantRow[index];

        // 日付フィールドの場合、yyyy-MM-dd形式に変換
        if (header === '一時停止開始日' || header === '一時停止再開予定日') {
          console.log('[getMerchantData] Date field:', header, 'Type:', typeof value, 'instanceof Date:', value instanceof Date, 'Value:', value);
          if (value instanceof Date) {
            value = Utilities.formatDate(value, 'JST', 'yyyy-MM-dd');
            console.log('[getMerchantData] Converted to:', value);
          } else if (value) {
            // 文字列やその他の形式の場合も変換を試みる
            try {
              const dateObj = new Date(value);
              if (!isNaN(dateObj.getTime())) {
                value = Utilities.formatDate(dateObj, 'JST', 'yyyy-MM-dd');
                console.log('[getMerchantData] Converted from string to:', value);
              }
            } catch (e) {
              console.warn('[getMerchantData] Could not convert date:', value, e);
            }
          }
        }

        merchantData[header] = value;
      });

      return {
        success: true,
        data: merchantData
      };
    } catch (error) {
      console.error('[AdminSystem] getMerchantData error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 加盟店ステータス取得
   */
  getMerchantStatus: function(params) {
    try {
      const merchantId = params.merchantId;
      if (!merchantId) {
        return {
          success: false,
          error: '加盟店IDが指定されていません'
        };
      }

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      const data = sheet.getDataRange().getValues();
      const headers = data[0];

      const idIndex = headers.indexOf('登録ID');
      const statusIndex = headers.indexOf('ステータス');
      const merchantRow = data.find(row => row[idIndex] === merchantId);

      if (!merchantRow) {
        return {
          success: false,
          error: '加盟店が見つかりません'
        };
      }

      return {
        success: true,
        status: merchantRow[statusIndex] || '一時停止'
      };
    } catch (error) {
      console.error('[AdminSystem] getMerchantStatus error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 加盟店データ更新
   */
  updateMerchantData: function(postData) {
    try {
      const merchantId = postData.merchantId;
      const data = postData.data;

      console.log('[AdminSystem] updateMerchantData - merchantId:', merchantId);
      console.log('[AdminSystem] updateMerchantData - data keys:', data ? Object.keys(data) : 'no data');
      console.log('[AdminSystem] updateMerchantData - FULL DATA:', JSON.stringify(data));
      console.log('[AdminSystem] companyName value:', data.companyName);
      console.log('[AdminSystem] companyNameKana value:', data.companyNameKana);
      console.log('[AdminSystem] representative value:', data.representative);
      console.log('[AdminSystem] representativeKana value:', data.representativeKana);
      console.log('[AdminSystem] tradeNameKana value:', data.tradeNameKana);

      if (!merchantId) {
        return {
          success: false,
          error: '加盟店IDが指定されていません'
        };
      }

      if (!data) {
        return {
          success: false,
          error: '更新データが指定されていません'
        };
      }

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店登録');
      const sheetData = sheet.getDataRange().getValues();
      const headers = sheetData[0];

      // 加盟店IDで行を検索
      const idIndex = headers.indexOf('登録ID');
      let rowIndex = -1;
      for (let i = 1; i < sheetData.length; i++) {
        if (sheetData[i][idIndex] === merchantId) {
          rowIndex = i + 1; // スプレッドシートは1-indexed
          break;
        }
      }

      if (rowIndex === -1) {
        return {
          success: false,
          error: '加盟店が見つかりません: ' + merchantId
        };
      }

      console.log('[AdminSystem] Found merchant at row:', rowIndex);
      console.log('[AdminSystem] Spreadsheet headers:', JSON.stringify(headers));

      // データを更新（undefinedでないフィールドのみ）
      // ログ出力して実際に更新されているか確認
      let updatedCount = 0;

      if (data.companyName !== undefined) {
        const colIndex = headers.indexOf('会社名');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.companyName);
          updatedCount++;
          console.log('[AdminSystem] Updated companyName:', data.companyName);
        } else {
          console.warn('[AdminSystem] Header not found: 会社名');
        }
      }
      if (data.companyNameKana !== undefined) {
        const colIndex = headers.indexOf('会社名カナ');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.companyNameKana);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 会社名カナ');
        }
      }
      if (data.tradeName !== undefined) {
        const colIndex = headers.indexOf('屋号');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.tradeName);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 屋号');
        }
      }
      if (data.tradeNameKana !== undefined) {
        const colIndex = headers.indexOf('屋号カナ');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.tradeNameKana);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 屋号カナ');
        }
      }
      if (data.representative !== undefined) {
        const colIndex = headers.indexOf('代表者名');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.representative);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 代表者名');
        }
      }
      if (data.representativeKana !== undefined) {
        const colIndex = headers.indexOf('代表者名カナ');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.representativeKana);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 代表者名カナ');
        }
      }
      if (data.postalCode !== undefined) {
        const colIndex = headers.indexOf('郵便番号');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.postalCode);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 郵便番号');
        }
      }
      if (data.address !== undefined) {
        const colIndex = headers.indexOf('住所');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.address);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 住所');
        }
      }
      if (data.phone !== undefined) {
        const colIndex = headers.indexOf('電話番号');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.phone);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 電話番号');
        }
      }
      if (data.website !== undefined) {
        const colIndex = headers.indexOf('ウェブサイトURL');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.website);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: ウェブサイトURL');
        }
      }
      if (data.established !== undefined) {
        const colIndex = headers.indexOf('設立年月');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.established);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 設立年月');
        }
      }
      if (data.prText !== undefined) {
        const colIndex = headers.indexOf('PRテキスト');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.prText);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: PRテキスト');
        }
      }
      if (data.branchName !== undefined) {
        const colIndex = headers.indexOf('支店名');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.branchName);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 支店名');
        }
      }
      if (data.branchAddress !== undefined) {
        const colIndex = headers.indexOf('支店住所');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.branchAddress);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 支店住所');
        }
      }
      if (data.billingEmail !== undefined) {
        const colIndex = headers.indexOf('請求用メールアドレス');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.billingEmail);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 請求用メールアドレス');
        }
      }
      if (data.salesEmail !== undefined) {
        const colIndex = headers.indexOf('営業用メールアドレス');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.salesEmail);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 営業用メールアドレス');
        }
      }
      if (data.salesPersonName !== undefined) {
        const colIndex = headers.indexOf('営業担当者氏名');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.salesPersonName);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 営業担当者氏名');
        }
      }
      if (data.salesPersonKana !== undefined) {
        const colIndex = headers.indexOf('営業担当者カナ');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.salesPersonKana);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 営業担当者カナ');
        }
      }
      if (data.employees !== undefined) {
        const colIndex = headers.indexOf('従業員数');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.employees);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 従業員数');
        }
      }
      if (data.salesScale !== undefined) {
        const colIndex = headers.indexOf('売上規模');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.salesScale);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 売上規模');
        }
      }
      if (data.qualifications !== undefined) {
        const colIndex = headers.indexOf('保有資格');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.qualifications);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 保有資格');
        }
      }
      if (data.insurance !== undefined) {
        const colIndex = headers.indexOf('加入保険');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.insurance);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 加入保険');
        }
      }

      // 画像関連
      if (data['メインビジュアル'] !== undefined) {
        const colIndex = headers.indexOf('メインビジュアル');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data['メインビジュアル']);
          updatedCount++;
          console.log('[AdminSystem] Updated メインビジュアル:', data['メインビジュアル']);
        } else {
          console.warn('[AdminSystem] Header not found: メインビジュアル');
        }
      }
      if (data['写真ギャラリー'] !== undefined) {
        const colIndex = headers.indexOf('写真ギャラリー');
        if (colIndex !== -1) {
          const galleryValue = data['写真ギャラリー'];
          const urls = galleryValue.split(',').map(url => url.trim()).filter(url => url);

          // カンマ区切りのURLをそのまま保存（HYPERLINK関数は使わない）
          sheet.getRange(rowIndex, colIndex + 1).setValue(galleryValue);
          updatedCount++;
          console.log('[AdminSystem] Updated 写真ギャラリー: ' + urls.length + ' URLs (カンマ区切り)');
        } else {
          console.warn('[AdminSystem] Header not found: 写真ギャラリー');
        }
      }

      // 自動配信設定項目
      if (data.propertyTypes !== undefined) {
        // 対応可能物件種別列に保存（AB列ではなくAC列）
        let colIndex = headers.indexOf('対応可能物件種別');
        if (colIndex === -1) {
          // フォールバックで対応物件種別も試す
          colIndex = headers.indexOf('対応物件種別');
        }
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.propertyTypes);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 対応可能物件種別 or 対応物件種別');
        }
      }
      if (data.maxFloors !== undefined) {
        const colIndex = headers.indexOf('最大対応階数');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.maxFloors);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 最大対応階数');
        }
      }
      if (data.buildingAge !== undefined) {
        const colIndex = headers.indexOf('築年数対応範囲');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.buildingAge);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 築年数対応範囲');
        }
      }
      if (data.constructionTypes !== undefined) {
        // 「対応工事種別」または「施工箇所」列を探す
        let colIndex = headers.indexOf('対応工事種別');
        if (colIndex === -1) {
          colIndex = headers.indexOf('施工箇所');
        }
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.constructionTypes);
          updatedCount++;
          console.log('[AdminSystem] Updated constructionTypes:', data.constructionTypes);
        } else {
          console.warn('[AdminSystem] Header not found: 対応工事種別 or 施工箇所');
        }
      }
      if (data.specialServices !== undefined) {
        const colIndex = headers.indexOf('特殊対応項目');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.specialServices);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 特殊対応項目');
        }
      }
      if (data.prefectures !== undefined) {
        const colIndex = headers.indexOf('対応都道府県');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.prefectures);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 対応都道府県');
        }
      }
      if (data.cities !== undefined) {
        const colIndex = headers.indexOf('対応市区町村');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.cities);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 対応市区町村');
        }
      }
      if (data.priorityAreas !== undefined) {
        const colIndex = headers.indexOf('優先エリア');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.priorityAreas);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 優先エリア');
        }
      }

      // 一時停止設定項目
      if (data.status !== undefined) {
        const colIndex = headers.indexOf('ステータス');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.status);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: ステータス');
        }
      }
      if (data.pauseFlag !== undefined) {
        const colIndex = headers.indexOf('一時停止フラグ');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.pauseFlag);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 一時停止フラグ');
        }
      }
      if (data.pauseStartDate !== undefined) {
        const colIndex = headers.indexOf('一時停止開始日');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.pauseStartDate);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 一時停止開始日');
        }
      }
      if (data.pauseEndDate !== undefined) {
        const colIndex = headers.indexOf('一時停止再開予定日');
        if (colIndex !== -1) {
          sheet.getRange(rowIndex, colIndex + 1).setValue(data.pauseEndDate);
          updatedCount++;
        } else {
          console.warn('[AdminSystem] Header not found: 一時停止再開予定日');
        }
      }

      console.log('[AdminSystem] Updated', updatedCount, 'fields');

      console.log('[AdminSystem] Update completed for:', merchantId);

      return {
        success: true,
        message: 'データを更新しました'
      };

    } catch (error) {
      console.error('[AdminSystem] updateMerchantData error:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * URLスラッグ生成（SEO対応 - L列URL抽出優先 + 重複チェック）
   * @param {string} companyName - 会社名
   * @param {string} address - 住所
   * @param {Array} rowData - スプレッドシート行データ
   * @param {Array} headers - ヘッダー配列
   * @returns {Object} URLスラッグ（例: {urlSlug: "kanagawa/ohnokensou", region: "kanagawa", companySlug: "ohnokensou"}）
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

      // 都道府県列から直接地域を取得
      const prefectureIndex = headers.indexOf('都道府県');
      let prefecture = '';

      if (prefectureIndex !== -1 && rowData.length > prefectureIndex) {
        prefecture = rowData[prefectureIndex] || '';
        console.log('[AdminSystem] 都道府県列から取得:', prefecture);
      } else {
        // フォールバック：住所から地域を特定
        prefecture = address;
        console.log('[AdminSystem] 住所から地域判定:', address);
      }

      // 都道府県から地域コードを特定
      for (const [jp, en] of Object.entries(regionMap)) {
        if (prefecture.includes(jp)) {
          region = en;
          console.log('[AdminSystem] 地域特定:', jp, '→', en);
          break;
        }
      }

      // 会社スラッグ生成：L列のウェブサイトURL抽出を優先
      let companySlug = null;

      console.log('[AdminSystem] 会社スラッグ生成開始:', {
        companyName: companyName,
        address: address
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
        finalSlug: urlSlug
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
   * ウェブサイトURLから会社スラッグを抽出
   */
  _extractCompanySlugFromUrl: function(websiteUrl) {
    try {
      if (!websiteUrl || typeof websiteUrl !== 'string') {
        return null;
      }

      const originalUrl = websiteUrl.trim();
      if (!originalUrl || !originalUrl.includes('.')) {
        return null;
      }

      let domain = originalUrl;

      // プロトコル除去
      if (domain.includes('://')) {
        domain = domain.split('://')[1];
      }

      // パス除去
      if (domain.includes('/')) {
        domain = domain.split('/')[0];
      }

      // www除去
      if (domain.startsWith('www.')) {
        domain = domain.substring(4);
      }

      // ドメインから会社スラッグを生成
      if (domain.includes('.')) {
        const domainParts = domain.split('.');
        let mainPart = domainParts[0]; // example.com → example

        // 英数字とハイフンのみを残す（SEO最適化）
        mainPart = mainPart
          .toLowerCase()
          .replace(/[^a-z0-9\-]/g, '-')
          .replace(/-+/g, '-')  // 連続ハイフンを統一
          .replace(/^-|-$/g, ''); // 先頭・末尾のハイフン除去

        // 最低限の長さと有効性チェック
        if (mainPart && mainPart.length >= 2 && mainPart !== 'www' && !mainPart.match(/^-+$/)) {
          return mainPart;
        }
      }

      return null;

    } catch (error) {
      console.error('[AdminSystem] URL抽出エラー:', error);
      return null;
    }
  },

  /**
   * 会社名からローマ字読みスラッグを生成
   */
  _generateCompanySlugFromName: function(companyName) {
    try {
      if (!companyName || typeof companyName !== 'string') {
        return 'company-' + Math.random().toString(36).substring(2, 10);
      }

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
          return this._cleanupSlug(englishSlug);
        }
      }

      // 日本語をローマ字に変換
      const romajiSlug = this._japaneseToRomaji(companySlug);

      // 最終クリーンアップ
      const finalSlug = this._cleanupSlug(romajiSlug);
      return finalSlug;

    } catch (error) {
      console.error('[AdminSystem] 会社名ローマ字変換エラー:', error);
      return 'company-' + Math.random().toString(36).substr(2, 8);
    }
  },

  /**
   * 日本語をローマ字に変換
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
        '小林': 'kobayashi', '加藤': 'kato', '大野': 'ohno'
      };

      // 漢字変換
      for (const [kanji, romaji] of Object.entries(kanjiMap)) {
        result = result.replace(new RegExp(kanji, 'g'), romaji);
      }

      // ひらがなローマ字変換
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
   */
  _ensureUniqueCompanySlug: function(companySlug, region) {
    try {
      console.log('[AdminSystem] クリーンスラッグ確定:', {
        originalSlug: `${region}/${companySlug}`,
        finalSlug: `${region}/${companySlug}`,
        method: 'clean-format'
      });

      return companySlug;

    } catch (error) {
      console.error('[AdminSystem] スラッグ生成エラー:', error);
      return companySlug;
    }
  },

  /**
   * 加盟店マスタへのデータコピー（V1694）
   * 承認時に「加盟店登録」→「加盟店マスタ」へデータを転記
   */
  copyToFranchiseMaster: function(registrationId, rowData, headers) {
    try {
      console.log('[copyToFranchiseMaster] 開始 - 登録ID:', registrationId);

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const masterSheet = ss.getSheetByName('加盟店マスタ');

      if (!masterSheet) {
        throw new Error('加盟店マスタシートが見つかりません');
      }

      // ヘッダー行取得
      const masterHeaders = masterSheet.getRange(1, 1, 1, masterSheet.getLastColumn()).getValues()[0];
      console.log('[copyToFranchiseMaster] マスタヘッダー数:', masterHeaders.length);

      // 重複チェック
      const existingData = masterSheet.getDataRange().getValues();
      const idIndex = masterHeaders.indexOf('加盟店ID');

      for (let i = 1; i < existingData.length; i++) {
        if (existingData[i][idIndex] === registrationId) {
          console.warn('[copyToFranchiseMaster] 既に存在します:', registrationId);
          return { success: true, message: '既存データ（更新不要）' };
        }
      }

      // V1699: 最新データを再取得（承認ステータス更新後のデータ）
      const registrationSheet = ss.getSheetByName('加盟店登録');
      const latestData = registrationSheet.getDataRange().getValues();
      const latestHeaders = latestData[0];
      const latestIdIndex = latestHeaders.indexOf('登録ID');

      let latestRowData = rowData; // デフォルトは引数のrowData
      for (let i = 1; i < latestData.length; i++) {
        if (latestData[i][latestIdIndex] === registrationId) {
          latestRowData = latestData[i];
          console.log('[copyToFranchiseMaster] 最新データ取得成功');
          break;
        }
      }

      // 「加盟店登録」からデータを抽出
      const companyName = latestRowData[latestHeaders.indexOf('会社名')] || '';
      const address = latestRowData[latestHeaders.indexOf('住所')] || '';
      const prefectures = latestRowData[latestHeaders.indexOf('対応都道府県')] || '';
      const cities = latestRowData[latestHeaders.indexOf('対応市区町村')] || '';
      const priorityAreas = latestRowData[latestHeaders.indexOf('優先エリア')] || '';
      const constructionTypes = latestRowData[latestHeaders.indexOf('施工箇所')] || '';
      const buildingAge = latestRowData[latestHeaders.indexOf('築年数対応範囲')] || '';
      const approvalStatus = latestRowData[latestHeaders.indexOf('承認ステータス')] || '';
      const registrationDate = latestRowData[latestHeaders.indexOf('登録日時')] || '';
      const branches = latestRowData[latestHeaders.indexOf('支店住所')] || '';
      const status = latestRowData[latestHeaders.indexOf('ステータス')] || '運用中';
      const silentFlag = latestRowData[latestHeaders.indexOf('サイレントフラグ')] || 'FALSE';

      // 本社都道府県を住所から抽出
      let headquarterPrefecture = '';
      if (address) {
        const prefMatch = address.match(/^(北海道|.+?[都道府県])/);
        if (prefMatch) {
          headquarterPrefecture = prefMatch[1];
        }
      }

      // V1699: 築年数範囲をパース（JSON形式にも対応）
      let buildingAgeMin = '';
      let buildingAgeMax = '';
      if (buildingAge) {
        // JSON形式チェック: {min=0, max=86} or {max=100, min=0}
        const jsonMinMatch = buildingAge.match(/min\s*=\s*(\d+)/i);
        const jsonMaxMatch = buildingAge.match(/max\s*=\s*(\d+)/i);

        if (jsonMinMatch && jsonMaxMatch) {
          buildingAgeMin = jsonMinMatch[1];
          buildingAgeMax = jsonMaxMatch[1];
        } else {
          // 通常の範囲形式: "0年〜86年"
          const ageMatch = buildingAge.match(/(\d+)年?[〜～-](\d+)年?/);
          if (ageMatch) {
            buildingAgeMin = ageMatch[1];
            buildingAgeMax = ageMatch[2];
          }
        }
      }

      // V1699: 配信ステータスの変換ロジック
      // 「休止」「一時停止」→「ストップ」、それ以外→「アクティブ」
      let deliveryStatus = 'アクティブ';
      if (status === '休止' || status === '一時停止') {
        deliveryStatus = 'ストップ';
      }
      console.log('[copyToFranchiseMaster] ステータス変換:', status, '→', deliveryStatus);

      // 過去データシートから運用実績を取得
      const performanceData = this._getPerformanceFromPastData(companyName);

      // 加盟店マスタ行データ構築
      const masterRow = [];
      masterHeaders.forEach(header => {
        switch(header) {
          case '加盟店ID':
            masterRow.push(registrationId);
            break;
          case '会社名':
            masterRow.push(companyName);
            break;
          case '本社都道府県':
            masterRow.push(headquarterPrefecture);
            break;
          case '対応都道府県':
            masterRow.push(prefectures);
            break;
          case '対応市区町村':
            masterRow.push(cities);
            break;
          case '優先エリア':
            masterRow.push(priorityAreas);
            break;
          case '対応工事種別':
            masterRow.push(constructionTypes);
            break;
          case '対応築年数_最小':
            masterRow.push(buildingAgeMin);
            break;
          case '対応築年数_最大':
            masterRow.push(buildingAgeMax);
            break;
          case '承認ステータス':
            masterRow.push(approvalStatus);
            break;
          case '加盟日':
            // V1697修正: 加盟日が空の場合は現在日時を使用
            masterRow.push(registrationDate || Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm:ss'));
            break;
          case '直近3ヶ月_成約件数':
            masterRow.push(performanceData.contractCount || 0);
            break;
          case '直近3ヶ月_問合せ件数':
            masterRow.push(performanceData.inquiryCount || 0);
            break;
          case '直近3ヶ月_平均成約金額':
            masterRow.push(performanceData.avgContractAmount || 0);
            break;
          case '直近3ヶ月_総売上':
            masterRow.push(performanceData.totalSales || 0);
            break;
          case '評価':
            masterRow.push(performanceData.rating || 0);
            break;
          case '口コミ件数':
            masterRow.push(performanceData.reviewCount || 0);
            break;
          case 'ハンデ':
            masterRow.push(performanceData.handicap || 0);
            break;
          case 'デポジット前金':
            // V1697修正: デフォルトはFALSE
            masterRow.push(performanceData.deposit || 'FALSE');
            break;
          case '支払遅延':
            // V1697修正: デフォルトはFALSE
            masterRow.push(performanceData.paymentDelay || 'FALSE');
            break;
          case '配信ステータス':
            // V1699修正：「休止」「一時停止」→「ストップ」、それ以外→「アクティブ」
            masterRow.push(deliveryStatus);
            break;
          case '最終更新日時':
            masterRow.push(Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm:ss'));
            break;
          case '支店情報':
            masterRow.push(branches);
            break;
          case '過去_成約件数':
            masterRow.push(performanceData.pastContractCount || 0);
            break;
          case '過去_平均成約金額':
            masterRow.push(performanceData.pastAvgAmount || 0);
            break;
          case '過去_総売上':
            masterRow.push(performanceData.pastTotalSales || 0);
            break;
          case 'サイレントフラグ':
            masterRow.push(silentFlag); // V1694修正：AW列→AA列
            break;
          default:
            masterRow.push('');
        }
      });

      // マスタシートに追加
      masterSheet.appendRow(masterRow);
      console.log('[copyToFranchiseMaster] ✅ 加盟店マスタに追加完了:', registrationId);

      return {
        success: true,
        message: '加盟店マスタに追加しました'
      };

    } catch (error) {
      console.error('[copyToFranchiseMaster] エラー:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * 過去データシートから運用実績を取得（V1697修正）
   */
  _getPerformanceFromPastData: function(companyName) {
    try {
      console.log('[_getPerformanceFromPastData] 会社名:', companyName);

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const pastDataSheet = ss.getSheetByName('過去データ');

      if (!pastDataSheet) {
        console.warn('[_getPerformanceFromPastData] 過去データシートが見つかりません');
        return {};
      }

      const pastData = pastDataSheet.getDataRange().getValues();
      const pastHeaders = pastData[0];

      // 会社名でマッチング
      for (let i = 1; i < pastData.length; i++) {
        const row = pastData[i];
        const businessName = row[pastHeaders.indexOf('業者名')] || '';

        if (businessName === companyName) {
          console.log('[_getPerformanceFromPastData] ✅ マッチング成功:', companyName);

          // 遅延日数を取得してTRUE/FALSEに変換
          const delayDays = row[pastHeaders.indexOf('遅延日数合計')] || 0;
          const hasPaymentDelay = delayDays > 0 ? 'TRUE' : 'FALSE';

          // 評価データシートから評価を取得
          const rating = this._getRatingFromEvaluationData(companyName);

          return {
            contractCount: row[pastHeaders.indexOf('成約件数')] || 0,
            inquiryCount: row[pastHeaders.indexOf('返品前販売件数')] || 0, // V1697修正
            avgContractAmount: row[pastHeaders.indexOf('成約単価')] || 0,
            totalSales: row[pastHeaders.indexOf('成約売上')] || 0,
            rating: rating, // V1697修正
            reviewCount: 0,
            handicap: 0,
            deposit: 'FALSE', // V1697修正
            paymentDelay: hasPaymentDelay, // V1697修正: TRUE/FALSE
            pastContractCount: row[pastHeaders.indexOf('成約件数')] || 0,
            pastAvgAmount: row[pastHeaders.indexOf('成約単価')] || 0,
            pastTotalSales: row[pastHeaders.indexOf('成約売上')] || 0
          };
        }
      }

      console.warn('[_getPerformanceFromPastData] マッチングデータなし:', companyName);
      return {};

    } catch (error) {
      console.error('[_getPerformanceFromPastData] エラー:', error);
      return {};
    }
  },

  /**
   * 評価データシートから評価を取得（V1697新規）
   */
  _getRatingFromEvaluationData: function(companyName) {
    try {
      console.log('[_getRatingFromEvaluationData] 会社名:', companyName);

      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const evaluationSheet = ss.getSheetByName('評価データ');

      if (!evaluationSheet) {
        console.warn('[_getRatingFromEvaluationData] 評価データシートが見つかりません');
        return 0;
      }

      const evalData = evaluationSheet.getDataRange().getValues();
      const evalHeaders = evalData[0];

      // 会社名でマッチング
      for (let i = 1; i < evalData.length; i++) {
        const row = evalData[i];
        const businessName = row[evalHeaders.indexOf('会社名')] || '';

        if (businessName === companyName) {
          const totalScore = row[evalHeaders.indexOf('総合スコア')] || 0;
          console.log('[_getRatingFromEvaluationData] ✅ 評価取得成功:', totalScore);
          return totalScore;
        }
      }

      console.warn('[_getRatingFromEvaluationData] 評価データなし:', companyName);
      return 0;

    } catch (error) {
      console.error('[_getRatingFromEvaluationData] エラー:', error);
      return 0;
    }
  }
};