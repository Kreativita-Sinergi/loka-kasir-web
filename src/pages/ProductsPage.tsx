import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletStore } from '@/store/outletStore'
import { useAuthStore } from '@/store/authStore'
import { Search, ToggleLeft, ToggleRight, Upload, Plus, Pencil, Trash2, Barcode } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import BulkImportModal from '@/components/ui/BulkImportModal'
import ProductFormModal from '@/components/products/ProductFormModal'
import BarcodePrintModal from '@/components/products/BarcodePrintModal'
import { IconProduct } from '@/components/icons/LokaIcons'
import {
  getProducts, setProductActive, setProductAvailable, deleteProduct,
} from '@/api/products'
import { getCategories, getBrands, getUnits, getTaxes } from '@/api/library'
import { getMyOutlets } from '@/api/outlets'
import type { Product, Category, Brand, Unit, Tax, Outlet } from '@/types'
import { formatCurrency, getErrorMessage } from '@/lib/utils'

export default function ProductsPage() {
  const qc = useQueryClient()
  const { selected: activeOutlet } = useOutletStore()
  const user = useAuthStore(s => s.user)
  const businessId = user?.business?.id ?? ''

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBarcodeModal, setShowBarcodeModal] = useState(false)

  // ── Data queries ──────────────────────────────────────────────────────────
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
  const { data: outletsData } = useQuery({
    queryKey: ['my-outlets'],
    queryFn: () => getMyOutlets(),
    staleTime: 60_000,
    enabled: !!businessId,
  })

  const categories: Category[] = categoriesData?.data?.data ?? []
  const brands: Brand[]         = brandsData?.data?.data ?? []
  const units: Unit[]           = unitsData?.data?.data ?? []
  const taxes: Tax[]            = taxesData?.data?.data ?? []
  const outlets: Outlet[]       = outletsData?.data?.data ?? []

  // ── Mutations ─────────────────────────────────────────────────────────────
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

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => { toast.success('Produk Dihapus'); qc.invalidateQueries({ queryKey: ['products'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const handleDelete = (p: Product) => {
    if (!confirm(`Hapus produk "${p.name}"?`)) return
    deleteMut.mutate(p.id)
  }

  const products    = data?.data?.data ?? []
  const pagination  = data?.data?.pagination

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length && products.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(products.map((p: Product) => p.id)))
    }
  }

  const selectedProducts = products.filter((p: Product) => selectedIds.has(p.id))

  const columns = [
    {
      key: 'select',
      label: (
        <input
          type="checkbox"
          checked={products.length > 0 && selectedIds.size === products.length}
          onChange={toggleSelectAll}
          className="rounded"
        />
      ),
      render: (row: Product) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.id)}
          onChange={(e) => { e.stopPropagation(); toggleSelect(row.id) }}
          onClick={(e) => e.stopPropagation()}
          className="rounded"
        />
      ),
    },
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
            onClick={(e) => { e.stopPropagation(); setSelectedIds(new Set([row.id])); setShowBarcodeModal(true) }}
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
            title="Cetak Barcode"
          >
            <Barcode size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setEditProduct(row); setShowForm(true) }}
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
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setShowBarcodeModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition shrink-0"
                >
                  <Barcode size={14} />
                  Cetak Barcode ({selectedIds.size})
                </button>
              )}
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition shrink-0"
              >
                <Upload size={14} />
                Import CSV
              </button>
              <button
                onClick={() => { setEditProduct(null); setShowForm(true) }}
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

      <ProductFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditProduct(null) }}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['products'] })}
        editProduct={editProduct}
        businessId={businessId}
        categories={categories}
        brands={brands}
        units={units}
        taxes={taxes}
        outlets={outlets}
      />

      {showImport && (
        <BulkImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['products'] })
            toast.success('Produk Berhasil Diimport!')
          }}
        />
      )}

      {showBarcodeModal && selectedProducts.length > 0 && (
        <BarcodePrintModal
          products={selectedProducts}
          onClose={() => { setShowBarcodeModal(false); setSelectedIds(new Set()) }}
        />
      )}
    </div>
  )
}
