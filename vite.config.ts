import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
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
  base: '/kids-tracker/',
  define: {
    // Авто-версия из package.json
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version)
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    // МЫ УБРАЛИ rollupOptions, чтобы CSS грузился корректно одним файлом
  },
})