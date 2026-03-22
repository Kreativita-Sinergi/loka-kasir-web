import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, ToggleLeft, ToggleRight, GitBranch, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Badge from '@/components/ui/Badge'
import { getOutletStocks, updateProductAvailability } from '@/api/stock'
import { useOutletStore } from '@/store/outletStore'
import { IconProduct } from '@/components/icons/LokaIcons'
import type { OutletStock } from '@/types'
import { getErrorMessage } from '@/lib/utils'

export default function StockCurrentPage() {
  const qc = useQueryClient()
  const { selected: activeOutlet } = useOutletStore()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['outlet-stocks', activeOutlet?.id],
    queryFn: () => getOutletStocks(activeOutlet!.id),
    enabled: !!activeOutlet?.id,
  })

  const availMut = useMutation({
    mutationFn: ({ productId, isAvailable }: { productId: string; isAvailable: boolean }) =>
      updateProductAvailability(productId, isAvailable),
    onSuccess: (_, { isAvailable }) => {
      toast.success(isAvailable ? 'Produk ditandai tersedia' : 'Produk ditandai tidak tersedia')
      qc.invalidateQueries({ queryKey: ['outlet-stocks', activeOutlet?.id] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const allStocks: OutletStock[] = data?.data?.data ?? []

  const stocks = search.trim()
    ? allStocks.filter(s => {
        const q = search.toLowerCase()
        return (
          s.product?.name?.toLowerCase().includes(q) ||
          s.product?.sku?.toLowerCase().includes(q)
        )
      })
    : allStocks

  const columns = [
    {
      key: 'product',
      label: 'Produk',
      render: (row: OutletStock) => (
        <div className="flex items-center gap-3">
          {row.product?.image ? (
            <img src={row.product.image} className="w-8 h-8 rounded-lg object-cover shrink-0" alt="" />
          ) : (
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
              <IconProduct size={14} className="text-gray-400" />
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900 capitalize">{row.product?.name ?? '—'}</p>
            <p className="text-xs text-gray-400 font-mono">{row.product?.sku ?? '-'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Kategori',
      render: (row: OutletStock) => (
        <span className="text-sm text-gray-500">{row.product?.category?.name ?? <span className="text-gray-300">—</span>}</span>
      ),
    },
    {
      key: 'track_stock',
      label: 'Lacak Stok',
      render: (row: OutletStock) => (
        row.product?.track_stock
          ? <Badge variant="blue">Dilacak</Badge>
          : <Badge variant="gray">Tidak Dilacak</Badge>
      ),
    },
    {
      key: 'quantity',
      label: 'Kuantitas',
      render: (row: OutletStock) => (
        row.product?.track_stock
          ? (
            <span className={`font-semibold tabular-nums ${row.quantity === 0 ? 'text-red-500' : 'text-gray-900'}`}>
              {row.quantity}
            </span>
          )
          : <span className="text-gray-400 text-sm">∞</span>
      ),
    },
    {
      key: 'is_available',
      label: 'Tersedia',
      render: (row: OutletStock) => {
        if (!row.product) return null
        const pending = availMut.isPending && availMut.variables?.productId === row.product_id
        const isAvailable = row.product.is_available
        return (
          <button
            disabled={pending}
            onClick={() => availMut.mutate({ productId: row.product_id, isAvailable: !isAvailable })}
            className={`transition ${isAvailable ? 'text-blue-500' : 'text-gray-300'} hover:scale-110 disabled:opacity-50`}
            title={isAvailable ? 'Tandai tidak tersedia' : 'Tandai tersedia'}
          >
            {isAvailable ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
          </button>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Stok Saat Ini" subtitle="Kuantitas stok dan ketersediaan produk per outlet aktif" />
      <div className="flex-1 overflow-y-auto p-6">

        {/* Global-availability warning banner */}
        <div className="flex items-start gap-3 mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>
            Toggle <span className="font-semibold">Tersedia</span> bersifat global — perubahan berlaku di semua outlet sekaligus,
            bukan hanya outlet yang dipilih saat ini.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">

            {/* Outlet indicator */}
            <div className="flex items-center gap-2 text-sm text-gray-500 shrink-0">
              <GitBranch size={14} className="text-gray-400" />
              {activeOutlet
                ? <span className="font-medium text-gray-800">{activeOutlet.name}</span>
                : <span className="text-gray-400">Belum ada outlet dipilih</span>
              }
            </div>

            {activeOutlet && (
              <>
                <div className="relative flex-1 max-w-xs ml-auto">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari produk atau SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-sm text-gray-500 shrink-0">
                  Total: <span className="font-semibold text-gray-900">{allStocks.length}</span>
                </p>
              </>
            )}
          </div>

          {!activeOutlet ? (
            <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
              <GitBranch size={32} className="text-gray-200" />
              <p className="text-sm font-medium">Silakan pilih outlet terlebih dahulu</p>
              <p className="text-xs text-gray-300">Gunakan dropdown outlet di sidebar kiri</p>
            </div>
          ) : (
            <DataTable
              columns={columns as never[]}
              data={stocks as never[]}
              loading={isLoading}
              emptyMessage="Belum ada stok untuk outlet ini"
            />
          )}
        </div>
      </div>
    </div>
  )
}
