# Claude Code プロジェクト設定

## 🚨 Git運用ルール 🚨

### 安全なpush手順（毎回これに従え）

```bash
# 1. まずローカルの変更をコミット
git add -A && git commit -m "メッセージ"

# 2. リモートの状態を確認
git fetch origin

# 3. 分岐があるか確認
git status
# → "have diverged" の場合のみ pull --rebase

# 4. push
git push
```

### 重要ポイント

- **ローカルの変更は必ず先にコミット** → これでpullしても消えない
- コミット済みなら `git pull --rebase` は安全（ローカルコミットが上に乗る）
- **未コミットの変更がある状態でpullするな** → これが危険

### 自動処理OK

ユーザーに確認不要で以下を実行してよい：
1. `git add -A && git commit` （ローカル変更を保護）
2. `git fetch origin` （確認のみ、変更なし）
3. `git pull --rebase` （コミット済みなら安全）
4. `git push`

**要するに：先にコミットすれば安全。聞かずに進めろ。**

---

## 🛡️ 落ち対策：作業開始時のTODOルール 🛡️

**Claude Codeは頻繁に落ちる。作業が無駄にならないように以下を厳守：**

### 作業開始時（必須）

```bash
# 1. まずTODOリストをGitにコミット
# CURRENT_TODO.md に作業内容を書く
# 2. コミットしてpush
git add CURRENT_TODO.md && git commit -m "TODO: 作業内容" && git push
```

### CURRENT_TODO.md のフォーマット

```markdown
# 現在の作業TODO

## 目標
- [x] 完了したタスク
- [ ] 進行中のタスク
- [ ] 未着手のタスク

## 進捗メモ
- どこまでやったか
- 次に何をするか

## 関連ファイル
- 編集中のファイルパス
```

### なぜ必要か

1. **Claude Codeが落ちても作業内容がGitに残る**
2. **再開時にTODOを読めば即座に続行できる**
3. **ユーザーが状況を把握できる**

### 作業中

- **こまめにコミット**（大きな変更は分割）
- **TODO.mdを進捗に合わせて更新**
- **落ちる前提で動け**

---

---

## キャッシュバスター自動更新

**GitHub Actionsで自動化済み**（`.github/workflows/frontend-deploy.yml`）

- mainにpush → 自動でenv-loader.jsのキャッシュバスター更新
- 手動更新不要
- FTPアップロードも自動実行される

---

## 詳細ワークフロー

詳細は `.github/CLAUDE_WORKFLOW.md` を参照
