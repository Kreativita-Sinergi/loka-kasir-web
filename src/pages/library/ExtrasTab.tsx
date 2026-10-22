import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Layers } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import { DataTable } from '@/components/ui/Table'
import Modal from '@/components/ui/Modal'
import ModifierGroupEditor from '@/components/products/ModifierGroupEditor'
import { getModifierGroups, deleteModifierGroup } from '@/api/products'
import type { ModifierGroup } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import { modifierRuleLabel } from '@/lib/modifierGroups'
import { t } from '@/lib/i18n'

/**
 * Grup ekstra: daftar pilihan bernama ("Level", "Topping") yang dipasang ke
 * banyak produk sekaligus. Server menyalin pilihannya ke modifier setiap
 * produk itu, jadi kasir, struk, dan laporan membaca ekstra seperti biasa.
 */
export default function ExtrasTab() {
  const qc = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<ModifierGroup | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['modifier-groups'],
    queryFn: async () => (await getModifierGroups()).data.data ?? [],
  })
  const items = data ?? []

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteModifierGroup(id),
    onSuccess: () => {
      toast.success(t('extraDeleted'))
      qc.invalidateQueries({ queryKey: ['modifier-groups'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setDeleteId(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const open = (row: ModifierGroup | null) => { setEditing(row); setEditorOpen(true) }

  const columns = [
    {
      key: 'name', label: t('extraGroupName'),
      render: (row: ModifierGroup) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{row.name}</div>
          {/* Ringkas: nama grup besar (Prasmanan 26 isian) mendorong kolom lain keluar layar. */}
          <div className="text-xs text-muted-foreground truncate max-w-[22rem]">
            {row.options.slice(0, 3).map((o) => o.name).join(', ')}
            {row.options.length > 3 ? ` +${row.options.length - 3}` : ''}
          </div>
        </div>
      ),
    },
    { key: 'rule', label: t('extraPickRule'), render: (row: ModifierGroup) => <span className="text-sm text-muted-foreground">{modifierRuleLabel(row)}</span> },
    {
      key: 'count', label: t('extraProducts'),
      render: (row: ModifierGroup) => (
        <span className="text-sm text-muted-foreground">
          {t('extraOptionsCount', { count: row.options.length })} · {t('extraProductsCount', { count: row.product_ids.length })}
        </span>
      ),
    },
    {
      key: 'actions', label: '',
      render: (row: ModifierGroup) => (
        <div className="flex gap-1 justify-end">
          <EditButton onClick={() => open(row)} />
          <DeleteButton onClick={() => setDeleteId(row.id)} />
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="bg-card rounded-2xl border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">{t('extraCountLabel', { count: items.length })}</span>
          <button onClick={() => open(null)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shrink-0">
            <Plus size={15} /> {t('extraAdd')}
          </button>
        </div>
        <p className="px-5 pt-3 text-xs text-muted-foreground">{t('extraIntro')}</p>
        <DataTable columns={columns as never[]} data={items as never[]} loading={isLoading} error={error} onRetry={refetch} emptySlot={<EmptyState icon={<Layers size={24} />} title={t('extraEmptyTitle')} description={t('extraEmptyBody')} action={{ label: t('extraAdd'), icon: <Plus size={14} />, onClick: () => open(null) }} />} />
      </div>

      <ModifierGroupEditor open={editorOpen} group={editing} onClose={() => setEditorOpen(false)} />

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={t('extraDelete')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('extraDeleteConfirm')}</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
            <button onClick={() => deleteMut.mutate(deleteId!)} disabled={deleteMut.isPending} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {deleteMut.isPending ? t('saving') : t('actionDelete')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
