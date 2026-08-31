import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/api/library'
import type { Category } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

const emptyForm = { name: '', parent_id: '' }

export default function CategoriesTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['categories', { page, limit: 10 }],
    queryFn: () => getCategories({ page, limit: 10 }),
  })

  // Fetch all categories (flat list) for parent select
  const { data: allData } = useQuery({
    queryKey: ['categories', { page: 1, limit: 100 }],
    queryFn: () => getCategories({ page: 1, limit: 100 }),
  })

  const items = data?.data?.data ?? []
  const allItems: Category[] = allData?.data?.data ?? []
  const pagination = data?.data?.pagination

  const createMut = useMutation({
    mutationFn: () => createCategory({ name: form.name, parent_id: form.parent_id || null }),
    onSuccess: () => { toast.success(t('categoryCreated')); qc.invalidateQueries({ queryKey: ['categories'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateCategory(editing!.id, { name: form.name, parent_id: form.parent_id || null }),
    onSuccess: () => { toast.success(t('categoryUpdated')); qc.invalidateQueries({ queryKey: ['categories'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: (res) => {
      // Berapa produk yang benar-benar terlepas dijawab server, bukan diambil
      // dari baris tabel yang bisa saja sudah basi ketika tombolnya ditekan.
      const detached = res.data?.data?.detached_product_count ?? 0
      toast.success(detached > 0
        ? t('categoryDeletedDetached', { count: detached })
        : t('categoryDeleted'))
      qc.invalidateQueries({ queryKey: ['categories'] })
      // Produk ikut berubah: sebagian kehilangan kategorinya.
      qc.invalidateQueries({ queryKey: ['products'] })
      setDeleteTarget(null)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true) }
  const openEdit = (row: Category) => {
    setEditing(row)
    setForm({ name: row.name, parent_id: row.parent_id ?? '' })
    setModal(true)
  }

  // Exclude self from parent options when editing
  const parentOptions = allItems.filter((c) => !editing || c.id !== editing.id)

  const columns = [
    {
      key: 'name', label: t('categoryName'),
      render: (row: Category) => (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">{row.name}</span>
          {row.parent_id && (
            <span className="text-xs text-muted-foreground">
              {t('categorySubOf', { parent: allItems.find((c) => c.id === row.parent_id)?.name ?? row.parent_id })}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions', label: '',
      render: (row: Category) => (
        <div className="flex gap-1 justify-end">
          <EditButton onClick={() => openEdit(row)} />
          <DeleteButton onClick={() => setDeleteTarget(row)} />
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="bg-card rounded-2xl border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('categoryCountLabel', { count: pagination?.total ?? 0 })}</span>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
            <Plus size={15} /> {t('actionAdd')}
          </button>
        </div>
        <DataTable columns={columns as never[]} data={items as never[]} loading={isLoading} />
        <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? t('categoryEdit') : t('categoryAdd')} size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (editing) updateMut.mutate()
            else createMut.mutate()
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('categoryName')}</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('categoryExample')} required className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('categoryParent')} <span className="text-muted-foreground font-normal">(Opsional)</span></label>
            <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card">
              <option value="">{t('categoryNoParent')}</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : t('actionSave')}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('categoryDelete')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('categoryDeleteConfirm')}</p>
          {/* Hanya muncul bila memang ada produknya. Peringatan yang selalu
              tampil akan dilewati begitu saja, dan justru pada kategori yang
              benar-benar dipakai itulah ia perlu dibaca. */}
          {(deleteTarget?.product_count ?? 0) > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl px-3 py-2.5">
              {t('categoryDeleteProductWarning', { count: deleteTarget!.product_count! })}
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
            <button onClick={() => deleteMut.mutate(deleteTarget!.id)} disabled={deleteMut.isPending} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {deleteMut.isPending ? t('actionDeleting') : t('actionDelete')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
