import { useState } from 'react'
import Header from '@/components/layout/Header'

// ─── Role data — content matches screenshots & backend permission_seeder.go ───

interface RolePrivilege {
  id: string
  label: string
  noCmsAccess?: boolean
  cmsAccess: string[]
  mobileAccess: string[]
}

const ROLES: RolePrivilege[] = [
  {
    id: 'OWNER',
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
    id: 'ADMIN',
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
    id: 'MANAGER',
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
    id: 'WAREHOUSE',
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
    id: 'KASIR',
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
    id: 'WAITERS',
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
    id: 'STAFF',
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
  const [activeRole, setActiveRole] = useState('OWNER')

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
          <div className="flex border-b border-gray-200 mb-6">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRole(r.id)}
                className={[
                  'px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap',
                  activeRole === r.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                ].join(' ')}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Access columns */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-2">
              <div className="px-8 py-4 border-b border-r border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">CMS</span>
              </div>
              <div className="px-8 py-4 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mobile POS</span>
              </div>
            </div>

            {/* Content */}
            <div className="grid grid-cols-2 divide-x divide-gray-100 min-h-[200px]">
              {/* CMS */}
              <div className="px-8 py-6">
                {role.noCmsAccess ? (
                  <p className="text-sm text-gray-400 italic">
                    {role.label} tidak dapat mengakses CMS
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {role.cmsAccess.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="mt-2 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
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
                      <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Default credentials note */}
          <div className="mt-4 px-5 py-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-xs font-semibold text-blue-700 mb-1">Kredensial Default Karyawan Contoh</p>
            <p className="text-xs text-blue-600 leading-relaxed">
              Setiap role sudah memiliki karyawan contoh yang siap dipakai.
              {' '}<strong>PIN: 1234</strong> · <strong>Password: loka1234</strong> ·{' '}
              Email format: <code className="bg-blue-100 px-1 rounded">{'{role}@demo-{id}.lokakasir.id'}</code>
              {'. '}Ganti nama, email, dan password sesuai kebutuhan setelah masuk.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
