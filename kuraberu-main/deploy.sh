#!/usr/bin/env bash
set -e
PROJECT_DIR=~/kuraberu-clean
GAS_DIR="$PROJECT_DIR/gas"
ZIP_TEST=1540000

command -v clasp||npm install -g @google/clasp
[ -f ~/.clasprc.json ]||clasp login

cd "$GAS_DIR"
clasp push -f
VER=$(clasp version "auto $(date +'%F %T')"|grep -o '[0-9]\+')
DEPLOY_ID=$(clasp deployments|awk '/WebApp/{print $2}')
clasp deploy --deploymentId "$DEPLOY_ID" --versionNumber "$VER" --description auto
URL=$(clasp deployments|awk '/WebApp/{print $3}')

perl -pi -e "s|^const API_BASE_URL = .*|const API_BASE_URL = '$URL';|" "$PROJECT_DIR/src/js/api.js"

pkill -f "vite"||true
cd "$PROJECT_DIR"
npm install
npm run dev & disown
sleep 3
open "http://localhost:3000/src/index.html?zip=$ZIP_TEST"
echo "🎉 完了！"