import { t } from '@/lib/i18n'
interface Props {
  message?: string
}

export default function LoadingOverlay({ message }: Props) {
  // Nilai bawaannya dibaca DI DALAM fungsi, bukan di daftar parameter.
  // Bukan sekadar gaya: t() dievaluasi saat komponen dirender, jadi teksnya
  // ikut bahasa yang sedang aktif — sementara nilai bawaan yang ditulis
  // sebagai literal akan tetap bahasa Indonesia selamanya.
  const label = message ?? t('processing')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-xl px-8 py-7 flex flex-col items-center gap-4 min-w-[180px]">
        {/* Spinner */}
        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm font-medium text-foreground text-center">{label}</p>
      </div>
    </div>
  )
}
