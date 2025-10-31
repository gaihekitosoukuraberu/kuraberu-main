#!/bin/bash

echo "=== GASデプロイ準備 ==="

# 現在のディレクトリ確認
echo "現在のディレクトリ: $(pwd)"

# .clasprc.jsonの存在確認
if [ ! -f ".clasprc.json" ]; then
    echo "❌ .clasprc.jsonが見つかりません"
    exit 1
fi

echo "✅ .clasprc.json確認OK"

# clasp pushを実行
echo "📤 GASへのプッシュを開始..."
clasp push

if [ $? -eq 0 ]; then
    echo "✅ プッシュ成功"
    echo ""
    echo "=== 次の手順 ==="
    echo "1. Google Apps Scriptエディタを開く"
    echo "2. 'recreateFranchiseSheet' 関数を実行"
    echo "3. 新しいウェブアプリとしてデプロイ"
    echo "4. 新しいURLをconfig.jsとgas-submit.jsに設定"
else
    echo "❌ プッシュ失敗"
    exit 1
fi