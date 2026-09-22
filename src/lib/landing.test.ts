import { describe, it, expect } from 'vitest'
import { landingPathFor, type LandingAccess } from './landing'
import { PERMS } from '@/hooks/usePermissions'
import type { PermissionCode } from '@/types'

/** Pengguna dengan sekumpulan izin tertentu, paket Pro, tanpa sub-jenis usaha. */
function access(codes: PermissionCode[], isPro = true): LandingAccess {
  const held = new Set<string>(codes)
  return {
    can: (code) => held.has(code),
    canAny: (...list) => list.some((c) => held.has(c)),
    isPro,
    verticalCode: '',
  }
}

describe('landingPathFor', () => {
  it('mengantar pemegang laporan ke halaman depan', () => {
    expect(landingPathFor(access([PERMS.REPORTS_VIEW]))).toBe('/')
  })

  it('tidak pernah mengantar ke halaman depan tanpa izin laporan', () => {
    // Inilah bug yang dilaporkan: Staf Stok Masuk berhasil login, lalu
    // dilempar ke "Akses Ditolak" karena "/" menuntut reports.view.
    const path = landingPathFor(
      access([PERMS.INVENTORY_VIEW, PERMS.INVENTORY_STOCK_IN]),
    )
    expect(path).not.toBe('/')
    expect(path).not.toBe('/unauthorized')
  })

  it('mengantar peran persediaan ke halaman yang memang terbuka untuknya', () => {
    expect(
      landingPathFor(access([PERMS.INVENTORY_VIEW, PERMS.INVENTORY_STOCK_IN])),
    ).toBe('/products')
  })

  it('melewati menu berpaket Pro untuk akun gratis', () => {
    // Menu Pro terbuka sebagai layar penawaran, bukan layar kerja.
    // Mendaratkan orang di situ sama saja menyambutnya dengan tagihan.
    const path = landingPathFor(access([PERMS.INVENTORY_TRANSFER], false))
    expect(path).not.toBe('/inventory/transfers')
  })

  it('akun tanpa satu pun izin tetap mendarat di halaman yang bisa dibuka', () => {
    // Hub Pengaturan tidak menuntut izin apa pun, jadi ia yang tersisa —
    // dan itu jauh lebih baik daripada "Akses Ditolak" sebagai hal pertama
    // yang dilihat orang setelah kata sandinya benar. Yang dijaga di sini
    // bukan halaman tertentu, melainkan bahwa jawabannya selalu halaman yang
    // memang terbuka.
    expect(landingPathFor(access([]))).toBe('/settings')
  })
})
