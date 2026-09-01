import { t } from '@/lib/i18n'
// Link unduh aplikasi Android di Google Play Store. Pengguna memasang sendiri —
// tidak perlu lagi meminta file APK ke admin via WhatsApp/Instagram.
// Harus sinkron dengan appDownloadDetails.url di loka-landing-web.
export const APP_DOWNLOAD_URL =
  'https://play.google.com/store/apps/details?id=id.lokakasir.app'

// Versi desktop dirilis lewat Microsoft Store. Harus sinkron dengan
// windowsDownloadDetails.url di loka-landing-web.
export const WINDOWS_DOWNLOAD_URL = 'https://apps.microsoft.com/detail/9mxbj5l6rdp8'

// Kontak tim Loka Kasir — kini untuk bantuan pemasangan/kendala, bukan untuk
// meminta aplikasinya.
const WHATSAPP_NUMBER = '6283878960539'
// Getter, bukan konstanta: pesan pembukanya ikut bahasa dasbor, dan konstanta
// modul akan membekukannya pada bahasa yang aktif saat berkas dimuat.
export const whatsappContactUrl = () =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t('whatsappHelpMessage'))}`
export const INSTAGRAM_CONTACT_URL = 'https://ig.me/m/lokakasir.id'

// ── Apotek ────────────────────────────────────────────────────────────────
//
// Golongan obat menurut penggolongan Permenkes. Yang ditentukannya bukan
// sekadar label di layar: golongan inilah yang memutuskan apakah sebuah obat
// boleh diserahkan tanpa resep dokter, dan menjual obat keras tanpa resep
// adalah pelanggaran yang menimpa apotekernya secara pribadi.
//
// Kembaran dari entity.DrugClass di server; keduanya harus berubah bersamaan.
export const DRUG_CLASSES = [
  'BEBAS',
  'BEBAS_TERBATAS',
  'KERAS',
  'PSIKOTROPIKA',
  'NARKOTIKA',
] as const

export type DrugClass = (typeof DRUG_CLASSES)[number]

/** Golongan yang hanya boleh diserahkan dengan resep dokter.
 *
 *  Dipakai HANYA untuk tampilan — memunculkan peringatan pada form produk.
 *  Keputusan atas barang nyata selalu dibaca dari `requires_prescription`
 *  yang datang dari server. */
export const drugClassRequiresPrescription = (code?: string | null) =>
  code === 'KERAS' || code === 'PSIKOTROPIKA' || code === 'NARKOTIKA'

/** Warna penanda, mengikuti tanda yang MEMANG tercetak pada kemasannya —
 *  lingkaran hijau, biru, merah bertanda K. Pemilik toko membaca lambang yang
 *  sama dengan yang ia pegang. */
export const drugClassAccent = (code?: string | null) => {
  switch (code) {
    case 'BEBAS':
      return 'text-emerald-700 border-emerald-500 bg-emerald-50'
    case 'BEBAS_TERBATAS':
      return 'text-blue-700 border-blue-500 bg-blue-50'
    case 'KERAS':
    case 'PSIKOTROPIKA':
      return 'text-red-700 border-red-500 bg-red-50'
    case 'NARKOTIKA':
      return 'text-purple-700 border-purple-500 bg-purple-50'
    default:
      return 'text-muted-foreground border-border bg-muted/40'
  }
}
