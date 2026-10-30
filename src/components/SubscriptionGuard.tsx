/** Langganan berakhir TIDAK mengunci rute: usaha terkunci tetap bisa membuka
 * semua halaman dalam mode lihat saja, termasuk Langganan & Pembayaran untuk
 * memperpanjang. Penulisan ditolak server (402 SUBSCRIPTION_EXPIRED); banner
 * dan paywall-nya dipasang di MainLayout, tombol ubah memakai useCanWrite().
 */
export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
