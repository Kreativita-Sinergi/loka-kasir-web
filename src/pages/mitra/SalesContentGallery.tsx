import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Copy, Download, FileImage, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/Modal'
import QueryErrorState from '@/components/ui/QueryErrorState'
import { getSalesContent, type SalesContent } from '@/api/sales'
import { getErrorMessage } from '@/lib/utils'
import { downloadSalesContent, salesContentCaption, salesContentImageURL, salesContentTitle } from './salesContent'
import { useSalesProfile } from './salesPortal'

export default function SalesContentGallery() {
  const profile = useSalesProfile()
  const content = useQuery({ queryKey: ['sales', 'content'], queryFn: async () => (await getSalesContent()).data.data, staleTime: 60000 })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<SalesContent | null>(null)
  const [slide, setSlide] = useState(0)
  const [channel, setChannel] = useState<'instagram' | 'threads'>('instagram')
  const [downloading, setDownloading] = useState<string | null>(null)
  const vars = useMemo(() => ({ active: profile.status === 'active', code: profile.code, link: `${window.location.origin}/register?ref=${encodeURIComponent(profile.code)}` }), [profile.status, profile.code])
  const rows = useMemo(() => (content.data ?? []).filter((p) => p.caption.toLowerCase().includes(search.trim().toLowerCase())), [content.data, search])
  const images = selected ? [...selected.media].sort((a, b) => a.position - b.position) : []
  const caption = selected ? salesContentCaption(selected, channel, vars) : ''
  const download = async (item: SalesContent) => {
    setDownloading(item.id)
    try { await downloadSalesContent(item, vars); toast.success('Paket gambar dan caption siap diunduh') }
    catch (error) { toast.error(getErrorMessage(error)) }
    finally { setDownloading(null) }
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(caption); toast.success('Caption disalin') }
    catch { toast.error('Caption belum dapat disalin; pilih teksnya lalu salin manual.') }
  }
  const open = (item: SalesContent) => { setSelected(item); setSlide(0); setChannel('instagram') }

  return <section id="galeri" className="scroll-mt-28 rounded-2xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><FileImage size={19} className="text-primary" />Galeri konten Loka Kasir</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Pilih materi, lihat seluruh slide, lalu unduh paket ZIP berisi gambar berurutan dan caption siap pakai. Perhatikan tanggal untuk materi musiman.</p></div>{content.data && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{content.data.length} materi</span>}</div>
    {!vars.active && <p className="mt-4 rounded-xl bg-warning-subtle p-3 text-sm text-warning">Anda sudah bisa mengunduh dan mempelajari konten. Tautan referral pribadi akan ditambahkan ke caption setelah akun Anda aktif.</p>}
    <div className="relative mt-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} /><input aria-label="Cari konten jualan" type="search" placeholder="Cari stok, kedai, promo, pelanggan…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-10 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>
    {content.isPending && <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-muted" />)}</div>}
    {content.isError && <div className="mt-4"><QueryErrorState error={content.error} onRetry={() => content.refetch()} /></div>}
    {!content.isPending && !content.isError && !rows.length && <div className="py-10 text-center text-sm text-muted-foreground">{search ? 'Belum ada materi yang cocok. Coba kata lain.' : 'Materi gambar belum tersedia. Caption dan tutorial di bawah tetap bisa dipakai.'}</div>}
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {rows.map((item) => {
        const image = [...item.media].sort((a, b) => a.position - b.position)[0]
        return <article key={item.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background">
          <button type="button" onClick={() => open(item)} aria-label={`Lihat ${salesContentTitle(item)}`} className="relative block w-full overflow-hidden bg-muted text-left">
            {image && <img src={salesContentImageURL(image)} alt={salesContentTitle(item)} loading="lazy" referrerPolicy="no-referrer" width={image.width} height={image.height} className="aspect-[4/5] w-full object-cover" />}
            <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">{item.media.length} slide</span>
          </button>
          <div className="flex flex-1 flex-col gap-2 p-3"><h3 className="line-clamp-3 text-sm font-semibold leading-snug">{salesContentTitle(item)}</h3>{item.scheduled_at && <p className="text-[11px] text-muted-foreground">Kalender brand · {new Date(item.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}<div className="mt-auto flex flex-wrap gap-1.5 pt-1"><Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => open(item)}>Lihat & salin</Button><Button size="sm" className="h-8 px-2 text-xs" disabled={Boolean(downloading)} onClick={() => void download(item)} aria-label={`Unduh paket ${salesContentTitle(item)}`}><Download size={13} />{downloading === item.id ? 'Menyiapkan…' : 'ZIP'}</Button></div></div>
        </article>
      })}
    </div>
    <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? salesContentTitle(selected) : 'Konten Loka Kasir'}>
      {selected && <div className="space-y-4">
        <div className="relative rounded-xl bg-muted p-2">{images[slide] && <img src={salesContentImageURL(images[slide])} alt={`Slide ${slide + 1}: ${salesContentTitle(selected)}`} referrerPolicy="no-referrer" className="mx-auto max-h-[55vh] w-auto rounded-lg object-contain" />}
          <div className="mt-2 flex items-center justify-between"><Button type="button" size="sm" variant="outline" disabled={slide === 0} onClick={() => setSlide((s) => s - 1)} aria-label="Slide sebelumnya"><ChevronLeft size={16} /></Button><p className="text-xs tabular-nums text-muted-foreground">{slide + 1} / {images.length}</p><Button type="button" size="sm" variant="outline" disabled={slide >= images.length - 1} onClick={() => setSlide((s) => s + 1)} aria-label="Slide berikutnya"><ChevronRight size={16} /></Button></div>
        </div>
        <div className="flex items-center gap-2"><label htmlFor="sales-caption-channel" className="text-sm font-medium">Caption</label><select id="sales-caption-channel" value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"><option value="instagram">Instagram</option><option value="threads" disabled={!selected.threads_text.trim()}>Threads</option></select><span className="ml-auto text-xs text-muted-foreground">{caption.length} karakter</span></div>
        <textarea aria-label="Caption konten jualan" value={caption} readOnly rows={7} className="w-full rounded-xl border border-input bg-background p-3 text-sm leading-relaxed" />
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!caption} onClick={() => void copy()}><Copy size={16} />Salin caption</Button><Button disabled={Boolean(downloading)} onClick={() => void download(selected)}><Download size={16} />{downloading === selected.id ? 'Menyiapkan…' : 'Unduh paket gambar + caption'}</Button></div>
        {vars.active && <p className="text-xs leading-relaxed text-muted-foreground">Tautan daftar dengan kode {profile.code} ditambahkan otomatis jika muat batas caption. Pelanggan perlu memakai kode sebelum tagihan pertamanya dibuat.</p>}
      </div>}
    </Modal>
  </section>
}
