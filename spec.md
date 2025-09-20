# Feature Specification: 本部管理画面 (Headquarters Admin Dashboard)

**Feature Branch**: `admin-dashboard`  
**Created**: 2025-01-11  
**Status**: Complete  
**Input**: Painting contractor franchise network headquarters management system

## Execution Flow (main)
```
1. Parse headquarters management requirements
   → System for managing painting contractor franchise network
2. Extract key concepts
   → Actors: HQ staff, franchises, customers
   → Actions: case distribution, financial management, ranking
   → Data: cases, franchises, transactions, rankings
3. Define user scenarios for each module
4. Generate functional requirements for all features
5. Identify key entities and relationships
6. Review completeness
   → All major features specified
7. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT headquarters staff need and WHY
- ✅ Support efficient case distribution and franchise management
- ✅ Enable data-driven decision making

---

## User Scenarios & Testing

### Primary User Story
本部スタッフが塗装工事案件を受け取り、AIを活用しながら最適な加盟店に振り分け、進捗を管理し、財務処理を行い、加盟店のパフォーマンスを評価する統合管理システム。

### Acceptance Scenarios
1. **Given** 新規案件が入った時、**When** 本部スタッフが振り分け画面を開く、**Then** AIが最適な加盟店を推薦し、手動調整も可能
2. **Given** 案件が進行中、**When** ステータスが更新される、**Then** 本部と加盟店の両方のステータスが正確に反映される
3. **Given** 月末処理時、**When** 紹介料計算を実行、**Then** 建物種別を考慮した正確な金額が算出される
4. **Given** 加盟店評価時、**When** ランキングを確認、**Then** ハンディキャップを含む公平な順位が表示される

### Edge Cases
- 複数案件の同時振り分け時の競合処理
- 加盟店が案件を辞退した場合の再振り分け
- システム障害時のデータ整合性維持
- 不正なステータス遷移の防止

## Requirements

### Functional Requirements

#### 案件振り分けシステム
- **FR-001**: システムはAIを使用して最適な加盟店を自動推薦する機能を提供しなければならない
- **FR-002**: 本部スタッフは推薦結果を手動で調整できなければならない
- **FR-003**: システムは「わがままリスト」として加盟店の希望条件を管理できなければならない
- **FR-004**: 振り分け時に建物種別（戸建て/集合住宅）を考慮しなければならない
- **FR-005**: システムは振り分け履歴を保持し、検索可能にしなければならない

#### ステータス管理
- **FR-006**: システムは2層構造のステータス管理（本部ステータス・加盟店個別ステータス）を実装しなければならない
- **FR-007**: 本部ステータス: 未振分→振分済→進行中→完了/キャンセル の遷移を管理
- **FR-008**: 加盟店ステータス: 受信→対応中→見積提出→成約/失注 の遷移を管理
- **FR-009**: ステータス更新時に関係者に自動通知を送信しなければならない

#### 財務管理
- **FR-010**: システムは建物種別による紹介料率の差異を自動計算しなければならない
- **FR-011**: 戸建て: 成約金額の15%、集合住宅: 成約金額の10% の計算ルール
- **FR-012**: 請求書の自動生成と管理機能を提供しなければならない
- **FR-013**: 月次・四半期・年次の財務レポートを生成できなければならない

#### ランキング・評価システム
- **FR-014**: 加盟店のパフォーマンスランキングを自動算出しなければならない
- **FR-015**: ハンディキャップ制度（-3〜+3）を適用した公平な評価を実現
- **FR-016**: 成約率、対応速度、顧客満足度を総合的に評価
- **FR-017**: ランキング結果を可視化するダッシュボードを提供

#### ダッシュボード
- **FR-018**: リアルタイムの案件状況を一覧表示しなければならない
- **FR-019**: 重要KPIを視覚的に表示（グラフ、チャート）
- **FR-020**: アラート機能により要対応案件を強調表示

#### 通信・連携
- **FR-021**: Slack/メールによる自動通知機能を実装
- **FR-022**: LINEボットとの連携によるリアルタイム更新
- **FR-023**: 外部システム（CRM等）とのAPI連携機能

### Key Entities
- **案件（Case）**: 顧客からの塗装工事依頼、建物情報、希望条件を管理
- **加盟店（Franchise）**: 加盟店の基本情報、対応可能エリア、実績、ハンディキャップ
- **振り分け（Assignment）**: 案件と加盟店のマッチング記録、AIスコア、手動調整履歴
- **ステータス履歴（StatusHistory）**: 本部・加盟店の両ステータス変更履歴
- **取引（Transaction）**: 成約情報、紹介料計算、請求書データ
- **評価（Evaluation）**: 成約率、対応速度、顧客満足度のメトリクス
- **わがまま設定（Preference）**: 加盟店ごとの案件受付条件、希望設定

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---