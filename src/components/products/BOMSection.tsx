/**
 * BOMSection — Product Composition (Bill of Materials) editor.
 * Embedded as a tab inside ProductFormModal when editing an existing product.
 * Supports: search raw materials, add/remove ingredients, display real-time HPP.
 */
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { getRawMaterials } from '@/api/rawMaterials'
import { getProductBOM, syncProductBOM } from '@/api/productIngredients'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import type { RawMaterial } from '@/types'

interface IngredientRow {
  raw_material_id: string
  raw_material_name: string
  unit_alias: string
  avg_cost: number
  quantity: string
}

interface BOMSectionProps {
  productId: string
}

export default function BOMSection({ productId }: BOMSectionProps) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<IngredientRow[]>([])
  const [dirty, setDirty] = useState(false)

  // Load existing BOM on mount
  const { data: bomData } = useQuery({
    queryKey: ['product-bom', productId],
    queryFn: () => getProductBOM(productId),
    enabled: !!productId,
    refetchOnWindowFocus: false,
    select: (res) => res.data.data,
  })

  // Sync server BOM into local rows on first load (don't override user edits)
  useEffect(() => {
    if (bomData && !dirty) {
      setRows(
        bomData.ingredients.map(ing => ({
          raw_material_id: ing.raw_material_id,
          raw_material_name: ing.raw_material?.name ?? '',
          unit_alias: ing.raw_material?.unit?.alias ?? ing.raw_material?.unit?.name ?? '',
          avg_cost: ing.raw_material?.avg_cost ?? 0,
          quantity: String(ing.quantity),
        }))
      )
    }
  }, [bomData]) // eslint-disable-line react-hooks/exhaustive-deps

  // Raw material search
  const { data: rmData } = useQuery({
    queryKey: ['raw-materials-search', search],
    queryFn: () => getRawMaterials({ search, limit: 10, page: 1 }),
    enabled: search.length >= 1,
    staleTime: 30_000,
  })
  const rawMaterials: RawMaterial[] = rmData?.data?.data ?? []

  const saveMut = useMutation({
    mutationFn: () =>
      syncProductBOM(
        productId,
        rows
          .filter(r => r.raw_material_id && parseFloat(r.quantity) > 0)
          .map(r => ({ raw_material_id: r.raw_material_id, quantity: parseFloat(r.quantity) }))
      ),
    onSuccess: () => {
      toast.success('Resep produk berhasil disimpan')
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['product-bom', productId] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const addIngredient = useCallback((rm: RawMaterial) => {
    if (rows.some(r => r.raw_material_id === rm.id)) {
      toast.error('Bahan ini sudah ada dalam resep')
      return
    }
    setRows(prev => [
      ...prev,
      { raw_material_id: rm.id, raw_material_name: rm.name, unit_alias: rm.unit?.alias ?? rm.unit?.name ?? '', avg_cost: rm.avg_cost, quantity: '1' },
    ])
    setSearch('')
    setDirty(true)
  }, [rows])

  const removeRow = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.raw_material_id !== id))
    setDirty(true)
  }, [])

  const updateQty = useCallback((id: string, qty: string) => {
    setRows(prev => prev.map(r => r.raw_material_id === id ? { ...r, quantity: qty } : r))
    setDirty(true)
  }, [])

  // Real-time HPP calculation
  const totalHPP = useMemo(() =>
    rows.reduce((sum, r) => {
      const qty = parseFloat(r.quantity) || 0
      return sum + qty * r.avg_cost
    }, 0),
    [rows]
  )

  return (
    <div className="space-y-5">
      {/* Search & Add raw material */}
      <div className="relative">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            className="flex-1 text-sm outline-none"
            placeholder="Cari dan tambah bahan baku..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {search.length >= 1 && rawMaterials.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-100 rounded-lg shadow-lg mt-1 overflow-hidden">
            {rawMaterials.map(rm => (
              <button
                key={rm.id}
                type="button"
                onClick={() => addIngredient(rm)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center justify-between"
              >
                <div>
                  <span className="font-medium text-gray-800">{rm.name}</span>
                  <span className="ml-2 text-xs text-gray-400">{rm.unit?.alias ?? rm.unit?.name ?? ''}</span>
                </div>
                <span className="text-xs text-blue-600 font-semibold">{formatCurrency(rm.avg_cost)}/satuan</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ingredient rows */}
      {rows.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
          Belum ada bahan. Cari dan tambahkan bahan baku di atas.
        </div>
      ) : (
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Bahan</th>
                <th className="px-3 py-2 text-left">Satuan</th>
                <th className="px-3 py-2 text-right">HPP/Satuan</th>
                <th className="px-3 py-2 text-right w-24">Jumlah</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => {
                const qty = parseFloat(row.quantity) || 0
                return (
                  <tr key={row.raw_material_id}>
                    <td className="px-3 py-2 font-medium text-gray-800">{row.raw_material_name}</td>
                    <td className="px-3 py-2 text-gray-500">{row.unit_alias}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{formatCurrency(row.avg_cost)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        className="w-20 border border-gray-200 rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={row.quantity}
                        onChange={e => updateQty(row.raw_material_id, e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-blue-700">{formatCurrency(qty * row.avg_cost)}</td>
                    <td className="px-3 py-2 text-center">
                      <button type="button" onClick={() => removeRow(row.raw_material_id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* HPP Summary */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total HPP Dasar</p>
          <p className="text-xs text-gray-500 mt-0.5">Biaya bahan baku saja, belum termasuk overhead & margin</p>
        </div>
        <p className="text-xl font-bold text-blue-700">{formatCurrency(totalHPP)}</p>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending || !dirty}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={14} />
          {saveMut.isPending ? 'Menyimpan...' : 'Simpan Resep'}
        </button>
      </div>
    </div>
  )
}
