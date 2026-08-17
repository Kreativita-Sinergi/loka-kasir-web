import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck, Plus, Settings2, Lock,
  Users, ChevronRight,
} from 'lucide-react'
import { EditButton, DeleteButton } from '@/components/ui/RowActions'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import {
  getRoles, createRole, updateRole, deleteRole,
  getAllPermissions, getRolePermissions, updateRolePermissions,
} from '@/api/master'
import type { Permission } from '@/api/master'
import { getErrorMessage } from '@/lib/utils'
import type { Role } from '@/types'
import { t } from '@/lib/i18n'
import { roleLabel } from '@/lib/roles'
import type { MessageKey } from '@/lib/messages'

// ─── Constants ────────────────────────────────────────────────────────────────

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu.
// Nama & keterangan izin datang dari database, dan di sana isinya bahasa
// Indonesia — hasil seeder, bukan hasil terjemahan. Header `Accept-Language`
// tidak menyentuhnya, jadi satu-satunya tempat izin bisa dibaca dalam bahasa
// pengguna adalah di sini, dipetakan lewat `code` yang memang stabil.
//
// Kode yang belum ada di peta ini jatuh ke nilai dari server: izin baru yang
// baru di-seed tetap tampil (berbahasa Indonesia) alih-alih hilang dari daftar.
const PERMISSION_KEYS: Record<string, string> = {
  'pos.open_shift': 'permPosOpenShift',
  'pos.create_order': 'permPosCreateOrder',
  'pos.do_payment': 'permPosDoPayment',
  'pos.refund': 'permPosRefund',
  'pos.cancel_order': 'permPosCancelOrder',
  'pos.view_kds': 'permPosViewKds',
  'pos.update_kds': 'permPosUpdateKds',
  'pos.view_tables': 'permPosViewTables',
  'pos.manage_tables': 'permPosManageTables',
  'pos.supervisor_override': 'permPosSupervisorOverride',
  'reports.view': 'permReportsView',
  'reports.financial': 'permReportsFinancial',
  'reports.shift': 'permReportsShift',
  'reports.profitability': 'permReportsProfitability',
  'inventory.view': 'permInventoryView',
  'inventory.edit': 'permInventoryEdit',
  'inventory.transfer': 'permInventoryTransfer',
  'inventory.hpp': 'permInventoryHpp',
  'inventory.supplier': 'permInventorySupplier',
  'inventory.purchase_order': 'permInventoryPurchaseOrder',
  'employee.view': 'permEmployeeView',
  'employee.manage': 'permEmployeeManage',
  'settings.view': 'permSettingsView',
  'settings.edit': 'permSettingsEdit',
  'rbac.manage': 'permRbacManage',
}

const permName = (p: Permission): string => {
  const key = PERMISSION_KEYS[p.code]
  return key ? t(key as MessageKey) : p.name
}

const permDescription = (p: Permission): string | undefined => {
  const key = PERMISSION_KEYS[p.code]
  return key ? t((key + 'Desc') as MessageKey) : p.description
}

const moduleLabels = (): Record<string, string> => ({
  pos: t('rbacTxAndCashier'),
  reports: t('navGroupReports'),
  inventory: t('rbacModuleInventory'),
  employee: t('navEmployees'),
  settings: t('navGroupSettings'),
})

/**
 * System roles that cannot be deleted — mirrors entity/role.go in the backend.
 * Order: OWNER, ADMIN, MANAGER, WAREHOUSE, KASIR, WAITERS, STAFF
 */
const SYSTEM_ROLE_CODES = [
  'OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE', 'KASIR', 'WAITERS', 'STAFF',
]

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  OWNER:     { bg: 'bg-purple-50 dark:bg-purple-500/10',  text: 'text-purple-700 dark:text-purple-400',  border: 'border-purple-200 dark:border-purple-500/20' },
  ADMIN:     { bg: 'bg-blue-50 dark:bg-blue-500/10',    text: 'text-blue-700 dark:text-blue-400',    border: 'border-blue-200 dark:border-blue-500/20'   },
  MANAGER:   { bg: 'bg-indigo-50 dark:bg-indigo-500/10',  text: 'text-indigo-700 dark:text-indigo-400',  border: 'border-indigo-200 dark:border-indigo-500/20' },
  WAREHOUSE: { bg: 'bg-amber-50 dark:bg-amber-500/10',   text: 'text-amber-700 dark:text-amber-400',   border: 'border-amber-200 dark:border-amber-500/20'  },
  KASIR:     { bg: 'bg-green-50 dark:bg-green-500/10',   text: 'text-green-700 dark:text-green-400',   border: 'border-green-200 dark:border-green-500/20'  },
  WAITERS:   { bg: 'bg-orange-50 dark:bg-orange-500/10',  text: 'text-orange-700 dark:text-orange-400',  border: 'border-orange-200 dark:border-orange-500/20' },
  STAFF:     { bg: 'bg-muted',    text: 'text-muted-foreground',    border: 'border-border'   },
}

