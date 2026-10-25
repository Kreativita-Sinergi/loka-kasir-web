import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import QueryErrorState from '@/components/ui/QueryErrorState'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ActionButton, DeleteButton, EditButton } from '@/components/ui/RowActions'
import BundleFormModal from '@/components/products/BundleFormModal'
import { deleteBundle, getBundles, setBundleActive } from '@/api/bundles'
import type { Bundle } from '@/types'
import { bundleInitials, bundleItemsPreview, bundleSaving, parseNewBundleParam } from '@/lib/bundles'
import { cn, formatCurrency, getErrorMessage } from '@/lib/utils'
import { usePermissions, PERMS } from '@/hooks/usePermissions'
import { t } from '@/lib/i18n'

/**
 * Paket: beberapa produk dijual bersama dengan satu harga ("Paket Seblak +
 * Es Teh"). Dulu paket hanya bisa DIJUAL di kasir — tidak ada satu pun layar,
 * di aplikasi maupun web, untuk membuatnya. Sejajar dengan tab Paket di
 * aplikasi (bundle_manage_screen.dart).
 *
 * `?new=a,b` membuka form paket baru berisi dua produk itu — tautan dari saran
 * "Jadikan paket" di Rapor Toko.
 */
export default function BundlesPage() {
  const qc = useQueryClient()
  const { can } = usePermissions()
  // Daftar boleh dilihat siapa pun yang melihat katalog; server menuntut
  // `inventory.edit` untuk mengubahnya, jadi tombolnya disembunyikan di muka.
  const canEdit = can(PERMS.INVENTORY_EDIT)
  const [searchParams, setSearchParams] = useSearchParams()

  // Form dibuka langsung dari tautan Rapor; parameter dibuang setelah dibaca
  // supaya muat ulang halaman tidak membuka form yang sama lagi.
  const [form, setForm] = useState<{ bundle: Bundle | null; ids: string[]; key: number } | null>(() =>
    canEdit && searchParams.has('new')
      ? { bundle: null, ids: parseNewBundleParam(searchParams.get('new')), key: 0 }
      : null)
  const [deleting, setDeleting] = useState<Bundle | null>(null)

  const closeForm = () => {
    setForm(null)
    if (searchParams.has('new')) {
      setSearchParams((prev) => { const p = new URLSearchParams(prev); p.delete('new'); return p }, { replace: true })
    }
  }
  const openForm = (bundle: Bundle | null) => setForm({ bundle, ids: [], key: Date.now() })

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bundles'],
    queryFn: getBundles,
  })
  // Server mengirim `null` bila belum ada paket sama sekali.
  const bundles: Bundle[] = Array.isArray(data?.data?.data) ? data.data.data : []

  const activeMut = useMutation({
    mutationFn: (b: Bundle) => setBundleActive(b.id, !b.is_active),
    onSuccess: (_, b) => {
      toast.success(b.is_active ? t('bdlHidden') : t('bdlShown'))
      qc.invalidateQueries({ queryKey: ['bundles'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBundle(id),
    onSuccess: () => {
      toast.success(t('bdlDeleted'))
      qc.invalidateQueries({ queryKey: ['bundles'] })
      setDeleting(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const addButton = canEdit && (
    <button
      onClick={() => openForm(null)}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shrink-0"
    >
      <Plus size={15} /> {t('bdlAdd')}
    </button>
  )

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <Header title={t('bdlTab')} subtitle={t('bdlNavDesc')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6">
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{t('bdlCount', { count: bundles.length })}</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">{t('bdlIntro')}</p>
            </div>
            {bundles.length > 0 && addButton}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-7 h-7 border-2 border-blue-200 dark:border-blue-500/20 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <QueryErrorState error={error} onRetry={refetch} />
          ) : bundles.length === 0 ? (
            <EmptyState
              title={t('bdlEmptyTitle')}
              description={t('bdlEmptyBody')}
              action={canEdit ? { label: t('bdlAdd'), icon: <Plus size={14} />, onClick: () => openForm(null) } : undefined}
            />
          ) : (
            <ul className="divide-y divide-border">
              {bundles.map((b) => {
                const saving = bundleSaving(b)
                return (
                  <li key={b.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className={cn('flex items-center gap-3 min-w-0 flex-1', !b.is_active && 'opacity-60')}>
                      <Avatar className="h-11 w-11 rounded-xl">
                        {b.image && <AvatarImage src={b.image} alt="" />}
                        <AvatarFallback className="rounded-xl bg-muted text-xs font-bold text-muted-foreground">
                          {bundleInitials(b.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{b.name}</p>
                        <p className="truncate text-xs text-muted-foreground" title={bundleItemsPreview(b)}>{bundleItemsPreview(b)}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-primary">{formatCurrency(b.sell_price ?? 0)}</span>
                          {saving > 0 && <Badge variant="green">{t('bdlSavingBadge', { amount: formatCurrency(saving) })}</Badge>}
                          {!b.is_active && <Badge variant="gray">{t('bdlInactive')}</Badge>}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1 justify-end shrink-0">
                        <EditButton onClick={() => openForm(b)} />
                        <span title={b.is_active ? t('bdlHideTitle') : t('bdlShowTitle')}>
                          <ActionButton
                            onClick={() => activeMut.mutate(b)}
                            disabled={activeMut.isPending && activeMut.variables?.id === b.id}
                          >
                            {b.is_active ? t('bdlHide') : t('bdlShow')}
                          </ActionButton>
                        </span>
                        <DeleteButton onClick={() => setDeleting(b)} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {form && (
        <BundleFormModal key={form.key} bundle={form.bundle} initialProductIds={form.ids} onClose={closeForm} />
      )}

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title={t('bdlDelete')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('bdlDeleteConfirm', { name: deleting?.name ?? '' })}</p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleting(null)}
              className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted"
            >
              {t('actionCancel')}
            </button>
            <button
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
              disabled={deleteMut.isPending}
              className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60"
            >
              {t('actionDelete')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
