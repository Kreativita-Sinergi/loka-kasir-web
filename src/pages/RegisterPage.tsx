import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Store, CheckCircle2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { useThemeStore } from '@/store/themeStore'
import { useAuthStore } from '@/store/authStore'
import { hydrateUserFromToken } from '@/lib/jwt'
import { CAPTCHA_ENABLED, DEV_CAPTCHA_TOKEN, initialCaptchaToken } from '@/lib/captcha'
import { registerBusiness, login } from '@/api/auth'
import { getBusinessTypes, getBusinessVerticals } from '@/api/master'
import { getErrorMessage } from '@/lib/utils'
import PasswordStrengthBar from '@/components/ui/PasswordStrengthBar'
import LoadingOverlay from '@/components/ui/LoadingOverlay'
import LanguageMenu from '@/components/ui/LanguageMenu'
import { t } from '@/lib/i18n'

// ─── Types ────────────────────────────────────────────────────────────────────

// Formnya dibuat sama persis dengan aplikasi kasir
// (`lib/features/auth/views/widgets/register_contain_widget.dart`): hanya field
// yang benar-benar diwajibkan backend. Nomor HP, konfirmasi password, dan empat
// dropdown lokasi berantai sengaja tidak ada — semuanya opsional di server dan
// diatur belakangan dari Pengaturan Outlet, sehingga pendaftaran tidak
// bergantung pada rantai permintaan jaringan yang bisa gagal di tengah jalan.
interface FormData {
  full_name: string
  email: string
  password: string
  business_name: string
  business_type_id: string
  business_vertical_id: string
}

const emptyForm: FormData = {
  full_name: '', email: '', password: '',
  business_name: '', business_type_id: '', business_vertical_id: '',
}

// ─── Reusable field components ────────────────────────────────────────────────

function InputField({
  label, type = 'text', value, onChange, placeholder, required = true, suffix, hint, onEnter,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void
  placeholder?: string; required?: boolean; suffix?: React.ReactNode; hint?: string
  onEnter?: () => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
      </label>
      <div className="relative">
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          onKeyDown={onEnter ? (e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter() } } : undefined}
          className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm pr-10"
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  )
}

