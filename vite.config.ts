/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
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
