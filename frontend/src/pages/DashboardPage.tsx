import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api/client';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  conversionRate: number;
  monthlyRevenue: number;
  pendingPayments: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/stats');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      name: '総案件数',
      value: stats?.totalCases || 0,
      icon: ClipboardDocumentCheckIcon,
      color: 'bg-blue-500',
      testId: 'total-cases-card',
    },
    {
      name: 'アクティブ案件',
      value: stats?.activeCases || 0,
      icon: UserGroupIcon,
      color: 'bg-green-500',
      testId: 'active-cases-card',
    },
    {
      name: '成約率',
      value: `${stats?.conversionRate?.toFixed(1) || 0}%`,
      icon: ChartBarIcon,
      color: 'bg-yellow-500',
      testId: 'conversion-rate-card',
    },
    {
      name: '月間売上',
      value: `¥${(stats?.monthlyRevenue || 0).toLocaleString()}`,
      icon: CurrencyDollarIcon,
      color: 'bg-purple-500',
      testId: 'monthly-revenue-card',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">ダッシュボード</h1>
      
      {/* Stats Grid */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="bg-white overflow-hidden shadow rounded-lg"
            data-testid={stat.testId}
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.color} rounded-md p-3`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900" data-testid={`${stat.testId}-value`}>
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white p-6 rounded-lg shadow" data-testid="cases-chart">
          <h2 className="text-lg font-medium text-gray-900 mb-4">案件推移</h2>
          <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-500">チャート表示エリア</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow" data-testid="revenue-chart">
          <h2 className="text-lg font-medium text-gray-900 mb-4">売上推移</h2>
          <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-gray-500">チャート表示エリア</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">最近のアクティビティ</h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {stats?.recentActivity?.slice(0, 5).map((activity) => (
            <li key={activity.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-900">{activity.description}</p>
                <p className="text-sm text-gray-500">
                  {new Date(activity.timestamp).toLocaleString('ja-JP')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Live indicator */}
      <div className="mt-4 flex items-center justify-end text-sm text-gray-500">
        <span className="live-indicator inline-flex items-center">
          <span className="pulse h-2 w-2 bg-green-500 rounded-full mr-2"></span>
          <span data-testid="last-updated">
            最終更新: {new Date().toLocaleTimeString('ja-JP')}
          </span>
        </span>
      </div>
    </div>
  );
}