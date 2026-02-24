import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@data': resolve(__dirname, 'src/data'),
      '@server': resolve(__dirname, 'src/server'),
      '@ui': resolve(__dirname, 'src/ui'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3838',
        changeOrigin: true,
      },
    },
    watch: {
      // Use polling for WSL2 cross-filesystem mounts
      usePolling: true,
      interval: 1000,
    },
  },
});
