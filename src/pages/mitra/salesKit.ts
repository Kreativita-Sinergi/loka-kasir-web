/**
 * Bahan jualan untuk mitra sales: poin jualan, jawaban pertanyaan calon
 * pelanggan, langkah mulai pakai, dan caption siap salin per platform.
 *
 * {kode}, {link}, dan {app} diganti dengan kode sales, link daftar, dan link
 * Play Store saat ditampilkan (lihat fillSalesTemplate). Klaim di sini harus
 * sama dengan FAQ di loka-landing-web — jangan menjanjikan fitur yang tidak
 * ada.
 */
import { APP_DOWNLOAD_URL, WINDOWS_DOWNLOAD_URL } from '@/lib/constants'

export type CaptionPlatform = 'threads' | 'tiktok' | 'instagram' | 'facebook' | 'dm'

export interface Caption { title: string; text: string }

export const captionPlatforms: { key: CaptionPlatform; label: string; hint: string; limit?: number }[] = [
  { key: 'threads', label: 'Threads', hint: 'Pendek dan mengajak ngobrol. Maksimal 500 karakter per postingan.', limit: 500 },
  { key: 'tiktok', label: 'TikTok', hint: 'Tempel di keterangan video. Link tidak bisa diklik di TikTok, jadi taruh link daftar di bio Anda.' },
  { key: 'instagram', label: 'Instagram', hint: 'Untuk feed atau Reels. Link di keterangan tidak bisa diklik, jadi taruh link daftar di bio Anda.' },
  { key: 'facebook', label: 'Facebook', hint: 'Cocok untuk grup UMKM, grup jual beli lokal, atau status pribadi.' },
  { key: 'dm', label: 'DM / WhatsApp', hint: 'Untuk membalas orang yang bertanya atau menindaklanjuti calon pelanggan.' },
]

