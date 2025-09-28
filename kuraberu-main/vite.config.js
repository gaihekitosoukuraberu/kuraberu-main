import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // LP用エントリーポイント
        lp: resolve(__dirname, 'src/index.html'),
        // 管理画面用エントリーポイント  
        admin: resolve(__dirname, 'admin-app/index.html'),
        // 加盟店親アプリ
        'franchise-parent': resolve(__dirname, 'franchise-parent-app/index.html'),
        // 加盟店アプリ
        franchise: resolve(__dirname, 'franchise-app/index.html')
      },
      output: {
        // ディレクトリ別の出力設定
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'lp') {
            return 'lp/js/[name].[hash].js';
          } else if (chunkInfo.name === 'admin') {
            return 'admin/js/[name].[hash].js';
          } else if (chunkInfo.name === 'franchise-parent') {
            return 'franchise-parent/js/[name].[hash].js';
          } else if (chunkInfo.name === 'franchise') {
            return 'franchise/js/[name].[hash].js';
          }
          return 'shared/js/[name].[hash].js';
        },
        chunkFileNames: (chunkInfo) => {
          // 各アプリごとにチャンクを分離
          const facadeModuleId = chunkInfo.facadeModuleId || '';
          if (facadeModuleId.includes('admin-app')) {
            return 'admin/js/[name].[hash].js';
          } else if (facadeModuleId.includes('franchise-parent-app')) {
            return 'franchise-parent/js/[name].[hash].js';
          } else if (facadeModuleId.includes('franchise-app')) {
            return 'franchise/js/[name].[hash].js';
          }
          return 'lp/js/[name].[hash].js';
        },
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          // CSS分離
          if (name.endsWith('.css')) {
            if (name.includes('admin')) {
              return 'admin/css/[name].[hash].[ext]';
            } else if (name.includes('franchise-parent')) {
              return 'franchise-parent/css/[name].[hash].[ext]';
            } else if (name.includes('franchise')) {
              return 'franchise/css/[name].[hash].[ext]';
            }
            return 'lp/css/[name].[hash].[ext]';
          }
          // その他のアセット
          if (name.includes('admin')) {
            return 'admin/assets/[name].[hash].[ext]';
          } else if (name.includes('franchise-parent')) {
            return 'franchise-parent/assets/[name].[hash].[ext]';
          } else if (name.includes('franchise')) {
            return 'franchise/assets/[name].[hash].[ext]';
          }
          return 'lp/assets/[name].[hash].[ext]';
        },
        manualChunks: {
          vendor: ['alpinejs']
        }
      }
    },
    minify: 'terser',
    terserOptions: { 
      compress: { 
        drop_console: true,
        drop_debugger: true
      }
    },
    // ソースマップを本番では無効
    sourcemap: false,
    // チャンクサイズ警告を500KBに設定
    chunkSizeWarningLimit: 500
  },
  server: { 
    open: true, 
    port: 3000,
    host: true
  },
  resolve: { 
    alias: { 
      '@': resolve(__dirname, 'src'),
      '@admin': resolve(__dirname, 'admin-app'),
      '@franchise-parent': resolve(__dirname, 'franchise-parent-app'),
      '@franchise': resolve(__dirname, 'franchise-app')
    } 
  },
  // 本番環境変数の注入
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __ENV__: JSON.stringify(process.env.NODE_ENV || 'development')
  }
});