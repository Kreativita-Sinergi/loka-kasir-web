import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { QrCode, Landmark, Wallet, Download, ArrowRight } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import { getPaymentMethodReport, type PaymentMethodReport } from '@/api/transactions'
import { formatCurrency } from '@/lib/utils'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'
import { t } from '@/lib/i18n'

type MethodChoice = '' | 'QRIS' | 'TRANSFER'

const methodLabel = (code: string) =>
  code === 'QRIS' ? 'QRIS' : code === 'TRANSFER' ? t('payMethodTransfer') : code

/**
 * Laporan uang masuk non-tunai: QRIS dan transfer.
 *
 * Uang tunai sudah punya laporannya sendiri (per shift, dicocokkan dengan
 * laci). Uang QRIS dan transfer tidak pernah lewat laci — yang perlu dicocokkan
 * pemilik adalah mutasi rekeningnya, jadi laporan ini disusun per hari:
 * baris "12 Sep · QRIS · Rp1.250.000" bisa dicocokkan langsung dengan mutasi.
 *
 * Rentang tanggal dan outlet ikut halaman induknya; metode dipilih di sini.
 * Setiap angka menaut ke Riwayat Transaksi dengan saringan yang sama.
 */
export default function NonCashPaymentReport({ outletId, startDate, endDate }: {
  outletId?: string
  startDate: string
  endDate: string
}) {
  const [method, setMethod] = useState<MethodChoice>('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['payment-report', outletId, startDate, endDate, method],
    queryFn: () => getPaymentMethodReport({
      outlet_id: outletId || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      payment_method: method || undefined,
    }),
    select: (res) => res.data.data as PaymentMethodReport,
  })

  const methods = data?.methods ?? []
  const daily = data?.daily ?? []
  const byCode = (code: string) => methods.find((m) => m.code === code)

  const historyLink = (code?: string, date?: string) => {
    const q = new URLSearchParams()
    q.set('payment_method', code || method || 'QRIS,TRANSFER')
    if (date) {
      q.set('start_date', date)
      q.set('end_date', date)
    } else {
      if (startDate) q.set('start_date', startDate)
      if (endDate) q.set('end_date', endDate)
    }
    return `/transactions?${q.toString()}`
  }

  const handleExport = () => {
    exportToCSV(
      daily.map((d) => ({
        [t('labelDate')]: d.date,
        [t('payMethodColumn')]: methodLabel(d.code),
        [t('payReportTxCount')]: d.transaction_count,
        [t('labelTotal')]: d.total,
      })),
      csvFilename('laporan-qris-transfer'),
    )
  }

  const chips: { value: MethodChoice; label: string }[] = [
    { value: '', label: t('payMethodNonCash') },
    { value: 'QRIS', label: 'QRIS' },
    { value: 'TRANSFER', label: t('payMethodTransfer') },
  ]

  return (
    <div className="bg-card rounded-2xl border border-border">
      <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{t('payReportTitle')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t('payReportDesc')}</p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted rounded-xl shrink-0" role="group" aria-label={t('payMethodFilter')}>
          {chips.map((c) => (
            <button
              key={c.value || 'all'}
              onClick={() => setMethod(c.value)}
              aria-pressed={method === c.value}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${method === c.value ? 'bg-card text-blue-600 dark:text-blue-400 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          disabled={!daily.length}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0"
        >
          <Download size={14} />
          {t('exportCsv')}
        </button>
      </div>

      <div className="p-5 space-y-5">
        {isError && (
          <div className="bg-destructive-subtle border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
            {t('payReportLoadFailed')}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title={t('payReportTotal')}
            value={formatCurrency(data?.total ?? 0)}
            icon={<Wallet size={20} />}
            color="blue"
            loading={isLoading}
          />
          {(method === '' || method === 'QRIS') && (
            <StatCard
              title="QRIS"
              value={formatCurrency(byCode('QRIS')?.total ?? 0)}
              subtitle={t('payReportTxN', { n: byCode('QRIS')?.transaction_count ?? 0 })}
              icon={<QrCode size={20} />}
              color="purple"
              loading={isLoading}
            />
          )}
          {(method === '' || method === 'TRANSFER') && (
            <StatCard
              title={t('payMethodTransfer')}
              value={formatCurrency(byCode('TRANSFER')?.total ?? 0)}
              subtitle={t('payReportTxN', { n: byCode('TRANSFER')?.transaction_count ?? 0 })}
              icon={<Landmark size={20} />}
              color="green"
              loading={isLoading}
            />
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">{t('labelDate')}</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase">{t('payMethodColumn')}</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">{t('payReportTxCount')}</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase">{t('labelTotal')}</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-4 py-3"><div className="h-4 bg-muted rounded" /></td>
                  </tr>
                ))
              ) : daily.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">{t('payReportEmpty')}</td>
                </tr>
              ) : (
                daily.map((d) => (
                  <tr key={`${d.date}-${d.code}`} className="hover:bg-muted transition-colors">
                    <td className="px-4 py-2.5 text-sm text-foreground">
                      {new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-foreground">{methodLabel(d.code)}</td>
                    <td className="px-4 py-2.5 text-sm text-muted-foreground text-right">{d.transaction_count}</td>
                    <td className="px-4 py-2.5 text-sm font-semibold text-foreground text-right">{formatCurrency(d.total)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Link to={historyLink(d.code, d.date)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                        {t('payReportSeeTx')} <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{t('payReportNote')}</p>
          <Link to={historyLink()} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
            {t('payReportSeeAllTx')} <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  )
}
