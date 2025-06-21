// モックAPIサービス - 運営本部システム用
export const mockApiService = {
  // 管理者ログイン機能のモック
  async login(credentials) {
    console.log('Mock API: admin login', credentials)
    return new Promise((resolve) => {
      setTimeout(() => {
        // 管理者用の認証情報
        const validCredentials = [
          { email: 'admin@example.com', password: 'admin1234' },
        ]
        
        // 認証チェック（厳密に）
        const isValid = validCredentials.some(cred => 
          cred.email === credentials.email && cred.password === credentials.password
        )
        
        if (isValid) {
          resolve({
            success: true,
            data: {
              token: 'admin-jwt-token-' + Date.now(),
              user: {
                id: 'admin',
                name: '運営本部管理者',
                email: credentials.email || 'admin@example.com',
                role: 'admin',
                adminId: 'admin-001',
                companyName: '外壁リフォーム運営本部',
                contactName: '管理者',
                lastLogin: new Date().toISOString(),
                permissions: ['franchise_management', 'system_admin', 'user_management']
              }
            },
            message: '管理者ログインに成功しました'
          })
        } else {
          resolve({
            success: false,
            data: null,
            message: '認証に失敗しました。メールアドレスとパスワードを確認してください。',
            error: 'Invalid credentials'
          })
        }
      }, 800)
    })
  },

  // フランチャイズ一覧取得のモック
  async getFranchiseList() {
    console.log('Mock API: getFranchiseList')
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: [
            {
              id: 'franchise_001',
              name: '東京第一店',
              companyName: '外壁リフォーム東京株式会社',
              contactName: '田中 太郎',
              email: 'tanaka@tokyo.gaiheki.com',
              phone: '03-1234-5678',
              address: '東京都渋谷区神宮前1-1-1',
              status: 'active',
              joinDate: '2022-04-01',
              lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              monthlyRevenue: 1200000,
              activeInquiries: 8,
              completedInquiries: 156,
              responseRate: 95
            },
            {
              id: 'franchise_002',
              name: '神奈川支店',
              companyName: '横浜外壁工業株式会社',
              contactName: '佐藤 花子',
              email: 'sato@kanagawa.gaiheki.com',
              phone: '045-2345-6789',
              address: '神奈川県横浜市青葉区美しが丘2-2-2',
              status: 'active',
              joinDate: '2022-06-15',
              lastActivity: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              monthlyRevenue: 980000,
              activeInquiries: 12,
              completedInquiries: 203,
              responseRate: 88
            },
            {
              id: 'franchise_003',
              name: '埼玉営業所',
              companyName: '埼玉リフォーム合同会社',
              contactName: '高橋 一郎',
              email: 'takahashi@saitama.gaiheki.com',
              phone: '048-3456-7890',
              address: '埼玉県さいたま市大宮区桜木町3-3-3',
              status: 'inactive',
              joinDate: '2023-01-20',
              lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              monthlyRevenue: 650000,
              activeInquiries: 3,
              completedInquiries: 89,
              responseRate: 72
            }
          ]
        })
      }, 600)
    })
  },

  // フランチャイズ詳細取得のモック
  async getFranchiseDetail(franchiseId) {
    console.log('Mock API: getFranchiseDetail', franchiseId)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            id: franchiseId,
            name: '東京第一店',
            companyName: '外壁リフォーム東京株式会社',
            representativeName: '田中 太郎',
            contactName: '田中 太郎',
            position: '代表取締役',
            email: 'tanaka@tokyo.gaiheki.com',
            phone: '03-1234-5678',
            mobileNumber: '090-1234-5678',
            faxNumber: '03-1234-5679',
            address: '東京都渋谷区神宮前1-1-1 東京ビル3F',
            licenseNumber: '東京都知事許可（般-1）第12345号',
            businessType: '外壁塗装・リフォーム',
            establishedDate: '2020-04-01',
            joinDate: '2022-04-01',
            contractType: 'standard',
            monthlyFee: 50000,
            commissionRate: 15,
            status: 'active',
            website: 'https://tokyo.gaiheki.com',
            notes: '創業以来、高品質なサービスを提供。地域密着型営業で着実に成果を上げている。',
            statistics: {
              totalInquiries: 234,
              completedInquiries: 198,
              totalRevenue: 15600000,
              monthlyRevenue: 1200000,
              responseRate: 95,
              averageRating: 4.8,
              activeInquiries: 8
            }
          }
        })
      }, 500)
    })
  },

  // 全体統計取得のモック
  async getSystemStatistics() {
    console.log('Mock API: getSystemStatistics')
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            totalFranchises: 15,
            activeFranchises: 12,
            totalInquiries: 2847,
            monthlyInquiries: 456,
            totalRevenue: 125600000,
            monthlyRevenue: 8900000,
            averageResponseRate: 89,
            topPerformers: [
              { name: '神奈川支店', revenue: 1200000, inquiries: 23 },
              { name: '東京第一店', revenue: 980000, inquiries: 18 },
              { name: '千葉営業所', revenue: 780000, inquiries: 15 }
            ],
            recentActivity: [
              {
                type: 'franchise_join',
                message: '新しいフランチャイズが加盟しました',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                franchiseName: '群馬支店'
              },
              {
                type: 'high_performance',
                message: '月間目標を達成しました',
                timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                franchiseName: '神奈川支店'
              }
            ]
          }
        })
      }, 700)
    })
  },

  // キャンセル申請一覧取得のモック
  async getCancelRequests() {
    console.log('Mock API: getCancelRequests')
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: [
            {
              id: 'CANCEL_001',
              requestId: 'CANCEL_1735123456789',
              franchiseId: 'franchise_001',
              franchiseName: '東京第一店',
              inquiryId: 'INQ_001',
              inquiryTitle: 'マンション外壁塗装',
              customerName: '田中 太郎',
              reason: 'お客様との連絡が長期間取れない',
              status: '未確認',
              priority: 'high',
              submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              submittedBy: '田中 太郎',
              details: {
                cancelText: 'お客様との連絡が1週間以上取れず、施工スケジュールに影響が出るためキャンセルを申請いたします。',
                contactAttempts: 5,
                lastContactDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
              }
            },
            {
              id: 'CANCEL_002',
              requestId: 'CANCEL_1735023456789',
              franchiseId: 'franchise_002',
              franchiseName: '神奈川支店',
              inquiryId: 'INQ_002',
              inquiryTitle: '戸建て屋根修繕',
              customerName: '佐藤 花子',
              reason: '予算や条件面での合意に至らない',
              status: '承認済み',
              priority: 'medium',
              submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              submittedBy: '佐藤 花子',
              approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
              approvedBy: '運営本部管理者',
              details: {
                cancelText: 'お客様の予算と当社の見積もりに大幅な乖離があり、合意に至らないため。',
                estimatedAmount: 850000,
                customerBudget: 500000
              }
            }
          ]
        })
      }, 600)
    })
  },

  // キャンセル申請詳細取得のモック
  async getCancelRequestDetail(requestId) {
    console.log('Mock API: getCancelRequestDetail', requestId)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            id: requestId,
            requestId: 'CANCEL_1735123456789',
            franchiseId: 'franchise_001',
            franchiseName: '東京第一店',
            franchiseContact: '田中 太郎',
            inquiryId: 'INQ_001',
            inquiryTitle: 'マンション外壁塗装',
            customerName: '田中 太郎',
            customerPhone: '090-1234-5678',
            customerEmail: 'customer@example.com',
            location: '東京都渋谷区神宮前1-1-1',
            workType: '外壁塗装',
            estimatedAmount: 1200000,
            reason: 'お客様との連絡が長期間取れない',
            status: '未確認',
            priority: 'high',
            submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            submittedBy: '田中 太郎',
            cancelText: '【マンション外壁塗装 キャンセル申請について】\n\nいつもお世話になっております。\n\nこの度、以下の案件につきましてキャンセルの申請をさせていただきたく、ご連絡いたします。\n\n■ 案件概要\n・案件名：マンション外壁塗装\n・お客様：田中 太郎様\n・所在地：東京都渋谷区神宮前1-1-1\n・工事種別：外壁塗装\n\n■ キャンセルに至った経緯\nお客様との連絡が1週間以上取れず、複数回の電話・メール・LINE連絡を試みましたが応答がございません。施工スケジュールに影響が出るため、やむを得ずキャンセルとさせていただきます。',
            timeline: [
              {
                date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                action: '初回見積もり提出',
                performer: '田中 太郎'
              },
              {
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                action: 'お客様からの連絡途絶',
                performer: '田中 太郎'
              },
              {
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                action: 'キャンセル申請提出',
                performer: '田中 太郎'
              }
            ]
          }
        })
      }, 500)
    })
  },

  // キャンセル申請承認/却下のモック
  async updateCancelRequestStatus(requestId, status, comment = '') {
    console.log('Mock API: updateCancelRequestStatus', requestId, status, comment)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            requestId,
            status,
            processedAt: new Date().toISOString(),
            processedBy: '運営本部管理者',
            comment
          },
          message: `キャンセル申請を${status === 'approved' ? '承認' : '却下'}しました`
        })
      }, 800)
    })
  },

  // フランチャイズステータス更新のモック
  async updateFranchiseStatus(franchiseId, status) {
    console.log('Mock API: updateFranchiseStatus', franchiseId, status)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: 'フランチャイズステータスを更新しました'
        })
      }, 500)
    })
  },

  // システム設定取得のモック
  async getSystemSettings() {
    console.log('Mock API: getSystemSettings')
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            systemName: '外壁リフォーム運営本部システム',
            version: '1.0.0',
            maintenanceMode: false,
            autoApprovalEnabled: false,
            maxInquiriesPerFranchise: 50,
            defaultCommissionRate: 15,
            systemNotifications: {
              newFranchiseJoin: true,
              cancelRequestSubmitted: true,
              performanceAlert: true
            }
          }
        })
      }, 400)
    })
  },

  // システム設定更新のモック
  async updateSystemSettings(settings) {
    console.log('Mock API: updateSystemSettings', settings)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: 'システム設定を更新しました'
        })
      }, 700)
    })
  },

  // フランチャイズ新規登録のモック
  async createFranchise(franchiseData) {
    console.log('Mock API: createFranchise', franchiseData)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            id: 'franchise_' + Date.now(),
            ...franchiseData,
            status: 'active',
            joinDate: new Date().toISOString(),
            createdAt: new Date().toISOString()
          },
          message: '新しいフランチャイズを登録しました'
        })
      }, 1000)
    })
  },

  // フランチャイズ情報更新のモック
  async updateFranchise(franchiseId, franchiseData) {
    console.log('Mock API: updateFranchise', franchiseId, franchiseData)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            id: franchiseId,
            ...franchiseData,
            updatedAt: new Date().toISOString()
          },
          message: 'フランチャイズ情報を更新しました'
        })
      }, 800)
    })
  }
}

export default mockApiService