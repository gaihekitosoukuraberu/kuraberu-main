import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

// Mock JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// Mock users with different roles and permissions  - Moved here to be accessible everywhere
const mockUsers = {
  'admin@franchise.com': {
    id: '1',
    email: 'admin@franchise.com',
    password: 'Admin123!',
    name: '管理者',
    role: 'admin',
    permissions: 'all', // Admin has all permissions
  },
  'tanaka@sales.com': {
    id: '2',
    email: 'tanaka@sales.com',
    password: 'Sales123!',
    name: '田中 太郎',
    role: 'sales',
    permissionLevel: 'leader',
    permissions: {
      // 案件関連権限
      'cases.viewOthers': true,
      'cases.viewAll': true,
      'cases.delete': false,
      'cases.assignOthers': true,
      'cases.unlimitedStatusChange': false,
      // 会社情報権限
      'company.view': true,
      'company.edit': false,
      'company.viewContracts': true,
      'company.viewAreas': true,
      'company.editAreas': false,
      // 配信設定権限
      'distribution.view': true,
      'distribution.toggle': true,
      'distribution.editConditions': false,
      'distribution.editLimits': false,
      'distribution.suspend': true,
      // 営業管理権限
      'sales.view': true,
      'sales.create': false,
      'sales.edit': false,
      'sales.delete': false,
      'sales.changePermissions': false,
      // 財務情報権限
      'finance.viewDeposit': true,
      'finance.viewDepositDetails': true,
      'finance.requestDeposit': false,
      'finance.viewBilling': true,
      'finance.downloadInvoice': true,
      'finance.viewCompanySales': true,
      'finance.viewOthersSales': true,
      // 申請・報告権限
      'reports.cancelRequest': true,
      'reports.contractReport': true,
      'reports.approveContract': true,
      'reports.viewHistory': true,
      // データ管理権限
      'data.csvExport': true,
      'data.import': false,
      'data.deleteAll': false,
      'data.deleteOthersMemo': false,
      'data.bulkEdit': false,
      // 分析・レポート権限
      'analytics.viewDetailed': true,
      'analytics.viewRankings': true,
      'analytics.viewAreaAnalysis': true,
      'analytics.createCustomReport': false,
    },
  },
  'yamada@sales.com': {
    id: '3',
    email: 'yamada@sales.com',
    password: 'Sales123!',
    name: '山田 花子',
    role: 'sales',
    permissionLevel: 'standard',
    permissions: {
      // 案件関連権限 - 基本権限のみ
      'cases.viewOthers': false,
      'cases.viewAll': false,
      'cases.delete': false,
      'cases.assignOthers': false,
      'cases.unlimitedStatusChange': false,
      // 会社情報権限
      'company.view': true,
      'company.edit': false,
      'company.viewContracts': true,
      'company.viewAreas': false,
      'company.editAreas': false,
      // 配信設定権限
      'distribution.view': true,
      'distribution.toggle': false,
      'distribution.editConditions': false,
      'distribution.editLimits': false,
      'distribution.suspend': false,
      // その他はすべてfalse
      'sales.view': false,
      'finance.viewDeposit': false,
      'reports.cancelRequest': true,
      'reports.contractReport': true,
      'data.csvExport': false,
      'analytics.viewDetailed': false,
    },
  },
  'sato@sales.com': {
    id: '4',
    email: 'sato@sales.com',
    password: 'Sales123!',
    name: '佐藤 次郎',
    role: 'sales',
    permissionLevel: 'rookie',
    permissions: {
      // 新人営業 - 最小権限
      'company.view': true,
      'distribution.view': true,
      // その他すべてfalse
    },
  },
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Mock current user endpoint
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user by email from decoded token
    const userEmail = decoded.email;
    const userAccount = mockUsers[userEmail];
    
    if (userAccount) {
      res.json({
        id: userAccount.id,
        email: userAccount.email,
        name: userAccount.name,
        role: userAccount.role,
        permissionLevel: userAccount.permissionLevel,
        permissions: userAccount.permissions,
      });
    } else {
      // Default for backwards compatibility
      res.json({
        id: '1',
        email: 'admin@franchise.com',
        name: '管理者',
        role: 'admin',
        permissions: 'all',
      });
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Mock auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email, password }); // Debug log
  
  // Find user by email
  const userAccount = mockUsers[email];
  
  if (userAccount && userAccount.password === password) {
    const user = {
      id: userAccount.id,
      email: userAccount.email,
      name: userAccount.name,
      role: userAccount.role,
      permissionLevel: userAccount.permissionLevel,
      permissions: userAccount.permissions,
    };
    
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        permissions: user.permissions,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('Login successful for:', email);
    
    res.json({
      user,
      accessToken,
      refreshToken,
    });
  } else {
    console.log('Login failed - invalid credentials');
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  try {
    jwt.verify(refreshToken, JWT_SECRET);
    
    const newAccessToken = jwt.sign(
      { userId: '1', email: 'admin@franchise.com', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({
      accessToken: newAccessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Mock dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
  res.json({
    totalCases: 152,
    activeCases: 48,
    completedCases: 89,
    conversionRate: 58.6,
    monthlyRevenue: 4850000,
    pendingPayments: 1200000,
    recentActivity: [
      {
        id: '1',
        type: 'case_created',
        description: '案件 C10001 が作成されました',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'case_assigned',
        description: '案件 C10002 が割り当てられました',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '3',
        type: 'status_changed',
        description: '案件 C09998 のステータスが変更されました',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
  });
});

// Mock notifications
app.get('/api/dashboard/notifications', (req, res) => {
  res.json({
    count: 3,
    data: [
      {
        id: '1',
        type: 'case_assigned',
        message: '新しい案件が割り当てられました',
        createdAt: new Date().toISOString(),
        read: false,
      },
      {
        id: '2',
        type: 'payment_received',
        message: '入金を確認しました',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        read: false,
      },
      {
        id: '3',
        type: 'system',
        message: 'システムメンテナンスのお知らせ',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        read: true,
      },
    ],
  });
});

// Mock cases endpoint
app.get('/api/cases', (req, res) => {
  res.json({
    data: [
      {
        id: '1',
        caseNumber: 'C10001',
        customerName: '田中太郎',
        phoneNumber: '090-1234-5678',
        address: { prefecture: '東京都', city: '渋谷区' },
        status: 'assigned',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        caseNumber: 'C10002',
        customerName: '山田花子',
        phoneNumber: '080-9876-5432',
        address: { prefecture: '神奈川県', city: '横浜市' },
        status: 'hearing_scheduled',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    total: 2,
    page: 1,
    totalPages: 1,
  });
});

// Mock sales accounts with permissions
app.get('/api/sales/accounts', (req, res) => {
  res.json({
    data: [
      {
        id: '1',
        name: '田中 太郎',
        email: 'tanaka@example.com',
        phoneNumber: '090-1234-5678',
        caseCount: 15,
        permissionLevel: 'leader',
        lastLogin: '2024-01-10 14:30',
        status: 'active',
        permissions: {
          // 案件関連権限
          'cases.viewOthers': true,
          'cases.viewAll': true,
          'cases.delete': false,
          'cases.assignOthers': true,
          'cases.unlimitedStatusChange': false,
          // 会社情報権限
          'company.view': true,
          'company.edit': false,
          'company.viewContracts': true,
          'company.viewAreas': true,
          'company.editAreas': false,
          // 配信設定権限
          'distribution.view': true,
          'distribution.toggle': true,
          'distribution.editConditions': false,
          'distribution.editLimits': false,
          'distribution.suspend': true,
          // 営業管理権限
          'sales.view': true,
          'sales.create': false,
          'sales.edit': false,
          'sales.delete': false,
          'sales.changePermissions': false,
          // 財務情報権限
          'finance.viewDeposit': true,
          'finance.viewDepositDetails': true,
          'finance.requestDeposit': false,
          'finance.viewBilling': true,
          'finance.downloadInvoice': true,
          'finance.viewCompanySales': true,
          'finance.viewOthersSales': true,
          // 申請・報告権限
          'reports.cancelRequest': true,
          'reports.contractReport': true,
          'reports.approveContract': true,
          'reports.viewHistory': true,
          // データ管理権限
          'data.csvExport': true,
          'data.import': false,
          'data.deleteAll': false,
          'data.deleteOthersMemo': false,
          'data.bulkEdit': false,
          // 分析・レポート権限
          'analytics.viewDetailed': true,
          'analytics.viewRankings': true,
          'analytics.viewAreaAnalysis': true,
          'analytics.createCustomReport': false,
        },
      },
      {
        id: '2',
        name: '山田 花子',
        email: 'yamada@example.com',
        phoneNumber: '080-9876-5432',
        caseCount: 8,
        permissionLevel: 'standard',
        lastLogin: '2024-01-10 09:15',
        status: 'active',
        permissions: {
          // 案件関連権限
          'cases.viewOthers': false,
          'cases.viewAll': false,
          'cases.delete': false,
          'cases.assignOthers': false,
          'cases.unlimitedStatusChange': false,
          // 会社情報権限
          'company.view': true,
          'company.edit': false,
          'company.viewContracts': true,
          'company.viewAreas': false,
          'company.editAreas': false,
          // 配信設定権限
          'distribution.view': true,
          'distribution.toggle': false,
          'distribution.editConditions': false,
          'distribution.editLimits': false,
          'distribution.suspend': false,
          // 営業管理権限
          'sales.view': false,
          'sales.create': false,
          'sales.edit': false,
          'sales.delete': false,
          'sales.changePermissions': false,
          // 財務情報権限
          'finance.viewDeposit': false,
          'finance.viewDepositDetails': false,
          'finance.requestDeposit': false,
          'finance.viewBilling': false,
          'finance.downloadInvoice': false,
          'finance.viewCompanySales': false,
          'finance.viewOthersSales': false,
          // 申請・報告権限
          'reports.cancelRequest': true,
          'reports.contractReport': true,
          'reports.approveContract': false,
          'reports.viewHistory': false,
          // データ管理権限
          'data.csvExport': false,
          'data.import': false,
          'data.deleteAll': false,
          'data.deleteOthersMemo': false,
          'data.bulkEdit': false,
          // 分析・レポート権限
          'analytics.viewDetailed': false,
          'analytics.viewRankings': false,
          'analytics.viewAreaAnalysis': false,
          'analytics.createCustomReport': false,
        },
      },
      {
        id: '3',
        name: '佐藤 次郎',
        email: 'sato@example.com',
        phoneNumber: '070-5555-1234',
        caseCount: 3,
        permissionLevel: 'rookie',
        lastLogin: '2024-01-09 18:00',
        status: 'inactive',
        permissions: {
          // 案件関連権限
          'cases.viewOthers': false,
          'cases.viewAll': false,
          'cases.delete': false,
          'cases.assignOthers': false,
          'cases.unlimitedStatusChange': false,
          // 会社情報権限
          'company.view': true,
          'company.edit': false,
          'company.viewContracts': false,
          'company.viewAreas': false,
          'company.editAreas': false,
          // 配信設定権限
          'distribution.view': true,
          'distribution.toggle': false,
          'distribution.editConditions': false,
          'distribution.editLimits': false,
          'distribution.suspend': false,
          // 営業管理権限
          'sales.view': false,
          'sales.create': false,
          'sales.edit': false,
          'sales.delete': false,
          'sales.changePermissions': false,
          // 財務情報権限
          'finance.viewDeposit': false,
          'finance.viewDepositDetails': false,
          'finance.requestDeposit': false,
          'finance.viewBilling': false,
          'finance.downloadInvoice': false,
          'finance.viewCompanySales': false,
          'finance.viewOthersSales': false,
          // 申請・報告権限
          'reports.cancelRequest': false,
          'reports.contractReport': false,
          'reports.approveContract': false,
          'reports.viewHistory': false,
          // データ管理権限
          'data.csvExport': false,
          'data.import': false,
          'data.deleteAll': false,
          'data.deleteOthersMemo': false,
          'data.bulkEdit': false,
          // 分析・レポート権限
          'analytics.viewDetailed': false,
          'analytics.viewRankings': false,
          'analytics.viewAreaAnalysis': false,
          'analytics.createCustomReport': false,
        },
      },
    ],
  });
});

// Create new sales account
app.post('/api/sales/accounts', (req, res) => {
  const { name, email, phoneNumber, permissionLevel, permissions, status } = req.body;
  
  const newAccount = {
    id: Date.now().toString(),
    name,
    email,
    phoneNumber,
    caseCount: 0,
    permissionLevel,
    permissions,
    status: status || 'active',
    lastLogin: null,
    createdAt: new Date().toISOString(),
  };
  
  console.log('Creating new sales account:', newAccount);
  
  res.status(201).json({
    success: true,
    data: newAccount,
  });
});

// Update sales account
app.put('/api/sales/accounts/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, phoneNumber, permissionLevel, permissions, status } = req.body;
  
  const updatedAccount = {
    id,
    name,
    email, 
    phoneNumber,
    permissionLevel,
    permissions,
    status,
    updatedAt: new Date().toISOString(),
  };
  
  console.log('Updating sales account:', id, updatedAccount);
  
  res.json({
    success: true,
    data: updatedAccount,
  });
});

// Mock billing
app.get('/api/billing/invoice', (req, res) => {
  res.json({
    data: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    },
  });
});

// Mock settings
app.get('/api/settings/company', (req, res) => {
  res.json({
    id: '1',
    name: 'フランチャイズ管理会社',
    email: 'admin@franchise.com',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock server running on port ${PORT}`);
  console.log(`📝 Environment: development (mock mode)`);
  console.log(`🔗 Frontend URL: http://localhost:5173`);
  console.log(`\n📧 Login credentials:`);
  console.log(`\n👨‍💼 管理者アカウント:`);
  console.log(`   Email: admin@franchise.com`);
  console.log(`   Password: Admin123!`);
  console.log(`\n👤 営業アカウント (リーダー権限):`);
  console.log(`   Email: tanaka@sales.com`);
  console.log(`   Password: Sales123!`);
  console.log(`\n👤 営業アカウント (一般権限):`);
  console.log(`   Email: yamada@sales.com`);
  console.log(`   Password: Sales123!`);
  console.log(`\n👤 営業アカウント (新人権限):`);
  console.log(`   Email: sato@sales.com`);
  console.log(`   Password: Sales123!`);
});