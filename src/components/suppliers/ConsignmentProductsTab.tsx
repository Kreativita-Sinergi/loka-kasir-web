import { useQuery } from '@tanstack/react-query'
import { PackageCheck } from 'lucide-react'
import { DataTable } from '@/components/ui/Table'
import EmptyState from '@/components/ui/EmptyState'
import { getConsignmentProducts, type ConsignmentProduct } from '@/api/consignment'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { CS_KEYS } from './consignmentQueries'

/**
 * Tab "Produk titipan": barang milik satu penitip yang masih ada stoknya di
 * outlet aktif (GET /consignment/products). Endpoint mewajibkan keduanya,
 * jadi tanpa penitip terpilih tab ini hanya meminta pengguna memilih.
 */
export default function ConsignmentProductsTab({ consignorId, outlet }: {
  consignorId?: string
  outlet: { id: string; name: string } | null
}) {
  const enabled = !!consignorId && !!outlet?.id
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [CS_KEYS.products, outlet?.id, consignorId],
    queryFn: () => getConsignmentProducts({ outlet_id: outlet!.id, consignor_id: consignorId! }),
    select: (res) => res.data.data as ConsignmentProduct[],
    enabled,
  })

  if (!outlet) {
    return <div className="bg-card rounded-xl border border-border"><EmptyState icon={<PackageCheck size={26} />} title={t('labelOutlet')} description={t('csReturnNeedOutlet')} /></div>
  }
  if (!consignorId) {
    return <div className="bg-card rounded-xl border border-border"><EmptyState icon={<PackageCheck size={26} />} title={t('csTabProducts')} description={t('csProductsPickConsignor')} /></div>
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <DataTable<ConsignmentProduct>
        loading={isLoading}
        error={error}
        onRetry={refetch}
        data={data ?? []}
        emptyMessage={t('csReturnNoStock')}
        columns={[
          { key: 'name', label: t('csProduct'), render: (p) => <span className="font-medium text-foreground">{p.name}</span> },
          { key: 'sku', label: t('csColSku'), render: (p) => <span className="font-mono text-xs text-muted-foreground">{p.sku || '—'}</span> },
          {
            key: 'consignment_deposit_price', label: t('csColDepositPrice'), className: 'text-right',
            render: (p) => p.consignment_deposit_price != null
              ? <span className="font-semibold">{formatCurrency(p.consignment_deposit_price)}</span>
              : <span className="text-warning">{t('csDepositUnset')}</span>,
          },
          { key: 'stock', label: t('csColStock'), className: 'text-right', render: (p) => <span className="font-semibold tabular-nums">{p.stock}</span> },
        ]}
      />
      <p className="px-4 py-2.5 text-xs text-muted-foreground border-t border-border">{t('csProductsNote')}</p>
    </div>
  )
}
