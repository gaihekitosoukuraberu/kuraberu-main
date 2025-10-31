/**
 * 入力バリデーション関数群
 */

/**
 * ひらがなを全角カタカナに変換
 */
function toKatakana(str) {
    return str.replace(/[\u3041-\u3096]/g, function(match) {
        const chr = match.charCodeAt(0) + 0x60;
        return String.fromCharCode(chr);
    });
}

/**
 * 半角カナを全角カタカナに変換
 */
function toFullKana(str) {
    const halfKanaMap = {
        'ｶﾞ': 'ガ', 'ｷﾞ': 'ギ', 'ｸﾞ': 'グ', 'ｹﾞ': 'ゲ', 'ｺﾞ': 'ゴ',
        'ｻﾞ': 'ザ', 'ｼﾞ': 'ジ', 'ｽﾞ': 'ズ', 'ｾﾞ': 'ゼ', 'ｿﾞ': 'ゾ',
        'ﾀﾞ': 'ダ', 'ﾁﾞ': 'ヂ', 'ﾂﾞ': 'ヅ', 'ﾃﾞ': 'デ', 'ﾄﾞ': 'ド',
        'ﾊﾞ': 'バ', 'ﾋﾞ': 'ビ', 'ﾌﾞ': 'ブ', 'ﾍﾞ': 'ベ', 'ﾎﾞ': 'ボ',
        'ﾊﾟ': 'パ', 'ﾋﾟ': 'ピ', 'ﾌﾟ': 'プ', 'ﾍﾟ': 'ペ', 'ﾎﾟ': 'ポ',
        'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
        'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
        'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
        'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
        'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
        'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
        'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
        'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
        'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
        'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン',
        'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ',
        'ｯ': 'ッ', 'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ',
        'ｰ': 'ー', '･': '・'
    };

    // 濁点・半濁点付きを先に変換
    let result = str;
    for (const [half, full] of Object.entries(halfKanaMap)) {
        if (half.length === 2) {
            result = result.replace(new RegExp(half, 'g'), full);
        }
    }
    // 通常の文字を変換
    for (const [half, full] of Object.entries(halfKanaMap)) {
        if (half.length === 1) {
            result = result.replace(new RegExp(half, 'g'), full);
        }
    }
    return result;
}

/**
 * 郵便番号フォーマット（自動ハイフン挿入）
 */
function formatPostalCode(value) {
    // 数字以外を削除
    const numbers = value.replace(/[^\d]/g, '');

    // 7桁を超える場合は7桁に制限
    const limited = numbers.substring(0, 7);

    // 3桁-4桁の形式にフォーマット
    if (limited.length > 3) {
        return limited.substring(0, 3) + '-' + limited.substring(3);
    }
    return limited;
}

/**
 * 電話番号フォーマット（自動ハイフン挿入）
 */
function formatPhoneNumber(value) {
    // 数字以外を削除
    const numbers = value.replace(/[^\d]/g, '');

    // 11桁を超える場合は11桁に制限
    const limited = numbers.substring(0, 11);

    // 携帯電話（11桁）
    if (limited.startsWith('0') && (limited.startsWith('070') || limited.startsWith('080') || limited.startsWith('090'))) {
        if (limited.length > 7) {
            return limited.substring(0, 3) + '-' + limited.substring(3, 7) + '-' + limited.substring(7);
        } else if (limited.length > 3) {
            return limited.substring(0, 3) + '-' + limited.substring(3);
        }
        return limited;
    }

    // 市外局番が03や06などの場合（10桁）
    if (limited.startsWith('03') || limited.startsWith('06')) {
        if (limited.length > 6) {
            return limited.substring(0, 2) + '-' + limited.substring(2, 6) + '-' + limited.substring(6);
        } else if (limited.length > 2) {
            return limited.substring(0, 2) + '-' + limited.substring(2);
        }
        return limited;
    }

    // その他の市外局番（10桁）
    if (limited.startsWith('0')) {
        // 一般的な形式（0XX-XXX-XXXX または 0XXX-XX-XXXX）
        if (limited.length > 6) {
            // エリアコードによって分割位置を判定
            const areaCode = limited.substring(0, 4);
            if (areaCode.match(/^0[1-9]{3}/)) {
                // 4桁-2桁-4桁 パターン
                return limited.substring(0, 4) + '-' + limited.substring(4, 6) + '-' + limited.substring(6);
            } else {
                // 3桁-3桁-4桁 パターン
                return limited.substring(0, 3) + '-' + limited.substring(3, 6) + '-' + limited.substring(6);
            }
        } else if (limited.length > 3) {
            return limited.substring(0, 3) + '-' + limited.substring(3);
        }
    }

    return limited;
}

