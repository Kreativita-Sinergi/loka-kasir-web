import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'

/**
 * Nama peran untuk ditampilkan, diterjemahkan lewat `code`.
 *
 * Peran bawaan lahir dari seeder di server, dan `name`-nya di sana teks tetap
 * berbahasa campur — "Owner", "Warehouse", tapi juga "Kasir" dan "Waiters".
 * Kolom itu tidak ikut header Accept-Language karena ia isi database, bukan
 * pesan yang dirakit saat merespons; jadi dasbor berbahasa Jepang pun menerima
 * "Kasir" apa adanya.
 *
 * Yang dipetakan `code`, bukan `name`. Kode adalah bagian peran yang memang
 * dijanjikan stabil — dipakai juga oleh pengecekan hak akses — sementara `name`
 * boleh diubah pemilik lewat layar Hak Akses.
 */
const ROLE_KEYS: Record<string, MessageKey> = {
  OWNER: 'roleOwner',
  ADMIN: 'roleAdmin',
  MANAGER: 'roleManager',
  WAREHOUSE: 'roleWarehouse',
  KASIR: 'roleCashier',
  WAITERS: 'roleWaiter',
  STAFF: 'roleStaff',
}

/**
 * Menerjemahkan sebuah peran ke bahasa yang sedang aktif.
 *
 * Peran yang kodenya tak dikenal dikembalikan namanya apa adanya: peran yang
 * dibuat sendiri oleh pemilik ("Barista", "Kepala Dapur") memang tidak punya
 * terjemahan, dan nama yang ia ketik sendiri adalah jawaban yang benar.
 */
export function roleLabel(role?: { code?: string | null; name?: string | null } | null): string {
  if (!role) return ''
  const key = role.code ? ROLE_KEYS[role.code.toUpperCase()] : undefined
  return key ? t(key) : (role.name ?? '')
}
