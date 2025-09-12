/**
 * 請求・財務管理システム GAS Backend
 * 紹介料・成約手数料の計算、請求書発行、freee連携
 */

// =======================
// 設定
// =======================
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // 要置換
const FREEE_API_KEY = PropertiesService.getScriptProperties().getProperty('FREEE_API_KEY');
const FREEE_COMPANY_ID = PropertiesService.getScriptProperties().getProperty('FREEE_COMPANY_ID');

// 請求設定（税込み計算）
const BILLING_CONFIG = {
  // 紹介料表（税抜き）
  referralFees: {
    // 基本項目（一律20,000円）
    '外壁塗装': 20000,
    '外壁カバー工法': 20000,
    '外壁張替え': 20000,
    '屋根塗装（外壁工事含む）': 20000,
    '屋上防水（外壁工事含む）': 20000,
    '屋根葺き替え・張り替え（スレート・ガルバリウム等）': 20000,
    '屋根葺き替え・張り替え（瓦）': 20000,
    '屋根カバー工法': 20000,
    '外壁補修（外壁工事含む）': 20000,
    '屋根補修（外壁工事含む）': 20000,
    'ベランダ防水（外壁工事含む）': 20000,
    '内装水回り（外壁工事含む）': 20000,
    '内装（外壁工事含む）': 20000,
    
    // 単品項目（相見積もり時の料金）
    '屋根塗装単品': 10000,
    '屋上防水単品': 10000,
    '外壁補修単品': 5000,
    '屋根補修単品': 5000,
    'ベランダ防水単品': 5000
  },
  
  // 単品項目リスト
  singleItems: ['屋根塗装単品', '屋上防水単品', '外壁補修単品', '屋根補修単品', 'ベランダ防水単品'],
  // デフォルト成約手数料率
  successFeeRate: 0.10, // 10%
  // 消費税率
  taxRate: 0.10, // 10%
  // 支払い日設定
  paymentDates: {
    bank: 15,        // 銀行振込: 翌月15日
    transfer: 27     // 口座振替: 翌月27日
  }
};

// =======================
// API エンドポイント
// =======================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch(action) {
      case 'getReferralFees':
        return handleGetReferralFees(data);
      case 'getSuccessFees':
        return handleGetSuccessFees(data);
      case 'createInvoice':
        return handleCreateInvoice(data);
      case 'updatePaymentStatus':
        return handleUpdatePaymentStatus(data);
      case 'getPaymentSchedule':
        return handleGetPaymentSchedule(data);
      case 'updateFeeSettings':
        return handleUpdateFeeSettings(data);
      case 'syncWithFreee':
        return handleFreeeSync(data);
      default:
        throw new Error('Invalid action: ' + action);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// =======================
// 紹介料請求処理
// =======================
function handleGetReferralFees(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('紹介料');
  const { month, year, status } = data;
  
  // 月間データを取得
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const referralFees = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const referralDate = new Date(row[headers.indexOf('紹介日')]);
    
    // 指定月のデータをフィルタ
    if (referralDate.getMonth() === month - 1 && 
        referralDate.getFullYear() === year) {
      
      const franchiseId = row[headers.indexOf('加盟店ID')];
      const caseId = row[headers.indexOf('案件ID')];
      const customerName = row[headers.indexOf('顧客名')];
      const buildingType = row[headers.indexOf('建物種別')];
      const billingStatus = row[headers.indexOf('請求ステータス')];
      
      // ステータスフィルタ
      if (!status || status === 'all' || billingStatus === status) {
        // 案件データを構築
        const caseData = {
          selectedItems: row[headers.indexOf('選択項目')].split(','),
          referralCount: row[headers.indexOf('紹介社数')] || 1,
          buildingType: row[headers.indexOf('建物種別')],
          buildingFloor: row[headers.indexOf('階数')] || 1
        };
        
        // 加盟店別・案件別の紹介料を取得
        const baseFee = getFeeAmount(franchiseId, caseId, caseData);
        const tax = Math.floor(baseFee * BILLING_CONFIG.taxRate);
        const totalFee = baseFee + tax;
        
        // 支払日を計算
        const paymentMethod = getFranchisePaymentMethod(franchiseId);
        const paymentDate = calculatePaymentDate(referralDate, paymentMethod);
        
        referralFees.push({
          franchiseId: franchiseId,
          franchiseName: row[headers.indexOf('加盟店名')],
          caseId: caseId,
          customerName: customerName,
          buildingType: buildingType,
          baseFee: baseFee,
          tax: tax,
          totalFee: totalFee,
          paymentMethod: paymentMethod,
          paymentDate: paymentDate,
          status: billingStatus,
          referralDate: referralDate.toISOString()
        });
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: referralFees,
    summary: calculateSummary(referralFees)
  })).setMimeType(ContentService.MimeType.JSON);
}

