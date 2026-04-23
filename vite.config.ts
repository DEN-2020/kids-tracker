import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

import compression from 'vite-plugin-compression'
import pkg from './package.json'

export default defineConfig({
  plugins: [
    react(),
    compression(),
    cssInjectedByJsPlugin(), // Это вставит CSS в JS и уберет блокирующий запрос
    ViteImageOptimizer({
      avif: { quality: 50 }, 
      webp: { quality: 60 },
      jpeg: { quality: 70 }, 
      png: { quality: 70 },
    }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['assets/**/*.{js,css,html,webp,avif}', 'index.html'],
        cleanupOutdatedCaches: true,
     
        dontCacheBustURLsMatching: /^assets\//, // Игнорировать хеширование для файлов в assets (у них уже есть хеш)
        maximumFileSizeToCacheInBytes: 3000000, // Увеличим лимит до 3Мб на всякий случай для bg.avif
      },
      manifest: {
        name: 'Kids Tracker 2026',
        short_name: 'KidsTracker',
        description: 'Family Task & Reward System',
        theme_color: '#007AFF', 
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: '/',
  define: {
     'import.meta.env.VITE_PACKAGE_VERSION': JSON.stringify(pkg.version)
  },
build: {
  target: 'esnext',
  minify: 'esbuild',
  rollupOptions: {
    output: {
manualChunks(id) {
  if (id.includes('node_modules')) {
    // 1. Графики - отдельно (они огромные и нужны редко)
    if (id.includes('recharts')) return 'charts';

    // 2. Весь Firebase - в один чанк. 
    // Это предотвратит Circular Dependency и ошибки инициализации.
    if (id.includes('firebase')) return 'firebase-bundle';

    // 3. Ядро Реакта - отдельно
    if (id.includes('react-dom')) return 'vendor-dom';

    // Все остальное (мелкие либы)
    return 'vendor';
  }
},
    },
  },
},
})