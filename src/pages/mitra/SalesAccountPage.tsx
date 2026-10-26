import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Form from '@/components/ui/Form'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changeSalesPassword, salesToken } from '@/api/sales'
import { whatsappContactUrlWith } from '@/lib/constants'
import { getErrorMessage } from '@/lib/utils'
import { tanggal, useSalesProfile } from './salesPortal'
import SalesTerms from './SalesTerms'

const STATUS = { pending: ['Menunggu verifikasi', 'yellow'], active: ['Aktif', 'green'], suspended: ['Dibekukan', 'red'], terminated: ['Berhenti', 'gray'] } as const

export default function SalesAccountPage() {
  const p = useSalesProfile()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const change = useMutation({
    mutationFn: () => changeSalesPassword(current, next),
    onSuccess: (res) => { salesToken.set(res.data.data.token); setCurrent(''); setNext(''); toast.success('Kata sandi diganti') },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const [label, variant] = STATUS[p.status]
  const rows: [string, React.ReactNode][] = [
    ['Nama', p.name],
    ['Email', p.email],
    ['Nomor HP', p.phone],
    ['Kode sales', <code key="code" className="font-semibold">{p.code}</code>],
    ['Status', <Badge key="status" variant={variant}>{label}</Badge>],
    ['Rekening', p.bank_name ? `${p.bank_name} ${p.bank_account_masked} a.n. ${p.bank_account_name}` : 'Belum diisi'],
  ]

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-5">
        <h1 className="text-xl font-bold tracking-tight">Akun</h1>
        <dl className="mt-4 divide-y divide-border text-sm">
          {rows.map(([k, v]) => <div key={k} className="flex flex-wrap justify-between gap-2 py-2.5"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Perubahan data diri atau rekening diverifikasi tim Loka Kasir.{' '}
          <a href={whatsappContactUrlWith(`Halo Loka Kasir, saya mitra sales ${p.code} ingin mengubah data akun.`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-success hover:underline"><MessageCircle size={12} />Hubungi kami</a>
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Ganti kata sandi</h2>
        <p className="mt-1 text-sm text-muted-foreground">Perangkat lain yang masuk dengan kata sandi lama akan keluar otomatis.</p>
        <Form onSubmit={(e) => { e.preventDefault(); change.mutate() }} className="mt-4 max-w-sm space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sales-current-password">Kata sandi lama</Label>
            <Input id="sales-current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sales-new-password">Kata sandi baru</Label>
            <Input id="sales-new-password" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
            <p className="text-xs text-muted-foreground">Minimal 8 karakter.</p>
          </div>
          <Button type="submit" disabled={change.isPending}>{change.isPending ? 'Menyimpan…' : 'Simpan kata sandi'}</Button>
        </Form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Syarat & ketentuan</h2>
        {p.terms_accepted_at && <p className="mt-1 text-xs text-muted-foreground">Disetujui {tanggal(p.terms_accepted_at)} (versi {p.terms_version})</p>}
        <div className="mt-4"><SalesTerms /></div>
      </section>
    </>
  )
}
