/** Paket Free dan paket yang berakhir tetap boleh memakai dasbor.
 * Pembatasan kuota/fitur ditegakkan pada tindakan terkait oleh server.
 */
export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
