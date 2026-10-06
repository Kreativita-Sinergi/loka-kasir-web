import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { HandCoins, Users, Wallet } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import SearchableSelect from '@/components/ui/SearchableSelect'
import ConsignmentSalesPanel from '@/components/suppliers/ConsignmentSalesPanel'
import ConsignmentOutstandingTab from '@/components/suppliers/ConsignmentOutstandingTab'
import ConsignmentSettlementsTab from '@/components/suppliers/ConsignmentSettlementsTab'
import ConsignmentReturnsTab from '@/components/suppliers/ConsignmentReturnsTab'
import ConsignmentProductsTab from '@/components/suppliers/ConsignmentProductsTab'
import SettlementDetailModal from '@/components/suppliers/SettlementDetailModal'
import ConsignmentPrintArea, { type ConsignmentPrintDoc } from '@/components/suppliers/ConsignmentPrintArea'
import { CS_KEYS } from '@/components/suppliers/consignmentQueries'
import { firstOfMonth, iso, settlementStatus } from '@/components/suppliers/consignmentUtils'
import { getConsignorOutstanding, getConsignmentSettlements, type ConsignorBalance, type ConsignmentSettlement } from '@/api/consignment'
import { getSuppliers } from '@/api/suppliers'
import type { Supplier } from '@/types'
import { usePermissions, PERMS } from '@/hooks/usePermissions'
import { useOutletStore } from '@/store/outletStore'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'

const TABS = ['sales', 'outstanding', 'settlements', 'returns', 'products'] as const
type Tab = (typeof TABS)[number]
const TAB_LABEL: Record<Tab, () => string> = {
  sales: () => t('csTabSales'),
  outstanding: () => t('csTabOutstanding'),
  settlements: () => t('csTabSettlements'),
  returns: () => t('csTabReturns'),
  products: () => t('csTabProducts'),
}

/**
 * Back-office penitip barang — cermin layar "Penitip Barang" di aplikasi
 * kasir: barang titipan yang terjual, kewajiban ke penitip, riwayat
 * penyerahan uang, retur, dan produk titipan. Tab dan penitip terpilih
 * disimpan di URL (?tab=&consignor=) supaya bisa ditautkan dari halaman lain.
 */
export default function ConsignmentPage() {
  const [params, setParams] = useSearchParams()
  const rawTab = params.get('tab')
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'outstanding'
  const consignorId = params.get('consignor') ?? ''
  const setParam = (key: string, value: string) => setParams((prev) => {
    const next = new URLSearchParams(prev)
    if (value) next.set(key, value); else next.delete(key)
    return next
  }, { replace: true })

  const { can } = usePermissions()
  const canWrite = can(PERMS.INVENTORY_SUPPLIER)
  const selectedOutlet = useOutletStore((s) => s.selected)
  const outlet = selectedOutlet ? { id: selectedOutlet.id, name: selectedOutlet.name } : null

  const [detailId, setDetailId] = useState<string | null>(null)
  const [printDoc, setPrintDoc] = useState<ConsignmentPrintDoc | null>(null)
  const donePrinting = useCallback(() => setPrintDoc(null), [])
  const printSettlement = useCallback((s: ConsignmentSettlement) => setPrintDoc({ kind: 'settlement', data: s }), [])

  const { data: consignors = [] } = useQuery({
    queryKey: [CS_KEYS.consignors],
    queryFn: () => getSuppliers({ page: 1, limit: 200, is_consignor: true }),
    select: (res) => (res.data.data as Supplier[]).filter((s) => s.is_consignor),
  })

  // Ringkasan: kewajiban saat ini (saldo seluruh waktu) dan uang yang
  // diserahkan bulan ini.
  const { data: outstanding, isLoading: loadingOutstanding } = useQuery({
    queryKey: [CS_KEYS.outstanding, false],
    queryFn: () => getConsignorOutstanding(),
    select: (res) => res.data.data as ConsignorBalance[],
  })
  const monthStart = firstOfMonth()
  const today = iso(new Date())
  const { data: monthSettlements, isLoading: loadingMonth } = useQuery({
    queryKey: [CS_KEYS.settlements, monthStart, today],
    queryFn: () => getConsignmentSettlements({ start_date: monthStart, end_date: today }),
    select: (res) => res.data.data as ConsignmentSettlement[],
  })
  const scoped = (outstanding ?? []).filter((b) => !consignorId || b.supplier_id === consignorId)
  const totalOutstanding = scoped.reduce((s, b) => s + Math.max(b.outstanding, 0), 0)
  const paidThisMonth = (monthSettlements ?? [])
    .filter((s) => settlementStatus(s.status) === 'PAID' && (!consignorId || s.supplier_id === consignorId))
    .reduce((s, x) => s + x.total, 0)

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <Header title={t('csPageTitle')} subtitle={t('csPageSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-72">
            <SearchableSelect value={consignorId} onChange={(v) => setParam('consignor', v)} placeholder={t('csFilterConsignor')}
              options={consignors.map((c) => ({ value: c.id, label: c.name, hint: c.phone ?? undefined }))} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard title={t('csStatTotalOutstanding')} value={formatCurrency(totalOutstanding)} icon={<Wallet />} color="orange" emphasis loading={loadingOutstanding} />
          <StatCard title={t('csStatUnpaidConsignors')} value={scoped.filter((b) => b.outstanding >= 1).length} icon={<Users />} color="blue" loading={loadingOutstanding} />
          <StatCard title={t('csStatPaidThisMonth')} value={formatCurrency(paidThisMonth)} icon={<HandCoins />} color="green" loading={loadingMonth} />
        </div>

        <div role="tablist" aria-label={t('csPageTitle')} className="flex gap-1 overflow-x-auto border-b border-border">
          {TABS.map((key) => (
            <button key={key} type="button" role="tab" id={`cs-tab-${key}`} aria-selected={tab === key} aria-controls={`cs-panel-${key}`}
              onClick={() => setParam('tab', key)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {TAB_LABEL[key]()}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`cs-panel-${tab}`} aria-labelledby={`cs-tab-${tab}`}>
          {tab === 'sales' && <ConsignmentSalesPanel outletId={outlet?.id} />}
          {tab === 'outstanding' && <ConsignmentOutstandingTab consignorId={consignorId || undefined} canWrite={canWrite} onOpenSettlement={setDetailId} />}
          {tab === 'settlements' && <ConsignmentSettlementsTab consignorId={consignorId || undefined} onOpenSettlement={setDetailId} onPrint={printSettlement} />}
          {tab === 'returns' && (
            <ConsignmentReturnsTab consignorId={consignorId || undefined} outlet={outlet} consignors={consignors} canWrite={canWrite}
              onPrint={(r) => setPrintDoc({ kind: 'return', data: r })} />
          )}
          {tab === 'products' && <ConsignmentProductsTab consignorId={consignorId || undefined} outlet={outlet} />}
        </div>
      </div>

      {detailId && <SettlementDetailModal id={detailId} canWrite={canWrite} onClose={() => setDetailId(null)} onPrint={printSettlement} />}
      <ConsignmentPrintArea doc={printDoc} onDone={donePrinting} />
    </div>
  )
}
