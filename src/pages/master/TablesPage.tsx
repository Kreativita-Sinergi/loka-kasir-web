import Form from '@/components/ui/Form'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, LayoutGrid, List, GitBranch, QrCode, BookmarkCheck, BookmarkX, CheckCheck } from 'lucide-react'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import TableQrModal from '@/components/tables/TableQrModal'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { getTablesByOutlet, createTable, updateTable, deleteTable, clearTable } from '@/api/tables'
import { getOutletsByBusiness } from '@/api/outlets'
import { getProducts } from '@/api/products'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import type { Table, Outlet } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

// Fungsi, bukan konstanta: labelnya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci.
const tableStatusConfig = (): Record<string, { label: string; variant: 'green' | 'red' | 'yellow' | 'gray' }> => ({
  available: { label: t('labelAvailable'),   variant: 'green' },
  occupied:  { label: t('statusOccupied'),     variant: 'red' },
  reserved:  { label: t('tableStatusReserved'), variant: 'yellow' },
})

const TABLE_MAP_STYLE: Record<string, { card: string; border: string; text: string }> = {
  available: {
    card:   'bg-card',
    border: 'border-green-300 dark:border-green-500/20',
    text:   'text-green-700 dark:text-green-400',
  },
  occupied: {
    card:   'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-300 dark:border-red-500/20',
    text:   'text-red-600 dark:text-red-400',
  },
  reserved: {
    card:   'bg-yellow-50 dark:bg-yellow-500/10',
    border: 'border-yellow-300 dark:border-yellow-500/20',
    text:   'text-yellow-700 dark:text-yellow-400',
  },
}

