import { t } from '@/lib/i18n'

/**
 * Kolom cari di tab Kategori/Satuan/Brand baru muncul bila datanya lebih dari
 * ini. Sampai sekitar delapan baris semuanya terlihat sekilas, dan kolom cari
 * hanya menambah satu baris kosong di atas tabel pendek. Sama dengan ambang di
 * aplikasi kasir.
 */
export const LIBRARY_SEARCH_MIN_TOTAL = 8

/**
 * Tampilkan kolom cari? Selama ada kata yang diketik ia tetap tampil — hasil
 * saringan yang tinggal dua baris tidak boleh menghilangkan kolom tempat
 * kata itu ditulis.
 */
export function showLibrarySearch(total: number, search: string): boolean {
  return search !== '' || total > LIBRARY_SEARCH_MIN_TOTAL
}

/**
 * "Dipakai 12 produk" / "Belum dipakai produk". Null bila server belum
 * mengirim angkanya (server lama) — lebih baik diam daripada menyebut "belum
 * dipakai" yang bisa keliru.
 */
export function productUsageLabel(count: number | undefined | null): string | null {
  if (count == null) return null
  return count > 0 ? t('libUsedByProducts', { count }) : t('libUnused')
}
