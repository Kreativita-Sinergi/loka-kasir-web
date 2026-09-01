import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import { DataTable } from '@/components/ui/Table'
import {
  getExpiring, getBatches, receiveBatch, updateBatch, adjustBatch, deleteBatch,
  daysUntilExpiry,
  type ExpiringBatch, type ProductBatch,
} from '@/api/pharmacy'
import { getOutletStocksAll } from '@/api/stock'
import { useOutletStore } from '@/store/outletStore'
import { drugClassAccent } from '@/lib/constants'
import { getErrorMessage, formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'

/** Lencana sisa umur sebuah batch.
 *
 *  Warnanya mengikuti mendesaknya, bukan jenis obatnya: merah untuk yang sudah
 *  lewat, jingga untuk yang tinggal sebulan. Yang perlu terbaca dalam sekali
 *  lihat adalah apakah baris ini menuntut tindakan hari ini. */
function ExpiryChip({ date }: { date: string }) {
  const days = daysUntilExpiry(date)
  const label =
    days < 0 ? `${-days} ${t('pharmDaysAgo')}`
      : days === 0 ? t('pharmExpiresToday')
      : `${days} ${t('pharmDaysLeft')}`
  const tone =
    days < 0 ? 'bg-red-50 text-red-700 border-red-200'
      : days <= 30 ? 'bg-orange-50 text-orange-700 border-orange-200'
      : 'bg-muted/40 text-muted-foreground border-border'
  return <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>
}

/** Ringkasan nilai yang dipertaruhkan.
 *
 *  "12 batch" tidak menggerakkan siapa pun; "Rp 3.480.000 akan hangus dalam 90
 *  hari" menggerakkan. Karena itu angka rupiahnya yang dibesarkan. */
function SummaryTile({ label, value, count, tone }: {
  label: string; value: number; count: number; tone: 'red' | 'orange'
}) {
  const cls = tone === 'red'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-orange-200 bg-orange-50 text-orange-700'
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{formatCurrency(value)}</p>
      <p className="text-xs text-muted-foreground">{count} batch</p>
    </div>
  )
}

// ─── Modal batch per produk ──────────────────────────────────────────────────

