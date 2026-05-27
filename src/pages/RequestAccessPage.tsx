import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2, Store, User, Phone, MapPin, Mail,
  MessageCircle, ChevronRight, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { submitRequestAccess } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'

const ADMIN_WHATSAPP = import.meta.env.VITE_ADMIN_WHATSAPP ?? '6281234567890'

function Field({
  label, type = 'text', value, onChange, placeholder, required = false, icon: Icon, hint,
}: {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  icon?: React.ElementType
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={16} />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full ${Icon ? 'pl-9' : 'px-4'} pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm`}
        />
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function RequestAccessPage() {
  const [form, setForm] = useState({ name: '', phone: '', business_name: '', city: '', emails: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set = (key: keyof typeof form) => (v: string) => setForm({ ...form, [key]: v })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim())          { toast.error('Nama harus diisi'); return }
    if (!form.phone.trim())         { toast.error('Nomor HP harus diisi'); return }
    if (!form.business_name.trim()) { toast.error('Nama bisnis harus diisi'); return }

    setLoading(true)
    try {
      await submitRequestAccess({
        name:          form.name.trim(),
        phone:         form.phone.trim(),
        business_name: form.business_name.trim(),
        city:          form.city.trim() || undefined,
        email:         form.emails.trim() || undefined,
      })
      setSubmitted(true)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const waMessage = encodeURIComponent(
    `Halo, saya ${form.name || 'sudah'} mengisi form permintaan akses Loka Kasir atas nama bisnis ${form.business_name || '-'}. Mohon ditindaklanjuti. 🙏`
  )
  const waUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${waMessage}`

  return (
    <div className="min-h-screen flex">
      {/* ── Left hero panel ──────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/3 -right-16 w-64 h-64 bg-blue-500/20 rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full" />

        <div className="relative z-10">
          <img src="/logo.svg" alt="Loka Kasir" className="h-10 w-auto brightness-0 invert" />
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <p className="text-blue-200 text-sm font-semibold uppercase tracking-widest mb-3">
              Gratis 14 Hari Pertama
            </p>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Mulai Perjalanan Bisnis Anda Bersama Kami
            </h1>
            <p className="mt-4 text-blue-100 text-base leading-relaxed">
              Daftarkan bisnis Anda sekarang dan nikmati semua fitur lengkap
              platform POS kami tanpa biaya selama 14 hari.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              'Verifikasi aman via Email',
              'Tidak perlu kartu kredit',
              'Setup dalam 5 menit',
              'Multi-outlet & multi-kasir',
              'Laporan & analitik lengkap',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-blue-100 text-sm">
                <CheckCircle2 size={16} className="text-blue-300 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-blue-300 text-xs">
          © {new Date().getFullYear()} Loka Kasir. All rights reserved.
        </p>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md py-6">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <img src="/logo.svg" alt="Loka Kasir" className="h-9 w-auto mx-auto mb-2" />
            <h1 className="text-xl font-bold text-gray-900">Loka Kasir</h1>
            <p className="text-gray-500 text-sm mt-1">Mulai gratis selama 14 hari</p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Minta Akses Aplikasi</h2>
            <p className="text-gray-500 text-sm mt-1">
              Tim kami akan menghubungi Anda untuk proses selanjutnya
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
            {submitted ? (
              /* ── Success state ─────────────────────────────────────────── */
              <div className="text-center space-y-5 py-2">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Permintaan Terkirim!</h3>
                  <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                    Terima kasih, <span className="font-semibold text-gray-700">{form.name}</span>!
                    Data Anda sudah kami terima.
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left space-y-1.5">
                  <p className="text-sm text-green-800 font-semibold">Langkah selanjutnya:</p>
                  <p className="text-sm text-green-700">
                    Segera chat admin via WhatsApp di bawah ini untuk mempercepat proses aktivasi akun Anda.
                  </p>
                </div>

                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition"
                >
                  <MessageCircle size={18} />
                  Chat Admin via WhatsApp
                </a>

                <p className="text-sm text-gray-500">
                  Sudah punya akun?{' '}
                  <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                    Masuk di sini
                  </Link>
                </p>
              </div>
            ) : (
              /* ── Form ──────────────────────────────────────────────────── */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Close testing notice */}
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">
                    Periode testing telah ditutup. Silakan isi form ini untuk mengajukan permintaan akses.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <MessageCircle size={16} className="text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    Setelah mengisi form ini, langsung chat admin via WhatsApp untuk proses aktivasi.
                  </p>
                </div>

                <Field
                  label="Nama Lengkap"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="Nama pemilik bisnis"
                  required
                  icon={User}
                />
                <Field
                  label="Nomor HP (WhatsApp)"
                  type="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="08xxxxxxxxxx"
                  required
                  icon={Phone}
                />
                <Field
                  label="Nama Bisnis"
                  value={form.business_name}
                  onChange={set('business_name')}
                  placeholder="Contoh: Warung Makan Loka"
                  required
                  icon={Store}
                />
                <Field
                  label="Kota / Kabupaten"
                  value={form.city}
                  onChange={set('city')}
                  placeholder="Contoh: Jakarta Selatan"
                  icon={MapPin}
                />

                {/* Email — textarea for multiple addresses */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Mail size={14} className="text-gray-400" />
                      Email
                    </span>
                  </label>
                  <textarea
                    value={form.emails}
                    onChange={(e) => set('emails')(e.target.value)}
                    placeholder={"email1@gmail.com\nemail2@gmail.com"}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Bisa lebih dari satu email, tulis satu per baris.{' '}
                    <span className="text-amber-600 font-medium">
                      Pastikan email sama dengan yang digunakan di Play Store.
                    </span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Kirim Permintaan <ChevronRight size={16} /></>
                  )}
                </button>

                <p className="text-center text-sm text-gray-500 pt-3 border-t border-gray-100">
                  Sudah punya akun?{' '}
                  <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                    Masuk di sini
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
