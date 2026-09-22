// Urutan impor di sini DISENGAJA: sama seperti App.tsx, yang memuat
// `usePermissions` lebih dulu.
import { PERMS } from '@/hooks/usePermissions'
import { NAV_ITEMS } from '@/components/layout/navItems'
import { describe, it, expect } from 'vitest'

/**
 * Menjaga agar `usePermissions` tidak pernah lagi mengimpor `landing`.
 *
 * `landing` membaca `navItems`, dan `navItems` membaca `PERMS` dari
 * `usePermissions` — lingkaran yang TIDAK menggagalkan `tsc` maupun `vite
 * build`. Ia meledak saat dijalankan: `NAV_ITEMS` dirakit di tingkat modul,
 * membaca `PERMS` yang belum sempat terisi, dan seluruh aplikasi berhenti
 * sebelum satu piksel pun tergambar. Yang dilihat pengguna hanya halaman
 * putih tanpa pesan apa pun — termasuk di konsol, kalau ia tidak membukanya.
 */
describe('urutan impor navItems ↔ usePermissions', () => {
  it('NAV_ITEMS tetap utuh saat usePermissions dimuat lebih dulu', () => {
    expect(NAV_ITEMS.length).toBeGreaterThan(0)
    // Nilai yang datang DARI usePermissions. Bila lingkarannya kembali,
    // yang ini undefined jauh sebelum assertion — modulnya melempar.
    expect(NAV_ITEMS.find((item) => item.path === '/')?.permission).toBe(
      PERMS.REPORTS_VIEW,
    )
    // Tidak ada satu pun menu yang kehilangan izinnya karena PERMS kosong.
    for (const item of NAV_ITEMS) {
      expect(item.permission).not.toBe('undefined')
      expect(item.path).toBeTruthy()
    }
  })
})
