import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { getBusinessOpex, upsertBusinessOpex } from '@/api/businessOpex'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import type { BusinessOpex } from '@/types'

// ─── Form component receives initial values as props ────────────────────────
// Using key={opex?.id} on this component forces a remount when server data
// arrives, so useState initializers run exactly once with the real values.

function OpexForm({ initialOpex }: { initialOpex?: BusinessOpex }) {
  const qc = useQueryClient()
  const [fixedCosts, setFixedCosts] = useState(String(initialOpex?.monthly_fixed_costs ?? 0))
  const [salesVolume, setSalesVolume] = useState(String(initialOpex?.target_sales_volume ?? 1))
  const [margin, setMargin] = useState(String(initialOpex?.default_margin ?? 20))

  const saveMut = useMutation({
    mutationFn: () =>
      upsertBusinessOpex({
        monthly_fixed_costs: parseFloat(fixedCosts) || 0,
        target_sales_volume: parseInt(salesVolume) || 1,
        default_margin: parseFloat(margin) || 20,
      }),
    onSuccess: () => {
      toast.success('Pengaturan keuangan berhasil disimpan')
      qc.invalidateQueries({ queryKey: ['business-opex'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const overheadPreview = (parseFloat(fixedCosts) || 0) / (parseInt(salesVolume) || 1)

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Total Biaya Tetap Bulanan (Rp)
        </label>
        <input
          type="number"
          min="0"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Contoh: 5000000"
          value={fixedCosts}
          onChange={e => setFixedCosts(e.target.value)}
        />
        <p className="text-xs text-gray-400 mt-1">Contoh: sewa tempat + gaji tetap + utilitas + biaya admin</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Volume Penjualan per Bulan (item)
        </label>
        <input
          type="number"
          min="1"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Contoh: 500"
          value={salesVolume}
          onChange={e => setSalesVolume(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Margin Default (%)
        </label>
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Contoh: 30"
          value={margin}
          onChange={e => setMargin(e.target.value)}
        />
      </div>

      {/* Live overhead preview */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Pratinjau Overhead</p>
        <p className="text-sm text-gray-700">
          Overhead per item:{' '}
          <span className="font-bold text-blue-700">{formatCurrency(overheadPreview)}</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          = Biaya Tetap ({formatCurrency(parseFloat(fixedCosts) || 0)}) ÷ Target ({parseInt(salesVolume) || 1} item)
        </p>
      </div>

      <button
        onClick={() => saveMut.mutate()}
        disabled={saveMut.isPending}
        className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {saveMut.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
      </button>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FinanceSettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['business-opex'],
    queryFn: getBusinessOpex,
  })

  const opex = data?.data?.data

  return (
    <>
      <Header title="Pengaturan Keuangan" />

      <div className="p-6 max-w-xl">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">Biaya Operasional (OPEX)</h2>
          <p className="text-sm text-gray-500 mb-6">
            Isi biaya tetap bulanan dan target penjualan untuk menghitung overhead per produk yang digunakan
            dalam rekomendasi harga.
          </p>

          {isLoading ? (
            <div className="text-sm text-gray-400">Memuat...</div>
          ) : (
            // key forces OpexForm to remount with correct initialValues once opex loads
            <OpexForm key={opex?.id ?? 'new'} initialOpex={opex} />
          )}
        </div>
      </div>
    </>
  )
}
