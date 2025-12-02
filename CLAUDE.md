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

## 詳細ワークフロー

詳細は `.github/CLAUDE_WORKFLOW.md` を参照