export const captions: Record<CaptionPlatform, Caption[]> = {
  threads: [
    {
      title: 'Warung & toko',
      text: `Masih nyatet penjualan warung di buku tulis? 😅

Coba Loka Kasir: gratis 14 hari dengan semua fitur Pro. Bisa jalan walau internet putus, cetak struk ke printer bluetooth, stok dan laporan langsung kelihatan di HP.

Pakai kode {kode} biar dapat diskon 20% di langganan pertama 👇
{link}`,
    },
    {
      title: 'Kafe & resto',
      text: `Pemilik kafe atau resto, jujur deh: berapa kali bulan ini kas nggak cocok pas tutup toko?

Loka Kasir mencatat tiap shift kasir, pembatalan, refund, sampai kas kurang. Jadi ketahuan bocornya di mana.

Coba gratis 14 hari. Kode {kode} = diskon 20% langganan pertama.
{link}`,
    },
    {
      title: 'Info harga',
      text: `Buat yang lagi cari aplikasi kasir yang lengkap tapi nggak bikin kantong jebol 🧵

• Pro Rp59.000/bulan atau Rp590.000/tahun
• Gratis 14 hari dulu, semua fitur kebuka
• Jalan di HP Android, tablet, atau laptop Windows
• Struk bisa dicetak atau dikirim lewat WhatsApp

Daftar pakai kode {kode} biar dapat diskon 20%:
{link}`,
    },
  ],
  tiktok: [
    {
      title: 'POV tutup warung',
      text: `POV: tutup warung jam 10 malam, buka HP, omzet hari ini udah kehitung sendiri 📱✨

Aplikasi kasirnya Loka Kasir. Gratis 14 hari, tetap jalan walau sinyal hilang, struk bisa dicetak atau dikirim WA.

Kode {kode} = diskon 20% langganan pertama. Link daftar ada di bio, atau komen "MAU" nanti aku kirim 🙌

#aplikasikasir #umkm #warungkelontong #kasirdigital #bisnisumkm #lokakasir`,
    },
    {
      title: '3 tanda butuh kasir digital',
      text: `3 tanda usahamu udah butuh aplikasi kasir:
1️⃣ Stok habis baru ketahuan pas pembeli nanya
2️⃣ Uang di laci beda sama catatan
3️⃣ Nggak tau menu mana yang paling untung

Loka Kasir beresin ketiganya. Gratis 14 hari, pakai kode {kode} buat diskon 20% 🔥 Link di bio!

#umkmindonesia #tipsbisnis #aplikasikasir #jualan #lokakasir`,
    },
    {
      title: 'Kafe kecil',
      text: `Kafe kecil, tapi kasirnya kayak resto besar ☕
Pesanan per meja, layar dapur, pisah tagihan, sampai QRIS. Semua dari HP atau tablet.

Coba Loka Kasir gratis 14 hari. Kode {kode} buat diskon 20% langganan pertama. Link di bio 👆

#kafe #bisniskopi #kasirkafe #restoran #lokakasir`,
    },
  ],
  instagram: [
    {
      title: 'Kenalan dengan Loka Kasir',
      text: `Jualan makin rame, tapi catatan makin berantakan? Saatnya pakai kasir digital 📲

Loka Kasir bikin warung, toko, dan kafe kamu lebih rapi:
✅ Transaksi cepat, struk dicetak atau dikirim WhatsApp
✅ Stok dan bahan baku berkurang otomatis
✅ Laporan omzet dan untung setiap hari
✅ Absensi dan gaji pegawai
✅ Tetap jalan walau internet putus

Gratis 14 hari dengan semua fitur Pro. Pakai kode {kode} untuk diskon 20% di langganan pertama.
Link daftar ada di bio ✨

#lokakasir #aplikasikasir #kasirumkm #umkmnaikkelas #tokokelontong #warungkopi #bisnisrumahan`,
    },
    {
      title: 'Kafe & resto',
      text: `Buat kamu yang punya kafe atau resto 🍜☕

Loka Kasir sudah siap buat alur makan di tempat:
🍽️ Pesanan per meja dan pesanan berjalan
👨‍🍳 Pesanan langsung muncul di layar dapur
🧾 Pisah tagihan per orang
📊 Harga modal dan untung tiap menu kelihatan
💳 Tunai, QRIS, dan transfer

Coba gratis 14 hari. Kode {kode} = diskon 20% langganan pertama. Link di bio!

#kafe #restoran #kasirresto #bisniskuliner #lokakasir #umkmkuliner`,
    },
    {
      title: 'Harga jelas',
      text: `Aplikasi kasir lengkap, harganya jelas 👇

💰 Pro Rp59.000/bulan
💰 Atau Rp590.000/tahun (setara ±Rp49 ribu/bulan)
🎁 Gratis 14 hari dulu, semua fitur kebuka
🎟️ Pakai kode {kode}: diskon 20% di pembayaran pertama

Bisa di HP Android, tablet, dan laptop Windows. Transaksi tanpa batas, struk bisa dikirim WhatsApp.
Daftar lewat link di bio ya!

#lokakasir #aplikasikasir #kasirmurah #umkm #tokoonline`,
    },
  ],
  facebook: [
    {
      title: 'Grup UMKM',
      text: `Halo teman-teman pelaku UMKM 👋

Ada yang masih pakai buku catatan buat kasir? Saya mau bagi info aplikasi kasir yang saya rekomendasikan: Loka Kasir.

Yang saya suka:
• Transaksi cepat, struk bisa dicetak atau dikirim WhatsApp
• Stok berkurang otomatis, ada peringatan kalau mau habis
• Laporan penjualan dan untung harian langsung di HP
• Tetap bisa jualan walau internet putus

Bisa dicoba gratis 14 hari dengan semua fitur. Kalau daftar lewat link ini, otomatis dapat diskon 20% di langganan pertama (kode {kode}):
{link}

Kalau mau dibantu atur produk dan printernya, komen atau inbox saya aja 😊`,
    },
    {
      title: 'Warung sembako & kelontong',
      text: `Buat bapak/ibu pemilik warung sembako dan toko kelontong 🛒

Sering bingung barang apa yang laku, stok mana yang tinggal sedikit, dan berapa untung bersih hari ini? Loka Kasir bantu catat semuanya otomatis dari setiap penjualan.

✔️ Bisa di HP Android biasa
✔️ Bisa jualan walau sinyal hilang
✔️ Ada catatan kasbon pelanggan
✔️ Gratis 14 hari

Daftar di sini, diskon 20% pakai kode {kode}:
{link}

Mau tanya-tanya dulu? Langsung inbox saya ya 🙏`,
    },
    {
      title: 'Kafe & resto',
      text: `Info buat pemilik kafe, kedai kopi, dan rumah makan ☕🍛

Loka Kasir punya fitur yang biasanya cuma ada di kasir resto besar:
• Pesanan per meja dan pesanan berjalan
• Layar dapur, jadi pesanan nggak ketlisut
• Pisah tagihan
• Absensi dan gaji pegawai
• Laporan untung per menu

Coba gratis 14 hari. Lewat link ini dapat diskon 20% langganan pertama (kode {kode}):
{link}

Saya siap bantu pasang dan ajari kasirnya 👍`,
    },
  ],
  dm: [
    {
      title: 'Balas yang bertanya',
      text: `Halo kak, makasih sudah tertarik dengan Loka Kasir 🙏

Cara mulainya gampang:
1. Daftar lewat link ini (kode diskon sudah otomatis terpasang): {link}
2. Atau unduh aplikasinya di Play Store: {app}, lalu masukkan kode {kode} di menu Langganan & Pembayaran sebelum bayar pertama.

Gratis 14 hari dulu dengan semua fitur. Kalau lanjut, dapat diskon 20% di langganan pertama.
Kalau mau, saya bantu atur produk dan printernya ya kak 😊`,
    },
    {
      title: 'Tindak lanjut sebelum masa gratis habis',
      text: `Halo kak, gimana pakai Loka Kasir-nya, lancar? 😊

Masa gratis 14 hari kakak sebentar lagi selesai. Kalau mau lanjut, pastikan kode {kode} sudah terpasang di menu Langganan & Pembayaran sebelum bayar, biar dapat diskon 20%.

Pro Rp59.000/bulan atau Rp590.000/tahun. Ada yang masih bingung? Saya bantu kapan saja ya kak.`,
    },
  ],
}

