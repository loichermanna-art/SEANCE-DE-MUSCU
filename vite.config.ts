import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Gym OS — socle PWA (§15 du cahier des charges)
// Le service worker met en cache l'application pour un usage hors-ligne en salle.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'GYM OS',
        short_name: 'GYM OS',
        description: 'Planifie, exécute et analyse tes séances de musculation.',
        lang: 'fr',
        theme_color: '#f6f8fb',
        background_color: '#f6f8fb',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor'
          if (/node_modules\/(react-router|react-router-dom|@remix-run)\//.test(id)) return 'router-vendor'
          if (/node_modules\/(dexie|dexie-react-hooks)\//.test(id)) return 'data-vendor'
          if (/node_modules\/lucide-react\//.test(id)) return 'icons-vendor'
        },
      },
    },
  },
})