/**
 * URLバリデーション
 */
function validateURL(url) {
    // 空の場合はOK（任意項目）
    if (!url || url.trim() === '') {
        return true;
    }

    // http:// または https:// で始まるかチェック
    const pattern = /^https?:\/\/([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/;
    return pattern.test(url);
}

/**
 * メールアドレスバリデーション
 */
function validateEmail(email) {
    if (!email || email.trim() === '') {
        return false;
    }
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
}

/**
 * 番地フォーマット（半角数字・ハイフン・英字のみ許可）
 */
function formatAddress(value) {
    // 全角数字を半角に変換
    let result = value.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    // 全角ハイフンを半角に変換
    result = result.replace(/[－‐―ー]/g, '-');
    // 全角英字を半角に変換
    result = result.replace(/[Ａ-Ｚａ-ｚ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    // 全角スペースを半角に変換
    result = result.replace(/　/g, ' ');
    return result;
}

/**
 * 数字のみを抽出
 */
function extractNumbers(value) {
    return value.replace(/[^0-9０-９]/g, '').replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
}

/**
 * 入力フィールドにバリデーションを設定
 */
function setupValidation() {
    // カナ入力フィールド（全角カタカナのみ許可）
    const kanaFields = document.querySelectorAll('input[id*="Kana"], input[placeholder*="カナ"], input[placeholder*="カタカナ"]');
    kanaFields.forEach(field => {
        // 入力時にリアルタイムで全角カタカナに変換
        field.addEventListener('input', function(e) {
            let value = e.target.value;
            // ひらがな→カタカナ変換
            value = toKatakana(value);
            // 半角カナ→全角カナ変換
            value = toFullKana(value);
            // 全角カタカナ、長音、中黒、スペース以外を削除
            // Unicode範囲: \u30A0-\u30FF はカタカナ全体をカバー
            value = value.replace(/[^\u30A0-\u30FF\u3000\s・]/g, '');
            // 半角スペースを全角スペースに変換
            value = value.replace(/ /g, '　');
            e.target.value = value;
        });

        // ペースト時も処理
        field.addEventListener('paste', function(e) {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            let value = text;
            // ひらがな→カタカナ変換
            value = toKatakana(value);
            // 半角カナ→全角カナ変換
            value = toFullKana(value);
            // 全角カタカナ、長音、中黒、スペース以外を削除
            value = value.replace(/[^\u30A0-\u30FF\u3000\s・]/g, '');
            // 半角スペースを全角スペースに変換
            value = value.replace(/ /g, '　');
            e.target.value = value;
        });
    });

    // 郵便番号フィールド（数字のみ許可、自動ハイフン）
    const postalFields = document.querySelectorAll('input[placeholder*="郵便番号"], input[id*="postalCode"], input[id*="PostalCode"], input[placeholder*="123-4567"]');
    postalFields.forEach(field => {
        field.addEventListener('input', function(e) {
            // 数字のみ抽出
            let value = extractNumbers(e.target.value);
            // 7桁まで制限
            value = value.substring(0, 7);
            // ハイフン自動挿入
            if (value.length > 3) {
                value = value.substring(0, 3) + '-' + value.substring(3);
            }
            e.target.value = value;
        });

        field.addEventListener('paste', function(e) {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            let value = extractNumbers(text);
            value = value.substring(0, 7);
            if (value.length > 3) {
                value = value.substring(0, 3) + '-' + value.substring(3);
            }
            e.target.value = value;
        });

        field.addEventListener('blur', function(e) {
            const value = e.target.value.replace(/-/g, '');
            if (value && value.length !== 7) {
                field.classList.add('border-red-500');
                showFieldError(field, '郵便番号は7桁で入力してください');
            } else {
                field.classList.remove('border-red-500');
                hideFieldError(field);
            }
        });
    });

    // 電話番号フィールド（数字のみ許可、自動ハイフン）
    const phoneFields = document.querySelectorAll('input[type="tel"], input[placeholder*="電話番号"], input[id*="phone"], input[id*="Phone"], input[placeholder*="03-"]');
    phoneFields.forEach(field => {
        field.addEventListener('input', function(e) {
            // 数字のみ抽出
            let value = extractNumbers(e.target.value);
            // 11桁まで制限
            value = value.substring(0, 11);
            // ハイフン自動挿入
            e.target.value = formatPhoneNumber(value);
        });

        field.addEventListener('paste', function(e) {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            let value = extractNumbers(text);
            value = value.substring(0, 11);
            e.target.value = formatPhoneNumber(value);
        });

        field.addEventListener('blur', function(e) {
            const value = e.target.value.replace(/-/g, '');
            if (value && (value.length < 10 || value.length > 11)) {
                field.classList.add('border-red-500');
                showFieldError(field, '電話番号は10桁または11桁で入力してください');
            } else {
                field.classList.remove('border-red-500');
                hideFieldError(field);
            }
        });
    });

    // URLフィールド
    const urlFields = document.querySelectorAll('input[type="url"], input[placeholder*="https://"], input[id*="website"], input[id*="Website"]');
    urlFields.forEach(field => {
        field.addEventListener('blur', function(e) {
            const value = e.target.value.trim();
            if (value && !validateURL(value)) {
                field.classList.add('border-red-500');
                showFieldError(field, '正しいURL形式で入力してください（例: https://example.com）');
            } else {
                field.classList.remove('border-red-500');
                hideFieldError(field);
            }
        });
    });

    // メールアドレスフィールド
    const emailFields = document.querySelectorAll('input[type="email"], input[placeholder*="@"], input[id*="email"], input[id*="Email"]');
    emailFields.forEach(field => {
        field.addEventListener('blur', function(e) {
            const value = e.target.value.trim();
            if (value && !validateEmail(value)) {
                field.classList.add('border-red-500');
                showFieldError(field, '正しいメールアドレス形式で入力してください');
            } else {
                field.classList.remove('border-red-500');
                hideFieldError(field);
            }
        });
    });

    // 住所（番地）フィールド（半角英数字・ハイフン・スペースのみ）
    const addressFields = document.querySelectorAll('input[id="address"], input[placeholder*="番地"], input[placeholder*="ABC"], input[placeholder*="1-2-3"]');
    addressFields.forEach(field => {
        field.addEventListener('input', function(e) {
            // 全角→半角変換
            let value = formatAddress(e.target.value);
            // 半角英数字、ハイフン、スペース、スラッシュ、カッコ以外を削除
            value = value.replace(/[^0-9a-zA-Z\-\s\/\(\)]/g, '');
            e.target.value = value;
        });

        field.addEventListener('paste', function(e) {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            let value = formatAddress(text);
            value = value.replace(/[^0-9a-zA-Z\-\s\/\(\)]/g, '');
            e.target.value = value;
        });
    });

    // 市区町村フィールド（漢字・ひらがな・カタカナ・英数字）
    const cityFields = document.querySelectorAll('input[id="city"], input[placeholder*="市区町村"]');
    cityFields.forEach(field => {
        field.addEventListener('input', function(e) {
            // 絵文字や特殊記号を削除（漢字・ひらがな・カタカナ・英数字は許可）
            let value = e.target.value;
            // 絵文字を削除
            value = value.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '');
            e.target.value = value;
        });
    });

    // 設立年月フィールド（数字と年月のみ）
    const establishedFields = document.querySelectorAll('input[id*="established"], input[placeholder*="2010年"]');
    establishedFields.forEach(field => {
        field.addEventListener('input', function(e) {
            let value = e.target.value;
            // 全角数字を半角に変換
            value = value.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
            // 数字、年、月以外を削除
            value = value.replace(/[^0-9年月]/g, '');
            e.target.value = value;
        });
    });
}

/**
 * フィールドエラー表示
 */
function showFieldError(field, message) {
    // 既存のエラーメッセージを削除
    hideFieldError(field);

    // エラーメッセージを作成
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error-message text-red-500 text-xs mt-1';
    errorDiv.textContent = message;

    // フィールドの後に挿入
    field.parentNode.insertBefore(errorDiv, field.nextSibling);
}

/**
 * フィールドエラー非表示
 */
function hideFieldError(field) {
    const error = field.parentNode.querySelector('.field-error-message');
    if (error) {
        error.remove();
    }
}

// DOMロード時にバリデーションを設定
document.addEventListener('DOMContentLoaded', setupValidation);

// Step変更時にも再設定（動的に追加されるフィールド対応）
window.addEventListener('stepChanged', setupValidation);

// グローバルに公開
window.toKatakana = toKatakana;
window.toFullKana = toFullKana;
window.formatPostalCode = formatPostalCode;
window.formatPhoneNumber = formatPhoneNumber;
window.formatAddress = formatAddress;
window.validateURL = validateURL;
window.validateEmail = validateEmail;