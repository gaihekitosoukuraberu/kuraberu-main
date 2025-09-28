/**
 * 外壁塗装くらべる - 郵便番号バリデーションモジュールのテスト
 */

import { zipValidator } from '../src/js/modules/zipValidator.js';

describe('郵便番号バリデーションモジュール', () => {
  describe('validate関数', () => {
    test('正しい形式の郵便番号を検証', () => {
      // ハイフンあり
      expect(zipValidator.validate('123-4567')).toBe(true);
      // ハイフンなし
      expect(zipValidator.validate('1234567')).toBe(true);
    });
    
    test('不正な形式の郵便番号を検証', () => {
      // 空文字
      expect(zipValidator.validate('')).toBe(false);
      // null
      expect(zipValidator.validate(null)).toBe(false);
      // undefined
      expect(zipValidator.validate(undefined)).toBe(false);
      // 桁数不足
      expect(zipValidator.validate('123-456')).toBe(false);
      expect(zipValidator.validate('123456')).toBe(false);
      // 桁数超過
      expect(zipValidator.validate('123-45678')).toBe(false);
      expect(zipValidator.validate('12345678')).toBe(false);
      // 文字を含む
      expect(zipValidator.validate('abc-defg')).toBe(false);
      expect(zipValidator.validate('123-abcd')).toBe(false);
      // 形式が不正
      expect(zipValidator.validate('1234-567')).toBe(false);
    });
  });
  
  describe('format関数', () => {
    test('ハイフンなしの郵便番号を整形', () => {
      expect(zipValidator.format('1234567')).toBe('123-4567');
    });
    
    test('ハイフンありの郵便番号はそのまま', () => {
      expect(zipValidator.format('123-4567')).toBe('123-4567');
    });
    
    test('不要な文字を削除して整形', () => {
      expect(zipValidator.format('〒123-4567')).toBe('123-4567');
      expect(zipValidator.format('〒1234567')).toBe('123-4567');
      expect(zipValidator.format('123 4567')).toBe('123-4567');
    });
    
    test('桁数不足の場合はそのまま返す', () => {
      expect(zipValidator.format('123')).toBe('123');
    });
    
    test('空文字の場合は空文字を返す', () => {
      expect(zipValidator.format('')).toBe('');
    });
    
    test('nullの場合は空文字を返す', () => {
      expect(zipValidator.format(null)).toBe('');
    });
  });
  
  describe('getRegionInfo関数', () => {
    test('登録されている郵便番号で地域情報を取得', async () => {
      const result = await zipValidator.getRegionInfo('100-0001');
      
      expect(result).toEqual({
        zipCode: '100-0001',
        prefecture: '東京都',
        city: '千代田区',
        found: true
      });
    });
    
    test('登録されていない郵便番号でデフォルト情報を取得', async () => {
      const result = await zipValidator.getRegionInfo('999-9999');
      
      expect(result).toEqual({
        zipCode: '999-9999',
        prefecture: '東京都',
        city: '新宿区',
        found: false
      });
    });
    
    test('ハイフンなしの郵便番号でも地域情報を取得', async () => {
      const result = await zipValidator.getRegionInfo('1500001');
      
      expect(result).toEqual({
        zipCode: '1500001',
        prefecture: '東京都',
        city: '渋谷区',
        found: true
      });
    });
  });
});