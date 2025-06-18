/**
 * 郵便番号バリデーションモジュール
 * 日本の郵便番号形式を検証する機能を提供します
 */

/**
 * 郵便番号のバリデーション
 * 有効な日本の郵便番号形式かチェックします
 * 
 * @param {string} zipCode - 検証する郵便番号
 * @returns {boolean} バリデーション結果
 */
export function validateZipCode(zipCode) {
  // 空チェック
  if (!zipCode || typeof zipCode !== 'string') {
    return false;
  }
  
  // ハイフンを削除して数字のみにする
  const cleanZip = zipCode.replace(/[^\d]/g, '');
  
  // 7桁の数字であるかチェック
  return /^\d{7}$/.test(cleanZip);
}

/**
 * 郵便番号のフォーマット
 * ハイフンの有無を正規化します
 * 
 * @param {string} zipCode - 郵便番号
 * @param {boolean} [includeHyphen=true] - ハイフンを含めるかどうか
 * @returns {string} フォーマットされた郵便番号
 */
export function formatZipCode(zipCode, includeHyphen = true) {
  // 数字以外を削除
  const cleanZip = zipCode.replace(/[^\d]/g, '');
  
  // 7桁でない場合はそのまま返す
  if (cleanZip.length !== 7) {
    return zipCode;
  }
  
  // ハイフンありの形式にフォーマット
  if (includeHyphen) {
    return `${cleanZip.substring(0, 3)}-${cleanZip.substring(3)}`;
  }
  
  return cleanZip;
}

/**
 * 郵便番号の正規化
 * 入力された郵便番号を標準形式に変換します
 * 
 * @param {string} zipCode - 正規化する郵便番号
 * @returns {string} 正規化された郵便番号
 */
export function normalizeZipCode(zipCode) {
  // 数字以外を削除して正規化
  return zipCode.replace(/[^\d]/g, '');
}