import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { isChunkLoadError, clearStaleChunkFlag } from '@/lib/lazyWithRetry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => {
    // A stale-chunk error can't be recovered by re-rendering the same (missing)
    // module — clear the reload guard and do a hard reload to fetch fresh assets.
    if (isChunkLoadError(this.state.error)) {
      clearStaleChunkFlag()
      window.location.reload()
      return
    }
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[240px] gap-4 text-center p-8">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center">
          <AlertTriangle size={22} className="text-red-500 dark:text-red-400" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Terjadi kesalahan</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {this.state.error?.message ?? 'Halaman tidak dapat ditampilkan.'}
          </p>
        </div>
        <button
          onClick={this.reset}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-xl hover:bg-blue-50 dark:bg-blue-500/10 transition"
        >
          <RefreshCw size={14} />
          Coba lagi
        </button>
      </div>
    )
  }
}
