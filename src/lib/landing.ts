import { NAV_GROUPS, NAV_ITEMS, roleAllowsNav, type NavItem } from '@/components/layout/navItems'
import { useAuthStore } from '@/store/authStore'
import type { PermissionCode } from '@/types'

/**
 * Halaman pendaratan yang dipakai bila tidak ada satu pun menu yang lolos.
 *
 * Profil tidak menuntut izin apa pun — setiap akun yang berhasil masuk boleh
 * membukanya. Ia bukan halaman kerja, tetapi jauh lebih baik daripada "Akses
 * Ditolak" sebagai hal pertama yang dilihat orang setelah kata sandinya benar.
 */
const FALLBACK_PATH = '/profile'

export interface LandingAccess {
  can: (code: PermissionCode) => boolean
  canAny: (...codes: PermissionCode[]) => boolean
  isPro: boolean
  /** Kode sub-jenis usaha, huruf besar. Kosong bila belum dipilih. */
  verticalCode: string
  /** Kode peran; dipakai [roleAllowsNav]. */
  roleCode?: string
}

/** Apakah menu ini benar-benar bisa dibuka pengguna sekarang. */
function reachable(item: NavItem, access: LandingAccess): boolean {
  if (item.sidebar === false) return false
  if (!roleAllowsNav(item, access.roleCode)) return false
  // Menu berpaket Pro dibungkus PlanGate: yang terbuka di sana adalah layar
  // penawaran, bukan layar kerja. Mendaratkan orang di situ sama saja
  // menyambutnya dengan tagihan.
  if (item.planRequired === 'pro' && !access.isPro) return false
  if (item.verticals && !item.verticals.includes(access.verticalCode)) return false
  if (item.anyOf && item.anyOf.length > 0) return access.canAny(...item.anyOf)
  if (item.permission) return access.can(item.permission)
  return true
}

/**
 * Ke mana seseorang mendarat setelah kata sandinya benar.
 *
 * Dasbor TIDAK bisa dipakai sebagai jawaban tetap: halaman depan menuntut
 * `reports.view`, dan peran yang bekerja dengan barang — Gudang, Staf Stok
 * Masuk — tidak memilikinya. Mengarahkan semua orang ke "/" membuat mereka
 * berhasil masuk lalu langsung dilempar ke "Akses Ditolak", satu-satunya
 * halaman yang mereka lihat sepanjang sesi.
 *
 * Urutannya mengikuti urutan Sidebar, jadi jawabannya selalu menu PERTAMA yang
 * memang tampil untuknya — halaman yang sama dengan yang akan ia ketuk sendiri.
 */
export function landingPathFor(access: LandingAccess): string {
  for (const group of NAV_GROUPS) {
    for (const item of NAV_ITEMS) {
      if (item.group !== group) continue
      if (reachable(item, access)) return item.path
    }
  }
  return FALLBACK_PATH
}

/**
 * [landingPathFor] untuk pengguna yang sedang masuk.
 *
 * Membaca store langsung, BUKAN lewat `usePermissions`. Hook itu dipakai oleh
 * `navItems`, yang dipakai berkas ini — memanggilnya dari sini menutup
 * lingkaran impor (`usePermissions` → `landing` → `navItems` →
 * `usePermissions`). Lingkaran itu tidak menggagalkan build: ia meledak saat
 * dijalankan, ketika `NAV_ITEMS` dirakit di tingkat modul dan membaca `PERMS`
 * yang belum sempat terisi — dan yang terlihat pengguna hanyalah halaman
 * putih tanpa satu pun pesan.
 */
export function useLandingPath(): string {
  // Ikut berlangganan ke store supaya jawabannya berubah bersama sesi; isinya
  // tetap dihitung [currentLandingPath] agar satu-satunya definisi "ke mana"
  // tidak bercabang dua.
  useAuthStore((s) => s.user)
  return currentLandingPath()
}

/**
 * [landingPathFor] untuk sesi yang sedang tersimpan, dibaca SEKARANG.
 *
 * Dipakai di luar render — mis. tepat setelah login, ketika sesinya baru saja
 * dimasukkan ke store dan hook belum sempat membacanya ulang.
 */
export function currentLandingPath(): string {
  const { can, canAny, user } = useAuthStore.getState()
  const membership = user?.business?.membership
  const tier = (membership?.tier || membership?.type || 'free').toLowerCase()

  return landingPathFor({
    can,
    canAny,
    isPro: tier === 'pro' || tier === 'trial',
    roleCode: user?.role?.code,
    verticalCode: (user?.business?.business_vertical?.code ?? '').toUpperCase(),
  })
}
