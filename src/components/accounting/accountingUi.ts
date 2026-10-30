// Kelas tombol yang dipakai bersama halaman Akuntansi — sama persis dengan
// tombol ekspor/tambah di laporan lain, dipisah agar tidak disalin tujuh kali.
export const exportButtonClass =
  'flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted disabled:opacity-40 transition shrink-0'

export const primaryButtonClass =
  'flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60'

export const inputClass =
  'w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60'

/** Kepala tabel laporan — sama dengan DataTable. */
export const thClass = 'px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap'

/** Kunci query bersama: membatalkan jurnal / mengubah perkiraan menyegarkan semua laporan. */
export const ACCOUNTING_QUERY_KEY = 'accounting'
