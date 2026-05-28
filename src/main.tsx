import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import { applyTheme } from './store/themeStore'

// Apply saved theme immediately to prevent flash of unstyled content
try {
  const saved = localStorage.getItem('loka-theme')
  if (saved) {
    const { state } = JSON.parse(saved)
    applyTheme(state?.theme ?? 'light')
  }
} catch { /* ignore */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', fontSize: '14px' },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
