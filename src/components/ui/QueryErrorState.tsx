import { AlertCircle, RefreshCw } from 'lucide-react'
import { t } from '@/lib/i18n'

export default function QueryErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => unknown }) {
  if (!error) return null
  return <div role="alert" className="m-3 flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-start gap-3">
      <AlertCircle size={19} className="mt-0.5 shrink-0 text-destructive" />
      <div><p className="text-sm font-semibold text-destructive">{t('dataLoadFailedTitle')}</p><p className="mt-1 text-sm text-muted-foreground">{t('dataLoadFailedBody')}</p></div>
    </div>
    {onRetry && <button type="button" onClick={() => { void onRetry() }} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted"><RefreshCw size={16} />{t('dataLoadRetry')}</button>}
  </div>
}
