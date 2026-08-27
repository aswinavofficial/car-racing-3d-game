import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/car-racing-3d-game/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Turbo Drift 3D - Racing',
        short_name: 'TurboDrift',
        description: 'High-octane 3D racing PWA - drift, race, win!',
        theme_color: '#ff2a00',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'landscape',
        scope: '/car-racing-3d-game/',
        start_url: '/car-racing-3d-game/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ]
})
