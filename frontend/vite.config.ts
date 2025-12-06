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
    postcss: undefined,
  },
  build: {
    assetsDir: 'assets',
    cssCodeSplit: false,
    outDir: 'dist',
    cssMinify: false,
    // Ensure manifest is generated for CSS
    manifest: true,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});

