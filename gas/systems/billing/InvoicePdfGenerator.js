/**
 * ====================================
 * 請求書PDF生成システム V1.0
 * ====================================
 *
 * 【機能】
 * - Googleドキュメントテンプレートから請求書PDF生成
 * - 変数置換（会社名、金額、明細など）
 * - PDF保存（Googleドライブ）
 * - メール送信
 *
 * 【必要なScript Properties】
 * - INVOICE_TEMPLATE_ID: Googleドキュメントの請求書テンプレートID
 * - INVOICE_FOLDER_ID: PDF保存先フォルダID
 */

const InvoicePdfGenerator = {

  /**
   * 請求書テンプレートを作成（初回セットアップ用）
   * @returns {Object} 作成結果
   */
  createTemplate: function() {
    try {
      // テンプレート用のGoogleドキュメントを作成
      const doc = DocumentApp.create('【テンプレート】請求書');
      const body = doc.getBody();

      // スタイル設定
      body.setMarginTop(50);
      body.setMarginBottom(50);
      body.setMarginLeft(50);
      body.setMarginRight(50);

      // ヘッダー部分
      const title = body.appendParagraph('請 求 書');
      title.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
      title.setFontSize(24);
      title.setBold(true);

      body.appendParagraph('');

      // 請求書番号・発行日
      const infoPara = body.appendParagraph('請求書番号: {{INVOICE_ID}}');
      infoPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
      body.appendParagraph('発行日: {{ISSUE_DATE}}').setAlignment(DocumentApp.HorizontalAlignment.RIGHT);

      body.appendParagraph('');
      body.appendParagraph('');

      // 宛先
      const toPara = body.appendParagraph('{{COMPANY_NAME}} 御中');
      toPara.setFontSize(14);
      toPara.setBold(true);

      body.appendParagraph('');

      // 請求金額
      const amountPara = body.appendParagraph('ご請求金額: ¥{{TOTAL_AMOUNT}}（税込）');
      amountPara.setFontSize(16);
      amountPara.setBold(true);

      body.appendParagraph('');
      body.appendParagraph('下記の通りご請求申し上げます。');
      body.appendParagraph('');

      // 支払期限
      body.appendParagraph('お支払期限: {{DUE_DATE}}');
      body.appendParagraph('');

      // 明細テーブル
      body.appendParagraph('【明細】');

      // テーブル作成
      const tableData = [
        ['No.', '項目', '数量', '単価', '金額'],
        ['{{ITEM_ROWS}}', '', '', '', '']
      ];
      const table = body.appendTable(tableData);

      // テーブルスタイル
      table.setBorderWidth(1);
      const headerRow = table.getRow(0);
      for (let i = 0; i < 5; i++) {
        headerRow.getCell(i).setBackgroundColor('#f0f0f0');
      }

      body.appendParagraph('');

      // 小計・消費税・合計
      body.appendParagraph('小計: ¥{{SUBTOTAL}}').setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
      body.appendParagraph('消費税（10%）: ¥{{TAX}}').setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
      const totalPara = body.appendParagraph('合計: ¥{{TOTAL_AMOUNT}}');
      totalPara.setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
      totalPara.setBold(true);

      body.appendParagraph('');
      body.appendParagraph('');

      // 振込先情報
      body.appendParagraph('【お振込先】');
      body.appendParagraph('{{BANK_INFO}}');

      body.appendParagraph('');
      body.appendParagraph('');

      // 発行者情報
      body.appendHorizontalRule();
      body.appendParagraph('');
      body.appendParagraph('株式会社外壁塗装くらべる');
      body.appendParagraph('〒XXX-XXXX 東京都○○区○○ X-X-X');
      body.appendParagraph('TEL: XXX-XXXX-XXXX');
      body.appendParagraph('Email: info@gaihekikuraberu.com');

      doc.saveAndClose();

      // テンプレートIDを保存
      const templateId = doc.getId();
      PropertiesService.getScriptProperties().setProperty('INVOICE_TEMPLATE_ID', templateId);

      // PDF保存用フォルダ作成
      const folder = DriveApp.createFolder('請求書PDF');
      PropertiesService.getScriptProperties().setProperty('INVOICE_FOLDER_ID', folder.getId());

      return {
        success: true,
        templateId: templateId,
        templateUrl: doc.getUrl(),
        folderId: folder.getId(),
        message: 'テンプレートを作成しました。内容を編集してください。'
      };

    } catch (e) {
      console.error('[InvoicePdfGenerator] createTemplate error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 請求書PDFを生成
   * @param {Object} invoiceData - 請求データ
   * @returns {Object} 生成結果（PDFのURL等）
   */
  generatePdf: function(invoiceData) {
    try {
      const templateId = PropertiesService.getScriptProperties().getProperty('INVOICE_TEMPLATE_ID');
      if (!templateId) {
        return { success: false, error: 'テンプレートが設定されていません。createTemplateを実行してください。' };
      }

      const folderId = PropertiesService.getScriptProperties().getProperty('INVOICE_FOLDER_ID');
      if (!folderId) {
        return { success: false, error: 'PDF保存先フォルダが設定されていません。' };
      }

      // テンプレートをコピー
      const templateFile = DriveApp.getFileById(templateId);
      const folder = DriveApp.getFolderById(folderId);
      const fileName = `請求書_${invoiceData.invoiceId}_${invoiceData.companyName}`;
      const copyFile = templateFile.makeCopy(fileName, folder);
      const doc = DocumentApp.openById(copyFile.getId());
      const body = doc.getBody();

      // 変数置換
      body.replaceText('{{INVOICE_ID}}', invoiceData.invoiceId || '');
      body.replaceText('{{ISSUE_DATE}}', this._formatDate(invoiceData.issueDate || new Date()));
      body.replaceText('{{COMPANY_NAME}}', invoiceData.companyName || '');
      body.replaceText('{{DUE_DATE}}', this._formatDate(invoiceData.dueDate));
      body.replaceText('{{SUBTOTAL}}', this._formatNumber(invoiceData.subtotal));
      body.replaceText('{{TAX}}', this._formatNumber(invoiceData.tax));
      body.replaceText('{{TOTAL_AMOUNT}}', this._formatNumber(invoiceData.totalAmount));

      // 振込先情報
      const bankInfo = invoiceData.bankInfo ||
        '○○銀行 ○○支店\n普通 XXXXXXX\n株式会社外壁塗装くらべる';
      body.replaceText('{{BANK_INFO}}', bankInfo);

      // 明細行の処理
      if (invoiceData.items && invoiceData.items.length > 0) {
        this._replaceItemRows(body, invoiceData.items);
      }

      doc.saveAndClose();

      // PDFに変換
      const pdfBlob = DriveApp.getFileById(copyFile.getId()).getAs('application/pdf');
      pdfBlob.setName(fileName + '.pdf');
      const pdfFile = folder.createFile(pdfBlob);

      // 一時ドキュメントを削除（PDFだけ残す）
      copyFile.setTrashed(true);

      return {
        success: true,
        pdfId: pdfFile.getId(),
        pdfUrl: pdfFile.getUrl(),
        pdfDownloadUrl: `https://drive.google.com/uc?export=download&id=${pdfFile.getId()}`,
        fileName: fileName + '.pdf'
      };

    } catch (e) {
      console.error('[InvoicePdfGenerator] generatePdf error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * 明細行を置換
   */
  _replaceItemRows: function(body, items) {
    // テーブルを探す
    const tables = body.getTables();
    if (tables.length === 0) return;

    const table = tables[0];

    // プレースホルダー行を削除
    if (table.getNumRows() > 1) {
      table.removeRow(1);
    }

    // 明細行を追加
    items.forEach((item, index) => {
      const row = table.appendTableRow();
      row.appendTableCell(String(index + 1));
      row.appendTableCell(item.name || '');
      row.appendTableCell(String(item.quantity || 1));
      row.appendTableCell('¥' + this._formatNumber(item.unitPrice || 0));
      row.appendTableCell('¥' + this._formatNumber((item.quantity || 1) * (item.unitPrice || 0)));
    });
  },

  /**
   * 請求書PDFを生成してメール送信
   * @param {Object} invoiceData - 請求データ
   * @param {string} email - 送信先メールアドレス
   * @returns {Object} 送信結果
   */
  generateAndSendPdf: function(invoiceData, email) {
    try {
      // PDF生成
      const pdfResult = this.generatePdf(invoiceData);
      if (!pdfResult.success) {
        return pdfResult;
      }

      // メール送信
      const pdfFile = DriveApp.getFileById(pdfResult.pdfId);
      const pdfBlob = pdfFile.getBlob();

      const subject = `【くらべる】請求書送付のご案内（${invoiceData.invoiceId}）`;
      const htmlBody = `
<p>${invoiceData.companyName} 御中</p>

<p>いつもお世話になっております。<br>
株式会社外壁塗装くらべるです。</p>

<p>下記の通り請求書をお送りいたしますので、ご確認をお願いいたします。</p>

<hr>

<p>
<strong>請求書番号:</strong> ${invoiceData.invoiceId}<br>
<strong>ご請求金額:</strong> ¥${this._formatNumber(invoiceData.totalAmount)}（税込）<br>
<strong>お支払期限:</strong> ${this._formatDate(invoiceData.dueDate)}
</p>

<hr>

<p>請求書はPDFファイルを添付しておりますのでご確認ください。</p>

<p>ご不明点がございましたら、お気軽にお問い合わせください。</p>

<p>━━━━━━━━━━━━━━━━━━━━<br>
株式会社外壁塗装くらべる<br>
TEL: XXX-XXXX-XXXX<br>
Email: info@gaihekikuraberu.com<br>
━━━━━━━━━━━━━━━━━━━━</p>
`;

      GmailApp.sendEmail(email, subject, '', {
        htmlBody: htmlBody,
        attachments: [pdfBlob],
        name: '株式会社外壁塗装くらべる'
      });

      console.log('[InvoicePdfGenerator] メール送信完了:', email);

      return {
        success: true,
        pdfId: pdfResult.pdfId,
        pdfUrl: pdfResult.pdfUrl,
        emailSent: true,
        sentTo: email,
        message: `請求書PDFを生成し、${email}に送信しました`
      };

    } catch (e) {
      console.error('[InvoicePdfGenerator] generateAndSendPdf error:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * BillingSystemの請求データからPDF生成用データを作成
   * @param {Object} invoice - 請求管理シートの請求データ
   * @param {Array} items - 明細データ（CV情報など）
   * @returns {Object} PDF生成用データ
   */
  createInvoiceDataFromBilling: function(invoice, items) {
    const subtotal = Number(invoice['税抜金額']) || 0;
    const tax = Number(invoice['消費税']) || 0;
    const totalAmount = Number(invoice['税込金額']) || 0;

    // 明細がない場合はデフォルト
    const invoiceItems = items && items.length > 0 ? items : [{
      name: invoice['請求種別'] + '（' + invoice['対象期間'] + '分）',
      quantity: invoice['対象件数'] || 1,
      unitPrice: subtotal / (invoice['対象件数'] || 1)
    }];

    return {
      invoiceId: invoice['請求ID'],
      companyName: invoice['加盟店名'],
      issueDate: invoice['発行日'] || new Date(),
      dueDate: invoice['支払期限'],
      subtotal: subtotal,
      tax: tax,
      totalAmount: totalAmount,
      items: invoiceItems,
      bankInfo: this._getBankInfo()
    };
  },

  /**
   * 振込先情報取得
   */
  _getBankInfo: function() {
    // Script Propertiesから取得、なければデフォルト
    const bankInfo = PropertiesService.getScriptProperties().getProperty('BANK_INFO');
    return bankInfo || '○○銀行 ○○支店\n普通 XXXXXXX\n株式会社外壁塗装くらべる';
  },

  /**
   * 日付フォーマット
   */
  _formatDate: function(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  },

  /**
   * 数値フォーマット（カンマ区切り）
   */
  _formatNumber: function(num) {
    return Number(num || 0).toLocaleString('ja-JP');
  }
};

// ========== テスト関数 ==========

/**
 * テンプレート作成テスト
 */
function testCreateInvoiceTemplate() {
  console.log('========== 請求書テンプレート作成 ==========');
  const result = InvoicePdfGenerator.createTemplate();
  console.log('結果:', JSON.stringify(result, null, 2));
  if (result.success) {
    console.log('\n★ テンプレートURL:', result.templateUrl);
    console.log('★ このURLを開いてテンプレートの内容を編集してください');
  }
  console.log('========== 完了 ==========');
  return result;
}

/**
 * PDF生成テスト
 */
function testGenerateInvoicePdf() {
  console.log('========== 請求書PDF生成テスト ==========');

  const testData = {
    invoiceId: 'INV-TEST-001',
    companyName: 'テスト株式会社',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    subtotal: 100000,
    tax: 10000,
    totalAmount: 110000,
    items: [
      { name: '紹介料（CV-001）', quantity: 1, unitPrice: 20000 },
      { name: '紹介料（CV-002）', quantity: 1, unitPrice: 20000 },
      { name: '紹介料（CV-003）', quantity: 1, unitPrice: 20000 },
      { name: '紹介料（CV-004）', quantity: 1, unitPrice: 20000 },
      { name: '紹介料（CV-005）', quantity: 1, unitPrice: 20000 }
    ]
  };

  const result = InvoicePdfGenerator.generatePdf(testData);
  console.log('結果:', JSON.stringify(result, null, 2));
  if (result.success) {
    console.log('\n★ PDF URL:', result.pdfUrl);
  }
  console.log('========== 完了 ==========');
  return result;
}

/**
 * PDF生成＆メール送信テスト
 */
function testGenerateAndSendInvoicePdf() {
  console.log('========== 請求書PDF生成＆送信テスト ==========');

  // 送信先メールアドレス（テスト用に自分のアドレスを指定）
  const testEmail = Session.getActiveUser().getEmail();

  const testData = {
    invoiceId: 'INV-TEST-002',
    companyName: 'テスト株式会社',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    subtotal: 60000,
    tax: 6000,
    totalAmount: 66000,
    items: [
      { name: '紹介料（CV-A001）', quantity: 1, unitPrice: 20000 },
      { name: '紹介料（CV-A002）', quantity: 1, unitPrice: 20000 },
      { name: '紹介料（CV-A003）', quantity: 1, unitPrice: 20000 }
    ]
  };

  const result = InvoicePdfGenerator.generateAndSendPdf(testData, testEmail);
  console.log('結果:', JSON.stringify(result, null, 2));
  console.log('========== 完了 ==========');
  return result;
}

/**
 * 請求管理シートから請求書PDF一括生成
 */
function testBulkGenerateInvoicePdfs() {
  console.log('========== 請求書PDF一括生成テスト ==========');

  // 未発行の請求を取得
  const invoices = BillingSystem.getInvoices(null, '未発行');
  if (!invoices.success || invoices.invoices.length === 0) {
    console.log('未発行の請求がありません');
    return;
  }

  console.log('対象請求数:', invoices.invoices.length);

  const results = [];
  for (const inv of invoices.invoices) {
    console.log('処理中:', inv['請求ID'], inv['加盟店名']);

    // CV明細を取得
    const cvIds = inv['対象CV ID'] ? inv['対象CV ID'].split(', ') : [];
    const items = cvIds.map(cvId => ({
      name: `紹介料（${cvId}）`,
      quantity: 1,
      unitPrice: 20000
    }));

    // PDF生成用データ作成
    const invoiceData = InvoicePdfGenerator.createInvoiceDataFromBilling(inv, items);

    // PDF生成
    const result = InvoicePdfGenerator.generatePdf(invoiceData);
    results.push({
      invoiceId: inv['請求ID'],
      ...result
    });

    if (result.success) {
      console.log('  → PDF生成成功:', result.pdfUrl);
    } else {
      console.log('  → 失敗:', result.error);
    }
  }

  console.log('\n結果サマリー:');
  console.log('  成功:', results.filter(r => r.success).length);
  console.log('  失敗:', results.filter(r => !r.success).length);
  console.log('========== 完了 ==========');
  return results;
}
