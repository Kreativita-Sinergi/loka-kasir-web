import { validNumericInput, validWholeNumberInput } from '@/lib/materialUnits'
import NumericInput from '@/components/ui/NumericInput'
import Form from '@/components/ui/Form'
/**
 * ProductFormModal — form produk 5-tab (Info, Harga, Inventori, Komposisi/BOM, Lainnya)
 * Mendukung: varian matrix builder, harga per outlet, stok per outlet, resep BOM.
 */
import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import {
  WEIGHT_UNITS, normalizeWeightUnit, pricePerWeightUnit, weightUnitLabel, weightUnitScale,
  type WeightUnit,
} from '@/lib/money'
import BarcodeField from '@/components/products/BarcodeField'
import { verticalExamples } from '@/lib/verticalExamples'
import { DRUG_CLASSES, drugClassAccent, drugClassRequiresPrescription } from '@/lib/constants'
import { useAuthStore } from '@/store/authStore'
import type { Product, Category, Brand, Unit, Tax, Outlet } from '@/types'
import BOMSection from '@/components/products/BOMSection'
import PriceTierRows from '@/components/products/PriceTierRows'
import { rowsToTiers, tierRowsError, tiersToRows, type TierRow } from '@/lib/priceTiers'
import { t } from '@/lib/i18n'
import { getSuppliers } from '@/api/suppliers'
import { getOutletStockOne } from '@/api/stock'
import { useOutletStore } from '@/store/outletStore'

// ─── Types ─────────────────────────────────────────────────────────────────

interface VariantType {
  typeName: string   // e.g. "Ukuran"
  options: string[]  // e.g. ["S","M","L"]
}

