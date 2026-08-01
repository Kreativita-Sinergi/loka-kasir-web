/**
 * Coachmark / tutorial bertahap untuk web (berbasis driver.js).
 *
 * Cara kerja:
 *  - Setiap halaman punya daftar langkah (steps) yang menyorot elemen tertentu.
 *  - Elemen target ditandai dengan atribut `data-tour="<id>"` di JSX.
 *  - Tour otomatis tampil sekali saat pertama kali halaman dibuka (disimpan di
 *    localStorage), dan bisa diulang kapan saja lewat tombol "Tutorial" di Header.
 *
 * Menambah tutorial halaman baru = cukup tambahkan entri di `TOURS` di bawah.
 */
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

/** Versi tutorial. Naikkan angka ini bila ingin memunculkan ulang ke semua user. */
const TOUR_VERSION = 1
const seenKey = (path: string) => `coachmark:v${TOUR_VERSION}:${path}`

/**
 * Registry tutorial per-halaman, dikunci berdasarkan path route.
 * `step.element` memakai selector `[data-tour="..."]`. Langkah tanpa `element`
 * tampil sebagai kartu di tengah layar (cocok untuk perkenalan halaman).
 */
export const TOURS: Record<string, DriveStep[]> = {
  '/': [
    { popover: { title: 'Selamat datang di Loka Kasir 👋', description: 'Ini halaman Dashboard — ringkasan penjualan & performa bisnis Anda. Mari kenali fitur utamanya sebentar.' } },
    { element: '[data-tour="outlet-selector"]', popover: { title: 'Pilih Outlet', description: 'Ganti outlet aktif di sini. Semua data (produk, transaksi, laporan) mengikuti outlet yang dipilih.' } },
    { element: '[data-tour="sidebar-search"]', popover: { title: 'Cari Menu', description: 'Ketik untuk mencari menu apa pun dengan cepat tanpa harus menggulir sidebar.' } },
    { element: '[data-tour="help-button"]', popover: { title: 'Butuh bantuan lagi?', description: 'Klik tombol ini kapan saja untuk mengulang tutorial halaman yang sedang dibuka.' } },
  ],
  '/products': [
    { popover: { title: 'Halaman Produk', description: 'Di sini Anda menambah, mengubah, dan mengatur semua produk yang dijual.' } },
    { element: '[data-tour="product-add"]', popover: { title: 'Tambah Produk', description: 'Klik untuk membuat produk baru: nama, harga jual, harga modal, kategori, gambar, hingga varian.' } },
    { element: '[data-tour="product-search"]', popover: { title: 'Cari Produk', description: 'Cari produk berdasarkan nama atau SKU bila daftarnya sudah banyak.' } },
    { element: '[data-tour="product-import"]', popover: { title: 'Impor Massal', description: 'Punya banyak produk? Impor sekaligus dari file untuk menghemat waktu.' } },
    { element: '[data-tour="row-actions"]', popover: { title: 'Aksi Produk', description: 'Pada tiap baris ada tombol "Barcode" untuk mencetak label barcode produk, "Edit" untuk mengubah, dan "Hapus" untuk menghapus.' } },
  ],
  '/catalog/attributes': [
    { popover: { title: 'Kategori & Satuan', description: 'Label yang Anda pilih saat mengisi produk: kategori, satuan (pcs, porsi, gelas), dan brand.' } },
    { element: '[data-tour="library-tabs"]', popover: { title: 'Pindah Tab', description: 'Klik tab untuk berpindah antara Kategori, Satuan, dan Brand.' } },
    { element: '[data-tour="library-add"]', popover: { title: 'Tambah Data', description: 'Tombol tambah membuat item baru pada tab yang sedang aktif.' } },
  ],
  '/discounts': [
    { popover: { title: 'Diskon', description: 'Buat potongan harga yang bisa dipilih kasir saat menerima pembayaran.' } },
    { element: '[data-tour="library-add"]', popover: { title: 'Buat Diskon', description: 'Tentukan nama diskon dan besarannya — persen atau potongan rupiah.' } },
  ],
  '/settings/tax': [
    { popover: { title: 'Pajak', description: 'Atur pajak yang ditambahkan ke tagihan pembeli, misalnya PB1 atau PPN.' } },
  ],
  '/outlets': [
    { popover: { title: 'Outlet / Cabang', description: 'Kelola cabang toko Anda. Tiap outlet punya pengaturan struk, biaya layanan, QRIS, dan lainnya.' } },
    { element: '[data-tour="outlet-add"]', popover: { title: 'Tambah Outlet', description: 'Buat cabang baru di sini. Paket berbayar mendukung lebih banyak outlet.' } },
    { element: '[data-tour="row-actions"]', popover: { title: 'Atur Outlet', description: 'Klik "Edit" untuk mengubah detail & pengaturan outlet (struk, QRIS, kasbon, dll).' } },
  ],
  '/employees': [
    { popover: { title: 'Karyawan', description: 'Daftarkan kasir, manajer, atau staf. Tiap karyawan login di aplikasi kasir memakai PIN.' } },
    { element: '[data-tour="employee-add"]', popover: { title: 'Tambah Karyawan', description: 'Buat akun karyawan: nama, role/peran, jadwal shift, dan PIN.' } },
    { element: '[data-tour="row-actions"]', popover: { title: 'Kelola Karyawan', description: '"Edit" untuk mengubah data, "Hapus" untuk menghapus, atau atur ulang PIN.' } },
  ],
  '/customers': [
    { popover: { title: 'Pelanggan', description: 'Database pelanggan beserta poin loyalitas mereka.' } },
    { element: '[data-tour="customer-add"]', popover: { title: 'Tambah Pelanggan', description: 'Simpan data pelanggan untuk transaksi lebih cepat & program poin.' } },
    { element: '[data-tour="row-actions"]', popover: { title: 'Kelola Pelanggan', description: '"Edit"/"Hapus" pelanggan, atau kelola poin loyalitasnya di sini.' } },
  ],
  '/inventory/raw-materials': [
    { popover: { title: 'Bahan Baku', description: 'Catat bahan baku & stoknya untuk perhitungan HPP dan resep (BOM) produk.' } },
    { element: '[data-tour="rawmaterial-add"]', popover: { title: 'Tambah Bahan Baku', description: 'Buat bahan baku baru: nama, satuan, stok awal, dan harga rata-rata.' } },
    { element: '[data-tour="row-actions"]', popover: { title: 'Kelola Bahan Baku', description: 'Sesuaikan stok, "Edit", atau "Hapus" bahan baku dari tombol pada tiap baris.' } },
  ],
  '/transactions': [
    { popover: { title: 'Transaksi', description: 'Riwayat seluruh penjualan. Gunakan filter tanggal, status, dan pencarian untuk menemukan transaksi tertentu.' } },
    { popover: { title: 'Lihat Detail', description: 'Klik salah satu baris transaksi untuk melihat rincian item, pembayaran, dan mencetak ulang struk.' } },
  ],
  '/kasbon': [
    { popover: { title: 'Kasbon', description: 'Daftar transaksi yang belum lunas (bayar sebagian). Di sini Anda menagih & melunasi sisa pembayaran pelanggan.' } },
    { element: '[data-tour="kasbon-search"]', popover: { title: 'Cari Tagihan', description: 'Cari berdasarkan nomor tagihan untuk menemukan kasbon pelanggan dengan cepat.' } },
  ],
  '/shifts': [
    { popover: { title: 'Shift Kasir', description: 'Pantau sesi shift kasir (buka/tutup, total penjualan) dan kelola jadwal shift.' } },
    { element: '[data-tour="shift-add"]', popover: { title: 'Tambah Jadwal', description: 'Buat jadwal shift (jam kerja) yang bisa dipakai karyawan saat membuka shift di kasir.' } },
    { element: '[data-tour="row-actions"]', popover: { title: 'Kelola Jadwal', description: '"Edit" atau "Hapus" jadwal shift dari tombol pada tiap baris.' } },
  ],
  '/inventory/current-stock': [
    { popover: { title: 'Stok', description: 'Lihat & sesuaikan stok produk per outlet. Tambah stok masuk, lakukan penyesuaian, dan pantau stok menipis.' } },
    { element: '[data-tour="stock-search"]', popover: { title: 'Cari Produk', description: 'Cari produk atau SKU untuk menambah/menyesuaikan stoknya.' } },
  ],
  '/inventory/transfers': [
    { popover: { title: 'Transfer Stok', description: 'Pindahkan stok antar outlet. Buat catatan pengiriman agar stok kedua outlet otomatis tersesuaikan.' } },
  ],
  '/inventory/movements': [
    { popover: { title: 'Keluar-Masuk Stok', description: 'Jejak setiap pergerakan stok (masuk, keluar, penyesuaian, transfer) untuk audit & rekonsiliasi.' } },
  ],
  '/inventory/suppliers': [
    { popover: { title: 'Supplier', description: 'Kelola data pemasok bahan baku. Dipakai saat membuat pesanan ke supplier.' } },
    { element: '[data-tour="supplier-add"]', popover: { title: 'Tambah Supplier', description: 'Simpan data pemasok: nama, kontak, dan alamat.' } },
    { element: '[data-tour="row-actions"]', popover: { title: 'Kelola Supplier', description: '"Edit" atau "Hapus" supplier dari tombol pada tiap baris.' } },
  ],
  '/inventory/purchase-orders': [
    { popover: { title: 'Pesanan ke Supplier', description: 'Catat pembelian bahan baku ke supplier. Saat PO diterima, stok & HPP otomatis diperbarui.' } },
    { element: '[data-tour="po-add"]', popover: { title: 'Buat PO', description: 'Buat pesanan pembelian: pilih supplier lalu tambahkan item & jumlahnya.' } },
    { element: '[data-tour="row-actions"]', popover: { title: 'Aksi PO', description: '"Lihat" detail, "Batalkan", atau "Hapus" PO dari tombol pada tiap baris.' } },
  ],
  '/attendance': [
    { popover: { title: 'Absensi Karyawan', description: 'Rekap kehadiran karyawan (masuk/pulang) dari aplikasi kasir. Bisa difilter dan diunduh.' } },
  ],
  '/master/terminals': [
    { popover: { title: 'Terminal', description: 'Daftar perangkat POS. Kasir memilih terminal saat membuka shift.' } },
    { element: '[data-tour="terminal-add"]', popover: { title: 'Tambah Terminal', description: 'Daftarkan perangkat kasir baru di sini.' } },
    { element: '[data-tour="row-actions"]', popover: { title: 'Kelola Terminal', description: '"Edit" atau "Hapus" terminal dari tombol pada tiap baris.' } },
  ],
  '/master/tables': [
    { popover: { title: 'Meja (F&B)', description: 'Atur denah meja untuk dine-in. Kasir memilih meja saat membuat pesanan.' } },
    { element: '[data-tour="table-viewmode"]', popover: { title: 'Tampilan', description: 'Beralih antara tampilan Denah (map) dan Daftar (list).' } },
    { element: '[data-tour="table-add"]', popover: { title: 'Tambah Meja', description: 'Tambah meja baru beserta kapasitasnya.' } },
  ],
  '/settings/rbac': [
    { popover: { title: 'Role & Hak Akses', description: 'Atur peran (role) karyawan dan izin apa saja yang boleh mereka akses.' } },
    { element: '[data-tour="role-add"]', popover: { title: 'Tambah Role', description: 'Buat role khusus sesuai kebutuhan bisnis, lalu atur izinnya.' } },
  ],
  '/reports': [
    { popover: { title: 'Laporan Analitik', description: 'Tren penjualan, produk terlaris, dan performa bisnis. Ubah periode (mingguan/bulanan) pada grafik.' } },
  ],
  '/reports/financial': [
    { popover: { title: 'Laporan Keuangan', description: 'Ringkasan pemasukan & pengeluaran. Pilih rentang tanggal lalu unduh laporan/jurnal bila perlu.' } },
  ],
  '/reports/profitability': [
    { popover: { title: 'Profitabilitas (HPP)', description: 'Analisis laba: pendapatan dibanding harga pokok (HPP) per produk. Pastikan harga modal & resep terisi.' } },
  ],
  '/pricing/insights': [
    { popover: { title: 'Rekomendasi Harga', description: 'Saran harga jual berbasis margin & HPP untuk membantu menentukan harga optimal.' } },
  ],
  '/membership': [
    { popover: { title: 'Paket Langganan', description: 'Lihat paket aktif dan tingkatkan ke Lite/Pro untuk membuka fitur tambahan.' } },
  ],
}

