import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gasApiService } from '@/services/gasApi'

export const useBillingStore = defineStore('billing', () => {
  // State
  const billings = ref([])
  const selectedBilling = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const lastFetch = ref(null)

  // Getters
  const getBillingById = computed(() => {
    return (billingId) => billings.value.find(billing => billing.billingId === billingId)
  })

  const unpaidBillings = computed(() => {
    return billings.value.filter(billing => billing.paymentStatus === '未払い')
  })

  const overdueBillings = computed(() => {
    return billings.value.filter(billing => billing.isOverdue)
  })

  const totalUnpaidAmount = computed(() => {
    return unpaidBillings.value.reduce((total, billing) => total + Number(billing.amount), 0)
  })

  const billingStats = computed(() => {
    const stats = {
      total: billings.value.length,
      paid: 0,
      unpaid: 0,
      overdue: 0,
      totalAmount: 0,
      unpaidAmount: 0,
      overdueAmount: 0
    }

    billings.value.forEach(billing => {
      const amount = Number(billing.amount)
      stats.totalAmount += amount

      switch (billing.paymentStatus) {
        case '支払い済み':
          stats.paid++
          break
        case '未払い':
          stats.unpaid++
          stats.unpaidAmount += amount
          break
        case '期限切れ':
          stats.overdue++
          stats.overdueAmount += amount
          break
      }
    })

    return stats
  })

  // Actions
  const fetchBillingHistory = async (franchiseeId = null, options = {}) => {
    try {
      loading.value = true
      error.value = null

      // 開発環境ではモックデータを使用
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 開発環境: モックデータを使用します')
        await new Promise(resolve => setTimeout(resolve, 1000)) // ローディング体験のため
        
        const mockData = generateMockBillingData()
        billings.value = mockData
        lastFetch.value = new Date()
        return
      }

      const params = {
        franchiseeId: franchiseeId || getCurrentFranchiseeId(),
        ...options
      }

      const response = await gasApiService.get('/api/getBillingHistory', params)

      if (response.success) {
        // データの前処理
        const billingData = Array.isArray(response.data) ? response.data : []
        const processedBillings = billingData.map(billing => ({
          ...billing,
          // 期限切れ判定
          isOverdue: isPaymentOverdue(billing.paymentDueDate, billing.paymentStatus),
          // 金額の数値化
          amount: Number(billing.amount) || 0,
          // 日付の正規化
          billingDate: normalizeDate(billing.billingDate),
          paymentDueDate: normalizeDate(billing.paymentDueDate),
          paymentDate: billing.paymentDate ? normalizeDate(billing.paymentDate) : null
        }))

        billings.value = processedBillings
        lastFetch.value = new Date()
      } else {
        throw new Error(response.error || '請求履歴の取得に失敗しました')
      }
    } catch (err) {
      error.value = err.message
      console.error('Billing history fetch error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const getBillingDetail = async (billingId) => {
    try {
      const response = await gasApiService.get('/api/getBillingDetail', { billingId })
      
      if (response.success) {
        return response.data
      } else {
        throw new Error(response.error || '請求詳細の取得に失敗しました')
      }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const updatePaymentStatus = async (billingId, status, paymentDate = null) => {
    try {
      loading.value = true
      
      const response = await gasApiService.post('/api/updatePaymentStatus', {
        billingId,
        status,
        paymentDate
      })

      if (response.success) {
        // ローカルステートの更新
        const billing = billings.value.find(b => b.billingId === billingId)
        if (billing) {
          billing.paymentStatus = status
          billing.paymentDate = paymentDate
          billing.isOverdue = isPaymentOverdue(billing.paymentDueDate, status)
        }
        return response.data
      } else {
        throw new Error(response.error || '支払いステータスの更新に失敗しました')
      }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const processBatchPayment = async (billingIds, paymentDate = null) => {
    try {
      loading.value = true
      
      const response = await gasApiService.post('/api/processBatchPayment', {
        billingIds,
        paymentDate: paymentDate || new Date().toISOString()
      })

      if (response.success) {
        // ローカルステートの一括更新
        billingIds.forEach(billingId => {
          const billing = billings.value.find(b => b.billingId === billingId)
          if (billing) {
            billing.paymentStatus = '支払い済み'
            billing.paymentDate = paymentDate
            billing.isOverdue = false
          }
        })
        return response.data
      } else {
        throw new Error(response.error || '一括支払い処理に失敗しました')
      }
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const exportBillingData = async (filters = {}, format = 'csv') => {
    try {
      const response = await gasApiService.post('/api/exportBillingData', {
        filters,
        format
      })

      if (response.success) {
        // CSVダウンロード処理
        downloadFile(response.data.content, response.data.filename, response.data.mimeType)
        return response.data
      } else {
        throw new Error(response.error || 'データエクスポートに失敗しました')
      }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const setSelectedBilling = (billing) => {
    selectedBilling.value = billing
  }

  const clearSelectedBilling = () => {
    selectedBilling.value = null
  }

  const clearError = () => {
    error.value = null
  }

  const refreshBillingHistory = async () => {
    await fetchBillingHistory()
  }

  const addNewBilling = (billing) => {
    const processedBilling = {
      ...billing,
      isOverdue: isPaymentOverdue(billing.paymentDueDate, billing.paymentStatus),
      amount: Number(billing.amount) || 0,
      billingDate: normalizeDate(billing.billingDate),
      paymentDueDate: normalizeDate(billing.paymentDueDate),
      paymentDate: billing.paymentDate ? normalizeDate(billing.paymentDate) : null
    }
    
    billings.value.unshift(processedBilling)
  }

  const updateBilling = (billingId, updates) => {
    const index = billings.value.findIndex(b => b.billingId === billingId)
    if (index !== -1) {
      billings.value[index] = {
        ...billings.value[index],
        ...updates,
        isOverdue: isPaymentOverdue(
          updates.paymentDueDate || billings.value[index].paymentDueDate,
          updates.paymentStatus || billings.value[index].paymentStatus
        )
      }
    }
  }

  const deleteBilling = (billingId) => {
    const index = billings.value.findIndex(b => b.billingId === billingId)
    if (index !== -1) {
      billings.value.splice(index, 1)
    }
  }

  // Helper functions
  const isPaymentOverdue = (dueDate, paymentStatus) => {
    if (paymentStatus === '支払い済み') return false
    if (!dueDate) return false
    
    const due = new Date(dueDate)
    const now = new Date()
    return due < now
  }

  const normalizeDate = (dateString) => {
    if (!dateString) return null
    
    try {
      const date = new Date(dateString)
      return date.toISOString()
    } catch (err) {
      console.warn('Invalid date string:', dateString)
      return null
    }
  }

  const getCurrentFranchiseeId = () => {
    // TODO: ユーザー認証情報から取得
    return localStorage.getItem('franchiseeId') || 'default-franchisee-id'
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
  const generateMockBillingData = () => {
    const mockBillings = []
    const statuses = ['未払い', '支払い済み', '期限切れ']
    
    for (let i = 1; i <= 15; i++) {
      const billingDate = new Date()
      billingDate.setMonth(billingDate.getMonth() - Math.floor(Math.random() * 6))
      
      const paymentDueDate = new Date(billingDate)
      paymentDueDate.setDate(paymentDueDate.getDate() + 30)
      
      const status = statuses[Math.floor(Math.random() * statuses.length)]
      const amount = (Math.floor(Math.random() * 500) + 50) * 1000 // 50,000〜550,000円
      
      const billing = {
        billingId: `BILL-2024-${String(i).padStart(3, '0')}`,
        billingDate: billingDate.toISOString(),
        paymentDueDate: paymentDueDate.toISOString(),
        amount: amount,
        paymentStatus: status,
        description: `2024年${billingDate.getMonth() + 1}月分 成約手数料`,
        contractCases: Math.floor(Math.random() * 10) + 1,
        billingPeriod: `2024年${billingDate.getMonth() + 1}月`,
        isOverdue: status === '期限切れ' || (status === '未払い' && paymentDueDate < new Date()),
        paymentDate: status === '支払い済み' ? new Date(paymentDueDate.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString() : null,
        notes: i % 3 === 0 ? '月末締め請求' : ''
      }
      
      mockBillings.push(billing)
    }
    
    return mockBillings.sort((a, b) => new Date(b.billingDate) - new Date(a.billingDate))
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
    billings,
    selectedBilling,
    loading,
    error,
    lastFetch,

    // Getters
    getBillingById,
    unpaidBillings,
    overdueBillings,
    totalUnpaidAmount,
    billingStats,

    // Actions
    fetchBillingHistory,
    getBillingDetail,
    updatePaymentStatus,
    processBatchPayment,
    exportBillingData,
    setSelectedBilling,
    clearSelectedBilling,
    clearError,
    refreshBillingHistory,
    addNewBilling,
    updateBilling,
    deleteBilling,

    // Utilities
    shouldRefresh,
    invalidateCache
  }
})