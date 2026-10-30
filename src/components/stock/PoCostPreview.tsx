import { useQuery } from '@tanstack/react-query'
import { getCostBasis } from '@/api/stock'
import { costChange } from '@/lib/purchaseOrderLines'
import { costAverages, weightedCost } from '@/lib/productCost'
import { formatStockQuantity } from '@/lib/money'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'
import type { POItem } from '@/types'

/**
 * "Harga modal: Rp2.800 → Rp2.978 /pcs ▲6%" di bawah baris produk Terima
 * Barang. Harga modal baru = rata-rata tertimbang stok lama (semua outlet) dan
 * barang yang diterima, sama dengan hitungan server. Harga beli yang melompat
 * > 50% dari modal lama diberi warna peringatan: kemungkinan salah ketik.
 */
export default function PoCostPreview({ item, baseQty, baseUnitCost }: {
  item: POItem
  /** Jumlah diterima dalam satuan dasar (gram untuk timbangan). */
  baseQty: number
  /** Harga beli per satuan dasar (per gram untuk timbangan). */
  baseUnitCost: number
}) {
  // Stok lama belum terbaca (atau gagal): pratinjau memakai harga beli apa
  // adanya — server tetap menghitung rata-ratanya.
  const { data: basis } = useQuery({
    queryKey: ['product-cost-basis', item.product_id, item.variant_id ?? null],
    queryFn: () => getCostBasis(item.product_id as string, item.variant_id).then(r => r.data.data),
    enabled: !!item.product_id,
    staleTime: 30_000,
  })
  // Harga modal produk timbangan disimpan per kg; tampilkan per kg juga.
  const perKg = !!item.is_weight_based
  const scale = perKg ? 1000 : 1
  const unitLabel = perKg ? 'kg' : item.unit_alias
  const purchase = baseUnitCost * scale
  const current = (item.current_cost ?? 0) * scale
  const next = (basis && weightedCost(basis, baseQty, purchase)) ?? purchase
  const change = costChange(current, next)
  const jump = costChange(current, purchase).large
  const average = basis && costAverages(basis) && change.kind !== 'first' && (
    <p className="text-xs text-muted-foreground">
      {t('stockCostAverage', {
        stock: formatStockQuantity(basis.stock, perKg, item.unit_alias),
        cost: formatCurrency(current),
      })}
    </p>
  )
  if (change.kind === 'same') {
    return (
      <div className="mt-1">
        <p className="text-xs text-muted-foreground">{t('poCostUnchanged', { cost: formatCurrency(current), unit: unitLabel })}</p>
        {average}
      </div>
    )
  }
  const text = change.kind === 'first'
    ? t('poCostFirst', { after: formatCurrency(next), unit: unitLabel })
    : t('poCostChange', { before: formatCurrency(current), after: formatCurrency(next), unit: unitLabel })
  const trend = change.kind === 'up' ? `▲${Math.abs(change.percent).toFixed(0)}%` : change.kind === 'down' ? `▼${Math.abs(change.percent).toFixed(0)}%` : ''
  return (
    <div className="mt-1">
      <p className={`text-xs font-medium ${jump ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}`}>
        {text}{trend && <span className={`ml-1 ${change.kind === 'up' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{trend}</span>}
      </p>
      {average}
      {jump && <p className="text-xs text-amber-700 dark:text-amber-400">{t('poCostJumpWarning')}</p>}
    </div>
  )
}
