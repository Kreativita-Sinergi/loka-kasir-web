import { lazy, type ComponentType } from 'react'

/**
 * Recovery for the classic Vite error after a new deploy:
 *   "Failed to fetch dynamically imported module / Error Loading Dynamically Imported Module"
 *
 * It happens when the browser is holding a stale index.html that references old
 * hashed chunk filenames (e.g. DashboardPage-MblQ1_vD.js) which no longer exist
 * on the server. The fix is to force a single hard reload so the fresh index.html
 * + current chunk hashes are fetched. A sessionStorage guard prevents an infinite
 * reload loop when the chunk is genuinely missing.
 */

const RELOAD_KEY = 'loka:chunk-reload'

/** Heuristic: does this error look like a stale/missing lazy chunk? */
export function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically imported/i.test(
    msg,
  )
}

/**
 * Trigger a single hard reload to pick up fresh assets after a deploy.
 * Returns true if a reload was triggered, false if one already happened
 * (so callers can surface the error instead of looping).
 */
export function reloadForStaleChunk(): boolean {
  if (window.sessionStorage.getItem(RELOAD_KEY)) return false
  window.sessionStorage.setItem(RELOAD_KEY, '1')
  window.location.reload()
  return true
}

/** Clear the guard once a chunk has loaded successfully again. */
export function clearStaleChunkFlag(): void {
  window.sessionStorage.removeItem(RELOAD_KEY)
}

/**
 * Drop-in replacement for React.lazy that auto-recovers from stale chunks.
 * On the first failure it forces a reload; if it still fails after reloading,
 * the error propagates to the nearest ErrorBoundary.
 */
export function lazyWithRetry<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mirrors React.lazy's own ComponentType<any> constraint
  T extends ComponentType<any>,
>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const mod = await factory()
      clearStaleChunkFlag()
      return mod
    } catch (error) {
      if (reloadForStaleChunk()) {
        // Hang until the page reloads so React doesn't render an error flash.
        return new Promise<{ default: T }>(() => {})
      }
      throw error
    }
  })
}
