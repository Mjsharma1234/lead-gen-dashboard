import { defineConfig } from 'vite';

export default defineConfig({
  // In dev, proxy /api/* to the local Express server
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
});
