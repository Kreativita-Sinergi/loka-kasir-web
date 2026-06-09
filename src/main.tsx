import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { queryClient } from './lib/queryClient'
import { applyTheme } from './store/themeStore'
import { reloadForStaleChunk } from './lib/lazyWithRetry'

// Vite fires this when a preloaded chunk fails to load (typically a stale
// index.html after a new deploy). Force one hard reload to fetch fresh assets.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  reloadForStaleChunk()
})

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
        {/* Root safety net: a crash anywhere shows a recoverable error card
            instead of a blank black screen, and auto-reloads on stale chunks. */}
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
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
