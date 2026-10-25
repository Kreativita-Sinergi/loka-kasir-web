import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ImagePlus, Minus, Plus, PlusCircle, Search, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Form from '@/components/ui/Form'
import NumericInput from '@/components/ui/NumericInput'
import ImageCropModal from '@/components/ui/ImageCropModal'
import { getProducts } from '@/api/products'
import { createBundle, updateBundle, type BundlePayload } from '@/api/bundles'
import type { Bundle, Product } from '@/types'
import { bundleBlockedReason, bundleSummaryLines, suggestBundleName, type SummaryTone } from '@/lib/bundles'
import { cn, formatCurrency, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

const toneClass: Record<SummaryTone, string> = {
  muted: 'text-muted-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
}

const inputClass = 'w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

interface Props {
  /** null = paket baru. */
  bundle: Bundle | null
  /** Isi awal paket baru, mis. dari saran Rapor Toko "Jadikan paket: Seblak + Es Teh". */
  initialProductIds?: string[]
  onClose: () => void
}

/**
 * Form paket: beberapa produk dijual bersama dengan satu harga.
 *
 * Isinya dipilih dari daftar produk dengan jumlahnya masing-masing. Form
 * langsung menghitung harga kalau dibeli satuan dan hematnya — pemilik yang
 * mengetik harga paket lebih mahal dari satuannya langsung tahu — serta modal
 * dan untungnya. Saat terjual, stok tiap isinya ikut berkurang.
 *
 * Dipasang ulang setiap dibuka (lihat `key` di halaman), jadi isian awal cukup
 * dibaca sekali dari props.
 */
export default function BundleFormModal({ bundle, initialProductIds = [], onClose }: Props) {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Nama: selama pemilik belum mengetik sendiri, disarankan dari isinya.
  const [name, setName] = useState(bundle?.name ?? '')
  const [nameTouched, setNameTouched] = useState(!!bundle)
  const [price, setPrice] = useState(bundle?.sell_price ? String(bundle.sell_price) : '')
  const [desc, setDesc] = useState(bundle?.description ?? '')
  const [search, setSearch] = useState('')
  /** Isi paket urut seperti ditambahkan. */
  const [items, setItems] = useState<{ id: string; qty: number }[]>(() =>
    bundle
      ? bundle.items.map((i) => ({ id: i.product_id, qty: i.quantity }))
      : initialProductIds.map((id) => ({ id, qty: 1 })))
  // Foto: base64 baru, atau foto lama dihapus. Keduanya kosong = foto lama dibiarkan.
  const [imageBase64, setImageBase64] = useState('')
  const [imagePreview, setImagePreview] = useState(bundle?.image ?? '')
  const [cropSrc, setCropSrc] = useState('')

  // Nama isi paket yang tersimpan — dipakai selama daftar produk belum
  // termuat, atau bila produknya sudah tidak ada di daftar.
  const savedNames = useMemo(
    () => new Map((bundle?.items ?? []).map((i) => [i.product_id, i.name])),
    [bundle],
  )

  // Kunci & parameter sama dengan selector produk di Diskon — cache-nya dipakai bersama.
  const { data: productsData } = useQuery({
    queryKey: ['products-selector'],
    queryFn: () => getProducts({ limit: 500, page: 1, sort_by: 'name', order_by: 'asc' }),
    staleTime: 60_000,
  })
  const products: Product[] = useMemo(() => productsData?.data?.data ?? [], [productsData])
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  // Id dari tautan Rapor yang produknya sudah tidak ada dibuang begitu daftar
  // produk termuat — baris tanpa nama hanya akan ditolak server saat disimpan.
  const lines = items.filter((i) => !productsData || byId.has(i.id) || savedNames.has(i.id))

  const suggestedName = suggestBundleName(lines.map((i) => byId.get(i.id)?.name).filter((n): n is string => !!n))
  const shownName = nameTouched ? name : suggestedName
  const priceNum = Number(price) || 0
  const summary = bundleSummaryLines(lines.map((i) => ({ product: byId.get(i.id), quantity: i.qty })), priceNum)

  const q = search.trim().toLowerCase()
  const inBundle = new Set(lines.map((i) => i.id))
  const shown = products.filter((p) => p.is_active && !inBundle.has(p.id) && (!q || p.name.toLowerCase().includes(q)))

  const setQty = (id: string, qty: number) =>
    setItems((prev) => qty <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => i.id === id ? { ...i, qty } : i))

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const saveMut = useMutation({
    mutationFn: (payload: BundlePayload) => bundle ? updateBundle(bundle.id, payload) : createBundle(payload),
    onSuccess: () => {
      toast.success(t('bdlSaved'))
      qc.invalidateQueries({ queryKey: ['bundles'] })
      onClose()
    },
    // 400 dari server sudah berupa kalimat yang bisa dibaca ("produk bervarian
    // belum bisa masuk paket — …: Es Kopi") — tampilkan apa adanya.
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const finalName = shownName.trim()
    const error = !finalName ? t('bdlNameRequired')
      : !lines.length ? t('bdlItemsRequired')
      : priceNum <= 0 ? t('bdlPriceRequired')
      : null
    if (error) { toast.error(error); return }
    const payload: BundlePayload = {
      name: finalName,
      description: desc.trim(),
      sell_price: priceNum,
      items: lines.map((i) => ({ product_id: i.id, quantity: i.qty })),
    }
    if (imageBase64) payload.image = imageBase64
    else if (bundle?.image && !imagePreview) payload.image = ''
    saveMut.mutate(payload)
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={bundle ? t('bdlTitleEdit') : t('bdlTitleNew')}
        size="md"
      >
        <Form onSubmit={submit} className="space-y-5">
          {/* Foto + nama */}
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label={t('productPickPhoto')}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition overflow-hidden"
              >
                {imagePreview
                  ? <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                  : <ImagePlus size={22} className="text-muted-foreground" />}
              </button>
              {imagePreview && (
                <button type="button" onClick={() => { setImagePreview(''); setImageBase64('') }}
                  className="mt-1 flex items-center gap-1 text-xs text-red-400 hover:text-red-600 dark:hover:text-red-400 transition">
                  <X size={12} /> {t('productRemoveImage')}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImagePick} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('bdlName')}<span className="text-red-500 dark:text-red-400 ml-0.5">*</span>
              </label>
              <input
                value={shownName}
                onChange={(e) => { setNameTouched(true); setName(e.target.value) }}
                placeholder={t('bdlNameHint')}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('bdlPhotoHint')}</p>
            </div>
          </div>

          {/* Isi paket */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">{t('bdlItems', { count: lines.length })}</p>
            {lines.length === 0 ? (
              <p className="text-xs text-muted-foreground mb-3">{t('bdlItemsEmpty')}</p>
            ) : (
              <ul className="mb-3 rounded-xl bg-muted/60 divide-y divide-border">
                {lines.map((i) => {
                  const p = byId.get(i.id)
                  const label = p?.name ?? savedNames.get(i.id) ?? ''
                  return (
                    <li key={i.id} className="flex items-center gap-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{label}</p>
                        {(p?.sell_price ?? 0) > 0 && (
                          <p className="text-xs text-muted-foreground">{formatCurrency(p!.sell_price!)}</p>
                        )}
                      </div>
                      {/* − di jumlah 1 mengeluarkan produk dari paket. */}
                      <button type="button" onClick={() => setQty(i.id, i.qty - 1)} aria-label={t('bdlQtyLess', { name: label })}
                        className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-foreground tabular-nums">{i.qty}</span>
                      <button type="button" onClick={() => setQty(i.id, i.qty + 1)} aria-label={t('bdlQtyMore', { name: label })}
                        className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition">
                        <Plus size={14} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Pemilih produk. Produk bervarian dan bertimer tampil redup dengan
                alasannya — server menolaknya, dan produk yang hilang tanpa
                penjelasan membuat pemilik mengira daftarnya tidak lengkap. */}
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('bdlAddSearch')}
                aria-label={t('bdlAddSearch')}
                className={cn(inputClass, 'pl-9')}
              />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-border">
              {shown.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">{t('bdlNoProducts')}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {shown.map((p) => {
                    const blocked = bundleBlockedReason(p)
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          disabled={!!blocked}
                          onClick={() => setItems((prev) => [...prev, { id: p.id, qty: 1 }])}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-foreground">{p.name}</span>
                            <span className="block text-xs text-muted-foreground">
                              {blocked ?? ((p.sell_price ?? 0) > 0 ? formatCurrency(p.sell_price!) : t('bdlPriceUnset'))}
                            </span>
                          </span>
                          {!blocked && <PlusCircle size={18} className="shrink-0 text-primary" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Harga + ringkasan hemat & untung */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('bdlPriceLabel')}<span className="text-red-500 dark:text-red-400 ml-0.5">*</span>
            </label>
            <NumericInput
              min={0} step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
            {summary.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {summary.map((line) => (
                  <p key={line.text} className={cn('text-xs', toneClass[line.tone])}>{line.text}</p>
                ))}
              </div>
            )}
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('labelDescription')} <span className="text-muted-foreground font-normal">({t('labelOptional')})</span>
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t('bdlDescHint')}
              rows={2}
              className={cn(inputClass, 'resize-none')}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">
              {t('actionCancel')}
            </button>
            <button type="submit" disabled={saveMut.isPending}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {saveMut.isPending ? t('saving') : t('actionSave')}
            </button>
          </div>
        </Form>
      </Modal>

      {/* Crop di luar modal agar z-index tidak bentrok — sama dengan form produk. */}
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onSave={(base64, dataUrl) => { setImageBase64(base64); setImagePreview(dataUrl); setCropSrc('') }}
          onClose={() => setCropSrc('')}
        />
      )}
    </>
  )
}
