import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Smartphone, CheckCircle2, HelpCircle, AlertTriangle, Copy, EyeOff, HandCoins } from 'lucide-react'
import ManualMatchModal from '@/components/qris/ManualMatchModal'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import { getQrisNotifications } from '@/api/qrisStatic'
import { useOutletStore } from '@/store/outletStore'
import type { QrisStaticNotification, QrisNotificationStatus } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/utils'

// Bukti pembayaran QRIS STATIS. Karena QRIS statis tidak punya callback gateway,
// pelunasan otomatis berasal dari notifikasi dana masuk di HP kasir. Halaman ini
// menampilkan teks ASLI notifikasi itu supaya pemilik bisa memverifikasi sendiri
// bahwa uangnya memang diterima — termasuk yang TIDAK berhasil dicocokkan.

const STATUS_CONFIG: Record<
  QrisNotificationStatus,
  { label: string; variant: 'green' | 'yellow' | 'red' | 'gray' | 'blue'; icon: React.ReactNode; hint: string }
> = {
  matched: {
    label: 'Lunas otomatis',
    variant: 'green',
    icon: <CheckCircle2 size={12} />,
    hint: 'Notifikasi ini melunasi sebuah transaksi.',
  },
  unmatched: {
    label: 'Tidak cocok',
    variant: 'yellow',
    icon: <HelpCircle size={12} />,
    hint: 'Dana masuk terbaca, tapi tidak ada tagihan menunggu dengan nominal & waktu yang cocok.',
  },
  ambiguous: {
    label: 'Nominal kembar',
    variant: 'red',
    icon: <AlertTriangle size={12} />,
    hint: 'Ada lebih dari satu tagihan bernominal sama — sistem sengaja tidak menebak.',
  },
  duplicate: {
    label: 'Duplikat',
    variant: 'gray',
    icon: <Copy size={12} />,
    hint: 'Notifikasi yang sama sudah pernah diproses.',
  },
  ignored: {
    label: 'Diabaikan',
    variant: 'gray',
    icon: <EyeOff size={12} />,
    hint: 'Bukan notifikasi dana masuk (mis. promo) atau dari aplikasi yang tidak tepercaya.',
  },
}

function statusBadge(status: QrisNotificationStatus) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: 'gray' as const, icon: null, hint: '' }
  return (
    <span title={cfg.hint}>
      <Badge variant={cfg.variant}>
        <span className="flex items-center gap-1">{cfg.icon}{cfg.label}</span>
      </Badge>
    </span>
  )
}

export default function QrisNotificationsPage() {
  const { selected: selectedOutlet } = useOutletStore()
  const [status, setStatus] = useState<'' | QrisNotificationStatus>('')
  // Notifikasi yang sedang dikonfirmasi manual (uang sudah masuk, otomatis gagal).
  const [matching, setMatching] = useState<QrisStaticNotification | null>(null)

  const outletId = selectedOutlet?.id

  const { data, isLoading } = useQuery({
    queryKey: ['qris-notifications', { outletId, status }],
    queryFn: () => getQrisNotifications({
      outlet_id: outletId || undefined,
      status: status || undefined,
      limit: 100,
    }),
    // Notifikasi masuk terus selama kasir beroperasi.
    refetchInterval: 30_000,
  })

  const rows = data?.data?.data ?? []
  const matchedCount = rows.filter(r => r.status === 'matched').length
  const needsAttention = rows.filter(r => r.status === 'unmatched' || r.status === 'ambiguous').length

  const columns = [
    {
      key: 'notified_at',
      label: 'Waktu',
      render: (row: QrisStaticNotification) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(row.notified_at)}</span>
      ),
    },
    {
      key: 'source',
      label: 'Sumber',
      render: (row: QrisStaticNotification) => (
        <div className="flex items-center gap-2">
          <Smartphone size={14} className="text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground">{row.source_label || row.source_package}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Nominal',
      render: (row: QrisStaticNotification) => (
        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
          {row.amount > 0 ? formatCurrency(row.amount) : '-'}
        </span>
      ),
    },
    {
      key: 'sender',
      label: 'Pengirim',
      render: (row: QrisStaticNotification) => (
        <span className="text-xs text-muted-foreground">{row.sender_name ?? '-'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: QrisStaticNotification) => statusBadge(row.status),
    },
    {
      key: 'body',
      label: 'Teks Notifikasi (bukti)',
      render: (row: QrisStaticNotification) => (
        <div className="max-w-md">
          <p className="text-xs text-foreground line-clamp-2" title={row.body}>{row.body}</p>
          {row.note && <p className="text-[11px] text-muted-foreground mt-0.5">{row.note}</p>}
        </div>
      ),
    },
    {
      key: 'action',
      label: '',
      render: (row: QrisStaticNotification) => {
        // Hanya notifikasi yang belum dipakai yang boleh dicocokkan manual.
        const canMatch = row.status === 'unmatched' || row.status === 'ambiguous' || row.status === 'ignored'
        if (!canMatch) return null
        return (
          <button
            onClick={() => setMatching(row)}
            title="Uang sudah masuk tapi tidak tercocokkan otomatis? Tandai lunas manual."
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <HandCoins size={13} /> Konfirmasi Manual
          </button>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Notifikasi QRIS Statis"
        subtitle={selectedOutlet ? `Outlet: ${selectedOutlet.name}` : 'Semua outlet'}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="rounded-2xl border border-border bg-muted/40 px-5 py-4">
          <p className="text-xs text-muted-foreground">
            QRIS statis tidak punya callback resmi dari penyelenggara. Pelunasan otomatis di sini berasal
            dari notifikasi dana masuk yang dibaca aplikasi kasir dari aplikasi bank/e-wallet Anda —
            bukti terkuat yang bisa diakses, tapi tetap perlu Anda cocokkan dengan mutasi rekening
            untuk nominal besar.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            <span className="font-semibold text-foreground">Uang sudah masuk tapi transaksi belum lunas?</span>{' '}
            Cari notifikasinya di daftar bawah lalu tekan <span className="font-medium">Konfirmasi Manual</span> untuk
            menunjuk tagihan yang dibayar. Kalau notifikasinya memang tidak pernah masuk ke HP kasir,
            pelunasan dilakukan dari aplikasi kasir lewat tombol Konfirmasi Lunas di layar QRIS.
          </p>
        </div>

        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as '' | QrisNotificationStatus)}
              className="py-2 px-3 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-muted-foreground"
            >
              <option value="">Semua Status</option>
              {(Object.keys(STATUS_CONFIG) as QrisNotificationStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 ml-auto text-sm">
              <span className="text-muted-foreground">
                Lunas otomatis: <span className="font-semibold text-green-600 dark:text-green-400">{matchedCount}</span>
              </span>
              {needsAttention > 0 && (
                <span className="text-muted-foreground">
                  · Perlu dicek: <span className="font-semibold text-amber-600 dark:text-amber-400">{needsAttention}</span>
                </span>
              )}
            </div>
          </div>

          <DataTable
            columns={columns as never[]}
            data={rows as never[]}
            loading={isLoading}
          />
        </div>
      </div>

      {matching && (
        <ManualMatchModal
          notification={matching}
          open={matching !== null}
          onClose={() => setMatching(null)}
        />
      )}
    </div>
  )
}
