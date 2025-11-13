/**
 * キャンセル申請・期限延長申請 JavaScript
 * index.htmlの<script>セクションに追加してください
 */

// ============================================
// グローバル変数
// ============================================
let cancelCurrentStep = 1;
let cancelSelectedCvId = null;
let cancelSelectedCategory = null;
let cancelSelectedSubCategory = null;
let cancelAnswers = {};
let cancelCaseData = null;

// ============================================
// キャンセル理由構造（簡略版）
// ============================================
const CANCEL_REASONS = {
  categories: [
    { id: 'no_contact', label: '1. 連絡が繋がらない', minPhoneCalls: 3, minSMS: 2 },
    { id: 'contact_lost', label: '2. 電話繋がったがアポ取れず、その後不通', minPhoneCalls: 2, minSMS: 1 },
    { id: 'customer_cancel_phone', label: '3. お客様から電話でキャンセルされた' },
    { id: 'customer_cancel_sms', label: '4. お客様からSMSでキャンセルされた' },
    { id: 'complaint', label: '5. クレーム' }
  ],

  subCategories: {
    no_contact: [
      { id: 'no_answer_multiple', label: '複数回電話したが出ない' },
      { id: 'invalid_number', label: '番号が無効（音声ガイダンス・使われていない）' },
      { id: 'wrong_number', label: '間違い電話（別人が出た）' },
      { id: 'other', label: 'その他 → 詳細ヒアリング' }
    ],
    contact_lost: [
      { id: 'appointment_rejected', label: 'アポ取得を断られた後、不通' },
      { id: 'postponed_then_lost', label: '後日連絡と言われたが、その後繋がらず' },
      { id: 'other', label: 'その他 → 詳細ヒアリング' }
    ],
    customer_cancel_phone: [
      { id: 'already_contracted', label: '既に他社で契約済み' },
      { id: 'not_interested', label: 'やっぱり工事しない・興味がない' },
      { id: 'timing_issue', label: 'タイミングが合わない' },
      { id: 'request_not_submitted', label: '自分で申し込んでいない（覚えがない）' },
      { id: 'other', label: 'その他 → 詳細ヒアリング' }
    ],
    customer_cancel_sms: [
      { id: 'sms_decline', label: 'SMSで断りの連絡が来た' },
      { id: 'sms_already_contracted', label: 'SMSで他社契約済みと連絡が来た' },
      { id: 'other', label: 'その他 → 詳細ヒアリング' }
    ],
    complaint: [
      { id: 'too_many_calls', label: '電話・SMSがしつこい' },
      { id: 'rude_attitude', label: '対応が悪い・失礼' },
      { id: 'privacy_concern', label: '個人情報の扱いに不安' },
      { id: 'other', label: 'その他 → 詳細ヒアリング' }
    ]
  },

  questions: {
    no_answer_multiple: [
      { id: 'phone_count', label: '電話をかけた回数', type: 'number', required: true, min: 3 },
      { id: 'sms_count', label: 'SMSを送った回数', type: 'number', required: true, min: 2 },
      { id: 'last_contact_date', label: '最終連絡日時', type: 'datetime-local', required: true },
      { id: 'sms_content', label: '送信したSMS内容', type: 'textarea', required: false }
    ],
    invalid_number: [
      { id: 'guidance_message', label: '音声ガイダンスの内容', type: 'select', options: ['お客様のご都合により通話ができません', 'おかけになった電話番号は現在使われておりません', '電源が入っていないか圏外です', 'その他'], required: true },
      { id: 'attempt_count', label: '確認した回数', type: 'number', required: true, min: 2 },
      { id: 'last_attempt_date', label: '最終確認日時', type: 'datetime-local', required: true }
    ],
    wrong_number: [
      { id: 'who_answered', label: '誰が出ましたか', type: 'text', required: false, placeholder: '例: 全く知らない人、前の持ち主' },
      { id: 'confirmation_count', label: '確認した回数', type: 'number', required: true, min: 2 }
    ],
    other: [
      { id: 'detail_hearing', label: '詳細をお聞かせください', type: 'textarea', required: true, placeholder: '詳しい状況を記入してください' }
    ],
    // 他のサブカテゴリも同様に定義（簡略版）
    appointment_rejected: [
      { id: 'contact_date', label: '電話が繋がった日時', type: 'datetime-local', required: true },
      { id: 'follow_up_count', label: 'その後の連絡試行回数', type: 'number', required: true, min: 2 },
      { id: 'last_contact_date', label: '最終連絡日時', type: 'datetime-local', required: true }
    ],
    already_contracted: [
      { id: 'contact_date', label: '電話が繋がった日時', type: 'datetime-local', required: true },
      { id: 'other_company', label: '契約した業者名', type: 'text', required: false }
    ],
    too_many_calls: [
      { id: 'complaint_date', label: 'クレーム受付日時', type: 'datetime-local', required: true },
      { id: 'complaint_detail', label: 'クレーム内容', type: 'textarea', required: true },
      { id: 'actual_contact_count', label: '実際の連絡回数（電話）', type: 'number', required: true },
      { id: 'actual_sms_count', label: '実際の連絡回数（SMS）', type: 'number', required: true }
    ]
  }
};

