import { useState } from 'react'
import Header from '@/components/layout/Header'
import EmployeesPage from '@/pages/EmployeesPage'
import AttendancePage from '@/pages/AttendancePage'
import ShiftsPage from '@/pages/ShiftsPage'
import { usePermissions, PERMS } from '@/hooks/usePermissions'
import { t } from '@/lib/i18n'

/**
 * Tim — satu pintu untuk semua urusan orang yang bekerja di toko.
 *
 * Sejajar dengan shell "Tim" di aplikasi kasir: Karyawan, Kehadiran, dan
 * Shift Kasir dulunya tiga menu terpisah di sidebar, padahal ketiganya
 * menjawab pertanyaan yang sama — siapa bekerja kapan, dan apa yang ia
 * lakukan di kasir. Pemilik yang mengecek absensi seorang kasir hampir selalu
 * lanjut melihat shift-nya; memaksanya kembali ke sidebar di antara keduanya
 * hanya memperpanjang jalan.
 *
 * Tab-nya kontekstual per izin, sama seperti di aplikasi. Yang tidak lolos
 * tidak dirender sama sekali — bukan disamarkan — karena servernya pun
 * menolaknya, dan tab yang selalu menjawab "tidak boleh" lebih membingungkan
 * daripada tab yang memang tidak ada.
 */

interface TeamTab {
  key: string
  label: string
  render: () => React.ReactNode
}

export default function TeamPage() {
  const { can, isPro } = usePermissions()

  const tabs: TeamTab[] = [
    ...(can(PERMS.EMPLOYEE_VIEW)
      ? [
          {
            key: 'employees',
            label: t('navEmployees'),
            render: () => <EmployeesPage embedded />,
          },
        ]
      : []),
    // Kehadiran menuntut paket Pro — sama seperti menu terpisahnya dulu.
    ...(can(PERMS.EMPLOYEE_VIEW) && isPro
      ? [
          {
            key: 'attendance',
            label: t('navAttendance'),
            render: () => <AttendancePage embedded />,
          },
        ]
      : []),
    ...(can(PERMS.POS_OPEN_SHIFT)
      ? [
          {
            key: 'shifts',
            label: t('navShifts'),
            render: () => <ShiftsPage embedded />,
          },
        ]
      : []),
  ]

  const [active, setActive] = useState(0)
  const current = tabs[Math.min(active, Math.max(tabs.length - 1, 0))]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('navTeam')} subtitle={t('navTeamDesc')} />

      {tabs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            {t('teamNoAccess')}
          </p>
        </div>
      ) : (
        <>
          <div className="border-b border-border px-4 md:px-6">
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map((tab, i) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition ${
                    current?.key === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {/*
            Tab yang tidak aktif TIDAK dirender: tiap tab memuat query-nya
            sendiri, dan merender ketiganya sekaligus berarti tiga panggilan
            jaringan setiap kali halaman Tim dibuka — dua di antaranya untuk
            tabel yang belum tentu dilihat.
          */}
          <div className="flex-1 min-h-0 flex flex-col">{current?.render()}</div>
        </>
      )}
    </div>
  )
}
