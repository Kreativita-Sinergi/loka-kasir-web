/**
 * ProductFormModal — form produk 5-tab (Info, Harga, Inventori, Komposisi/BOM, Lainnya)
 * Mendukung: varian matrix builder, harga per outlet, stok per outlet, resep BOM.
 */
import { useState, useRef, useEffect } from 'react'
import {
  ImagePlus, X, RefreshCw, Plus, ChevronDown, ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { DeleteButton } from '@/components/ui/RowActions'
import ImageCropModal from '@/components/ui/ImageCropModal'
import { createProduct, updateProduct } from '@/api/products'
import type { CreateProductPayload, UpdateProductPayload, OutletStockConfig, OutletPriceConfig, VariantPayload } from '@/api/products'
import { getErrorMessage, generateRandomSKU } from '@/lib/utils'
import { verticalExamples } from '@/lib/verticalExamples'
import { useAuthStore } from '@/store/authStore'
import type { Product, Category, Brand, Unit, Tax, Outlet } from '@/types'
import BOMSection from '@/components/products/BOMSection'

// ─── Types ─────────────────────────────────────────────────────────────────

interface VariantType {
  typeName: string   // e.g. "Ukuran"
  options: string[]  // e.g. ["S","M","L"]
}

interface VariantRow {
  name: string       // generated combination e.g. "S / Merah"
  sku: string
  base_price: string
  sell_price: string
  track_stock: boolean
}

interface OutletStockRow {
  outlet_id: string
  outlet_name: string
  initial_stock: string
  min_stock: string
}

interface OutletPriceRow {
  outlet_id: string
  outlet_name: string
  base_price: string
  sell_price: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function cartesian(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>(
    (acc, arr) => acc.flatMap(a => arr.map(b => [...a, b])),
    [[]]
  )
}

function buildVariantRows(types: VariantType[], existing: VariantRow[]): VariantRow[] {
  const validTypes = types.filter(t => t.typeName && t.options.filter(Boolean).length > 0)
  if (validTypes.length === 0) return []
  const combos = cartesian(validTypes.map(t => t.options.filter(Boolean)))
  return combos.map(combo => {
    const name = combo.join(' / ')
    const found = existing.find(r => r.name === name)
    return found ?? { name, sku: generateRandomSKU(), base_price: '', sell_price: '', track_stock: false }
  })
}

// ─── Sub-components ────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange }: { tabs: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div className="flex overflow-x-auto border-b border-border mb-6 -mx-1">
      {tabs.map((t, i) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(i)}
          className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition border-b-2 -mb-px mx-1 ${
            active === i
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-foreground mb-1">
      {children}{required && <span className="text-red-500 dark:text-red-400 ml-0.5">*</span>}
    </label>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text', mono }: {
  value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; mono?: boolean
}) {
  return (
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${mono ? 'font-mono' : ''}`}
    />
  )
}

// Combobox dipakai bersama dengan form lain (mis. Diskon) — implementasinya
// tinggal di components/ui/SearchableSelect.
const SelectInput = SearchableSelect

function Toggle({ checked, onChange, label, hint }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-muted'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-card rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
    </label>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editProduct?: Product | null
  businessId: string
  categories: Category[]
  brands: Brand[]
  units: Unit[]
  taxes: Tax[]
  outlets: Outlet[]
}

const TABS = ['Info Produk', 'Harga', 'Inventori', 'Resep', 'Lainnya']

export default function ProductFormModal({
  open, onClose, onSuccess, editProduct,
  businessId, categories, brands, units, taxes, outlets,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(false)

  // Contoh isian mengikuti jenis usaha — apotek tidak disambut "Nasi Goreng".
  const business = useAuthStore(st => st.user?.business)
  const exampleName = verticalExamples.productName(
    business?.business_vertical?.code,
    business?.business_type?.code,
  )
  const exampleVariantType = verticalExamples.variantType(
    business?.business_vertical?.code,
    business?.business_type?.code,
  )
  const exampleVariantOption = verticalExamples.variantOption(
    business?.business_vertical?.code,
    business?.business_type?.code,
  )

  // ── Tab 1: Info ────────────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [imageBase64, setImageBase64] = useState('')
  const [cropSrc, setCropSrc] = useState('')   // raw data URL sebelum di-crop
  const [hasVariant, setHasVariant] = useState(false)
  const [variantTypes, setVariantTypes] = useState<VariantType[]>([{ typeName: '', options: [''] }])
  const [variantRows, setVariantRows] = useState<VariantRow[]>([])

  // ── Tab 2: Harga ───────────────────────────────────────────────────────
  const [basePrice, setBasePrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [perOutletPrice, setPerOutletPrice] = useState(false)
  const [outletPrices, setOutletPrices] = useState<OutletPriceRow[]>([])

  // ── Tab 3: Inventori ───────────────────────────────────────────────────
  const [sku, setSku] = useState(() => generateRandomSKU())
  const [trackStock, setTrackStock] = useState(false)
  const [globalInitialStock, setGlobalInitialStock] = useState('')
  const [globalMinStock, setGlobalMinStock] = useState('')
  const [perOutletStock, setPerOutletStock] = useState(false)
  const [outletStocks, setOutletStocks] = useState<OutletStockRow[]>([])

  // ── Outlet selection ───────────────────────────────────────────────────────
  // Default: semua outlet dipilih. User bisa hapus centang untuk outlet tertentu.
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([])

  // ── Tab 4: Lainnya ─────────────────────────────────────────────────────
  const [unitId, setUnitId] = useState('')
  const [taxId, setTaxId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isAvailable, setIsAvailable] = useState(true)
  const [isCookable, setIsCookable] = useState(false)

  // ── Populate from editProduct ────────────────────────────────────────
  // Sinkronisasi sengaja: saat modal dibuka, isi seluruh field form dari props
  // (mode tambah/edit). Ini reset terkontrol sekali per pembukaan, bukan loop.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return
    setTab(0)
    if (editProduct) {
      setName(editProduct.name)
      setDescription(editProduct.description ?? '')
      setCategoryId(editProduct.category?.id ?? '')
      setBrandId(editProduct.brand?.id ?? '')
      setImagePreview(editProduct.image ?? '')
      setImageBase64('')
      setHasVariant(editProduct.has_variant)
      setBasePrice(editProduct.base_price != null ? String(editProduct.base_price) : '')
      setSellPrice(editProduct.sell_price != null ? String(editProduct.sell_price) : '')
      setSku(editProduct.sku ?? generateRandomSKU())
      setTrackStock(editProduct.track_stock)
      setUnitId(editProduct.unit?.id ?? '')
      setTaxId(editProduct.tax?.id ?? '')
      setIsActive(editProduct.is_active)
      setIsAvailable(editProduct.is_available)
      setIsCookable(editProduct.is_cookable)
      // variant rows from existing variants
      const existingRows: VariantRow[] = (editProduct.variants ?? []).map(v => ({
        name: v.name,
        sku: v.sku ?? generateRandomSKU(),
        base_price: v.base_price != null ? String(v.base_price) : '',
        sell_price: v.sell_price != null ? String(v.sell_price) : '',
        track_stock: v.track_stock,
      }))
      setVariantRows(existingRows)
      setVariantTypes([{ typeName: '', options: [''] }])
    } else {
      resetForm()
    }
    // Init outlet rows
    const stockRows = outlets.map(o => ({ outlet_id: o.id, outlet_name: o.name, initial_stock: '', min_stock: '' }))
    const priceRows = outlets.map(o => ({ outlet_id: o.id, outlet_name: o.name, base_price: '', sell_price: '' }))
    setOutletStocks(stockRows)
    setOutletPrices(priceRows)
    setPerOutletStock(false)
    setPerOutletPrice(false)
    // Semua outlet dipilih secara default
    setSelectedOutletIds(outlets.map(o => o.id))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editProduct, outlets])
  /* eslint-enable react-hooks/set-state-in-effect */

  function resetForm() {
    setName(''); setDescription(''); setCategoryId(''); setBrandId('')
    setImagePreview(''); setImageBase64(''); setCropSrc(''); setHasVariant(false)
    setVariantTypes([{ typeName: '', options: [''] }]); setVariantRows([])
    setBasePrice(''); setSellPrice(''); setPerOutletPrice(false)
    setSku(generateRandomSKU()); setTrackStock(false)
    setGlobalInitialStock(''); setGlobalMinStock('')
    setPerOutletStock(false)
    setUnitId(''); setTaxId(''); setIsActive(true); setIsAvailable(true); setIsCookable(false)
    setSelectedOutletIds(outlets.map(o => o.id))
  }

  function toggleOutletSelection(id: string) {
    setSelectedOutletIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleClose() { resetForm(); onClose() }

  // ── Image picker → buka crop modal ───────────────────────────────────
  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setCropSrc(reader.result as string) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleCropSave(base64: string, dataUrl: string) {
    setImagePreview(dataUrl)
    setImageBase64(base64)
    setCropSrc('')
  }

  // ── Variant matrix ────────────────────────────────────────────────────
  function updateVariantTypes(newTypes: VariantType[]) {
    setVariantTypes(newTypes)
    setVariantRows(prev => buildVariantRows(newTypes, prev))
  }

  function setTypeName(i: number, val: string) {
    const t = [...variantTypes]; t[i] = { ...t[i], typeName: val }; updateVariantTypes(t)
  }
  function setOption(ti: number, oi: number, val: string) {
    const t = [...variantTypes]
    const opts = [...t[ti].options]; opts[oi] = val; t[ti] = { ...t[ti], options: opts }
    updateVariantTypes(t)
  }
  function addOption(ti: number) {
    const t = [...variantTypes]; t[ti] = { ...t[ti], options: [...t[ti].options, ''] }; updateVariantTypes(t)
  }
  function removeOption(ti: number, oi: number) {
    const t = [...variantTypes]; const opts = t[ti].options.filter((_, j) => j !== oi)
    t[ti] = { ...t[ti], options: opts.length ? opts : [''] }; updateVariantTypes(t)
  }
  function addVariantType() {
    updateVariantTypes([...variantTypes, { typeName: '', options: [''] }])
  }
  function removeVariantType(i: number) {
    const t = variantTypes.filter((_, j) => j !== i); updateVariantTypes(t.length ? t : [{ typeName: '', options: [''] }])
  }

  function updateVariantRow(i: number, field: keyof VariantRow, val: string | boolean) {
    setVariantRows(prev => prev.map((r, j) => j === i ? { ...r, [field]: val } : r))
  }

  // ── Outlet rows helpers ───────────────────────────────────────────────
  function updateOutletStock(i: number, field: keyof OutletStockRow, val: string) {
    setOutletStocks(prev => prev.map((r, j) => j === i ? { ...r, [field]: val } : r))
  }
  function updateOutletPrice(i: number, field: keyof OutletPriceRow, val: string) {
    setOutletPrices(prev => prev.map((r, j) => j === i ? { ...r, [field]: val } : r))
  }

  // ── Submit ────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Nama produk harus diisi'); setTab(0); return }
    if (hasVariant && variantRows.length === 0) { toast.error('Tambahkan minimal 1 varian'); setTab(0); return }

    const builtVariants: VariantPayload[] = variantRows.map(r => ({
      name: r.name,
      sku: r.sku || undefined,
      base_price: r.base_price ? Number(r.base_price) : null,
      sell_price: r.sell_price ? Number(r.sell_price) : null,
      track_stock: r.track_stock,
      is_active: true,
      is_available: true,
      outlet_stocks: perOutletStock
        ? outletStocks.filter(o => o.initial_stock || o.min_stock).map<OutletStockConfig>(o => ({
            outlet_id: o.outlet_id,
            initial_stock: Number(o.initial_stock) || 0,
            min_stock: Number(o.min_stock) || 0,
          }))
        : undefined,
      outlet_prices: perOutletPrice
        ? outletPrices.filter(o => o.base_price || o.sell_price).map<OutletPriceConfig>(o => ({
            outlet_id: o.outlet_id,
            base_price: o.base_price ? Number(o.base_price) : null,
            sell_price: o.sell_price ? Number(o.sell_price) : null,
          }))
        : undefined,
    }))

    const builtOutletStocks: OutletStockConfig[] = !hasVariant && trackStock
      ? perOutletStock
        ? outletStocks
            .filter(o => selectedOutletIds.includes(o.outlet_id) && (o.initial_stock || o.min_stock))
            .map(o => ({
              outlet_id: o.outlet_id,
              initial_stock: Number(o.initial_stock) || 0,
              min_stock: Number(o.min_stock) || 0,
            }))
        : (globalInitialStock || globalMinStock)
          ? selectedOutletIds.map(id => ({
              outlet_id: id,
              initial_stock: Number(globalInitialStock) || 0,
              min_stock: Number(globalMinStock) || 0,
            }))
          : []
      : []

    const builtOutletPrices: OutletPriceConfig[] = perOutletPrice && !hasVariant
      ? outletPrices
          .filter(o => selectedOutletIds.includes(o.outlet_id) && (o.base_price || o.sell_price))
          .map(o => ({
            outlet_id: o.outlet_id,
            base_price: o.base_price ? Number(o.base_price) : null,
            sell_price: o.sell_price ? Number(o.sell_price) : null,
          }))
      : []

    setLoading(true)
    try {
      if (editProduct) {
        const payload: UpdateProductPayload = {
          name: name.trim(),
          description: description || null,
          category_id: categoryId || null,
          brand_id: brandId || null,
          unit_id: unitId || null,
          tax_id: taxId || null,
          base_price: !hasVariant && basePrice ? Number(basePrice) : null,
          sell_price: !hasVariant && sellPrice ? Number(sellPrice) : null,
          sku: !hasVariant ? (sku || null) : null,
          track_stock: !hasVariant ? trackStock : undefined,
          is_active: isActive,
          is_available: isAvailable,
          is_cookable: isCookable,
          image: imageBase64 || null,
          variants: hasVariant
            ? builtVariants.map(v => ({ ...v, id: '', business_id: businessId }))
            : undefined,
        }
        await updateProduct(editProduct.id, payload)
        toast.success('Produk berhasil diperbarui')
      } else {
        const payload: CreateProductPayload = {
          name: name.trim(),
          description: description || undefined,
          category_id: categoryId || null,
          brand_id: brandId || null,
          unit_id: unitId || null,
          tax_id: taxId || null,
          base_price: !hasVariant && basePrice ? Number(basePrice) : null,
          sell_price: !hasVariant && sellPrice ? Number(sellPrice) : null,
          sku: !hasVariant ? sku : undefined,
          track_stock: !hasVariant ? trackStock : undefined,
          is_active: isActive,
          is_available: isAvailable,
          is_cookable: isCookable,
          image: imageBase64 || undefined,
          variants: hasVariant ? builtVariants : undefined,
          outlet_stocks: builtOutletStocks.length ? builtOutletStocks : undefined,
          outlet_prices: builtOutletPrices.length ? builtOutletPrices : undefined,
        }
        await createProduct(payload)
        toast.success('Produk berhasil ditambahkan')
      }
      onSuccess()
      handleClose()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <>
    <Modal
      open={open}
      onClose={handleClose}
      title={editProduct ? 'Edit Produk' : 'Tambah Produk'}
      size="lg"
      // Saat crop modal (sibling di luar konten dialog) terbuka, jangan tutup
      // modal produk karena klik di dalam crop dianggap "interaksi di luar".
      onInteractOutside={(e) => { if (cropSrc) e.preventDefault() }}
    >
      <form onSubmit={handleSubmit}>
        <TabBar tabs={TABS} active={tab} onChange={setTab} />

        {/* ── Tab 0: Info Produk ─────────────────────────────────────────── */}
        {tab === 0 && (
          <div className="space-y-5">
            {/* Image */}
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:bg-blue-500/10 transition overflow-hidden shrink-0"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus size={22} /><span className="text-xs">Pilih foto</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Klik kotak untuk memilih gambar</p>
                <p>Format: JPG, PNG, WEBP · Maks. 2 MB</p>
                {imagePreview && (
                  <button type="button" onClick={() => { setImagePreview(''); setImageBase64('') }}
                    className="flex items-center gap-1 text-red-400 hover:text-red-600 dark:text-red-400 transition mt-1">
                    <X size={12} /> Hapus gambar
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                className="hidden" onChange={handleImagePick} />
            </div>

            {/* Name */}
            <div>
              <FieldLabel required>Nama Produk</FieldLabel>
              <TextInput value={name} onChange={setName} placeholder={exampleName} />
            </div>

            {/* Description */}
            <div>
              <FieldLabel>Deskripsi</FieldLabel>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Deskripsi singkat produk..."
                className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            {/* Category & Brand */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Kategori</FieldLabel>
                <SelectInput value={categoryId} onChange={setCategoryId} placeholder="— Pilih Kategori —"
                  options={categories.map(c => ({ value: c.id, label: c.name }))} />
              </div>
              <div>
                <FieldLabel>Brand</FieldLabel>
                <SelectInput value={brandId} onChange={setBrandId} placeholder="— Pilih Brand —"
                  options={brands.map(b => ({ value: b.id, label: b.name }))} />
              </div>
            </div>

            {/* Outlet selection */}
            {outlets.length > 0 && (
              <div>
                <FieldLabel>Tersedia di Outlet</FieldLabel>
                <p className="text-xs text-muted-foreground mb-2">Pilih outlet tempat produk ini akan dijual. Semua outlet dipilih secara default.</p>
                <div className="grid grid-cols-2 gap-2">
                  {outlets.map(o => (
                    <label key={o.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition select-none ${
                      selectedOutletIds.includes(o.id)
                        ? 'border-blue-300 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10'
                        : 'border-border hover:bg-muted'
                    }`}>
                      <input
                        type="checkbox"
                        className="accent-blue-600"
                        checked={selectedOutletIds.includes(o.id)}
                        onChange={() => toggleOutletSelection(o.id)}
                      />
                      <span className="text-sm text-foreground truncate">{o.name}</span>
                    </label>
                  ))}
                </div>
                {selectedOutletIds.length === 0 && (
                  <p className="text-xs text-amber-500 dark:text-amber-400 mt-1.5">⚠ Pilih minimal 1 outlet.</p>
                )}
              </div>
            )}

            {/* Variant toggle */}
            <Toggle
              checked={hasVariant}
              onChange={v => { setHasVariant(v); if (!v) setVariantRows([]) }}
              label="Produk memiliki varian"
              hint="Aktifkan jika produk punya pilihan seperti Ukuran, Warna, dll."
            />

            {/* Variant builder */}
            {hasVariant && (
              <div className="border border-border rounded-xl p-4 space-y-4 bg-muted">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipe Varian</p>
                {variantTypes.map((vt, ti) => (
                  <div key={ti} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input value={vt.typeName} onChange={e => setTypeName(ti, e.target.value)}
                        placeholder={exampleVariantType}
                        className="flex-1 px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card" />
                      {variantTypes.length > 1 && (
                        <DeleteButton onClick={() => removeVariantType(ti)} />
                      )}
                    </div>
                    <div className="pl-3 space-y-1.5">
                      {vt.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input value={opt} onChange={e => setOption(ti, oi, e.target.value)}
                            placeholder={`Pilihan ${oi + 1} (contoh: ${exampleVariantOption})`}
                            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card" />
                          <button type="button" onClick={() => removeOption(ti, oi)}
                            className="p-1.5 text-muted-foreground hover:text-red-500 dark:text-red-400 transition">
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addOption(ti)}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-400 mt-1">
                        <Plus size={12} /> Tambah pilihan
                      </button>
                    </div>
                  </div>
                ))}
                {variantTypes.length < 3 && (
                  <button type="button" onClick={addVariantType}
                    className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-400 font-medium">
                    <Plus size={13} /> Tambah tipe varian
                  </button>
                )}

                {/* Generated variant matrix */}
                {variantRows.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Kombinasi Varian ({variantRows.length})
                    </p>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {variantRows.map((vr, i) => (
                        <div key={vr.name} className="grid grid-cols-[1fr_120px_110px_110px] gap-2 items-center bg-card border border-border rounded-xl px-3 py-2">
                          <span className="text-sm font-medium text-foreground truncate">{vr.name}</span>
                          <div className="flex gap-1 items-center">
                            <input value={vr.sku} onChange={e => updateVariantRow(i, 'sku', e.target.value)}
                              placeholder="SKU"
                              className="w-full px-2 py-1 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono" />
                            <button type="button" onClick={() => updateVariantRow(i, 'sku', generateRandomSKU())}
                              className="p-1 text-muted-foreground hover:text-blue-500 dark:text-blue-400 transition shrink-0">
                              <RefreshCw size={11} />
                            </button>
                          </div>
                          <input type="number" min={0} value={vr.base_price}
                            onChange={e => updateVariantRow(i, 'base_price', e.target.value)}
                            placeholder="Modal"
                            className="px-2 py-1 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          <input type="number" min={0} value={vr.sell_price}
                            onChange={e => updateVariantRow(i, 'sell_price', e.target.value)}
                            placeholder="Jual"
                            className="px-2 py-1 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 1: Harga ──────────────────────────────────────────────── */}
        {tab === 1 && (
          <div className="space-y-5">
            {!hasVariant && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Harga Modal (HPP)</FieldLabel>
                    <TextInput type="number" value={basePrice} onChange={setBasePrice} placeholder="0" />
                  </div>
                  <div>
                    <FieldLabel>Harga Jual</FieldLabel>
                    <TextInput type="number" value={sellPrice} onChange={setSellPrice} placeholder="0" />
                  </div>
                </div>

                {outlets.length > 1 && (
                  <Toggle
                    checked={perOutletPrice}
                    onChange={setPerOutletPrice}
                    label="Beri harga berbeda tiap outlet"
                    hint="Harga di atas menjadi default; outlet yang diisi akan meng-override harga default."
                  />
                )}

                {perOutletPrice && outlets.length > 0 && (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[1fr_120px_120px] gap-3 px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>Outlet</span><span>Modal</span><span>Jual</span>
                    </div>
                    {outletPrices
                      .filter(op => selectedOutletIds.includes(op.outlet_id))
                      .map((op) => {
                        const i = outletPrices.findIndex(x => x.outlet_id === op.outlet_id)
                        return (
                          <div key={op.outlet_id} className="grid grid-cols-[1fr_120px_120px] gap-3 px-4 py-2.5 border-t border-border items-center">
                            <span className="text-sm text-foreground">{op.outlet_name}</span>
                            <input type="number" min={0} value={op.base_price}
                              onChange={e => updateOutletPrice(i, 'base_price', e.target.value)}
                              placeholder="—"
                              className="px-2 py-1.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <input type="number" min={0} value={op.sell_price}
                              onChange={e => updateOutletPrice(i, 'sell_price', e.target.value)}
                              placeholder="—"
                              className="px-2 py-1.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        )
                      })}
                  </div>
                )}
              </>
            )}

            {hasVariant && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
                Harga per varian diatur di tab <strong>Info Produk</strong> pada kolom Modal / Jual masing-masing kombinasi.
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: Inventori ──────────────────────────────────────────── */}
        {tab === 2 && (
          <div className="space-y-5">
            {!hasVariant && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>SKU</FieldLabel>
                    <div className="flex gap-2">
                      <TextInput value={sku} onChange={setSku} placeholder="Kode unik produk" mono />
                      <button type="button" onClick={() => setSku(generateRandomSKU())}
                        title="Generate SKU baru"
                        className="p-2 text-muted-foreground hover:text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:bg-blue-500/10 border border-border rounded-xl transition shrink-0">
                        <RefreshCw size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                <Toggle
                  checked={trackStock}
                  onChange={setTrackStock}
                  label="Lacak Stok Fisik"
                  hint="Transaksi akan memotong kuantitas stok di gudang"
                />

                {trackStock && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Stok Awal</FieldLabel>
                      <TextInput
                        type="number"
                        value={globalInitialStock}
                        onChange={setGlobalInitialStock}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <FieldLabel>Min. Stok (Peringatan)</FieldLabel>
                      <TextInput
                        type="number"
                        value={globalMinStock}
                        onChange={setGlobalMinStock}
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                {trackStock && outlets.length > 1 && (
                  <Toggle
                    checked={perOutletStock}
                    onChange={v => { setPerOutletStock(v); if (v) { setGlobalInitialStock(''); setGlobalMinStock('') } }}
                    label="Beri stok berbeda tiap outlet"
                    hint="Isi stok awal dan batas minimum per outlet secara individual."
                  />
                )}

                {trackStock && perOutletStock && outlets.length > 0 && (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[1fr_110px_110px] gap-3 px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>Outlet</span><span>Stok Awal</span><span>Min. Stok</span>
                    </div>
                    {outletStocks
                      .filter(os => selectedOutletIds.includes(os.outlet_id))
                      .map((os) => {
                        const i = outletStocks.findIndex(x => x.outlet_id === os.outlet_id)
                        return (
                          <div key={os.outlet_id} className="grid grid-cols-[1fr_110px_110px] gap-3 px-4 py-2.5 border-t border-border items-center">
                            <span className="text-sm text-foreground">{os.outlet_name}</span>
                            <input type="number" min={0} value={os.initial_stock}
                              onChange={e => updateOutletStock(i, 'initial_stock', e.target.value)}
                              placeholder="0"
                              className="px-2 py-1.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            <input type="number" min={0} value={os.min_stock}
                              onChange={e => updateOutletStock(i, 'min_stock', e.target.value)}
                              placeholder="0"
                              className="px-2 py-1.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                          </div>
                        )
                      })}
                  </div>
                )}
              </>
            )}

            {hasVariant && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
                Stok per varian dikelola di menu <strong>Stok Outlet</strong> setelah produk disimpan.
              </div>
            )}
          </div>
        )}

        {/* ── Tab 3: Komposisi (BOM) ────────────────────────────────────── */}
        {tab === 3 && (
          <div>
            {editProduct ? (
              <BOMSection productId={editProduct.id} />
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground bg-muted rounded-lg border border-dashed border-border">
                Simpan produk terlebih dahulu sebelum mengatur komposisi bahan baku.
              </div>
            )}
          </div>
        )}

        {/* ── Tab 4: Lainnya ────────────────────────────────────────────── */}
        {tab === 4 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Satuan (Unit)</FieldLabel>
                <SelectInput value={unitId} onChange={setUnitId} placeholder="— Pilih Satuan —"
                  options={units.map(u => ({ value: u.id, label: u.name }))} />
              </div>
              <div>
                <FieldLabel>Pajak</FieldLabel>
                <SelectInput value={taxId} onChange={setTaxId} placeholder="— Pilih Pajak —"
                  options={taxes.map(t => ({ value: t.id, label: t.name }))} />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dapur</p>
              <Toggle checked={isCookable} onChange={setIsCookable} label="Perlu Dimasak"
                hint="Produk ini akan tampil di Layar Dapur saat dipesan" />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
              <Toggle checked={isActive} onChange={setIsActive} label="Aktif"
                hint="Produk tampil di katalog kasir" />
              <Toggle checked={isAvailable} onChange={setIsAvailable} label="Tersedia"
                hint="Kill switch sementara — nonaktifkan tanpa menghapus produk" />
            </div>
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-5 mt-5 border-t border-border">
          {tab > 0 && (
            <button type="button" onClick={() => setTab(t => t - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition">
              <ChevronDown size={14} className="rotate-90" /> Sebelumnya
            </button>
          )}
          <div className="flex-1" />
          {tab < TABS.length - 1 ? (
            <button type="button" onClick={() => setTab(t => t + 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">
              Selanjutnya <ChevronUp size={14} className="rotate-90" />
            </button>
          ) : (
            <>
              <button type="button" onClick={handleClose}
                className="px-4 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition">
                Batal
              </button>
              <button type="submit" disabled={loading}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition">
                {loading ? 'Menyimpan...' : editProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
              </button>
            </>
          )}
        </div>
      </form>
    </Modal>

    {/* Crop modal — rendered outside main modal agar z-index tidak konflik */}
    {cropSrc && (
      <ImageCropModal
        src={cropSrc}
        onSave={handleCropSave}
        onClose={() => setCropSrc('')}
      />
    )}
    </>
  )
}
