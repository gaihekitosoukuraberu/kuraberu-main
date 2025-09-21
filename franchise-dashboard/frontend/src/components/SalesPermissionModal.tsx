import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition, Switch } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { apiClient } from '../services/api/client';

interface SalesAccount {
  id?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  status?: 'active' | 'inactive';
  permissionLevel?: string;
  permissions?: Record<string, boolean>;
}

interface PermissionGroup {
  title: string;
  icon: string;
  permissions: {
    key: string;
    label: string;
    value: boolean;
  }[];
}

interface Props {
  account: SalesAccount | null;
  isOpen: boolean;
  onClose: () => void;
}

const PERMISSION_PRESETS = {
  rookie: {
    label: '新人営業',
    permissions: {
      'company.view': true,
      'distribution.view': true,
    },
  },
  standard: {
    label: '一般営業',
    permissions: {
      'company.view': true,
      'contract.view': true,
      'distribution.view': true,
      'cancel.execute': true,
      'contract.report': true,
    },
  },
  leader: {
    label: 'リーダー',
    permissions: {
      'cases.viewOthers': true,
      'cases.viewAll': true,
      'cases.assignOthers': true,
      'company.view': true,
      'contract.view': true,
      'distribution.view': true,
      'sales.view': true,
      'finance.viewRevenue': true,
      'finance.viewOthersPerformance': true,
      'cancel.execute': true,
      'contract.report': true,
      'contract.approve': true,
      'report.viewAll': true,
      'analytics.viewDetail': true,
      'analytics.viewRanking': true,
      'analytics.viewArea': true,
    },
  },
  admin: {
    label: '副管理者',
    permissions: 'all_except_critical',
  },
};