export const sellingPoints = [
  'Gratis 14 hari dengan semua fitur Pro, dihitung sejak transaksi pertama.',
  'Pro Rp59.000/bulan atau Rp590.000/tahun. Dengan kode Anda, pelanggan dapat diskon 20% di pembayaran pertama.',
  'Jalan di HP & tablet Android dan laptop Windows; pemilik bisa memantau dari browser di app.lokakasir.id.',
  'Tetap bisa transaksi tunai walau internet putus, lalu tersinkron otomatis saat online lagi.',
  'Struk dicetak ke printer thermal bluetooth atau dikirim lewat WhatsApp.',
  'Stok, bahan baku, harga modal, laporan untung, absensi, dan gaji pegawai dalam satu aplikasi.',
  'Cocok untuk warung & kelontong, kafe & resto, retail, bakery & minuman, sampai jasa dan rental.',
]

export const objections: { q: string; a: string }[] = [
  { q: 'Mahal nggak?', a: 'Pro Rp59.000/bulan atau Rp590.000/tahun (setara ±Rp49 ribu/bulan). Pakai kode {kode} diskon 20% di pembayaran pertama. Bisa dicoba gratis 14 hari dulu; kalau tidak lanjut, akun pindah ke paket Gratis dan datanya tetap tersimpan.' },
  { q: 'Kalau internet mati gimana?', a: 'Transaksi tunai tetap jalan dan tersimpan di perangkat, lalu tersinkron sendiri saat internet kembali. Pembayaran QRIS dan kartu butuh internet.' },
  { q: 'Pakai HP apa?', a: 'HP atau tablet Android (disarankan Android 8 ke atas) dan laptop/PC Windows 10/11. Pemilik juga bisa membuka dasbor dari browser di app.lokakasir.id.' },
  { q: 'Bisa cetak struk?', a: 'Bisa, ke printer thermal bluetooth 58 mm atau 80 mm (hampir semua printer struk di pasaran). Struk juga bisa dikirim lewat WhatsApp atau PDF.' },
  { q: 'Ribet nggak pindah dari catatan manual?', a: 'Produk bisa diisi satu-satu atau diimpor sekaligus dari file CSV. Ada puluhan video tutorial di YouTube Loka Kasir, dan Anda bisa membantu mengatur produk serta printernya di awal.' },
  { q: 'Pegawai bisa curang nggak?', a: 'Setiap kasir masuk dengan PIN dan membuka shift. Pembatalan, refund, diskon, dan selisih kas tercatat per kasir, jadi pemilik bisa memeriksanya.' },
]

export interface TutorialStep { title: string; body: string; videos: string[] }

export const tutorialSteps: TutorialStep[] = [
  { title: 'Unduh & daftar', body: 'Daftar lewat link Anda (kode diskon otomatis terpasang), atau unduh Loka Kasir di Play Store / Microsoft Store lalu buat akun usaha.', videos: ['login'] },
  { title: 'Pasang kode sales', body: 'Kalau daftar dari aplikasi, buka Langganan & Pembayaran lalu masukkan kode {kode} sebelum pembayaran pertama. Kode yang sudah dipasang tidak bisa diganti.', videos: ['membership'] },
  { title: 'Isi produk', body: 'Tambah produk beserta harga dan stoknya, atau impor banyak produk sekaligus dari file CSV.', videos: ['tambah-produk', 'impor-produk'] },
  { title: 'Sambungkan printer & atur struk', body: 'Pasangkan printer bluetooth di HP, pilih di Pengaturan › Printer Struk, lalu atur logo dan isi struk.', videos: ['printer', 'pengaturan-struk'] },
  { title: 'Buka kasir & mulai jualan', body: 'Buka kasir untuk memulai shift, lalu layani pembeli: pilih produk, terima pembayaran, cetak atau kirim struk.', videos: ['buka-kasir', 'transaksi'] },
  { title: 'Tutup shift & cek laporan', body: 'Di akhir hari tutup shift dan hitung uang di laci, lalu lihat ringkasan penjualan dan untung.', videos: ['tutup-shift', 'laporan-penjualan'] },
  { title: 'Tambah pegawai (opsional)', body: 'Buat akun pegawai dengan PIN dan hak akses, lalu aktifkan absensi bila perlu.', videos: ['tambah-pegawai', 'absensi'] },
]

export const downloadLinks = { android: APP_DOWNLOAD_URL, windows: WINDOWS_DOWNLOAD_URL }

/** Ganti {kode}, {link}, dan {app} dengan data mitra. */
export function fillSalesTemplate(text: string, vars: { code: string; link: string }) {
  return text.replaceAll('{kode}', vars.code).replaceAll('{link}', vars.link).replaceAll('{app}', APP_DOWNLOAD_URL)
}
