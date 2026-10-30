import { useQuery } from '@tanstack/react-query'
import NumericInput from '@/components/ui/NumericInput'
import { getCostBasis } from '@/api/stock'
import { costAverages, stockEntryUnitCost, weightedCost } from '@/lib/productCost'
import { formatStockQuantity } from '@/lib/money'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'

/**
 * Kolom "Harga beli" opsional di Stok Masuk, beserta pratinjau "Harga modal:
 * Rp3.440.000 → Rp3.504.000 /pcs" dan stok lama yang ikut dirata-rata —
 * pemilik melihat dampaknya sebelum menyimpan. Pemanggil hanya menampilkannya
 * untuk pemegang inventory.edit; server menolak harga beli dari peran lain.
 */
export default function StockCostField({
  productId, variantId, storedQty, weight, weightUnit, unitName, value, onChange,
}: {
  productId: string
  variantId?: string | null
  /** Jumlah masuk dalam satuan stok (gram untuk timbangan). */
  storedQty: number
  weight: boolean
  weightUnit?: string | null
  /** Satuan ketik ("kg", "pcs", ...). */
  unitName: string
  value: string
  onChange: (v: string) => void
}) {
  const unitCost = stockEntryUnitCost(value, weight, weightUnit)
  const { data: basis } = useQuery({
    queryKey: ['product-cost-basis', productId, variantId ?? null],
    queryFn: () => getCostBasis(productId, variantId).then(r => r.data.data),
    enabled: !!productId && unitCost != null,
    staleTime: 30_000,
  })
  const next = basis && unitCost != null ? weightedCost(basis, storedQty, unitCost) : null
  const costUnit = weight ? 'kg' : unitName
  const current = basis?.cost ?? null

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {t('stockCostIn', { unit: unitName })} <span className="text-muted-foreground font-normal">({t('labelOptional')})</span>
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
        <NumericInput
          type="number"
          min="0"
          step="any"
          placeholder="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{t('stockCostInHint')}</p>
      {basis && next != null && (
        <div className="mt-1.5">
          <p className="text-xs font-medium text-foreground">
            {current == null || current <= 0
              ? t('poCostFirst', { after: formatCurrency(next), unit: costUnit })
              : Math.abs(next - current) < 0.005
                ? t('poCostUnchanged', { cost: formatCurrency(current), unit: costUnit })
                : t('poCostChange', { before: formatCurrency(current), after: formatCurrency(next), unit: costUnit })}
          </p>
          {costAverages(basis) && (
            <p className="text-xs text-muted-foreground">
              {t('stockCostAverage', {
                stock: formatStockQuantity(basis.stock, weight, unitName, weightUnit),
                cost: formatCurrency(current as number),
              })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
