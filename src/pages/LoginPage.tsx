import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShoppingBag, BarChart3, Package, Moon, Sun, MessageCircle, Download } from 'lucide-react'
import { APP_DOWNLOAD_URL, whatsappContactUrl } from '@/lib/constants'
import toast from 'react-hot-toast'
import { Turnstile } from '@marsidev/react-turnstile'
import { login } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { getErrorMessage } from '@/lib/utils'
import { hydrateUserFromToken } from '@/lib/jwt'
import { CAPTCHA_ENABLED, initialCaptchaToken } from '@/lib/captcha'
import LoadingOverlay from '@/components/ui/LoadingOverlay'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import LanguageMenu from '@/components/ui/LanguageMenu'
import { t } from '@/lib/i18n'

// Fungsi, bukan konstanta: isinya memanggil t(), dan konstanta modul
// dievaluasi sekali saat berkas dimuat — bahasanya akan terkunci pada yang
// kebetulan aktif saat itu dan tidak ikut berubah saat pengguna menggantinya.
const featureList = () => [
  { icon: ShoppingBag, text: t('loginPerkFastSales') },
  { icon: Package, text: t('loginPerkMultiOutletStock') },
  { icon: BarChart3, text: t('loginPerkRealtimeReports') },
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
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loginCaptchaToken, setLoginCaptchaToken] = useState(initialCaptchaToken)
  const mountedRef = useRef(true)
  useEffect(() => { return () => { mountedRef.current = false } }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginCaptchaToken) { toast.error(t('regCaptchaIncomplete')); return }
    setLoading(true)
    try {
      const res = await login(identifier, password, loginCaptchaToken)
      if (res.data.status) {
        const user = res.data.data
        if (user?.token) {
          setAuth(hydrateUserFromToken(user), user.token)
          navigate('/')
        } else {
          // Registrasi mengaktifkan akun sejak awal, jadi login yang berhasil
          // SELALU mengembalikan token. Respons tanpa token berarti ada yang
          // tidak beres di server, bukan permintaan untuk memverifikasi email.
          toast.error(t('loginFailed'))
        }
      }
    } catch (err: unknown) {
      const msg = getErrorMessage(err)
      // Token Turnstile sekali pakai, jadi harus dikosongkan agar widget
      // mengeluarkan yang baru. Saat captcha dimatikan di dev tidak ada widget
      // yang akan mengisinya kembali — mengosongkannya di sana justru mengunci
      // tombol Masuk setelah satu kali salah password.
      setLoginCaptchaToken(initialCaptchaToken())
      toast.error(msg)
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
                {t('loginTagline')}
              </p>
              <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight">
                {/* Spasi ada di dalam terjemahannya, bukan sebagai {' '} di
                    sini — bahasa Jepang merangkainya tanpa spasi sama sekali. */}
                {t('loginHeadlineLead')}
                <span className="text-blue-200">{t('loginSmart')}</span>
                {t('loginHeadlineAnd')}
                <span className="text-blue-200">{t('loginEasy')}</span>
              </h1>
              <p className="mt-4 text-blue-100 text-lg leading-relaxed max-w-md">
                {t('loginSubheadline')}
              </p>
            </div>

            <ul className="space-y-3">
              {featureList().map(({ icon: Icon, text }) => (
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
                { value: t('loginStatFree'), label: t('loginStatTrialLength') },
                { value: t('loginStatMulti'), label: t('loginStatOutletCashier') },
                { value: t('loginStatRealtime'), label: t('loginStatReports') },
              ].map((s) => (
                <div key={s.label} className="px-4 py-2 bg-white/10 backdrop-blur rounded-xl text-center">
                  <p className="text-white font-bold text-lg leading-none">{s.value}</p>
                  <p className="text-blue-200 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-blue-300 text-xs">
            © {new Date().getFullYear()} Loka Kasir. {t('allRightsReserved')}
          </p>
        </div>

        {/* ── Right: Form Panel ── */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
          {/* Pemilih bahasa berdampingan dengan pemilih tema, dan HARUS ada di
              sini: Pengaturan berada di balik layar ini, jadi pengunjung yang
              bahasanya tertebak salah tidak punya jalan lain memperbaikinya. */}
          <div className="absolute top-4 right-4 flex items-center gap-1">
            <LanguageMenu />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === 'dark' ? t('loginUseLightTheme') : t('loginUseDarkTheme')}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
          </div>

          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <img src="/logo.svg" alt="Loka Kasir" className="h-9 w-auto mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">{t('loginPlatformPanel')}</p>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-8">

                <div className="mb-8">
                  <h2 className="text-[1.75rem] leading-tight font-bold tracking-tight text-foreground">
                    {t('loginTitle')}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1.5">
                    {t('loginSubtitle')}
                  </p>
                </div>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    {/* Email saja. Pendaftaran hanya meminta email dan semua
                        OTP dikirim ke email, jadi "Nomor HP" di sini
                        menjanjikan cara masuk yang tidak pernah dimiliki
                        akun baru. Server tetap menerima nomor untuk akun
                        lama. */}
                    <Label htmlFor="identifier">{t('labelEmail')}</Label>
                    <Input
                      id="identifier"
                      type="email"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={t('profileBusinessEmailPlaceholder')}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('labelPassword')}</Label>
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
                        aria-label={showPass ? t('loginHidePassword') : t('loginShowPassword')}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                  </div>
                  {CAPTCHA_ENABLED ? (
                    <Turnstile siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} onSuccess={setLoginCaptchaToken} onExpire={() => setLoginCaptchaToken('')} onError={() => setLoginCaptchaToken('')} options={{ theme }} />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t('loginCaptchaSkipped')}
                    </p>
                  )}
                  <Button type="submit" disabled={loading || !loginCaptchaToken} className="w-full h-11" size="lg">
                    {loading ? t('processing') : t('signIn')}
                  </Button>
                </form>

                {/* Mendaftar kini bisa langsung di sini, jadi diberi tautan
                    sendiri yang jelas. Pemulihan password masih dikerjakan di
                    aplikasi, jadi tetap disebut terpisah dengan tombol unduh. */}
                <div className="mt-8 pt-6 border-t border-border space-y-4">
                  <p className="text-center text-sm text-muted-foreground">
                    {t('loginNoAccount')}{' '}
                    <Link to="/register" className="text-primary font-semibold hover:underline">
                      {t('loginRegisterLink')}
                    </Link>
                  </p>

                  <div className="rounded-xl bg-muted/50 border border-border px-4 py-3.5">
                    <p className="text-sm text-foreground font-medium">
                      {t('loginForgotPassword')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {/* Spasi sengaja ADA DI DALAM terjemahannya, bukan di
                          sini sebagai {' '}: bahasa Jepang tidak memakai spasi
                          antar kata, dan pemisah yang dipaksakan di JSX
                          membelah kalimatnya jadi "アプリ で行います". */}
                      {t('loginForgotPasswordPrefix')}
                      <span className="font-semibold text-foreground">{t('loginAppName')}</span>
                      {t('loginForgotPasswordSuffix')}
                    </p>
                    <a
                      href={APP_DOWNLOAD_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
                    >
                      <Download size={15} /> {t('loginDownloadPlay')}
                    </a>
                  </div>

                  <p className="text-center text-sm text-muted-foreground">
                    {t('loginTrouble')}{' '}
                    <a
                      href={whatsappContactUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      <MessageCircle size={14} /> {t('loginContactUs')}
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
