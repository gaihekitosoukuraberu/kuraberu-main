import { ref, onMounted, onUnmounted } from 'vue'

/**
 * レスポンシブ対応用のBreakpointsコンポーザブル
 */
export function useBreakpoints() {
  const windowWidth = ref(window.innerWidth)
  
  // ブレークポイント定義
  const breakpoints = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400
  }

  // 各サイズの判定
  const isXs = ref(false)
  const isSm = ref(false)
  const isMd = ref(false)
  const isLg = ref(false)
  const isXl = ref(false)
  const isXxl = ref(false)
  
  // モバイル・タブレット・デスクトップ判定
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(false)

  const updateBreakpoints = () => {
    const width = windowWidth.value
    
    isXs.value = width >= breakpoints.xs && width < breakpoints.sm
    isSm.value = width >= breakpoints.sm && width < breakpoints.md
    isMd.value = width >= breakpoints.md && width < breakpoints.lg
    isLg.value = width >= breakpoints.lg && width < breakpoints.xl
    isXl.value = width >= breakpoints.xl && width < breakpoints.xxl
    isXxl.value = width >= breakpoints.xxl
    
    isMobile.value = width < breakpoints.md
    isTablet.value = width >= breakpoints.md && width < breakpoints.lg
    isDesktop.value = width >= breakpoints.lg
  }

  const handleResize = () => {
    windowWidth.value = window.innerWidth
    updateBreakpoints()
  }

  onMounted(() => {
    updateBreakpoints()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return {
    windowWidth,
    isXs,
    isSm,
    isMd,
    isLg,
    isXl,
    isXxl,
    isMobile,
    isTablet,
    isDesktop,
    breakpoints
  }
}