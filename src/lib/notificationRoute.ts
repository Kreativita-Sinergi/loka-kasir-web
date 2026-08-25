/**
 * Halaman yang dibuka saat sebuah pemberitahuan diklik.
 *
 * Mengembalikan null bila tidak ada halaman yang benar-benar menjawab
 * pemberitahuan itu — promo dan pesan dari tim Loka tidak punya tujuan di web
 * pengelola. Untuk itu semua, kliknya cukup menandai sudah dibaca: melempar
 * pengguna ke halaman lain hanya membuatnya kehilangan tempatnya di daftar
 * tanpa mendapat apa pun sebagai gantinya.
 *
 * Jenis di sini datang dari backend apa adanya (lihat notificationService di
 * loka-kasir-service); huruf besar-kecilnya sengaja tidak diseragamkan supaya
 * tidak ada jenis yang diam-diam tidak cocok.
 */
export function notificationRoute(type: string): string | null {
  switch (type) {
    // Transaksi baru, pembatalan, pengembalian dana, dan pesanan QR semuanya
    // bermuara di daftar transaksi — detailnya dibuka sebagai modal di sana,
    // jadi tidak ada tautan langsung per transaksi untuk dituju.
    case 'transaction':
    case 'refund':
    case 'NEW_SELF_ORDER':
      return '/transactions'

    case 'kasbon':
      return '/kasbon'

    // Stok menipis menyebut beberapa produk sekaligus tanpa id — daftar stok
    // saat ini adalah tujuan terdekat yang benar.
    case 'stock':
      return '/inventory/current-stock'

    case 'shift':
      return '/shifts'

    case 'DAILY_SUMMARY':
      return '/reports'

    // PROMO, FEEDBACK, dan jenis baru yang belum dikenal: tidak diarahkan.
    default:
      return null
  }
}
