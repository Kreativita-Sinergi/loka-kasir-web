import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ChevronRight, ChevronLeft, Store, User, CheckCircle2, MessageCircle, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { registerBusiness, verifyOtp, retryOtp } from '@/api/auth'
import { getBusinessTypes, getProvinces, getCitiesByProvince, getDistrictsByCity, getVillagesByDistrict } from '@/api/master'
import { getErrorMessage } from '@/lib/utils'
import PasswordStrengthBar from '@/components/ui/PasswordStrengthBar'
import LoadingOverlay from '@/components/ui/LoadingOverlay'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step1 {
  full_name: string
  email: string
  phone_number: string
  password: string
  confirm_password: string
}

interface Step2 {
  business_name: string
  business_type_id: string
  outlet_name: string
  province_id: string
  city_id: string
  district_id: string
  village_id: string
}

const emptyStep1: Step1 = { full_name: '', email: '', phone_number: '', password: '', confirm_password: '' }
const emptyStep2: Step2 = { business_name: '', business_type_id: '', outlet_name: '', province_id: '', city_id: '', district_id: '', village_id: '' }

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

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Akun', icon: <User size={13} /> },
    { n: 2, label: 'Bisnis', icon: <Store size={13} /> },
    { n: 3, label: 'Verifikasi', icon: <MessageCircle size={13} /> },
  ]
  return (
    <div className="flex items-center mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold transition-colors ${
              current === s.n ? 'bg-blue-600 text-white'
              : current > s.n ? 'bg-blue-100 text-blue-600'
              : 'bg-gray-100 text-gray-400'
            }`}>
              {current > s.n ? <CheckCircle2 size={14} /> : s.icon}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${
              current === s.n ? 'text-blue-600' : current > s.n ? 'text-blue-500' : 'text-gray-400'
            }`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 mx-2 h-px ${current > s.n ? 'bg-blue-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [step1, setStep1] = useState<Step1>(emptyStep1)
  const [step2, setStep2] = useState<Step2>(emptyStep2)
  const [otp, setOtp] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [resending, setResending] = useState(false)

  // ── Master data queries ──────────────────────────────────────────────────────
  const { data: businessTypesData } = useQuery({
    queryKey: ['business-types-public'],
    queryFn: () => getBusinessTypes(),
    retry: false,
  })
  const businessTypes = businessTypesData?.data?.data ?? []

  const { data: provincesData } = useQuery({
    queryKey: ['provinces-public'],
    queryFn: () => getProvinces(),
    retry: false,
  })
  const provinces = provincesData?.data?.data ?? []

  const { data: citiesData } = useQuery({
    queryKey: ['cities-public', step2.province_id],
    queryFn: () => getCitiesByProvince(Number(step2.province_id)),
    enabled: !!step2.province_id,
    retry: false,
  })
  const cities = citiesData?.data?.data ?? []

  const { data: districtsData } = useQuery({
    queryKey: ['districts-public', step2.city_id],
    queryFn: () => getDistrictsByCity(Number(step2.city_id)),
    enabled: !!step2.city_id,
    retry: false,
  })
  const districts = districtsData?.data?.data ?? []

  const { data: villagesData } = useQuery({
    queryKey: ['villages-public', step2.district_id],
    queryFn: () => getVillagesByDistrict(Number(step2.district_id)),
    enabled: !!step2.district_id,
    retry: false,
  })
  const villages = villagesData?.data?.data ?? []

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!step1.full_name.trim())                          { toast.error('Nama lengkap harus diisi'); return }
    if (!step1.email.trim())                              { toast.error('Email harus diisi'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step1.email)) { toast.error('Format email tidak valid'); return }
    if (!step1.phone_number.trim())                       { toast.error('Nomor HP harus diisi'); return }
    if (step1.password.length < 6)                        { toast.error('Password minimal 6 karakter'); return }
    if (step1.password !== step1.confirm_password)        { toast.error('Konfirmasi password tidak cocok'); return }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!step2.business_name.trim()) { toast.error('Nama bisnis harus diisi'); return }
    if (!step2.business_type_id)     { toast.error('Jenis bisnis harus dipilih'); return }
    if (!step2.outlet_name.trim())   { toast.error('Nama outlet harus diisi'); return }

    setLoadingMsg('Mendaftarkan bisnis Anda...')
    setLoading(true)
    try {
      await registerBusiness({
        full_name:        step1.full_name.trim(),
        email:            step1.email.trim(),
        phone_number:     step1.phone_number.trim(),
        password:         step1.password,
        business_name:    step2.business_name.trim(),
        business_type_id: Number(step2.business_type_id),
        outlet_name:      step2.outlet_name.trim(),
        city_id:          step2.city_id     ? Number(step2.city_id)     : null,
        district_id:      step2.district_id ? Number(step2.district_id) : null,
        village_id:       step2.village_id  ? Number(step2.village_id)  : null,
      })
      toast.success('Kode OTP telah dikirim ke WhatsApp Anda')
      setStep(3)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 4) { toast.error('Masukkan kode OTP terlebih dahulu'); return }

    setLoadingMsg('Memverifikasi OTP...')
    setLoading(true)
    try {
      await verifyOtp(step1.phone_number.trim(), otp)
      toast.success('Akun berhasil diverifikasi! Silakan login.')
      navigate('/login')
    } catch (err) {
      toast.error(getErrorMessage(err))
      setOtp('')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setResending(true)
    try {
      await retryOtp(step1.phone_number.trim())
      toast.success('Kode OTP baru telah dikirim')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setResending(false)
    }
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
              {['Tidak perlu kartu kredit', 'Setup dalam 5 menit', 'Multi-outlet & multi-kasir', 'Laporan & analitik lengkap'].map((item) => (
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
          <div className="w-full max-w-sm py-6">
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
              <img src="/logo.svg" alt="Loka Kasir" className="h-9 w-auto mx-auto mb-2" />
              <h1 className="text-xl font-bold text-gray-900">Daftarkan Bisnis Anda</h1>
              <p className="text-gray-500 text-sm mt-1">Mulai gratis selama 30 hari</p>
            </div>

            {/* Desktop heading */}
            <div className="hidden lg:block mb-7">
              <h2 className="text-2xl font-bold text-gray-900">Buat Akun Baru</h2>
              <p className="text-gray-500 text-sm mt-1">
                {step === 1 ? 'Langkah 1 dari 3: Data akun' : step === 2 ? 'Langkah 2 dari 3: Data bisnis' : 'Langkah 3 dari 3: Verifikasi nomor HP'}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <StepIndicator current={step} />

              {/* ── Step 1: Data Akun ── */}
              {step === 1 && (
                <form onSubmit={handleStep1} className="space-y-4">
                  <InputField
                    label="Nama Lengkap"
                    value={step1.full_name}
                    onChange={(v) => setStep1({ ...step1, full_name: v })}
                    placeholder="Nama pemilik bisnis"
                  />
                  <InputField
                    label="Email"
                    type="email"
                    value={step1.email}
                    onChange={(v) => setStep1({ ...step1, email: v })}
                    placeholder="email@bisnis.com"
                  />
                  <InputField
                    label="Nomor HP (WhatsApp)"
                    type="tel"
                    value={step1.phone_number}
                    onChange={(v) => setStep1({ ...step1, phone_number: v })}
                    placeholder="08xxxxxxxxxx"
                    hint="OTP verifikasi akan dikirim ke nomor ini"
                  />
                  <div>
                    <InputField
                      label="Password"
                      type={showPass ? 'text' : 'password'}
                      value={step1.password}
                      onChange={(v) => setStep1({ ...step1, password: v })}
                      placeholder="Min. 6 karakter"
                      suffix={
                        <button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-400 hover:text-gray-600">
                          {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                    />
                    <PasswordStrengthBar password={step1.password} />
                  </div>
                  <InputField
                    label="Konfirmasi Password"
                    type={showConfirm ? 'text' : 'password'}
                    value={step1.confirm_password}
                    onChange={(v) => setStep1({ ...step1, confirm_password: v })}
                    placeholder="Ulangi password"
                    suffix={
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-gray-400 hover:text-gray-600">
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition mt-2"
                  >
                    Lanjut <ChevronRight size={16} />
                  </button>
                </form>
              )}

              {/* ── Step 2: Data Bisnis ── */}
              {step === 2 && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <InputField
                    label="Nama Bisnis"
                    value={step2.business_name}
                    onChange={(v) => setStep2({ ...step2, business_name: v })}
                    placeholder="Contoh: Warung Makan Loka"
                  />
                  <SelectField
                    label="Jenis Bisnis"
                    value={step2.business_type_id}
                    onChange={(v) => setStep2({ ...step2, business_type_id: v })}
                    options={businessTypes.map((b) => ({ value: String(b.id), label: b.name }))}
                    placeholder="Pilih jenis bisnis..."
                  />
                  <InputField
                    label="Nama Outlet Pertama"
                    value={step2.outlet_name}
                    onChange={(v) => setStep2({ ...step2, outlet_name: v })}
                    placeholder="Contoh: Cabang Utama"
                    hint="Bisa ditambah lebih banyak outlet setelah mendaftar"
                  />
                  <SelectField
                    label="Provinsi"
                    value={step2.province_id}
                    onChange={(v) => setStep2({ ...step2, province_id: v, city_id: '', district_id: '', village_id: '' })}
                    options={provinces.map((p) => ({ value: String(p.id), label: p.name }))}
                    placeholder="Pilih provinsi..."
                    required={false}
                  />
                  <SelectField
                    label="Kota / Kabupaten"
                    value={step2.city_id}
                    onChange={(v) => setStep2({ ...step2, city_id: v, district_id: '', village_id: '' })}
                    options={cities.map((c) => ({ value: String(c.id), label: `${c.type} ${c.name}` }))}
                    placeholder={step2.province_id ? 'Pilih kota...' : 'Pilih provinsi dulu'}
                    required={false}
                    disabled={!step2.province_id}
                  />
                  <SelectField
                    label="Kecamatan"
                    value={step2.district_id}
                    onChange={(v) => setStep2({ ...step2, district_id: v, village_id: '' })}
                    options={districts.map((d) => ({ value: String(d.id), label: d.name }))}
                    placeholder={step2.city_id ? 'Pilih kecamatan...' : 'Pilih kota dulu'}
                    required={false}
                    disabled={!step2.city_id}
                  />
                  <SelectField
                    label="Kelurahan / Desa"
                    value={step2.village_id}
                    onChange={(v) => setStep2({ ...step2, village_id: v })}
                    options={villages.map((v) => ({ value: String(v.id), label: v.name }))}
                    placeholder={step2.district_id ? 'Pilih kelurahan...' : 'Pilih kecamatan dulu'}
                    required={false}
                    disabled={!step2.district_id}
                  />
                  <div className="flex gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition"
                    >
                      <ChevronLeft size={16} /> Kembali
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
                    >
                      Daftar
                    </button>
                  </div>
                </form>
              )}

              {/* ── Step 3: Verifikasi OTP ── */}
              {step === 3 && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  {/* Info box */}
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <MessageCircle size={18} className="text-green-600" />
                    </div>
                    <p className="text-sm text-gray-600">
                      Kode OTP telah dikirim ke WhatsApp
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {step1.phone_number}
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-[0.5em] font-mono"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition"
                  >
                    Verifikasi & Masuk
                  </button>

                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-2">Tidak menerima kode?</p>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resending}
                      className="text-sm text-blue-600 font-semibold hover:underline disabled:opacity-50 flex items-center gap-1.5 mx-auto"
                    >
                      <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                      {resending ? 'Mengirim...' : 'Kirim ulang OTP'}
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
