import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { connectAccounting, getAccountingConnection, pauseAccounting, retryAccountingDelivery } from '@/api/accountingConnection'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

const accountingSettings = 'https://accounting.lokakasir.id/app#/settings.pos-integration'
const formatTimestamp = (date: string) => new Date(date).toLocaleString('id-ID', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta',
}) + ' WIB'

function errorText(error: unknown) {
  return (isAxiosError(error) && error.response?.data?.message) || 'Sambungan Loka Kasir Accounting belum bisa diproses.'
}

export default function AccountingConnectionPage() {
  const user = useAuthStore((state) => state.user)
  const isOwner = user?.role?.code === 'OWNER'
  const queryClient = useQueryClient()
  const queryKey = ['accounting-connection', user?.business?.id]
  const [code, setCode] = useState('')
  const [useDate, setUseDate] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [todayWIB] = useState(() => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10))
  const connection = useQuery({
    queryKey, queryFn: getAccountingConnection, enabled: isOwner,
    refetchInterval: (query) => query.state.data && !query.state.data.paused_at ? 15000 : false,
  })
  const connect = useMutation({
    mutationFn: () => connectAccounting(code.trim(), useDate ? startDate : ''),
    onSuccess: async () => {
      setCode('')
      await queryClient.invalidateQueries({ queryKey })
    },
  })
  const pause = useMutation({
    mutationFn: pauseAccounting,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })
  const retry = useMutation({ mutationFn: retryAccountingDelivery, onSuccess: () => queryClient.invalidateQueries({ queryKey }) })
  const busy = connect.isPending || pause.isPending || retry.isPending
  const link = connection.data
  const active = Boolean(link && !link.paused_at)
  const error = connect.error ?? pause.error ?? retry.error ?? connection.error

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    connect.mutate()
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Header title="Integrasi Loka Kasir Accounting" subtitle="Kirim transaksi dari kasir ke jurnal pembukuan." />
      <div className="page-content flex-1 overflow-y-auto p-4 md:p-6">
        <section className="grid max-w-2xl gap-4 rounded-xl border border-border bg-card p-5">
          {!isOwner ? <p>Pengaturan ini tersedia untuk pemilik bisnis.</p> : <>
            {error && <p role="alert" className="text-sm text-destructive">{errorText(error)}</p>}
            {connection.isPending ? <p role="status">Memuat sambungan…</p> : connection.isError ?
              <div><Button variant="outline" onClick={() => void connection.refetch()}>Muat ulang status</Button></div>
            : <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{link?.accounting_name || 'Sambungkan organisasi Accounting'}</h2>
                  {link && <p className="mt-1 text-sm text-muted-foreground">Awal sinkronisasi {formatTimestamp(link.sync_from)}.</p>}
                </div>
                <span role="status" className="rounded-full border border-border px-3 py-1 text-xs font-semibold">
                  {active ? 'Terhubung' : link ? 'Dijeda' : 'Belum terhubung'}
                </span>
              </div>
              {active && link ? <>
                <dl className="grid gap-3 rounded-lg bg-muted p-3 text-sm sm:grid-cols-3">
                  <div><dt className="text-muted-foreground">Terakhir terkirim</dt><dd className="font-semibold">{link.last_synced_at ? formatTimestamp(link.last_synced_at) : 'Belum ada'}</dd></div>
                  <div><dt className="text-muted-foreground">Menunggu dikirim</dt><dd className="font-semibold">{link.waiting}</dd></div>
                  <div><dt className="text-muted-foreground">Gagal dikirim</dt><dd className="font-semibold">{link.failed}</dd></div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => pause.mutate()} disabled={busy}>Jeda sinkronisasi</Button>
                  {link.failed > 0 && <Button variant="outline" onClick={() => retry.mutate()} disabled={busy}>Coba ulang transaksi gagal</Button>}
                </div>
              </> : <>
                <p className="text-sm text-muted-foreground">Ambil kode dari menu Pengaturan di Loka Kasir Accounting. Transaksi penjualan, retur, dan pelunasan kasbon yang memenuhi tanggal mulai akan masuk sebagai jurnal.</p>
                <p><a className="text-sm font-semibold text-primary hover:underline" href={accountingSettings} target="_blank" rel="noreferrer">Buka pengaturan Accounting</a></p>
                <form onSubmit={submit} className="grid gap-4">
                  <label className="grid gap-1 text-sm font-medium">Kode sambungan
                    <input className="rounded-lg border border-input bg-background px-3 py-2 font-mono" value={code}
                      onChange={(event) => setCode(event.target.value)} autoComplete="off" spellCheck={false} required />
                  </label>
                  {!link && <fieldset className="grid gap-2 text-sm">
                    <legend className="mb-2 font-semibold">Awal sinkronisasi</legend>
                    <label className="flex items-center gap-2"><input type="radio" name="sync-start" checked={!useDate} onChange={() => setUseDate(false)} /> Mulai saat terhubung</label>
                    <label className="flex items-center gap-2"><input type="radio" name="sync-start" checked={useDate} onChange={() => setUseDate(true)} /> Sertakan transaksi mulai tanggal tertentu</label>
                    {useDate && <label className="grid max-w-xs gap-1">Tanggal awal (WIB)
                      <input className="rounded-lg border border-input bg-background px-3 py-2" type="date" max={todayWIB}
                        value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
                    </label>}
                  </fieldset>}
                  <div><Button type="submit" disabled={busy || code.trim().length !== 32}>{busy ? 'Memproses…' : link ? 'Lanjutkan sinkronisasi' : 'Hubungkan'}</Button></div>
                </form>
              </>}
            </>}
          </>}
        </section>
      </div>
    </div>
  )
}