/** Apakah ada tutorial untuk path ini. */
export function hasTour(path: string): boolean {
  return Array.isArray(TOURS[path]) && TOURS[path].length > 0
}

/** Hanya simpan langkah yang elemennya benar-benar ada (atau langkah tanpa elemen). */
function resolvableSteps(steps: DriveStep[]): DriveStep[] {
  return steps.filter((s) => !s.element || document.querySelector(s.element as string))
}

/**
 * Jalankan tutorial untuk path tertentu.
 * @param markSeen tandai sudah dilihat agar tidak auto-muncul lagi (default true).
 */
export function startTour(path: string, markSeen = true): void {
  const steps = TOURS[path]
  if (!steps?.length) return
  const usable = resolvableSteps(steps)
  if (!usable.length) return

  const d = driver({
    showProgress: true,
    overlayColor: 'rgba(15, 23, 42, 0.7)',
    nextBtnText: 'Lanjut',
    prevBtnText: 'Kembali',
    doneBtnText: 'Selesai',
    progressText: '{{current}} dari {{total}}',
    // Tampilkan tombol tutup sebagai opsi "Lewati" yang jelas + klik luar/Esc.
    allowClose: true,
    showButtons: ['previous', 'next', 'close'],
    onPopoverRender: (popover) => {
      // Ubah tombol tutup (×) menjadi label "Lewati" yang mudah dibaca.
      popover.closeButton.innerText = 'Lewati'
      popover.closeButton.setAttribute('aria-label', 'Lewati tutorial')
      popover.closeButton.style.cssText =
        'width:auto;height:auto;font-size:13px;font-weight:600;color:#64748b;' +
        'padding:2px 6px;top:8px;right:8px;'
    },
    steps: usable,
  })
  d.drive()

  if (markSeen) {
    try { localStorage.setItem(seenKey(path), '1') } catch { /* ignore */ }
  }
}

/** Sudah pernah melihat tutorial halaman ini? */
export function hasSeenTour(path: string): boolean {
  try { return localStorage.getItem(seenKey(path)) === '1' } catch { return false }
}
