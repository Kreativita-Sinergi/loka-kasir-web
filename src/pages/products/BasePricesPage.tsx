import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Info, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import NumericInput from '@/components/ui/NumericInput'
import { Button } from '@/components/ui/button'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import { getProductsWithoutCost, updateBasePrices, type BasePriceItem } from '@/api/basePrices'
import { getProducts } from '@/api/products'
import { cn, formatCurrency, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { PERMS, usePermissions } from '@/hooks/usePermissions'
import type { Product } from '@/types'

/** Server membatasi 100 baris per halaman untuk daftar tanpa HPP. */
const PAGE_LIMIT = 50
/** Server menolak lebih dari 200 baris per panggilan simpan. */
const SAVE_CHUNK = 200

type Mode = 'missing' | 'all'

/**
 * Isian satu baris: teks mentah yang diketik beserta modal aslinya. Aslinya
 * ikut disimpan supaya baris yang diketik lalu dikembalikan ke angka semula
 * tidak dihitung sebagai perubahan — dan supaya isian tetap hidup saat
 * pemilik berpindah halaman.
 */
interface Draft { text: string; original: number }

const toNumber = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

/** Aturan server: modal kosong, nol, atau ≥ harga jual dianggap belum diisi. */
const costLooksMissing = (p: Product) => {
  const base = toNumber(p.base_price)
  return base <= 0 || base >= toNumber(p.sell_price)
}

/**
 * Mengisi harga modal banyak produk sekaligus.
 *
 * Toko yang mengadopsi barang dari katalog tanpa mengisi harga modal mendapat
 * modal = harga jual, dan labanya terbaca nol selamanya. Membetulkannya lewat
 * formulir produk berarti ratusan kali buka-simpan; halaman ini menggantinya
 * dengan satu tabel dan satu tombol simpan yang hanya mengirim baris yang
 * benar-benar berubah.
 */
export default function BasePricesPage() {
  const qc = useQueryClient()
  const { can } = usePermissions()
  const canEdit = can(PERMS.INVENTORY_EDIT)

  const [mode, setMode] = useState<Mode>('missing')
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})

  // Pencarian ditunda sejenak supaya mode "semua" tidak memukul server
  // setiap ketukan.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Daftar tanpa HPP selalu dimuat: di mode "semua" ia tetap menjadi sumber
  // angka penghitung "N produk belum punya HPP". Kuncinya berawalan
  // 'products' agar ikut segar saat produk diubah dari halaman lain.
  const missingPage = mode === 'missing' ? page : 1
  const missingQuery = useQuery({
    queryKey: ['products', 'without-cost', missingPage, PAGE_LIMIT],
    queryFn: () => getProductsWithoutCost({ page: missingPage, limit: PAGE_LIMIT }),
  })
  const allQuery = useQuery({
    queryKey: ['products', 'base-prices-all', page, PAGE_LIMIT, search],
    queryFn: () => getProducts({ page, limit: PAGE_LIMIT, search: search || undefined }),
    enabled: mode === 'all',
  })

  const active = mode === 'missing' ? missingQuery : allQuery
  const total = active.data?.data.pagination.total ?? 0
  const missingTotal = missingQuery.data?.data.pagination.total ?? 0

  // Endpoint tanpa HPP tidak punya parameter pencarian, jadi di mode itu
  // pencarian hanya menyaring halaman yang sedang tampil — dan dikatakan
  // terang-terangan di bawah kotak carinya.
  const rows = useMemo(() => {
    const list = active.data?.data.data ?? []
    if (mode !== 'missing' || !search) return list
    const q = search.toLowerCase()
    return list.filter(p => p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q))
  }, [active.data, mode, search])

  // Setelah baris tersimpan dan hilang dari daftar, halaman yang sedang
  // dibuka bisa melewati halaman terakhir — mundurkan ke yang terakhir ada.
  const lastPage = Math.max(1, Math.ceil(total / PAGE_LIMIT))
  useEffect(() => {
    if (!active.isFetching && page > lastPage) setPage(lastPage) // eslint-disable-line react-hooks/set-state-in-effect
  }, [active.isFetching, page, lastPage])

  // Hanya baris yang BENAR-BENAR berubah yang dikirim. Baris kosong berarti
  // "belum tahu" — mengirimnya sebagai nol akan membuat laporan laba mengklaim
  // seluruh omzet barang itu sebagai untung.
  const changes = useMemo<BasePriceItem[]>(() => Object.entries(drafts).flatMap(([id, draft]) => {
    const text = draft.text.trim()
    if (!text) return []
    const value = Number(text)
    if (!Number.isFinite(value) || value < 0 || value === draft.original) return []
    return [{ id, base_price: value }]
  }), [drafts])
  const changedIds = useMemo(() => new Set(changes.map(c => c.id)), [changes])

  const editRow = (p: Product, text: string) =>
    setDrafts(prev => ({ ...prev, [p.id]: { text, original: toNumber(p.base_price) } }))

  const saveMut = useMutation({
    mutationFn: async (items: BasePriceItem[]) => {
      let updated = 0
      for (let i = 0; i < items.length; i += SAVE_CHUNK) {
        const res = await updateBasePrices(items.slice(i, i + SAVE_CHUNK))
        updated += res.data.data?.updated ?? 0
      }
      return updated
    },
    onSuccess: (_updated, items) => {
      toast.success(t('bpSaved', { count: items.length }))
      // Isian dibuang HANYA setelah server menerimanya — pemilik yang gagal
      // menyimpan tidak boleh kehilangan dua puluh angka yang baru diketiknya.
      setDrafts({})
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['profitability-report'] })
      qc.invalidateQueries({ queryKey: ['pricing-suggestions'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const switchMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    setPage(1)
  }

  const inputClass = 'w-full px-3 py-2 text-sm border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-blue-500'

  const columns = [
    {
      key: 'name',
      label: t('bpColProduct'),
      render: (p: Product) => {
        const meta = [p.sku, p.category?.name].filter(Boolean).join(' · ')
        const aboveSell = toNumber(p.base_price) > 0 && costLooksMissing(p)
        return (
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium text-foreground">{p.name}</p>
            {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
            {aboveSell && <Badge variant="warning" title={t('bpCostAboveSellHint')}>{t('bpCostAboveSell')}</Badge>}
          </div>
        )
      },
    },
    {
      key: 'sell_price',
      label: t('bpColSellPrice'),
      className: 'text-right whitespace-nowrap',
      render: (p: Product) => formatCurrency(toNumber(p.sell_price)),
    },
    {
      key: 'base_price',
      label: t('bpColBasePrice'),
      className: 'text-right md:w-48',
      render: (p: Product) => {
        // Produk bervarian menyimpan modal di tiap variannya; endpoint ini
        // hanya menulis modal induk, jadi barisnya tidak bisa diisi di sini.
        if (p.has_variant) return <span className="text-xs text-muted-foreground">{t('bpPerVariant')}</span>
        const current = toNumber(p.base_price)
        const value = drafts[p.id]?.text ?? (current > 0 ? String(current) : '')
        return (
          <NumericInput
            min={0}
            step="any"
            value={value}
            readOnly={!canEdit}
            onChange={(e) => editRow(p, e.target.value)}
            placeholder={t('bpCostHint')}
            aria-label={t('bpInputLabel', { name: p.name })}
            className={cn(inputClass, 'text-right md:ml-auto md:w-40', changedIds.has(p.id) ? 'border-blue-500' : 'border-border', !canEdit && 'bg-muted text-muted-foreground')}
          />
        )
      },
    },
  ]

  const showEmpty = mode === 'missing' && !search && !active.isLoading && !active.error && total === 0

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <Header title={t('bpTitle')} subtitle={t('bpPageSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-5">

        {/* Penghitung + petunjuk */}
        <div className="flex items-start gap-3 rounded-2xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-4 py-3">
          <Info size={18} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {missingQuery.isLoading ? '…' : t('bpSubtitle', { count: missingTotal })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('bpHint', { count: missingTotal })}</p>
            {!canEdit && <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{t('bpReadOnly')}</p>}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 md:px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
            {/* Saring: hanya yang belum ada HPP vs semua produk */}
            <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit" role="group" aria-label={t('bpColBasePrice')}>
              {([
                { key: 'missing', label: t('bpFilterMissing') },
                { key: 'all', label: t('bpFilterAll') },
              ] as const).map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  aria-pressed={mode === opt.key}
                  onClick={() => switchMode(opt.key)}
                  className={cn('px-3 py-1.5 text-sm font-semibold rounded-lg transition', mode === opt.key ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="w-full sm:w-auto sm:flex-1 sm:max-w-xs sm:ml-auto">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => { setSearchInput(e.target.value); setPage(1) }}
                  placeholder={t('bpSearch')}
                  aria-label={t('bpSearch')}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {mode === 'missing' && <p className="mt-1 text-[11px] text-muted-foreground">{t('bpSearchPageOnly')}</p>}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={rows}
            loading={active.isLoading}
            error={active.error}
            onRetry={() => active.refetch()}
            emptyMessage={t('bpNoSearchResult')}
            emptySlot={showEmpty ? (
              <EmptyState icon={<CheckCircle2 size={28} className="text-success" />} title={t('bpEmpty')} description={t('bpEmptyDesc')} />
            ) : undefined}
          />
          <Pagination page={page} total={total} limit={PAGE_LIMIT} onChange={setPage} />
        </div>

        {/* Bilah simpan menempel di bawah: pemilik yang mengisi tiga puluh
            baris tidak perlu menggulung balik untuk menemukan tombolnya. */}
        {canEdit && (
          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur px-4 py-3 shadow-lg">
            <p className="text-sm text-muted-foreground">
              {changes.length > 0 ? t('bpUnsaved', { count: changes.length }) : t('bpSubtitle', { count: missingTotal })}
            </p>
            <div className="flex gap-2">
              {changes.length > 0 && (
                <Button type="button" variant="outline" disabled={saveMut.isPending} onClick={() => setDrafts({})}>
                  {t('bpDiscard')}
                </Button>
              )}
              <Button type="button" disabled={changes.length === 0 || saveMut.isPending} onClick={() => saveMut.mutate(changes)}>
                {saveMut.isPending ? t('saving') : changes.length === 0 ? t('bpSave') : t('bpSaveCount', { count: changes.length })}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
