import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Eye, EyeOff, ChevronRight, ChevronLeft,
  Store, ClipboardList, CheckCircle2, MessageCircle,
  ShieldCheck, ExternalLink, Copy, RefreshCw,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { registerBusiness, initRegister, verifyRegisterOtp } from '@/api/auth'
import { getBusinessTypes, getProvinces, getCitiesByProvince, getDistrictsByCity, getVillagesByDistrict } from '@/api/master'
import { getErrorMessage } from '@/lib/utils'
import PasswordStrengthBar from '@/components/ui/PasswordStrengthBar'
import LoadingOverlay from '@/components/ui/LoadingOverlay'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  full_name: string
  email: string
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
  full_name: '', email: '', password: '', confirm_password: '',
  business_name: '', business_type_id: '', outlet_name: '',
  province_id: '', city_id: '', district_id: '', village_id: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBotPhone(raw: string): string {
  // raw from backend may already be "628xxx" or just a number
  const digits = raw.replace(/\D/g, '')
  return digits.startsWith('62') ? digits : '62' + digits
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
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} required={required}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm pr-12"
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
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
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        required={required} disabled={disabled}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400 appearance-none"
      >
        <option value="">{placeholder ?? 'Pilih...'}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ─── Step indicator (4 steps) ─────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 | 4 }) {
  const steps = [
    { n: 1, label: 'Generate Kode',   icon: <MessageCircle size={14} /> },
    { n: 2, label: 'Kirim ke WA',     icon: <ExternalLink  size={14} /> },
    { n: 3, label: 'Verifikasi OTP',  icon: <ShieldCheck   size={14} /> },
    { n: 4, label: 'Data Bisnis',     icon: <ClipboardList size={14} /> },
  ]
  return (
    <div className="flex items-start mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-start flex-1">
          {/* circle + label */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              current === s.n ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : current > s.n  ? 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-400'
            }`}>
              {current > s.n ? <CheckCircle2 size={15} /> : s.icon}
            </div>
            <span className={`text-[10px] font-medium mt-1.5 text-center leading-tight w-14 ${
              current === s.n ? 'text-blue-600' : current > s.n ? 'text-blue-400' : 'text-gray-400'
            }`}>
              {s.label}
            </span>
          </div>
          {/* connector line — only between steps */}
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px mt-4 mx-1 ${current > s.n ? 'bg-blue-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Countdown timer ──────────────────────────────────────────────────────────

function Countdown({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining <= 0) { onExpire(); return }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(t)
  }, [remaining, onExpire])

  const m = Math.floor(remaining / 60)
  const s = remaining % 60
  return (
    <span className={`font-mono text-xs ${remaining <= 60 ? 'text-red-500' : 'text-gray-500'}`}>
      {m}:{String(s).padStart(2, '0')}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate()

  const [step, setStep]               = useState<1 | 2 | 3 | 4>(1)
  const [regCode, setRegCode]         = useState('')       // e.g. "REG-A3F9KZ"
  const [botPhone, setBotPhone]       = useState('')       // bot's WA number
  const [otp, setOtp]                 = useState('')
  const [verifiedPhone, setVerifiedPhone] = useState('')   // returned after OTP
  const [form, setForm]               = useState<FormData>(emptyForm)
  const [showPass, setShowPass]       = useState(false)
  const [showConf, setShowConf]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [loadingMsg, setLoadingMsg]   = useState('')
  const [codeExpired, setCodeExpired] = useState(false)

  // ── Master data queries (only when on step 4) ────────────────────────────────
  const { data: businessTypesData } = useQuery({
    queryKey: ['business-types-public'],
    queryFn: () => getBusinessTypes(),
    enabled: step === 4,
    retry: false,
  })
  const businessTypes = businessTypesData?.data?.data ?? []

  const { data: provincesData } = useQuery({
    queryKey: ['provinces-public'],
    queryFn: () => getProvinces(),
    enabled: step === 4,
    retry: false,
  })
  const provinces = provincesData?.data?.data ?? []

  const { data: citiesData } = useQuery({
    queryKey: ['cities-public', form.province_id],
    queryFn: () => getCitiesByProvince(Number(form.province_id)),
    enabled: step === 4 && !!form.province_id,
    retry: false,
  })
  const cities = citiesData?.data?.data ?? []

  const { data: districtsData } = useQuery({
    queryKey: ['districts-public', form.city_id],
    queryFn: () => getDistrictsByCity(Number(form.city_id)),
    enabled: step === 4 && !!form.city_id,
    retry: false,
  })
  const districts = districtsData?.data?.data ?? []

  const { data: villagesData } = useQuery({
    queryKey: ['villages-public', form.district_id],
    queryFn: () => getVillagesByDistrict(Number(form.district_id)),
    enabled: step === 4 && !!form.district_id,
    retry: false,
  })
  const villages = villagesData?.data?.data ?? []

  // ── Handlers ─────────────────────────────────────────────────────────────────

  // Step 1 → generate code
  const handleInitRegister = async () => {
    setLoadingMsg('Membuat kode registrasi...')
    setLoading(true)
    try {
      const res = await initRegister()
      const { code, bot_phone } = res.data.data
      setRegCode(code)
      setBotPhone(formatBotPhone(bot_phone))
      setCodeExpired(false)
      setStep(2)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshCode = async () => {
    setLoadingMsg('Memperbarui kode...')
    setLoading(true)
    try {
      const res = await initRegister()
      const { code, bot_phone } = res.data.data
      setRegCode(code)
      setBotPhone(formatBotPhone(bot_phone))
      setCodeExpired(false)
      setOtp('')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // Step 3 → verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 4) { toast.error('Masukkan kode OTP terlebih dahulu'); return }

    setLoadingMsg('Memverifikasi OTP...')
    setLoading(true)
    try {
      const res = await verifyRegisterOtp(regCode, otp)
      const { phone_number } = res.data.data
      setVerifiedPhone(phone_number)
      toast.success('Nomor WhatsApp berhasil diverifikasi!')
      setStep(4)
    } catch (err) {
      toast.error(getErrorMessage(err))
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  // Step 4 → submit full registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.full_name.trim())                          { toast.error('Nama lengkap harus diisi'); return }
    if (!form.email.trim())                              { toast.error('Email harus diisi'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error('Format email tidak valid'); return }
    if (form.password.length < 6)                        { toast.error('Password minimal 6 karakter'); return }
    if (form.password !== form.confirm_password)         { toast.error('Konfirmasi password tidak cocok'); return }
    if (!form.business_name.trim())                      { toast.error('Nama bisnis harus diisi'); return }
    if (!form.business_type_id)                          { toast.error('Jenis bisnis harus dipilih'); return }
    if (!form.outlet_name.trim())                        { toast.error('Nama outlet harus diisi'); return }

    setLoadingMsg('Mendaftarkan bisnis Anda...')
    setLoading(true)
    try {
      await registerBusiness({
        full_name:        form.full_name.trim(),
        email:            form.email.trim(),
        phone_number:     verifiedPhone,
        password:         form.password,
        business_name:    form.business_name.trim(),
        business_type_id: Number(form.business_type_id),
        outlet_name:      form.outlet_name.trim(),
        city_id:          form.city_id     ? Number(form.city_id)     : null,
        district_id:      form.district_id ? Number(form.district_id) : null,
        village_id:       form.village_id  ? Number(form.village_id)  : null,
      })
      toast.success('Pendaftaran berhasil! Silakan login.')
      navigate('/login')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const waDeepLink = `https://wa.me/${botPhone}?text=${encodeURIComponent(regCode)}`

  const stepSubtitle = {
    1: 'Langkah 1 dari 4: Mulai pendaftaran',
    2: 'Langkah 2 dari 4: Kirim kode ke WhatsApp',
    3: 'Langkah 3 dari 4: Masukkan OTP',
    4: 'Langkah 4 dari 4: Data akun & bisnis',
  }[step]

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
                Gratis 30 Hari Pertama
              </p>
              <h1 className="text-4xl font-bold text-white leading-tight">
                Mulai Perjalanan Bisnis Anda Bersama Kami
              </h1>
              <p className="mt-4 text-blue-100 text-base leading-relaxed">
                Daftarkan bisnis Anda sekarang dan nikmati semua fitur lengkap
                platform POS kami tanpa biaya selama 30 hari.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                'Verifikasi aman via WhatsApp',
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
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-gray-50 overflow-y-auto">
          <div className="w-full max-w-md py-6">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <img src="/logo.svg" alt="Loka Kasir" className="h-9 w-auto mx-auto mb-2" />
              <h1 className="text-xl font-bold text-gray-900">Daftarkan Bisnis Anda</h1>
              <p className="text-gray-500 text-sm mt-1">Mulai gratis selama 30 hari</p>
            </div>

            {/* Desktop heading */}
            <div className="hidden lg:block mb-7">
              <h2 className="text-2xl font-bold text-gray-900">Buat Akun Baru</h2>
              <p className="text-gray-500 text-sm mt-1">{stepSubtitle}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <StepIndicator current={step} />

              {/* ── Step 1: Mulai Pendaftaran ──────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MessageCircle size={26} className="text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">Verifikasi via WhatsApp</h3>
                    <p className="text-sm text-gray-500">
                      Pendaftaran diverifikasi langsung via WhatsApp untuk memastikan keamanan akun Anda.
                    </p>
                  </div>

                  <ol className="space-y-3 text-sm text-gray-600">
                    {[
                      'Klik tombol di bawah untuk mendapatkan kode unik',
                      'Kirim kode tersebut ke WhatsApp Loka Kasir',
                      'Bot kami akan membalas dengan kode OTP',
                      'Masukkan OTP dan lengkapi data bisnis Anda',
                    ].map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ol>

                  <button
                    onClick={handleInitRegister}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition"
                  >
                    Mulai Daftar <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* ── Step 2: Kirim Kode ke WA ──────────────────────────────── */}
              {step === 2 && (
                <div className="space-y-5">
                  {/* Code card */}
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1.5">Kode Registrasi Anda</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl font-bold font-mono tracking-widest text-gray-900">
                        {regCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => { navigator.clipboard.writeText(regCode); toast.success('Kode disalin!') }}
                        className="text-gray-400 hover:text-blue-600 transition"
                        title="Salin kode"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mt-2">
                      <span className="text-xs text-gray-400">Berlaku:</span>
                      {!codeExpired
                        ? <Countdown seconds={600} onExpire={() => setCodeExpired(true)} />
                        : <span className="text-xs text-red-500 font-medium">Kedaluwarsa</span>
                      }
                    </div>
                  </div>

                  {/* Expired warning + refresh */}
                  {codeExpired && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-3">
                      <p className="text-xs text-red-600 flex-1">Kode sudah kedaluwarsa. Generate kode baru?</p>
                      <button
                        type="button"
                        onClick={handleRefreshCode}
                        disabled={loading}
                        className="flex items-center gap-1 text-xs text-red-600 font-semibold hover:underline shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw size={12} /> Perbarui
                      </button>
                    </div>
                  )}

                  {/* WA button */}
                  <a
                    href={waDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 bg-[#25D366] hover:bg-[#1ebe5c] text-white font-semibold py-3.5 px-5 rounded-xl transition shadow-sm"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight">Kirim Kode ke WhatsApp</p>
                      <p className="text-xs text-white/80 font-normal leading-tight mt-0.5">Buka chat otomatis dengan kode sudah terisi</p>
                    </div>
                    <ExternalLink size={15} className="shrink-0 opacity-80" />
                  </a>

                  <p className="text-xs text-gray-400 text-center">
                    Bot WhatsApp kami akan membalas dengan kode OTP secara otomatis.
                  </p>

                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={codeExpired}
                    className="w-full flex items-center justify-center gap-2 border border-blue-200 text-blue-600 font-semibold py-3 rounded-xl hover:bg-blue-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Sudah Kirim, Masukkan OTP <ChevronRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full text-sm text-gray-400 hover:text-gray-600 py-1"
                  >
                    Kembali
                  </button>
                </div>
              )}

              {/* ── Step 3: Masukkan OTP ───────────────────────────────────── */}
              {step === 3 && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <ShieldCheck size={18} className="text-green-600" />
                    </div>
                    <p className="text-sm text-gray-600">
                      Masukkan OTP yang dikirim bot Loka Kasir ke WhatsApp Anda
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Kode OTP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Masukkan kode OTP"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-base tracking-widest font-mono"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
                  >
                    Verifikasi OTP
                  </button>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                    >
                      <ChevronLeft size={14} /> Kembali
                    </button>
                    <a
                      href={waDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-green-600 font-semibold hover:underline"
                    >
                      Buka WhatsApp
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </form>
              )}

              {/* ── Step 4: Data Akun & Bisnis ─────────────────────────────── */}
              {step === 4 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Verified badge */}
                  <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2 mb-2">
                    <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                    <span className="text-xs text-green-700 font-medium">
                      WhatsApp <span className="font-semibold">{verifiedPhone}</span> terverifikasi
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-1">Data Akun</p>

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
                  />
                  <div>
                    <InputField
                      label="Password"
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={(v) => setForm({ ...form, password: v })}
                      placeholder="Min. 6 karakter"
                      suffix={
                        <button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-400 hover:text-gray-600">
                          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
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
                      <button type="button" onClick={() => setShowConf(!showConf)} className="text-gray-400 hover:text-gray-600">
                        {showConf ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />

                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-2">Data Bisnis</p>

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
                  <SelectField
                    label="Provinsi"
                    value={form.province_id}
                    onChange={(v) => setForm({ ...form, province_id: v, city_id: '', district_id: '', village_id: '' })}
                    options={provinces.map((p) => ({ value: String(p.id), label: p.name }))}
                    placeholder="Pilih provinsi..."
                    required={false}
                  />
                  <SelectField
                    label="Kota / Kabupaten"
                    value={form.city_id}
                    onChange={(v) => setForm({ ...form, city_id: v, district_id: '', village_id: '' })}
                    options={cities.map((c) => ({ value: String(c.id), label: `${c.type} ${c.name}` }))}
                    placeholder={form.province_id ? 'Pilih kota...' : 'Pilih provinsi dulu'}
                    required={false}
                    disabled={!form.province_id}
                  />
                  <SelectField
                    label="Kecamatan"
                    value={form.district_id}
                    onChange={(v) => setForm({ ...form, district_id: v, village_id: '' })}
                    options={districts.map((d) => ({ value: String(d.id), label: d.name }))}
                    placeholder={form.city_id ? 'Pilih kecamatan...' : 'Pilih kota dulu'}
                    required={false}
                    disabled={!form.city_id}
                  />
                  <SelectField
                    label="Kelurahan / Desa"
                    value={form.village_id}
                    onChange={(v) => setForm({ ...form, village_id: v })}
                    options={villages.map((v) => ({ value: String(v.id), label: v.name }))}
                    placeholder={form.district_id ? 'Pilih kelurahan...' : 'Pilih kecamatan dulu'}
                    required={false}
                    disabled={!form.district_id}
                  />

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-none flex items-center gap-1.5 px-4 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition text-sm"
                    >
                      <ChevronLeft size={15} /> Kembali
                    </button>
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
                    >
                      <Store size={15} /> Daftarkan Bisnis
                    </button>
                  </div>
                </form>
              )}

              <p className="text-center text-sm text-gray-500 mt-6 pt-6 border-t border-gray-100">
                Sudah punya akun?{' '}
                <Link to="/login" className="text-blue-600 font-semibold hover:underline">
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
