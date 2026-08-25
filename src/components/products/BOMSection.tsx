import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Search, Info } from 'lucide-react'
import { DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import { getRawMaterials } from '@/api/rawMaterials'
import { getProductBOM, syncProductBOM } from '@/api/productIngredients'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import type { RawMaterial } from '@/types'
import { t } from '@/lib/i18n'

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
  // Daftar dibuka begitu kolomnya disentuh, bukan setelah mengetik: seorang
  // pemilik yang baru menyusun resep belum tahu nama bahan apa saja yang sudah
  // ia daftarkan, dan kolom yang diam sampai ada ketikan membuat halaman ini
  // terbaca seolah belum punya bahan sama sekali.
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const [rows, setRows] = useState<IngredientRow[]>([])
  const [dirty, setDirty] = useState(false)

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const { data: rmData, isLoading: rmLoading } = useQuery({
    queryKey: ['raw-materials-search', search],
    // Tanpa kata kunci, yang diminta adalah halaman pertama daftar bahan —
    // cukup panjang untuk digulir, tidak sepanjang seluruh gudang.
    queryFn: () => getRawMaterials({ search, limit: 20, page: 1 }),
    enabled: pickerOpen,
    staleTime: 30_000,
  })
  // Bahan yang sudah masuk resep tidak ditawarkan lagi: menambahkannya hanya
  // berujung pada toast penolakan, dan daftarnya jadi penuh pilihan buntu.
  const rawMaterials: RawMaterial[] = (rmData?.data?.data ?? []).filter(
    rm => !rows.some(r => r.raw_material_id === rm.id),
  )

  // Klik di luar menutup daftar. Tanpa ini, daftar menggantung di atas baris
  // bahan dan menghalangi kolom jumlah yang ada persis di bawahnya.
  useEffect(() => {
    if (!pickerOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [pickerOpen])

  const saveMut = useMutation({
    mutationFn: () =>
      syncProductBOM(
        productId,
        rows
          .filter(r => r.raw_material_id && parseFloat(r.quantity) > 0)
          .map(r => ({ raw_material_id: r.raw_material_id, quantity: parseFloat(r.quantity) }))
      ),
    onSuccess: () => {
      toast.success(t('bomSaved'))
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['product-bom', productId] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const addIngredient = useCallback((rm: RawMaterial) => {
    if (rows.some(r => r.raw_material_id === rm.id)) {
      toast.error(t('bomIngredientExists'))
      return
    }
    setRows(prev => [
      ...prev,
      {
        raw_material_id: rm.id,
        raw_material_name: rm.name,
        unit_alias: rm.unit?.alias ?? rm.unit?.name ?? '',
        avg_cost: rm.avg_cost,
        quantity: '1',
      },
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

  const totalHPP = useMemo(() =>
    rows.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0) * r.avg_cost, 0),
    [rows]
  )

  const hasZeroCost = rows.some(r => r.avg_cost === 0)

  return (
    <div className="space-y-4">
      {/* Search & Add raw material */}
      <div className="relative" ref={pickerRef}>
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-card focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            className="flex-1 text-sm outline-none"
            placeholder={t('bomSearchIngredient')}
            value={search}
            onFocus={() => setPickerOpen(true)}
            onChange={e => { setSearch(e.target.value); setPickerOpen(true) }}
            onKeyDown={e => { if (e.key === 'Escape') setPickerOpen(false) }}
          />
        </div>
        {pickerOpen && rawMaterials.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 bg-card border border-border rounded-lg shadow-lg mt-1 overflow-y-auto max-h-72">
            {rawMaterials.map(rm => (
              <button
                key={rm.id}
                type="button"
                onClick={() => addIngredient(rm)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:bg-blue-500/10 text-sm flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <span className="font-medium text-foreground">{rm.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{rm.unit?.alias ?? rm.unit?.name ?? ''}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{formatCurrency(rm.avg_cost)}</span>
                  {rm.avg_cost === 0 && (
                    <span className="ml-1 text-xs text-orange-400">{t('bomNoCostYet')}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
        {pickerOpen && rawMaterials.length === 0 && (
          <div className="absolute top-full left-0 right-0 z-20 bg-card border border-border rounded-lg shadow-lg mt-1 px-4 py-3 text-sm text-muted-foreground">
            {rmLoading ? t('loading') : search.length >= 1 ? t('rmNotFound') : t('rmEmpty')}
          </div>
        )}
      </div>

      {/* Ingredient rows */}
      {rows.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm bg-muted rounded-lg border border-dashed border-border">
          <Search size={24} className="mx-auto mb-2 text-muted-foreground" />
          <p>{t('bomEmpty')}</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-3 py-2 text-left">{t('bomIngredient')}</th>
                <th className="px-3 py-2 text-left">{t('labelUnit')}</th>
                <th className="px-3 py-2 text-right">{t('labelCostPerUnit')}</th>
                <th className="px-3 py-2 text-right w-28">{t('labelQuantity')}</th>
                <th className="px-3 py-2 text-right">{t('labelSubtotalShort')}</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(row => {
                const qty = parseFloat(row.quantity) || 0
                const subtotal = qty * row.avg_cost
                return (
                  <tr key={row.raw_material_id} className="hover:bg-muted">
                    <td className="px-3 py-2.5 font-medium text-foreground">{row.raw_material_name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-xs">{row.unit_alias || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-muted-foreground">
                      {row.avg_cost > 0
                        ? formatCurrency(row.avg_cost)
                        : <span className="text-orange-400 text-xs">{t('bomNoCost')}</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        className="w-24 border border-border rounded px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={row.quantity}
                        onChange={e => updateQty(row.raw_material_id, e.target.value)}
                      />
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-blue-700 dark:text-blue-400">
                      {formatCurrency(subtotal)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <DeleteButton onClick={() => removeRow(row.raw_material_id)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* HPP Summary + warning */}
      {rows.length > 0 && (
        <div className="space-y-2">
          {hasZeroCost && (
            <div className="flex items-start gap-2 bg-orange-50 dark:bg-orange-500/10 border border-orange-100 rounded-lg px-3 py-2.5 text-xs text-orange-700 dark:text-orange-400">
              <Info size={13} className="shrink-0 mt-0.5" />
              <span>{t('bomIncompleteCost')}</span>
            </div>
          )}
          <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-4 border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">{t('bomTotalCost')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('bomExcludesOverhead')}</p>
            </div>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(totalHPP)}</p>
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending || !dirty}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Save size={14} />
          {saveMut.isPending ? t('saving') : dirty ? t('bomSave') : t('saved')}
        </button>
      </div>
    </div>
  )
}
