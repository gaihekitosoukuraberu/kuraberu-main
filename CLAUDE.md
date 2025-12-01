# Claude Code プロジェクト設定

## 🚨🚨🚨 絶対厳守ルール 🚨🚨🚨

### git pull 絶対禁止（ユーザー確認なしで実行するな）

```bash
# ❌ 絶対にやるな
git pull
git pull --rebase
git fetch && git merge

# pushが拒否されたら？
# → 独断でpullするな！ユーザーに確認を取れ！
```

**理由**: 過去に数十時間の作業がpullで上書きされて消失した。ローカルが最新でGitHubが古い場合がある。

**pushが "rejected" されたときの正しい対応:**
1. ユーザーに報告する：「pushが拒否されました。GitHubに新しいコミットがあります。pullしてもよいですか？」
2. ユーザーのOKが出てから初めてpull
3. 独断でpull/rebaseしない

---

## 詳細ワークフロー

詳細は `.github/CLAUDE_WORKFLOW.md` を参照