function SelectField({
  label, value, onChange, options, placeholder, required = true, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; placeholder?: string
  required?: boolean; disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
      </label>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        required={required} disabled={disabled}
        className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-card disabled:bg-muted disabled:text-muted-foreground appearance-none"
      >
        <option value="">{placeholder ?? t('selectPlaceholder')}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate()
  const { theme } = useThemeStore()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [form, setForm]           = useState<FormData>(emptyForm)
  const [showPass, setShowPass]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [captchaToken, setCaptchaToken] = useState(initialCaptchaToken)

  // Turnstile mengeluarkan token sekali pakai. Setelah token dipakai untuk
  // mendaftar, login otomatis butuh token baru — widget-nya di-reset lalu token
  // berikutnya ditunggu lewat resolver ini.
  const turnstileRef = useRef<TurnstileInstance | null>(null)
  const captchaResolverRef = useRef<((token: string) => void) | null>(null)

  const handleCaptchaSuccess = (token: string) => {
    setCaptchaToken(token)
    captchaResolverRef.current?.(token)
    captchaResolverRef.current = null
  }

  // Mengembalikan string kosong bila token tidak kunjung datang, supaya
  // pendaftaran tidak menggantung selamanya menunggu captcha.
  const requestFreshCaptchaToken = () =>
    new Promise<string>((resolve) => {
      if (!CAPTCHA_ENABLED) {
        resolve(DEV_CAPTCHA_TOKEN)
        return
      }
      const timeout = setTimeout(() => {
        captchaResolverRef.current = null
        resolve('')
      }, 8000)
      captchaResolverRef.current = (token) => {
        clearTimeout(timeout)
        resolve(token)
      }
      turnstileRef.current?.reset()
    })

  // ── Master data ─────────────────────────────────────────────────────────────

  const { data: businessTypesData } = useQuery({
    queryKey: ['business-types-public'],
    queryFn: () => getBusinessTypes(),
    retry: false,
  })
  const businessTypes = businessTypesData?.data?.data ?? []

  // Bidang usaha bergantung pada pilar yang dipilih, jadi baru diminta setelah
  // jenis bisnis ditentukan.
  const selectedTypeId = form.business_type_id ? Number(form.business_type_id) : null
  const {
    data: verticalsData,
    isFetching: loadingVerticals,
    isError: verticalsFailed,
    refetch: refetchVerticals,
  } = useQuery({
    queryKey: ['business-verticals-public', selectedTypeId],
    queryFn: () => getBusinessVerticals(selectedTypeId!),
    enabled: selectedTypeId !== null,
    retry: false,
  })
  const verticals = verticalsData?.data?.data ?? []

  // Pilihan sub-jenis milik pilar lain akan ditolak server, jadi dikosongkan
  // begitu jenis bisnis berganti.
  const handleBusinessTypeChange = (value: string) => {
    setForm((prev) => ({ ...prev, business_type_id: value, business_vertical_id: '' }))
  }

  // Penjelasan di bawah pemilih bidang usaha: deskripsi pilihan yang sedang
  // aktif, atau ajakan memilih bila belum ada — supaya pemilik tahu pilihan ini
  // mengubah isi aplikasinya, bukan sekadar label.
  const verticalHelperText = () => {
    const selected = verticals.find((v) => String(v.id) === form.business_vertical_id)
    if (selected && selected.description) return selected.description
    return t('regVerticalHint')
  }

  // ── Submit pendaftaran ──────────────────────────────────────────────────────

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    const fullName = form.full_name.trim()
    const email = form.email.trim()
    const businessName = form.business_name.trim()

    // Urutan validasi mengikuti aplikasi supaya pesan gagalnya identik.
    if (!fullName)                                    { toast.error(t('regNameRequired')); return }
    if (!email)                                       { toast.error(t('regEmailRequiredMsg')); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))    { toast.error(t('regEmailInvalidMsg')); return }
    if (form.password.length < 6)                     { toast.error(t('pwMinLength')); return }
    if (!businessName)                                { toast.error(t('regBusinessNameRequired')); return }
    if (!form.business_type_id)                       { toast.error(t('regBusinessTypeRequiredMsg')); return }
    if (!captchaToken)                                { toast.error(t('regCaptchaIncomplete')); return }

    setLoadingMsg(t('regRegistering'))
    setLoading(true)
    try {
      await registerBusiness({
        full_name:            fullName,
        email:                email,
        password:             form.password,
        business_name:        businessName,
        business_type_id:     Number(form.business_type_id),
        business_vertical_id: form.business_vertical_id ? Number(form.business_vertical_id) : null,
        // Outlet pertama memakai nama bisnis — bisa diganti setelah masuk.
        outlet_name:          businessName,
        otp_channel:          'email',
      }, captchaToken)
      await autoLogin(email, form.password)
    } catch (err) {
      toast.error(getErrorMessage(err))
      setCaptchaToken(initialCaptchaToken())
      setLoading(false)
    }
  }

  // ── Masuk otomatis setelah mendaftar ────────────────────────────────────────
  //
  // Akun langsung aktif saat registrasi (`IsVerified: true` di
  // `service/registration_service.go`), jadi tidak ada langkah verifikasi sama
  // sekali — sama persis dengan aplikasi kasir.
  //
  // Login butuh token captcha baru: token Turnstile sekali pakai dan yang lama
  // sudah dipakai mendaftar. Bila token belum siap atau login gagal karena sebab
  // apa pun, akunnya tetap sudah jadi — satu-satunya jalan keluar yang benar
  // adalah layar login, karena mendaftar ulang akan ditolak (email terpakai).
  const autoLogin = async (email: string, password: string) => {
    setLoadingMsg(t('regPreparingAccount'))
    setLoading(true)
    try {
      const token = await requestFreshCaptchaToken()
      if (!token) throw new Error(t('regCaptchaNotReady'))

      const res = await login(email, password, token)
      const user = res.data?.data
      if (!user?.token) throw new Error(t('regNoLoginToken'))

      setAuth(hydrateUserFromToken(user), user.token)
      toast.success(t('regWelcome'))
      navigate('/')
    } catch (err) {
      // Alasannya dicatat: dari layar ini pemilik hanya melihat "akun sudah
      // dibuat, silakan masuk", dan tanpa jejak ini penyebabnya tidak bisa
      // dibedakan — captcha belum siap, membership, atau jaringan.
      console.warn('[register] auto-login gagal, diarahkan ke login:', getErrorMessage(err))
      toast.success(t('regAccountCreatedSignIn'))
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const subtitle = t('regTagline')

  return (
    <>
      {loading && <LoadingOverlay message={loadingMsg} />}

      <div className="min-h-screen flex">
        {/* ── Left: Hero Panel ─────────────────────────────────────────────── */}
        <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
          <div className="absolute top-1/3 -right-16 w-64 h-64 bg-blue-500/20 rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full" />

          <div className="relative z-10">
            <img src="/logo.svg" alt="Loka Kasir" className="h-10 w-auto brightness-0 invert" />
          </div>

          <div className="relative z-10 space-y-6">
            <div>
              <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-200">
                {t('regFreeTwoWeeksTitle')}
              </span>
              <h1 className="mt-4 text-4xl font-extrabold text-white leading-tight">
                {t('regHeroLead')}<br />{t('regYourBusiness')}<br />{t('regHeroWithUs')}
              </h1>
              <p className="mt-3 text-blue-100 text-base leading-relaxed">
                {t('regHeroBody')}
              </p>
            </div>

            {/* Daftar keunggulan — teks & urutannya sama dengan aplikasi */}
            <ul className="space-y-2.5">
              {[
                t('regPerkNoVerification'),
                t('regPerkMultiCashier'),
                t('regPerkReports'),
                t('regPerkStock'),
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-blue-100 text-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <CheckCircle2 size={16} className="text-white" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex gap-2.5">
              {[
                [t('regStatTwoWeeks'), t('regStatFreeAtStart')],
                [t('regStatOneMinute'), t('regStatFiveFields')],
                ['Multi', t('regStatCashierRole')],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-center">
                  <p className="text-sm font-extrabold text-white">{value}</p>
                  <p className="text-[11px] text-blue-200">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-blue-300 text-xs">
            {t('registerRights', { year: new Date().getFullYear() })}
          </p>
        </div>

        {/* ── Right: Form Panel ────────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-muted overflow-y-auto relative">
          {/* Sama seperti layar masuk: pendaftaran juga berada di luar Pengaturan,
              jadi pemilih bahasanya harus ikut ada di sini. */}
          <LanguageMenu className="absolute top-4 right-4" />

          <div className="w-full max-w-md py-6">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-6">
              <img src="/logo.svg" alt="Loka Kasir" className="h-9 w-auto mx-auto mb-2" />
              <h1 className="text-xl font-bold text-foreground">{t('regCreateAccount')}</h1>
              <p className="text-muted-foreground text-sm mt-1">{t('regFreeTwoWeeks')}</p>
            </div>

            {/* Desktop heading */}
            <div className="hidden lg:block mb-6">
              <h2 className="text-2xl font-bold text-foreground">{t('regCreateAccount')}</h2>
              <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
            </div>

            <div className="bg-card rounded-2xl shadow-sm border border-border p-7">
              <form onSubmit={handleSubmit} className="space-y-4">
                  <InputField
                    label={t('regFullName')}
                    value={form.full_name}
                    onChange={(v) => setForm({ ...form, full_name: v })}
                    placeholder={t('regOwnerNamePlaceholder')}
                  />
                  <InputField
                    label={t('labelEmail')}
                    type="email"
                    value={form.email}
                    onChange={(v) => setForm({ ...form, email: v })}
                    placeholder={t('profileBusinessEmailPlaceholder')}
                    hint={t('regEmailHint')}
                  />

                  {/* Satu field password dengan tombol lihat/sembunyikan —
                      tanpa "Konfirmasi Password", sama seperti aplikasi. */}
                  <div>
                    <InputField
                      label={t('accountCurrentPassword')}
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={(v) => setForm({ ...form, password: v })}
                      placeholder={t('pwMinHint')}
                      suffix={
                        <button type="button" onClick={() => setShowPass(!showPass)} className="text-muted-foreground">
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      }
                    />
                    {form.password.length > 0 && <PasswordStrengthBar password={form.password} />}
                  </div>

                  <InputField
                    label={t('profileBusinessName')}
                    value={form.business_name}
                    onChange={(v) => setForm({ ...form, business_name: v })}
                    placeholder={t('regBusinessNamePlaceholder')}
                    hint={t('regBusinessNameHint')}
                    onEnter={() => { if (!loading) void handleSubmit() }}
                  />

                  <SelectField
                    label={t('regBusinessType')}
                    value={form.business_type_id}
                    onChange={handleBusinessTypeChange}
                    options={businessTypes.map((b) => ({ value: String(b.id), label: b.name }))}
                    placeholder={t('regPickBusinessType')}
                  />

                  {/* ── Bidang usaha (opsional) ─────────────────────────────
                      Menentukan APA yang dicatat tiap transaksi: bengkel dapat
                      kolom plat nomor, konter HP dapat IMEI. Kegagalan memuat
                      TIDAK memblokir pendaftaran — pemilik hanya diberi tahu
                      dan diberi jalan mencoba lagi. */}
                  {selectedTypeId !== null && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        {t('regVerticalLabel')}
                      </label>

                      {loadingVerticals ? (
                        <p className="text-xs text-muted-foreground py-3">{t('regLoadingOptions')}</p>
                      ) : verticalsFailed ? (
                        <div className="py-1">
                          <p className="text-xs text-red-500 dark:text-red-400">
                            {t('regVerticalLoadFailed')}
                          </p>
                          <button
                            type="button"
                            onClick={() => void refetchVerticals()}
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 underline mt-1"
                          >
                            {t('actionRetry')}
                          </button>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('regVerticalSkippable')}
                          </p>
                        </div>
                      ) : verticals.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-1">
                          {t('regNoVerticalForType')}
                        </p>
                      ) : (
                        <>
                          <select
                            value={form.business_vertical_id}
                            onChange={(e) => setForm({ ...form, business_vertical_id: e.target.value })}
                            className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-card appearance-none"
                          >
                            <option value="">{t('regPickVertical')}</option>
                            {verticals.map((v) => (
                              <option key={v.id} value={String(v.id)}>{v.name}</option>
                            ))}
                          </select>
                          <p className="text-xs text-muted-foreground mt-1">{verticalHelperText()}</p>
                        </>
                      )}
                    </div>
                  )}

                  {CAPTCHA_ENABLED ? (
                    <Turnstile
                      ref={turnstileRef}
                      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                      onSuccess={handleCaptchaSuccess}
                      onExpire={() => setCaptchaToken('')}
                      onError={() => setCaptchaToken('')}
                      options={{ theme }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t('loginCaptchaSkipped')}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !captchaToken}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
                  >
                  <Store size={15} /> {t('regRegisterBusiness')}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6 pt-5 border-t border-border">
                {t('regHaveAccount')}{' '}
                <Link to="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  {t('regSignInHere')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
