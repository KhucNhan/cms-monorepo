import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],

    alias: [
      {
        find: /^@cms\/block-registry\/editors$/,
        replacement: path.resolve(
          __dirname,
          '../../packages/block-registry/src/editors.ts',
        ),
      },
      {
        find: /^@cms\/block-registry$/,
        replacement: path.resolve(
          __dirname,
          '../../packages/block-registry/src/index.ts',
        ),
      },
      {
        find: /^@cms\/shared-types$/,
        replacement: path.resolve(
          __dirname,
          '../../packages/shared-types/src/index.ts',
        ),
      },
      {
        find: '@',
        replacement: path.resolve(__dirname, './src'),
      },
    ],
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: ['admin.khucnhan.io.vn'],
  },
});