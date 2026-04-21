import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShoppingBag, BarChart3, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { login, verifyOtp, requestForgotPassword, verifyForgotPasswordOtp, resetPassword } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import { getErrorMessage } from '@/lib/utils'
import { parseJwtPayload } from '@/lib/jwt'
import type { AuthUser, AppMode } from '@/types'
import LoadingOverlay from '@/components/ui/LoadingOverlay'

function hydrateUserFromToken(user: AuthUser): AuthUser {
  const payload = parseJwtPayload(user.token)
  return {
    ...user,
    permissions: payload?.permissions ?? [],
    app_mode: (payload?.app_mode as AppMode) ?? 'RETAIL',
  }
}

// ─── Feature highlights shown on the hero panel ──────────────────────────────
const features = [
  { icon: ShoppingBag, text: 'Catat transaksi penjualan dengan cepat' },
  { icon: Package,     text: 'Kelola stok & inventori multi-outlet' },
  { icon: BarChart3,   text: 'Laporan bisnis real-time & akurat' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  useOutletStore((s) => s.setOutlet)

  const [step, setStep] = useState<'login' | 'otp' | 'forgot' | 'forgot-otp' | 'reset'>('login')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await login(identifier, password)
      if (res.data.status) {
        const user = res.data.data
        if (user?.token) {
          setAuth(hydrateUserFromToken(user), user.token)
          navigate('/')
        } else {
          setStep('otp')
          toast.success('OTP Telah Dikirim ke WhatsApp Anda')
        }
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err)
      if (msg.includes('belum diverifikasi') || msg.includes('not verified')) {
        setStep('otp')
        toast('Nomor HP Belum Diverifikasi, Masukkan OTP', { icon: '📱' })
      } else {
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await verifyOtp(identifier, otp)
      if (res.data.status && res.data.data?.token) {
        const user = res.data.data
        setAuth(hydrateUserFromToken(user), user.token)
        toast.success('Login Berhasil!')
        navigate('/')
      }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleRequestForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await requestForgotPassword(identifier)
      setStep('forgot-otp')
      setOtp('')
      toast.success('Kode OTP telah dikirim')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await verifyForgotPasswordOtp(identifier, otp)
      setStep('reset')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) { toast.error('Password minimal 6 karakter'); return }
    setLoading(true)
    try {
      await resetPassword(identifier, newPassword)
      toast.success('Password berhasil direset, silakan login')
      setStep('login')
      setNewPassword('')
      setOtp('')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    {loading && <LoadingOverlay message="Memproses..." />}
    <div className="min-h-screen flex">
      {/* ── Left: Hero Panel ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/3 -right-16 w-64 h-64 bg-blue-500/20 rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-white/5 rounded-full" />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/logo.svg" alt="Loka Kasir" className="h-10 w-auto brightness-0 invert" />
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-blue-200 text-sm font-semibold uppercase tracking-widest mb-3">
              Platform POS untuk UMKM Indonesia
            </p>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Kelola Bisnis Lebih{' '}
              <span className="text-blue-200">Cerdas</span>{' '}
              &amp; Lebih{' '}
              <span className="text-blue-200">Mudah</span>
            </h1>
            <p className="mt-4 text-blue-100 text-lg leading-relaxed max-w-md">
              Satu platform terintegrasi untuk mencatat penjualan, mengelola stok,
              dan memantau performa bisnis Anda kapan saja.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-blue-100">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Icon size={16} className="text-white" />
                </span>
                <span className="text-sm">{text}</span>
              </li>
            ))}
          </ul>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { value: 'Gratis',   label: '30 hari pertama' },
              { value: 'Multi',    label: 'Outlet & kasir' },
              { value: 'Real-time', label: 'Laporan bisnis' },
            ].map((s) => (
              <div key={s.label} className="px-4 py-2 bg-white/10 backdrop-blur rounded-xl text-center">
                <p className="text-white font-bold text-lg leading-none">{s.value}</p>
                <p className="text-blue-200 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-blue-300 text-xs">
          © {new Date().getFullYear()} Loka Kasir. All rights reserved.
        </p>
      </div>

      {/* ── Right: Form Panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.svg" alt="Loka Kasir" className="h-9 w-auto mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Panel Pengelolaan Platform</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {step === 'forgot' ? (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-bold text-gray-900">Lupa Password</h2>
                  <p className="text-gray-500 text-sm mt-1">Masukkan email atau nomor HP Anda, kami akan kirim kode OTP.</p>
                </div>
                <form onSubmit={handleRequestForgot} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email / Nomor HP</label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="email@bisnis.com atau 08xxx"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60">
                    {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
                  </button>
                  <button type="button" onClick={() => setStep('login')} className="w-full text-sm text-gray-500 hover:text-gray-700 py-2">
                    Kembali ke Login
                  </button>
                </form>
              </>
            ) : step === 'forgot-otp' ? (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-bold text-gray-900">Verifikasi OTP</h2>
                  <p className="text-gray-500 text-sm mt-1">Kode dikirim ke <span className="font-semibold text-blue-600">{identifier}</span></p>
                </div>
                <form onSubmit={handleVerifyForgotOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Kode OTP</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6 Digit OTP"
                      maxLength={6}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60">
                    {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
                  </button>
                  <button type="button" onClick={() => setStep('forgot')} className="w-full text-sm text-gray-500 hover:text-gray-700 py-2">
                    Kirim ulang kode
                  </button>
                </form>
              </>
            ) : step === 'reset' ? (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-bold text-gray-900">Password Baru</h2>
                  <p className="text-gray-500 text-sm mt-1">Buat password baru untuk akun Anda.</p>
                </div>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password Baru</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 6 karakter"
                        required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60">
                    {loading ? 'Menyimpan...' : 'Reset Password'}
                  </button>
                </form>
              </>
            ) : step === 'login' ? (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-bold text-gray-900">Masuk ke Dashboard</h2>
                  <p className="text-gray-500 text-sm mt-1">Selamat datang kembali!</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email / Nomor HP
                    </label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="email@bisnis.com atau 08xxx"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-gray-700">Password</label>
                      <button
                        type="button"
                        onClick={() => { setStep('forgot'); setOtp('') }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Lupa Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  >
                    {loading ? 'Memproses...' : 'Masuk'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="mb-7">
                  <h2 className="text-2xl font-bold text-gray-900">Verifikasi OTP</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Kode dikirim ke WhatsApp{' '}
                    <span className="font-semibold text-blue-600">{identifier}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Kode OTP
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6 Digit OTP"
                      maxLength={6}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
                  >
                    {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('login')}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
                  >
                    Kembali ke Login
                  </button>
                </form>
              </>
            )}

            <p className="text-center text-sm text-gray-500 mt-6 pt-6 border-t border-gray-100">
              Belum punya akun?{' '}
              <Link to="/register" className="text-blue-600 font-semibold hover:underline">
                Daftar gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
