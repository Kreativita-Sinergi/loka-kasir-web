import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { login, verifyOtp } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import { getErrorMessage } from '@/lib/utils'
import { parseJwtPayload } from '@/lib/jwt'
import type { AuthUser, AppMode } from '@/types'

/**
 * Enriches the AuthUser object returned by the server with `permissions` and
 * `app_mode` decoded from the JWT payload.
 *
 * The backend embeds these claims in the token (see jwt_service.go). Parsing
 * client-side avoids a separate `/me/permissions` round-trip on every refresh.
 */
function hydrateUserFromToken(user: AuthUser): AuthUser {
  const payload = parseJwtPayload(user.token)
  return {
    ...user,
    permissions: payload?.permissions ?? [],
    app_mode: (payload?.app_mode as AppMode) ?? 'RETAIL',
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  // Outlet context is intentionally NOT auto-selected on login.
  // The web backoffice defaults to "All Outlets" (null) — same as Moka/Majoo.
  // Owners/Managers pick a branch via the OutletDropdown in the header.
  useOutletStore((s) => s.setOutlet) // keep store wired so logout still clears it

  const [step, setStep] = useState<'login' | 'otp'>('login')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Loka Kasir" className="h-10 w-auto mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Panel Pengelolaan Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email / Nomor HP
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email@bisnis.com atau 08xxx"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center mb-2">
                <p className="text-sm text-gray-600">
                  Masukkan Kode OTP yang Dikirim ke WhatsApp
                </p>
                <p className="text-sm font-semibold text-blue-600">{identifier}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Kembali ke Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
