import { useQuery } from '@tanstack/react-query'
import { getMySubscriptionPrices, type SubscriptionPrice } from '@/api/localization'
import { formatMoneyIn, minorToMajor } from '@/lib/money'
import { useAuthStore } from '@/store/authStore'

/**
 * Harga langganan untuk negara bisnis yang sedang login.
 *
 * Menggantikan konstanta rupiah yang dulu ditanam di `PlanCard`, `MembershipPage`,
 * dan `PaymentOrderModal` — tiga tempat berbeda yang harus diubah bersamaan
 * setiap kali harga berubah, dan yang tidak punya cara apa pun menampilkan harga
 * dalam mata uang selain rupiah.
 *
 * Harga disegarkan saat layar dibuka agar perubahan khusus akun dari admin terbaca.
 */
export function useSubscriptionPrices() {
  const businessId = useAuthStore((s) => s.user?.business?.id)

  const query = useQuery({
    queryKey: ['subscription-prices', businessId],
    queryFn: async () => (await getMySubscriptionPrices()).data.data,
    staleTime: 0,
  })

  const byPlan = new Map<string, SubscriptionPrice>()
  for (const price of query.data ?? []) byPlan.set(price.plan, price)

  return {
    ...query,
    /** Harga sebuah plan, atau undefined bila katalognya belum termuat. */
    priceOf: (plan: string) => byPlan.get(plan),
    /**
     * Harga tampil sebuah plan, siap dirender ("¥1,480").
     *
     * Mengembalikan string kosong selama data belum termuat, bukan angka nol:
     * "Rp0" di kartu harga terbaca sebagai gratis.
     */
    displayOf: (plan: string) => {
      const price = byPlan.get(plan)
      if (!price) return ''
      return formatMoneyIn(
        minorToMajor(price.display_amount, price.display_currency),
        price.display_currency,
      )
    },
    /**
     * Nominal tagih dalam IDR, siap dirender — untuk catatan "ditagih dalam …"
     * yang wajib menyertai harga non-rupiah.
     */
    chargeOf: (plan: string) => {
      const price = byPlan.get(plan)
      if (!price) return ''
      return formatMoneyIn(price.charge_amount, 'IDR')
    },
    /** true bila harga yang tampil memakai mata uang selain rupiah. */
    isForeignCurrency: (plan: string) => {
      const price = byPlan.get(plan)
      return !!price && price.display_currency !== 'IDR'
    },
  }
}