export function SalesPermissionModal({ account, isOpen, onClose }: Props) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    status: 'active' as 'active' | 'inactive',
    permissionLevel: 'standard',
  });

  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  const permissionGroups: PermissionGroup[] = [
    {
      title: '案件関連権限',
      icon: '📋',
      permissions: [
        { key: 'cases.viewOthers', label: '他営業の案件を閲覧', value: false },
        { key: 'cases.viewAll', label: '全案件を閲覧（フィルターなし）', value: false },
        { key: 'cases.delete', label: '案件の削除', value: false },
        { key: 'cases.assignOthers', label: '他営業への案件割り当て', value: false },
        { key: 'cases.statusUnlimited', label: 'ステータスの制限なし変更', value: false },
      ],
    },
    {
      title: '会社情報権限',
      icon: '🏢',
      permissions: [
        { key: 'company.view', label: '会社基本情報の閲覧', value: false },
        { key: 'company.edit', label: '会社基本情報の編集', value: false },
        { key: 'contract.view', label: '契約書・規約の閲覧', value: false },
        { key: 'area.view', label: '対応エリアの閲覧', value: false },
        { key: 'area.edit', label: '対応エリアの編集', value: false },
      ],
    },
    {
      title: '配信設定権限',
      icon: '📡',
      permissions: [
        { key: 'distribution.view', label: '配信設定の閲覧', value: false },
        { key: 'distribution.toggle', label: '配信ON/OFF切替', value: false },
        { key: 'distribution.editCondition', label: '配信条件の変更', value: false },
        { key: 'distribution.editLimit', label: '配信上限の変更', value: false },
        { key: 'distribution.suspend', label: '一時休止の設定', value: false },
      ],
    },
    {
      title: '営業管理権限',
      icon: '👤',
      permissions: [
        { key: 'sales.view', label: '営業一覧の閲覧', value: false },
        { key: 'sales.create', label: '営業アカウントの新規発行', value: false },
        { key: 'sales.edit', label: '営業アカウントの編集', value: false },
        { key: 'sales.delete', label: '営業アカウントの削除', value: false },
        { key: 'sales.editPermission', label: '権限設定の変更', value: false },
      ],
    },
    {
      title: '財務情報権限',
      icon: '💰',
      permissions: [
        { key: 'finance.viewBalance', label: 'デポジット残高の閲覧', value: false },
        { key: 'finance.viewDetail', label: 'デポジット明細の閲覧', value: false },
        { key: 'finance.deposit', label: 'デポジット入金申請', value: false },
        { key: 'finance.viewInvoice', label: '請求情報の閲覧', value: false },
        { key: 'finance.downloadInvoice', label: '請求書ダウンロード', value: false },
        { key: 'finance.viewRevenue', label: '全社売上データの閲覧', value: false },
        { key: 'finance.viewOthersPerformance', label: '他営業の実績閲覧', value: false },
      ],
    },
    {
      title: '申請・報告権限',
      icon: '📝',
      permissions: [
        { key: 'cancel.execute', label: 'キャンセル申請の実行', value: false },
        { key: 'contract.report', label: '成約報告の実行', value: false },
        { key: 'contract.approve', label: '成約報告の承認', value: false },
        { key: 'report.viewAll', label: '各種申請履歴の閲覧', value: false },
      ],
    },
    {
      title: 'データ管理権限',
      icon: '📊',
      permissions: [
        { key: 'data.export', label: 'CSVエクスポート', value: false },
        { key: 'data.import', label: 'データインポート', value: false },
        { key: 'data.deleteAll', label: '全ファイル削除', value: false },
        { key: 'data.deleteOthersMemo', label: '他者メモの削除', value: false },
        { key: 'data.bulkEdit', label: '一括データ編集', value: false },
      ],
    },
    {
      title: '分析・レポート権限',
      icon: '📈',
      permissions: [
        { key: 'analytics.viewDetail', label: '詳細分析レポート閲覧', value: false },
        { key: 'analytics.viewRanking', label: 'ランキング詳細閲覧', value: false },
        { key: 'analytics.viewArea', label: 'エリア分析の閲覧', value: false },
        { key: 'analytics.createCustom', label: 'カスタムレポート作成', value: false },
      ],
    },
  ];

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        email: account.email || '',
        phoneNumber: account.phoneNumber || '',
        status: account.status || 'active',
        permissionLevel: account.permissionLevel || 'standard',
      });
      setPermissions(account.permissions || {});
      setSelectedPreset(account.permissionLevel || 'custom');
    } else {
      // Initialize default permissions for new account
      const defaultPermissions: Record<string, boolean> = {};
      permissionGroups.forEach(group => {
        group.permissions.forEach(perm => {
          defaultPermissions[perm.key] = false;
        });
      });
      setPermissions(defaultPermissions);
    }
  }, [account]);

  const handlePresetSelect = (preset: string) => {
    setSelectedPreset(preset);
    setFormData(prev => ({ ...prev, permissionLevel: preset }));
    
    if (preset === 'custom') return;
    
    const presetConfig = PERMISSION_PRESETS[preset];
    if (!presetConfig) return;
    
    // Reset all permissions
    const newPermissions: Record<string, boolean> = {};
    
    if (presetConfig.permissions === 'all_except_critical') {
      // 副管理者: すべてON（削除と権限変更以外）
      permissionGroups.forEach(group => {
        group.permissions.forEach(perm => {
          newPermissions[perm.key] = !(perm.key === 'sales.delete' || perm.key === 'sales.editPermission');
        });
      });
    } else {
      // その他のプリセット
      permissionGroups.forEach(group => {
        group.permissions.forEach(perm => {
          newPermissions[perm.key] = presetConfig.permissions[perm.key] || false;
        });
      });
    }
    
    setPermissions(newPermissions);
  };

  const handleTogglePermission = (key: string) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setSelectedPreset('custom');
  };

  const handleToggleGroup = (group: PermissionGroup) => {
    const newPermissions = { ...permissions };
    const allOn = group.permissions.every(p => permissions[p.key]);
    
    group.permissions.forEach(perm => {
      newPermissions[perm.key] = !allOn;
    });
    
    setPermissions(newPermissions);
    setSelectedPreset('custom');
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast.error('名前とメールアドレスは必須です');
      return;
    }

    const message = account 
      ? `${formData.name}さんの権限を変更します。よろしいですか？`
      : `${formData.name}さんの営業アカウントを作成します。よろしいですか？`;

    if (confirm(message)) {
      try {
        const payload = {
          name: formData.name,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          status: formData.status,
          permissionLevel: formData.permissionLevel,
          permissions,
        };
        
        if (account?.id) {
          // Update existing account
          await apiClient.put(`/sales/accounts/${account.id}`, payload);
          toast.success('権限を更新しました');
        } else {
          // Create new account
          await apiClient.post('/sales/accounts', payload);
          toast.success('営業アカウントを作成しました');
        }
        
        // Refresh the parent component's data
        window.location.reload();
        onClose();
      } catch (error) {
        console.error('Error saving account:', error);
        toast.error('保存中にエラーが発生しました');
      }
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                <div className="bg-white">
                  <div className="flex items-center justify-between border-b px-6 py-4">
                    <Dialog.Title className="text-lg font-medium text-gray-900">
                      {account ? '営業アカウント編集' : '営業アカウント新規発行'}
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                    {/* 基本情報 */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-900 mb-4">基本情報</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            営業担当者名 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            メールアドレス <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            電話番号
                          </label>
                          <input
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            ステータス
                          </label>
                          <div className="mt-2 flex items-center space-x-4">
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                value="active"
                                checked={formData.status === 'active'}
                                onChange={(e) => setFormData({ ...formData, status: 'active' })}
                                className="form-radio text-indigo-600"
                              />
                              <span className="ml-2">稼働中</span>
                            </label>
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                value="inactive"
                                checked={formData.status === 'inactive'}
                                onChange={(e) => setFormData({ ...formData, status: 'inactive' })}
                                className="form-radio text-indigo-600"
                              />
                              <span className="ml-2">停止</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 権限プリセット */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-900 mb-4">権限プリセット</h3>
                      <div className="flex space-x-2">
                        {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
                          <button
                            key={key}
                            onClick={() => handlePresetSelect(key)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              selectedPreset === key
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                        <button
                          onClick={() => handlePresetSelect('custom')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            selectedPreset === 'custom'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          カスタム
                        </button>
                      </div>
                    </div>

                    {/* 詳細権限設定 */}
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-4">詳細権限設定</h3>
                      <div className="space-y-4">
                        {permissionGroups.map((group) => (
                          <div key={group.title} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-gray-900 flex items-center">
                                <span className="mr-2">{group.icon}</span>
                                {group.title}
                              </h4>
                              <button
                                onClick={() => handleToggleGroup(group)}
                                className="text-xs text-indigo-600 hover:text-indigo-700"
                              >
                                {group.permissions.every(p => permissions[p.key]) ? '全てOFF' : '全てON'}
                              </button>
                            </div>
                            <div className="space-y-2 ml-7">
                              {group.permissions.map((permission) => (
                                <div key={permission.key} className="flex items-center justify-between">
                                  <label className="text-sm text-gray-700">
                                    {permission.label}
                                  </label>
                                  <Switch
                                    checked={permissions[permission.key] || false}
                                    onChange={() => handleTogglePermission(permission.key)}
                                    className={`${
                                      permissions[permission.key] ? 'bg-indigo-600' : 'bg-gray-200'
                                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                                  >
                                    <span
                                      className={`${
                                        permissions[permission.key] ? 'translate-x-6' : 'translate-x-1'
                                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                    />
                                  </Switch>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t px-6 py-4">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}