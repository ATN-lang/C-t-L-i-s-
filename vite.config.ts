import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import fs from 'fs';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');

  // Check if Firebase setup was declined/unconfigured
  let useMocks = false;
  try {
    const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
    if (config.apiKey === 'remixed-api-key' || !config.apiKey) {
      useMocks = true;
    }
  } catch {
    useMocks = true;
  }

  return {
    base: '/Cát Lái sô/'
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        ...(useMocks ? {
          'firebase/app': path.resolve(__dirname, './src/lib/mocks/firebase-app.ts'),
          'firebase/auth': path.resolve(__dirname, './src/lib/mocks/firebase-auth.ts'),
          'firebase/firestore': path.resolve(__dirname, './src/lib/mocks/firebase-firestore.ts'),
        } : {}),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
