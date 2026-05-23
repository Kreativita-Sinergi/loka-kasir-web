import { useState } from 'react'
import { Smartphone, MessageCircle, Info, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { toTitleCase } from '@/lib/utils'

const ADMIN_WA_NUMBER = import.meta.env.VITE_ADMIN_WHATSAPP ?? '6281234567890'

export default function DownloadAppCard() {
  const { user } = useAuthStore()
  const [googleEmail, setGoogleEmail] = useState(user?.email ?? '')
  const [submitted, setSubmitted] = useState(false)

  const ownerName    = toTitleCase(user?.business?.owner_name) ?? 'Owner'
  const businessName = toTitleCase(user?.business?.business_name) ?? ''

  const buildWaMessage = (email: string) =>
    encodeURIComponent(
      `Halo Admin Loka 👋\n\nSaya *${ownerName}* dari *${businessName}* ingin mengajukan akses download aplikasi *Loka Kasir* melalui Firebase App Distribution.\n\nEmail Google (akun Android) saya:\n📧 ${email}\n\nMohon bantu proses undangan-nya. Terima kasih! 🙏`
    )

  const handleRequest = () => {
    const email = googleEmail.trim()
    if (!email) return
    window.open(`https://wa.me/${ADMIN_WA_NUMBER}?text=${buildWaMessage(email)}`, '_blank')
    setSubmitted(true)
  }

  const handleDirectChat = () => {
    const msg = encodeURIComponent(
      `Halo Admin Loka 👋\n\nSaya *${ownerName}* dari *${businessName}* ingin mendapatkan informasi mengenai cara download aplikasi Loka Kasir. Mohon bantuannya. Terima kasih! 🙏`
    )
    window.open(`https://wa.me/${ADMIN_WA_NUMBER}?text=${msg}`, '_blank')
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
          <Smartphone size={18} className="text-green-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-gray-900">Download Aplikasi Kasir</h3>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
            Aplikasi belum tersedia di Play Store — distribusi eksklusif via{' '}
            <span className="font-medium text-gray-500">Firebase App Distribution</span>
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-600">
          Beta
        </span>
      </div>

      {submitted ? (
        /* Success state */
        <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-100 rounded-xl">
          <CheckCircle2 size={18} className="text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-700">Permintaan terkirim!</p>
            <p className="text-xs text-green-600 mt-0.5">
              Admin Loka akan segera mengirim undangan ke email Google Anda. Cek inbox dalam beberapa menit.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Email input */}
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Email Google (akun di HP Android / Tablet Anda)
            </label>
            <input
              type="email"
              value={googleEmail}
              onChange={(e) => setGoogleEmail(e.target.value)}
              placeholder="contoh@gmail.com"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition placeholder-gray-300"
            />
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 mb-4 px-3 py-2.5 bg-blue-50 rounded-xl">
            <Info size={13} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600 leading-relaxed">
              Pastikan email yang dimasukkan adalah akun Google yang terdaftar di HP/tablet Android Anda. Undangan download akan dikirim ke email tersebut.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleRequest}
              disabled={!googleEmail.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl transition"
            >
              <Smartphone size={15} />
              Minta Akses Download
            </button>
            <button
              onClick={handleDirectChat}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-xl transition"
            >
              <MessageCircle size={15} className="text-green-500" />
              Chat Admin
            </button>
          </div>
        </>
      )}
    </div>
  )
}
