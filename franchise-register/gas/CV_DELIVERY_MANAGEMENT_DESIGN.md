# 配信管理システム 完全設計書

## 📋 概要

CV（顧客）を最大4社の加盟店に配信し、各社の追客活動を個別管理するシステム。
将来的な営業支援機能（カレンダー、AI生成、自動通知等）を見据えた拡張可能な設計。

## 🎯 設計方針

### データ管理
- **縦持ち形式**: 1行 = 1CV × 1加盟店の配信情報
- 1CVに最大4社配信の場合、そのCV IDで4行のレコードが存在
- 各加盟店は自社のレコードのみ操作可能

### アクセス権限
- **加盟店ダッシュボード**: 自社（自分の加盟店ID）のレコードのみ表示・操作
- **アドミンダッシュボード**: 全レコード表示、全体管理、分析

### キャンセル申請時の判定強化
- キャンセル申請が来た時点で、同じCV IDの他社の追客状況を自動判定
- 他社が連絡取れている場合はSlack通知に警告表示し、却下に誘導

---

## 📊 配信管理シート カラム構成（全36カラム）

### 【A. 基本情報】(1-5)
| # | カラム名 | データ型 | 説明 | 例 |
|---|---------|---------|------|-----|
| 1 | レコードID | TEXT | DL + YYMMDDHHmmss + 連番3桁 | DL25111402301001 |
| 2 | CV ID | TEXT | ユーザー登録シートのCV ID | CV1759897538494 |
| 3 | 加盟店ID | TEXT | 配信先の加盟店ID | FR251112004600 |
| 4 | 配信日時 | DATETIME | 配信された日時 | 2025-11-14 10:30:00 |
| 5 | 配信順位 | NUMBER | 配信順位（1-4）視覚的な色分け用 | 1 |

### 【B. ステータス管理】(6-9)
| # | カラム名 | データ型 | 説明 | 選択肢 |
|---|---------|---------|------|--------|
| 6 | 配信ステータス | TEXT | 配信全体のステータス | 配信済み / 辞退 / 成約 / キャンセル承認済み |
| 7 | 詳細ステータス | TEXT | 営業プロセスの詳細ステータス | 未対応 / 追客中 / アポ確定 / 訪問済み / 見積提出済み / 検討中 / 成約 / 辞退 / キャンセル |
| 8 | ステータス更新日時 | DATETIME | ステータスが変更された日時 | 2025-11-14 15:00:00 |
| 9 | 最終更新日時 | DATETIME | レコードの最終更新日時 | 2025-11-14 16:00:00 |

### 【C. 追客カウンター】(10-14)
| # | カラム名 | データ型 | 説明 |
|---|---------|---------|------|
| 10 | 電話回数 | NUMBER | 電話架電回数（自動カウント） |
| 11 | SMS回数 | NUMBER | SMS送信回数（自動カウント） |
| 12 | メール送信回数 | NUMBER | メール送信回数（自動カウント） |
| 13 | 訪問回数 | NUMBER | 訪問回数 |
| 14 | 最終連絡日時 | DATETIME | 最後に連絡した日時 |

### 【D. スケジュール管理】(15-18)
| # | カラム名 | データ型 | 説明 | 用途 |
|---|---------|---------|------|------|
| 15 | 次回連絡予定日時 | DATETIME | 次回の架電予定 | リマインド通知 |
| 16 | アポ予定日時 | DATETIME | アポイント予定日時 | カレンダー表示 |
| 17 | 訪問予定日時 | DATETIME | 現場訪問予定日時 | カレンダー表示 |
| 18 | 見積提出予定日 | DATE | 見積もり提出予定日 | カレンダー表示 |

