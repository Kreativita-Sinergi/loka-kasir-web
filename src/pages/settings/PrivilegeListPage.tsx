import { useState } from 'react'
import { Monitor } from 'lucide-react'
import Header from '@/components/layout/Header'

// ─── Role data ────────────────────────────────────────────────────────────────

interface RolePrivilege {
  id: string
  label: string
  cmsAccess: string[]
  mobileAccess: string[]
  /** If true, CMS column shows a "no access" notice instead of bullets */
  noCmsAccess?: boolean
}

const ROLES: RolePrivilege[] = [
  {
    id: 'owner',
    label: 'Owner',
    cmsAccess: [
      'Login',
      'User Owner dapat melakukan seluruh operasional dalam CMS.',
      'Owner adalah user dengan level tertinggi yang memiliki hak akses penuh terhadap seluruh fitur dan pengaturan bisnis.',
    ],
    mobileAccess: [
      'Login Aplikasi',
      'Login Kasir (PIN)',
      'Membuat transaksi penjualan di semua outlet',
      'Melakukan seluruh pengaturan atas outlet yang terdaftar',
      'Melihat laporan di semua outlet',
      'Manajemen karyawan untuk semua outlet',
      'Melakukan operasional shift kasir & rekap kas',
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    cmsAccess: [
      'Login',
      'User Admin dapat melakukan seluruh operasional dalam CMS.',
      'Admin bisa menambah, mengubah, dan menghapus produk.',
    ],
    mobileAccess: [
      'Login Aplikasi',
      'Login Kasir (PIN)',
      'Membuat transaksi penjualan di outlet terdaftar',
      'Melakukan seluruh pengaturan atas outlet terdaftar',
      'Melihat laporan penjualan',
      'Manajemen karyawan & shift kasir',
    ],
  },
  {
    id: 'manager',
    label: 'Manager',
    cmsAccess: [
      'Login',
      'User Manager dapat melakukan seluruh operasional dalam CMS.',
      'Manager bisa menambah produk baru dan mengubah atribut produk, namun tidak bisa menghapus produk.',
    ],
    mobileAccess: [
      'Login Aplikasi',
      'Login Kasir (PIN)',
      'Membuat transaksi penjualan di outlet terdaftar',
      'Melakukan pengaturan outlet terdaftar',
      'Melihat laporan penjualan',
      'Manajemen karyawan & shift kasir',
    ],
  },
  {
    id: 'warehouse',
    label: 'Warehouse',
    cmsAccess: [
      'Login',
      'User Warehouse hanya dapat melakukan operasional yang terkait dengan inventori dan stok dalam lingkup outlet terkait.',
    ],
    mobileAccess: [
      'Login Aplikasi',
      'Login Kasir (PIN)',
      'Melakukan absensi karyawan',
      'Melakukan operasional menu inventori pada tablet',
    ],
  },
  {
    id: 'kasir',
    label: 'Kasir',
    noCmsAccess: true,
    cmsAccess: [],
    mobileAccess: [
      'Login Aplikasi',
      'Login Kasir (PIN)',
      'Membuat transaksi penjualan & mengelola shift kasir',
      'Pengaturan terbatas: melihat daftar produk, pengaturan hardware, dan melakukan sinkronisasi',
    ],
  },
  {
    id: 'waiters',
    label: 'Waiters',
    noCmsAccess: true,
    cmsAccess: [],
    mobileAccess: [
      'Login Aplikasi',
      'Melakukan order namun tidak bisa melakukan pembayaran',
      'Pengaturan terbatas: melihat daftar produk, pengaturan hardware, dan melakukan sinkronisasi',
    ],
  },
  {
    id: 'staff',
    label: 'Staff',
    noCmsAccess: true,
    cmsAccess: [],
    mobileAccess: [
      'Melakukan absensi pada aplikasi Mobile POS yang dioperasikan oleh Admin, Manager, Warehouse, atau Kasir',
    ],
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrivilegeListPage() {
  const [activeRole, setActiveRole] = useState('owner')

  const role = ROLES.find((r) => r.id === activeRole) ?? ROLES[0]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Daftar Hak Akses"
        subtitle="Ringkasan akses setiap role di CMS (Web Admin) dan Aplikasi Kasir"
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl">

          {/* Role Tabs */}
          <div className="flex gap-0 border-b border-gray-200 mb-8">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRole(r.id)}
                className={[
                  'px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                  activeRole === r.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                ].join(' ')}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Access Columns */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-2 border-b border-gray-100">
              <div className="px-8 py-4 border-r border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">CMS</span>
              </div>
              <div className="px-8 py-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">MOBILE POS</span>
              </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              {/* CMS Column */}
              <div className="px-8 py-6">
                {role.noCmsAccess ? (
                  <p className="text-sm text-gray-500 italic">
                    {role.label} tidak dapat mengakses CMS
                  </p>
                ) : (
                  <div className="space-y-3">
                    {role.cmsAccess.map((item, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-[7px]" />
                        <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile POS Column */}
              <div className="px-8 py-6">
                <div className="space-y-3">
                  {role.mobileAccess.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-[7px]" />
                      <p className="text-sm text-gray-700 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="mt-4 flex items-start gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100">
            <Monitor size={14} className="text-gray-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">
              <strong className="text-gray-600">CMS</strong> adalah Web Admin di{' '}
              <span className="font-medium text-gray-600">app.lokakasir.id</span> yang diakses via browser.{' '}
              <strong className="text-gray-600">Mobile POS</strong> adalah Aplikasi Kasir Android yang diakses melalui email & password (Login Aplikasi) atau PIN 4-digit (Login Kasir).
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
