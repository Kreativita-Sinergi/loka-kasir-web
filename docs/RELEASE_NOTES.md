# Release 1.7.0 — 11 Oktober 2026

Memerlukan backend 1.8.0; terkait aplikasi 1.38.0+13800.

- Pengaturan promo sewa dengan harga rupiah dan jadwal berulang, hanya bagi pemilik/admin.
- Pelanggan QR rental melihat promo yang berlaku dan harga sesi yang terkunci.
- QR Cek Pesanan membuka tambahan item untuk nota yang sudah dicocokkan melalui nama lengkap/nomor nota/antrean.
- Nomor nota tujuan terlihat di menu dan keranjang. Pelanggan tidak perlu memasukkan kontak lagi; tambahan menunggu kasir dan tergabung ke nota asal.
- Rincian nota diperbarui otomatis setelah tambahan diterima; nota yang sudah selesai tidak dapat menerima tambahan.
- Katalog harga langganan mengikuti harga khusus akun dari backend; fitur referral sudah terintegrasi.

Rilis backend beserta migrasinya sebelum web agar endpoint baru tersedia. Tidak ada perubahan kredensial lokal dalam commit.
