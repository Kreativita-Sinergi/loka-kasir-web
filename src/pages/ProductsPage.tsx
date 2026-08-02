import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOutletStore } from '@/store/outletStore'
import { useAuthStore } from '@/store/authStore'
import { Search, ToggleLeft, ToggleRight, Upload, Plus, Barcode, Trash2 } from 'lucide-react'
import { ActionButton, EditButton, DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import EmptyState from '@/components/ui/EmptyState'
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

  // Data referensi untuk selector form. Limit dinaikkan + diurut nama agar daftar
  // tidak terpotong diam-diam pada bisnis besar (selector kini searchable).
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-selector'],
    queryFn: () => getCategories({ limit: 500, page: 1, sort_by: 'name', order_by: 'asc' }),
    staleTime: 60_000,
  })
  const { data: brandsData } = useQuery({
    queryKey: ['brands-selector'],
    queryFn: () => getBrands({ limit: 500, page: 1, sort_by: 'name', order_by: 'asc' }),
    staleTime: 60_000,
  })
  const { data: unitsData } = useQuery({
    queryKey: ['units-selector'],
    queryFn: () => getUnits({ limit: 500, page: 1, sort_by: 'name', order_by: 'asc' }),
    staleTime: 60_000,
  })
  const { data: taxesData } = useQuery({
    queryKey: ['taxes-selector'],
    queryFn: () => getTaxes({ limit: 500, page: 1, sort_by: 'name', order_by: 'asc' }),
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

  // ── Aksi massal (bulk) ─────────────────────────────────────────────────────
  const bulkActiveMut = useMutation({
    mutationFn: async ({ ids, val }: { ids: string[]; val: boolean }) => {
      await Promise.all(ids.map((id) => setProductActive(id, val)))
    },
    onSuccess: (_d, vars) => {
      toast.success(`${vars.ids.length} produk ${vars.val ? 'diaktifkan' : 'dinonaktifkan'}`)
      qc.invalidateQueries({ queryKey: ['products'] })
      setSelectedIds(new Set())
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => deleteProduct(id)))
    },
    onSuccess: (_d, ids) => {
      toast.success(`${ids.length} produk dihapus`)
      qc.invalidateQueries({ queryKey: ['products'] })
      setSelectedIds(new Set())
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const bulkBusy = bulkActiveMut.isPending || bulkDeleteMut.isPending

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    if (!confirm(`Hapus ${ids.length} produk terpilih? Tindakan ini tidak bisa dibatalkan.`)) return
    bulkDeleteMut.mutate(ids)
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
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
              <IconProduct size={14} className="text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-medium text-foreground capitalize">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.sku || '-'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'sell_price',
      label: 'Harga',
      render: (row: Product) => (
        <span className="font-semibold text-foreground">
          {row.has_variant ? 'Varian' : formatCurrency(row.sell_price ?? 0)}
        </span>
      ),
    },
    {
      key: 'category',
      label: 'Kategori',
      render: (row: Product) => (
        <span className="text-sm text-muted-foreground capitalize">{row.category?.name || '-'}</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Aktif',
      render: (row: Product) => (
        <button
          onClick={(e) => { e.stopPropagation(); activeMut.mutate({ id: row.id, val: !row.is_active }) }}
          className={`transition ${row.is_active ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground'} hover:scale-110`}
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
          className={`transition ${row.is_available ? 'text-blue-500 dark:text-blue-400' : 'text-muted-foreground'} hover:scale-110`}
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
        <div className="flex items-center gap-1" data-tour="row-actions">
          <ActionButton
            onClick={() => { setSelectedIds(new Set([row.id])); setShowBarcodeModal(true) }}
          >
            Barcode
          </ActionButton>
          <EditButton onClick={() => { setEditProduct(row); setShowForm(true) }} />
          <DeleteButton onClick={() => handleDelete(row)} />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Daftar Produk" subtitle="Atur nama, harga, varian, stok, dan ketersediaan produk" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs" data-tour="product-search">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari Produk..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <p className="text-sm text-muted-foreground shrink-0">
                Total: <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span>
              </p>
              {selectedIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-2 py-1.5">
                  <span className="px-1 text-sm font-semibold text-foreground">
                    {selectedIds.size} dipilih
                  </span>
                  <button
                    onClick={() => bulkActiveMut.mutate({ ids: Array.from(selectedIds), val: true })}
                    disabled={bulkBusy}
                    className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    <ToggleRight size={14} />
                    Aktifkan
                  </button>
                  <button
                    onClick={() => bulkActiveMut.mutate({ ids: Array.from(selectedIds), val: false })}
                    disabled={bulkBusy}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-muted disabled:opacity-50"
                  >
                    <ToggleLeft size={14} />
                    Nonaktifkan
                  </button>
                  <button
                    onClick={() => setShowBarcodeModal(true)}
                    disabled={bulkBusy}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Barcode size={14} />
                    Barcode
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkBusy}
                    className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Hapus
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    disabled={bulkBusy}
                    className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  >
                    Batal
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowImport(true)}
                data-tour="product-import"
                className="flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition shrink-0"
              >
                <Upload size={14} />
                Impor dari CSV
              </button>
              <button
                onClick={() => { setEditProduct(null); setShowForm(true) }}
                data-tour="product-add"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0"
              >
                <Plus size={14} />
                Tambah Produk
              </button>
            </div>
          </div>
          <DataTable
            columns={columns as never[]}
            data={products as never[]}
            loading={isLoading}
            emptySlot={
              <EmptyState
                title="Belum ada produk"
                description="Tambahkan produk pertama agar dapat dijual melalui aplikasi kasir. Tambahkan satu per satu atau unggah banyak produk dari file CSV."
                action={{ label: 'Tambah Produk', icon: <Plus size={14} />, onClick: () => { setEditProduct(null); setShowForm(true) } }}
                hint="Tip: gunakan tombol “Impor dari CSV” di atas untuk menambahkan banyak produk sekaligus."
              />
            }
          />
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
