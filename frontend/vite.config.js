import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // For a GitHub Pages project site, change this to '/YOUR_REPOSITORY_NAME/'.
  // Keep '/' for localhost, custom domains, Vercel, and root deployments.
  base: process.env.GITHUB_ACTIONS ? '/DataMind/' : '/',
  server: { host: '0.0.0.0' },
});
