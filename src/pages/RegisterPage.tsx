import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, ChevronRight, ChevronLeft,
  Store, ClipboardList, CheckCircle2, ShieldCheck, RefreshCw, Mail, User,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Turnstile } from '@marsidev/react-turnstile'
import { registerBusiness, verifyOtp, retryOtp } from '@/api/auth'
import { getBusinessTypes, getProvinces, getCitiesByProvince, getDistrictsByCity, getVillagesByDistrict } from '@/api/master'
import { getErrorMessage } from '@/lib/utils'
import PasswordStrengthBar from '@/components/ui/PasswordStrengthBar'
import LoadingOverlay from '@/components/ui/LoadingOverlay'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  full_name: string
  email: string
  phone_number: string
  password: string
  confirm_password: string
  business_name: string
  business_type_id: string
  outlet_name: string
  province_id: string
  city_id: string
  district_id: string
  village_id: string
}

const emptyForm: FormData = {
  full_name: '', email: '', phone_number: '', password: '', confirm_password: '',
  business_name: '', business_type_id: '', outlet_name: '',
  province_id: '', city_id: '', district_id: '', village_id: '',
}

// ─── Reusable field components ────────────────────────────────────────────────

function InputField({
  label, type = 'text', value, onChange, placeholder, required = true, suffix, hint,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void
  placeholder?: string; required?: boolean; suffix?: React.ReactNode; hint?: string
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
        <option value="">{placeholder ?? 'Pilih...'}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Step indicator (3 steps) ─────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Data Akun',   icon: <User         size={14} /> },
    { n: 2, label: 'Data Bisnis', icon: <ClipboardList size={14} /> },
    { n: 3, label: 'Verifikasi',  icon: <ShieldCheck   size={14} /> },
  ]
  return (
    <div className="flex items-start justify-center mb-6">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-start flex-1 max-w-[120px]">
          <div className="flex flex-col items-center w-full">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              current === s.n ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : current > s.n  ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400'
              : 'bg-muted text-muted-foreground'
            }`}>
              {current > s.n ? <CheckCircle2 size={15} /> : s.icon}
            </div>
            <span className={`text-[10px] font-medium mt-1.5 text-center leading-tight w-14 ${
              current === s.n ? 'text-blue-600 dark:text-blue-400' : current > s.n ? 'text-blue-400' : 'text-muted-foreground'
            }`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px mt-4 mx-1 ${current > s.n ? 'bg-blue-400' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate()

  const [step, setStep]           = useState<1 | 2 | 3>(1)
  const [form, setForm]           = useState<FormData>(emptyForm)
  const [otp, setOtp]             = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [showPass, setShowPass]   = useState(false)
  const [showConf, setShowConf]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')

  // ── Master data (loaded for step 2) ─────────────────────────────────────────
  const { data: businessTypesData } = useQuery({
    queryKey: ['business-types-public'],
    queryFn: () => getBusinessTypes(),
    retry: false,
  })
  const businessTypes = businessTypesData?.data?.data ?? []

  const { data: provincesData } = useQuery({
    queryKey: ['provinces-public'],
    queryFn: () => getProvinces(),
    enabled: step >= 2,
    retry: false,
  })
  const provinces = provincesData?.data?.data ?? []

  const { data: citiesData } = useQuery({
    queryKey: ['cities-public', form.province_id],
    queryFn: () => getCitiesByProvince(Number(form.province_id)),
    enabled: step >= 2 && !!form.province_id,
    retry: false,
  })
  const cities = citiesData?.data?.data ?? []

  const { data: districtsData } = useQuery({
    queryKey: ['districts-public', form.city_id],
    queryFn: () => getDistrictsByCity(Number(form.city_id)),
    enabled: step >= 2 && !!form.city_id,
    retry: false,
  })
  const districts = districtsData?.data?.data ?? []

  const { data: villagesData } = useQuery({
    queryKey: ['villages-public', form.district_id],
    queryFn: () => getVillagesByDistrict(Number(form.district_id)),
    enabled: step >= 2 && !!form.district_id,
    retry: false,
  })
  const villages = villagesData?.data?.data ?? []

  // ── Step 1 → 2: client-side validation only ──────────────────────────────────

  const handleNextStep = () => {
    if (!form.full_name.trim())                          { toast.error('Nama lengkap harus diisi'); return }
    if (!form.email.trim())                              { toast.error('Email harus diisi'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error('Format email tidak valid'); return }
    if (form.password.length < 6)                        { toast.error('Password minimal 6 karakter'); return }
    if (form.password !== form.confirm_password)         { toast.error('Konfirmasi password tidak cocok'); return }
    setStep(2)
  }

  // ── Step 2 → 3: submit registration ─────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.business_name.trim()) { toast.error('Nama bisnis harus diisi'); return }
    if (!form.business_type_id)     { toast.error('Jenis bisnis harus dipilih'); return }
    if (!form.outlet_name.trim())   { toast.error('Nama outlet harus diisi'); return }
    if (!captchaToken)              { toast.error('Verifikasi captcha belum selesai'); return }

    setLoadingMsg('Mendaftarkan bisnis Anda...')
    setLoading(true)
    try {
      await registerBusiness({
        full_name:        form.full_name.trim(),
        email:            form.email.trim(),
        phone_number:     form.phone_number.trim() || null,
        password:         form.password,
        business_name:    form.business_name.trim(),
        business_type_id: Number(form.business_type_id),
        outlet_name:      form.outlet_name.trim(),
        city_id:          form.city_id     ? Number(form.city_id)     : null,
        district_id:      form.district_id ? Number(form.district_id) : null,
        village_id:       form.village_id  ? Number(form.village_id)  : null,
      }, captchaToken)
      setRegisteredEmail(form.email.trim())
      setOtp('')
      setStep(3)
      toast.success('Pendaftaran berhasil! Cek email untuk kode verifikasi.')
    } catch (err) {
      toast.error(getErrorMessage(err))
      setCaptchaToken('')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: verify OTP ───────────────────────────────────────────────────────

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 6) { toast.error('Masukkan 6 digit kode OTP'); return }
    setLoadingMsg('Memverifikasi OTP...')
    setLoading(true)
    try {
      await verifyOtp(registeredEmail, otp)
      toast.success('Email berhasil diverifikasi! Silakan login.')
      navigate('/login')
    } catch (err) {
      toast.error(getErrorMessage(err))
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  const handleRetryOtp = async () => {
    setLoadingMsg('Mengirim ulang OTP...')
    setLoading(true)
    try {
      await retryOtp(registeredEmail)
      setOtp('')
      toast.success('Kode OTP baru sudah dikirim ke email Anda.')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const stepSubtitle: Record<1 | 2 | 3, string> = {
    1: 'Langkah 1 dari 3 — Informasi akun',
    2: 'Langkah 2 dari 3 — Informasi bisnis',
    3: 'Langkah 3 dari 3 — Verifikasi email',
  }

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

        {/* ── Right: Form Panel ────────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-muted overflow-y-auto">
          <div className="w-full max-w-md py-6">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-6">
              <img src="/logo.svg" alt="Loka Kasir" className="h-9 w-auto mx-auto mb-2" />
              <h1 className="text-xl font-bold text-foreground">Daftarkan Bisnis Anda</h1>
              <p className="text-muted-foreground text-sm mt-1">Mulai gratis selama 14 hari</p>
            </div>

            {/* Desktop heading */}
            <div className="hidden lg:block mb-6">
              <h2 className="text-2xl font-bold text-foreground">Buat Akun Baru</h2>
              <p className="text-muted-foreground text-sm mt-1">{stepSubtitle[step]}</p>
            </div>

            <div className="bg-card rounded-2xl shadow-sm border border-border p-7">
              <StepIndicator current={step} />

              {/* ── Step 1: Data Akun ──────────────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-4">
                  <InputField
                    label="Nama Lengkap"
                    value={form.full_name}
                    onChange={(v) => setForm({ ...form, full_name: v })}
                    placeholder="Nama pemilik bisnis"
                  />
                  <InputField
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(v) => setForm({ ...form, email: v })}
                    placeholder="email@bisnis.com"
                    hint="Kode verifikasi akan dikirim ke email ini"
                  />
                  <InputField
                    label="Nomor HP (opsional)"
                    type="tel"
                    value={form.phone_number}
                    onChange={(v) => setForm({ ...form, phone_number: v })}
                    placeholder="08xxxxxxxxxx"
                  />
                  <div>
                    <InputField
                      label="Password"
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={(v) => setForm({ ...form, password: v })}
                      placeholder="Min. 6 karakter"
                      suffix={
                        <button type="button" onClick={() => setShowPass(!showPass)} className="text-muted-foreground hover:text-muted-foreground">
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      }
                    />
                    <PasswordStrengthBar password={form.password} />
                  </div>
                  <InputField
                    label="Konfirmasi Password"
                    type={showConf ? 'text' : 'password'}
                    value={form.confirm_password}
                    onChange={(v) => setForm({ ...form, confirm_password: v })}
                    placeholder="Ulangi password"
                    suffix={
                      <button type="button" onClick={() => setShowConf(!showConf)} className="text-muted-foreground hover:text-muted-foreground">
                        {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    }
                  />

                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition mt-2"
                  >
                    Lanjutkan <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* ── Step 2: Data Bisnis ────────────────────────────────────── */}
              {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <InputField
                    label="Nama Bisnis"
                    value={form.business_name}
                    onChange={(v) => setForm({ ...form, business_name: v })}
                    placeholder="Contoh: Warung Makan Loka"
                  />
                  <SelectField
                    label="Jenis Bisnis"
                    value={form.business_type_id}
                    onChange={(v) => setForm({ ...form, business_type_id: v })}
                    options={businessTypes.map((b) => ({ value: String(b.id), label: b.name }))}
                    placeholder="Pilih jenis bisnis..."
                  />
                  <InputField
                    label="Nama Outlet Pertama"
                    value={form.outlet_name}
                    onChange={(v) => setForm({ ...form, outlet_name: v })}
                    placeholder="Contoh: Cabang Utama"
                    hint="Bisa ditambah lebih banyak outlet setelah mendaftar"
                  />

                  {/* Lokasi — 2 kolom per baris */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                      Lokasi Bisnis <span className="font-normal normal-case">(opsional)</span>
                    </p>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <SelectField
                          label="Provinsi"
                          value={form.province_id}
                          onChange={(v) => setForm({ ...form, province_id: v, city_id: '', district_id: '', village_id: '' })}
                          options={provinces.map((p) => ({ value: String(p.id), label: p.name }))}
                          placeholder="Pilih..."
                          required={false}
                        />
                        <SelectField
                          label="Kota / Kabupaten"
                          value={form.city_id}
                          onChange={(v) => setForm({ ...form, city_id: v, district_id: '', village_id: '' })}
                          options={cities.map((c) => ({ value: String(c.id), label: `${c.type} ${c.name}` }))}
                          placeholder={form.province_id ? 'Pilih...' : '—'}
                          required={false}
                          disabled={!form.province_id}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <SelectField
                          label="Kecamatan"
                          value={form.district_id}
                          onChange={(v) => setForm({ ...form, district_id: v, village_id: '' })}
                          options={districts.map((d) => ({ value: String(d.id), label: d.name }))}
                          placeholder={form.city_id ? 'Pilih...' : '—'}
                          required={false}
                          disabled={!form.city_id}
                        />
                        <SelectField
                          label="Kelurahan / Desa"
                          value={form.village_id}
                          onChange={(v) => setForm({ ...form, village_id: v })}
                          options={villages.map((v) => ({ value: String(v.id), label: v.name }))}
                          placeholder={form.district_id ? 'Pilih...' : '—'}
                          required={false}
                          disabled={!form.district_id}
                        />
                      </div>
                    </div>
                  </div>

                  <Turnstile
                    siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                    onSuccess={setCaptchaToken}
                    onExpire={() => setCaptchaToken('')}
                    onError={() => setCaptchaToken('')}
                    options={{ theme: 'light' }}
                  />

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1.5 px-5 py-3 border border-border text-muted-foreground font-medium rounded-xl hover:bg-muted transition text-sm"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <button
                      type="submit"
                      disabled={!captchaToken}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
                    >
                      <Store size={15} /> Daftarkan Bisnis
                    </button>
                  </div>
                </form>
              )}

              {/* ── Step 3: Verifikasi Email OTP ───────────────────────────── */}
              {step === 3 && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 rounded-xl p-4 text-center">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/15 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Mail size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">Cek email Anda</p>
                    <p className="text-sm text-muted-foreground">
                      Kode verifikasi 6 digit sudah dikirim ke
                    </p>
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mt-0.5 break-all">{registeredEmail}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Kode OTP <span className="text-red-500 dark:text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-[0.5em] font-mono"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={otp.length < 6}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
                  >
                    <ShieldCheck size={16} /> Verifikasi Email
                  </button>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Tidak ada email? Cek folder Spam.
                    </p>
                    <button
                      type="button"
                      onClick={handleRetryOtp}
                      disabled={loading}
                      className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline disabled:opacity-50"
                    >
                      <RefreshCw size={12} /> Kirim Ulang
                    </button>
                  </div>
                </form>
              )}

              <p className="text-center text-sm text-muted-foreground mt-6 pt-5 border-t border-border">
                Sudah punya akun?{' '}
                <Link to="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  Masuk di sini
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
