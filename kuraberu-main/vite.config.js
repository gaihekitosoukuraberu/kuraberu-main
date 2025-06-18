import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { main: resolve(__dirname, 'src/index.html') },
      output: { manualChunks: { vendor: ['alpinejs'] } }
    },
    minify: 'terser',
    terserOptions: { compress: { drop_console: true } }
  },
  server: { open: true, port: 3000 },
  resolve: { alias: { '@': resolve(__dirname, 'src') } }
});