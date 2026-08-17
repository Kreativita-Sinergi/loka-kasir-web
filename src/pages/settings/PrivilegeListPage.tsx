import { useState } from 'react'
import Header from '@/components/layout/Header'
import { t } from '@/lib/i18n'

// ─── Role data — content matches screenshots & backend permission_seeder.go ───

interface RolePrivilege {
  id: string
  label: string
  noCmsAccess?: boolean
  cmsAccess: string[]
  mobileAccess: string[]
}

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — jauh sebelum bahasa pengguna
// diketahui, dan tidak pernah dibaca ulang saat bahasanya diganti.
const roles = (): RolePrivilege[] => [
  {
    id: 'OWNER',
    label: t('roleOwner'),
    cmsAccess: [
      'Login',
      t('privOwnerSummary'),
      t('privOwnerNote'),
    ],
    mobileAccess: [
      t('privAppLogin'),
      t('privCashierLogin'),
      t('privSellAllOutlets'),
      t('privSettingsAllOutlets'),
      t('privReportsAllOutlets'),
      t('privStaffAllOutlets'),
      t('privShiftOps'),
    ],
  },
  {
    id: 'ADMIN',
    label: t('roleAdmin'),
    cmsAccess: [
      'Login',
      t('privAdminSummary'),
      t('privAdminNote'),
    ],
    mobileAccess: [
      t('privAppLogin'),
      t('privCashierLogin'),
      t('privSellRegisteredOutlets'),
      t('privSettingsRegisteredOutlets'),
      t('privSalesReports'),
      t('privStaffAndShifts'),
    ],
  },
  {
    id: 'MANAGER',
    label: t('roleManager'),
    cmsAccess: [
      'Login',
      t('privManagerSummary'),
      t('privManagerNote'),
    ],
    mobileAccess: [
      t('privAppLogin'),
      t('privCashierLogin'),
      t('privSellRegisteredOutlets'),
      t('privSettingsOutlet'),
      t('privSalesReports'),
      t('privStaffAndShifts'),
    ],
  },
  {
    id: 'WAREHOUSE',
    label: t('roleWarehouse'),
    cmsAccess: [
      'Login',
      t('privWarehouseSummary'),
    ],
    mobileAccess: [
      t('privAppLogin'),
      t('privCashierLogin'),
      t('privAttendance'),
      t('privInventoryTablet'),
    ],
  },
  {
    id: 'KASIR',
    label: t('labelCashier'),
    noCmsAccess: true,
    cmsAccess: [],
    mobileAccess: [
      t('privAppLogin'),
      t('privCashierLogin'),
      t('privSellAndShift'),
      t('privLimitedSettings'),
    ],
  },
  {
    id: 'WAITERS',
    label: t('roleWaiter'),
    noCmsAccess: true,
    cmsAccess: [],
    mobileAccess: [
      t('privAppLogin'),
      t('privOrderNoPayment'),
      t('privLimitedSettings'),
    ],
  },
  {
    id: 'STAFF',
    label: t('roleStaff'),
    noCmsAccess: true,
    cmsAccess: [],
    mobileAccess: [
      t('privAttendanceRegisteredDevice'),
    ],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivilegeListPage() {
  const [activeRole, setActiveRole] = useState('OWNER')

  const allRoles = roles()
  const role = allRoles.find((r) => r.id === activeRole) ?? allRoles[0]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={t('privPageTitle')}
        subtitle={t('privPageSubtitle')}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl">

          {/* Role Tabs */}
          <div className="flex border-b border-border mb-6">
            {allRoles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRole(r.id)}
                className={[
                  'px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                  activeRole === r.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                ].join(' ')}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Access columns */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-2">
              <div className="px-8 py-4 border-b border-r border-border">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('privWebDashboard')}</span>
              </div>
              <div className="px-8 py-4 border-b border-border">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('privRegisterApp')}</span>
              </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-2 divide-x divide-border min-h-[200px]">
              {/* CMS */}
              <div className="px-8 py-6">
                {role.noCmsAccess ? (
                  <p className="text-sm text-muted-foreground italic">
                    {role.label} {t('privNoDashboardAccess')}
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {role.cmsAccess.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-2 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-sm text-foreground leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Mobile POS */}
              <div className="px-8 py-6">
                <ul className="space-y-4">
                  {role.mobileAccess.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-2 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-sm text-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Default credentials note */}
          <div className="mt-4 px-5 py-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 rounded-xl">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">{t('privSampleAccount')}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
              {t('privSampleBody')}
              {' '}<strong>{t('privSamplePin')}</strong> · <strong>{t('privSamplePassword')}</strong> ·{' '}
              {t('privEmailFormat')} <code className="bg-blue-100 dark:bg-blue-500/15 px-1 rounded">{t('privEmailPattern')}</code>
              {'. '}{t('privChangeAfterLogin')}
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
