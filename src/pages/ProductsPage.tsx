import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletStore } from '@/store/outletStore'
import { Search, ToggleLeft, ToggleRight, Upload, Plus, Pencil, Trash2, ImagePlus, X, RefreshCw, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import BulkImportModal from '@/components/ui/BulkImportModal'
import { IconProduct } from '@/components/icons/LokaIcons'
import {
  getProducts, setProductActive, setProductAvailable,
  createProduct, updateProduct, deleteProduct,
  createProductAttribute, updateProductAttribute, deleteProductAttribute,
} from '@/api/products'
import { getCategories, getBrands, getUnits, getTaxes } from '@/api/library'
import type { Product, ProductAttribute, Category, Brand, Unit, Tax } from '@/types'
import { formatCurrency, getErrorMessage, generateRandomSKU } from '@/lib/utils'

interface FormState {
  name: string
  sku: string
  description: string
  category_id: string
  brand_id: string
  unit_id: string
  tax_id: string
  base_price: string
  sell_price: string
  track_stock: boolean
  is_active: boolean
  is_available: boolean
  imagePreview: string   // URL (existing) or data URL (new pick)
  imageBase64: string    // base64 to send to backend (empty = no change)
}

const EMPTY_FORM: FormState = {
  name: '', sku: '', description: '',
  category_id: '', brand_id: '', unit_id: '', tax_id: '',
  base_price: '', sell_price: '',
  track_stock: false,
  is_active: true, is_available: true,
  imagePreview: '', imageBase64: '',
}

function productToForm(p: Product): FormState {
  return {
    name: p.name,
    sku: p.sku ?? '',
    description: p.description ?? '',
    category_id: p.category?.id ?? '',
    brand_id: p.brand?.id ?? '',
    unit_id: p.unit?.id ?? '',
    tax_id: p.tax?.id ?? '',
    base_price: p.base_price != null ? String(p.base_price) : '',
    sell_price: p.sell_price != null ? String(p.sell_price) : '',
    track_stock: p.track_stock,
    is_active: p.is_active,
    is_available: p.is_available,
    imagePreview: p.image ?? '',
    imageBase64: '',
  }
}

interface ModifierInput {
  name: string
  price: string
}

const EMPTY_MODIFIER: ModifierInput = { name: '', price: '' }

export default function ProductsPage() {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { selected: activeOutlet } = useOutletStore()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  // Modifier state (only for edit mode)
  const [modifiers, setModifiers] = useState<ProductAttribute[]>([])
  const [modifierInput, setModifierInput] = useState<ModifierInput>(EMPTY_MODIFIER)
  const [editingModifierId, setEditingModifierId] = useState<string | null>(null)
  const [editModifierInput, setEditModifierInput] = useState<ModifierInput>(EMPTY_MODIFIER)

  const { data, isLoading } = useQuery({
    queryKey: ['products', activeOutlet?.id ?? null, { page, limit: 10, search }],
    queryFn: () => getProducts({ page, limit: 10, search: search || undefined }),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories-selector'],
    queryFn: () => getCategories({ limit: 100, page: 1 }),
    staleTime: 60_000,
  })
  const { data: brandsData } = useQuery({
    queryKey: ['brands-selector'],
    queryFn: () => getBrands({ limit: 100, page: 1 }),
    staleTime: 60_000,
  })
  const { data: unitsData } = useQuery({
    queryKey: ['units-selector'],
    queryFn: () => getUnits({ limit: 100, page: 1 }),
    staleTime: 60_000,
  })
  const { data: taxesData } = useQuery({
    queryKey: ['taxes-selector'],
    queryFn: () => getTaxes({ limit: 100, page: 1 }),
    staleTime: 60_000,
  })

  const categories: Category[] = categoriesData?.data?.data ?? []
  const brands: Brand[] = brandsData?.data?.data ?? []
  const units: Unit[] = unitsData?.data?.data ?? []
  const taxes: Tax[] = taxesData?.data?.data ?? []

  const activeMut = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => setProductActive(id, val),
    onSuccess: () => { toast.success('Status Produk Diperbarui'); qc.invalidateQueries({ queryKey: ['products'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const availMut = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => setProductAvailable(id, val),
    onSuccess: () => { toast.success('Ketersediaan Produk Diperbarui'); qc.invalidateQueries({ queryKey: ['products'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      // Scale down to max 1200px on the longest side
      const MAX_PX = 1200
      let { width, height } = img
      if (width > MAX_PX || height > MAX_PX) {
        if (width >= height) { height = Math.round((height / width) * MAX_PX); width = MAX_PX }
        else { width = Math.round((width / height) * MAX_PX); height = MAX_PX }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)

      // Iteratively lower quality until base64 fits within 2 MB
      const MAX_BYTES = 2 * 1024 * 1024
      let quality = 0.85
      let dataUrl = canvas.toDataURL('image/jpeg', quality)
      while (dataUrl.length * 0.75 > MAX_BYTES && quality > 0.1) {
        quality -= 0.05
        dataUrl = canvas.toDataURL('image/jpeg', quality)
      }

      const base64 = dataUrl.split(',')[1]
      setForm(prev => ({ ...prev, imagePreview: dataUrl, imageBase64: base64 }))
    }

    img.src = objectUrl
    e.target.value = ''
  }

  const createMut = useMutation({
    mutationFn: () => createProduct({
      name: form.name,
      sku: form.sku || undefined,
      description: form.description || undefined,
      base_price: form.base_price ? Number(form.base_price) : undefined,
      sell_price: form.sell_price ? Number(form.sell_price) : undefined,
      category_id: form.category_id || undefined,
      brand_id: form.brand_id || undefined,
      unit_id: form.unit_id || undefined,
      track_stock: form.track_stock,
      image: form.imageBase64 || undefined,
      is_active: true,
      is_available: true,
    }),
    onSuccess: () => {
      toast.success('Produk Berhasil Dibuat')
      qc.invalidateQueries({ queryKey: ['products'] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateProduct(editProduct!.id, {
      name: form.name,
      sku: form.sku || null,
      description: form.description || null,
      base_price: form.base_price ? Number(form.base_price) : null,
      sell_price: form.sell_price ? Number(form.sell_price) : null,
      category_id: form.category_id || null,
      brand_id: form.brand_id || null,
      unit_id: form.unit_id || null,
      tax_id: form.tax_id || null,
      track_stock: form.track_stock,
      is_active: form.is_active,
      is_available: form.is_available,
      image: form.imageBase64 || null,
    }),
    onSuccess: () => {
      toast.success('Produk Berhasil Diperbarui')
      qc.invalidateQueries({ queryKey: ['products'] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => { toast.success('Produk Dihapus'); qc.invalidateQueries({ queryKey: ['products'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const addModifierMut = useMutation({
    mutationFn: ({ productId, data }: { productId: string; data: { name: string; price: number } }) =>
      createProductAttribute(productId, { ...data, is_active: true, is_available: true }),
    onSuccess: (res) => {
      const attr = res.data?.data as ProductAttribute
      if (attr) setModifiers(prev => [...prev, attr])
      setModifierInput(EMPTY_MODIFIER)
      toast.success('Modifier Ditambahkan')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateModifierMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; price: number } }) =>
      updateProductAttribute(id, { ...data, is_active: true, is_available: true }),
    onSuccess: (res, { id }) => {
      const attr = res.data?.data as ProductAttribute
      setModifiers(prev => prev.map(m => m.id === id ? (attr ?? m) : m))
      setEditingModifierId(null)
      toast.success('Modifier Diperbarui')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteModifierMut = useMutation({
    mutationFn: (id: string) => deleteProductAttribute(id),
    onSuccess: (_, id) => {
      setModifiers(prev => prev.filter(m => m.id !== id))
      toast.success('Modifier Dihapus')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditProduct(null); setForm({ ...EMPTY_FORM, sku: generateRandomSKU() }); setShowForm(true) }
  const openEdit = (p: Product) => {
    setEditProduct(p)
    setForm(productToForm(p))
    setModifiers(p.attributes ?? [])
    setModifierInput(EMPTY_MODIFIER)
    setEditingModifierId(null)
    setShowForm(true)
  }
  const closeForm = () => {
    setShowForm(false)
    setEditProduct(null)
    setForm(EMPTY_FORM)
    setModifiers([])
    setModifierInput(EMPTY_MODIFIER)
    setEditingModifierId(null)
  }

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Nama Produk Harus Diisi'); return }
    editProduct ? updateMut.mutate() : createMut.mutate()
  }

  const handleDelete = (p: Product) => {
    if (!confirm(`Hapus produk "${p.name}"?`)) return
    deleteMut.mutate(p.id)
  }

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const products = data?.data?.data ?? []
  const pagination = data?.data?.pagination
  const isPending = createMut.isPending || updateMut.isPending

  const columns = [
    {
      key: 'name',
      label: 'Produk',
      render: (row: Product) => (
        <div className="flex items-center gap-3">
          {row.image ? (
            <img src={row.image} className="w-8 h-8 rounded-lg object-cover" alt="" />
          ) : (
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <IconProduct size={14} className="text-gray-400" />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 capitalize">{row.name}</p>
            <p className="text-xs text-gray-400">{row.sku || '-'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'sell_price',
      label: 'Harga',
      render: (row: Product) => (
        <span className="font-semibold text-gray-900">
          {row.has_variant ? 'Varian' : formatCurrency(row.sell_price ?? 0)}
        </span>
      ),
    },
    {
      key: 'category',
      label: 'Kategori',
      render: (row: Product) => (
        <span className="text-sm text-gray-500 capitalize">{row.category?.name || '-'}</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Aktif',
      render: (row: Product) => (
        <button
          onClick={(e) => { e.stopPropagation(); activeMut.mutate({ id: row.id, val: !row.is_active }) }}
          className={`transition ${row.is_active ? 'text-green-500' : 'text-gray-300'} hover:scale-110`}
        >
          {row.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
        </button>
      ),
    },
    {
      key: 'is_available',
      label: 'Tersedia',
      render: (row: Product) => (
        <button
          onClick={(e) => { e.stopPropagation(); availMut.mutate({ id: row.id, val: !row.is_available }) }}
          className={`transition ${row.is_available ? 'text-blue-500' : 'text-gray-300'} hover:scale-110`}
        >
          {row.is_available ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
        </button>
      ),
    },
    {
      key: 'has_variant',
      label: 'Varian',
      render: (row: Product) => (
        row.has_variant ? <Badge variant="purple">Ya</Badge> : <Badge variant="gray">Tidak</Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row: Product) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row) }}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDelete(row) }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Produk" subtitle="Kelola Produk dan Ketersediaannya" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari Produk..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <p className="text-sm text-gray-500 shrink-0">
                Total: <span className="font-semibold text-gray-900">{pagination?.total ?? 0}</span>
              </p>
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition shrink-0"
              >
                <Upload size={14} />
                Import CSV
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0"
              >
                <Plus size={14} />
                Tambah Produk
              </button>
            </div>
          </div>
          <DataTable columns={columns as never[]} data={products as never[]} loading={isLoading} />
          <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
        </div>
      </div>

      {/* Product Form Modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editProduct ? 'Edit Produk' : 'Tambah Produk'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Gambar Produk */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Gambar Produk</p>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition overflow-hidden shrink-0"
              >
                {form.imagePreview ? (
                  <img src={form.imagePreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-400">
                    <ImagePlus size={22} />
                    <span className="text-xs">Pilih foto</span>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <p>Klik kotak untuk memilih gambar</p>
                <p>Format: JPG, PNG, WEBP</p>
                <p>Maks. 2MB</p>
                {form.imagePreview && (
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, imagePreview: '', imageBase64: '' }))}
                    className="flex items-center gap-1 text-red-400 hover:text-red-600 transition mt-1"
                  >
                    <X size={12} /> Hapus gambar
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImagePick}
            />
          </div>

          {/* Info Dasar */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Info Dasar</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nama Produk <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Contoh: Nasi Goreng Spesial"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => set('sku', e.target.value)}
                    placeholder="Kode Unik Produk / Scan Barcode"
                    className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => set('sku', generateRandomSKU())}
                    title="Buat SKU baru"
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-xl transition shrink-0"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Satuan (Unit)</label>
                <select
                  value={form.unit_id}
                  onChange={(e) => set('unit_id', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
                >
                  <option value="">— Pilih Satuan —</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Deskripsi Singkat Produk..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Harga */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Harga</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Harga Modal</label>
                <input
                  type="number"
                  min={0}
                  value={form.base_price}
                  onChange={(e) => set('base_price', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Harga Jual</label>
                <input
                  type="number"
                  min={0}
                  value={form.sell_price}
                  onChange={(e) => set('sell_price', e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Kategori & Relasi */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Kategori & Relasi</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={form.category_id}
                  onChange={(e) => set('category_id', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
                >
                  <option value="">— Pilih Kategori —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
                <select
                  value={form.brand_id}
                  onChange={(e) => set('brand_id', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
                >
                  <option value="">— Pilih Brand —</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pajak</label>
                <select
                  value={form.tax_id}
                  onChange={(e) => set('tax_id', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
                >
                  <option value="">— Pilih Pajak —</option>
                  {taxes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Lacak Stok */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Stok</p>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.track_stock}
                onChange={(e) => set('track_stock', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm text-gray-700">Lacak Stok Fisik</span>
                <p className="text-xs text-gray-400">
                  {form.track_stock
                    ? 'Transaksi akan memotong kuantitas stok di gudang'
                    : 'Kuantitas diabaikan — cocok untuk jasa atau bahan tak terbatas'}
                </p>
              </div>
            </label>
          </div>

          {/* Status (hanya saat edit) */}
          {editProduct && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Status</p>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => set('is_active', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm text-gray-700">Aktif</span>
                    <p className="text-xs text-gray-400">Produk tampil di katalog kasir</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={(e) => set('is_available', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm text-gray-700">Tersedia</span>
                    <p className="text-xs text-gray-400">Kill switch operasional — nonaktifkan sementara tanpa hapus produk</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Modifiers — hanya saat edit */}
          {editProduct && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Modifiers / Add-ons
              </p>
              <p className="text-xs text-gray-400 mb-3">
                Pilihan tambahan yang bisa dipilih pembeli saat memesan (contoh: Ekstra Keju, Less Ice, Level Pedas).
              </p>

              {/* List existing modifiers */}
              <div className="space-y-2 mb-3">
                {modifiers.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                    {editingModifierId === m.id ? (
                      <>
                        <input
                          type="text"
                          value={editModifierInput.name}
                          onChange={(e) => setEditModifierInput(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nama Modifier"
                          className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          min={0}
                          value={editModifierInput.price}
                          onChange={(e) => setEditModifierInput(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="Harga"
                          className="w-28 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!editModifierInput.name.trim()) return
                            updateModifierMut.mutate({
                              id: m.id,
                              data: { name: editModifierInput.name, price: Number(editModifierInput.price) || 0 },
                            })
                          }}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingModifierId(null)}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium text-gray-700">{m.name}</span>
                        <span className="text-sm text-gray-500 w-28 text-right">
                          {m.price > 0 ? `+${formatCurrency(m.price)}` : 'Gratis'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingModifierId(m.id)
                            setEditModifierInput({ name: m.name, price: String(m.price) })
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { if (confirm(`Hapus modifier "${m.name}"?`)) deleteModifierMut.mutate(m.id) }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new modifier */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={modifierInput.name}
                  onChange={(e) => setModifierInput(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nama Modifier Baru..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  min={0}
                  value={modifierInput.price}
                  onChange={(e) => setModifierInput(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="Harga Tambahan"
                  className="w-32 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  disabled={!modifierInput.name.trim() || addModifierMut.isPending}
                  onClick={() => {
                    if (!modifierInput.name.trim()) return
                    addModifierMut.mutate({
                      productId: editProduct.id,
                      data: { name: modifierInput.name, price: Number(modifierInput.price) || 0 },
                    })
                  }}
                  className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {isPending ? 'Menyimpan...' : editProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
            </button>
          </div>
        </form>
      </Modal>

      {showImport && (
        <BulkImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['products'] })
            toast.success('Produk Berhasil Diimport!')
          }}
        />
      )}
    </div>
  )
}
