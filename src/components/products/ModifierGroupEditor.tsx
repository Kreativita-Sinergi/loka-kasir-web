import Form from '@/components/ui/Form'
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import {
  createModifierGroup, updateModifierGroup, getProducts,
  type ModifierGroupPayload,
} from '@/api/products'
import type { ModifierGroup, ModifierSelectType } from '@/types'
import { cn, formatCurrency, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

// rowKey: kunci React yang tetap saat baris dipindah (id server belum ada untuk pilihan baru).
interface OptionDraft { rowKey: string; id?: string; name: string; price: string; is_available: boolean }

let rowSeq = 0
const nextRowKey = () => `row-${++rowSeq}`

const emptyOption = (): OptionDraft => ({ rowKey: nextRowKey(), name: '', price: '', is_available: true })

/**
 * Lembar buat/ubah satu grup ekstra. Dipakai halaman Ekstra dan tab Ekstra di
 * form produk.
 *
 * [showProducts] false menyembunyikan daftar produk (dipakai dari form produk:
 * pemasangan ke produk itu diurus form-nya sendiri). Produk yang sudah
 * memasang grup ini tetap terkirim apa adanya, karena product_ids di server
 * adalah daftar LENGKAP.
 */
interface EditorProps {
  open: boolean
  group: ModifierGroup | null
  showProducts?: boolean
  onClose: () => void
  onSaved?: (group: ModifierGroup) => void
}

export default function ModifierGroupEditor(props: EditorProps) {
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.group ? t('extraEdit') : t('extraAdd')} size="lg">
      {/* Dipasang ulang tiap dibuka: isiannya selalu mulai dari grup yang dipilih. */}
      {props.open && <EditorBody key={props.group?.id ?? 'new'} {...props} />}
    </Modal>
  )
}

