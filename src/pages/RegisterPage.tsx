import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ChevronRight, ChevronLeft, Store, User, CheckCircle2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { registerBusiness } from '@/api/auth'
import { getBusinessTypes, getProvinces, getCitiesByProvince } from '@/api/master'
import { getErrorMessage } from '@/lib/utils'
import PasswordStrengthBar from '@/components/ui/PasswordStrengthBar'

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
}

const emptyStep1: Step1 = { full_name: '', email: '', phone_number: '', password: '', confirm_password: '' }
const emptyStep2: Step2 = { business_name: '', business_type_id: '', outlet_name: '', province_id: '', city_id: '' }

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

function StepIndicator({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center mb-8">
      {/* Step 1 */}
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
          current === 1 ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
        }`}>
          {current > 1 ? <CheckCircle2 size={16} /> : <User size={14} />}
        </div>
        <span className={`text-sm font-medium ${current === 1 ? 'text-blue-600' : 'text-blue-500'}`}>
          Data Akun
        </span>
      </div>

      {/* Connector */}
      <div className={`flex-1 mx-3 h-px ${current > 1 ? 'bg-blue-400' : 'bg-gray-200'}`} />

      {/* Step 2 */}
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
          current === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
        }`}>
          <Store size={14} />
        </div>
        <span className={`text-sm font-medium ${current === 2 ? 'text-blue-600' : 'text-gray-400'}`}>
          Data Bisnis
        </span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(1)
  const [step1, setStep1] = useState<Step1>(emptyStep1)
  const [step2, setStep2] = useState<Step2>(emptyStep2)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

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

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!step1.full_name.trim())                                           { toast.error('Nama lengkap harus diisi'); return }
    if (!step1.email.trim())                                               { toast.error('Email harus diisi'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step1.email))                  { toast.error('Format email tidak valid'); return }
    if (!step1.phone_number.trim())                                        { toast.error('Nomor HP harus diisi'); return }
    if (step1.password.length < 6)                                         { toast.error('Password minimal 6 karakter'); return }
    if (step1.password !== step1.confirm_password)                         { toast.error('Konfirmasi password tidak cocok'); return }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!step2.business_name.trim())  { toast.error('Nama bisnis harus diisi'); return }
    if (!step2.business_type_id)      { toast.error('Jenis bisnis harus dipilih'); return }
    if (!step2.outlet_name.trim())    { toast.error('Nama outlet harus diisi'); return }

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
        city_id:          step2.city_id ? Number(step2.city_id) : null,
      })
      toast.success('Pendaftaran berhasil! Cek WhatsApp untuk kode OTP.')
      navigate('/login')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Hero Panel ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/3 -right-16 w-64 h-64 bg-blue-500/20 rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full" />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/logo.svg" alt="Loka Kasir" className="h-10 w-auto brightness-0 invert" />
        </div>

        {/* Main copy */}
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

          {/* Checklist */}
          <ul className="space-y-3">
            {[
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

        {/* Footer */}
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
              {step === 1 ? 'Langkah 1: Isi data akun Anda' : 'Langkah 2: Lengkapi data bisnis'}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <StepIndicator current={step} />

            {step === 1 ? (
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
            ) : (
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
                  onChange={(v) => setStep2({ ...step2, province_id: v, city_id: '' })}
                  options={provinces.map((p) => ({ value: String(p.id), label: p.name }))}
                  placeholder="Pilih provinsi..."
                  required={false}
                />
                <SelectField
                  label="Kota / Kabupaten"
                  value={step2.city_id}
                  onChange={(v) => setStep2({ ...step2, city_id: v })}
                  options={cities.map((c) => ({ value: String(c.id), label: `${c.type} ${c.name}` }))}
                  placeholder={step2.province_id ? 'Pilih kota...' : 'Pilih provinsi dulu'}
                  required={false}
                  disabled={!step2.province_id}
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
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition"
                  >
                    {loading ? 'Mendaftar...' : 'Daftar'}
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
  )
}
