import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  css: {
    postcss: undefined, // Let Vite handle CSS processing
  },
  build: {
    assetsDir: 'assets',
    cssCodeSplit: false, // Bundle all CSS into one file
    outDir: 'dist',
    cssMinify: false, // Disable CSS minification to avoid syntax errors
    rollupOptions: {
      output: {
        // Ensure CSS is always included
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/style-[hash].css';
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
  },
});

