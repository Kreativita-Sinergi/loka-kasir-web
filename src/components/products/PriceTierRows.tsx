import { Plus, X } from 'lucide-react'
import NumericInput from '@/components/ui/NumericInput'
import { t } from '@/lib/i18n'
import { MAX_PRICE_TIERS, type TierRow } from '@/lib/priceTiers'

/** Penyunting harga grosir: "minimal beli → harga satuan". */
export default function PriceTierRows({ rows, onChange, unitLabel, compact = false }: {
  rows: TierRow[]
  onChange: (rows: TierRow[]) => void
  /** "pcs", atau satuan jual barang terukur ("kg", "ons", ...). */
  unitLabel: string
  /** Tampilan rapat untuk baris varian. */
  compact?: boolean
}) {
  const input = compact
    ? 'w-full px-2 py-1 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500'
    : 'w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500'
  const set = (i: number, patch: Partial<TierRow>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <div className="space-y-2">
      {!compact && (
        <div>
          <p className="text-xs font-medium text-foreground">{t('priceTierTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('priceTierHint')}</p>
        </div>
      )}
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center">
          <NumericInput type="number" min={0} step="any" value={r.min_qty}
            onChange={(e) => set(i, { min_qty: e.target.value })}
            aria-label={t('priceTierMinQty', { unit: unitLabel })}
            placeholder={t('priceTierMinQty', { unit: unitLabel })}
            className={input} />
          <NumericInput type="number" min={0} step="any" value={r.price}
            onChange={(e) => set(i, { price: e.target.value })}
            aria-label={t('priceTierPrice', { unit: unitLabel })}
            placeholder={t('priceTierPrice', { unit: unitLabel })}
            className={input} />
          <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))}
            aria-label={t('priceTierRemove')}
            className="p-1 text-muted-foreground hover:text-red-500 transition">
            <X size={compact ? 12 : 14} />
          </button>
        </div>
      ))}
      {rows.length < MAX_PRICE_TIERS && (
        <button type="button" onClick={() => onChange([...rows, { min_qty: '', price: '' }])}
          className={`inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline ${compact ? 'text-[11px]' : 'text-xs'}`}>
          <Plus size={compact ? 11 : 13} />{t(compact ? 'priceTierAddShort' : 'priceTierAdd')}
        </button>
      )}
    </div>
  )
}