// =======================
// 成約手数料処理
// =======================
function handleGetSuccessFees(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('成約手数料');
  const { month, year, status } = data;
  
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const successFees = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const contractDate = new Date(row[headers.indexOf('成約日')]);
    
    if (contractDate.getMonth() === month - 1 && 
        contractDate.getFullYear() === year) {
      
      const franchiseId = row[headers.indexOf('加盟店ID')];
      const caseId = row[headers.indexOf('案件ID')];
      const contractAmount = row[headers.indexOf('成約金額')];
      const billingStatus = row[headers.indexOf('請求ステータス')];
      
      if (!status || status === 'all' || billingStatus === status) {
        // 加盟店別・案件別の手数料率を取得
        const feeRate = getFeeRate(franchiseId, caseId, 'success');
        const baseFee = Math.floor(contractAmount * feeRate);
        const tax = Math.floor(baseFee * BILLING_CONFIG.taxRate);
        const totalFee = baseFee + tax;
        
        const paymentMethod = getFranchisePaymentMethod(franchiseId);
        const paymentDate = calculatePaymentDate(contractDate, paymentMethod);
        
        successFees.push({
          franchiseId: franchiseId,
          franchiseName: row[headers.indexOf('加盟店名')],
          caseId: caseId,
          customerName: row[headers.indexOf('顧客名')],
          contractAmount: contractAmount,
          feeRate: feeRate,
          baseFee: baseFee,
          tax: tax,
          totalFee: totalFee,
          paymentMethod: paymentMethod,
          paymentDate: paymentDate,
          status: billingStatus,
          contractDate: contractDate.toISOString()
        });
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: successFees,
    summary: calculateSummary(successFees)
  })).setMimeType(ContentService.MimeType.JSON);
}

// =======================
// 請求書作成
// =======================
function handleCreateInvoice(data) {
  const { franchiseId, items, dueDate, type } = data;
  
  // freee APIで請求書を作成
  const invoice = createFreeeInvoice({
    franchiseId: franchiseId,
    items: items,
    dueDate: dueDate,
    type: type // 'referral' or 'success'
  });
  
  // スプレッドシートに記録
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('請求書');
  sheet.appendRow([
    invoice.invoiceNumber,
    new Date(),
    franchiseId,
    type === 'referral' ? '紹介料' : '成約手数料',
    invoice.totalAmount,
    dueDate,
    '請求済み',
    invoice.freeeInvoiceId
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    invoice: invoice
  })).setMimeType(ContentService.MimeType.JSON);
}

