// API モジュール
import { validateZipCode } from './zip-validator.js';
import { showLoading, showToast, updatePriceEstimate } from './loading-animation.js';

const API_BASE_URL = '';

const API_ENDPOINTS = {
  LOOKUP_ZIP: '?action=lookupZip',
  SUBMIT_FORM: '?action=submitForm'
};

/**
 * 郵便番号検索API
 * 指定された郵便番号から地域情報と相場を取得します
 * 
 * @param {string} zipCode - 検索する郵便番号
 * @returns {Promise<Object>} - 地域情報と相場データ
 */
export async function lookupZipCode(zipCode) {
  // 郵便番号のバリデーション
  if (!validateZipCode(zipCode)) {
    showToast('郵便番号を正しく入力してください', 'error');
    return Promise.reject(new Error('Invalid zip code'));
  }
  
  // ローディング表示
  const priceEstimate = document.getElementById('price-estimate');
  if (priceEstimate) {
    const originalContent = await showLoading(priceEstimate);
    
    try {
      // API呼び出し
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.LOOKUP_ZIP}&zip=${zipCode}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // エラーチェック
      if (data.error) {
        throw new Error(data.error);
      }
      
      // 相場表示を更新
      updatePriceEstimate(data);
      
      // AIチャットボットを開く
      openAIChatBot();
      
      return data;
    } catch (error) {
      console.error('Lookup error:', error);
      priceEstimate.innerHTML = originalContent;
      showToast('データの取得中にエラーが発生しました', 'error');
      throw error;
    }
  }
}

/**
 * フォーム送信API
 * お問い合わせフォームのデータを送信します
 * 
 * @param {Object} formData - フォームデータ
 * @returns {Promise<Object>} - 送信結果
 */
export async function submitForm(formData) {
  try {
    // 必須フィールドのチェック
    const requiredFields = ['name', 'phone', 'email', 'zipCode', 'address'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      showToast('必須項目が入力されていません', 'error');
      return Promise.reject(new Error('Missing required fields'));
    }
    
    // API呼び出し
    const params = new URLSearchParams();
    params.append('action', 'submitForm');
    
    Object.entries(formData).forEach(([key, value]) => {
      params.append(key, value);
    });
    
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      body: params
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // エラーチェック
    if (data.error) {
      throw new Error(data.error);
    }
    
    // 成功メッセージ
    showToast('お問い合わせを受け付けました。ありがとうございます。', 'success');
    
    return data;
  } catch (error) {
    console.error('Submit error:', error);
    showToast('送信中にエラーが発生しました。後ほど再試行してください。', 'error');
    throw error;
  }
}

/**
 * AIチャットボットを開く
 */
function openAIChatBot() {
  setTimeout(() => {
    const chatbot = document.getElementById('ai-chatbot');
    if (chatbot) {
      chatbot.classList.remove('hidden');
    }
  }, 1000);
}