### 【E. 連絡履歴詳細】(19-20)
| # | カラム名 | データ型 | 説明 | JSON構造 |
|---|---------|---------|------|----------|
| 19 | 連絡履歴JSON | TEXT | 全連絡履歴（JSON配列） | 下記参照 |
| 20 | 連絡履歴サマリー | TEXT | 最新3件のテキスト要約 | 「11/14 10:00 電話: アポ獲得\n11/13 15:00 SMS: 日程調整\n...」 |

**連絡履歴JSON構造:**
```json
[
  {
    "id": "CONTACT001",
    "date": "2025-11-14T10:00:00",
    "type": "電話",
    "duration": "5分",
    "result": "アポ獲得",
    "memo": "来週火曜10時訪問約束。外壁塗装希望",
    "recordedBy": "営業担当A",
    "recordedAt": "2025-11-14T10:05:00"
  },
  {
    "id": "CONTACT002",
    "date": "2025-11-13T15:30:00",
    "type": "SMS",
    "content": "お世話になっております。訪問日程のご確認です...",
    "aiGenerated": true,
    "sentBy": "営業担当A"
  }
]
```

### 【F. リマインド・通知】(21-22)
| # | カラム名 | データ型 | 説明 | JSON構造 |
|---|---------|---------|------|----------|
| 21 | リマインド設定JSON | TEXT | 今後の通知スケジュール | 下記参照 |
| 22 | 通知履歴JSON | TEXT | 送信済み通知の記録 | 下記参照 |

**リマインド設定JSON構造:**
```json
[
  {
    "id": "REM001",
    "type": "次回架電",
    "datetime": "2025-11-15T09:00:00",
    "notified": false,
    "message": "山田様へ架電予定（アポ日時確認）",
    "notificationMethod": "Slack"
  },
  {
    "id": "REM002",
    "type": "訪問予定",
    "datetime": "2025-11-20T09:30:00",
    "notified": false,
    "message": "現場訪問（東京都渋谷区）",
    "notificationMethod": "Slack+メール"
  }
]
```

**通知履歴JSON構造:**
```json
[
  {
    "id": "NOTIF001",
    "type": "次回架電リマインド",
    "sentAt": "2025-11-15T08:45:00",
    "method": "Slack",
    "status": "送信成功"
  }
]
```

### 【G. AI生成コンテンツ】(23-24)
| # | カラム名 | データ型 | 説明 |
|---|---------|---------|------|
| 23 | AI生成SMS文 | TEXT | 最後に生成されたSMS文（再利用可能） |
| 24 | AI生成メール文 | TEXT | 最後に生成されたメール文（再利用可能） |

### 【H. メモ・コメント】(25-27)
| # | カラム名 | データ型 | 説明 |
|---|---------|---------|------|
| 25 | 営業メモ | TEXT | 顧客の反応、要望、注意事項等 |
| 26 | 社内メモ | TEXT | 社内共有事項（顧客には見せない情報） |
| 27 | 顧客反応スコア | NUMBER | 1-5段階（AI分析用、将来の成約予測） |

### 【I. 成約・見積情報】(28-31)
| # | カラム名 | データ型 | 説明 |
|---|---------|---------|------|
| 28 | 見積金額 | NUMBER | 提出した見積金額 |
| 29 | 見積提出日時 | DATETIME | 見積書を提出した日時 |
| 30 | 成約日時 | DATETIME | 成約した日時 |
| 31 | 成約金額 | NUMBER | 実際の成約金額 |

### 【J. 辞退・キャンセル関連】(32-35)
| # | カラム名 | データ型 | 説明 |
|---|---------|---------|------|
| 32 | 辞退理由 | TEXT | 辞退した理由 |
| 33 | 辞退日時 | DATETIME | 辞退した日時 |
| 34 | キャンセル申請ID | TEXT | 紐付くキャンセル申請ID |
| 35 | 期限延長申請ID | TEXT | 紐付く期限延長申請ID |

### 【K. 自動化管理】(36)
| # | カラム名 | データ型 | 説明 |
|---|---------|---------|------|
| 36 | お断りメール送信済みフラグ | BOOLEAN | 他社成約時の自動通知済みフラグ |