function BatchModal({ open, onClose, productId, productName, outletId }: {
  open: boolean; onClose: () => void
  productId: string; productName: string; outletId: string
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<ProductBatch | null>(null)
  const [code, setCode] = useState('')
  const [expiry, setExpiry] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')

  const { data: batches = [] } = useQuery({
    queryKey: ['pharmacy-batches', productId, outletId],
    queryFn: () => getBatches(productId, outletId, true).then(r => r.data.data ?? []),
    enabled: open && !!productId,
  })

  function reset() {
    setEditing(null); setCode(''); setExpiry(''); setQuantity(''); setNote('')
  }

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['pharmacy-batches'] })
    void qc.invalidateQueries({ queryKey: ['pharmacy-expiring'] })
    void qc.invalidateQueries({ queryKey: ['outlet-stocks'] })
  }

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        await updateBatch(editing.id, { batch_code: code, expiry_date: expiry, note })
        return
      }
      await receiveBatch(outletId, {
        product_id: productId,
        batch_code: code,
        expiry_date: expiry,
        quantity: Number(quantity),
        note: note || undefined,
      })
    },
    onSuccess: () => { invalidate(); reset(); toast.success(t('saved')) },
    // Pesan server diteruskan apa adanya: di sinilah kalimat yang paling perlu
    // dibaca muncul — kode batch bentrok, tanggal tidak terbaca.
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteBatch(id),
    onSuccess: () => { invalidate(); toast.success(t('saved')) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const adjust = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => adjustBatch(id, qty),
    onSuccess: () => { invalidate(); toast.success(t('saved')) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title={`${t('pharmBatchTitle')} — ${productName}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-sm font-medium mb-1">{t('pharmBatchCode')}</p>
            <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={code} onChange={e => setCode(e.target.value)} placeholder="A23F" />
          </div>
          <div>
            <p className="text-sm font-medium mb-1">{t('pharmExpiryDate')}</p>
            <input type="date" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={expiry} onChange={e => setExpiry(e.target.value)} />
          </div>
        </div>
        {!editing && (
          <div>
            <p className="text-sm font-medium mb-1">{t('pharmQuantity')}</p>
            <input type="number" min={1}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" disabled={save.isPending || !code || !expiry}
            onClick={() => save.mutate()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            <Plus className="size-4" />{editing ? t('actionSave') : t('actionAdd')}
          </button>
          {editing && (
            <button type="button" onClick={reset}
              className="rounded-lg border border-border px-4 py-2 text-sm">{t('actionCancel')}</button>
          )}
        </div>

        <div className="rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t('pharmBatchCode')}</th>
                <th className="px-3 py-2">{t('pharmExpiryDate')}</th>
                <th className="px-3 py-2 text-right">{t('pharmQuantity')}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2 font-medium">{b.batch_code}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span>{b.expiry_date?.slice(0, 10)}</span>
                      <ExpiryChip date={b.expiry_date} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input type="number" min={0} defaultValue={b.quantity}
                      onBlur={e => {
                        const qty = Number(e.target.value)
                        if (qty !== b.quantity) adjust.mutate({ id: b.id, qty })
                      }}
                      className="w-20 rounded border border-border bg-background px-2 py-1 text-right" />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button type="button"
                        onClick={() => {
                          setEditing(b); setCode(b.batch_code)
                          setExpiry(b.expiry_date?.slice(0, 10) ?? ''); setNote(b.note ?? '')
                        }}
                        className="rounded p-1 hover:bg-muted"><Pencil className="size-4" /></button>
                      <button type="button"
                        onClick={() => remove.mutate(b.id)}
                        className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  {t('pharmExpiryEmpty')}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}

// ─── Halaman ─────────────────────────────────────────────────────────────────

export default function ExpiryPage() {
  const outletId = useOutletStore(s => s.selected?.id) ?? ''
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null)

  const { data: board, isLoading } = useQuery({
    queryKey: ['pharmacy-expiring', outletId],
    queryFn: () => getExpiring(outletId).then(r => r.data.data),
  })

  // Daftar produk dipakai untuk membuka batch produk yang BELUM punya batch
  // sama sekali — papan kedaluwarsa hanya memuat yang sudah punya.
  const { data: stocks = [] } = useQuery({
    queryKey: ['outlet-stocks', outletId],
    queryFn: () => getOutletStocksAll(outletId).then(r => r.data.data ?? []),
    enabled: !!outletId,
  })

  const rows: ExpiringBatch[] = [...(board?.expired ?? []), ...(board?.soon ?? [])]

  return (
    <div className="space-y-5">
      <Header title={t('pharmExpiryTitle')} subtitle={t('pharmExpiryEmptyBody')} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummaryTile label={t('pharmExpired')} value={board?.expired_value ?? 0}
          count={board?.expired.length ?? 0} tone="red" />
        <SummaryTile label={t('pharmExpiringSoon')} value={board?.soon_value ?? 0}
          count={board?.soon.length ?? 0} tone="orange" />
      </div>

      <DataTable<ExpiringBatch>
        loading={isLoading}
        data={rows}
        emptyMessage={t('pharmExpiryEmpty')}
        columns={[
          {
            key: 'product',
            label: t('pharmProduct'),
            render: r => (
              <button type="button" className="text-left font-medium hover:underline"
                onClick={() => setPicked({ id: r.product_id, name: r.product_name })}>
                {r.product_name}
                {r.drug_class && (
                  <span className={`ml-2 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${drugClassAccent(r.drug_class)}`}>
                    {t(`drugClass${r.drug_class}` as never)}
                  </span>
                )}
              </button>
            ),
          },
          { key: 'batch', label: t('pharmBatchCode'), render: r => r.batch_code },
          {
            key: 'expiry',
            label: t('pharmExpiryDate'),
            render: r => (
              <div className="flex items-center gap-2">
                <span>{r.expiry_date?.slice(0, 10)}</span>
                <ExpiryChip date={r.expiry_date} />
              </div>
            ),
          },
          { key: 'qty', label: t('pharmQuantity'), render: r => r.quantity },
          {
            key: 'value',
            label: t('pharmValueAtRisk'),
            render: r => formatCurrency((r.sell_price ?? 0) * r.quantity),
          },
        ]}
      />

      {/* Membuka batch produk mana pun, termasuk yang belum punya batch. */}
      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">{t('pharmBatchTitle')}</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {stocks
            .filter(s => s.product?.drug_class)
            .map(s => (
              <button key={s.product_id} type="button"
                onClick={() => setPicked({ id: s.product_id, name: s.product?.name ?? '' })}
                className="rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-muted/50">
                {s.product?.name}
              </button>
            ))}
        </div>
      </details>

      {picked && (
        <BatchModal open onClose={() => setPicked(null)} outletId={outletId}
          productId={picked.id} productName={picked.name} />
      )}
    </div>
  )
}
