import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

export default function CasesPage() {
  const { user, hasPermission, isAdmin, isSales } = useAuth();

  // Mock cases data - in real app, this would come from API
  const allCases = [
    {
      id: '1',
      caseNumber: 'C10001',
      customerName: '田中太郎',
      phoneNumber: '090-1234-5678',
      assignedTo: '田中 太郎',
      assignedId: '2', // tanaka@sales.com
      status: 'assigned',
      createdAt: '2024-01-10',
    },
    {
      id: '2',
      caseNumber: 'C10002', 
      customerName: '山田花子',
      phoneNumber: '080-9876-5432',
      assignedTo: '山田 花子',
      assignedId: '3', // yamada@sales.com
      status: 'hearing_scheduled',
      createdAt: '2024-01-09',
    },
    {
      id: '3',
      caseNumber: 'C10003',
      customerName: '佐藤次郎',
      phoneNumber: '070-5555-1234',
      assignedTo: '佐藤 次郎', 
      assignedId: '4', // sato@sales.com
      status: 'completed',
      createdAt: '2024-01-08',
    },
  ];

  // Filter cases based on permissions
  const cases = React.useMemo(() => {
    if (hasPermission('cases.viewAll') || isAdmin()) {
      return allCases;
    }
    
    // Sales users can only see their own cases unless they have specific permissions
    if (isSales() && !hasPermission('cases.viewOthers')) {
      return allCases.filter(c => c.assignedId === user?.id);
    }
    
    return allCases;
  }, [allCases, user, hasPermission, isAdmin, isSales]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'assigned': { label: '割当済', color: 'bg-blue-100 text-blue-800' },
      'hearing_scheduled': { label: 'ヒアリング予定', color: 'bg-yellow-100 text-yellow-800' },
      'completed': { label: '完了', color: 'bg-green-100 text-green-800' },
    };
    
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">案件管理</h1>
          <p className="mt-2 text-sm text-gray-700">
            {isSales() && !hasPermission('cases.viewAll') 
              ? 'あなたが担当している案件を表示しています' 
              : 'すべての案件を管理します'}
          </p>
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
                      案件番号
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      顧客名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      電話番号
                    </th>
                    {(hasPermission('cases.viewOthers') || isAdmin()) && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        担当者
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      作成日
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cases.map((caseItem) => (
                    <tr key={caseItem.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {caseItem.caseNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {caseItem.customerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {caseItem.phoneNumber}
                      </td>
                      {(hasPermission('cases.viewOthers') || isAdmin()) && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-500">
                            <UserIcon className="h-4 w-4 mr-1" />
                            {caseItem.assignedTo}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(caseItem.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {caseItem.createdAt}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {hasPermission('cases.delete') && (
                            <button
                              type="button"
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      {cases.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">表示できる案件がありません</p>
        </div>
      )}
    </div>
  );
}