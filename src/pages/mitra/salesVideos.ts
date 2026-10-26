// Dibuat dari output/youtube/STATUS.json (video tutorial publik di channel
// Loka Kasir). Tambahkan video baru di sini setelah dipublikasikan.
export interface TutorialVideo { key: string; title: string; phone?: string; tablet?: string }
export interface TutorialGroup { title: string; videos: TutorialVideo[] }

export const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/channel/UCR_-58j_zdN6Nh4-HoxkxWA'

export const tutorialGroups: TutorialGroup[] = [
  { title: 'Mulai pakai', videos: [
    { key: 'login', title: 'Login ke Aplikasi', phone: '7uYrwgTwtkA', tablet: 'BZj3K7fIy5E' },
    { key: 'buka-kasir', title: 'Buka Kasir & Mulai Shift', phone: 'MYWtM8gU9Zo', tablet: 'JBN54tXnOFs' },
    { key: 'transaksi', title: 'Melayani Transaksi', phone: 'Qk5hpG4X82o', tablet: 'LZ9lr9pqqCo' },
    { key: 'riwayat-struk', title: 'Riwayat & Struk', phone: 'AEDFtix5riU', tablet: 'GuWLmo5TsYg' },
    { key: 'tutup-shift', title: 'Tutup Shift', phone: 'mtfyXlD2l7M', tablet: 'kPByiIf-Yho' },
    { key: 'pemulihan-akun', title: 'Lupa Kata Sandi dan Memulai Pemulihan Akun', phone: '126pA9xr-BY', tablet: 'RC1EMRNt7cg' },
    { key: 'membership', title: 'Membership Aplikasi Loka', phone: 'tUfs86PCY9Y', tablet: 'axWKM4pAOwI' },
  ] },
  { title: 'Produk & stok', videos: [
    { key: 'tambah-produk', title: 'Tambah Produk', phone: 'wB6ZyvyWQq8', tablet: 'oVPG2lSlOHw' },
    { key: 'impor-produk', title: 'Impor Banyak Produk dari CSV', phone: 'PsShxmJr9A8', tablet: 'BEUnqw7JGPU' },
    { key: 'harga-modal', title: 'Mengisi Harga Modal Produk', phone: 'b478bCyYXsk', tablet: 'gja3Bv2vamQ' },
    { key: 'bahan-baku', title: 'Bahan Baku & Stok Masuk', phone: 'ydI0y02QQuQ', tablet: 'w5SBQlfoPag' },
    { key: 'stok-opname', title: 'Menghitung dan Posting Stok Opname', phone: '14lZc-MDewo', tablet: 'Qn9vkW-uG3o' },
    { key: 'titipan', title: 'Tambah Barang Titipan', phone: 'mM9VzyvecNE', tablet: 'ae6lTSCxF14' },
    { key: 'paket-resep', title: 'Membuat Paket Produk dengan Resep Bahan Baku', phone: '4rkYlm1XJ2c' },
    { key: 'diskon', title: 'Menambahkan Diskon', phone: 'WXtEK6iam6s', tablet: 'jx5potuhyAU' },
    { key: 'pajak', title: 'Menambahkan Pajak', phone: 'uIfDpuzNiSw', tablet: 'pu4Ta8kbEog' },
  ] },
  { title: 'Restoran, kafe & meja', videos: [
    { key: 'pesanan-berjalan', title: 'Kelola Pesanan Berjalan', phone: '9mSh7WqcWQk', tablet: 'nKoAuKY7lSU' },
    { key: 'meja-berjalan', title: 'Pesanan Meja', phone: 'PANc0c5j1XY', tablet: 'cWVppcms280' },
    { key: 'pisah-struk', title: 'Pisah Struk & Bayar Terpisah', phone: 'gCYpkZJ8kfA', tablet: '3xxtjV3fu8E' },
    { key: 'pesanan-dapur', title: 'Mengelola Pesanan Dapur', tablet: '0HUXiOBZ8GM' },
  ] },
  { title: 'Pelanggan & pembayaran', videos: [
    { key: 'member-pelanggan', title: 'Menambahkan Member Pelanggan', phone: 'VWZGafv4MHY', tablet: 'vv3FT-heE3c' },
    { key: 'kasbon', title: 'Mencatat dan Melunasi Kasbon', phone: 'zbi2dmrIC1s', tablet: 'axtLHkG-cdM' },
    { key: 'batal-refund', title: 'Pembatalan Transaksi dan Refund', phone: '2wxSBI3EvFk', tablet: 'S7f0IzZKM58' },
  ] },
  { title: 'Pegawai', videos: [
    { key: 'tambah-pegawai', title: 'Tambah Pegawai, PIN, dan Hak Akses', phone: 'lpB-C9RiK1o', tablet: 'jEgB38YzExk' },
    { key: 'absensi', title: 'Absensi Masuk & Pulang', phone: 'c_bf_f-Vae0', tablet: 'jMUNmrezTTU' },
    { key: 'gaji-absensi', title: 'Gaji Pegawai Sesuai Absensi', phone: '0rLzH9cOgwo', tablet: '99dEpNGZx10' },
    { key: 'lokasi-absensi', title: 'Mengatur Lokasi Absensi', phone: 'kr2uBPLBUM8', tablet: 'fc11mXKy7aQ' },
    { key: 'jadwal-shift', title: 'Membuat Jadwal Shift Pegawai', phone: 'ZWfva7VdtRo', tablet: 'ESqMslbLuAA' },
    { key: 'jam-kerja', title: 'Mengatur Jam Kerja dan Hari Libur', phone: 'Ck8AQiVTCj0', tablet: 'n--8ey2zLWc' },
  ] },
  { title: 'Pengaturan & printer', videos: [
    { key: 'printer', title: 'Mengatur Printer Kasir dan Dapur', phone: 'UsFD_Ursi_Q', tablet: 'a1YxgOJdgK8' },
    { key: 'pengaturan-struk', title: 'Mengatur Tampilan Struk', phone: 'LYxs0GeHuwo', tablet: 'uqOXUc7dGEI' },
    { key: 'cetak-otomatis', title: 'Mengatur Cetak Otomatis dan Laci Uang', phone: 'xdwIgmIRZbo', tablet: 'hEbWbtlrcH8' },
    { key: 'pengaturan-transaksi', title: 'Mengatur Transaksi dan Pembayaran', phone: 'iPzYAe5ykFI', tablet: 'y77kv4vByE0' },
    { key: 'profil-toko', title: 'Mengatur Profil dan Fitur Toko', phone: 'MAPtUUk-8h8', tablet: '6VzBRmtWODY' },
    { key: 'tampilan-menu', title: 'Menampilkan dan Menyembunyikan Menu', phone: 'tdJqOhPK_v0', tablet: 'Xv2USQsTjls' },
  ] },
  { title: 'Laporan', videos: [
    { key: 'laporan-penjualan', title: 'Ringkasan dan Filter Penjualan', phone: 'GmAHFSLNs2o', tablet: 'K65gu6Ve2s0' },
  ] },
]
