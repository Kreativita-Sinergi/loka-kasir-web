import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calculator, DollarSign, Target, TrendingUp, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { getBusinessOpex, upsertBusinessOpex } from '@/api/businessOpex'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import type { BusinessOpex } from '@/types'

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

  const fixedCostsNum = parseFloat(fixedCosts) || 0
  const salesVolumeNum = parseInt(salesVolume) || 1
  const marginNum = parseFloat(margin) || 0

  const overheadPerItem = fixedCostsNum / salesVolumeNum
  // Example: a product with HPP bahan = 10.000
  const exampleHPP = 10_000
  const exampleCOGS = exampleHPP + overheadPerItem
  const examplePrice = Math.round(exampleCOGS * (1 + marginNum / 100) / 100) * 100

  return (
    <div className="space-y-6">
      {/* Fields */}
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1.5">
              <DollarSign size={14} className="text-gray-400" />
              Total Biaya Tetap Bulanan (Rp)
            </span>
          </label>
          <input
            type="number"
            min="0"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Contoh: 5000000"
            value={fixedCosts}
            onChange={e => setFixedCosts(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Sewa tempat + gaji tetap + utilitas + biaya admin per bulan</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1.5">
              <Target size={14} className="text-gray-400" />
              Target Volume Penjualan per Bulan (item)
            </span>
          </label>
          <input
            type="number"
            min="1"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Contoh: 500"
            value={salesVolume}
            onChange={e => setSalesVolume(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">Estimasi total item terjual per bulan di semua produk</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-gray-400" />
              Target Margin Default (%)
            </span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              className="flex-1 accent-blue-600"
              value={margin}
              onChange={e => setMargin(e.target.value)}
            />
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                className="w-16 px-2 py-2 text-sm text-center focus:outline-none"
                value={margin}
                onChange={e => setMargin(e.target.value)}
              />
              <span className="px-2 py-2 text-sm text-gray-400 bg-gray-50 border-l border-gray-200">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live formula breakdown */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 space-y-3">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
          <Calculator size={13} /> Simulasi Harga (HPP Bahan = {formatCurrency(exampleHPP)})
        </p>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-gray-600">
            <span>HPP Bahan Baku</span>
            <span className="font-semibold">{formatCurrency(exampleHPP)}</span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>
              Overhead/item ({formatCurrency(fixedCostsNum)} ÷ {salesVolumeNum.toLocaleString('id-ID')})
            </span>
            <span className="font-semibold">{formatCurrency(overheadPerItem)}</span>
          </div>
          <div className="border-t border-blue-200 pt-2 flex items-center justify-between text-gray-700">
            <span className="font-medium">Total COGS</span>
            <span className="font-bold">{formatCurrency(exampleCOGS)}</span>
          </div>
          <div className="flex items-center justify-between text-gray-600">
            <span>Margin {marginNum}%</span>
            <span className="font-semibold">+{formatCurrency(exampleCOGS * marginNum / 100)}</span>
          </div>
          <div className="bg-blue-100 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="font-semibold text-blue-700 flex items-center gap-1">
              <ArrowRight size={12} /> Saran Harga Jual
            </span>
            <span className="font-bold text-blue-700 text-base">{formatCurrency(examplePrice)}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => saveMut.mutate()}
        disabled={saveMut.isPending}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {saveMut.isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}
      </button>
    </div>
  )
}

export default function FinanceSettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['business-opex'],
    queryFn: getBusinessOpex,
  })

  const opex = data?.data?.data

  return (
    <>
      <Header title="Pengaturan Keuangan" />

      <div className="p-6">
        <div className="max-w-2xl space-y-5">
          {/* Page description */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Calculator size={18} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Biaya Operasional (OPEX)</h2>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Konfigurasi biaya tetap bulanan dan target penjualan. Data ini digunakan untuk menghitung
                  overhead per produk dan menghasilkan <strong>saran harga jual otomatis</strong> yang
                  sudah memperhitungkan HPP bahan + overhead + margin target.
                </p>
              </div>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-40" />
                    <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <OpexForm key={opex?.id ?? 'new'} initialOpex={opex} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