---

## 🔄 データフロー

### 1. CV配信時
```
ユーザー登録（CV） → 配信管理シートに4行追加
                      （加盟店A, B, C, D各1行）
```

### 2. 加盟店の追客活動
```
加盟店ダッシュボード → 自社レコードのみ表示
                     → 電話ボタン → 電話回数+1, 連絡履歴JSON追加
                     → SMS送信 → SMS回数+1, AI生成文保存
```

### 3. 成約時の自動化
```
加盟店A成約 → 配信ステータス: 成約
           → 同CV IDの他3社を検索
           → お断りメール自動送信
           → お断りメール送信済みフラグ: TRUE
           → 他3社の配信ステータス: 辞退
```

### 4. キャンセル申請時の他社状況チェック
```
加盟店Aがキャンセル申請
  ↓
同CV IDで他3社のレコードを検索
  ↓
各社の状況をチェック:
  - 電話回数 > 0
  - 最終連絡日時が7日以内
  - 詳細ステータスが「追客中」「アポ確定」等
  ↓
他社で連絡取れている場合:
  Slack通知に警告表示
  「⚠️ 他社で追客中の可能性あり:
   - B社: 電話3回、最終連絡11/13、ステータス:追客中
   - C社: 電話1回、最終連絡11/12、ステータス:未対応

   → 却下を推奨」
```

---

## 🎨 フロントエンド表示イメージ

### 加盟店ダッシュボード（自社のみ表示）
```
┌─────────────────────────────────────────┐
│ 配信案件一覧                             │
├─────────────────────────────────────────┤
│ 🏠 山田太郎様 | 東京都渋谷区              │
│ 配信日: 11/14 | 配信順位: 1位             │
│ ステータス: [追客中▼]                    │
│ 📞 電話: 3回 | 📱 SMS: 2回 | 📧 メール: 0回│
│ 最終連絡: 11/14 10:00                    │
│ 次回予定: 11/15 09:00 (明日)             │
│                                         │
│ [📞 電話する] [📱 SMS送信] [📅 予定登録] │
└─────────────────────────────────────────┘
```

### アドミンダッシュボード（全体表示）
```
┌─────────────────────────────────────────┐
│ CV12345 | 山田太郎様 | 東京都渋谷区       │
├─────────────────────────────────────────┤
│ 🟦 1位: A社（FR2511...）                 │
│   追客中 | 電話3回 SMS2回 | 次回: 明日10:00 │
├─────────────────────────────────────────┤
│ 🟨 2位: B社（FR2512...）                 │
│   アポ確定 | 電話2回 | 訪問予定: 11/20    │
├─────────────────────────────────────────┤
│ 🟧 3位: C社（FR2513...）                 │
│   未対応 | 電話0回                        │
├─────────────────────────────────────────┤
│ ⬜ 4位: D社（FR2514...）                 │
│   未対応 | 電話0回                        │
└─────────────────────────────────────────┘
```

---

## 🤖 将来実装機能との連携

### 1. 追客履歴の簡単記録
**フロント:**
- 「電話した」ボタン → モーダル表示（通話時間、結果、メモ入力）
- 「SMS送信」ボタン → AI生成文 or 手動入力 → 送信 → 履歴記録

**バックエンド（GAS）:**
```javascript
function recordContact(params) {
  // 配信管理シートのレコードを更新
  // - 電話回数 +1
  // - 連絡履歴JSON に新規エントリ追加
  // - 最終連絡日時 更新
  // - 連絡履歴サマリー 再生成
}
```

### 2. カレンダー機能
- 次回連絡予定日時、アポ予定日時、訪問予定日時を集約してカレンダー表示
- Google Calendar連携（将来）

### 3. リマインド通知
**トリガー設定:**
- GASの時間ベーストリガー（毎時実行）
- リマインド設定JSONをチェック
- 通知時刻が到来しているものをSlack送信