function EditorBody({ group, showProducts = true, onClose, onSaved }: EditorProps) {
  const qc = useQueryClient()
  const [name, setName] = useState(group?.name ?? '')
  const [selectType, setSelectType] = useState<ModifierSelectType>(group?.select_type ?? 'MULTIPLE')
  const [isRequired, setIsRequired] = useState(group?.is_required ?? false)
  const [maxSelect, setMaxSelect] = useState(group?.max_select ? String(group.max_select) : '')
  const [options, setOptions] = useState<OptionDraft[]>(() => group?.options.length
    ? group.options.map((o) => ({ rowKey: o.id, id: o.id, name: o.name, price: String(o.price), is_available: o.is_available }))
    : [emptyOption()])
  const [productIds, setProductIds] = useState<Set<string>>(() => new Set(group?.product_ids ?? []))
  const [search, setSearch] = useState('')

  const products = useQuery({
    queryKey: ['modifier-group-products'],
    queryFn: async () => (await getProducts({ page: 1, limit: 500 })).data.data ?? [],
    enabled: showProducts,
    staleTime: 60_000,
  })
  const productName = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of products.data ?? []) m.set(p.id, p.name)
    return m
  }, [products.data])
  const visibleProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = products.data ?? []
    return q ? all.filter((p) => p.name.toLowerCase().includes(q)) : all
  }, [products.data, search])

  const saveMut = useMutation({
    mutationFn: (body: ModifierGroupPayload) => group ? updateModifierGroup(group.id, body) : createModifierGroup(body),
    onSuccess: (res) => {
      toast.success(group ? t('extraUpdated') : t('extraCreated'))
      qc.invalidateQueries({ queryKey: ['modifier-groups'] })
      // Modifier produk ikut berubah — layar produk perlu memuat ulang.
      qc.invalidateQueries({ queryKey: ['products'] })
      if (res.data.data) onSaved?.(res.data.data)
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const submit = () => {
    const body: ModifierGroupPayload = {
      name: name.trim(),
      select_type: selectType,
      is_required: isRequired,
      max_select: selectType === 'MULTIPLE' && maxSelect ? Number(maxSelect) : null,
      options: options
        .filter((o) => o.name.trim())
        .map((o) => ({ id: o.id, name: o.name.trim(), price: Number(o.price) || 0, is_available: o.is_available })),
      product_ids: [...productIds],
    }
    if (body.options.length === 0) { toast.error(t('extraNeedOption')); return }
    saveMut.mutate(body)
  }

  // Urutan di sini = urutan pilihan di kasir dan menu QR ("Level 0" dulu).
  const moveOption = (i: number, dir: -1 | 1) =>
    setOptions((prev) => {
      const next = [...prev]
      const [o] = next.splice(i, 1)
      next.splice(i + dir, 0, o)
      return next
    })

  const setOption = (i: number, patch: Partial<OptionDraft>) =>
    setOptions((prev) => prev.map((o, j) => (j === i ? { ...o, ...patch } : o)))

  const toggleProduct = (id: string) =>
    setProductIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const inputCls = 'w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <Form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); submit() }} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t('extraGroupName')}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('extraGroupExample')} required maxLength={100} className={inputCls} />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t('extraPickRule')}</label>
        <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 rounded-lg">
          {(['SINGLE', 'MULTIPLE'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={selectType === v} onClick={() => setSelectType(v)}
              className={cn('px-3 py-2 rounded-lg text-sm font-medium transition-all',
                selectType === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {v === 'SINGLE' ? t('extraPickSingle') : t('extraPickMultiple')}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="rounded" />
            {t('extraRequired')}
          </label>
          {selectType === 'MULTIPLE' && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              {t('extraMaxSelect')}
              <input type="number" min={1} value={maxSelect} onChange={(e) => setMaxSelect(e.target.value)} placeholder="—" title={t('extraMaxSelectHint')}
                className="w-20 px-2 py-1.5 border border-border rounded-lg text-sm bg-background" />
            </label>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">{t('extraOptions')}</label>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={o.rowKey} className="flex items-center gap-2">
              <input value={o.name} onChange={(e) => setOption(i, { name: e.target.value })} placeholder={t('extraOptionName')} maxLength={100} className={cn(inputCls, 'flex-1 min-w-0')} />
              <input type="number" min={0} inputMode="numeric" value={o.price} onChange={(e) => setOption(i, { price: e.target.value })} placeholder={t('extraOptionPrice')} className={cn(inputCls, 'w-32 shrink-0')} />
              <label className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0" title={t('extraOptionAvailable')}>
                <input type="checkbox" checked={o.is_available} onChange={(e) => setOption(i, { is_available: e.target.checked })} className="rounded" />
                {t('extraOptionAvailable')}
              </label>
              {options.length > 1 && (
                <>
                  <button type="button" aria-label={t('productExtrasMoveUp')} disabled={i === 0} onClick={() => moveOption(i, -1)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30 shrink-0">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" aria-label={t('productExtrasMoveDown')} disabled={i === options.length - 1} onClick={() => moveOption(i, 1)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30 shrink-0">
                    <ArrowDown size={14} />
                  </button>
                </>
              )}
              <button type="button" aria-label={t('actionDelete')} onClick={() => setOptions((prev) => prev.length > 1 ? prev.filter((_, j) => j !== i) : [emptyOption()])}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted shrink-0">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setOptions((prev) => [...prev, emptyOption()])} className="mt-2 flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700">
          <Plus size={14} /> {t('extraOptionAdd')}
        </button>
      </div>

      {showProducts && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-foreground">{t('extraProducts')}</label>
            <span className="text-xs text-muted-foreground">{t('extraProductsCount', { count: productIds.size })}</span>
          </div>
          {productIds.size > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[...productIds].map((id) => (
                <button key={id} type="button" onClick={() => toggleProduct(id)} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 text-xs">
                  {productName.get(id) ?? '…'} <X size={12} />
                </button>
              ))}
            </div>
          )}
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('extraProductsSearch')} className={inputCls} />
          <div className="mt-2 max-h-56 overflow-y-auto border border-border rounded-xl divide-y divide-border">
            {visibleProducts.map((p) => (
              <label key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted/50 cursor-pointer">
                <span className="flex items-center gap-2 min-w-0">
                  <input type="checkbox" checked={productIds.has(p.id)} onChange={() => toggleProduct(p.id)} className="rounded" />
                  <span className="truncate text-foreground">{p.name}</span>
                </span>
                <span className="text-xs text-muted-foreground shrink-0">{formatCurrency(p.sell_price ?? 0)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
        <button type="submit" disabled={saveMut.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
          {saveMut.isPending ? t('saving') : t('actionSave')}
        </button>
      </div>
    </Form>
  )
}