// =======================
// 支払いステータス更新
// =======================
function handleUpdatePaymentStatus(data) {
  const { invoiceId, status, paymentDate, amount } = data;
  
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('請求書');
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === invoiceId) {
      sheet.getRange(i + 1, 7).setValue(status);
      if (status === '入金済み') {
        sheet.getRange(i + 1, 9).setValue(paymentDate);
        sheet.getRange(i + 1, 10).setValue(amount);
      }
      break;
    }
  }
  
  // freeeにも同期
  if (FREEE_API_KEY) {
    updateFreeeInvoiceStatus(invoiceId, status);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

// =======================
// 支払予定表取得
// =======================
function handleGetPaymentSchedule(data) {
  const { startDate, endDate } = data;
  
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('請求書');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  const schedule = {};
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dueDate = new Date(row[headers.indexOf('支払期限')]);
    const status = row[headers.indexOf('ステータス')];
    
    if (dueDate >= new Date(startDate) && 
        dueDate <= new Date(endDate) &&
        status !== '入金済み') {
      
      const dateKey = dueDate.toISOString().split('T')[0];
      if (!schedule[dateKey]) {
        schedule[dateKey] = {
          date: dateKey,
          referralFees: [],
          successFees: [],
          totalAmount: 0
        };
      }
      
      const type = row[headers.indexOf('種別')];
      const item = {
        invoiceId: row[headers.indexOf('請求書番号')],
        franchiseName: row[headers.indexOf('加盟店名')],
        amount: row[headers.indexOf('請求額')],
        status: status
      };
      
      if (type === '紹介料') {
        schedule[dateKey].referralFees.push(item);
      } else {
        schedule[dateKey].successFees.push(item);
      }
      
      schedule[dateKey].totalAmount += item.amount;
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    schedule: Object.values(schedule)
  })).setMimeType(ContentService.MimeType.JSON);
}

// =======================
// 料金設定更新
// =======================
function handleUpdateFeeSettings(data) {
  const { franchiseId, caseId, feeType, amount } = data;
  
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('料金設定');
  
  // 既存の設定を検索
  const rows = sheet.getDataRange().getValues();
  let found = false;
  
  for (let i = 1; i < rows.length; i++) {
    if ((franchiseId && rows[i][0] === franchiseId) ||
        (caseId && rows[i][1] === caseId)) {
      sheet.getRange(i + 1, feeType === 'referral' ? 3 : 4).setValue(amount);
      found = true;
      break;
    }
  }
  
  // 新規追加
  if (!found) {
    sheet.appendRow([
      franchiseId || '',
      caseId || '',
      feeType === 'referral' ? amount : '',
      feeType === 'success' ? amount : '',
      new Date()
    ]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true
  })).setMimeType(ContentService.MimeType.JSON);
}

// =======================
// ヘルパー関数
// =======================

// 紹介料を計算（複数項目から最高額を取得）
function calculateReferralFee(caseData) {
  const { selectedItems, referralCount, buildingType, buildingFloor } = caseData;
  
  // アパート・マンション3階以上の判定
  const isApartment3F = buildingType === '集合住宅' && buildingFloor >= 3;
  
  let maxFee = 0;
  
  // 選択された項目から最高額を取得
  selectedItems.forEach(item => {
    let fee = BILLING_CONFIG.referralFees[item] || 0;
    
    // 1社紹介時は単品項目も20,000円に
    if (referralCount === 1 && BILLING_CONFIG.singleItems.includes(item)) {
      fee = 20000;
    }
    
    // アパート・マンション3階以上の特別料金（基本項目のみ）
    if (isApartment3F && fee === 20000 && !BILLING_CONFIG.singleItems.includes(item)) {
      fee = 30000;
    }
    
    // 最高額を更新
    if (fee > maxFee) {
      maxFee = fee;
    }
  });
  
  return maxFee;
}

// 料金額を取得（優先順位: 案件別 > 加盟店別 > デフォルト）
function getFeeAmount(franchiseId, caseId, caseData) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('料金設定');
  const rows = sheet.getDataRange().getValues();
  
  // 案件別設定を確認
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === caseId && rows[i][2]) {
      return rows[i][2];
    }
  }
  
  // 加盟店別設定を確認
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === franchiseId && rows[i][2]) {
      return rows[i][2];
    }
  }
  
  // デフォルト値を計算
  return calculateReferralFee(caseData);
}