interface VariantRow {
  name: string       // generated combination e.g. "S / Merah"
  /** Id varian yang sudah ada. Kosong = kombinasi baru yang belum tersimpan. */
  id?: string
  sku: string
  barcodes: string[]
  base_price: string
  sell_price: string
  track_stock: boolean
  /** Harga grosir kombinasi ini. */
  price_tiers: TierRow[]
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

/**
 * Stok barang terukur disimpan server dalam satuan TERKECIL — gram untuk berat,
 * mililiter untuk volume — sementara pemilik toko berpikir dalam kg/liter.
 *
 * Cerminan `parseWeightToGrams`/`gramsAsKilogramInput` di aplikasi kasir. Tanpa
 * keduanya, beras 350,67 kg yang diketik di dashboard tersimpan sebagai 350
 * gram, dan stok yang sama dibaca kembali sebagai "350670".
 */
function measuredToStored(input: string, measured: boolean, unit: WeightUnit = 'kg'): number {
  const n = Number(String(input).replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return 0
  return measured ? Math.round(n * weightUnitScale(unit)) : Math.trunc(n)
}

function storedToMeasuredInput(value: number, measured: boolean, unit: WeightUnit = 'kg'): string {
  if (!measured) return String(value)
  return trimDecimals(value / weightUnitScale(unit), 3)
}

function trimDecimals(v: number, digits: number): string {
  return String(Number(v.toFixed(digits)))
}

/** Harga per satuan jual produk → harga per kg/L yang disimpan server. */
function priceToPerKilo(input: string, unit: WeightUnit): number {
  return Number(trimDecimals(Number(input) * (1000 / weightUnitScale(unit)), 2))
}

/**
 * Ganti satuan tanpa mengubah besaran yang sudah diketik: 5 kg menjadi 50 ons,
 * bukan 5 ons. [perUnit] untuk harga — harganya mengecil saat satuannya mengecil.
 */
function rescaleInput(input: string, from: WeightUnit, to: WeightUnit, perUnit: boolean): string {
  if (input.trim() === '' || from === to) return input
  const n = Number(input.replace(',', '.'))
  if (!Number.isFinite(n)) return input
  const f = weightUnitScale(from), t = weightUnitScale(to)
  return trimDecimals(perUnit ? n * t / f : n * f / t, perUnit ? 2 : 3)
}

function WeightUnitPicker({ label, value, unitName, onChange }: {
  label: string
  value: WeightUnit
  unitName?: string | null
  onChange: (v: WeightUnit) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="inline-flex rounded-xl border border-border p-0.5">
        {WEIGHT_UNITS.map(u => (
          <button
            key={u}
            type="button"
            onClick={() => onChange(u)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              value === u
                ? 'bg-blue-600 text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {weightUnitLabel(u, unitName)}
          </button>
        ))}
      </div>
    </div>
  )
}

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
    return found ?? { name, sku: generateRandomSKU(), barcodes: [], base_price: '', sell_price: '', track_stock: false, price_tiers: [] }
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

function TextInput({ value, onChange, placeholder, type = 'text', mono, step }: {
  value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; mono?: boolean
  /** Dibutuhkan kolom stok barang terukur: tanpa ini "350,67" ditolak browser. */
  step?: string
}) {
  const Control = type === 'number' ? NumericInput : 'input'
  return (
    <Control
      type={type} min={type === 'number' ? 0 : undefined} value={value} placeholder={placeholder} step={step ?? (type === 'number' ? 'any' : undefined)}
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

const TAB_KEYS = ['tabProductInfo', 'tabPrice', 'tabInventory', 'tabRecipe', 'tabOther'] as const

export default function ProductFormModal({
  open, onClose, onSuccess, editProduct,
  businessId, categories, brands, units, taxes, outlets,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(false)

  // Contoh isian mengikuti jenis usaha — apotek tidak disambut "Nasi Goreng".
  const business = useAuthStore(st => st.user?.business)
  const preOrderEnabled = business?.pre_order_enabled === true
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

  // Bagian apotek muncul untuk apotek, dan untuk produk yang TERLANJUR punya
  // golongan obat apa pun jenis usahanya sekarang. Menyembunyikannya dari
  // produk yang sudah bergolongan akan membuat obat keras kehilangan
  // penandanya tanpa siapa pun menekan apa pun.
  const isPharmacy =
    business?.business_vertical?.code?.toUpperCase() === 'APOTEK'
  const showPharmacyFields = isPharmacy || Boolean(editProduct?.drug_class)

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
  /** Harga grosir produk tanpa varian, dalam satuan jual yang tampil. */
  const [priceTiers, setPriceTiers] = useState<TierRow[]>([])
  const [perOutletPrice, setPerOutletPrice] = useState(false)
  const [outletPrices, setOutletPrices] = useState<OutletPriceRow[]>([])

  // ── Tab 3: Inventori ───────────────────────────────────────────────────
  const [sku, setSku] = useState(() => generateRandomSKU())
  const [barcodes, setBarcodes] = useState<string[]>([])
  const [trackStock, setTrackStock] = useState(false)
  const [globalInitialStock, setGlobalInitialStock] = useState('')
  const [globalMinStock, setGlobalMinStock] = useState('')
  const [perOutletStock, setPerOutletStock] = useState(false)
  const [outletStocks, setOutletStocks] = useState<OutletStockRow[]>([])
  const [consignorId, setConsignorId] = useState('')
  const [consignmentNotes, setConsignmentNotes] = useState('')
  const [consignmentDepositPrice, setConsignmentDepositPrice] = useState('')

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'product-consignors'],
    queryFn: () => getSuppliers({ page: 1, limit: 200 }),
    enabled: open,
  })
  const consignors = (suppliersData?.data?.data ?? []).filter(s => s.is_consignor)

  // Outlet aktif — dipakai untuk memuat stok berjalan saat edit produk.
  const { selected: activeOutlet } = useOutletStore()

  // ── Outlet selection ───────────────────────────────────────────────────────
  // Default: semua outlet dipilih. User bisa hapus centang untuk outlet tertentu.
  const [selectedOutletIds, setSelectedOutletIds] = useState<string[]>([])

  // ── Tab 4: Lainnya ─────────────────────────────────────────────────────
  const [unitId, setUnitId] = useState('')
  const [taxId, setTaxId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isAvailable, setIsAvailable] = useState(true)
  const [isCookable, setIsCookable] = useState(false)
  // Pre-order hanya ditawarkan — dan dikirim — bila usaha menyalakannya;
  // selain itu server mempertahankan nilai tersimpan.
  const [isPreOrder, setIsPreOrder] = useState(false)
  const [preOrderDays, setPreOrderDays] = useState('')
  const preOrderPayload = preOrderEnabled
    ? {
        is_pre_order: isPreOrder,
        pre_order_days: isPreOrder ? Math.min(Math.max(parseInt(preOrderDays, 10) || 0, 0), 365) : 0,
      }
    : {}
  const [isWeightBased, setIsWeightBased] = useState(false)
  // Produk bervarian tidak pernah kiloan — berat hanya bisa dikalikan pada satu
  // harga. Dipisahkan dari [isWeightBased] karena seluruh kolom stok memakainya.
  const measuredStock = !hasVariant && isWeightBased
  const unitName = units.find(u => u.id === unitId)?.name
  // Satuan jual barang terukur. Harga dan stok diisi dalam satuan ini; yang
  // dikirim ke server tetap per kg dan gram — lihat weightUnitScale.
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')
  const weightLabel = weightUnitLabel(weightUnit, unitName)
  // Harga yang dikirim: per kg/L untuk barang terukur, apa adanya untuk lainnya.
  const priceOut = (v: string) => (measuredStock ? priceToPerKilo(v, weightUnit) : Number(v))

  function changeWeightUnit(next: WeightUnit) {
    const price = (v: string) => rescaleInput(v, weightUnit, next, true)
    const qty = (v: string) => rescaleInput(v, weightUnit, next, false)
    setBasePrice(price); setSellPrice(price)
    setPriceTiers(prev => prev.map(r => ({ min_qty: rescaleInput(r.min_qty, weightUnit, next, false), price: price(r.price) })))
    setOutletPrices(prev => prev.map(p => ({ ...p, base_price: price(p.base_price), sell_price: price(p.sell_price) })))
    setGlobalInitialStock(qty); setGlobalMinStock(qty)
    setOutletStocks(prev => prev.map(r => ({ ...r, initial_stock: qty(r.initial_stock), min_stock: qty(r.min_stock) })))
    setWeightUnit(next)
  }
  // ── Apotek ──────────────────────────────────────────────────────────────
  // Golongan kosong berarti barang ini BUKAN obat — keadaan bawaan, dan
  // keadaan mayoritas isi apotek (popok, susu, alat kesehatan).
  const [drugClass, setDrugClass] = useState('')
  const [activeIngredient, setActiveIngredient] = useState('')
  const [bpomRegistration, setBpomRegistration] = useState('')
  const [purchaseUnitId, setPurchaseUnitId] = useState('')
  const [unitsPerPurchase, setUnitsPerPurchase] = useState('')

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
      // Barang terukur: server menyimpan per kg, form menampilkan per satuan jualnya.
      const editUnit = normalizeWeightUnit(editProduct.weight_unit)
      const shownPrice = (v: number) => editProduct.is_weight_based && !editProduct.has_variant
        ? trimDecimals(pricePerWeightUnit(v, editUnit), 2)
        : String(v)
      setWeightUnit(editUnit)
      setBasePrice(editProduct.base_price != null ? shownPrice(editProduct.base_price) : '')
      setSellPrice(editProduct.sell_price != null ? shownPrice(editProduct.sell_price) : '')
      setPriceTiers(tiersToRows(
        editProduct.price_tiers,
        editProduct.is_weight_based && !editProduct.has_variant ? editUnit : undefined,
      ))
      setSku(editProduct.sku ?? generateRandomSKU())
      setBarcodes(editProduct.barcodes ?? [])
      setTrackStock(editProduct.track_stock)
      setUnitId(editProduct.unit?.id ?? '')
      setTaxId(editProduct.tax?.id ?? '')
      setIsActive(editProduct.is_active)
      setIsAvailable(editProduct.is_available)
      setIsCookable(editProduct.is_cookable)
      setIsPreOrder(editProduct.is_pre_order ?? false)
      setPreOrderDays(editProduct.pre_order_days ? String(editProduct.pre_order_days) : '')
      setIsWeightBased(editProduct.is_weight_based)
      setConsignorId(editProduct.consignor_id ?? '')
      setConsignmentNotes(editProduct.consignment_notes ?? '')
      setConsignmentDepositPrice(
        editProduct.consignment_deposit_price != null
          ? String(editProduct.consignment_deposit_price)
          : ''
      )
      setDrugClass(editProduct.drug_class ?? '')
      setActiveIngredient(editProduct.active_ingredient ?? '')
      setBpomRegistration(editProduct.bpom_registration ?? '')
      setPurchaseUnitId(editProduct.purchase_unit?.id ?? '')
      setUnitsPerPurchase(
        editProduct.units_per_purchase != null ? String(editProduct.units_per_purchase) : '',
      )
      // variant rows from existing variants
      const existingRows: VariantRow[] = (editProduct.variants ?? []).map(v => ({
        id: v.id,
        name: v.name,
        sku: v.sku ?? generateRandomSKU(),
        barcodes: v.barcodes ?? [],
        base_price: v.base_price != null ? String(v.base_price) : '',
        sell_price: v.sell_price != null ? String(v.sell_price) : '',
        track_stock: v.track_stock,
        price_tiers: tiersToRows(v.price_tiers),
      }))
      setVariantRows(existingRows)
      setVariantTypes([{ typeName: '', options: [''] }])
    } else {
      resetForm()
    }
    // Init outlet rows — stok awal dikosongkan dulu, lalu diisi dari server
    // bila ini mode edit. Tanpa pengambilan ini, kolom "Stok Awal" selalu 0
    // saat membuka form edit, dan menekan Simpan tanpa mengubah apa pun akan
    // mengosongkan stok yang sebenarnya masih ada.
    const stockRows = outlets.map(o => ({ outlet_id: o.id, outlet_name: o.name, initial_stock: '', min_stock: '' }))
    const priceRows = outlets.map(o => ({ outlet_id: o.id, outlet_name: o.name, base_price: '', sell_price: '' }))
    setOutletStocks(stockRows)
    setOutletPrices(priceRows)
    setPerOutletStock(false)
    setPerOutletPrice(false)
    // Semua outlet dipilih secara default
    setSelectedOutletIds(outlets.map(o => o.id))

    // Saat mode edit dan produk melacak stok, muat stok berjalan dari server
    // untuk outlet aktif agar kolom tidak selalu tampil 0.
    if (editProduct && editProduct.track_stock && activeOutlet?.id) {
      getOutletStockOne(activeOutlet.id, editProduct.id)
        .then(res => {
          const measured = editProduct.is_weight_based
          const unit = normalizeWeightUnit(editProduct.weight_unit)
          const qty = res.data?.data?.quantity
          const minStock = res.data?.data?.min_stock
          if (qty != null) setGlobalInitialStock(storedToMeasuredInput(qty, measured, unit))
          if (minStock != null && minStock > 0) {
            setGlobalMinStock(storedToMeasuredInput(minStock, measured, unit))
          }
        })
        .catch(() => { /* biarkan kosong — lebih baik 0 daripada error modal */ })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editProduct, outlets, activeOutlet])
  /* eslint-enable react-hooks/set-state-in-effect */

  function resetForm() {
    setName(''); setDescription(''); setCategoryId(''); setBrandId('')
    setImagePreview(''); setImageBase64(''); setCropSrc(''); setHasVariant(false)
    setVariantTypes([{ typeName: '', options: [''] }]); setVariantRows([])
    setBasePrice(''); setSellPrice(''); setPriceTiers([]); setPerOutletPrice(false)
    setSku(generateRandomSKU()); setBarcodes([]); setTrackStock(false)
    setGlobalInitialStock(''); setGlobalMinStock('')
    setPerOutletStock(false)
    setUnitId(''); setTaxId(''); setIsActive(true); setIsAvailable(true); setIsCookable(false); setIsPreOrder(false); setPreOrderDays('')
    setIsWeightBased(false)
    setWeightUnit('kg')
    setConsignorId('')
    setConsignmentNotes('')
    setConsignmentDepositPrice('')
    // Field apotek juga harus dikosongkan: tanpa ini, membuka "Tambah Produk"
    // setelah menyunting obat keras mewarisi golongan & satuan belinya.
    setDrugClass(''); setActiveIngredient(''); setBpomRegistration('')
    setPurchaseUnitId(''); setUnitsPerPurchase('')
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

  function setVariantBarcodes(i: number, next: string[]) {
    setVariantRows(prev => prev.map((r, j) => j === i ? { ...r, barcodes: next } : r))
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
    if (!name.trim()) { toast.error(t('productNameRequired')); setTab(0); return }
    if (hasVariant && variantRows.length === 0) { toast.error(t('productVariantRequired')); setTab(0); return }
    const validOptional = (value: string) => value === '' || validNumericInput(value)
    const validStock = (value: string) => value === '' || (measuredStock ? validNumericInput(value) : validWholeNumberInput(value))
    if (![basePrice, sellPrice, consignmentDepositPrice, ...outletPrices.flatMap(row => [row.base_price, row.sell_price]), ...variantRows.flatMap(row => [row.base_price, row.sell_price])].every(validOptional)) {
      toast.error(t('inputInvalidNumbers')); setTab(1); return
    }
    if (![globalInitialStock, globalMinStock, ...outletStocks.flatMap(row => [row.initial_stock, row.min_stock])].every(validStock)) {
      toast.error(t('inputInvalidNumbers')); setTab(2); return
    }
    if (variantRows.some(row => !row.name.trim())) { toast.error(t('inputRequiredText')); setTab(0); return }
    const tierError = hasVariant
      ? variantRows.map(r => tierRowsError(r.price_tiers, r.sell_price, false)).find(Boolean)
      : tierRowsError(priceTiers, sellPrice, measuredStock)
    if (tierError) { toast.error(t(tierError)); setTab(hasVariant ? 0 : 1); return }
    // Selalu dikirim: daftar kosong berarti pemilik menghapus semua tingkatnya.
    const builtPriceTiers = hasVariant ? [] : rowsToTiers(priceTiers, measuredStock ? weightUnit : undefined)


    const builtVariants: VariantPayload[] = variantRows.map(r => ({
      id: r.id,
      name: r.name.trim(),
      sku: r.sku.trim() || undefined,
      barcodes: r.barcodes,
      base_price: r.base_price ? Number(r.base_price) : null,
      sell_price: r.sell_price ? Number(r.sell_price) : null,
      price_tiers: rowsToTiers(r.price_tiers),
      track_stock: r.track_stock,
      is_active: true,
      is_available: true,
      // Stok dan batas minimum varian diatur di halaman Stok Outlet (lihat
      // catatan di tab Stok). Dulu isian stok per outlet MILIK PRODUK — yang
      // tersembunyi untuk produk bervarian tetapi tetap terisi saat edit —
      // ikut terkirim ke setiap varian dan menimpa stok semua varian dengan
      // angka yang sama setiap kali produk disimpan.
      outlet_stocks: undefined,
      outlet_prices: perOutletPrice
        ? outletPrices.filter(o => o.base_price || o.sell_price).map<OutletPriceConfig>(o => ({
            outlet_id: o.outlet_id,
            base_price: o.base_price ? priceOut(o.base_price) : null,
            sell_price: o.sell_price ? priceOut(o.sell_price) : null,
          }))
        : undefined,
    }))

    const builtOutletStocks: OutletStockConfig[] = !hasVariant && trackStock
      ? perOutletStock
        ? outletStocks
            .filter(o => selectedOutletIds.includes(o.outlet_id) && (o.initial_stock || o.min_stock))
            .map(o => ({
              outlet_id: o.outlet_id,
              initial_stock: measuredToStored(o.initial_stock, measuredStock, weightUnit),
              min_stock: measuredToStored(o.min_stock, measuredStock, weightUnit),
            }))
        : (globalInitialStock || globalMinStock)
          ? selectedOutletIds.map(id => ({
              outlet_id: id,
              initial_stock: measuredToStored(globalInitialStock, measuredStock, weightUnit),
              min_stock: measuredToStored(globalMinStock, measuredStock, weightUnit),
            }))
          : []
      : []

    const builtOutletPrices: OutletPriceConfig[] = perOutletPrice && !hasVariant
      ? outletPrices
          .filter(o => selectedOutletIds.includes(o.outlet_id) && (o.base_price || o.sell_price))
          .map(o => ({
            outlet_id: o.outlet_id,
            base_price: o.base_price ? priceOut(o.base_price) : null,
            sell_price: o.sell_price ? priceOut(o.sell_price) : null,
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
          base_price: !hasVariant && basePrice ? priceOut(basePrice) : null,
          sell_price: !hasVariant && sellPrice ? priceOut(sellPrice) : null,
          sku: !hasVariant ? (sku || null) : null,
          barcodes,
          track_stock: !hasVariant ? trackStock : undefined,
          is_active: isActive,
          is_available: isAvailable,
          is_cookable: isCookable,
          ...preOrderPayload,
          is_weight_based: !hasVariant && isWeightBased,
          weight_unit: weightUnit,
          price_tiers: builtPriceTiers,
          consignor_id: consignorId || null,
          consignment_notes: consignorId ? (consignmentNotes.trim() || null) : null,
          consignment_deposit_price: consignorId && consignmentDepositPrice
            ? Number(consignmentDepositPrice)
            : null,
          // Golongan dikirim null, bukan string kosong: null berarti "bukan
          // obat", dan "" akan tersimpan sebagai golongan yang tidak dikenal.
          drug_class: drugClass || null,
          active_ingredient: activeIngredient.trim() || null,
          bpom_registration: bpomRegistration.trim() || null,
          // Satuan turunan hanya bermakna berpasangan — server pun
          // mengosongkan keduanya bila hanya salah satu terisi.
          purchase_unit_id: purchaseUnitId || null,
          units_per_purchase: Number(unitsPerPurchase) || null,
          image: imageBase64 || null,
          // Dulu baris ini memaksa `id: ''` untuk SETIAP varian. Server menolak
          // string kosong saat men-decode UUID, sehingga setiap penyimpanan
          // produk bervarian dari dashboard dijawab 400 — harga maupun barcode
          // varian tidak pernah benar-benar tersimpan. Sekarang id aslinya
          // dikirim; kombinasi baru sengaja tidak punya id, dan server
          // membuatkannya.
          variants: hasVariant
            ? builtVariants.map(v => ({ ...v, business_id: businessId }))
            : undefined,
        }
        await updateProduct(editProduct.id, payload)
        toast.success(t('productUpdated'))
      } else {
        const payload: CreateProductPayload = {
          name: name.trim(),
          description: description || undefined,
          category_id: categoryId || null,
          brand_id: brandId || null,
          unit_id: unitId || null,
          tax_id: taxId || null,
          base_price: !hasVariant && basePrice ? priceOut(basePrice) : null,
          sell_price: !hasVariant && sellPrice ? priceOut(sellPrice) : null,
          sku: !hasVariant ? sku : undefined,
          barcodes,
          track_stock: !hasVariant ? trackStock : undefined,
          is_active: isActive,
          is_available: isAvailable,
          is_cookable: isCookable,
          ...preOrderPayload,
          is_weight_based: !hasVariant && isWeightBased,
          weight_unit: weightUnit,
          price_tiers: builtPriceTiers,
          consignor_id: consignorId || null,
          consignment_notes: consignorId ? (consignmentNotes.trim() || null) : null,
          consignment_deposit_price: consignorId && consignmentDepositPrice
            ? Number(consignmentDepositPrice)
            : null,
          // Golongan dikirim null, bukan string kosong: null berarti "bukan
          // obat", dan "" akan tersimpan sebagai golongan yang tidak dikenal.
          drug_class: drugClass || null,
          active_ingredient: activeIngredient.trim() || null,
          bpom_registration: bpomRegistration.trim() || null,
          // Satuan turunan hanya bermakna berpasangan — server pun
          // mengosongkan keduanya bila hanya salah satu terisi.
          purchase_unit_id: purchaseUnitId || null,
          units_per_purchase: Number(unitsPerPurchase) || null,
          image: imageBase64 || undefined,
          variants: hasVariant ? builtVariants : undefined,
          outlet_stocks: builtOutletStocks.length ? builtOutletStocks : undefined,
          outlet_prices: builtOutletPrices.length ? builtOutletPrices : undefined,
        }
        await createProduct(payload)
        toast.success(t('productAdded'))
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
      title={editProduct ? t('productEdit') : t('productAdd')}
      size="lg"
      // Saat crop modal (sibling di luar konten dialog) terbuka, jangan tutup
      // modal produk karena klik di dalam crop dianggap "interaksi di luar".
      onInteractOutside={(e) => { if (cropSrc) e.preventDefault() }}
    >
      <Form onSubmit={handleSubmit}>
        <TabBar tabs={TAB_KEYS.map((k) => t(k))} active={tab} onChange={setTab} />

        {/* ── Tab 0: Info Produk ─────────────────────────────────────────── */}
        {tab === 0 && (
          <div className="space-y-5">
            {/* Image */}
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition overflow-hidden shrink-0"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus size={22} /><span className="text-xs">{t('productPickPhoto')}</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>{t('productPickPhotoHint')}</p>
                <p>{t('productPhotoFormats')}</p>
                {imagePreview && (
                  <button type="button" onClick={() => { setImagePreview(''); setImageBase64('') }}
                    className="flex items-center gap-1 text-red-400 hover:text-red-600 dark:hover:text-red-400 transition mt-1">
                    <X size={12} /> {t('productRemoveImage')}
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                className="hidden" onChange={handleImagePick} />
            </div>

            {/* Name */}
            <div>
              <FieldLabel required>{t('productName')}</FieldLabel>
              <TextInput value={name} onChange={setName} placeholder={exampleName} />
            </div>

            {/* Description */}
            <div>
              <FieldLabel>{t('labelDescription')}</FieldLabel>
              <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)}
                placeholder={t('productDescHint')}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            {/* Category & Brand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>{t('labelCategory')}</FieldLabel>
                <SelectInput value={categoryId} onChange={setCategoryId} placeholder={t('pickCategory')}
                  options={categories.map(c => ({ value: c.id, label: c.name }))} />
              </div>
              <div>
                <FieldLabel>{t('labelBrandShort')}</FieldLabel>
                <SelectInput value={brandId} onChange={setBrandId} placeholder={t('pickBrand')}
                  options={brands.map(b => ({ value: b.id, label: b.name }))} />
              </div>
            </div>

            {/* Outlet selection */}
            {outlets.length > 0 && (
              <div>
                <FieldLabel>{t('productAvailableAt')}</FieldLabel>
                <p className="text-xs text-muted-foreground mb-2">{t('productAvailableHint')}</p>
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
                  <p className="text-xs text-amber-500 dark:text-amber-400 mt-1.5">{t('productPickOneOutlet')}</p>
                )}
              </div>
            )}

            {/* Variant toggle */}
            <Toggle
              checked={hasVariant}
              onChange={v => { setHasVariant(v); if (!v) setVariantRows([]) }}
              label={t('productHasVariants')}
              hint={t('productHasVariantsHint')}
            />

            {/* Variant builder */}
            {hasVariant && (
              <div className="border border-border rounded-xl p-4 space-y-4 bg-muted">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('productVariantType')}</p>
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
                            placeholder={t('productVariantOptionPlaceholder', { n: oi + 1, example: exampleVariantOption })}
                            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card" />
                          <button type="button" onClick={() => removeOption(ti, oi)}
                            aria-label={t('actionDelete')}
                            className="p-1.5 text-muted-foreground hover:text-red-500 dark:hover:text-red-400 transition">
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addOption(ti)}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-400 mt-1">
                        <Plus size={12} /> {t('productAddOption')}
                      </button>
                    </div>
                  </div>
                ))}
                {variantTypes.length < 3 && (
                  <button type="button" onClick={addVariantType}
                    className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-400 font-medium">
                    <Plus size={13} /> {t('productAddVariantType')}
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
                        <div key={vr.name} className="bg-card border border-border rounded-xl px-3 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px_110px_110px] gap-2 items-center">
                          <span className="text-sm font-medium text-foreground truncate">{vr.name}</span>
                          <div className="flex gap-1 items-center">
                            <input value={vr.sku} onChange={e => updateVariantRow(i, 'sku', e.target.value)}
                              placeholder="SKU"
                              className="w-full px-2 py-1 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono" />
                            <button type="button" onClick={() => updateVariantRow(i, 'sku', generateRandomSKU())}
                              aria-label={t('productGenerateSku')}
                              className="p-1 text-muted-foreground hover:text-blue-500 dark:hover:text-blue-400 transition shrink-0">
                              <RefreshCw size={11} />
                            </button>
                          </div>
                          <NumericInput type="number" min={0} step="any" value={vr.base_price}
                            onChange={e => updateVariantRow(i, 'base_price', e.target.value)}
                            aria-label={`${vr.name}: ${t('productPriceHintCost')}`}
                            placeholder={t('productPriceHintCost')}
                            className="px-2 py-1 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          <NumericInput type="number" min={0} step="any" value={vr.sell_price}
                            onChange={e => updateVariantRow(i, 'sell_price', e.target.value)}
                            aria-label={`${vr.name}: ${t('productPriceHintSell')}`}
                            placeholder={t('productPriceHintSell')}
                            className="px-2 py-1 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div className="mt-2">
                          <PriceTierRows compact rows={vr.price_tiers} unitLabel="pcs"
                            onChange={next => setVariantRows(prev => prev.map((r, j) => (j === i ? { ...r, price_tiers: next } : r)))} />
                        </div>
                        {/* Barcode pabrik justru ada di tingkat varian: kode
                            dicetak per kemasan, jadi tiap ukuran punya kodenya
                            sendiri. */}
                        <div className="mt-2 pt-2 border-t border-border">
                          <BarcodeField
                            compact
                            barcodes={vr.barcodes}
                            onChange={next => setVariantBarcodes(i, next)}
                            currentProductId={editProduct?.id}
                          />
                        </div>
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
                {measuredStock && (
                  <WeightUnitPicker label={t('productPricePer')} value={weightUnit}
                    unitName={unitName} onChange={changeWeightUnit} />
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>{t('productCostPrice')}{measuredStock ? ` / ${weightLabel}` : ''}</FieldLabel>
                    <TextInput type="number" value={basePrice} onChange={setBasePrice} placeholder="0"
                      step={measuredStock ? 'any' : undefined} />
                  </div>
                  <div>
                    <FieldLabel>{t('productSellPrice')}{measuredStock ? ` / ${weightLabel}` : ''}</FieldLabel>
                    <TextInput type="number" value={sellPrice} onChange={setSellPrice} placeholder="0"
                      step={measuredStock ? 'any' : undefined} />
                  </div>
                </div>

                <PriceTierRows rows={priceTiers} onChange={setPriceTiers}
                  unitLabel={measuredStock ? weightLabel : 'pcs'} />

                {outlets.length > 1 && (
                  <Toggle
                    checked={perOutletPrice}
                    onChange={setPerOutletPrice}
                    label={t('productPricePerOutlet')}
                    hint={t('productPricePerOutletHint')}
                  />
                )}

                {perOutletPrice && outlets.length > 0 && (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_120px_120px] gap-3 px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>{t('labelOutlet')}</span><span>{t('productPriceHintCost')}</span><span>{t('productPriceHintSell')}</span>
                    </div>
                    {outletPrices
                      .filter(op => selectedOutletIds.includes(op.outlet_id))
                      .map((op) => {
                        const i = outletPrices.findIndex(x => x.outlet_id === op.outlet_id)
                        return (
                          <div key={op.outlet_id} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px_120px] gap-3 px-4 py-3 border-t border-border items-center">
                            <span className="text-sm text-foreground">{op.outlet_name}</span>
                            <label className="min-w-0 space-y-1">
                              <span className="block text-xs text-muted-foreground sm:sr-only">{t('productPriceHintCost')}</span>
                              <NumericInput type="number" min={0} step="any" aria-label={t('productPriceHintCost')} value={op.base_price}
                                onChange={e => updateOutletPrice(i, 'base_price', e.target.value)}
                                placeholder={t('productPriceHintCost')}
                                className="px-2 py-1.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </label>
                            <label className="min-w-0 space-y-1">
                              <span className="block text-xs text-muted-foreground sm:sr-only">{t('productPriceHintSell')}</span>
                              <NumericInput type="number" min={0} step="any" aria-label={t('productPriceHintSell')} value={op.sell_price}
                                onChange={e => updateOutletPrice(i, 'sell_price', e.target.value)}
                                placeholder={t('productPriceHintSell')}
                                className="px-2 py-1.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </label>
                          </div>
                        )
                      })}
                  </div>
                )}
              </>
            )}

            {hasVariant && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
                {t('productVariantPriceHint')}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: Inventori ──────────────────────────────────────────── */}
        {tab === 2 && (
          <div className="space-y-5">
            {!hasVariant && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>SKU</FieldLabel>
                    <div className="flex gap-2">
                      <TextInput value={sku} onChange={setSku} placeholder={t('productSkuHint')} mono />
                      <button type="button" onClick={() => setSku(generateRandomSKU())}
                        title={t('productGenerateSku')}
                        aria-label={t('productGenerateSku')}
                        className="p-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-border rounded-xl transition shrink-0">
                        <RefreshCw size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                <BarcodeField
                  barcodes={barcodes}
                  onChange={setBarcodes}
                  currentProductId={editProduct?.id}
                />

                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div>
                    <FieldLabel>{t('productConsignor')}</FieldLabel>
                    <SelectInput
                      value={consignorId}
                      onChange={v => {
                        setConsignorId(v)
                        if (!v) {
                          setConsignmentDepositPrice('')
                          setConsignmentNotes('')
                        }
                      }}
                      placeholder={t('productConsignorNone')}
                      options={consignors.map(s => ({ value: s.id, label: s.name, hint: s.phone ?? undefined }))}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('productConsignorHint')}
                    </p>
                  </div>
                  {consignorId && (
                    <>
                      <div>
                        <FieldLabel required>{t('productConsignDepositPrice')}</FieldLabel>
                        <TextInput
                          type="number"
                          value={consignmentDepositPrice}
                          onChange={setConsignmentDepositPrice}
                          placeholder="0"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('productConsignDepositHint')}
                        </p>
                      </div>
                      <div>
                        <FieldLabel>{t('productConsignNotes')}</FieldLabel>
                        <textarea
                          rows={2}
                          value={consignmentNotes}
                          onChange={e => setConsignmentNotes(e.target.value)}
                          placeholder={t('productConsignNotesPlaceholder')}
                          className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>
                    </>
                  )}
                </div>

                <Toggle
                  checked={trackStock}
                  onChange={setTrackStock}
                  label={t('productTrackStock')}
                  hint={t('productTrackStockHint')}
                />

                {trackStock && measuredStock && (
                  <WeightUnitPicker label={t('productPricePer')} value={weightUnit}
                    unitName={unitName} onChange={changeWeightUnit} />
                )}

                {trackStock && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>
                        {t('productInitialStock')}{measuredStock ? ` (${weightLabel})` : ''}
                      </FieldLabel>
                      <TextInput
                        type="number"
                        value={globalInitialStock}
                        onChange={setGlobalInitialStock}
                        placeholder="0"
                        step={measuredStock ? 'any' : '1'}
                      />
                    </div>
                    <div>
                      <FieldLabel>
                        {t('productMinStockAlert')}{measuredStock ? ` (${weightLabel})` : ''}
                      </FieldLabel>
                      <TextInput
                        type="number"
                        value={globalMinStock}
                        onChange={setGlobalMinStock}
                        placeholder="0"
                        step={measuredStock ? 'any' : '1'}
                      />
                    </div>
                  </div>
                )}

                {trackStock && outlets.length > 1 && (
                  <Toggle
                    checked={perOutletStock}
                    onChange={v => { setPerOutletStock(v); if (v) { setGlobalInitialStock(''); setGlobalMinStock('') } }}
                    label={t('productStockPerOutlet')}
                    hint={t('productStockPerOutletHint')}
                  />
                )}

                {trackStock && perOutletStock && outlets.length > 0 && (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_110px_110px] gap-3 px-4 py-2 bg-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>{t('labelOutlet')}</span>
                      <span>{t('productInitialStock')}{measuredStock ? ` (${weightLabel})` : ''}</span>
                      <span>{t('productMinStock')}{measuredStock ? ` (${weightLabel})` : ''}</span>
                    </div>
                    {outletStocks
                      .filter(os => selectedOutletIds.includes(os.outlet_id))
                      .map((os) => {
                        const i = outletStocks.findIndex(x => x.outlet_id === os.outlet_id)
                        return (
                          <div key={os.outlet_id} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_110px_110px] gap-3 px-4 py-3 border-t border-border items-center">
                            <span className="text-sm text-foreground">{os.outlet_name}</span>
                            <label className="min-w-0 space-y-1">
                              <span className="block text-xs text-muted-foreground sm:sr-only">{t('productInitialStock')}{measuredStock ? ` (${weightLabel})` : ''}</span>
                              <NumericInput type="number" min={0} step={measuredStock ? 'any' : 1} aria-label={t('productInitialStock')} value={os.initial_stock}
                                onChange={e => updateOutletStock(i, 'initial_stock', e.target.value)}
                                placeholder="0"
                                className="px-2 py-1.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </label>
                            <label className="min-w-0 space-y-1">
                              <span className="block text-xs text-muted-foreground sm:sr-only">{t('productMinStock')}{measuredStock ? ` (${weightLabel})` : ''}</span>
                              <NumericInput type="number" min={0} step={measuredStock ? 'any' : 1} aria-label={t('productMinStock')} value={os.min_stock}
                                onChange={e => updateOutletStock(i, 'min_stock', e.target.value)}
                                placeholder="0"
                                className="px-2 py-1.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </label>
                          </div>
                        )
                      })}
                  </div>
                )}
              </>
            )}

            {hasVariant && (
              <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
                {t('productVariantStockNote', { menu: t('productOutletStock') })}
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
                {t('productSaveBeforeRecipe')}
              </div>
            )}
          </div>
        )}

        {/* ── Tab 4: Lainnya ────────────────────────────────────────────── */}
        {tab === 4 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>{t('productUnit')}</FieldLabel>
                <SelectInput value={unitId} onChange={setUnitId} placeholder={t('pickUnit')}
                  options={units.map(u => ({ value: u.id, label: u.name }))} />
              </div>
              <div>
                <FieldLabel>{t('labelTax')}</FieldLabel>
                <SelectInput value={taxId} onChange={setTaxId} placeholder={t('pickTax')}
                  options={taxes.map(t => ({ value: t.id, label: t.name }))} />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('productKitchen')}</p>
              <Toggle checked={isCookable} onChange={setIsCookable} label={t('productNeedsCooking')}
                hint={t('productNeedsCookingHint')} />
              {/* Berat hanya bisa dikalikan pada SATU harga, sementara produk
                  bervarian menyimpan harganya di tiap varian. */}
              {!hasVariant && (
                <Toggle checked={isWeightBased} onChange={setIsWeightBased} label={t('productWeightBased')}
                  hint={t('productWeightBasedHint')} />
              )}
              {preOrderEnabled && (
                <>
                  <Toggle checked={isPreOrder} onChange={setIsPreOrder} label={t('poProductToggle')}
                    hint={t('poProductToggleHint')} />
                  {isPreOrder && (
                    <div>
                      <FieldLabel>{t('poProductDays')}</FieldLabel>
                      <input
                        type="number"
                        min={0}
                        max={365}
                        inputMode="numeric"
                        value={preOrderDays}
                        onChange={(e) => setPreOrderDays(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {showPharmacyFields && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('pharmSection')}
                </p>

                {/* Pemilih golongan berbentuk deretan, bukan dropdown:
                    jumlahnya hanya enam, dan keputusan ini terlalu penting
                    untuk disembunyikan di balik satu ketukan. "Bukan obat" di
                    depan karena mayoritas isi apotek memang bukan obat. */}
                <div>
                  <p className="text-sm font-medium mb-1">{t('pharmDrugClass')}</p>
                  <p className="text-xs text-muted-foreground mb-2">{t('pharmDrugClassHint')}</p>
                  <div className="flex flex-wrap gap-2">
                    {['', ...DRUG_CLASSES].map(code => {
                      const selected = drugClass === code
                      return (
                        <button
                          key={code || 'none'}
                          type="button"
                          onClick={() => setDrugClass(code)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                            selected
                              ? drugClassAccent(code || null)
                              : 'border-border bg-transparent text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          {code ? t(`drugClass${code}` as never) : t('drugClassNone')}
                        </button>
                      )
                    })}
                  </div>
                  {drugClassRequiresPrescription(drugClass) && (
                    <p className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
                      {t('pharmPrescriptionWarning')}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">{t('pharmActiveIngredient')}</p>
                  <TextInput value={activeIngredient} onChange={setActiveIngredient}
                    placeholder={t('pharmActiveIngredientHint')} />
                  <p className="mt-1 text-xs text-muted-foreground">{t('pharmActiveIngredientHelp')}</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">{t('pharmBpom')}</p>
                  <TextInput value={bpomRegistration} onChange={setBpomRegistration}
                    placeholder={t('pharmBpomHint')} />
                </div>

                {/* Satuan turunan: dibeli per box, dijual per strip. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm font-medium mb-1">{t('pharmPurchaseUnit')}</p>
                    <SelectInput value={purchaseUnitId} onChange={setPurchaseUnitId}
                      placeholder={t('pickUnit')}
                      options={units.map(u => ({ value: u.id, label: u.name }))} />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">{t('pharmUnitsPerPurchase')}</p>
                    <TextInput value={unitsPerPurchase} onChange={setUnitsPerPurchase}
                      placeholder="10" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('labelStatus')}</p>
              <Toggle checked={isActive} onChange={setIsActive} label={t('statusActive')}
                hint={t('productActiveHint')} />
              <Toggle checked={isAvailable} onChange={setIsAvailable} label={t('labelAvailable')}
                hint={t('productAvailableHint2')} />
            </div>
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-4 mt-5 border-t border-border">
          {tab > 0 && (
            <button type="button" onClick={() => setTab(t => t - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition">
              <ChevronDown size={14} className="rotate-90" /> {t('actionPrevious')}
            </button>
          )}
          <div className="hidden sm:block flex-1" />
          {tab < TAB_KEYS.length - 1 ? (
            <button type="button" onClick={() => setTab(t => t + 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">
              {t('actionNextStep')} <ChevronUp size={14} className="rotate-90" />
            </button>
          ) : (
            <>
              <button type="button" onClick={handleClose}
                className="px-4 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition">
                {t('actionCancel')}
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition">
                {loading ? t('saving') : editProduct ? t('actionSaveChanges') : t('productAdd')}
              </button>
            </>
          )}
        </div>
      </Form>
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
