import { useState } from 'react'
import { Monitor } from 'lucide-react'
import Header from '@/components/layout/Header'

// ─── Role data — mirrors backend entity/role.go + seeder/permission_seeder.go ──

interface RolePrivilege {
  id: string
  label: string
  /** true = "Role tidak dapat mengakses CMS" */
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
      'Owner adalah user dengan level tertinggi yang memiliki hak akses penuh terhadap semua fitur, termasuk mengelola hak akses (RBAC).',
    ],
    mobileAccess: [
      'Login Aplikasi',
      'Login Kasir (PIN)',
      'Membuat transaksi penjualan, memproses pembayaran & refund',
      'Membuka dan menutup shift kasir',
      'Melihat laporan keuangan & laporan shift di semua outlet',
      'Manajemen karyawan & inventori',
      'Melakukan seluruh pengaturan outlet',
      'Kelola denah meja (khusus FNB)',
    ],
  },
  {
    id: 'ADMIN',
    label: 'Admin',
    cmsAccess: [
      'Login',
      'User Admin dapat melakukan seluruh operasional dalam CMS, kecuali mengelola hak akses (RBAC).',
      'Admin bisa menambah, mengubah, dan menghapus produk.',
    ],
    mobileAccess: [
      'Login Aplikasi',
      'Login Kasir (PIN)',
      'Membuat transaksi penjualan, memproses pembayaran & refund',
      'Membuka dan menutup shift kasir',
      'Melihat laporan keuangan & laporan shift',
      'Manajemen karyawan & inventori',
      'Melakukan seluruh pengaturan outlet terdaftar',
      'Kelola denah meja (khusus FNB)',
    ],
  },
  {
    id: 'MANAGER',
    label: 'Manager',
    cmsAccess: [
      'Login',
      'User Manager memiliki hak akses setara Admin — dapat melakukan seluruh operasional dalam CMS, kecuali mengelola hak akses (RBAC).',
    ],
    mobileAccess: [
      'Login Aplikasi',
      'Login Kasir (PIN)',
      'Membuat transaksi penjualan, memproses pembayaran & refund',
      'Membuka dan menutup shift kasir',
      'Melihat laporan keuangan & laporan shift',
      'Manajemen karyawan & inventori',
      'Melakukan seluruh pengaturan outlet terdaftar',
      'Kelola denah meja (khusus FNB)',
    ],
  },
  {
    id: 'SUPERVISOR',
    label: 'Supervisor',
    cmsAccess: [
      'Login',
      'User Supervisor dapat melihat laporan umum dan laporan shift, namun tidak dapat melihat laporan keuangan.',
      'Dapat melihat dan mentransfer inventori, serta melihat data karyawan.',
      'Tidak dapat mengubah pengaturan bisnis atau mengelola hak akses.',
    ],
    mobileAccess: [
      'Login Aplikasi',
      'Login Kasir (PIN)',
      'Membuat transaksi penjualan & memproses pembayaran',
      'Membuka dan menutup shift kasir',
      'Melihat laporan umum & laporan shift (tidak termasuk laporan keuangan)',
      'Melihat inventori & melakukan transfer stok',
      'Kelola denah meja (khusus FNB)',
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
      'Membuat transaksi penjualan & memproses pembayaran',
      'Membuka dan menutup shift kasir',
      'Melihat laporan shift',
      'Melihat denah meja (khusus FNB)',
    ],
  },
  {
    id: 'PELAYAN',
    label: 'Pelayan',
    noCmsAccess: true,
    cmsAccess: [],
    mobileAccess: [
      'Login Aplikasi',
      'Membuat order namun tidak bisa melakukan pembayaran',
      'Kelola denah meja: duduk, pindah, dan gabung meja (khusus FNB)',
    ],
  },
  {
    id: 'KOKI',
    label: 'Koki',
    noCmsAccess: true,
    cmsAccess: [],
    mobileAccess: [
      'Login Aplikasi',
      'Diarahkan langsung ke tampilan Dapur (KDS) saat login',
      'Melihat antrian pesanan dapur',
      'Menandai item sebagai SIAP atau TERSAJI',
    ],
  },
  {
    id: 'BARISTA',
    label: 'Barista',
    noCmsAccess: true,
    cmsAccess: [],
    mobileAccess: [
      'Login Aplikasi',
      'Diarahkan langsung ke tampilan Dapur (KDS) saat login',
      'Melihat antrian minuman dari dapur',
      'Menandai item sebagai SIAP atau TERSAJI',
    ],
  },
  {
    id: 'GUDANG',
    label: 'Gudang',
    cmsAccess: [
      'Login',
      'User Gudang hanya dapat melakukan operasional yang terkait dengan inventori dan stok dalam lingkup outlet terkait.',
    ],
    mobileAccess: [
      'Login Aplikasi',
      'Login Kasir (PIN)',
      'Melihat dan mengelola stok produk',
      'Melakukan transfer stok antar outlet',
    ],
  },
  {
    id: 'KURIR',
    label: 'Kurir',
    noCmsAccess: true,
    cmsAccess: [],
    mobileAccess: [
      'Login Aplikasi',
      'Melihat antrian pengiriman (delivery queue)',
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
          <div className="flex flex-wrap gap-0 border-b border-gray-200 mb-8">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRole(r.id)}
                className={[
                  'px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
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
              {/* CMS */}
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

              {/* Mobile POS */}
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
