/**
 * ====================================
 * 通知テンプレート生成システム
 * ====================================
 *
 * 【機能】
 * - 通知タイプごとのテンプレート生成
 * - メール、LINE、ブラウザ通知の統一インターフェース
 * - AI生成理由の組み込み（却下通知用）
 *
 * 【通知タイプ】
 * - cancelApproval: キャンセル申請承認
 * - cancelRejection: キャンセル申請却下
 * - extensionApproval: 期限延長申請承認
 * - extensionRejection: 期限延長申請却下
 * - appointmentReminder: アポイントメントリマインダー
 * - callReminder: 電話リマインダー
 *
 * 【使用例】
 * const templates = NotificationTemplates.generate('cancelApproval', {
 *   customerName: '田中太郎',
 *   applicationId: 'APP001'
 * });
 * // => { email: {...}, line: {...}, browser: {...} }
 */

const NotificationTemplates = {

  /**
   * メイン生成関数：通知タイプに応じたテンプレートを生成
   * @param {String} notificationType - 通知タイプ
   * @param {Object} data - 通知データ
   * @return {Object} { email, line, browser }
   */
  generate(notificationType, data) {
    try {
      console.log('[NotificationTemplates] テンプレート生成開始:', notificationType);

      let templates = null;

      switch (notificationType) {
        case 'cancelApproval':
          templates = this.generateCancelApproval(data);
          break;

        case 'cancelRejection':
          templates = this.generateCancelRejection(data);
          break;

        case 'extensionApproval':
          templates = this.generateExtensionApproval(data);
          break;

        case 'extensionRejection':
          templates = this.generateExtensionRejection(data);
          break;

        case 'appointmentReminder':
          templates = this.generateAppointmentReminder(data);
          break;

        case 'callReminder':
          templates = this.generateCallReminder(data);
          break;

        default:
          console.error('[NotificationTemplates] 未知の通知タイプ:', notificationType);
          return null;
      }

      console.log('[NotificationTemplates] テンプレート生成完了');
      return templates;

    } catch (error) {
      console.error('[NotificationTemplates] テンプレート生成エラー:', error);
      return null;
    }
  },

  /**
   * キャンセル申請承認通知
   * @param {Object} data - { customerName, applicationId, cvId, approvedBy, approvedAt }
   * @return {Object} テンプレート
   */
  generateCancelApproval(data) {
    const subject = '【承認】キャンセル申請が承認されました';
    const bodyText = `
キャンセル申請が承認されました。

【申請情報】
・顧客名: ${data.customerName}
・申請ID: ${data.applicationId}
・CV ID: ${data.cvId}

【承認情報】
・承認者: ${data.approvedBy || '管理者'}
・承認日時: ${data.approvedAt ? this._formatDate(data.approvedAt) : this._formatDate(new Date())}

この顧客は正式にキャンセル扱いとなります。
引き続き他の案件にご注力ください。

---
外壁塗装くらべるAI - 加盟店管理システム
    `.trim();

    const bodyHtml = `
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✅ キャンセル申請が承認されました</h2>
    </div>
    <div class="content">
      <p>キャンセル申請が承認されました。</p>

      <div class="info-box">
        <h3>申請情報</h3>
        <p><strong>顧客名:</strong> ${data.customerName}</p>
        <p><strong>申請ID:</strong> ${data.applicationId}</p>
        <p><strong>CV ID:</strong> ${data.cvId}</p>
      </div>

      <div class="info-box">
        <h3>承認情報</h3>
        <p><strong>承認者:</strong> ${data.approvedBy || '管理者'}</p>
        <p><strong>承認日時:</strong> ${data.approvedAt ? this._formatDate(data.approvedAt) : this._formatDate(new Date())}</p>
      </div>

      <p>この顧客は正式にキャンセル扱いとなります。<br>引き続き他の案件にご注力ください。</p>
    </div>
    <div class="footer">
      外壁塗装くらべるAI - 加盟店管理システム
    </div>
  </div>
</body>
</html>
    `.trim();

    const lineMessage = `✅ キャンセル申請が承認されました

【顧客】${data.customerName}
【申請ID】${data.applicationId}
【承認者】${data.approvedBy || '管理者'}
【承認日時】${data.approvedAt ? this._formatDate(data.approvedAt) : this._formatDate(new Date())}

この顧客は正式にキャンセル扱いとなります。`;

    return {
      email: {
        subject: subject,
        body: bodyText,
        html: bodyHtml
      },
      line: {
        message: lineMessage
      },
      browser: {
        title: 'キャンセル申請承認',
        body: `${data.customerName}様のキャンセル申請が承認されました`,
        icon: '✅'
      }
    };
  },

  /**
   * キャンセル申請却下通知（AI生成理由付き）
   * @param {Object} data - { customerName, applicationId, cvId, rejectedBy, rejectedAt, aiReason }
   * @return {Object} テンプレート
   */
  generateCancelRejection(data) {
    const subject = '【却下】キャンセル申請が却下されました';
    const bodyText = `
キャンセル申請が却下されました。

【申請情報】
・顧客名: ${data.customerName}
・申請ID: ${data.applicationId}
・CV ID: ${data.cvId}

【却下情報】
・却下者: ${data.rejectedBy || '管理者'}
・却下日時: ${data.rejectedAt ? this._formatDate(data.rejectedAt) : this._formatDate(new Date())}

【却下理由】
${data.aiReason || '追客を継続してください。お客様との接点を増やし、信頼関係を構築することで成約の可能性が高まります。'}

引き続き追客を継続し、成約に向けて努力をお願いいたします。

---
外壁塗装くらべるAI - 加盟店管理システム
    `.trim();

    const bodyHtml = `
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #f44336; }
    .reason-box { background-color: #fff3cd; padding: 15px; margin: 10px 0; border-left: 4px solid #ffc107; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>❌ キャンセル申請が却下されました</h2>
    </div>
    <div class="content">
      <p>キャンセル申請が却下されました。</p>

      <div class="info-box">
        <h3>申請情報</h3>
        <p><strong>顧客名:</strong> ${data.customerName}</p>
        <p><strong>申請ID:</strong> ${data.applicationId}</p>
        <p><strong>CV ID:</strong> ${data.cvId}</p>
      </div>

      <div class="info-box">
        <h3>却下情報</h3>
        <p><strong>却下者:</strong> ${data.rejectedBy || '管理者'}</p>
        <p><strong>却下日時:</strong> ${data.rejectedAt ? this._formatDate(data.rejectedAt) : this._formatDate(new Date())}</p>
      </div>

      <div class="reason-box">
        <h3>却下理由</h3>
        <p>${data.aiReason || '追客を継続してください。お客様との接点を増やし、信頼関係を構築することで成約の可能性が高まります。'}</p>
      </div>

      <p>引き続き追客を継続し、成約に向けて努力をお願いいたします。</p>
    </div>
    <div class="footer">
      外壁塗装くらべるAI - 加盟店管理システム
    </div>
  </div>
</body>
</html>
    `.trim();

    const lineMessage = `❌ キャンセル申請が却下されました

【顧客】${data.customerName}
【申請ID】${data.applicationId}
【却下者】${data.rejectedBy || '管理者'}

【却下理由】
${data.aiReason || '追客を継続してください。お客様との接点を増やし、信頼関係を構築することで成約の可能性が高まります。'}

引き続き追客を継続してください。`;

    return {
      email: {
        subject: subject,
        body: bodyText,
        html: bodyHtml
      },
      line: {
        message: lineMessage
      },
      browser: {
        title: 'キャンセル申請却下',
        body: `${data.customerName}様のキャンセル申請が却下されました`,
        icon: '❌'
      }
    };
  },

  /**
   * 期限延長申請承認通知
   * @param {Object} data - { customerName, extensionId, cvId, approvedBy, approvedAt, newDeadline }
   * @return {Object} テンプレート
   */
  generateExtensionApproval(data) {
    const subject = '【承認】期限延長申請が承認されました';
    const bodyText = `
期限延長申請が承認されました。

【申請情報】
・顧客名: ${data.customerName}
・申請ID: ${data.extensionId}
・CV ID: ${data.cvId}

【承認情報】
・承認者: ${data.approvedBy || '管理者'}
・承認日時: ${data.approvedAt ? this._formatDate(data.approvedAt) : this._formatDate(new Date())}
・新しい期限: ${data.newDeadline ? this._formatDate(data.newDeadline) : '未設定'}

新しい期限までに成約できるよう、引き続き追客を継続してください。

---
外壁塗装くらべるAI - 加盟店管理システム
    `.trim();

    const bodyHtml = `
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #2196F3; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>✅ 期限延長申請が承認されました</h2>
    </div>
    <div class="content">
      <p>期限延長申請が承認されました。</p>

      <div class="info-box">
        <h3>申請情報</h3>
        <p><strong>顧客名:</strong> ${data.customerName}</p>
        <p><strong>申請ID:</strong> ${data.extensionId}</p>
        <p><strong>CV ID:</strong> ${data.cvId}</p>
      </div>

      <div class="info-box">
        <h3>承認情報</h3>
        <p><strong>承認者:</strong> ${data.approvedBy || '管理者'}</p>
        <p><strong>承認日時:</strong> ${data.approvedAt ? this._formatDate(data.approvedAt) : this._formatDate(new Date())}</p>
        <p><strong>新しい期限:</strong> ${data.newDeadline ? this._formatDate(data.newDeadline) : '未設定'}</p>
      </div>

      <p>新しい期限までに成約できるよう、引き続き追客を継続してください。</p>
    </div>
    <div class="footer">
      外壁塗装くらべるAI - 加盟店管理システム
    </div>
  </div>
</body>
</html>
    `.trim();

    const lineMessage = `✅ 期限延長申請が承認されました

【顧客】${data.customerName}
【申請ID】${data.extensionId}
【承認者】${data.approvedBy || '管理者'}
【新しい期限】${data.newDeadline ? this._formatDate(data.newDeadline) : '未設定'}

新しい期限までに成約できるよう、引き続き追客を継続してください。`;

    return {
      email: {
        subject: subject,
        body: bodyText,
        html: bodyHtml
      },
      line: {
        message: lineMessage
      },
      browser: {
        title: '期限延長申請承認',
        body: `${data.customerName}様の期限延長申請が承認されました`,
        icon: '✅'
      }
    };
  },

  /**
   * 期限延長申請却下通知（AI生成理由付き）
   * @param {Object} data - { customerName, extensionId, cvId, rejectedBy, rejectedAt, aiReason }
   * @return {Object} テンプレート
   */
  generateExtensionRejection(data) {
    const subject = '【却下】期限延長申請が却下されました';
    const bodyText = `
期限延長申請が却下されました。

【申請情報】
・顧客名: ${data.customerName}
・申請ID: ${data.extensionId}
・CV ID: ${data.cvId}

【却下情報】
・却下者: ${data.rejectedBy || '管理者'}
・却下日時: ${data.rejectedAt ? this._formatDate(data.rejectedAt) : this._formatDate(new Date())}

【却下理由】
${data.aiReason || '現在の進捗状況では延長は認められません。より積極的な追客活動をお願いいたします。'}

---
外壁塗装くらべるAI - 加盟店管理システム
    `.trim();

    const bodyHtml = `
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
    .info-box { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #f44336; }
    .reason-box { background-color: #fff3cd; padding: 15px; margin: 10px 0; border-left: 4px solid #ffc107; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>❌ 期限延長申請が却下されました</h2>
    </div>
    <div class="content">
      <p>期限延長申請が却下されました。</p>

      <div class="info-box">
        <h3>申請情報</h3>
        <p><strong>顧客名:</strong> ${data.customerName}</p>
        <p><strong>申請ID:</strong> ${data.extensionId}</p>
        <p><strong>CV ID:</strong> ${data.cvId}</p>
      </div>

      <div class="info-box">
        <h3>却下情報</h3>
        <p><strong>却下者:</strong> ${data.rejectedBy || '管理者'}</p>
        <p><strong>却下日時:</strong> ${data.rejectedAt ? this._formatDate(data.rejectedAt) : this._formatDate(new Date())}</p>
      </div>

      <div class="reason-box">
        <h3>却下理由</h3>
        <p>${data.aiReason || '現在の進捗状況では延長は認められません。より積極的な追客活動をお願いいたします。'}</p>
      </div>
    </div>
    <div class="footer">
      外壁塗装くらべるAI - 加盟店管理システム
    </div>
  </div>
</body>
</html>
    `.trim();

    const lineMessage = `❌ 期限延長申請が却下されました

【顧客】${data.customerName}
【申請ID】${data.extensionId}
【却下者】${data.rejectedBy || '管理者'}

【却下理由】
${data.aiReason || '現在の進捗状況では延長は認められません。より積極的な追客活動をお願いいたします。'}`;

    return {
      email: {
        subject: subject,
        body: bodyText,
        html: bodyHtml
      },
      line: {
        message: lineMessage
      },
      browser: {
        title: '期限延長申請却下',
        body: `${data.customerName}様の期限延長申請が却下されました`,
        icon: '❌'
      }
    };
  },

  /**
   * アポイントメントリマインダー
   * @param {Object} data - { customerName, appointmentDate, appointmentTime }
   * @return {Object} テンプレート
   */
  generateAppointmentReminder(data) {
    const subject = '【リマインダー】本日のアポイントメント';
    const bodyText = `
本日のアポイントメントのリマインダーです。

【アポイント情報】
・顧客名: ${data.customerName}
・日時: ${data.appointmentDate ? this._formatDate(data.appointmentDate) : '未設定'} ${data.appointmentTime || ''}

準備を整えて、お客様との商談に臨んでください。

---
外壁塗装くらべるAI - 加盟店管理システム
    `.trim();

    const lineMessage = `🔔 本日のアポイントメント

【顧客】${data.customerName}
【日時】${data.appointmentDate ? this._formatDate(data.appointmentDate) : '未設定'} ${data.appointmentTime || ''}

準備を整えて、商談に臨んでください！`;

    return {
      email: {
        subject: subject,
        body: bodyText,
        html: null
      },
      line: {
        message: lineMessage
      },
      browser: {
        title: 'アポイントメントリマインダー',
        body: `${data.customerName}様との商談が本日予定されています`,
        icon: '🔔'
      }
    };
  },

  /**
   * 電話リマインダー
   * @param {Object} data - { customerName, cvId }
   * @return {Object} テンプレート
   */
  generateCallReminder(data) {
    const subject = '【リマインダー】お客様への電話連絡';
    const bodyText = `
お客様への電話連絡のリマインダーです。

【顧客情報】
・顧客名: ${data.customerName}
・CV ID: ${data.cvId}

本日中にお客様へ電話連絡をお願いいたします。

---
外壁塗装くらべるAI - 加盟店管理システム
    `.trim();

    const lineMessage = `📞 電話連絡リマインダー

【顧客】${data.customerName}
【CV ID】${data.cvId}

本日中に電話連絡をお願いします！`;

    return {
      email: {
        subject: subject,
        body: bodyText,
        html: null
      },
      line: {
        message: lineMessage
      },
      browser: {
        title: '電話リマインダー',
        body: `${data.customerName}様への電話連絡が必要です`,
        icon: '📞'
      }
    };
  },

  /**
   * 日時フォーマット
   * @param {Date} date - 日時
   * @return {String} フォーマット済み文字列
   * @private
   */
  _formatDate(date) {
    if (!date) return '未設定';

    try {
      if (typeof date === 'string') {
        date = new Date(date);
      }
      return Utilities.formatDate(date, 'JST', 'yyyy年MM月dd日 HH:mm');
    } catch (error) {
      console.error('[NotificationTemplates] 日時フォーマットエラー:', error);
      return '日時不明';
    }
  }

};
