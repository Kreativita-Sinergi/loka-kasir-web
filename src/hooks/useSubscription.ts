import { useAuthStore } from '@/store/authStore'
import { deriveStatus, useSubscriptionStore, type SubscriptionStatus } from '@/store/subscriptionStore'
import type { Membership } from '@/types'

/** Status efektif: sinyal langsung (GET /membership terbaru atau 402) menang
 * atas membership yang tersimpan sejak login. */
export function effectiveStatus(
  override: SubscriptionStatus | null,
  membership: Membership | null | undefined,
): SubscriptionStatus {
  return override ?? deriveStatus(membership)
}

/** Status langganan usaha yang sedang masuk: ACTIVE | TRIAL | EXPIRED. */
export function useSubscriptionStatus(): SubscriptionStatus {
  const override = useSubscriptionStore((s) => s.status)
  const membership = useAuthStore((s) => s.user?.business?.membership)
  return effectiveStatus(override, membership)
}

/**
 * false saat langganan berakhir (mode lihat saja). Pakai untuk mematikan atau
 * menyembunyikan tombol tambah/ubah/hapus; server tetap menolak penulisan
 * dengan 402 SUBSCRIPTION_EXPIRED bila ada yang lolos.
 *
 * Di luar sesi dasbor (halaman publik, portal mitra) selalu true — kunci
 * langganan hanya berlaku untuk usaha yang sedang masuk.
 */
export function useCanWrite(): boolean {
  const hasUser = useAuthStore((s) => s.user !== null)
  const status = useSubscriptionStatus()
  return !hasUser || status !== 'EXPIRED'
}
