import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShoppingBag, BarChart3, Package, Moon, Sun, MessageCircle, Download } from 'lucide-react'
import { APP_DOWNLOAD_URL, WHATSAPP_CONTACT_URL } from '@/lib/constants'
import toast from 'react-hot-toast'
import { Turnstile } from '@marsidev/react-turnstile'
import { login, verifyOtp } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { getErrorMessage } from '@/lib/utils'
import { parseJwtPayload } from '@/lib/jwt'
import type { AuthUser, AppMode } from '@/types'
import LoadingOverlay from '@/components/ui/LoadingOverlay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

function hydrateUserFromToken(user: AuthUser): AuthUser {
  const payload = parseJwtPayload(user.token)
  return {
    ...user,
    permissions: payload?.permissions ?? [],
    app_mode: (payload?.app_mode as AppMode) ?? 'RETAIL',
  }
}

const features = [
  { icon: ShoppingBag, text: 'Catat transaksi penjualan dengan cepat' },
  { icon: Package, text: 'Kelola stok & inventori multi-outlet' },
  { icon: BarChart3, text: 'Laporan bisnis real-time & akurat' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const { theme, toggleTheme } = useThemeStore()

  // Dashboard web hanya untuk MASUK.
  //
  // Pemulihan password dipindahkan sepenuhnya ke aplikasi: OTP-nya dikirim ke
  // email dan kode itu diketik di HP yang sama dengan yang memegang akunnya.
  // Menyediakan alur kedua di web berarti dua tempat yang harus sama-sama benar
  // untuk satu hal yang jarang dipakai — dan yang satu itu lebih mudah salah.
  const [step, setStep] = useState<'login' | 'otp'>('login')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loginCaptchaToken, setLoginCaptchaToken] = useState('')
  const mountedRef = useRef(true)
  useEffect(() => { return () => { mountedRef.current = false } }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginCaptchaToken) { toast.error('Verifikasi captcha belum selesai'); return }
    setLoading(true)
    try {
      const res = await login(identifier, password, loginCaptchaToken)
      if (res.data.status) {
        const user = res.data.data
        if (user?.token) {
          setAuth(hydrateUserFromToken(user), user.token)
          navigate('/')
        } else {
          setStep('otp')
          toast.success('OTP Telah Dikirim ke Email Anda')
        }
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err)
      setLoginCaptchaToken('')
      if (msg.includes('belum diverifikasi') || msg.includes('not verified')) {
        setStep('otp')
        toast('Email Belum Diverifikasi, Masukkan OTP', { icon: '✉️' })
      } else {
        toast.error(msg)
      }
    } finally {
      if (mountedRef.current) setLoading(false)
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
      if (mountedRef.current) setLoading(false)
    }
  }



  return (
    <>
      {loading && <LoadingOverlay message="Memproses..." />}
      <div className="min-h-screen flex bg-background">

        {/* ── Left: Hero Panel ── */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-[#1B5AE8] via-[#1448C5] to-[#0d2d8a]">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute top-1/3 -right-16 w-64 h-64 bg-blue-400/20 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-white/5 rounded-full" />

          <div className="relative z-10">
            <img src="/logo.svg" alt="Loka Kasir" className="h-10 w-auto brightness-0 invert" />
          </div>

          <div className="relative z-10 space-y-8">
            <div>
              <p className="text-blue-200 text-sm font-semibold uppercase tracking-widest mb-3">
                Platform POS untuk UMKM Indonesia
              </p>
              <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
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

            <div className="flex flex-wrap gap-3 pt-2">
              {[
                { value: 'Gratis', label: '3 bulan pertama' },
                { value: 'Multi', label: 'Outlet & kasir' },
                { value: 'Real-time', label: 'Laporan bisnis' },
              ].map((s) => (
                <div key={s.label} className="px-4 py-2 bg-white/10 backdrop-blur rounded-xl text-center">
                  <p className="text-white font-bold text-lg leading-none">{s.value}</p>
                  <p className="text-blue-200 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-blue-300 text-xs">
            © {new Date().getFullYear()} Loka Kasir. All rights reserved.
          </p>
        </div>

        {/* ── Right: Form Panel ── */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="absolute top-4 right-4"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </Button>

          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <img src="/logo.svg" alt="Loka Kasir" className="h-9 w-auto mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Panel Pengelolaan Platform</p>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-8">

                {/* ── Login ── */}
                {step === 'login' && (
                  <>
                    <div className="mb-8">
                      <h2 className="text-[1.75rem] leading-tight font-bold tracking-tight text-foreground">
                        Masuk ke Dashboard
                      </h2>
                      <p className="text-muted-foreground text-sm mt-1.5">
                        Kelola produk, stok, dan laporan bisnis Anda.
                      </p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-5">
                      <div className="space-y-2">
                        {/* Email saja. Pendaftaran hanya meminta email dan semua
                            OTP dikirim ke email, jadi "Nomor HP" di sini
                            menjanjikan cara masuk yang tidak pernah dimiliki
                            akun baru. Server tetap menerima nomor untuk akun
                            lama. */}
                        <Label htmlFor="identifier">Email</Label>
                        <Input
                          id="identifier"
                          type="email"
                          autoComplete="username"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder="email@bisnis.com"
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPass ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="h-11 pr-12"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowPass(!showPass)}
                            aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                          >
                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                          </Button>
                        </div>
                      </div>
                      <Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} onSuccess={setLoginCaptchaToken} onExpire={() => setLoginCaptchaToken('')} onError={() => setLoginCaptchaToken('')} options={{ theme }} />
                      <Button type="submit" disabled={loading || !loginCaptchaToken} className="w-full h-11" size="lg">
                        {loading ? 'Memproses…' : 'Masuk'}
                      </Button>
                    </form>
                  </>
                )}

                {/* ── OTP Verify ── */}
                {step === 'otp' && (
                  <>
                    <div className="mb-7">
                      <h2 className="text-2xl font-bold text-foreground">Verifikasi OTP</h2>
                      <p className="text-muted-foreground text-sm mt-1">
                        Kode dikirim ke Email <span className="font-semibold text-primary">{identifier}</span>
                      </p>
                    </div>
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="otp">Kode OTP</Label>
                        <Input id="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6 Digit OTP" maxLength={6} required className="h-11 text-center text-2xl tracking-widest font-mono" />
                      </div>
                      <Button type="submit" disabled={loading} className="w-full h-11" size="lg">
                        {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setStep('login')} className="w-full">
                        Kembali ke Login
                      </Button>
                    </form>
                  </>
                )}

                {/* Semua yang BUKAN "masuk" dikumpulkan di satu blok tenang di
                    bawah garis: mendaftar dan memulihkan password sama-sama
                    dikerjakan di aplikasi, jadi keduanya cukup disebut sekali
                    dengan satu tombol unduh — bukan tiga tautan yang bersaing
                    dengan tombol Masuk. */}
                <div className="mt-8 pt-6 border-t border-border space-y-4">
                  <div className="rounded-xl bg-muted/50 border border-border px-4 py-3.5">
                    <p className="text-sm text-foreground font-medium">
                      Lupa password atau belum punya akun?
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Keduanya dilakukan di{' '}
                      <span className="font-semibold text-foreground">aplikasi Loka Kasir</span>{' '}
                      di HP Anda — kode verifikasinya dikirim ke email dan
                      langsung diketik di sana.
                    </p>
                    <a
                      href={APP_DOWNLOAD_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
                    >
                      <Download size={15} /> Download di Google Play
                    </a>
                  </div>

                  <p className="text-center text-sm text-muted-foreground">
                    Ada kendala masuk?{' '}
                    <a
                      href={WHATSAPP_CONTACT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      <MessageCircle size={14} /> Hubungi kami
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </>
  )
}
