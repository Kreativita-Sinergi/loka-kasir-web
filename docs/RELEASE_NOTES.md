# Release 1.8.0 — 16 Oktober 2026

Memerlukan backend 1.9.0; terkait aplikasi 1.40.0+14000.

- **Booking online lapangan** (`/booking/<token>`): pelanggan memilih tanggal, lapangan, durasi, dan jam kosong, lalu mengisi nama dan nomor WhatsApp.
- **QR rental dengan banyak pilihan**: pelanggan memilih paket sewa (normal per jam, paket jam, Paket Suka-Suka) sesuai jadwal yang berlaku; di luar jadwal QR menolak dengan pesan untuk bertanya ke kasir.
- **Meja dengan banyak produk sewa** dan pilihan per periode di Pengaturan promo sewa.
- **PO produk**: tab Produk/Bahan baku saat membuat PO, satuan beli Dus, dan pratinjau harga modal saat terima barang ("Rp2.800 → Rp3.000 ▲7%") dengan saklar perbarui harga modal.
- PO baru langsung berstatus Dipesan, tab Draf dihilangkan, dan PO bisa dihapus selama belum ada barang diterima.
- **Pemisah ribuan** pada angka jumlah di stok, stok opname, kedaluwarsa, penitipan, laporan, katalog, pesanan publik, rental, dan langganan.

---

# Release 1.7.0 — 11 Oktober 2026

Memerlukan backend 1.8.0; terkait aplikasi 1.38.0+13800.

- Pengaturan promo sewa dengan harga rupiah dan jadwal berulang, hanya bagi pemilik/admin.
- Pelanggan QR rental melihat promo yang berlaku dan harga sesi yang terkunci.
- QR Cek Pesanan membuka tambahan item untuk nota yang sudah dicocokkan melalui nama lengkap/nomor nota/antrean.
- Nomor nota tujuan terlihat di menu dan keranjang. Pelanggan tidak perlu memasukkan kontak lagi; tambahan menunggu kasir dan tergabung ke nota asal.
- Rincian nota diperbarui otomatis setelah tambahan diterima; nota yang sudah selesai tidak dapat menerima tambahan.
- Katalog harga langganan mengikuti harga khusus akun dari backend; fitur referral sudah terintegrasi.

Rilis backend beserta migrasinya sebelum web agar endpoint baru tersedia. Tidak ada perubahan kredensial lokal dalam commit.
