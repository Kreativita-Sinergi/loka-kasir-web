import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { CalendarClock, CheckCircle2, Copy, Download, Hourglass, Send, TrendingUp, Users, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import StatCard from '@/components/ui/StatCard'
import QueryErrorState from '@/components/ui/QueryErrorState'
import { Button } from '@/components/ui/button'
import { getSalesSummary } from '@/api/sales'
import { rupiah, salesQueryOptions, useSalesProfile } from './salesPortal'


export default function SalesHomePage() {
  const profile = useSalesProfile()
  const summary = useQuery({ queryKey: ['sales', 'summary'], queryFn: async () => (await getSalesSummary()).data.data, ...salesQueryOptions })
  const link = `${window.location.origin}/register?ref=${encodeURIComponent(profile.code)}`
  const [qr, setQr] = useState('')
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(link, { width: 480, margin: 1 }).then((url) => { if (alive) setQr(url) }).catch(() => setQr(''))
    return () => { alive = false }
  }, [link])

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} disalin`) } catch { toast.error(`${label} tidak dapat disalin`) }
  }
  const s = summary.data
  const message = `Pakai Loka Kasir untuk usahamu dan dapatkan diskon ${s?.discount_percent ?? 20}% untuk pembayaran pertama. Daftar lewat link ini atau masukkan kode ${profile.code}: ${link}`

  return (
    <>
      <section className="space-y-3">
        <h1 className="text-xl font-bold tracking-tight">Halo, {profile.name}</h1>
        <QueryErrorState error={summary.error} onRetry={() => summary.refetch()} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard title="Komisi bulan ini" value={rupiah(s?.this_month ?? 0)} icon={<TrendingUp />} color="blue" emphasis loading={summary.isPending} />
          <StatCard title="Siap dicairkan" value={rupiah(s?.available ?? 0)} icon={<Wallet />} color="green" loading={summary.isPending}
            subtitle={s ? `Minimal pencairan ${rupiah(s.payout_minimum)}` : undefined} />
          <StatCard title={`Ditahan ${s?.hold_days ?? 30} hari`} value={rupiah(s?.held ?? 0)} icon={<Hourglass />} color="orange" loading={summary.isPending}
            subtitle={s && s.processing > 0 ? `${rupiah(s.processing)} sedang diproses` : undefined} />
          <StatCard title="Total dibayar" value={rupiah(s?.total_paid ?? 0)} icon={<CheckCircle2 />} color="purple" loading={summary.isPending} />
          <StatCard title="Pelanggan aktif" value={s ? `${s.active_customers} / ${s.customers}` : '0'} icon={<Users />} color="blue" loading={summary.isPending} subtitle="aktif / semua" />
          <StatCard title="Perkiraan 30 hari" value={rupiah(s?.projection_30d ?? 0)} icon={<CalendarClock />} color="green" loading={summary.isPending}
            subtitle="Dari perpanjangan yang jatuh tempo, sebelum biaya pembayaran" />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h2 className="font-semibold">Kode sales Anda</h2>
              <p className="mt-1 text-sm text-muted-foreground">Pelanggan baru memasukkan kode ini saat daftar atau di halaman Langganan, sebelum membayar pertama kali.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <code className="select-all rounded-lg bg-muted px-4 py-2 text-xl font-bold tracking-wider">{profile.code}</code>
              <Button variant="outline" size="sm" onClick={() => void copy(profile.code, 'Kode')}><Copy />Salin kode</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void copy(link, 'Link pendaftaran')}><Copy />Salin link daftar</Button>
              <Button variant="success" size="sm" asChild>
                <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><Send />Bagikan ke WhatsApp</a>
              </Button>
            </div>
          </div>
          {qr && <div className="flex shrink-0 flex-col items-center gap-2">
            <img src={qr} alt={`QR pendaftaran dengan kode ${profile.code}`} className="h-40 w-40 rounded-xl border border-border bg-white p-2" />
            <Button variant="ghost" size="sm" asChild><a href={qr} download={`qr-loka-kasir-${profile.code}.png`}><Download />Unduh QR</a></Button>
          </div>}
        </div>
      </section>

      {s && <section className="rounded-2xl border border-border bg-card p-5 text-sm">
        <h2 className="font-semibold">Cara komisi dihitung</h2>
        <ul className="mt-3 space-y-2 text-muted-foreground">
          <li>Pelanggan dengan kode Anda mendapat diskon <strong className="text-foreground">{s.discount_percent}%</strong> untuk pembayaran Pro bulanan atau tahunan pertama.</li>
          <li>Anda mendapat <strong className="text-foreground">{s.first_year_rate_percent}%</strong> dari nilai bersih setiap pembayaran selama 12 bulan sejak pembayaran pertama pelanggan, lalu <strong className="text-foreground">{s.later_rate_percent}%</strong> selama pelanggan terus berlangganan.</li>
          <li>Nilai bersih = yang dibayar pelanggan dikurangi biaya pembayaran. Komisi bisa dicairkan {s.hold_days} hari setelah pembayaran, setiap bulan sekitar tanggal 10, minimal {rupiah(s.payout_minimum)}.</li>
          <li>Paket tiga tahun dan tambahan outlet tidak menghasilkan komisi.</li>
        </ul>
      </section>}
    </>
  )
}
