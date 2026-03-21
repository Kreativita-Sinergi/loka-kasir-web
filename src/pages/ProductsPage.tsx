import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, ToggleLeft, ToggleRight, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import BulkImportModal from '@/components/ui/BulkImportModal'
import { IconProduct } from '@/components/icons/LokaIcons'
import { getProducts, setProductActive, setProductAvailable } from '@/api/products'
import type { Product } from '@/types'
import { formatCurrency, getErrorMessage } from '@/lib/utils'

export default function ProductsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['products', { page, limit: 10, search }],
    queryFn: () => getProducts({ page, limit: 10, search: search || undefined }),
  })

  const activeMut = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => setProductActive(id, val),
    onSuccess: () => { toast.success('Status produk diperbarui'); qc.invalidateQueries({ queryKey: ['products'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const availMut = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => setProductAvailable(id, val),
    onSuccess: () => { toast.success('Ketersediaan produk diperbarui'); qc.invalidateQueries({ queryKey: ['products'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const products = data?.data?.data?.data ?? []
  const pagination = data?.data?.data?.pagination

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
      key: 'stock',
      label: 'Stok',
      render: (row: Product) => (
        <span className="text-sm text-gray-700">
          {row.track_stock ? (row.stock ?? 0) : <span className="text-gray-400">—</span>}
        </span>
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
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Produk" subtitle="Kelola produk dan ketersediaannya" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari produk..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shrink-0"
            >
              <Upload size={14} />
              Import CSV
            </button>
            <p className="text-sm text-gray-500 shrink-0">
              Total: <span className="font-semibold text-gray-900">{pagination?.total ?? 0}</span>
            </p>
          </div>
          <DataTable columns={columns as never[]} data={products as never[]} loading={isLoading} />
          <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
        </div>
      </div>

      {showImport && (
        <BulkImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['products'] })
            toast.success('Produk berhasil diimport!')
          }}
        />
      )}
    </div>
  )
}
