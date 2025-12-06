/**
 * ====================================
 * メンバー招待・認証システム
 * ====================================
 *
 * 【機能】
 * - 招待リンク生成（generateInviteLink）
 * - 招待検証（verifyMemberInvite）
 * - メンバー登録（registerMember）
 * - メンバー一覧取得（getMemberList）
 * - メンバーログイン検証（verifyMemberLogin）
 *
 * 【認証情報シート構造】（既存列維持 + F列以降追加）
 * A: 加盟店ID/メンバーID
 * B: メールアドレス
 * C: パスワードハッシュ
 * D: 最終ログイン
 * E: パスワード変更日
 * ---ここから追加---
 * F: 親加盟店ID（オーナーは空、メンバーは親のID）
 * G: 氏名
 * H: 役職（leader/standard/office）
 * I: 追加権限JSON
 * J: ステータス（pending/active/disabled）
 * K: 招待有効期限
 * L: 招待作成日時
 * M: 登録日時
 * N: 署名
 */

const MerchantMemberInvite = {

  // 列インデックス定義（0始まり）
  COL: {
    ID: 0,              // A: 加盟店ID/メンバーID
    EMAIL: 1,           // B: メールアドレス
    PASSWORD_HASH: 2,   // C: パスワードハッシュ
    LAST_LOGIN: 3,      // D: 最終ログイン
    PASSWORD_DATE: 4,   // E: パスワード変更日
    // 追加列
    PARENT_ID: 5,       // F: 親加盟店ID
    NAME: 6,            // G: 氏名
    ROLE: 7,            // H: 役職
    PERMISSIONS: 8,     // I: 追加権限JSON
    STATUS: 9,          // J: ステータス
    INVITE_EXPIRY: 10,  // K: 招待有効期限
    INVITE_CREATED: 11, // L: 招待作成日時
    REGISTERED_AT: 12,  // M: 登録日時
    SIGNATURE: 13       // N: 署名
  },

  /**
   * 認証情報シート取得
   */
  _getCredentialsSheet: function() {
    const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_IDが設定されていません');
    }
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('認証情報');

    if (!sheet) {
      // シートがなければ作成（通常は既存）
      sheet = ss.insertSheet('認証情報');
      sheet.getRange(1, 1, 1, 14).setValues([[
        '加盟店ID', 'メールアドレス', 'パスワードハッシュ', '最終ログイン', 'パスワード変更日',
        '親加盟店ID', '氏名', '役職', '追加権限JSON', 'ステータス',
        '招待有効期限', '招待作成日時', '登録日時', '署名'
      ]]);
      sheet.hideSheet();
    }

    return sheet;
  },

  /**
   * 加盟店名を取得
   */
  _getMerchantName: function(merchantId) {
    try {
      const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sheet = ss.getSheetByName('加盟店登録');
      if (!sheet) return merchantId;

      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][1] === merchantId) { // B列が登録ID
          return data[i][2] || merchantId; // C列が会社名
        }
      }
      return merchantId;
    } catch (e) {
      console.error('[_getMerchantName] Error:', e);
      return merchantId;
    }
  },

  /**
   * 署名生成
   */
  _generateSignature: function(data) {
    const SECRET_KEY = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
    const hash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      data + SECRET_KEY
    ).map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
    return hash.substring(0, 32); // 32文字に短縮
  },

  /**
   * 署名検証
   */
  _verifySignature: function(data, signature) {
    const expected = this._generateSignature(data);
    return expected === signature;
  },

  /**
   * Base64エンコード（URL safe）
   */
  _base64Encode: function(str) {
    const bytes = Utilities.newBlob(str).getBytes();
    return Utilities.base64EncodeWebSafe(bytes);
  },

  /**
   * Base64デコード（URL safe）
   */
  _base64Decode: function(encoded) {
    const bytes = Utilities.base64DecodeWebSafe(encoded);
    return Utilities.newBlob(bytes).getDataAsString();
  },

  // ====================================
  // 招待リンク生成
  // ====================================
  generateInviteLink: function(params) {
    try {
      console.log('[generateInviteLink] Start:', JSON.stringify(params));

      const merchantId = params.merchantId;
      const role = params.role || 'standard';
      const expiryHours = parseInt(params.expiryHours) || 24;
      const additionalPermissions = params.additionalPermissions || {};

      if (!merchantId) {
        return { success: false, error: '加盟店IDが必要です' };
      }

      // 現在時刻
      const now = new Date();

      // メンバーID生成（ST + 日時ベース12桁 = Staff）
      // 形式: ST + YYMMDDHHMMSS（例: ST251205012345）
      const dateStr = now.getFullYear().toString().slice(-2) +
                      String(now.getMonth() + 1).padStart(2, '0') +
                      String(now.getDate()).padStart(2, '0') +
                      String(now.getHours()).padStart(2, '0') +
                      String(now.getMinutes()).padStart(2, '0') +
                      String(now.getSeconds()).padStart(2, '0');
      const memberId = 'ST' + dateStr;

      // 有効期限計算
      const expiry = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

      // 招待データ作成
      const inviteData = {
        memberId: memberId,
        merchantId: merchantId,
        role: role,
        permissions: additionalPermissions,
        expiry: expiry.getTime(),
        created: now.getTime()
      };

      // JSON → Base64
      const dataStr = JSON.stringify(inviteData);
      const encodedData = this._base64Encode(dataStr);

      // 署名生成
      const signature = this._generateSignature(encodedData);

      // 認証情報シートに招待を保存（pending状態）
      const sheet = this._getCredentialsSheet();
      const newRow = new Array(14).fill('');
      newRow[this.COL.ID] = memberId;
      newRow[this.COL.PARENT_ID] = merchantId;
      newRow[this.COL.ROLE] = role;
      newRow[this.COL.PERMISSIONS] = JSON.stringify(additionalPermissions);
      newRow[this.COL.STATUS] = 'pending';
      newRow[this.COL.INVITE_EXPIRY] = expiry;
      newRow[this.COL.INVITE_CREATED] = now;
      newRow[this.COL.SIGNATURE] = signature;

      sheet.appendRow(newRow);

      // 招待リンク生成
      const longInviteLink = 'https://gaihekikuraberu.com/franchise-dashboard/merchant-portal/member-register.html?data='
        + encodeURIComponent(encodedData)
        + '&sig=' + encodeURIComponent(signature);

      // URL短縮（SMS文字数対策）
      let inviteLink = longInviteLink;
      try {
        const shortResult = UrlShortener.shortenUrl({ url: longInviteLink });
        if (shortResult.success && shortResult.shortUrl) {
          inviteLink = shortResult.shortUrl;
          console.log('[generateInviteLink] URL短縮成功:', inviteLink);
        }
      } catch (shortError) {
        console.warn('[generateInviteLink] URL短縮失敗、元のURLを使用:', shortError);
      }

      console.log('[generateInviteLink] Success:', inviteLink);

      return {
        success: true,
        inviteLink: inviteLink,
        longInviteLink: longInviteLink, // フォールバック用
        memberId: memberId,
        expiry: expiry.toISOString()
      };

    } catch (error) {
      console.error('[generateInviteLink] Error:', error);
      return { success: false, error: error.toString() };
    }
  },

  // ====================================
  // 招待検証（JSONP対応）
  // ====================================
  verifyMemberInvite: function(params) {
    try {
      console.log('[verifyMemberInvite] Start');

      const encodedData = params.data;
      const signature = params.sig;

      if (!encodedData || !signature) {
        return { success: false, error: '無効なリクエストです' };
      }

      // 署名検証
      if (!this._verifySignature(encodedData, signature)) {
        return { success: false, error: '署名が無効です' };
      }

      // データデコード
      let inviteData;
      try {
        const dataStr = this._base64Decode(encodedData);
        inviteData = JSON.parse(dataStr);
      } catch (e) {
        return { success: false, error: 'データが不正です' };
      }

      // 有効期限チェック
      const now = Date.now();
      if (inviteData.expiry < now) {
        return { success: false, error: '招待リンクの有効期限が切れています' };
      }

      // シートで招待状態確認
      const sheet = this._getCredentialsSheet();
      const data = sheet.getDataRange().getValues();
      let inviteRow = null;

      for (let i = 1; i < data.length; i++) {
        if (data[i][this.COL.ID] === inviteData.memberId) {
          inviteRow = data[i];
          break;
        }
      }

      if (!inviteRow) {
        return { success: false, error: '招待が見つかりません' };
      }

      // V2063: 期限内なら何度でもアクセス可能に変更（管理者側と同じ仕様）
      // 登録済み（active）でも期限内ならパスワード再設定可能
      if (inviteRow[this.COL.STATUS] === 'disabled') {
        return { success: false, error: 'この招待は無効化されています' };
      }

      // 加盟店名取得
      const merchantName = this._getMerchantName(inviteData.merchantId);

      return {
        success: true,
        invite: {
          memberId: inviteData.memberId,
          merchantId: inviteData.merchantId,
          merchantName: merchantName,
          role: inviteData.role,
          additionalPermissions: inviteData.permissions || {}
        }
      };

    } catch (error) {
      console.error('[verifyMemberInvite] Error:', error);
      return { success: false, error: error.toString() };
    }
  },

  // ====================================
  // メンバー登録（JSONP対応）
  // ====================================
  registerMember: function(params) {
    try {
      console.log('[registerMember] Start - params:', JSON.stringify({
        hasData: !!params.data,
        hasSig: !!params.sig,
        hasName: !!params.name,
        hasPassword: !!params.password,
        passwordLength: params.password ? params.password.length : 0
      }));

      const encodedData = params.data;
      const signature = params.sig;
      const memberName = params.name;
      const password = params.password;

      if (!encodedData || !signature || !memberName || !password) {
        console.error('[registerMember] Missing params:', {
          data: !!encodedData,
          sig: !!signature,
          name: !!memberName,
          password: !!password
        });
        return { success: false, error: '必要な情報が不足しています' };
      }

      // 署名検証
      if (!this._verifySignature(encodedData, signature)) {
        return { success: false, error: '署名が無効です' };
      }

      // データデコード
      let inviteData;
      try {
        const dataStr = this._base64Decode(encodedData);
        inviteData = JSON.parse(dataStr);
      } catch (e) {
        return { success: false, error: 'データが不正です' };
      }

      // 有効期限チェック
      const now = new Date();
      if (inviteData.expiry < now.getTime()) {
        return { success: false, error: '招待リンクの有効期限が切れています' };
      }

      // シートで招待を検索・更新
      const sheet = this._getCredentialsSheet();
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;

      for (let i = 1; i < data.length; i++) {
        if (data[i][this.COL.ID] === inviteData.memberId) {
          if (data[i][this.COL.STATUS] !== 'pending') {
            return { success: false, error: 'この招待は既に使用されています' };
          }
          rowIndex = i + 1; // 1始まりの行番号
          break;
        }
      }

      if (rowIndex === -1) {
        return { success: false, error: '招待が見つかりません' };
      }

      // パスワードハッシュ生成
      const SECRET_KEY = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
      const passwordHash = Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256,
        password + SECRET_KEY + inviteData.memberId
      ).map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');

      // シート更新
      sheet.getRange(rowIndex, this.COL.PASSWORD_HASH + 1).setValue(passwordHash); // C列
      sheet.getRange(rowIndex, this.COL.NAME + 1).setValue(memberName); // G列
      sheet.getRange(rowIndex, this.COL.STATUS + 1).setValue('active'); // J列
      sheet.getRange(rowIndex, this.COL.REGISTERED_AT + 1).setValue(now); // M列

      console.log('[registerMember] Success:', inviteData.memberId);

      return {
        success: true,
        memberId: inviteData.memberId,
        message: 'メンバー登録が完了しました'
      };

    } catch (error) {
      console.error('[registerMember] Error:', error);
      return { success: false, error: error.toString() };
    }
  },

  // ====================================
  // メンバー一覧取得
  // ====================================
  getMemberList: function(params) {
    try {
      const merchantId = params.merchantId;
      if (!merchantId) {
        return { success: false, error: '加盟店IDが必要です' };
      }

      const sheet = this._getCredentialsSheet();
      const data = sheet.getDataRange().getValues();
      const members = [];

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        // 親加盟店IDが一致するメンバーを取得
        if (row[this.COL.PARENT_ID] === merchantId) {
          members.push({
            memberId: row[this.COL.ID],
            name: row[this.COL.NAME] || '',
            role: row[this.COL.ROLE] || 'standard',
            status: row[this.COL.STATUS] || 'pending',
            permissions: row[this.COL.PERMISSIONS] ? JSON.parse(row[this.COL.PERMISSIONS]) : {},
            lastLogin: row[this.COL.LAST_LOGIN] || null,
            registeredAt: row[this.COL.REGISTERED_AT] || null
          });
        }
      }

      return { success: true, members: members };

    } catch (error) {
      console.error('[getMemberList] Error:', error);
      return { success: false, error: error.toString() };
    }
  },

  // ====================================
  // メンバーログイン検証
  // ====================================
  verifyMemberLogin: function(params) {
    try {
      const memberId = params.memberId;
      const password = params.password;

      if (!memberId || !password) {
        return { success: false, error: 'メンバーIDとパスワードが必要です' };
      }

      const sheet = this._getCredentialsSheet();
      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[this.COL.ID] === memberId && row[this.COL.STATUS] === 'active') {
          // パスワードハッシュ検証
          const SECRET_KEY = PropertiesService.getScriptProperties().getProperty('SECRET_KEY');
          const inputHash = Utilities.computeDigest(
            Utilities.DigestAlgorithm.SHA_256,
            password + SECRET_KEY + memberId
          ).map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');

          if (row[this.COL.PASSWORD_HASH] === inputHash) {
            // 最終ログイン更新
            sheet.getRange(i + 1, this.COL.LAST_LOGIN + 1).setValue(new Date());

            return {
              success: true,
              member: {
                memberId: row[this.COL.ID],
                merchantId: row[this.COL.PARENT_ID],
                name: row[this.COL.NAME],
                role: row[this.COL.ROLE],
                permissions: row[this.COL.PERMISSIONS] ? JSON.parse(row[this.COL.PERMISSIONS]) : {}
              }
            };
          }
        }
      }

      return { success: false, error: 'メンバーIDまたはパスワードが正しくありません' };

    } catch (error) {
      console.error('[verifyMemberLogin] Error:', error);
      return { success: false, error: error.toString() };
    }
  },

  // ====================================
  // 招待キャンセル
  // ====================================
  cancelInvite: function(params) {
    try {
      const memberId = params.memberId;
      const merchantId = params.merchantId;

      if (!memberId || !merchantId) {
        return { success: false, error: 'メンバーIDと加盟店IDが必要です' };
      }

      const sheet = this._getCredentialsSheet();
      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[this.COL.ID] === memberId &&
            row[this.COL.PARENT_ID] === merchantId &&
            row[this.COL.STATUS] === 'pending') {
          // ステータスを cancelled に変更
          sheet.getRange(i + 1, this.COL.STATUS + 1).setValue('cancelled');
          return { success: true, message: '招待をキャンセルしました' };
        }
      }

      return { success: false, error: '該当する招待が見つかりません' };

    } catch (error) {
      console.error('[cancelInvite] Error:', error);
      return { success: false, error: error.toString() };
    }
  },

  // ====================================
  // V2066: メンバー削除（ステータスをdisabledに変更）
  // ====================================
  deleteMember: function(params) {
    try {
      const memberId = params.memberId;
      const merchantId = params.merchantId;
      const reassignTo = params.reassignTo; // 引き継ぎ先（オプション）

      if (!memberId || !merchantId) {
        return { success: false, error: 'メンバーIDと加盟店IDが必要です' };
      }

      const sheet = this._getCredentialsSheet();
      const data = sheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row[this.COL.ID] === memberId &&
            row[this.COL.PARENT_ID] === merchantId &&
            row[this.COL.STATUS] === 'active') {
          // ステータスを disabled に変更（論理削除）
          sheet.getRange(i + 1, this.COL.STATUS + 1).setValue('disabled');

          console.log('[deleteMember] Success:', memberId, 'reassignTo:', reassignTo);

          // TODO: 案件引き継ぎ処理（reassignToが指定されている場合）
          // 配信管理シートの担当者列を更新する処理を追加予定

          return {
            success: true,
            message: 'メンバーを削除しました',
            reassignedTo: reassignTo || null
          };
        }
      }

      return { success: false, error: '該当するメンバーが見つかりません' };

    } catch (error) {
      console.error('[deleteMember] Error:', error);
      return { success: false, error: error.toString() };
    }
  }
};
