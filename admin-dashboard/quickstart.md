# Admin Dashboard - Quick Start Guide

## 🚀 5分で動作確認

### Prerequisites
```bash
# Required tools
node --version  # v18.0.0+
npm --version   # v9.0.0+
psql --version  # PostgreSQL 14+
redis-cli --version  # Redis 6+
```

### 1. Clone and Install (1 minute)
```bash
# Clone repository
git clone https://github.com/your-org/admin-dashboard.git
cd admin-dashboard

# Install dependencies
npm run install:all
```

### 2. Environment Setup (1 minute)
```bash
# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit backend/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/admin_dashboard
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
PORT=3000

# Edit frontend/.env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000
```

### 3. Database Setup (1 minute)
```bash
# Create database
createdb admin_dashboard

# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed
```

### 4. Start Services (1 minute)
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### 5. Verify Installation (1 minute)
```bash
# Open browser
open http://localhost:5173

# Default credentials
Email: admin@example.com
Password: admin123

# Run health check
curl http://localhost:3000/api/health
```

## 📋 Feature Verification Checklist

### 1. ダッシュボード表示
- [ ] ログイン画面が表示される
- [ ] デフォルト認証情報でログインできる
- [ ] ダッシュボードにKPIが表示される
- [ ] リアルタイム更新が動作する（数値が自動更新）

### 2. 案件振り分け機能
- [ ] 案件一覧が表示される
- [ ] 新規案件を作成できる
- [ ] AI推薦が表示される（トップ3加盟店）
- [ ] 手動で加盟店を選択できる
- [ ] 振り分け完了通知が送信される

### 3. ステータス管理
- [ ] 案件ステータスが表示される
- [ ] ステータスを更新できる
- [ ] 履歴が記録される
- [ ] 2層ステータスが正しく表示される

### 4. 財務管理
- [ ] 取引一覧が表示される
- [ ] 紹介料が自動計算される
- [ ] 建物種別による料率差が適用される
- [ ] 請求書を生成できる

### 5. ランキング表示
- [ ] 加盟店ランキングが表示される
- [ ] ハンディキャップが適用される
- [ ] 詳細メトリクスが確認できる

## 🧪 Quick Test Scenarios

### Scenario 1: 新規案件の振り分け
```bash
# 1. Create test case
curl -X POST http://localhost:3000/api/v1/cases \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerName": "テスト太郎",
    "customerPhone": "090-1234-5678",
    "address": "東京都渋谷区",
    "buildingType": "detached",
    "description": "外壁塗装希望"
  }'

# 2. Check AI recommendations
curl http://localhost:3000/api/v1/cases/{id}/recommendations \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Assign to franchise
curl -X POST http://localhost:3000/api/v1/cases/{id}/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"franchiseId": "F0001"}'
```

### Scenario 2: ステータス更新フロー
```bash
# 1. Update HQ status
curl -X PUT http://localhost:3000/api/v1/cases/{id}/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"hqStatus": "IN_PROGRESS"}'

# 2. Update franchise status
curl -X PUT http://localhost:3000/api/v1/assignments/{id}/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"franchiseStatus": "QUOTED"}'

# 3. Check status history
curl http://localhost:3000/api/v1/cases/{id}/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Scenario 3: 財務処理
```bash
# 1. Create transaction
curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "assignmentId": "assignment-id",
    "contractAmount": 1000000,
    "buildingType": "detached"
  }'

# 2. Generate invoice
curl -X POST http://localhost:3000/api/v1/transactions/{id}/invoice \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Check calculated fee (should be 150,000 for detached)
curl http://localhost:3000/api/v1/transactions/{id} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Check connection
psql -U your_user -d admin_dashboard -c "SELECT 1"

# Reset database if needed
npm run db:reset
```

### Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping

# Clear cache if needed
redis-cli FLUSHDB
```

### Port Conflicts
```bash
# Check port usage
lsof -i :3000  # Backend
lsof -i :5173  # Frontend

# Change ports in .env files if needed
```

### WebSocket Connection Failed
```bash
# Check CORS settings in backend
# Ensure frontend WS_URL matches backend

# Test WebSocket
wscat -c ws://localhost:3000
```

## 📊 Performance Benchmarks

After successful setup, you should see:
- Dashboard load time: < 200ms
- API response time: < 100ms (p95)
- WebSocket latency: < 50ms
- Concurrent users supported: 100+

## 🔍 Verify Against Reference

Compare with https://gaihekikuraberu.com/admin/#/assignment:
- [ ] Left sidebar navigation matches
- [ ] Dashboard layout similar
- [ ] Case assignment flow comparable
- [ ] Status management aligned
- [ ] Overall UX consistent

## 📝 Next Steps

1. **Customize Configuration**
   - Update AI scoring weights in `backend/config/ai.config.ts`
   - Adjust notification channels in `backend/config/notification.config.ts`

2. **Add Test Data**
   - Run `npm run db:seed:large` for 1000+ test cases
   - Import franchise data from CSV

3. **Setup Monitoring**
   - Configure Sentry for error tracking
   - Setup CloudWatch/Datadog for metrics

4. **Deploy to Production**
   - Follow deployment guide in `/docs/deployment.md`
   - Configure CI/CD pipeline

## 🆘 Support

- Documentation: `/docs/`
- API Reference: `http://localhost:3000/api/docs`
- Issues: https://github.com/your-org/admin-dashboard/issues

---

✅ **Success Criteria**: All checkboxes above should be checked for successful quickstart completion.