export default function TablesPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { selected: globalOutlet } = useOutletStore()
  const businessId = user?.business?.id ?? ''

  const [selectedOutletId, setSelectedOutletId] = useState<string>(globalOutlet?.id ?? '')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [showForm, setShowForm] = useState(false)
  const [editTable, setEditTable] = useState<Table | null>(null)
  const [tableNumber, setTableNumber] = useState('')
  const [qrTable, setQrTable] = useState<Table | null>(null)
  const [tableKind, setTableKind] = useState<'DINE' | 'RENTAL'>('DINE')
  const [rentalProductId, setRentalProductId] = useState('')

  // Produk bertimer untuk meja rental. Daftar produk tidak punya saringan
  // mode timer, jadi disaring di sini; jumlah produk bertimer selalu sedikit.
  const { data: timedData } = useQuery({
    queryKey: ['timed-products', businessId],
    queryFn: () => getProducts({ page: 1, limit: 500 }),
    enabled: showForm && tableKind === 'RENTAL',
    staleTime: 60_000,
  })
  const timedProducts = (timedData?.data?.data ?? []).filter((p) => p.timer_mode === 'PAKET' || p.timer_mode === 'METER')

  const { data: outletsData } = useQuery({
    queryKey: ['outlets-selector', businessId],
    queryFn: () => getOutletsByBusiness(businessId, { limit: 50, page: 1 }),
    enabled: !!businessId,
    staleTime: 60_000,
  })
  const outlets: Outlet[] = outletsData?.data?.data ?? []

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tables', selectedOutletId, viewMode === 'map' ? 'map' : { page }],
    queryFn: () => getTablesByOutlet(selectedOutletId, viewMode === 'map' ? { page: 1, limit: 100 } : { page, limit: 30 }),
    enabled: !!selectedOutletId,
  })

  const tables = data?.data?.data ?? []
  const pagination = data?.data?.pagination

  const createMut = useMutation({
    mutationFn: () => createTable({
      outlet_id: selectedOutletId,
      number: tableNumber,
      kind: tableKind,
      rental_product_id: tableKind === 'RENTAL' ? rentalProductId : null,
    }),
    onSuccess: () => {
      toast.success(t('tableCreated'))
      qc.invalidateQueries({ queryKey: ['tables', selectedOutletId] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateTable(editTable!.id, {
      number: tableNumber,
      kind: tableKind,
      rental_product_id: tableKind === 'RENTAL' ? rentalProductId : null,
    }),
    onSuccess: () => {
      toast.success(t('tableUpdated'))
      qc.invalidateQueries({ queryKey: ['tables', selectedOutletId] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // Status manual hanya kosong ↔ dipesan. Meja terisi mengikuti tagihan terbuka
  // dan tidak bisa diubah dari sini.
  const statusMut = useMutation({
    mutationFn: ({ table, status }: { table: Table; status: 'available' | 'reserved' }) =>
      updateTable(table.id, { number: table.number, status }),
    onSuccess: (_, { table, status }) => {
      toast.success(t(status === 'reserved' ? 'tableMarkedReserved' : 'tableMarkedAvailable', { name: table.number }))
      qc.invalidateQueries({ queryKey: ['tables', selectedOutletId] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // Kosongkan meja terisi: server menolak bila tagihannya belum lunas.
  const clearMut = useMutation({
    mutationFn: (table: Table) => clearTable(table.id),
    onSuccess: (_, table) => {
      toast.success(t('tableCleared', { name: table.number }))
      qc.invalidateQueries({ queryKey: ['tables', selectedOutletId] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const handleClear = (table: Table) => {
    if (!confirm(t('tableClearConfirm', { name: table.number }))) return
    clearMut.mutate(table)
  }

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTable(id),
    onSuccess: () => {
      toast.success(t('tableDeleted'))
      qc.invalidateQueries({ queryKey: ['tables', selectedOutletId] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => {
    setEditTable(null); setTableNumber(''); setTableKind('DINE'); setRentalProductId(''); setShowForm(true)
  }
  const openEdit = (t: Table) => {
    setEditTable(t); setTableNumber(t.number)
    setTableKind(t.kind ?? 'DINE'); setRentalProductId(t.rental_product_id ?? '')
    setShowForm(true)
  }
  const closeForm = () => { setShowForm(false); setEditTable(null); setTableNumber('') }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tableNumber.trim()) { toast.error(t('tableNumberRequired')); return }
    if (tableKind === 'RENTAL' && !rentalProductId) { toast.error(t('tableRentalProductRequired')); return }
    if (editTable) updateMut.mutate(); else createMut.mutate()
  }

  const handleDelete = (table: Table) => {
    if (!confirm(t('confirmDeleteNamed', { name: table.number }))) return
    deleteMut.mutate(table.id)
  }

  const columns = [
    {
      key: 'number',
      label: t('tableNumber'),
      render: (row: Table) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-50 dark:bg-amber-500/10 rounded-lg flex items-center justify-center">
            <LayoutGrid size={14} className="text-amber-600 dark:text-amber-400" />
          </div>
          <p className="font-semibold text-foreground">{row.number}</p>
          {row.kind === 'RENTAL' && <Badge variant="gray">{t('tableKindRentalBadge')}</Badge>}
        </div>
      ),
    },
    {
      key: 'status',
      label: t('labelStatus'),
      render: (row: Table) => {
        const cfg = tableStatusConfig()[row.status] ?? { label: row.status, variant: 'gray' as const }
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      },
    },
    {
      key: 'actions',
      label: '',
      render: (row: Table) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setQrTable(row)}
            title={t('tableQrMenu')}
            aria-label={t('tableQrMenu')}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:bg-muted transition"
          >
            <QrCode size={15} />
          </button>
          {row.status === 'occupied' && (
            <button
              onClick={() => handleClear(row)}
              disabled={clearMut.isPending}
              title={t('tableClear')}
              aria-label={t('tableClear')}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 dark:hover:text-green-400 hover:bg-muted disabled:opacity-50 transition"
            >
              <CheckCheck size={15} />
            </button>
          )}
          {row.status !== 'occupied' && (
            <button
              onClick={() => statusMut.mutate({ table: row, status: row.status === 'reserved' ? 'available' : 'reserved' })}
              disabled={statusMut.isPending}
              title={row.status === 'reserved' ? t('tableMarkAvailable') : t('tableMarkReserved')}
              aria-label={row.status === 'reserved' ? t('tableMarkAvailable') : t('tableMarkReserved')}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-muted disabled:opacity-50 transition"
            >
              {row.status === 'reserved' ? <BookmarkX size={15} /> : <BookmarkCheck size={15} />}
            </button>
          )}
          <EditButton onClick={() => { openEdit(row) }} />
          <DeleteButton onClick={() => { handleDelete(row) }} />
        </div>
      ),
    },
  ]

  const isPending = createMut.isPending || updateMut.isPending
  const selectedOutletName = outlets.find(o => o.id === selectedOutletId)?.name

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <Header title={t('navTables')} subtitle={t('tablePageSubtitle')} />
      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6">
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
            {/* Outlet picker */}
            <div className="flex items-center gap-2">
              <GitBranch size={14} className="text-muted-foreground" />
              <SearchableSelect
                value={selectedOutletId}
                onChange={(v) => { setSelectedOutletId(v); setPage(1) }}
                options={outlets.map(o => ({ value: o.id, label: o.name }))}
                placeholder={t('pickOutlet')}
                size="sm"
                label={t('labelOutlet')}
                className="w-auto min-w-44"
              />
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
              <button
                onClick={() => setViewMode('map')}
                title={t('viewFloorPlan')}
                aria-label={t('viewFloorPlan')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'map' ? 'bg-card text-blue-600 dark:text-blue-400 shadow-sm' : 'text-muted-foreground hover:text-muted-foreground'}`}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title={t('viewList')}
                aria-label={t('viewList')}
                className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-card text-blue-600 dark:text-blue-400 shadow-sm' : 'text-muted-foreground hover:text-muted-foreground'}`}
              >
                <List size={15} />
              </button>
            </div>

            <p className="text-sm text-muted-foreground ml-auto shrink-0">
              {t('totalColon')} <span className="font-semibold text-foreground">{pagination?.total ?? 0}</span>
            </p>
            <button
              onClick={openCreate}
              disabled={!selectedOutletId}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shrink-0"
            >
              <Plus size={14} />
              {t('tableAdd')}
            </button>
          </div>

          {!selectedOutletId ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {t('tablePickOutletFirst')}
            </div>
          ) : viewMode === 'map' ? (
            /* ── Map View ── */
            <div className="p-5">
              {isLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : tables.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">{t('tableEmpty')}</div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {(tables as Table[]).map((t) => {
                    const style = TABLE_MAP_STYLE[t.status] ?? { card: 'bg-card', border: 'border-border', text: 'text-muted-foreground' }
                    const cfg = tableStatusConfig()[t.status] ?? { label: t.status, variant: 'gray' as const }
                    return (
                      <button
                        key={t.id}
                        onClick={() => openEdit(t)}
                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 ${style.card} ${style.border} hover:opacity-80 transition cursor-pointer h-24`}
                      >
                        <span className="text-2xl">&#x1FA91;</span>
                        <p className="text-sm font-bold text-foreground leading-tight">{t.number}</p>
                        <span className={`text-xs font-medium ${style.text}`}>{cfg.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── List View ── */
            <>
              <DataTable
                columns={columns as never[]}
                data={tables as never[]}
                loading={isLoading} error={error} onRetry={refetch}
                emptyMessage={t('tableEmpty')}
              />
              <Pagination page={page} total={pagination?.total ?? 0} limit={30} onChange={setPage} />
            </>
          )}
        </div>
      </div>

      <Modal open={showForm} onClose={closeForm} title={editTable ? t('tableEdit') : t('tableAdd')} size="sm">
        <Form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{t('tableLabel')} <span className="text-red-500 dark:text-red-400">*</span></label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder={t('tableLabelExample')}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">{t('tableKindLabel')}</label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-xl">
              {(['DINE', 'RENTAL'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setTableKind(kind)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition ${tableKind === kind ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  {kind === 'DINE' ? t('tableKindDine') : t('tableKindRental')}
                </button>
              ))}
            </div>
          </div>
          {tableKind === 'RENTAL' && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">{t('tableRentalProduct')} <span className="text-red-500 dark:text-red-400">*</span></label>
              {timedData && timedProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">{t('tableRentalNoProduct')}</p>
              ) : (
                <select
                  value={rentalProductId}
                  onChange={(e) => setRentalProductId(e.target.value)}
                  className="w-full py-2 px-3 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">—</option>
                  {timedProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">{t('tableRentalProductHint')}</p>
            </div>
          )}
          {editTable && (
            editTable.status === 'occupied' ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">{t('tableOccupiedHint')}</p>
                <button
                  type="button"
                  onClick={() => handleClear(editTable)}
                  disabled={clearMut.isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-green-300 dark:border-green-500/30 text-green-700 dark:text-green-400 text-sm font-semibold rounded-xl hover:bg-green-50 dark:hover:bg-green-500/10 disabled:opacity-60 transition"
                >
                  <CheckCheck size={14} />
                  {t('tableClear')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => statusMut.mutate({ table: editTable, status: editTable.status === 'reserved' ? 'available' : 'reserved' })}
                disabled={statusMut.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-yellow-300 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-400 text-sm font-semibold rounded-xl hover:bg-yellow-50 dark:hover:bg-yellow-500/10 disabled:opacity-60 transition"
              >
                {editTable.status === 'reserved' ? <BookmarkX size={14} /> : <BookmarkCheck size={14} />}
                {editTable.status === 'reserved' ? t('tableMarkAvailable') : t('tableMarkReserved')}
              </button>
            )
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeForm} className="flex-1 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition">
              {t('actionCancel')}
            </button>
            <button type="submit" disabled={isPending} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition">
              {isPending ? t('saving') : editTable ? t('actionSave') : t('actionAdd')}
            </button>
          </div>
        </Form>
      </Modal>

      {qrTable && (
        <TableQrModal
          table={qrTable}
          outletName={selectedOutletName}
          open={!!qrTable}
          onClose={() => setQrTable(null)}
        />
      )}
    </div>
  )
}
