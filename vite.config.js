import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: '/er-analyzer/',
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist'
  }
});
