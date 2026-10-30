import { productionDisplayName, type ProductionReport } from '@/api/production'
import { formatDateTime } from '@/lib/utils'
import { t } from '@/lib/i18n'

// Bentuk baris yang diterima exportToCSV.
type CsvRow = Record<string, string | number>

/**
 * CSV Laporan Perakitan: tiga bagian dalam satu berkas (produksi, per barang
 * jadi, komponen) dengan kolom Bagian — sama dengan ekspor aplikasi. Tanpa
 * baris TOTAL: biaya yang sama muncul di ketiga bagian.
 */
export function productionReportCsvRows(r: ProductionReport): CsvRow[] {
  const row = (section: string, v: { when?: string; number?: string; outlet?: string; name: string; qty: number; unit?: string; total: number; avg: number; status?: string }): CsvRow => ({
    [t('pdnCsvSection')]: section,
    [t('pdnCsvDate')]: v.when ?? '',
    [t('pdnCsvNumber')]: v.number ?? '',
    [t('pdnFieldOutlet')]: v.outlet ?? '',
    [t('pdnCsvName')]: v.name,
    [t('pdnCsvQty')]: v.qty,
    [t('pdnCsvUnit')]: v.unit ?? '',
    [t('pdnTotalCost')]: v.total,
    [t('pdnCsvAvgCost')]: v.avg,
    [t('pdnCsvStatus')]: v.status ?? '',
  })
  return [
    ...r.orders.map(o => row(t('pdnCsvSectionOrder'), {
      when: formatDateTime(o.produced_at), number: o.number, outlet: o.outlet_name, name: productionDisplayName(o),
      qty: o.qty_output, total: o.total_cost, avg: o.unit_cost,
      status: o.status === 'voided' ? t('pdnVoidedReason', { reason: o.void_reason ?? '-' }) : t('pdnStatusDone'),
    })),
    ...r.products.map(p => row(t('pdnCsvSectionProduct'), {
      name: productionDisplayName(p), qty: p.qty_output, total: p.total_cost, avg: p.avg_cost,
      status: t('pdnStatOrdersCount', { count: p.orders }),
    })),
    ...r.components.map(c => row(t('pdnCsvSectionComponent'), {
      name: c.name, qty: c.qty, unit: c.unit_name ?? '', total: c.total_cost, avg: c.avg_cost,
    })),
  ]
}
