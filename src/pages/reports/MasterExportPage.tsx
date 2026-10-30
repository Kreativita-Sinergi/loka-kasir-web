import { useState } from 'react'
import toast from 'react-hot-toast'
import { Boxes, Download, IdCard, Info, Package, Truck, Users, Warehouse } from 'lucide-react'
import Header from '@/components/layout/Header'
import Badge from '@/components/ui/Badge'
import { downloadMasterCsv } from '@/api/moneyReports'
import { PERMS, usePermissions } from '@/hooks/usePermissions'
import { useOutletStore } from '@/store/outletStore'
import { csvFilename } from '@/lib/exportUtils'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'
import type { PermissionCode } from '@/types'

interface MasterExport {
  title: MessageKey
  description: MessageKey
  icon: React.ReactNode
  /** Endpoint CSV di server. */
  path: string
  /** Awalan nama berkas ("pelanggan" → pelanggan-2026-10-30.csv). */
  prefix: string
  permission: PermissionCode
  pro?: boolean
  /** Stok dibaca per outlet: butuh outlet terpilih. */
  needsOutlet?: boolean
}

// Izin dan paket masing-masing sama dengan penjaga rutenya di server, jadi
// yang tidak boleh tidak pernah ditawari tombol yang pasti ditolak.
const EXPORTS: MasterExport[] = [
  { title: 'mexProducts', description: 'mexProductsDesc', icon: <Package size={18} />, path: '/product/export', prefix: 'produk', permission: PERMS.INVENTORY_VIEW },
  { title: 'mexStock', description: 'mexStockDesc', icon: <Warehouse size={18} />, path: '/inventory/stock-export', prefix: 'stok-barang', permission: PERMS.INVENTORY_VIEW, needsOutlet: true },
  { title: 'mexCustomers', description: 'mexCustomersDesc', icon: <Users size={18} />, path: '/export/customers', prefix: 'pelanggan', permission: PERMS.CUSTOMER_MANAGE, pro: true },
  { title: 'mexSuppliers', description: 'mexSuppliersDesc', icon: <Truck size={18} />, path: '/export/suppliers', prefix: 'supplier', permission: PERMS.INVENTORY_SUPPLIER, pro: true },
  { title: 'mexRawMaterials', description: 'mexRawMaterialsDesc', icon: <Boxes size={18} />, path: '/export/raw-materials', prefix: 'bahan-baku', permission: PERMS.INVENTORY_VIEW, pro: true },
  { title: 'mexEmployees', description: 'mexEmployeesDesc', icon: <IdCard size={18} />, path: '/export/employees', prefix: 'karyawan', permission: PERMS.EMPLOYEE_VIEW, pro: true },
]

/**
 * Ekspor Data Master — satu tempat untuk mengunduh semua data toko sebagai
 * CSV. Dulu hanya produk dan stok yang bisa dikeluarkan, masing-masing dari
 * halamannya sendiri; berkasnya dibuat server supaya angkanya sama dengan
 * yang tampil di aplikasi.
 */
export default function MasterExportPage() {
  const { can, isPro } = usePermissions()
  const { selected: selectedOutlet } = useOutletStore()
  const [busy, setBusy] = useState<string | null>(null)
  const exports = EXPORTS.filter(e => can(e.permission))

  // Unduhan lewat XHR, bukan <a href>: endpoint-nya butuh header Authorization.
  const download = async (e: MasterExport) => {
    if (e.needsOutlet && !selectedOutlet?.id) {
      toast.error(t('mexNeedsOutlet'))
      return
    }
    setBusy(e.path)
    try {
      const res = await downloadMasterCsv(e.path, selectedOutlet?.id ? { outlet_id: selectedOutlet.id } : undefined)
      const blob = new Blob([res.data as BlobPart], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = csvFilename(e.prefix)
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(getErrorMessage(err) || t('mexFailed'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <Header title={t('navMasterExport')} subtitle={t('mexSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="bg-card rounded-2xl border border-border divide-y divide-border">
          {exports.map(e => (
            <div key={e.path} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{e.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{t(e.title)}</p>
                <p className="text-xs text-muted-foreground">{t(e.description)}</p>
              </div>
              {e.pro && !isPro ? (
                <Badge variant="yellow">{t('mexNeedsPro')}</Badge>
              ) : (
                <button type="button" onClick={() => download(e)} disabled={busy !== null}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0">
                  <Download size={14} />
                  {busy === e.path ? t('loading') : t('mexDownload')}
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>{t('mexNote')}</p>
        </div>
      </div>
    </div>
  )
}