```javascript
function checkAndSendReminders() {
  // 配信管理シートの全レコードをスキャン
  // リマインド設定JSONをパース
  // 現在時刻と比較して通知送信
  // 送信済みフラグを更新
}
```

### 4. AI SMS生成
**連携API:**
- OpenAI API（ChatGPT）
- プロンプト: 顧客情報 + 営業メモ + 過去履歴 → SMS文生成

```javascript
function generateSMS(params) {
  const { cvId, merchantId, purpose } = params;

  // CV情報取得
  const cvData = getCVData(cvId);

  // 連絡履歴取得
  const contactHistory = getContactHistory(cvId, merchantId);

  // プロンプト構築
  const prompt = `
    【顧客情報】
    氏名: ${cvData.name}
    地域: ${cvData.prefecture} ${cvData.city}
    希望工事: ${cvData.workType}

    【過去の連絡履歴】
    ${contactHistory}

    【目的】
    ${purpose}

    上記を踏まえて、顧客に送るSMS（70文字以内）を生成してください。
  `;

  // OpenAI API呼び出し
  const generatedText = callOpenAI(prompt);

  // AI生成SMS文カラムに保存
  saveGeneratedSMS(cvId, merchantId, generatedText);

  return generatedText;
}
```

### 5. 成約時の他社自動お断り通知
```javascript
function handleContractSuccess(params) {
  const { cvId, merchantId } = params;

  // 同CV IDの他社レコードを取得
  const otherMerchants = getOtherMerchantsForCV(cvId, merchantId);

  otherMerchants.forEach(record => {
    // お断りメール送信
    sendRejectionEmail({
      to: record.merchantEmail,
      cvName: record.cvName,
      reason: '他社様との契約が決定したため'
    });

    // フラグ更新
    updateRecord(record.recordId, {
      配信ステータス: '辞退',
      お断りメール送信済みフラグ: true,
      辞退理由: '他社成約',
      辞退日時: new Date()
    });
  });
}
```

### 6. キャンセル申請時の他社状況判定強化
```javascript
function checkOtherMerchantsStatus(cvId, merchantId) {
  // 同CV IDの他3社のレコードを取得
  const otherRecords = getOtherMerchantsForCV(cvId, merchantId);

  const alerts = [];

  otherRecords.forEach(record => {
    // 連絡取れている兆候をチェック
    const hasRecentContact = record.最終連絡日時 &&
      (new Date() - new Date(record.最終連絡日時)) < 7 * 24 * 60 * 60 * 1000;

    const hasActiveStatus = ['追客中', 'アポ確定', '訪問済み', '見積提出済み', '検討中'].includes(record.詳細ステータス);

    const hasCallActivity = record.電話回数 > 0;

    if (hasRecentContact || hasActiveStatus || hasCallActivity) {
      alerts.push({
        merchantId: record.加盟店ID,
        merchantName: getMerchantName(record.加盟店ID),
        phoneCount: record.電話回数,
        smsCount: record.SMS回数,
        lastContact: record.最終連絡日時,
        status: record.詳細ステータス
      });
    }
  });

  return {
    hasActiveCompetitors: alerts.length > 0,
    competitorDetails: alerts
  };
}
```