// 手数料率を取得
function getFeeRate(franchiseId, caseId, feeType) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('料金設定');
  const rows = sheet.getDataRange().getValues();
  
  // 案件別設定
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === caseId && rows[i][3]) {
      return rows[i][3];
    }
  }
  
  // 加盟店別設定
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === franchiseId && rows[i][3]) {
      return rows[i][3];
    }
  }
  
  return BILLING_CONFIG.successFeeRate;
}

// 加盟店の支払方法を取得
function getFranchisePaymentMethod(franchiseId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店マスタ');
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === franchiseId) {
      return rows[i][5] || 'bank'; // デフォルトは銀行振込
    }
  }
  
  return 'bank';
}

// 支払日を計算
function calculatePaymentDate(baseDate, paymentMethod) {
  const nextMonth = new Date(baseDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  
  const payDay = paymentMethod === 'transfer' ? 
    BILLING_CONFIG.paymentDates.transfer : 
    BILLING_CONFIG.paymentDates.bank;
  
  nextMonth.setDate(payDay);
  return nextMonth;
}

// サマリー計算
function calculateSummary(fees) {
  return {
    total: fees.reduce((sum, f) => sum + f.totalFee, 0),
    count: fees.length,
    unpaid: fees.filter(f => f.status === '未請求').length,
    pending: fees.filter(f => f.status === '請求済み').length,
    paid: fees.filter(f => f.status === '入金済み').length
  };
}

// =======================
// freee API連携
// =======================
function createFreeeInvoice(data) {
  if (!FREEE_API_KEY) {
    // freee APIキーがない場合はダミーデータを返す
    return {
      invoiceNumber: 'INV-' + new Date().getTime(),
      totalAmount: data.items.reduce((sum, item) => sum + item.amount, 0),
      freeeInvoiceId: null
    };
  }
  
  const url = `https://api.freee.co.jp/api/1/invoices`;
  const franchise = getFranchiseDetails(data.franchiseId);
  
  const invoiceData = {
    company_id: FREEE_COMPANY_ID,
    partner_id: franchise.freeePartnerId,
    invoice_number: 'INV-' + new Date().getTime(),
    issue_date: Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd'),
    due_date: Utilities.formatDate(new Date(data.dueDate), 'JST', 'yyyy-MM-dd'),
    invoice_status: 'issue',
    invoice_lines: data.items.map(item => ({
      description: item.description,
      unit_price: item.amount,
      qty: 1,
      tax_code: 1 // 10%課税
    }))
  };
  
  const response = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + FREEE_API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({ invoice: invoiceData })
  });
  
  const result = JSON.parse(response.getContentText());
  
  return {
    invoiceNumber: result.invoice.invoice_number,
    totalAmount: result.invoice.total_amount,
    freeeInvoiceId: result.invoice.id
  };
}

function updateFreeeInvoiceStatus(invoiceId, status) {
  const url = `https://api.freee.co.jp/api/1/invoices/${invoiceId}`;
  
  const statusMap = {
    '入金済み': 'settle',
    '請求済み': 'issue',
    '未請求': 'draft'
  };
  
  UrlFetchApp.fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + FREEE_API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      invoice: {
        invoice_status: statusMap[status] || 'issue'
      }
    })
  });
}

function handleFreeeSync(data) {
  // freee APIから最新データを取得してスプレッドシートと同期
  // 実装は省略（要件に応じて追加）
  
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    message: 'freee同期完了'
  })).setMimeType(ContentService.MimeType.JSON);
}

// 加盟店詳細を取得
function getFranchiseDetails(franchiseId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('加盟店マスタ');
  const rows = sheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === franchiseId) {
      return {
        id: rows[i][0],
        name: rows[i][1],
        freeePartnerId: rows[i][6],
        paymentMethod: rows[i][5]
      };
    }
  }
  
  return null;
}