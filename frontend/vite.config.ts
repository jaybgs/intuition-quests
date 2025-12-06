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
    // Let Vite handle CSS processing normally
  },
  build: {
    assetsDir: 'assets',
    cssCodeSplit: false, // Bundle all CSS into one file
    outDir: 'dist',
    cssMinify: false, // Disable minification to avoid syntax errors
    manifest: true,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // Ensure CSS is included in the bundle
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});