**Slack通知への組み込み:**
```javascript
function sendCancelApplicationNotification(params) {
  const { cvId, merchantId, cancelData } = params;

  // 他社状況チェック
  const competitorCheck = checkOtherMerchantsStatus(cvId, merchantId);

  let warningMessage = '';
  if (competitorCheck.hasActiveCompetitors) {
    warningMessage = '\n\n⚠️ *他社で追客活動が確認されています:*\n';
    competitorCheck.competitorDetails.forEach(comp => {
      warningMessage += `• ${comp.merchantName}\n`;
      warningMessage += `  - 電話: ${comp.phoneCount}回 | SMS: ${comp.smsCount}回\n`;
      warningMessage += `  - 最終連絡: ${comp.lastContact}\n`;
      warningMessage += `  - ステータス: ${comp.status}\n`;
    });
    warningMessage += '\n*→ 却下を推奨*';
  }

  const slackMessage = {
    text: `キャンセル申請通知`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*【キャンセル申請】*\n加盟店: ${cancelData.merchantName}\nCV: ${cancelData.cvName}\n理由: ${cancelData.reason}${warningMessage}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '承認' },
            style: competitorCheck.hasActiveCompetitors ? 'default' : 'primary',
            value: `approve_${cancelData.applicationId}`
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '却下' },
            style: competitorCheck.hasActiveCompetitors ? 'danger' : 'default',
            value: `reject_${cancelData.applicationId}`
          }
        ]
      }
    ]
  };

  sendSlackNotification(slackMessage);
}
```

---

## 📈 データ分析への活用

### 成約率分析
```sql
-- 配信順位別の成約率
SELECT
  配信順位,
  COUNT(*) as 配信数,
  SUM(CASE WHEN 配信ステータス = '成約' THEN 1 ELSE 0 END) as 成約数,
  ROUND(SUM(CASE WHEN 配信ステータス = '成約' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as 成約率
FROM 配信管理
GROUP BY 配信順位;
```

### 追客回数と成約の相関
```sql
SELECT
  電話回数,
  AVG(CASE WHEN 配信ステータス = '成約' THEN 1 ELSE 0 END) as 成約率
FROM 配信管理
GROUP BY 電話回数
ORDER BY 電話回数;
```

### キャンセル申請の妥当性分析
```sql
-- キャンセル申請案件で他社が連絡取れているケース
SELECT
  k.申請ID,
  k.加盟店ID as 申請加盟店,
  COUNT(DISTINCT d.加盟店ID) as 他社追客中の数,
  GROUP_CONCAT(d.加盟店ID) as 追客中加盟店一覧
FROM キャンセル申請 k
JOIN 配信管理 d ON k.CVID = d.CVID AND k.加盟店ID != d.加盟店ID
WHERE d.電話回数 > 0
  AND d.最終連絡日時 > DATE_SUB(k.申請日時, INTERVAL 7 DAY)
GROUP BY k.申請ID
HAVING 他社追客中の数 > 0;
```

---

## 🚀 実装優先順位

### Phase 1: 基盤構築（今回）
- [x] 配信管理シート作成
- [x] テストデータ作成
- [x] キャンセル申請時の他社状況チェック機能
- [x] Slack通知への警告表示

### Phase 2: 基本追客機能
- [ ] 加盟店ダッシュボード（自社案件一覧表示）
- [ ] 電話・SMS・メール記録機能
- [ ] カウンター自動更新
- [ ] 連絡履歴表示

### Phase 3: スケジュール管理
- [ ] 次回連絡予定日設定
- [ ] カレンダー表示
- [ ] リマインド通知（Slack）

### Phase 4: AI機能
- [ ] AI SMS文生成
- [ ] AI メール文生成
- [ ] 顧客反応スコア自動算出

### Phase 5: 自動化
- [ ] 成約時の他社自動お断り通知
- [ ] ステータス自動更新
- [ ] データ分析ダッシュボード

---

## 📝 注意事項

### データ整合性
- CV IDは必ずユーザー登録シートに存在する必要がある
- 1CV × 1加盟店の組み合わせは重複不可
- 配信順位は1-4の範囲内

### パフォーマンス
- 連絡履歴JSONは最大1000件程度に制限（古いものはアーカイブ）
- 全レコードスキャンは避け、CV ID + 加盟店IDでインデックス検索

### セキュリティ
- 加盟店は他社の情報を一切閲覧不可
- APIパラメータで加盟店IDを検証
- JSON構造のバリデーション実施

---

**作成日**: 2025-11-14
**バージョン**: 1.0
**最終更新**: 2025-11-14
