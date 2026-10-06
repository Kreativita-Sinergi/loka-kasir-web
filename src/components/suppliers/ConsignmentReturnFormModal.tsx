import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Minus, Plus, Search } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Form from '@/components/ui/Form'
import SearchableSelect from '@/components/ui/SearchableSelect'
import QueryErrorState from '@/components/ui/QueryErrorState'
import { Button } from '@/components/ui/button'
import { getConsignmentProducts, type ConsignmentProduct } from '@/api/consignment'
import { createConsignmentReturn } from '@/api/suppliers'
import type { Supplier } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { inputCls } from './consignmentUtils'
import { CS_KEYS, invalidateConsignmentReturns } from './consignmentQueries'

/**
 * Form buat retur — cermin ConsignmentReturnFormDialog di aplikasi: semua
 * barang titipan penitip (yang masih ada stoknya di outlet aktif) tampil
 * sekaligus dengan jumlah yang bisa diubah, karena retur biasanya "semua yang
 * tersisa". Tanpa harga: barang yang kembali tidak menyangkut uang.
 */
export default function ConsignmentReturnFormModal({ outlet, consignors, initialConsignorId, onClose, onCreated }: {
  outlet: { id: string; name: string } | null
  consignors: Supplier[]
  initialConsignorId?: string
  onClose: () => void
  onCreated: (returnId: string) => void
}) {
  const qc = useQueryClient()
  const [consignorId, setConsignorId] = useState(() =>
    consignors.some((c) => c.id === initialConsignorId) ? initialConsignorId! : (consignors[0]?.id ?? ''))
  const [qty, setQty] = useState<Record<string, number>>({})
  const [q, setQ] = useState('')
  const [notes, setNotes] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [CS_KEYS.products, outlet?.id, consignorId],
    queryFn: () => getConsignmentProducts({ outlet_id: outlet!.id, consignor_id: consignorId }),
    select: (res) => res.data.data as ConsignmentProduct[],
    enabled: !!outlet?.id && !!consignorId,
  })
  const products = data ?? []
  const of = (p: ConsignmentProduct) => qty[p.id] ?? 0
  const set = (p: ConsignmentProduct, v: number) => setQty((prev) => ({ ...prev, [p.id]: Math.max(0, Math.min(p.stock, Math.round(v))) }))
  const totalQty = products.reduce((s, p) => s + of(p), 0)
  const allMax = products.length > 0 && products.every((p) => of(p) === p.stock)
  const visible = products.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))

  const mut = useMutation({
    mutationFn: () => createConsignmentReturn({
      outlet_id: outlet!.id,
      consignor_id: consignorId,
      notes: notes.trim() || null,
      items: products.filter((p) => of(p) > 0).map((p) => ({ product_id: p.id, quantity: of(p) })),
    }),
    onSuccess: (res) => {
      toast.success(t('csReturnCreated', { number: res.data.data.return_number }))
      invalidateConsignmentReturns(qc)
      onCreated(res.data.data.id)
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <Modal open onClose={onClose} title={t('csReturnFormTitle')} size="md">
      <Form onSubmit={(e) => { e.preventDefault(); if (outlet && totalQty > 0) mut.mutate() }} className="space-y-4">
        {outlet ? (
          <div className="rounded-xl border border-border bg-muted px-3.5 py-2.5">
            <p className="text-[11px] text-muted-foreground">{t('labelOutlet')}</p>
            <p className="text-sm text-foreground">{outlet.name}</p>
          </div>
        ) : (
          <p className="rounded-lg bg-warning-subtle p-3 text-sm text-warning">{t('csReturnNeedOutlet')}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('csReturnConsignor')} <span className="text-destructive">*</span></label>
          <SearchableSelect value={consignorId} clearable={false} disabled={mut.isPending}
            onChange={(v) => { setConsignorId(v); setQty({}); setQ('') }}
            options={consignors.map((c) => ({ value: c.id, label: c.name, hint: c.phone ?? undefined }))} />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-foreground">{t('csReturnItemsHeading')}</p>
            {products.length > 0 && (
              <button type="button" disabled={mut.isPending} className="text-sm font-medium text-primary hover:underline"
                onClick={() => setQty(Object.fromEntries(products.map((p) => [p.id, allMax ? 0 : p.stock])))}>
                {allMax ? t('csDeselectAll') : t('csReturnAllStock')}
              </button>
            )}
          </div>
          <QueryErrorState error={error} onRetry={refetch} />
          {!outlet ? null : isLoading ? (
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
          ) : products.length === 0 ? (
            !error && <p className="rounded-xl border border-border bg-muted px-3.5 py-3 text-sm text-muted-foreground">{t('csReturnNoStock')}</p>
          ) : (
            <div className="space-y-1">
              {products.length > 6 && (
                <div className="relative mb-2">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('csReturnSearch')} className={`${inputCls} pl-8`} aria-label={t('csReturnSearch')} />
                </div>
              )}
              <ul className="divide-y divide-border rounded-xl border border-border">
                {visible.map((p) => {
                  const n = of(p)
                  return (
                    <li key={p.id} className="flex items-center gap-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm ${n > 0 ? 'font-semibold text-foreground' : 'text-foreground'}`}>{p.name}</p>
                        <p className="text-xs text-muted-foreground">{t('csReturnStock', { n: p.stock })}{p.sku && ` · ${p.sku}`}</p>
                      </div>
                      <button type="button" aria-label={`${t('csQtyDecrease')} ${p.name}`} disabled={mut.isPending || n <= 0} onClick={() => set(p, n - 1)}
                        className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"><Minus size={14} /></button>
                      <input type="number" inputMode="numeric" min={0} max={p.stock} value={n} disabled={mut.isPending}
                        aria-label={`${t('labelQuantity')} ${p.name}`}
                        onChange={(e) => set(p, Number(e.target.value) || 0)}
                        className="w-14 rounded-lg border border-border bg-card py-1.5 text-center text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button type="button" aria-label={`${t('csQtyIncrease')} ${p.name}`} disabled={mut.isPending || n >= p.stock} onClick={() => set(p, n + 1)}
                        className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"><Plus size={14} /></button>
                      <button type="button" disabled={mut.isPending || n === p.stock} onClick={() => set(p, p.stock)}
                        className="px-2 py-1 text-xs font-semibold text-primary hover:underline disabled:opacity-40">{t('csPayAll')}</button>
                    </li>
                  )
                })}
              </ul>
              {totalQty > 0 && <p className="pt-1 text-xs font-semibold text-foreground">{t('csReturnSummary', { n: totalQty })}</p>}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{t('labelNoteOptional')}</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={mut.isPending}
            placeholder={t('csReturnNotesHint')} className={`${inputCls} resize-none`} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={mut.isPending}>{t('actionCancel')}</Button>
          <Button type="submit" disabled={mut.isPending || !outlet || totalQty === 0}>
            {mut.isPending ? t('saving') : totalQty > 0 ? t('csReturnSubmit', { n: totalQty }) : t('actionSave')}
          </Button>
        </div>
      </Form>
    </Modal>
  )
}
