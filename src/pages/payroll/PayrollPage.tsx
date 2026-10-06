import { useState } from 'react'
import Header from '@/components/layout/Header'
import PayrollSlipsTab from '@/components/payroll/PayrollSlipsTab'
import PayrollComponentsTab from '@/components/payroll/PayrollComponentsTab'
import PayrollStageSettingsTab from '@/components/payroll/PayrollStageSettingsTab'
import { t } from '@/lib/i18n'

/**
 * Gaji Karyawan — layar pemilik: slip yang terbit, komponen gaji, dan tahapan
 * pembayaran. Seluruh endpoint-nya dijaga pemilik + paket Pro di server; gerbang
 * Pro dan peran dipasang di router, bukan di sini.
 *
 * Tab-nya mengikuti gaya halaman Tim. Tab yang tidak aktif TIDAK dirender:
 * tiap tab memuat query-nya sendiri, dan merender ketiganya sekaligus berarti
 * tiga panggilan jaringan setiap kali halaman dibuka.
 */
const TABS = [
  { key: 'slips', labelKey: 'payrollTabSlips', render: () => <PayrollSlipsTab /> },
  { key: 'components', labelKey: 'payrollTabComponents', render: () => <PayrollComponentsTab /> },
  { key: 'settings', labelKey: 'payrollTabSettings', render: () => <PayrollStageSettingsTab /> },
] as const

export default function PayrollPage() {
  const [active, setActive] = useState<(typeof TABS)[number]['key']>('slips')
  const current = TABS.find(tab => tab.key === active) ?? TABS[0]

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0 overflow-hidden">
      <Header title={t('payrollTitle')} subtitle={t('payrollSubtitle')} />
      <div className="border-b border-border px-4 md:px-6">
        <div role="tablist" className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={current.key === tab.key}
              onClick={() => setActive(tab.key)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition ${
                current.key === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">{current.render()}</div>
    </div>
  )
}