function roleColor(code?: string) {
  return ROLE_COLORS[code ?? ''] ?? { bg: 'bg-muted', text: 'text-foreground', border: 'border-border' }
}

// ─── Permission Matrix Modal ───────────────────────────────────────────────────

function PermissionModal({ role, onClose }: { role: Role; onClose: () => void }) {
  const qc = useQueryClient()

  const { data: allPermsData, isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions-all'],
    queryFn: getAllPermissions,
    staleTime: 10 * 60_000,
  })

  const { data: grantedData, isLoading: loadingGranted } = useQuery({
    queryKey: ['role-permissions', role.id],
    queryFn: () => getRolePermissions(role.id),
  })

  const [checked, setChecked] = useState<Set<number>>(() => new Set())
  const [initialized, setInitialized] = useState(false)

  if (!initialized && grantedData?.data?.data) {
    setChecked(new Set(grantedData.data.data))
    setInitialized(true)
  }

  const saveMut = useMutation({
    mutationFn: () => updateRolePermissions(role.id, [...checked]),
    onSuccess: () => {
      toast.success(t('rbacSaved'))
      qc.invalidateQueries({ queryKey: ['role-permissions', role.id] })
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const allPerms: Permission[] = allPermsData?.data?.data ?? []
  const byModule = allPerms.reduce<Record<string, Permission[]>>((acc, p) => {
    ;(acc[p.module] ??= []).push(p)
    return acc
  }, {})

  const toggle = (id: number) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })

  const toggleModule = (perms: Permission[]) => {
    const allChecked = perms.every((p) => checked.has(p.id))
    setChecked((prev) => {
      const next = new Set(prev)
      perms.forEach((p) => (allChecked ? next.delete(p.id) : next.add(p.id)))
      return next
    })
  }

  const loading = loadingPerms || loadingGranted

  return (
    <Modal open onClose={onClose} title={t('rbacPermTitle', { role: roleLabel(role) })} size="md">
      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">{t('loadingData')}</div>
      ) : (
        <div className="space-y-3">
          {/* Lencana kode dihapus dengan alasan yang sama seperti di kartu
              peran; judul modal ini sudah menyebut nama perannya. */}
          <p className="text-xs text-muted-foreground pb-1">
            {t('rbacCheckHint')}
          </p>

          {/* Module groups */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {Object.entries(byModule).map(([mod, perms]) => {
              const allChecked = perms.every((p) => checked.has(p.id))
              const someChecked = perms.some((p) => checked.has(p.id))
              return (
                <div key={mod} className="border border-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleModule(perms)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-muted hover:bg-muted transition text-left"
                  >
                    <input
                      type="checkbox"
                      readOnly
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked }}
                      className="w-4 h-4 rounded border-border text-blue-600 dark:text-blue-400 pointer-events-none"
                    />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      {moduleLabels()[mod] ?? mod}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {perms.filter((p) => checked.has(p.id)).length}/{perms.length}
                    </span>
                  </button>
                  <div className="divide-y divide-border">
                    {perms.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-blue-50/40 cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={checked.has(p.id)}
                          onChange={() => toggle(p.id)}
                          className="mt-0.5 w-4 h-4 rounded border-border text-blue-600 dark:text-blue-400 focus:ring-blue-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{permName(p)}</p>
                          {permDescription(p) && (
                            <p className="text-xs text-muted-foreground mt-0.5">{permDescription(p)}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition"
            >
              {t('actionCancel')}
            </button>
            <button
              type="button"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {saveMut.isPending ? 'Menyimpan...' : t('actionSaveChanges')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Role Card ─────────────────────────────────────────────────────────────────

function RoleCard({
  role,
  onEdit,
  onDelete,
  onManage,
}: {
  role: Role
  onEdit: (r: Role) => void
  onDelete: (r: Role) => void
  onManage: (r: Role) => void
}) {
  const isSystem = SYSTEM_ROLE_CODES.includes(role.code ?? '')
  const colors = roleColor(role.code)

  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-sm transition-shadow flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} border ${colors.border}`}>
            <ShieldCheck size={18} className={colors.text} />
          </div>
          <div>
            {/* Kode perannya (OWNER, KASIR, WAITERS) sengaja tidak ditampilkan.
                Ia pengenal internal yang hanya mengulang nama tepat di atasnya,
                dan dua di antaranya kata Indonesia — pemilik toko di Tokyo tidak
                punya alasan membaca "KASIR" di bawah tulisan "レジ担当". Warnanya
                tetap diturunkan dari kode, jadi tiap peran masih dikenali sekilas
                tanpa memajang kodenya. */}
            <p className="text-sm font-semibold text-foreground">{roleLabel(role)}</p>
          </div>
        </div>

        {isSystem && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted border border-border px-2 py-1 rounded-lg shrink-0">
            <Lock size={9} />
            {t('statusSystem')}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border">
        <button
          onClick={() => onManage(role)}
          className="flex-1 flex items-center justify-between px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:bg-blue-500/15 rounded-xl transition"
        >
          <span className="w-[11px]" />
          <span className="flex items-center gap-1.5">
            <Settings2 size={12} />
            {t('rbacManagePermissions')}
          </span>
          <ChevronRight size={11} />
        </button>

        {!isSystem && (
          <>
            <EditButton onClick={() => onEdit(role)} label={t('rbacRename')} />
            <DeleteButton onClick={() => onDelete(role)} label={t('rbacDeleteRole')} />
          </>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RbacPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editRole, setEditRole] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [permRole, setPermRole] = useState<Role | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  })

  const roles: Role[] = data?.data?.data ?? []

  const createMut = useMutation({
    mutationFn: () => createRole({ name }),
    onSuccess: () => {
      toast.success(t('rbacRoleCreated'))
      qc.invalidateQueries({ queryKey: ['roles'] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const updateMut = useMutation({
    mutationFn: () => updateRole(editRole!.id, { name }),
    onSuccess: () => {
      toast.success(t('rbacRoleUpdated'))
      qc.invalidateQueries({ queryKey: ['roles'] })
      closeForm()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => {
      toast.success(t('rbacRoleDeleted'))
      qc.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const openCreate = () => { setEditRole(null); setName(''); setShowForm(true) }
  const openEdit = (r: Role) => { setEditRole(r); setName(r.name); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditRole(null); setName('') }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error(t('rbacRoleNameRequired')); return }
    if (editRole) { updateMut.mutate() } else { createMut.mutate() }
  }

  const handleDelete = (r: Role) => {
    if (!confirm(t('confirmDeleteRole', { name: r.name }))) return
    deleteMut.mutate(r.id)
  }

  const isPending = createMut.isPending || updateMut.isPending

  // Split: system roles first, custom roles after
  const systemRoles = roles.filter((r) => SYSTEM_ROLE_CODES.includes(r.code ?? ''))
  const customRoles = roles.filter((r) => !SYSTEM_ROLE_CODES.includes(r.code ?? ''))

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={t('rbacPageTitle')}
        subtitle={t('rbacPageSubtitle')}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">

        {/* System Roles */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{t('rbacDefaultRoles')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('rbacDefaultRolesDesc')}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {systemRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onManage={(r) => setPermRole(r)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Custom Roles */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">{t('rbacCustomRoles')}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('rbacCustomRolesDesc')}</p>
            </div>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shrink-0"
            >
              <Plus size={14} />
              {t('rbacAddRoleShort')}
            </button>
          </div>

          {!isLoading && customRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-2xl text-center">
              <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center mb-3">
                <Users size={18} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">{t('rbacNoCustomRoles')}</p>
              <p className="text-xs text-muted-foreground mt-1">{t('rbacNoCustomRolesHint')}</p>
              <button
                onClick={openCreate}
                className="mt-4 flex items-center gap-2 px-4 py-2 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition"
              >
                <Plus size={13} />
                {t('rbacAddRoleShort')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {customRoles.map((role) => (
                <RoleCard
                  key={role.id}
                  role={role}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onManage={(r) => setPermRole(r)}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Create / Edit Role Modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editRole ? t('rbacRenameRole') : t('rbacAddRole')}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              {t('rbacRoleName')} <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('rbacRoleExample')}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeForm}
              className="flex-1 py-2.5 border border-border text-muted-foreground text-sm font-semibold rounded-xl hover:bg-muted transition"
            >
              {t('actionCancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {isPending ? 'Menyimpan...' : editRole ? t('actionSave') : t('rbacCreateRole')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Permission Matrix Modal */}
      {permRole && (
        <PermissionModal role={permRole} onClose={() => setPermRole(null)} />
      )}
    </div>
  )
}
