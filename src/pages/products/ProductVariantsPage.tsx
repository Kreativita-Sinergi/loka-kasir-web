import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Archive, Save } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/ui/EmptyState'
import NumericInput from '@/components/ui/NumericInput'
import Switch from '@/components/ui/Switch'
import { Button } from '@/components/ui/button'
import BarcodeField from '@/components/products/BarcodeField'
import PriceTierRows from '@/components/products/PriceTierRows'
import { getProduct, getProductVariants, updateProductVariant } from '@/api/products'
import { rowsToTiers, tierRowsError, tiersToRows, type TierRow } from '@/lib/priceTiers'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import type { ProductVariant } from '@/types'

interface VariantDraft {
  name: string
  sku: string
  basePrice: string
  sellPrice: string
  memberPrice: string
  barcodes: string[]
  trackStock: boolean
  isActive: boolean
  isAvailable: boolean
  priceTiers: TierRow[]
}

const draftOf = (variant: ProductVariant): VariantDraft => ({
  name: variant.name,
  sku: variant.sku ?? '',
  basePrice: variant.base_price == null ? '' : String(variant.base_price),
  sellPrice: variant.sell_price == null ? '' : String(variant.sell_price),
  memberPrice: variant.member_price == null ? '' : String(variant.member_price),
  barcodes: variant.barcodes ?? [],
  trackStock: !!variant.track_stock,
  isActive: !!variant.is_active,
  isAvailable: !!variant.is_available,
  priceTiers: tiersToRows(variant.price_tiers),
})

function VariantEditor({ variant, productId }: { variant: ProductVariant; productId: string }) {
  const qc = useQueryClient()
  const [draft, setDraft] = useState(() => draftOf(variant))

  const save = useMutation({
    mutationFn: async () => {
      const name = draft.name.trim()
      if (!name) throw new Error(t('productNameRequired'))
      const tierError = tierRowsError(draft.priceTiers, draft.sellPrice, false)
      if (tierError) throw new Error(t(tierError))
      return updateProductVariant(variant.id, {
        name,
        sku: draft.sku.trim() || undefined,
        barcodes: draft.barcodes,
        base_price: draft.basePrice === '' ? null : Number(draft.basePrice),
        sell_price: draft.sellPrice === '' ? null : Number(draft.sellPrice),
        member_price: draft.memberPrice === '' ? 0 : Number(draft.memberPrice),
        price_tiers: rowsToTiers(draft.priceTiers),
        track_stock: draft.trackStock,
        is_active: draft.isActive,
        is_available: draft.isAvailable,
      })
    },
    onSuccess: async (response) => {
      setDraft(draftOf(response.data.data))
      toast.success(t('variantManageSaved'))
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['product-variants', productId] }),
        qc.invalidateQueries({ queryKey: ['products'] }),
      ])
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  })

  const input = 'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40'

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]">
        <label className="text-xs font-medium text-muted-foreground">
          {t('productVariantName')}
          <input className={`${input} mt-1 font-semibold`} value={draft.name}
            onChange={(event) => setDraft(value => ({ ...value, name: event.target.value }))} />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          SKU
          <input className={`${input} mt-1 font-mono`} value={draft.sku}
            onChange={(event) => setDraft(value => ({ ...value, sku: event.target.value }))} />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          {t('productPriceHintCost')}
          <NumericInput className={`${input} mt-1`} min={0} step="any" value={draft.basePrice}
            onChange={(event) => setDraft(value => ({ ...value, basePrice: event.target.value }))} />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          {t('productPriceHintSell')}
          <NumericInput className={`${input} mt-1`} min={0} step="any" value={draft.sellPrice}
            onChange={(event) => setDraft(value => ({ ...value, sellPrice: event.target.value }))} />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          {t('variantManageMemberPrice')}
          <NumericInput className={`${input} mt-1`} min={0} step="any" value={draft.memberPrice}
            onChange={(event) => setDraft(value => ({ ...value, memberPrice: event.target.value }))} />
        </label>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <p className="mb-2 text-xs font-semibold text-foreground">{t('variantManageBarcodes')}</p>
          <BarcodeField compact currentProductId={productId} barcodes={draft.barcodes}
            onChange={(barcodes) => setDraft(value => ({ ...value, barcodes }))} />
        </div>
        <div className="rounded-xl border border-border bg-muted/20 p-3">
          <PriceTierRows rows={draft.priceTiers} unitLabel="pcs"
            onChange={(priceTiers) => setDraft(value => ({ ...value, priceTiers }))} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-4">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Switch checked={draft.trackStock} label={t('productVariantTrackStock')}
            onChange={(trackStock) => setDraft(value => ({ ...value, trackStock }))} />
          {t('productVariantTrackStock')}
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Switch checked={draft.isActive} label={t('variantManageActive')}
            onChange={(isActive) => setDraft(value => ({ ...value, isActive }))} />
          {t('variantManageActive')}
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Switch checked={draft.isAvailable} label={t('variantManageAvailable')}
            onChange={(isAvailable) => setDraft(value => ({ ...value, isAvailable }))} />
          {t('variantManageAvailable')}
        </label>
        <Button className="ml-auto" size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
          <Save size={16} />{save.isPending ? t('saving') : t('actionSave')}
        </Button>
      </div>
    </section>
  )
}

export default function ProductVariantsPage() {
  const { productId = '' } = useParams()
  const navigate = useNavigate()
  const product = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
    enabled: !!productId,
  })
  const variants = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => getProductVariants(productId),
    enabled: !!productId,
  })
  const rows = variants.data?.data?.data ?? []
  const productName = product.data?.data?.data?.name

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Header title={t('variantManageTitle')} subtitle={productName ?? t('variantManageSubtitle')} />
      <main className="page-content flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/products')}>
              <ArrowLeft size={16} />{t('navProducts')}
            </Button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold text-foreground capitalize">{productName ?? t('variantManageTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('variantManageSubtitle')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/inventory/current-stock')}>
              <Archive size={16} />{t('variantManageGoStock')}
            </Button>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
            <p>{t('variantManageCatalogHint')}</p>
            <p className="mt-1 text-xs opacity-80">{t('variantManageStockHint')}</p>
          </div>

          {variants.isLoading ? (
            <div className="space-y-3">{[1, 2].map((key) => <div key={key} className="h-48 animate-pulse rounded-2xl bg-muted" />)}</div>
          ) : variants.error ? (
            <EmptyState title={getErrorMessage(variants.error)} action={{ label: t('actionRetry'), onClick: () => variants.refetch() }} />
          ) : rows.length === 0 ? (
            <EmptyState title={t('variantManageEmpty')} description={t('variantManageSubtitle')} />
          ) : (
            <div className="space-y-3">
              {rows.map((variant) => <VariantEditor key={variant.id} variant={variant} productId={productId} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
