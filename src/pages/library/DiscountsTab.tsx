import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Tag } from 'lucide-react'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import SearchableSelect, { type SelectOption } from '@/components/ui/SearchableSelect'
import { getDiscounts, createDiscount, updateDiscount, deleteDiscount, getCategories } from '@/api/library'
import { getProducts } from '@/api/products'
import type { Discount, DiscountScope, Category, Product } from '@/types'
import { getErrorMessage, formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { activeMoney } from '@/lib/money'

// ─── Constants ───────────────────────────────────────────────────────────────

// Fungsi, bukan konstanta: labelnya diterjemahkan, dan konstanta modul
// dibekukan pada bahasa yang aktif saat berkas dimuat.
const scopeOptions = (): { value: DiscountScope; label: string; hint: string }[] => [
  { value: 'global',   label: t('discScopeGlobal'),   hint: t('discScopeGlobalDesc') },
  { value: 'category', label: t('labelCategory'),     hint: t('discScopeCategoryDesc') },
  { value: 'product',  label: t('labelProduct'),      hint: t('discScopeProductDesc') },
  { value: 'variant',  label: t('discScopeVariant'),  hint: t('discScopeVariantDesc') },
]

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu.
const scopeBadge = (): Record<DiscountScope, { label: string; variant: 'blue' | 'green' | 'yellow' | 'red' }> => ({
  global:   { label: t('scopeGlobalShort'),  variant: 'blue' },
  category: { label: t('labelCategory'),     variant: 'green' },
  product:  { label: t('labelProduct'),      variant: 'yellow' },
  variant:  { label: t('scopeVariantShort'), variant: 'red' },
})

const emptyForm = {
  name: '',
  description: '',
  amount: 0,
  is_percentage: false,
  scope: 'global' as DiscountScope,
  ref_id: '',
  is_multiple: false,
  is_active: true,
  start_at: '',
  end_at: '',
}

type DiscountForm = typeof emptyForm

// ─── Component ────────────────────────────────────────────────────────────────

export default function DiscountsTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Discount | null>(null)
  const [form, setForm] = useState<DiscountForm>(emptyForm)

  const set = (key: keyof DiscountForm, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  const { data, isLoading } = useQuery({
    queryKey: ['discounts', { page, limit: 10 }],
    queryFn: () => getDiscounts({ page, limit: 10 }),
  })

  const items = data?.data?.data ?? []
  const pagination = data?.data?.pagination

  // Data referensi untuk memilih target diskon. Sebelumnya UUID harus disalin
  // manual dari halaman Produk/Kategori — sekarang dipilih dari daftar.
  const { data: categoriesData } = useQuery({
    queryKey: ['categories-selector'],
    queryFn: () => getCategories({ limit: 500, page: 1, sort_by: 'name', order_by: 'asc' }),
    staleTime: 60_000,
  })
  const { data: productsData } = useQuery({
    queryKey: ['products-selector'],
    queryFn: () => getProducts({ limit: 500, page: 1, sort_by: 'name', order_by: 'asc' }),
    staleTime: 60_000,
  })

  const refOptions: Record<Exclude<DiscountScope, 'global'>, SelectOption[]> = useMemo(() => {
    const categories: Category[] = categoriesData?.data?.data ?? []
    const products: Product[] = productsData?.data?.data ?? []
    return {
      category: categories.map((c) => ({ value: c.id, label: c.name })),
      product: products.map((p) => ({ value: p.id, label: p.name, hint: p.sku ?? undefined })),
      // Varian dikelompokkan per produk induk agar nama varian yang sama
      // ("Besar", "Kecil") di produk berbeda tetap bisa dibedakan.
      variant: products.flatMap((p) =>
        (p.variants ?? []).map((v) => ({ value: v.id, label: v.name, group: p.name, hint: v.sku ?? undefined })),
      ),
    }
  }, [categoriesData, productsData])

  /** Nama target diskon untuk ditampilkan di tabel, fallback ke UUID mentah. */
  const refLabel = (scope: DiscountScope, refId: string | null | undefined): string | null => {
    if (scope === 'global' || !refId) return null
    const opt = refOptions[scope]?.find((o) => o.value === refId)
    if (!opt) return refId
    return opt.group ? `${opt.group} · ${opt.label}` : opt.label
  }

  // datetime-local input yields "YYYY-MM-DDTHH:mm" (no seconds/timezone).
  // Go's RFC3339 parser requires seconds + timezone, so convert via Date.
  const toRFC3339 = (dt: string): string | null => {
    if (!dt) return null
    const d = new Date(dt) // browser interprets as local time
    return isNaN(d.getTime()) ? null : d.toISOString()
  }

  const toPayload = (f: DiscountForm) => ({
    name: f.name,
    description: f.description || undefined,
    amount: Number(f.amount),
    is_percentage: f.is_percentage,
    scope: f.scope,
    ref_id: f.scope !== 'global' && f.ref_id.trim() ? f.ref_id.trim() : null,
    // Backward compat: kirim is_global=true jika scope=global
    is_global: f.scope === 'global',
    is_multiple: f.is_multiple,
    is_active: f.is_active,
    start_at: toRFC3339(f.start_at),
    end_at: toRFC3339(f.end_at),
  })

  const createMut = useMutation({
    mutationFn: () => createDiscount(toPayload(form)),
    onSuccess: () => {
      toast.success(t('discountCreated'))
      qc.invalidateQueries({ queryKey: ['discounts'] })
      setModal(false)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateDiscount(editing!.id, toPayload(form)),
    onSuccess: () => {
      toast.success(t('discountUpdated'))
      qc.invalidateQueries({ queryKey: ['discounts'] })
      setModal(false)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDiscount(id),
    onSuccess: () => {
      toast.success(t('discountDeleted'))
      qc.invalidateQueries({ queryKey: ['discounts'] })
      setDeleteId(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true) }

  // Convert ISO string from API to "YYYY-MM-DDTHH:mm" for datetime-local input
  // using local time so the displayed value matches what the user expects.
  const toDatetimeLocal = (iso: string | null | undefined): string => {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    // Guard against Go zero-time ("0001-01-01T...") from unset time.Time fields
    if (d.getFullYear() < 2000) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const openEdit = (row: Discount) => {
    setEditing(row)
    // Tentukan scope: pakai field scope baru, fallback ke is_global lama
    const scope: DiscountScope = row.scope ?? (row.is_global ? 'global' : 'global')
    setForm({
      name: row.name,
      description: row.description ?? '',
      amount: row.amount,
      is_percentage: row.is_percentage,
      scope,
      ref_id: row.ref_id ?? '',
      is_multiple: row.is_multiple,
      is_active: row.is_active,
      start_at: toDatetimeLocal(row.start_at),
      end_at: toDatetimeLocal(row.end_at),
    })
    setModal(true)
  }

  const resolveScope = (row: Discount): DiscountScope =>
    row.scope ?? (row.is_global ? 'global' : 'global')

  const columns = [
    {
      key: 'name', label: t('labelName'),
      render: (row: Discount) => <span className="font-medium text-foreground">{row.name}</span>,
    },
    {
      key: 'amount', label: t('labelValue'),
      render: (row: Discount) => (
        <span className="font-semibold text-foreground">
          {row.is_percentage ? `${row.amount}%` : formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: 'scope', label: t('labelScope'),
      render: (row: Discount) => {
        const scope = resolveScope(row)
        const badge = scopeBadge()[scope]
        const target = refLabel(scope, row.ref_id)
        return (
          <div className="flex flex-col gap-0.5">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            {target && (
              <span className="text-[11px] text-muted-foreground truncate max-w-[160px]" title={target}>{target}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'flags', label: t('labelOption'),
      render: (row: Discount) => (
        <div className="flex gap-1 flex-wrap">
          {row.is_multiple && <Badge variant="blue">{t('discountPerUnit')}</Badge>}
        </div>
      ),
    },
    {
      key: 'is_active', label: t('labelStatus'),
      render: (row: Discount) => row.is_active
        ? <Badge variant="green">{t('statusActive')}</Badge>
        : <Badge variant="red">{t('statusInactiveShort')}</Badge>,
    },
    {
      key: 'actions', label: '',
      render: (row: Discount) => (
        <div className="flex gap-1 justify-end">
          <EditButton onClick={() => openEdit(row)} />
          <DeleteButton onClick={() => setDeleteId(row.id)} />
        </div>
      ),
    },
  ]

  const scopes = scopeOptions()
  const selectedScopeOption = scopes.find((o) => o.value === form.scope)

  return (
    <>
      <div className="bg-card rounded-2xl border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('discountCountLabel', { count: pagination?.total ?? 0 })}</span>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition"
          >
            <Plus size={15} /> {t('actionAdd')}
          </button>
        </div>
        <DataTable columns={columns as never[]} data={items as never[]} loading={isLoading} />
        <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
      </div>

      {/* ─── Create / Edit Modal ─── */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? t('discountEdit') : t('discountAdd')} size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            // Selector bukan input native, jadi `required` HTML tidak berlaku.
            if (form.scope !== 'global' && !form.ref_id) {
              toast.error(t('discountPickScopeFirst'))
              return
            }
            if (editing) updateMut.mutate()
            else createMut.mutate()
          }}
          className="space-y-4"
        >
          {/* Nama */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('discountName')}</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder={t('discountNameExample')}
              required
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('labelDescription')} <span className="text-muted-foreground font-normal">(Opsional)</span>
            </label>
            <input
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder={t('discountDescPlaceholder')}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tipe & Nilai */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('labelTypeShort')}</label>
              <select
                value={form.is_percentage ? 'pct' : 'fix'}
                onChange={(e) => set('is_percentage', e.target.value === 'pct')}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card"
              >
                <option value="fix">{t('amountFixed')}</option>
                <option value="pct">{t('amountPercent')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {/* Satuannya ikut mata uang outlet, bukan ditulis "(Rp)":
                    toko yang membukukan yen tidak boleh diminta mengisi rupiah. */}
                {t('valueWithUnit', { unit: form.is_percentage ? '%' : activeMoney().currency })}
              </label>
              <input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* ─── Scope ─── */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {t('labelScope')} <span className="text-muted-foreground font-normal">{t('discountScope')}</span>
            </label>
            <select
              value={form.scope}
              onChange={(e) => {
                set('scope', e.target.value as DiscountScope)
                set('ref_id', '') // reset ref saat scope berubah
              }}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card"
            >
              {scopes.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {selectedScopeOption && (
              <p className="mt-1 text-xs text-muted-foreground">{selectedScopeOption.hint}</p>
            )}
          </div>

          {/* Ref ID — tampil hanya jika scope bukan global */}
          {form.scope !== 'global' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1.5">
                <Tag size={13} className="text-muted-foreground" />
                {form.scope === 'category' ? 'Kategori' : form.scope === 'product' ? 'Produk' : t('discScopeVariant')}
              </label>
              <SearchableSelect
                value={form.ref_id}
                onChange={(v) => set('ref_id', v)}
                options={refOptions[form.scope]}
                placeholder={t('discountPickTarget', {
                  target:
                    form.scope === 'category'
                      ? t('labelCategory')
                      : form.scope === 'product'
                        ? t('labelProduct')
                        : t('menuVariant'),
                })}
                clearable={false}
              />
              {refOptions[form.scope].length === 0 ? (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                  {form.scope === 'variant'
                    ? t('discountNoVariants')
                    : t('discountNoTargets', {
                        target: form.scope === 'category' ? t('labelCategory') : t('labelProduct'),
                      })}
                </p>
              ) : (
                !form.ref_id && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('discountScopeRequired')}
                  </p>
                )
              )}
            </div>
          )}

          {/* Waktu */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('labelStart')} <span className="text-muted-foreground font-normal">(opsional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.start_at}
                onChange={(e) => set('start_at', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('labelCompleted')} <span className="text-muted-foreground font-normal">(opsional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => set('end_at', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-4">
            {([
              { key: 'is_multiple' as const, label: t('discountPerUnitHint') },
              { key: 'is_active' as const, label: t('statusActive') },
            ]).map((f) => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form[f.key]}
                  onChange={(e) => set(f.key, e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className="text-sm text-foreground">{f.label}</span>
              </label>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted"
            >
              {t('actionCancel')}
            </button>
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60"
            >
              {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : t('actionSave')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Confirm ─── */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={t('discountDelete')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('discountDeleteConfirm')}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteId(null)}
              className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted"
            >
              {t('actionCancel')}
            </button>
            <button
              onClick={() => deleteMut.mutate(deleteId!)}
              disabled={deleteMut.isPending}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60"
            >
              {deleteMut.isPending ? 'Menghapus...' : t('actionDelete')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
