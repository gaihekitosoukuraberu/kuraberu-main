import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gasApiService } from '@/services/gasApi'

export const useRankingStore = defineStore('ranking', () => {
  // State
  const successRateRanking = ref([])
  const responseRanking = ref([])
  const salesRanking = ref([])
  const loading = ref(false)
  const error = ref(null)
  const lastFetch = ref(null)

  // Getters
  const topPerformers = computed(() => {
    return successRateRanking.value.slice(0, 3)
  })

  const averageSuccessRate = computed(() => {
    if (successRateRanking.value.length === 0) return 0
    const total = successRateRanking.value.reduce((sum, item) => sum + item.successRate, 0)
    return Math.round((total / successRateRanking.value.length) * 10) / 10
  })

  const averageResponseTime = computed(() => {
    if (responseRanking.value.length === 0) return 0
    const total = responseRanking.value.reduce((sum, item) => sum + item.avgResponseTime, 0)
    return Math.round((total / responseRanking.value.length) * 10) / 10
  })

  const totalSales = computed(() => {
    return salesRanking.value.reduce((sum, item) => sum + item.totalSales, 0)
  })

  const rankingStats = computed(() => {
    return {
      totalFranchisees: successRateRanking.value.length,
      averageSuccessRate: averageSuccessRate.value,
      averageResponseTime: averageResponseTime.value,
      totalSales: totalSales.value,
      topPerformer: successRateRanking.value[0]?.franchiseName || '-'
    }
  })

  // Actions
  const fetchSuccessRateRanking = async (months = 3) => {
    try {
      loading.value = true
      error.value = null

      // 開発環境ではモックデータを使用
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 開発環境: 成約率ランキングモックデータを使用します')
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const mockData = generateMockSuccessRateData()
        successRateRanking.value = mockData
        lastFetch.value = new Date()
        return
      }

      const response = await gasApiService.get('/api/getSuccessRateRanking', { months })

      if (response.success) {
        successRateRanking.value = response.data.sort((a, b) => b.successRate - a.successRate)
        lastFetch.value = new Date()
      } else {
        throw new Error(response.error || '成約率ランキングの取得に失敗しました')
      }
    } catch (err) {
      error.value = err.message
      console.error('Success rate ranking fetch error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchResponseRanking = async (months = 3) => {
    try {
      loading.value = true
      error.value = null

      // 開発環境ではモックデータを使用
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 開発環境: 応答速度ランキングモックデータを使用します')
        await new Promise(resolve => setTimeout(resolve, 800))
        
        const mockData = generateMockResponseData()
        responseRanking.value = mockData
        return
      }

      const response = await gasApiService.get('/api/getResponseRanking', { months })

      if (response.success) {
        responseRanking.value = response.data.sort((a, b) => a.avgResponseTime - b.avgResponseTime)
      } else {
        throw new Error(response.error || '応答速度ランキングの取得に失敗しました')
      }
    } catch (err) {
      error.value = err.message
      console.error('Response ranking fetch error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchSalesRanking = async (months = 3) => {
    try {
      loading.value = true
      error.value = null

      // 開発環境ではモックデータを使用
      if (process.env.NODE_ENV === 'development') {
        console.log('🧪 開発環境: 売上ランキングモックデータを使用します')
        await new Promise(resolve => setTimeout(resolve, 600))
        
        const mockData = generateMockSalesData()
        salesRanking.value = mockData
        return
      }

      const response = await gasApiService.get('/api/getSalesRanking', { months })

      if (response.success) {
        salesRanking.value = response.data.sort((a, b) => b.totalSales - a.totalSales)
      } else {
        throw new Error(response.error || '売上ランキングの取得に失敗しました')
      }
    } catch (err) {
      error.value = err.message
      console.error('Sales ranking fetch error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchAllRankings = async (months = 3) => {
    try {
      loading.value = true
      error.value = null

      await Promise.all([
        fetchSuccessRateRanking(months),
        fetchResponseRanking(months),
        fetchSalesRanking(months)
      ])
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const exportRankingData = async (type, _format = 'csv') => {
    try {
      let data = []
      let filename = ''

      switch (type) {
        case 'success-rate':
          data = successRateRanking.value
          filename = `成約率ランキング_${new Date().toISOString().split('T')[0]}.csv`
          break
        case 'response':
          data = responseRanking.value
          filename = `応答速度ランキング_${new Date().toISOString().split('T')[0]}.csv`
          break
        case 'sales':
          data = salesRanking.value
          filename = `売上ランキング_${new Date().toISOString().split('T')[0]}.csv`
          break
        default:
          throw new Error('無効なランキングタイプです')
      }

      if (data.length === 0) {
        throw new Error('エクスポートするデータがありません')
      }

      // CSVデータの生成
      const csvContent = generateCSV(data, type)
      downloadFile(csvContent, filename, 'text/csv;charset=utf-8;')
      
      return { success: true, filename }
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  const clearError = () => {
    error.value = null
  }

  const refreshRankings = async (months = 3) => {
    lastFetch.value = null
    await fetchAllRankings(months)
  }

  // Helper functions
  const generateCSV = (data, type) => {
    let headers = []
    let rows = []

    switch (type) {
      case 'success-rate':
        headers = ['順位', '加盟店名', '担当件数', '成約件数', '成約率(%)']
        rows = data.map((item, index) => [
          index + 1,
          item.franchiseName,
          item.totalCases,
          item.successCases,
          item.successRate
        ])
        break
      case 'response':
        headers = ['順位', '加盟店名', '平均応答時間(時間)', '総応答件数']
        rows = data.map((item, index) => [
          index + 1,
          item.franchiseName,
          item.avgResponseTime,
          item.totalResponses
        ])
        break
      case 'sales':
        headers = ['順位', '加盟店名', '総売上金額', '成約件数', '平均案件単価']
        rows = data.map((item, index) => [
          index + 1,
          item.franchiseName,
          item.totalSales,
          item.contractCount,
          Math.round(item.totalSales / item.contractCount)
        ])
        break
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
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

  // Mock data generators (開発環境用)
  const generateMockSuccessRateData = () => {
    const franchises = [
      '東京都市部塗装',
      '神奈川県央建設',
      '千葉外装工業',
      '埼玉リフォーム',
      '横浜ペイント',
      '大阪塗装専門',
      '名古屋外壁工房',
      '福岡住宅塗装',
      '仙台建築塗装',
      '札幌外装センター'
    ]

    return franchises.map((name, index) => {
      const totalCases = Math.floor(Math.random() * 50) + 20
      const successCases = Math.floor(totalCases * (0.3 + Math.random() * 0.4))
      const successRate = Math.round((successCases / totalCases) * 1000) / 10

      return {
        franchiseId: `FRANCHISE_${String(index + 1).padStart(3, '0')}`,
        franchiseName: name,
        totalCases,
        successCases,
        successRate,
        period: '過去3ヶ月',
        lastUpdated: new Date().toISOString()
      }
    }).sort((a, b) => b.successRate - a.successRate)
  }

  const generateMockResponseData = () => {
    const franchises = [
      '東京都市部塗装',
      '神奈川県央建設',
      '千葉外装工業',
      '埼玉リフォーム',
      '横浜ペイント',
      '大阪塗装専門',
      '名古屋外壁工房',
      '福岡住宅塗装',
      '仙台建築塗装',
      '札幌外装センター'
    ]

    return franchises.map((name, index) => {
      const avgResponseTime = Math.round((1 + Math.random() * 24) * 10) / 10
      const totalResponses = Math.floor(Math.random() * 100) + 50

      return {
        franchiseId: `FRANCHISE_${String(index + 1).padStart(3, '0')}`,
        franchiseName: name,
        avgResponseTime,
        totalResponses,
        period: '過去3ヶ月',
        lastUpdated: new Date().toISOString()
      }
    }).sort((a, b) => a.avgResponseTime - b.avgResponseTime)
  }

  const generateMockSalesData = () => {
    const franchises = [
      '東京都市部塗装',
      '神奈川県央建設',
      '千葉外装工業',
      '埼玉リフォーム',
      '横浜ペイント',
      '大阪塗装専門',
      '名古屋外壁工房',
      '福岡住宅塗装',
      '仙台建築塗装',
      '札幌外装センター'
    ]

    return franchises.map((name, index) => {
      const contractCount = Math.floor(Math.random() * 30) + 10
      const avgContractValue = (Math.floor(Math.random() * 200) + 100) * 10000 // 100万〜300万円
      const totalSales = contractCount * avgContractValue

      return {
        franchiseId: `FRANCHISE_${String(index + 1).padStart(3, '0')}`,
        franchiseName: name,
        totalSales,
        contractCount,
        avgContractValue,
        period: '過去3ヶ月',
        lastUpdated: new Date().toISOString()
      }
    }).sort((a, b) => b.totalSales - a.totalSales)
  }

  // Cache management
  const shouldRefresh = () => {
    if (!lastFetch.value) return true
    const cacheTime = 10 * 60 * 1000 // 10分
    return (new Date() - lastFetch.value) > cacheTime
  }

  const invalidateCache = () => {
    lastFetch.value = null
  }

  return {
    // State
    successRateRanking,
    responseRanking,
    salesRanking,
    loading,
    error,
    lastFetch,

    // Getters
    topPerformers,
    averageSuccessRate,
    averageResponseTime,
    totalSales,
    rankingStats,

    // Actions
    fetchSuccessRateRanking,
    fetchResponseRanking,
    fetchSalesRanking,
    fetchAllRankings,
    exportRankingData,
    clearError,
    refreshRankings,

    // Utilities
    shouldRefresh,
    invalidateCache
  }
})