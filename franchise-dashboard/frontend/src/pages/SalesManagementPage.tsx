import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api/client';
import { 
  PlusIcon, 
  PencilIcon,
  CheckBadgeIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { SalesPermissionModal } from '../components/SalesPermissionModal';

interface SalesAccount {
  id: string;
  name: string;
  email: string;
  caseCount: number;
  permissionLevel: string;
  lastLogin: string;
  status: 'active' | 'inactive';
}

export default function SalesManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SalesAccount | null>(null);

  const { data: accounts, isLoading } = useQuery<SalesAccount[]>({
    queryKey: ['sales-accounts'],
    queryFn: async () => {
      const response = await apiClient.get('/sales/accounts');
      return response.data.data;
    },
  });

  const handleEdit = (account: SalesAccount) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const getPermissionBadge = (level: string) => {
    const colors = {
      'admin': 'bg-red-100 text-red-800',
      'leader': 'bg-purple-100 text-purple-800',
      'standard': 'bg-blue-100 text-blue-800',
      'rookie': 'bg-green-100 text-green-800',
    };
    
    const labels = {
      'admin': '副管理者',
      'leader': 'リーダー',
      'standard': '一般営業',
      'rookie': '新人営業',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[level] || colors.standard}`}>
        <CheckBadgeIcon className="w-3 h-3 mr-1" />
        {labels[level] || level}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        稼働中
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        停止
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Mock data for demonstration
  const mockAccounts: SalesAccount[] = [
    {
      id: '1',
      name: '田中 太郎',
      email: 'tanaka@example.com',
      caseCount: 15,
      permissionLevel: 'leader',
      lastLogin: '2024-01-10 14:30',
      status: 'active',
    },
    {
      id: '2',
      name: '山田 花子',
      email: 'yamada@example.com',
      caseCount: 8,
      permissionLevel: 'standard',
      lastLogin: '2024-01-10 09:15',
      status: 'active',
    },
    {
      id: '3',
      name: '佐藤 次郎',
      email: 'sato@example.com',
      caseCount: 3,
      permissionLevel: 'rookie',
      lastLogin: '2024-01-09 18:00',
      status: 'inactive',
    },
  ];

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">営業管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            営業担当者のアカウントと権限を管理します
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            営業アカウント発行
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      営業担当者
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      担当案件数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      権限レベル
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      最終ログイン
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">編集</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {account.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {account.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{account.caseCount}件</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPermissionBadge(account.permissionLevel)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {account.lastLogin}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(account.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(account)}
                          className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                        >
                          <PencilIcon className="h-4 w-4 mr-1" />
                          編集
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Permission Modal */}
      {isModalOpen && (
        <SalesPermissionModal
          account={editingAccount}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingAccount(null);
          }}
        />
      )}
    </div>
  );
}