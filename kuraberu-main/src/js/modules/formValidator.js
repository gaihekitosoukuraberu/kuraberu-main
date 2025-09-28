/**
 * フォームバリデーションモジュール
 * 
 * フォームの入力検証を行う機能を提供します。
 */

import { zipValidator } from './zipValidator.js';

/**
 * フォームバリデーションを設定します
 */
export function setupFormValidation() {
  // 郵便番号入力フィールドのバリデーション設定
  setupPostalCodeValidation();
  
  // Eメール入力フィールドのバリデーション設定
  setupEmailValidation();
  
  // 電話番号入力フィールドのバリデーション設定
  setupPhoneValidation();
  
  // 必須フィールドのバリデーション設定
  setupRequiredFieldValidation();
}

/**
 * 郵便番号入力フィールドのバリデーションを設定
 */
function setupPostalCodeValidation() {
  const postalInputs = document.querySelectorAll('input[name="postalCode"]');
  
  postalInputs.forEach(input => {
    // 入力中の整形処理
    input.addEventListener('input', (e) => {
      let value = e.target.value;
      
      // 数字とハイフン以外を除去
      value = value.replace(/[^\d-]/g, '');
      
      // XXX-XXXXの形式に整形（入力途中でも）
      if (value.length > 3 && !value.includes('-')) {
        value = `${value.substring(0, 3)}-${value.substring(3)}`;
      }
      
      // 最大8文字（ハイフン含む）
      if (value.length > 8) {
        value = value.substring(0, 8);
      }
      
      e.target.value = value;
    });
    
    // フォーカスを失ったときの検証
    input.addEventListener('blur', (e) => {
      const value = e.target.value;
      if (value && !zipValidator.validate(value)) {
        // エラーを表示
        showInputError(input, '正しい郵便番号を入力してください（例: 123-4567）');
      } else {
        // エラーを非表示
        hideInputError(input);
      }
    });
  });
}

/**
 * Eメール入力フィールドのバリデーションを設定
 */
function setupEmailValidation() {
  const emailInputs = document.querySelectorAll('input[type="email"]');
  
  emailInputs.forEach(input => {
    input.addEventListener('blur', (e) => {
      const value = e.target.value;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (value && !emailRegex.test(value)) {
        showInputError(input, '正しいメールアドレスを入力してください');
      } else {
        hideInputError(input);
      }
    });
  });
}

/**
 * 電話番号入力フィールドのバリデーションを設定
 */
function setupPhoneValidation() {
  const phoneInputs = document.querySelectorAll('input[type="tel"]');
  
  phoneInputs.forEach(input => {
    // 入力中の整形処理
    input.addEventListener('input', (e) => {
      let value = e.target.value;
      
      // 数字とハイフン以外を除去
      value = value.replace(/[^\d-]/g, '');
      
      e.target.value = value;
    });
    
    // フォーカスを失ったときの検証
    input.addEventListener('blur', (e) => {
      const value = e.target.value;
      const phoneRegex = /^[\d-]{10,13}$/;
      
      if (value && !phoneRegex.test(value)) {
        showInputError(input, '正しい電話番号を入力してください（例: 03-1234-5678）');
      } else {
        hideInputError(input);
      }
    });
  });
}

/**
 * 必須フィールドのバリデーションを設定
 */
function setupRequiredFieldValidation() {
  const requiredInputs = document.querySelectorAll('input[required], textarea[required], select[required]');
  
  requiredInputs.forEach(input => {
    input.addEventListener('blur', (e) => {
      const value = e.target.value.trim();
      
      if (!value) {
        showInputError(input, 'この項目は必須です');
      } else {
        hideInputError(input);
      }
    });
  });
}

/**
 * 入力エラーを表示
 * @param {HTMLElement} input - 入力要素
 * @param {string} message - エラーメッセージ
 */
function showInputError(input, message) {
  // 既存のエラーメッセージがあれば削除
  hideInputError(input);
  
  // エラー表示用の要素を作成
  const errorElement = document.createElement('div');
  errorElement.className = 'input-error text-red';
  errorElement.textContent = message;
  errorElement.style.fontSize = '0.75rem';
  errorElement.style.color = 'var(--kuraberu-red)';
  errorElement.style.marginTop = '0.25rem';
  
  // エラーIDを設定
  const errorId = `error-${input.id || Math.random().toString(36).substring(2, 9)}`;
  errorElement.id = errorId;
  input.setAttribute('aria-describedby', errorId);
  
  // エラースタイルを適用
  input.classList.add('input-error');
  input.style.borderColor = 'var(--kuraberu-red)';
  
  // 親要素にエラー要素を追加
  const parent = input.parentElement;
  parent.appendChild(errorElement);
}

/**
 * 入力エラーを非表示
 * @param {HTMLElement} input - 入力要素
 */
function hideInputError(input) {
  // エラースタイルを削除
  input.classList.remove('input-error');
  input.style.borderColor = '';
  input.removeAttribute('aria-describedby');
  
  // 既存のエラーメッセージを削除
  const parent = input.parentElement;
  const errorElement = parent.querySelector('.input-error');
  
  if (errorElement) {
    parent.removeChild(errorElement);
  }
}

/**
 * フォーム全体の検証
 * @param {HTMLFormElement} form - 検証するフォーム
 * @returns {boolean} 検証結果
 */
export function validateForm(form) {
  let isValid = true;
  
  // 必須フィールドの検証
  const requiredInputs = form.querySelectorAll('input[required], textarea[required], select[required]');
  requiredInputs.forEach(input => {
    const value = input.value.trim();
    
    if (!value) {
      showInputError(input, 'この項目は必須です');
      isValid = false;
    }
  });
  
  // 郵便番号の検証
  const postalInputs = form.querySelectorAll('input[name="postalCode"]');
  postalInputs.forEach(input => {
    const value = input.value;
    
    if (value && !zipValidator.validate(value)) {
      showInputError(input, '正しい郵便番号を入力してください（例: 123-4567）');
      isValid = false;
    }
  });
  
  // Eメールの検証
  const emailInputs = form.querySelectorAll('input[type="email"]');
  emailInputs.forEach(input => {
    const value = input.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (value && !emailRegex.test(value)) {
      showInputError(input, '正しいメールアドレスを入力してください');
      isValid = false;
    }
  });
  
  // 電話番号の検証
  const phoneInputs = form.querySelectorAll('input[type="tel"]');
  phoneInputs.forEach(input => {
    const value = input.value;
    const phoneRegex = /^[\d-]{10,13}$/;
    
    if (value && !phoneRegex.test(value)) {
      showInputError(input, '正しい電話番号を入力してください（例: 03-1234-5678）');
      isValid = false;
    }
  });
  
  return isValid;
}