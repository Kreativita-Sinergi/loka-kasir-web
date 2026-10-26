/**
 * Syarat & ketentuan program referral sales, versi 2026-10-26 — sama dengan
 * repository.SalesTermsVersion di backend. Mengubah isinya berarti menaikkan
 * versi di sana agar setiap sales menyetujui ulang.
 */
const terms = [
  ['Kode sales', 'Pelanggan baru yang memakai kode Anda sebelum membuat tagihan pertama mendapat diskon 20% untuk pembayaran Pro bulanan atau tahunan pertamanya. Kode tidak berlaku untuk pelanggan yang pernah berlangganan Pro, dan satu usaha hanya bisa memakai satu kode.'],
  ['Besaran komisi', 'Anda mendapat 50% dari nilai bersih setiap pembayaran Pro bulanan atau tahunan pelanggan Anda selama 12 bulan sejak pembayaran langganan pertamanya, lalu 20% selama pelanggan tersebut terus membayar. Paket tiga tahun dan tambahan outlet tidak menghasilkan komisi.'],
  ['Nilai bersih', 'Nilai bersih adalah nominal yang dibayar pelanggan setelah dikurangi biaya pembayaran (payment gateway) dan pajak yang berlaku. Komisi dibulatkan ke bawah ke rupiah penuh.'],
  ['Masa tahan & pencairan', 'Komisi dapat dicairkan 30 hari setelah pembayaran pelanggan. Pencairan dilakukan setiap bulan sekitar tanggal 10 ke rekening atas nama Anda, dengan minimal Rp100.000; saldo di bawah minimal terbawa ke bulan berikutnya.'],
  ['Refund & pembatalan', 'Komisi dari pembayaran yang direfund atau terbukti disalahgunakan dibatalkan. Bila sudah dicairkan, nilainya memotong pencairan berikutnya.'],
  ['Larangan', 'Kode tidak boleh dipakai untuk usaha milik Anda sendiri, keluarga yang dikelola Anda, atau akun fiktif. Pelanggaran dapat membatalkan komisi terkait dan menghentikan keikutsertaan Anda.'],
  ['Bukan skema berjenjang', 'Komisi hanya berasal dari pelanggan yang memakai kode Anda. Tidak ada komisi dari merekrut sales lain.'],
  ['Data pelanggan', 'Data kontak pelanggan di portal disamarkan. Gunakan data pelanggan hanya untuk membantu mereka memakai Loka Kasir.'],
  ['Perubahan & penghentian', 'Loka Kasir dapat mengubah besaran komisi atau ketentuan ini dengan pemberitahuan paling lambat 30 hari sebelumnya; perubahan tidak berlaku surut. Sales yang diberhentikan tidak lagi menerima komisi baru; komisi yang sudah tersedia tetap dibayarkan kecuali karena pelanggaran.'],
] as const

export default function SalesTerms() {
  return (
    <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
      {terms.map(([title, body]) => (
        <li key={title}><span className="font-semibold text-foreground">{title}.</span> {body}</li>
      ))}
    </ol>
  )
}
