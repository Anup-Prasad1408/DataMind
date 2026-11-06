import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Repository-level GitHub Pages site: https://<user>.github.io/DataMind/
  base: process.env.GITHUB_ACTIONS === 'true' ? '/DataMind/' : '/',
  server: { port: 5173, strictPort: true },
});
