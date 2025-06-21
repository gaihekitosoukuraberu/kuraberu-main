import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gasApiService } from '@/services/gasApi'

export const useFlagStore = defineStore('flags', () => {
  // State
  const flags = ref([])
  const loading = ref(false)
  const error = ref(null)
  const lastFetch = ref(null)

  // Getters
  const activeFranchisees = computed(() => {
    return flags.value.filter(flag => flag.flagStatus === 'アクティブ')
  })

  const inactiveFranchisees = computed(() => {
    return flags.value.filter(flag => flag.flagStatus !== 'アクティブ')
  })

  const blacklistedFranchisees = computed(() => {
    return flags.value.filter(flag => flag.flagStatus === 'ブラック')
  })

  const onHoldFranchisees = computed(() => {
    return flags.value.filter(flag => flag.flagStatus === '保留')
  })

  const absentFranchisees = computed(() => {
    return flags.value.filter(flag => flag.flagStatus === '不在')
  })

  const flagStats = computed(() => {
    return {
      total: flags.value.length,
      active: activeFranchisees.value.length,
      inactive: inactiveFranchisees.value.length,
      blacklisted: blacklistedFranchisees.value.length,
      onHold: onHoldFranchisees.value.length,
      absent: absentFranchisees.value.length,
      activeRate: flags.value.length > 0 ? Math.round((activeFranchisees.value.length / flags.value.length) * 100) : 0
    }
  })

  const flagStatusOptions = computed(() => [
    { value: 'アクティブ', label: 'アクティブ', color: '#10B981', description: '通常営業中' },
    { value: '不在', label: '不在', color: '#F59E0B', description: '一時的に対応不可' },
    { value: '保留', label: '保留', color: '#EF4444', description: '対応を保留中' },
    { value: 'ブラック', label: 'ブラック', color: '#1F2937', description: '対応停止・除外対象' }
  ])

  // Actions
  const fetchFranchiseeFlags = async () => {
    try {
      loading.value = true
      error.value = null

      // 開発環境ではモックデータを使用
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 開発環境: フラグ管理モックデータを使用します')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const mockData = generateMockFlagData()
        flags.value = mockData
        lastFetch.value = new Date()
        return
      }

      const response = await gasApiService.get('/api/getFranchiseeFlags')

      if (response.success) {
        flags.value = response.data.map(flag => ({
          ...flag,
          flagSetDate: flag.flagSetDate ? new Date(flag.flagSetDate) : null,
          flagExpireDate: flag.flagExpireDate ? new Date(flag.flagExpireDate) : null,
          lastUpdated: flag.lastUpdated ? new Date(flag.lastUpdated) : null
        }))
        lastFetch.value = new Date()
      } else {
        throw new Error(response.error || 'フラグ情報の取得に失敗しました')
      }
    } catch (err) {
      error.value = err.message
      console.error('Franchisee flags fetch error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateFranchiseeFlag = async (franchiseeId, flagStatus, reason, options = {}) => {
    try {
      loading.value = true
      error.value = null

      // 開発環境ではモック処理
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 開発環境: フラグ更新モック処理')
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const flagIndex = flags.value.findIndex(flag => flag.franchiseeId === franchiseeId)
        if (flagIndex !== -1) {
          flags.value[flagIndex] = {
            ...flags.value[flagIndex],
            flagStatus,
            reason,
            flagSetDate: new Date(),
            flagExpireDate: options.expireDate ? new Date(options.expireDate) : null,
            lastUpdated: new Date(),
            excludedFromAssignment: ['ブラック', '保留', '不在'].includes(flagStatus)
          }
        }
        return { success: true }
      }

      const response = await gasApiService.post('/api/updateFranchiseeFlag', {
        franchiseeId,
        flagStatus,
        reason,
        ...options
      })

      if (response.success) {
        // ローカルステートの更新
        const flagIndex = flags.value.findIndex(flag => flag.franchiseeId === franchiseeId)
        if (flagIndex !== -1) {
          flags.value[flagIndex] = {
            ...flags.value[flagIndex],
            flagStatus,
            reason,
            flagSetDate: new Date(),
            flagExpireDate: options.expireDate ? new Date(options.expireDate) : null,
            lastUpdated: new Date(),
            excludedFromAssignment: response.data.excludedFromAssignment
          }
        }
        return response.data
      } else {
        throw new Error(response.error || 'フラグ更新に失敗しました')
      }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const bulkUpdateFlags = async (updates) => {
    try {
      loading.value = true
      error.value = null

      // 開発環境ではモック処理
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 開発環境: 一括フラグ更新モック処理')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        updates.forEach(update => {
          const flagIndex = flags.value.findIndex(flag => flag.franchiseeId === update.franchiseeId)
          if (flagIndex !== -1) {
            flags.value[flagIndex] = {
              ...flags.value[flagIndex],
              flagStatus: update.flagStatus,
              reason: update.reason,
              flagSetDate: new Date(),
              lastUpdated: new Date(),
              excludedFromAssignment: ['ブラック', '保留', '不在'].includes(update.flagStatus)
            }
          }
        })
        return { success: true, updatedCount: updates.length }
      }

      const response = await gasApiService.post('/api/bulkUpdateFranchiseeFlags', { updates })

      if (response.success) {
        // ローカルステートの一括更新
        updates.forEach(update => {
          const flagIndex = flags.value.findIndex(flag => flag.franchiseeId === update.franchiseeId)
          if (flagIndex !== -1) {
            flags.value[flagIndex] = {
              ...flags.value[flagIndex],
              flagStatus: update.flagStatus,
              reason: update.reason,
              flagSetDate: new Date(),
              lastUpdated: new Date(),
              excludedFromAssignment: ['ブラック', '保留', '不在'].includes(update.flagStatus)
            }
          }
        })
        return response.data
      } else {
        throw new Error(response.error || '一括フラグ更新に失敗しました')
      }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const getAssignmentExclusionList = async () => {
    try {
      const response = await gasApiService.get('/api/getAssignmentExclusionList')
      
      if (response.success) {
        return response.data
      } else {
        throw new Error(response.error || '除外リストの取得に失敗しました')
      }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const exportFlagData = async (_format = 'csv') => {
    try {
      if (flags.value.length === 0) {
        throw new Error('エクスポートするデータがありません')
      }

      const filename = `フラグ管理一覧_${new Date().toISOString().split('T')[0]}.csv`
      const csvContent = generateFlagCSV(flags.value)
      downloadFile(csvContent, filename, 'text/csv;charset=utf-8;')
      
      return { success: true, filename }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const getFlagsByStatus = (status) => {
    return flags.value.filter(flag => flag.flagStatus === status)
  }

  const getFlagHistory = async (franchiseeId) => {
    try {
      const response = await gasApiService.get('/api/getFlagHistory', { franchiseeId })
      
      if (response.success) {
        return response.data
      } else {
        throw new Error(response.error || 'フラグ履歴の取得に失敗しました')
      }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const clearError = () => {
    error.value = null
  }

  const refreshFlags = async () => {
    lastFetch.value = null
    await fetchFranchiseeFlags()
  }

  // Helper functions
  const generateFlagCSV = (data) => {
    const headers = [
      '加盟店ID',
      '加盟店名',
      'フラグステータス',
      '設定理由',
      'フラグ設定日',
      '期限日',
      '割り当て除外',
      '最終更新日'
    ]

    const rows = data.map(flag => [
      flag.franchiseeId,
      flag.franchiseName,
      flag.flagStatus,
      flag.reason || '',
      flag.flagSetDate ? flag.flagSetDate.toLocaleDateString('ja-JP') : '',
      flag.flagExpireDate ? flag.flagExpireDate.toLocaleDateString('ja-JP') : '',
      flag.excludedFromAssignment ? 'はい' : 'いいえ',
      flag.lastUpdated ? flag.lastUpdated.toLocaleDateString('ja-JP') : ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return '\uFEFF' + csvContent // BOMを追加してExcelでの文字化けを防ぐ
  }

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Mock data generator (開発環境用)
  const generateMockFlagData = () => {
    const franchises = [
      { id: 'FRANCHISE_001', name: '東京都市部塗装' },
      { id: 'FRANCHISE_002', name: '神奈川県央建設' },
      { id: 'FRANCHISE_003', name: '千葉外装工業' },
      { id: 'FRANCHISE_004', name: '埼玉リフォーム' },
      { id: 'FRANCHISE_005', name: '横浜ペイント' },
      { id: 'FRANCHISE_006', name: '大阪塗装専門' },
      { id: 'FRANCHISE_007', name: '名古屋外壁工房' },
      { id: 'FRANCHISE_008', name: '福岡住宅塗装' },
      { id: 'FRANCHISE_009', name: '仙台建築塗装' },
      { id: 'FRANCHISE_010', name: '札幌外装センター' }
    ]

    const statuses = ['アクティブ', '不在', '保留', 'ブラック']
    const reasons = [
      '通常営業中',
      '繁忙期により一時対応停止',
      '担当者休暇中',
      '品質問題による対応保留',
      '契約条件見直し中',
      'クレーム対応のため一時停止',
      'システムメンテナンス中',
      '営業方針変更に伴う調整'
    ]

    return franchises.map(franchise => {
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const setDate = new Date()
      setDate.setDate(setDate.getDate() - Math.floor(Math.random() * 30))
      
      let expireDate = null
      if (status !== 'アクティブ' && Math.random() > 0.3) {
        expireDate = new Date(setDate)
        expireDate.setDate(expireDate.getDate() + Math.floor(Math.random() * 60) + 7)
      }

      return {
        franchiseeId: franchise.id,
        franchiseName: franchise.name,
        flagStatus: status,
        reason: reasons[Math.floor(Math.random() * reasons.length)],
        flagSetDate: setDate,
        flagExpireDate: expireDate,
        excludedFromAssignment: ['ブラック', '保留', '不在'].includes(status),
        lastUpdated: setDate,
        setByUserId: 'ADMIN_001',
        setByUserName: 'システム管理者',
        notes: Math.random() > 0.7 ? '自動設定による' : ''
      }
    })
  }

  // Cache management
  const shouldRefresh = () => {
    if (!lastFetch.value) return true
    const cacheTime = 5 * 60 * 1000 // 5分
    return (new Date() - lastFetch.value) > cacheTime
  }

  const invalidateCache = () => {
    lastFetch.value = null
  }

  return {
    // State
    flags,
    loading,
    error,
    lastFetch,

    // Getters
    activeFranchisees,
    inactiveFranchisees,
    blacklistedFranchisees,
    onHoldFranchisees,
    absentFranchisees,
    flagStats,
    flagStatusOptions,

    // Actions
    fetchFranchiseeFlags,
    updateFranchiseeFlag,
    bulkUpdateFlags,
    getAssignmentExclusionList,
    exportFlagData,
    getFlagsByStatus,
    getFlagHistory,
    clearError,
    refreshFlags,

    // Utilities
    shouldRefresh,
    invalidateCache
  }
})