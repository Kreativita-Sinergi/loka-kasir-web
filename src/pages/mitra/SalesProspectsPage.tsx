import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/Modal'
import QueryErrorState from '@/components/ui/QueryErrorState'
import {
  getSalesProspects,
  saveSalesProspect,
  archiveSalesProspect,
  getSalesCustomers,
  getProspectNotes,
  addProspectNote,
  type SalesProspectInput,
  type SalesProspect,
} from '@/api/sales'
import { getErrorMessage } from '@/lib/utils'
import { tanggal } from './salesPortal'

const labels = {
  prospect: 'Prospek',
  demo: 'Demo',
  trial: 'Terdaftar / trial',
  first_sale: 'Transaksi pertama',
  subscribed: 'Berlangganan',
  lost: 'Tidak lanjut',
}
const empty: SalesProspectInput = {
  business_name: '',
  contact_name: '',
  phone: '',
  email: '',
  manual_stage: 'prospect',
  notes: '',
  follow_up_at: null,
  business_id: null,
}
const field = 'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm'
function localDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function SalesProspectsPage() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState({ q: '', stage: '', due: false, archived: false, page: 1 })
  const [editing, setEditing] = useState<SalesProspect | 'new' | null>(null)
  const [input, setInput] = useState<SalesProspectInput>(empty)
  const [note, setNote] = useState('')
  const list = useQuery({
    queryKey: ['sales', 'prospects', filters],
    queryFn: async () => (await getSalesProspects(filters)).data.data,
  })
  const customers = useQuery({
    queryKey: ['sales', 'customers'],
    queryFn: async () => (await getSalesCustomers()).data.data,
  })
  const id = editing && editing !== 'new' ? editing.id : undefined
  const notes = useQuery({
    queryKey: ['sales', 'prospect-notes', id],
    queryFn: async () => (await getProspectNotes(id!)).data.data,
    enabled: !!id,
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['sales', 'prospects'] })
  const save = useMutation({
    mutationFn: () => saveSalesProspect(input, id),
    onSuccess: () => {
      void refresh()
      setEditing(null)
      toast.success('Prospek disimpan')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const archive = useMutation({
    mutationFn: (p: SalesProspect) => archiveSalesProspect(p.id, !p.archived_at),
    onSuccess: refresh,
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const addNote = useMutation({
    mutationFn: () => addProspectNote(id!, note.trim()),
    onSuccess: () => {
      setNote('')
      void qc.invalidateQueries({ queryKey: ['sales', 'prospect-notes', id] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const open = (p: SalesProspect | 'new') => {
    setInput(p === 'new' ? { ...empty } : { ...p })
    setNote('')
    setEditing(p)
  }
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Prospek & tindak lanjut</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Catat calon toko, jadwalkan demo, dan pantau hasilnya. Kontak ini hanya tersedia di akun mitra Anda.
          </p>
        </div>
        <Button onClick={() => open('new')}>Tambah prospek</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          aria-label="Cari prospek"
          className={field}
          placeholder="Cari usaha, kontak, atau nomor"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value, page: 1 })}
        />
        <select
          aria-label="Tahap prospek"
          className={field}
          value={filters.stage}
          onChange={(e) => setFilters({ ...filters, stage: e.target.value, page: 1 })}
        >
          <option value="">Semua tahap</option>
          {Object.entries(labels).map(([k, v]) => (
            <option value={k} key={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-5 text-sm">
        <label>
          <input
            type="checkbox"
            checked={filters.due}
            onChange={(e) => setFilters({ ...filters, due: e.target.checked, page: 1 })}
          />{' '}
          Perlu dihubungi sekarang
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.archived}
            onChange={(e) => setFilters({ ...filters, archived: e.target.checked, page: 1 })}
          />{' '}
          Arsip
        </label>
      </div>
      {list.isError && <QueryErrorState error={list.error} onRetry={() => list.refetch()} />}
      {list.isPending && <p role="status">Memuat prospek…</p>}
      {list.data?.items.length === 0 && (
        <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          Belum ada prospek pada filter ini.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {list.data?.items.map((p) => (
          <article key={p.id} className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex justify-between gap-2">
              <h2 className="font-semibold">{p.business_name}</h2>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{labels[p.stage]}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {[p.contact_name, p.phone, p.email].filter(Boolean).join(' · ') || 'Kontak belum diisi'}
            </p>
            <p className="text-sm">
              Tindak lanjut:{' '}
              {p.follow_up_at ? new Date(p.follow_up_at).toLocaleString('id-ID') : 'Belum dijadwalkan'}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => open(p)}>
                Detail & catatan
              </Button>
              {p.phone && (
                <a
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-primary"
                  href={`https://wa.me/${p.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              )}
              <Button size="sm" variant="ghost" disabled={archive.isPending} onClick={() => archive.mutate(p)}>
                {p.archived_at ? 'Pulihkan' : 'Arsipkan'}
              </Button>
            </div>
          </article>
        ))}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>
          {list.data?.total ?? 0} prospek · halaman {filters.page}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={filters.page === 1 || list.isFetching}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            disabled={list.isFetching || !list.data || filters.page * list.data.limit >= list.data.total}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            Berikutnya
          </Button>
        </div>
      </div>
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={id ? 'Detail prospek' : 'Tambah prospek'}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          {(['business_name', 'contact_name', 'phone', 'email'] as const).map((key, i) => (
            <label className="block space-y-1 text-sm" key={key}>
              <span>{['Nama usaha', 'Nama kontak', 'WhatsApp Indonesia', 'Email'][i]}</span>
              <input
                className={field}
                type={key === 'email' ? 'email' : 'text'}
                required={key === 'business_name'}
                maxLength={
                  key === 'business_name' ? 160 : key === 'contact_name' ? 120 : key === 'email' ? 200 : 32
                }
                value={input[key]}
                onChange={(e) => setInput({ ...input, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="block space-y-1 text-sm">
            Tahap manual
            <select
              className={field}
              value={input.manual_stage}
              onChange={(e) =>
                setInput({ ...input, manual_stage: e.target.value as SalesProspectInput['manual_stage'] })
              }
            >
              <option value="prospect">Prospek</option>
              <option value="demo">Demo</option>
              <option value="lost">Tidak lanjut</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            Pelanggan referral Anda
            <select
              className={field}
              value={input.business_id ?? ''}
              onChange={(e) => setInput({ ...input, business_id: e.target.value || null })}
            >
              <option value="">Belum ditautkan</option>
              {customers.data?.map((c) => (
                <option key={c.business_id} value={c.business_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {customers.isError && (
            <p className="text-sm text-destructive">
              Pelanggan gagal dimuat. Tutup dan coba lagi sebelum mengganti tautan.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Tahap trial, transaksi pertama, dan berlangganan mengikuti data pelanggan yang ditautkan. Tahap ini
            tidak dapat ditandai manual.
          </p>
          <label className="block space-y-1 text-sm">
            Jadwal tindak lanjut (waktu perangkat)
            <input
              className={field}
              type="datetime-local"
              value={localDate(input.follow_up_at)}
              onChange={(e) =>
                setInput({
                  ...input,
                  follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
            />
          </label>
          <label className="block space-y-1 text-sm">
            Ringkasan
            <textarea
              className={field}
              maxLength={2000}
              value={input.notes}
              onChange={(e) => setInput({ ...input, notes: e.target.value })}
            />
          </label>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Menyimpan…' : 'Simpan prospek'}
          </Button>
        </form>
        {id && (
          <div className="mt-6 space-y-3 border-t pt-4">
            <h3 className="font-semibold">Riwayat tindak lanjut</h3>
            {notes.isError && <QueryErrorState error={notes.error} onRetry={() => notes.refetch()} />}
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {notes.data?.map((n) => (
                <div className="rounded-xl bg-muted p-3" key={n.id}>
                  <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{tanggal(n.created_at)}</p>
                </div>
              ))}
            </div>
            <textarea
              aria-label="Catatan tindak lanjut"
              placeholder="Hasil telepon atau demo…"
              className={field}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button
              variant="outline"
              disabled={!note.trim() || addNote.isPending}
              onClick={() => addNote.mutate()}
            >
              Tambah catatan
            </Button>
          </div>
        )}
      </Modal>
    </section>
  )
}
