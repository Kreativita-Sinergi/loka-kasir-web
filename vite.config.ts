/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // App-shell offline: precache build assets. API tetap lewat IndexedDB.
        workbox: {
          navigateFallback: '/index.html',
          // Jangan intersep navigasi ke API/asset eksternal.
          navigateFallbackDenylist: [/^\/api/],
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,svg,ico,woff2}'],
        },
        includeAssets: [
          'favicon.ico',
          'icon-current.svg',
          'icon-192.png',
          'icon-512.png',
          'apple-touch-icon.png',
        ],
        manifest: {
          name: 'Loka Kasir',
          short_name: 'Loka Kasir',
          description: 'Kasir & manajemen toko Loka Kasir',
          theme_color: '#2563eb',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // lottie-react memasang `browser: build/index.umd.js` di package.json-nya,
        // dan Vite mendahulukan field `browser` saat build produksi. Bundel UMD
        // itu CommonJS tanpa penanda __esModule, sehingga interop-nya membuat
        // `default` berisi seluruh objek modul — React menerima objek, bukan
        // komponen, lalu melempar error #130 dan seluruh halaman digantikan
        // layar "Terjadi kesalahan". Dev server tidak terkena karena
        // pre-bundling-nya memilih build ESM. Ditunjuk langsung ke ESM-nya agar
        // keduanya memakai berkas yang sama.
        // Ditulis sebagai subpath paket (bukan jalur node_modules mutlak) supaya
        // tetap benar apa pun tata letak instalasinya.
        'lottie-react': 'lottie-react/build/index.es.js',
      },
    },
    server: {
      port: Number(env.VITE_APP_PORT) || 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
      alias: { '@': path.resolve(__dirname, './src') },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Split vendors into stable long-cached chunks
          manualChunks(id: string) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
              return 'vendor-react'
            }
            if (id.includes('node_modules/@tanstack/')) {
              return 'vendor-query'
            }
            if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3') || id.includes('node_modules/victory')) {
              return 'vendor-charts'
            }
            if (id.includes('node_modules/lucide-react/') || id.includes('node_modules/react-hot-toast/')) {
              return 'vendor-ui'
            }
            if (id.includes('node_modules/zustand/')) {
              return 'vendor-store'
            }
          },
        },
      },
    },
  }
})
