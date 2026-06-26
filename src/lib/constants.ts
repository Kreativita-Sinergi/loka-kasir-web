// Kontak tim Loka Kasir untuk permintaan akses aplikasi.
// Aplikasi tidak lagi dibagikan via tautan unduh langsung — pengguna menghubungi
// tim Loka Kasir terlebih dahulu (WhatsApp atau Instagram) untuk meminta aplikasinya.
const WHATSAPP_NUMBER = '6285393737313'
const APP_REQUEST_MESSAGE =
  'Halo tim Loka Kasir, saya ingin meminta akses aplikasi Loka Kasir.'

export const WHATSAPP_CONTACT_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  APP_REQUEST_MESSAGE,
)}`
export const INSTAGRAM_CONTACT_URL = 'https://ig.me/m/lokakasir.id'
