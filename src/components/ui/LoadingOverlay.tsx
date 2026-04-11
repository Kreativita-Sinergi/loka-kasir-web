interface Props {
  message?: string
}

export default function LoadingOverlay({ message = 'Memproses...' }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl px-8 py-7 flex flex-col items-center gap-4 min-w-[180px]">
        {/* Spinner */}
        <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-700 text-center">{message}</p>
      </div>
    </div>
  )
}
