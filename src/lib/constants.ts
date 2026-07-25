// Link unduh aplikasi Android di Google Play Store. Pengguna memasang sendiri —
// tidak perlu lagi meminta file APK ke admin via WhatsApp/Instagram.
// Harus sinkron dengan appDownloadDetails.url di loka-landing-web.
export const APP_DOWNLOAD_URL =
  'https://play.google.com/store/apps/details?id=id.lokakasir.app'

// Kontak tim Loka Kasir — kini untuk bantuan pemasangan/kendala, bukan untuk
// meminta aplikasinya.
const WHATSAPP_NUMBER = '6283878960539'
const APP_REQUEST_MESSAGE =
  'Halo tim Loka Kasir, saya butuh bantuan terkait aplikasi Loka Kasir.'

export const WHATSAPP_CONTACT_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  APP_REQUEST_MESSAGE,
)}`
export const INSTAGRAM_CONTACT_URL = 'https://ig.me/m/lokakasir.id'
