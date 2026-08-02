import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, TrendingUp, ArrowDownCircle, ArrowUpCircle, Download, CalendarRange, X, BookOpen } from 'lucide-react'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import StatCard from '@/components/ui/StatCard'
import { getShifts } from '@/api/shifts'
import { useOutletStore } from '@/store/outletStore'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { exportToCSV, csvFilename } from '@/lib/exportUtils'
import type { Shift } from '@/types'

export default function FinancialReportsPage() {
  const { selected: selectedOutlet } = useOutletStore()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const hasDateFilter = !!startDate || !!endDate

  const { data, isLoading } = useQuery({
    queryKey: ['shifts-financial', selectedOutlet?.id, startDate, endDate],
    queryFn: () => getShifts({
      limit: 100,
      outlet_id: selectedOutlet?.id,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
  })

  const shifts: Shift[] = data?.data?.data?.results ?? []

  // ── Aggregate financial summary ──
  const totalSales     = shifts.reduce((s, sh) => s + (sh.total_sales ?? 0), 0)
  const totalRefunds   = shifts.reduce((s, sh) => s + (sh.total_refunds ?? 0), 0)
  const totalOpenCash  = shifts.reduce((s, sh) => s + (sh.opening_cash ?? 0), 0)
  const totalTax       = shifts.reduce((s, sh) => s + (sh.total_tax ?? 0), 0)
  // Kas masuk/keluar di luar penjualan (setoran modal, ambil uang, beli gas/galon).
  const totalCashIn    = shifts.reduce((s, sh) => s + (sh.total_cash_in ?? 0), 0)
  const totalCashOut   = shifts.reduce((s, sh) => s + (sh.total_cash_out ?? 0), 0)
  const netRevenue     = totalSales - totalRefunds

  const openShifts   = shifts.filter((s) => s.status === 'open').length
  const closedShifts = shifts.filter((s) => s.status === 'closed').length

  const handleExportJurnal = () => {
    const rows: Record<string, string | number>[] = []
    shifts.forEach((s) => {
      const tanggal = s.opened_at ? s.opened_at.slice(0, 10) : ''
      const keterangan = `Penjualan shift #${s.id.slice(0, 8)}`
      // Debit — Kas & Bank
      rows.push({
        'Tanggal': tanggal,
        'Kode_Akun': '1-1001',
        'Nama_Akun': 'Kas & Bank',
        'Debit': s.total_sales ?? 0,
        'Kredit': 0,
        'Keterangan': keterangan,
      })
      // Kredit — Pendapatan Penjualan
      rows.push({
        'Tanggal': tanggal,
        'Kode_Akun': '4-1001',
        'Nama_Akun': 'Pendapatan Penjualan',
        'Debit': 0,
        'Kredit': s.total_sales ?? 0,
        'Keterangan': keterangan,
      })
      // Refund reversal (jika ada)
      if ((s.total_refunds ?? 0) > 0) {
        const keteranganRefund = `Refund shift #${s.id.slice(0, 8)}`
        rows.push({
          'Tanggal': tanggal,
          'Kode_Akun': '4-1001',
          'Nama_Akun': 'Pendapatan Penjualan',
          'Debit': s.total_refunds ?? 0,
          'Kredit': 0,
          'Keterangan': keteranganRefund,
        })
        rows.push({
          'Tanggal': tanggal,
          'Kode_Akun': '1-1001',
          'Nama_Akun': 'Kas & Bank',
          'Debit': 0,
          'Kredit': s.total_refunds ?? 0,
          'Keterangan': keteranganRefund,
        })
      }
      // Kas masuk non-penjualan (setoran modal, pendapatan lain).
      if ((s.total_cash_in ?? 0) > 0) {
        const ket = `Kas masuk shift #${s.id.slice(0, 8)}`
        rows.push({ 'Tanggal': tanggal, 'Kode_Akun': '1-1001', 'Nama_Akun': 'Kas & Bank',            'Debit': s.total_cash_in!, 'Kredit': 0,                'Keterangan': ket })
        rows.push({ 'Tanggal': tanggal, 'Kode_Akun': '4-2001', 'Nama_Akun': 'Pendapatan Lain-lain',  'Debit': 0,                'Kredit': s.total_cash_in!, 'Keterangan': ket })
      }
      // Kas keluar shift = pengeluaran operasional yang dibayar dari laci kasir.
      if ((s.total_cash_out ?? 0) > 0) {
        const ket = `Kas keluar shift #${s.id.slice(0, 8)}`
        rows.push({ 'Tanggal': tanggal, 'Kode_Akun': '6-1001', 'Nama_Akun': 'Beban Operasional', 'Debit': s.total_cash_out!, 'Kredit': 0,                 'Keterangan': ket })
        rows.push({ 'Tanggal': tanggal, 'Kode_Akun': '1-1001', 'Nama_Akun': 'Kas & Bank',        'Debit': 0,                 'Kredit': s.total_cash_out!, 'Keterangan': ket })
      }
    })
    exportToCSV(rows, csvFilename('jurnal-akuntansi'))
  }

  const handleExport = () => {
    const rows = shifts.map((s) => ({
      'Kasir':           s.cashier?.business?.owner_name ?? '-',
      'Perangkat Kasir': s.terminal?.name ?? '-',
      'Outlet':          s.outlet?.name ?? '-',
      'Dibuka':          formatDateTime(s.opened_at),
      'Ditutup':         s.closed_at ? formatDateTime(s.closed_at) : '-',
      'Kas Awal (Rp)':   s.opening_cash ?? 0,
      'Kas Akhir (Rp)':  s.closing_cash ?? 0,
      'Total Penjualan (Rp)': s.total_sales ?? 0,
      'Dana Dikembalikan (Rp)': s.total_refunds ?? 0,
      // Kas masuk/keluar di luar penjualan (setoran modal, ambil uang, beli
      // galon/gas, dsb.) — dicatat kasir lewat fitur kas masuk/kas keluar shift.
      'Pemasukan Kas Lain (Rp)':  s.total_cash_in ?? 0,
      'Pengeluaran Kas (Rp)':     s.total_cash_out ?? 0,
      'Pajak PPN (Rp)':       s.total_tax ?? 0,
      'Net (Rp)':        (s.total_sales ?? 0) - (s.total_refunds ?? 0),
      'Selisih Kas (Rp)': s.discrepancy ?? 0,
      'Status':          s.status === 'open' ? 'Buka' : 'Tutup',
    }))
    exportToCSV(rows, csvFilename('laporan-keuangan'))
  }

  const columns = [
    {
      key: 'cashier',
      label: 'Kasir / Perangkat',
      render: (row: Shift) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.cashier?.name ?? '-'}</p>
          <p className="text-xs text-muted-foreground">{row.terminal?.name ?? '-'} · {row.outlet?.name ?? '-'}</p>
        </div>
      ),
    },
    {
      key: 'opened_at',
      label: 'Periode',
      render: (row: Shift) => (
        <div>
          <p className="text-xs text-foreground">{formatDateTime(row.opened_at)}</p>
          <p className="text-xs text-muted-foreground">{row.closed_at ? formatDateTime(row.closed_at) : 'Belum Ditutup'}</p>
        </div>
      ),
    },
    {
      key: 'opening_cash',
      label: 'Kas Awal',
      render: (row: Shift) => (
        <span className="text-sm text-foreground">{formatCurrency(row.opening_cash ?? 0)}</span>
      ),
    },
    {
      key: 'closing_cash',
      label: 'Kas Akhir',
      render: (row: Shift) => (
        <span className="text-sm text-foreground">
          {row.closing_cash != null ? formatCurrency(row.closing_cash) : <span className="text-muted-foreground">—</span>}
        </span>
      ),
    },
    {
      key: 'total_sales',
      label: 'Total Penjualan',
      render: (row: Shift) => (
        <span className="text-sm font-semibold text-foreground">{formatCurrency(row.total_sales ?? 0)}</span>
      ),
    },
    {
      key: 'total_refunds',
      label: 'Pengembalian Dana',
      render: (row: Shift) => (
        <span className={`text-sm ${(row.total_refunds ?? 0) > 0 ? 'text-red-500 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
          {(row.total_refunds ?? 0) > 0 ? `- ${formatCurrency(row.total_refunds!)}` : '—'}
        </span>
      ),
    },
    {
      key: 'total_tax',
      label: 'Pajak (PPN)',
      render: (row: Shift) => (
        <span className={`text-sm ${(row.total_tax ?? 0) > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
          {(row.total_tax ?? 0) > 0 ? formatCurrency(row.total_tax!) : '—'}
        </span>
      ),
    },
    {
      key: 'net',
      label: 'Net',
      render: (row: Shift) => {
        const net = (row.total_sales ?? 0) - (row.total_refunds ?? 0)
        return <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(net)}</span>
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Shift) => (
        <Badge variant={row.status === 'open' ? 'green' : 'gray'}>
          {row.status === 'open' ? 'Buka' : 'Tutup'}
        </Badge>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Laporan Keuangan"
        subtitle={selectedOutlet ? `Pemasukan, pengeluaran, dan arus kas ${selectedOutlet.name}` : 'Pemasukan, pengeluaran, dan arus kas semua outlet'}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Penjualan"
            value={formatCurrency(totalSales)}
            icon={<TrendingUp size={20} />}
            color="green"
            loading={isLoading}
          />
          <StatCard
            title="Dana Dikembalikan"
            value={formatCurrency(totalRefunds)}
            icon={<ArrowDownCircle size={20} />}
            color="orange"
            loading={isLoading}
          />
          <StatCard
            title="Pendapatan Bersih"
            value={formatCurrency(netRevenue)}
            icon={<DollarSign size={20} />}
            color="blue"
            loading={isLoading}
          />
          <StatCard
            title="Total Kas Awal"
            value={formatCurrency(totalOpenCash)}
            icon={<ArrowUpCircle size={20} />}
            color="purple"
            loading={isLoading}
          />
          <StatCard
            title="Pajak (PPN)"
            value={formatCurrency(totalTax)}
            icon={<BookOpen size={20} />}
            color="orange"
            loading={isLoading}
          />
          <StatCard
            title="Pemasukan Kas Lain"
            value={formatCurrency(totalCashIn)}
            icon={<ArrowUpCircle size={20} />}
            color="green"
            loading={isLoading}
          />
          <StatCard
            title="Pengeluaran Kas"
            value={formatCurrency(totalCashOut)}
            icon={<ArrowDownCircle size={20} />}
            color="orange"
            loading={isLoading}
          />
        </div>

        {/* Shift breakdown info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-500/10 border border-green-100 rounded-xl text-xs text-green-700 dark:text-green-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            {openShifts} Shift Aktif
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border rounded-xl text-xs text-muted-foreground font-medium">
            <span className="w-2 h-2 rounded-full bg-muted" />
            {closedShifts} Shift Tutup
          </div>
        </div>

        {/* Shift Detail Table */}
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Rincian Per Sesi Shift</p>
              <p className="text-xs text-muted-foreground mt-0.5">Kas awal · kas akhir · penjualan · pengembalian dana per sesi</p>
            </div>
            {/* Date range */}
            <div className="flex items-center gap-1.5 shrink-0">
              <CalendarRange size={14} className="text-muted-foreground" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="py-1.5 px-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-muted-foreground"
              />
              <span className="text-muted-foreground text-xs">—</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="py-1.5 px-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-muted-foreground"
              />
              {hasDateFilter && (
                <button onClick={() => { setStartDate(''); setEndDate('') }} className="p-1 text-muted-foreground hover:text-red-500 dark:text-red-400 transition" title="Hapus filter tanggal">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={handleExport}
              disabled={!shifts.length}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0"
            >
              <Download size={14} />
              Export CSV
            </button>
            <button
              onClick={handleExportJurnal}
              disabled={!shifts.length}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-xl hover:bg-indigo-50 dark:bg-indigo-500/10 disabled:opacity-40 transition shrink-0"
            >
              <BookOpen size={14} />
              Export Jurnal Akuntansi
            </button>
          </div>
          <DataTable
            columns={columns as never[]}
            data={shifts as never[]}
            loading={isLoading}
            emptyMessage="Belum Ada Data Keuangan"
          />
          <p className="px-5 py-3 text-xs text-muted-foreground">
            * Pajak PPN hanya tersedia jika produk dikonfigurasi sebagai kena pajak
          </p>
        </div>

      </div>
    </div>
  )
}
