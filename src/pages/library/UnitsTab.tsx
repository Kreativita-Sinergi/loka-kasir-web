import Form from '@/components/ui/Form'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Ruler } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Modal from '@/components/ui/Modal'
import { getUnits, createUnit, updateUnit, deleteUnit } from '@/api/library'
import type { Unit } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { showLibrarySearch } from '@/lib/libraryList'
import { LibrarySearchInput, ProductUsage } from './LibraryListParts'

const emptyForm = { name: '', alias: '' }

export default function UnitsTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  // Barisnya, bukan id saja: dialog hapus perlu jumlah produk pemakainya.
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null)
  const [editing, setEditing] = useState<Unit | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['units', { page, limit: 10, search }],
    queryFn: () => getUnits({ page, limit: 10, search: search || undefined }),
  })

  const items = data?.data?.data ?? []
  const pagination = data?.data?.pagination

  const createMut = useMutation({
    mutationFn: () => createUnit({ name: form.name.trim(), alias: form.alias.trim() }),
    onSuccess: () => { toast.success(t('unitCreated')); qc.invalidateQueries({ queryKey: ['units'] }); qc.invalidateQueries({ queryKey: ['units-selector'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateUnit(editing!.id, { name: form.name.trim(), alias: form.alias.trim() }),
    onSuccess: () => { toast.success(t('unitUpdated')); qc.invalidateQueries({ queryKey: ['units'] }); qc.invalidateQueries({ queryKey: ['units-selector'] }); setModal(false) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteUnit(id),
    onSuccess: () => { toast.success(t('unitDeleted')); qc.invalidateQueries({ queryKey: ['units'] }); qc.invalidateQueries({ queryKey: ['units-selector'] }); setDeleteTarget(null) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true) }
  const openEdit = (row: Unit) => { setEditing(row); setForm({ name: row.name, alias: row.alias }); setModal(true) }

  const columns = [
    { key: 'name', label: t('labelName'), render: (row: Unit) => <span className="font-medium text-foreground">{row.name}</span> },
    { key: 'alias', label: t('labelAlias'), render: (row: Unit) => <span className="font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded">{row.alias}</span> },
    { key: 'usage', label: t('libUsageColumn'), render: (row: Unit) => <ProductUsage count={row.product_count} /> },
    {
      key: 'actions', label: '',
      render: (row: Unit) => (
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
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
          {showLibrarySearch(pagination?.total ?? 0, search) && (
            <LibrarySearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder={t('libSearchUnit')} />
          )}
          <span className="text-sm text-muted-foreground mr-auto">{t('unitTypeCountLabel', { count: pagination?.total ?? 0 })}</span>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
            <Plus size={15} /> {t('actionAdd')}
          </button>
        </div>
        <DataTable columns={columns as never[]} data={items as never[]} loading={isLoading} error={error} onRetry={refetch}
          emptyMessage={t('libNoMatch', { query: search })}
          emptySlot={search ? undefined : <EmptyState icon={<Ruler size={24} />} title={t('unitEmptyTitle')} description={t('unitEmptyBody')} action={{ label: t('unitAdd'), icon: <Plus size={14} />, onClick: openCreate }} />} />
        <Pagination page={page} total={pagination?.total ?? 0} limit={10} onChange={setPage} />
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? t('unitEdit') : t('unitAdd')} size="sm">
        <Form onSubmit={(e) => { e.preventDefault(); if (editing) updateMut.mutate(); else createMut.mutate() }} className="space-y-4">
          {[
            { key: 'name', label: t('labelName'), placeholder: t('unitExample') },
            { key: 'alias', label: t('labelAlias'), placeholder: 'kg' },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-foreground mb-1">{f.label}</label>
              <input value={form[f.key as keyof typeof form]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} required className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
            <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {createMut.isPending || updateMut.isPending ? t('saving') : t('actionSave')}
            </button>
          </div>
        </Form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('unitDelete')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('unitDeleteConfirm')}</p>
          {/* Sama dengan peringatan kategori: hanya bila memang dipakai. Satuan
              yang dipakai produk tidak dihapus permanen oleh server, hanya
              disembunyikan dari produk dan pilihan satuan. */}
          {(deleteTarget?.product_count ?? 0) > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl px-3 py-2.5">
              {t('unitDeleteProductWarning', { count: deleteTarget!.product_count! })}
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm rounded-xl hover:bg-muted">{t('actionCancel')}</button>
            <button onClick={() => deleteMut.mutate(deleteTarget!.id)} disabled={deleteMut.isPending} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-60">
              {deleteMut.isPending ? 'Menghapus...' : t('actionDelete')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
