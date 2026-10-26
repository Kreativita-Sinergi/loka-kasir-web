import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import { applyReferral, getReferral, reconcileReferral } from '@/api/referral'
import { useAuthStore } from '@/store/authStore'
import { formatMoneyIn } from '@/lib/money'
import { getErrorMessage, formatDate } from '@/lib/utils'

const rupiah = (n: number) => formatMoneyIn(n, 'IDR')
export default function ReferralCard({ plan, amount }: { plan: string; amount?: number }) {
  const owner = useAuthStore((s) => s.user?.role.code === 'OWNER')
  const qc = useQueryClient()
  const [code, setCode] = useState(() => sessionStorage.getItem('referral-code') ?? '')
  const query = useQuery({ queryKey: ['referral'], queryFn: async () => {
    const data = (await getReferral()).data.data
    return { ...data, open_orders: data.open_orders.map((order) => ({ ...order, canContinue: new Date(order.expired_at).getTime() > Date.now() })) }
  }, enabled: owner })
  const refresh = () => qc.invalidateQueries({ queryKey: ['referral'] })
  const apply = useMutation({ mutationFn: () => applyReferral(code.trim()), onSuccess: () => { sessionStorage.removeItem('referral-code'); toast.success('Kode referral diterapkan'); void refresh() }, onError: (e) => toast.error(getErrorMessage(e)) })
  const reconcile = useMutation({ mutationFn: reconcileReferral, onSuccess: () => { toast.success('Status tagihan diperiksa'); void refresh(); void qc.invalidateQueries({ queryKey: ['membership'] }) }, onError: (e) => toast.error(getErrorMessage(e)) })
  if (!owner) return null
  if (query.isPending) return <div className="h-28 rounded-2xl bg-muted animate-pulse" />
  if (query.isError) return <div className="rounded-2xl border border-border p-4 text-sm">Referral belum dapat dimuat. <button onClick={() => void query.refetch()} className="text-blue-600">Coba lagi</button></div>
  const data = query.data
  if (!data?.enabled) return null
  const eligible = plan === 'pro' || plan === 'pro-yearly'
  const sales = data.applied_program === 'sales'
  const firstDiscount = sales ? Math.floor((amount ?? 0) * (data.discount_percent ?? 0) / 100) : plan === 'pro' ? 10000 : 50000
  const discount = eligible && amount !== undefined ? Math.min(Math.max(0, data.applied_code && data.first_purchase ? firstDiscount : data.balance), Math.floor(amount / 2)) : 0
  const share = async () => {
    const link = `${window.location.origin}/register?ref=${encodeURIComponent(data.code)}`
    try { await navigator.clipboard.writeText(link); toast.success('Link referral disalin') } catch { toast.error('Link tidak dapat disalin. Salin kode referral yang tampil.') }
  }
  return <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
    <div className="flex items-center gap-2"><Gift size={20} className="text-blue-600" /><h3 className="font-semibold">Ajak teman, hemat langganan</h3></div>
    <p className="text-sm text-muted-foreground">Dapatkan saldo Rp15.000 jika teman membeli Pro bulanan atau Rp59.000 untuk tahunan. Teman mendapat diskon pertama Rp10.000 / Rp50.000.</p>
    <div className="flex flex-wrap items-center gap-3"><code className="rounded-lg bg-muted px-3 py-2 font-semibold select-all">{data.code}</code><button type="button" onClick={() => void share()} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><Copy size={14} />Salin link undangan</button></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[[data.balance, 'Saldo tersedia'], [data.pending_reward, 'Menunggu 7 hari'], [data.reserved, 'Dicadangkan untuk tagihan']].map(([n, label]) => <div key={String(label)} className="rounded-xl bg-muted p-3"><p className="font-bold">{rupiah(Number(n))}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}
    </div>
    <p className="text-xs text-muted-foreground">Saldo otomatis memotong maksimal 50% tagihan Pro bulanan atau tahunan. Berlaku 7 hari setelah pembayaran teman berhasil, tidak kedaluwarsa, dan tidak dapat dicairkan. Satu reward per pelanggan baru. Referral sendiri atau pemilik yang sama tidak berlaku. Reward pembayaran yang direfund dapat dibatalkan.</p>
    {amount !== undefined && discount > 0 && <p className="rounded-xl bg-green-50 dark:bg-green-500/10 p-3 text-sm">Potongan untuk paket yang dipilih: <strong>{rupiah(discount)}</strong>. Perkiraan pembayaran: <strong>{rupiah(amount - discount)}</strong>. Nominal akhir dikonfirmasi pada tagihan.</p>}
    {data.applied_code && <p className="text-sm">{sales ? 'Kode sales' : 'Kode yang digunakan'}: <strong>{data.applied_code}</strong>. {sales ? `Diskon ${data.discount_percent ?? 0}% untuk pembayaran Pro bulanan atau tahunan pertama.` : 'Diskon berlaku untuk pembayaran Pro bulanan atau tahunan pertama.'}</p>}
    {data.can_apply && <form onSubmit={(e) => { e.preventDefault(); apply.mutate() }} className="space-y-2">
      <label htmlFor="referral-code" className="text-sm font-medium">Punya kode dari teman atau sales?</label>
      <div className="flex gap-2"><input id="referral-code" maxLength={32} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Masukkan kode referral atau kode sales" className="min-w-0 flex-1 rounded-lg border border-border bg-background p-2 text-sm" /><button disabled={!code.trim() || apply.isPending} className="rounded-lg bg-blue-600 text-white px-4 text-sm disabled:opacity-50">{apply.isPending ? 'Memproses…' : 'Gunakan'}</button></div>
      <p className="text-xs text-muted-foreground">Gunakan sebelum membuat tagihan pertama. Kode yang diterapkan tidak bisa diganti.</p>
    </form>}
    {data.open_orders.length > 0 && <div className="space-y-2 border-t border-border pt-3">
      <p className="text-sm font-medium">Tagihan referral belum selesai</p>
      <p className="text-xs text-muted-foreground">Saldo ditahan sampai pembayaran atau pembatalan dikonfirmasi. Setelah invoice kedaluwarsa, periksa status untuk memulihkan saldo.</p>
      {data.open_orders.map((o) => <div key={o.id} className="flex flex-wrap items-center gap-3 text-sm"><span>{rupiah(o.amount)} · batas {formatDate(o.expired_at)}</span>{o.payment_url && o.canContinue && <a href={o.payment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600">Lanjutkan pembayaran</a>}</div>)}
      <button disabled={reconcile.isPending} onClick={() => reconcile.mutate()} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">{reconcile.isPending ? 'Memeriksa…' : 'Periksa status tagihan'}</button>
    </div>}
    {data.history.length > 0 && <div className="border-t border-border pt-3 space-y-2"><p className="text-sm font-medium">Riwayat reward</p>{data.history.map((h, i) => <div key={i} className="flex justify-between gap-3 text-sm"><span>{rupiah(h.amount)}</span><span className="text-muted-foreground">{h.status === 'cancelled' ? 'Dibatalkan' : h.status === 'pending' ? `Tersedia ${formatDate(h.available_at)}` : 'Berhasil'}</span></div>)}</div>}
  </section>
}