// ============================================
// キャンセル申請可能案件読み込み
// ============================================
async function loadCancelableCases() {
  try {
    const response = await fetch(`${API_URL}?action=getCancelableCases&merchantId=${currentMerchantId}`);
    const result = await response.json();

    const container = document.getElementById('cancelableCasesList');

    if (!result.success) {
      container.innerHTML = `<div class="text-center text-red-500 py-8">${result.error}</div>`;
      return;
    }

    if (result.cases.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
          </svg>
          <p class="text-lg">申請可能な案件がありません</p>
          <p class="text-sm mt-2">配信日から6〜7日の案件のみ表示されます</p>
        </div>
      `;
      return;
    }

    container.innerHTML = result.cases.map(c => `
      <div class="border rounded-lg p-4 hover:shadow-lg transition-shadow ${c.isWithinDeadline ? 'bg-white' : 'bg-gray-50 opacity-75'}">
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1">
            <h4 class="font-semibold text-lg">${c.customerName}</h4>
            <p class="text-sm text-gray-600 mt-1">${c.address}</p>
            <p class="text-xs text-gray-500 mt-1">電話: ${c.tel}</p>
          </div>
          <div class="text-right">
            <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ${c.isWithinDeadline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
              ${c.isWithinDeadline ? '期限内' : '期限外'}
            </span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
          <div>
            <span class="text-gray-500">配信日:</span>
            <span class="font-medium">${formatDate(c.deliveredAt)}</span>
          </div>
          <div>
            <span class="text-gray-500">経過:</span>
            <span class="font-medium">${c.daysElapsed}日</span>
          </div>
          <div class="col-span-2">
            <span class="text-gray-500">申請期限:</span>
            <span class="font-medium">${formatDate(c.deadlineDate)}</span>
          </div>
        </div>
        <button onclick="openCancelModal('${c.cvId}')" class="w-full px-4 py-2 ${c.isWithinDeadline ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 cursor-not-allowed'} text-white rounded-lg font-semibold" ${!c.isWithinDeadline ? 'disabled' : ''}>
          ${c.isWithinDeadline ? 'キャンセル申請' : '期限外のため申請不可'}
        </button>
      </div>
    `).join('');

  } catch (error) {
    console.error('キャンセル申請可能案件読み込みエラー:', error);
    document.getElementById('cancelableCasesList').innerHTML = `<div class="text-center text-red-500 py-8">エラーが発生しました</div>`;
  }
}

// ============================================
// キャンセル申請モーダル開く
// ============================================
async function openCancelModal(cvId) {
  try {
    // 案件データ取得
    const response = await fetch(`${API_URL}?action=getCancelableCases&merchantId=${currentMerchantId}`);
    const result = await response.json();

    if (!result.success) {
      alert('案件データの取得に失敗しました');
      return;
    }

    cancelCaseData = result.cases.find(c => c.cvId === cvId);
    if (!cancelCaseData) {
      alert('案件が見つかりません');
      return;
    }

    cancelSelectedCvId = cvId;
    cancelCurrentStep = 1;
    cancelAnswers = {};

    // 顧客情報表示
    document.getElementById('cancelCustomerName').textContent = cancelCaseData.customerName;
    document.getElementById('cancelCustomerTel').textContent = cancelCaseData.tel;
    document.getElementById('cancelCustomerAddress').textContent = cancelCaseData.address;
    document.getElementById('cancelDeliveredAt').textContent = formatDate(cancelCaseData.deliveredAt);
    document.getElementById('cancelDaysElapsed').textContent = cancelCaseData.daysElapsed;
    document.getElementById('cancelDeadline').textContent = formatDate(cancelCaseData.deadlineDate);

    // ステップ1: カテゴリリスト生成
    const categoryList = document.getElementById('cancelCategoryList');
    categoryList.innerHTML = CANCEL_REASONS.categories.map(cat => `
      <button onclick="selectCancelCategory('${cat.id}')" class="w-full px-6 py-4 text-left border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
        <div class="font-semibold text-lg">${cat.label}</div>
        ${cat.minPhoneCalls ? `<div class="text-sm text-gray-500 mt-1">最低要件: 電話${cat.minPhoneCalls}回以上、SMS${cat.minSMS}回以上</div>` : ''}
      </button>
    `).join('');

    document.getElementById('cancelModal').classList.remove('hidden');
    cancelGoToStep(1);

  } catch (error) {
    console.error('キャンセル申請モーダルエラー:', error);
    alert('エラーが発生しました');
  }
}

function closeCancelModal() {
  document.getElementById('cancelModal').classList.add('hidden');
}

// ============================================
// キャンセル申請ステップ遷移
// ============================================
function cancelGoToStep(step) {
  cancelCurrentStep = step;

  // 全ステップ非表示
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`cancelStep${i}`).classList.add('hidden');
  }

  // 現在のステップ表示
  document.getElementById(`cancelStep${step}`).classList.remove('hidden');

  // インジケーター更新
  for (let i = 1; i <= 4; i++) {
    const indicator = document.getElementById(`step${i}Indicator`);
    if (i < step) {
      indicator.classList.remove('bg-gray-200', 'text-gray-500', 'bg-blue-500', 'text-white');
      indicator.classList.add('bg-green-500', 'text-white');
      indicator.innerHTML = '✓';
    } else if (i === step) {
      indicator.classList.remove('bg-gray-200', 'text-gray-500', 'bg-green-500');
      indicator.classList.add('bg-blue-500', 'text-white');
      indicator.textContent = i;
    } else {
      indicator.classList.remove('bg-blue-500', 'text-white', 'bg-green-500');
      indicator.classList.add('bg-gray-200', 'text-gray-500');
      indicator.textContent = i;
    }

    // ライン更新
    if (i < 4) {
      const line = document.getElementById(`step${i}Line`);
      if (i < step) {
        line.classList.remove('bg-gray-200');
        line.classList.add('bg-green-500');
      } else {
        line.classList.remove('bg-green-500');
        line.classList.add('bg-gray-200');
      }
    }
  }
}

// ============================================
// カテゴリ選択
// ============================================
function selectCancelCategory(categoryId) {
  cancelSelectedCategory = categoryId;
  const subCats = CANCEL_REASONS.subCategories[categoryId] || [];

  const subCategoryList = document.getElementById('cancelSubCategoryList');
  subCategoryList.innerHTML = subCats.map(sub => `
    <button onclick="selectCancelSubCategory('${sub.id}')" class="w-full px-6 py-4 text-left border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
      <div class="font-semibold">${sub.label}</div>
    </button>
  `).join('');

  cancelGoToStep(2);
}

// ============================================
// サブカテゴリ選択
// ============================================
function selectCancelSubCategory(subCategoryId) {
  cancelSelectedSubCategory = subCategoryId;
  const questions = CANCEL_REASONS.questions[subCategoryId] || CANCEL_REASONS.questions.other;

  const container = document.getElementById('cancelQuestionsContainer');
  container.innerHTML = questions.map(q => {
    let inputHTML = '';

    if (q.type === 'number') {
      inputHTML = `<input type="number" id="q_${q.id}" class="w-full px-4 py-2 border rounded-lg" placeholder="${q.placeholder || ''}" ${q.required ? 'required' : ''} min="${q.min || 0}">`;
    } else if (q.type === 'text') {
      inputHTML = `<input type="text" id="q_${q.id}" class="w-full px-4 py-2 border rounded-lg" placeholder="${q.placeholder || ''}" ${q.required ? 'required' : ''}>`;
    } else if (q.type === 'textarea') {
      inputHTML = `<textarea id="q_${q.id}" rows="4" class="w-full px-4 py-2 border rounded-lg" placeholder="${q.placeholder || ''}" ${q.required ? 'required' : ''}></textarea>`;
    } else if (q.type === 'select') {
      inputHTML = `
        <select id="q_${q.id}" class="w-full px-4 py-2 border rounded-lg" ${q.required ? 'required' : ''}>
          <option value="">選択してください</option>
          ${q.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
        </select>
      `;
    } else if (q.type === 'datetime-local') {
      inputHTML = `<input type="datetime-local" id="q_${q.id}" class="w-full px-4 py-2 border rounded-lg" ${q.required ? 'required' : ''}>`;
    } else if (q.type === 'date') {
      inputHTML = `<input type="date" id="q_${q.id}" class="w-full px-4 py-2 border rounded-lg" ${q.required ? 'required' : ''}>`;
    }

    return `
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          ${q.label} ${q.required ? '<span class="text-red-500">*</span>' : ''}
        </label>
        ${inputHTML}
      </div>
    `;
  }).join('');

  cancelGoToStep(3);
}

// ============================================
// 確認画面へ
// ============================================
function cancelGoToConfirm() {
  // 回答を収集
  const questions = CANCEL_REASONS.questions[cancelSelectedSubCategory] || CANCEL_REASONS.questions.other;
  questions.forEach(q => {
    const el = document.getElementById(`q_${q.id}`);
    if (el) {
      cancelAnswers[q.id] = el.value;
    }
  });

  // 確認画面生成
  const category = CANCEL_REASONS.categories.find(c => c.id === cancelSelectedCategory);
  const subCategory = CANCEL_REASONS.subCategories[cancelSelectedCategory].find(s => s.id === cancelSelectedSubCategory);

  const confirmContent = document.getElementById('cancelConfirmContent');
  confirmContent.innerHTML = `
    <div class="space-y-3">
      <div>
        <div class="text-sm text-gray-500">キャンセル理由カテゴリ</div>
        <div class="font-semibold">${category.label}</div>
      </div>
      <div>
        <div class="text-sm text-gray-500">キャンセル理由詳細</div>
        <div class="font-semibold">${subCategory.label}</div>
      </div>
      ${questions.map(q => `
        <div>
          <div class="text-sm text-gray-500">${q.label}</div>
          <div class="font-medium">${cancelAnswers[q.id] || '（未入力）'}</div>
        </div>
      `).join('')}
    </div>
  `;

  cancelGoToStep(4);
}

// ============================================
// キャンセル申請送信
// ============================================
async function submitCancelApplication() {
  try {
    const category = CANCEL_REASONS.categories.find(c => c.id === cancelSelectedCategory);
    const subCategory = CANCEL_REASONS.subCategories[cancelSelectedCategory].find(s => s.id === cancelSelectedSubCategory);

    const requestData = {
      merchantId: currentMerchantId,
      merchantName: currentCompanyInfo.companyName,
      applicantName: currentUser.name,
      cvId: cancelSelectedCvId,
      cancelReasonCategory: category.label,
      cancelReasonDetail: subCategory.label,
      reasonData: {
        category: cancelSelectedCategory,
        subCategory: cancelSelectedSubCategory,
        answers: cancelAnswers
      },
      additionalInfo1: JSON.stringify(cancelAnswers),
      phoneCallCount: cancelAnswers.phone_count || cancelAnswers.actual_contact_count || 0,
      smsCount: cancelAnswers.sms_count || cancelAnswers.actual_sms_count || 0,
      lastContactDate: cancelAnswers.last_contact_date || cancelAnswers.complaint_date,
      contactDate: cancelAnswers.contact_date,
      complaintDetail: cancelAnswers.complaint_detail,
      otherDetail: cancelAnswers.detail_hearing
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        action: 'submitCancelReport',
        ...requestData,
        reasonData: JSON.stringify(requestData.reasonData)
      })
    });

    const result = await response.json();

    if (result.success) {
      alert('キャンセル申請が完了しました');
      closeCancelModal();
      loadCancelableCases();
    } else {
      alert(`エラー: ${result.error}`);
    }

  } catch (error) {
    console.error('キャンセル申請送信エラー:', error);
    alert('エラーが発生しました');
  }
}

// ============================================
// 期限延長申請読み込み
// ============================================
async function loadExtensionEligibleCases() {
  try {
    const response = await fetch(`${API_URL}?action=getExtensionEligibleCases&merchantId=${currentMerchantId}`);
    const result = await response.json();

    const container = document.getElementById('extensionEligibleCasesList');

    if (!result.success) {
      container.innerHTML = `<div class="text-center text-red-500 py-8">${result.error}</div>`;
      return;
    }

    if (result.cases.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 py-8">
          <p class="text-lg">申請可能な案件がありません</p>
          <p class="text-sm mt-2">配信日から7日以内の案件のみ表示されます</p>
        </div>
      `;
      return;
    }

    container.innerHTML = result.cases.map(c => `
      <div class="border rounded-lg p-4 hover:shadow-lg transition-shadow bg-white">
        <div class="flex justify-between items-start mb-3">
          <div class="flex-1">
            <h4 class="font-semibold text-lg">${c.customerName}</h4>
            <p class="text-sm text-gray-600 mt-1">${c.address}</p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
          <div>
            <span class="text-gray-500">配信日:</span>
            <span class="font-medium">${formatDate(c.deliveredAt)}</span>
          </div>
          <div>
            <span class="text-gray-500">経過:</span>
            <span class="font-medium">${c.daysElapsed}日</span>
          </div>
        </div>
        <div class="mb-3 p-2 bg-orange-50 border border-orange-200 rounded">
          <div class="text-xs text-orange-700">延長後期限（配信日の翌月末）</div>
          <div class="text-sm font-bold text-orange-900">${formatDate(c.extendedDeadline)}</div>
        </div>
        <button onclick="openExtensionModal('${c.cvId}')" class="w-full px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold">
          期限延長申請
        </button>
      </div>
    `).join('');

  } catch (error) {
    console.error('期限延長申請可能案件読み込みエラー:', error);
    document.getElementById('extensionEligibleCasesList').innerHTML = `<div class="text-center text-red-500 py-8">エラーが発生しました</div>`;
  }
}

// ============================================
// 期限延長申請モーダル
// ============================================
async function openExtensionModal(cvId) {
  try {
    const response = await fetch(`${API_URL}?action=getExtensionEligibleCases&merchantId=${currentMerchantId}`);
    const result = await response.json();

    if (!result.success) {
      alert('案件データの取得に失敗しました');
      return;
    }

    const caseData = result.cases.find(c => c.cvId === cvId);
    if (!caseData) {
      alert('案件が見つかりません');
      return;
    }

    document.getElementById('extensionCustomerName').textContent = caseData.customerName;
    document.getElementById('extensionCustomerTel').textContent = caseData.tel;
    document.getElementById('extensionCustomerAddress').textContent = caseData.address;
    document.getElementById('extensionDeliveredAt').textContent = formatDate(caseData.deliveredAt);
    document.getElementById('extensionDaysElapsed').textContent = caseData.daysElapsed;
    document.getElementById('extensionExtendedDeadline').textContent = formatDate(caseData.extendedDeadline);

    // フォームにCVIDを保存
    document.getElementById('extensionApplicationForm').dataset.cvId = cvId;

    document.getElementById('extensionModal').classList.remove('hidden');

  } catch (error) {
    console.error('期限延長申請モーダルエラー:', error);
    alert('エラーが発生しました');
  }
}

function closeExtensionModal() {
  document.getElementById('extensionModal').classList.add('hidden');
  document.getElementById('extensionApplicationForm').reset();
}

// ============================================
// 期限延長申請送信
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  const extensionForm = document.getElementById('extensionApplicationForm');
  if (extensionForm) {
    extensionForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      try {
        const cvId = this.dataset.cvId;
        const contactDate = document.getElementById('extensionContactDate').value;
        const appointmentDate = document.getElementById('extensionAppointmentDate').value;
        const extensionReason = document.getElementById('extensionReason').value;

        const requestData = {
          action: 'submitExtensionRequest',
          merchantId: currentMerchantId,
          merchantName: currentCompanyInfo.companyName,
          applicantName: currentUser.name,
          cvId: cvId,
          contactDate: contactDate,
          appointmentDate: appointmentDate,
          extensionReason: extensionReason
        };

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(requestData)
        });

        const result = await response.json();

        if (result.success) {
          alert('期限延長申請が完了しました');
          closeExtensionModal();
          loadExtensionEligibleCases();
        } else {
          alert(`エラー: ${result.error}`);
        }

      } catch (error) {
        console.error('期限延長申請送信エラー:', error);
        alert('エラーが発生しました');
      }
    });
  }
});

// ============================================
// ユーティリティ関数
// ============================================
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP') + ' ' + date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}
