import Form from '@/components/ui/Form'
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShoppingBag, BarChart3, Package, Moon, Sun, MessageCircle } from 'lucide-react'
import { whatsappContactUrl } from '@/lib/constants'
import toast from 'react-hot-toast'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { login } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { currentLandingPath } from '@/lib/landing'
import { useThemeStore } from '@/store/themeStore'
import { errorCodeOf, getErrorMessage, getFailureMessage } from '@/lib/utils'
import { hydrateUserFromToken } from '@/lib/jwt'
import { CAPTCHA_ENABLED, initialCaptchaToken } from '@/lib/captcha'
import LoadingOverlay from '@/components/ui/LoadingOverlay'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LanguageMenu from '@/components/ui/LanguageMenu'
import AppDownloadButtons from '@/components/ui/AppDownloadButtons'
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
  const [showForgot, setShowForgot] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loginCaptchaToken, setLoginCaptchaToken] = useState(initialCaptchaToken)
  const mountedRef = useRef(true)
  const turnstileRef = useRef<TurnstileInstance | null>(null)
  // Disetel ulang ke true di badan efek: StrictMode memasang-lepas-memasang
  // komponen, dan tanpa ini ref tertinggal false sehingga overlay memuat tak
  // pernah hilang setelah login gagal.
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginCaptchaToken) { toast.error(t('regCaptchaIncomplete')); return }
    setLoading(true)
    try {
      const res = await login(identifier, password, loginCaptchaToken)
      if (res.data.status) {
        const user = res.data.data
        if (user?.token) {
          const hydrated = hydrateUserFromToken(user)
          setAuth(hydrated, user.token)
          // BUKAN "/". Halaman depan menuntut `reports.view`, dan peran yang
          // bekerja dengan barang — Gudang, Staf Stok Masuk — tidak
          // memilikinya: kata sandi yang benar berakhir di "Akses Ditolak".
          navigate(currentLandingPath())
        } else {
          // Akun yang belum terverifikasi dijawab 403 dan ditangani di catch,
          // jadi login yang berhasil SELALU mengembalikan token. Respons tanpa
          // token berarti ada yang tidak beres di server.
          toast.error(t('loginFailed'))
        }
      } else {
        // Password salah dijawab server dengan HTTP 200 dan `status: false`,
        // jadi axios tidak melemparkannya dan blok catch di bawah tidak pernah
        // berjalan. Tanpa cabang ini, menekan Masuk dengan password keliru
        // tidak menghasilkan apa pun: tidak ada pesan, tidak ada perubahan —
        // yang terbaca sebagai aplikasi yang menggantung, bukan sebagai
        // password yang salah.
        //
        // Tokennya juga harus dikosongkan, sama seperti di jalur catch:
        // Turnstile sekali pakai, dan tanpa token baru tombol Masuk terkunci
        // setelah satu kali salah.
        setLoginCaptchaToken(initialCaptchaToken())
        turnstileRef.current?.reset()
        toast.error(getFailureMessage(res.data))
      }
    } catch (err: unknown) {
      // Akun yang belum memasukkan OTP pendaftarannya dijawab 403
      // AUTH_NOT_VERIFIED. Dicocokkan lewat KODE, bukan pesannya — pesan
      // server mengikuti bahasa permintaan.
      if (errorCodeOf(err) === 'AUTH_NOT_VERIFIED') {
        navigate('/verifikasi-email', { state: { email: identifier.trim(), from: 'login' } })
        return
      }
      const msg = getErrorMessage(err)
      // Token Turnstile sekali pakai, jadi harus dikosongkan agar widget
      // mengeluarkan yang baru. Saat captcha dimatikan di dev tidak ada widget
      // yang akan mengisinya kembali — mengosongkannya di sana justru mengunci
      // tombol Masuk setelah satu kali salah password.
      setLoginCaptchaToken(initialCaptchaToken())
      turnstileRef.current?.reset()
      toast.error(msg)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  return (
    <>
      {loading && <LoadingOverlay message={t('processing')} />}
      <div className="flex h-dvh overflow-hidden bg-background">

        {/* ── Left: Hero Panel ── */}
        <div className="relative hidden h-full shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1B5AE8] via-[#1448C5] to-[#0d2d8a] p-12 lg:flex lg:w-1/2">
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
                    sini — sebagian bahasa merangkainya tanpa spasi sama sekali. */}
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

        {/* ── Right: Form Panel ──
            Mengikuti layar masuk di aplikasi: form langsung di atas panel
            putih tanpa kartu di dalam kartu, satu kolom selebar 24rem, dan
            hal sekunder (daftar, lupa password, bantuan) di bawah garis. */}
        <div className="relative min-w-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col px-6 py-5 sm:px-10">
            {/* Pemilih bahasa dan tema ikut alur halaman, bukan melayang di
                atas form; keduanya HARUS ada di sini karena Pengaturan berada
                di balik layar ini. */}
            <div className="flex items-center justify-end gap-1">
              <LanguageMenu />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                title={theme === 'dark' ? t('loginUseLightTheme') : t('loginUseDarkTheme')}
                aria-label={theme === 'dark' ? t('loginUseLightTheme') : t('loginUseDarkTheme')}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
            </div>

            <div className="flex flex-1 items-center justify-center py-6">
              <div className="w-full max-w-sm">
                <img src="/logo.svg" alt="Loka Kasir" className="mb-8 h-9 w-auto lg:hidden" />

                <h2 className="text-2xl font-bold tracking-tight text-foreground">{t('loginTitle')}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{t('loginSubtitle')}</p>

                <Form onSubmit={handleLogin} className="mt-8 space-y-4">
                  <div className="space-y-1.5">
                    {/* Bukan `type="email"`, dan bukan hanya "Email".
                        Pemilik memang masuk dengan email — pendaftaran hanya
                        meminta itu, dan semua OTP dikirim ke sana. Tetapi
                        KARYAWAN masuk dengan nama masuk bikinan server
                        ("budi@kedai"), yang bukan alamat email dan tidak
                        punya kotak masuk. Kolom berlabel "Email" membuat
                        pemilik mengetik email pribadi karyawannya, lalu
                        menyimpulkan akunnya rusak. */}
                    <Label htmlFor="identifier">{t('loginIdentifier')}</Label>
                    <Input
                      id="identifier"
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={t('profileBusinessEmailPlaceholder')}
                      required
                      className="h-11 rounded-[10px]"
                    />
                    <p className="text-xs text-muted-foreground">{t('loginIdentifierHint')}</p>
                  </div>

                  <div className="space-y-1.5">
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
                        className="h-11 rounded-[10px] pr-12"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPass(!showPass)}
                        aria-label={showPass ? t('loginHidePassword') : t('loginShowPassword')}
                        className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </Button>
                    </div>
                    {/* "Lupa password?" rata kanan di bawah kolomnya, seperti
                        di aplikasi. Pemulihannya masih di aplikasi, jadi
                        menekannya membuka pop-up petunjuk + lencana unduh,
                        bukan halaman baru. */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {t('loginForgotPassword')}
                      </button>
                    </div>
                  </div>

                  {CAPTCHA_ENABLED ? (
                    <Turnstile ref={turnstileRef} siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} onSuccess={setLoginCaptchaToken} onExpire={() => setLoginCaptchaToken('')} onError={() => setLoginCaptchaToken('')} options={{ theme }} />
                  ) : (
                    <p className="text-xs text-muted-foreground">{t('loginCaptchaSkipped')}</p>
                  )}

                  <Button type="submit" disabled={loading || !loginCaptchaToken} className="h-12 w-full rounded-xl text-[15px]">
                    {loading ? t('processing') : t('signIn')}
                  </Button>
                </Form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {t('loginNoAccount')}{' '}
                  <Link to="/register" className="font-semibold text-primary hover:underline">{t('loginRegisterLink')}</Link>
                </p>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              {t('loginTrouble')}{' '}
              <a
                href={whatsappContactUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-success hover:underline"
              >
                <MessageCircle size={13} /> {t('loginContactUs')}
              </a>
            </p>
          </div>
        </div>

      </div>

      <Modal open={showForgot} onClose={() => setShowForgot(false)} title={t('loginForgotPassword')} size="sm">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {/* Spasi sengaja ADA DI DALAM terjemahannya, bukan di sini sebagai
              {' '}: tidak semua bahasa memakai spasi antar kata, dan pemisah
              yang dipaksakan di JSX membelah kalimatnya. */}
          {t('loginForgotPasswordPrefix')}
          <span className="font-semibold text-foreground">{t('loginAppName')}</span>
          {t('loginForgotPasswordSuffix')}
        </p>
        <AppDownloadButtons className="mt-4" />
      </Modal>
    </>
  )
}
