import { useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Camera, Trash2, Save, Eye, EyeOff, Mail,
  Phone, Building2, User, Shield, Crown, X, CheckCircle,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import ImageCropModal from '@/components/ui/ImageCropModal'
import PasswordStrengthBar from '@/components/ui/PasswordStrengthBar'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import { getUserProfile, updateBusinessInfo } from '@/api/business'
import { getMyOutlets, getOutletConfig, updateOutletLogo, removeOutletLogo } from '@/api/outlets'
import { changePassword, changeEmail, changePhone, verifyChangePhone, sendEmailVerification, verifyEmailOtp } from '@/api/auth'
import { getErrorMessage, toTitleCase } from '@/lib/utils'

// ─── Email OTP Verify Modal ───────────────────────────────────────────────────

function EmailOtpModal({ email, onClose, onVerified }: { email: string; onClose: () => void; onVerified: () => void }) {
  const [otp, setOtp] = useState('')
  const qc = useQueryClient()
  const { setAuth, user, token } = useAuthStore()

  const mutation = useMutation({
    mutationFn: () => verifyEmailOtp(email, otp),
    onSuccess: (res) => {
      const updatedUser = res.data?.data
      if (updatedUser && user && token) {
        setAuth({ ...user, is_email_verified: updatedUser.is_email_verified }, token)
      }
      qc.invalidateQueries({ queryKey: ['user-profile'] })
      toast.success('Email berhasil diverifikasi')
      onVerified()
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Verifikasi Email</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Masukkan kode OTP yang telah dikirim ke <span className="font-medium text-gray-800">{email}</span>.</p>
          <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">Tidak menerima email? Cek folder <strong>Spam</strong> atau <strong>Junk</strong> di kotak masuk Anda.</p>
          <input
            type="text"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || otp.length < 6}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-sm"
          >
            {mutation.isPending ? 'Memverifikasi...' : 'Verifikasi'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Change Email Modal (2-step: password+email → OTP) ───────────────────────

function ChangeEmailModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [otp, setOtp] = useState('')
  const qc = useQueryClient()
  const { setAuth, user, token } = useAuthStore()

  const sendMutation = useMutation({
    mutationFn: () => changeEmail(email.toLowerCase().trim(), password),
    onSuccess: () => { toast.success('Kode OTP dikirim ke email baru.'); setStep('otp') },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const verifyMutation = useMutation({
    mutationFn: () => verifyEmailOtp(email.toLowerCase().trim(), otp),
    onSuccess: (res) => {
      const updated = res.data?.data
      if (updated && user && token) setAuth({ ...user, email: email.toLowerCase().trim(), is_email_verified: updated.is_email_verified }, token)
      qc.invalidateQueries({ queryKey: ['user-profile'] })
      toast.success('Email berhasil diperbarui dan terverifikasi')
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ubah Email</h2>
            {step === 'otp' && <p className="text-xs text-gray-400 mt-0.5">Langkah 2 — Verifikasi OTP</p>}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"><X size={18} /></button>
        </div>
        {step === 'form' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password Saat Ini</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Baru</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@bisnis.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1.5">OTP akan dikirim ke email baru. Email berlaku setelah terverifikasi.</p>
            </div>
            <button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || !email || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-sm">
              {sendMutation.isPending ? 'Mengirim...' : 'Kirim Kode OTP'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Masukkan kode OTP yang dikirim ke <span className="font-medium text-gray-800">{email.toLowerCase()}</span>.</p>
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">Tidak menerima? Cek folder <strong>Spam</strong> atau <strong>Junk</strong>.</p>
            <input type="text" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2">
              <button onClick={() => setStep('form')} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition">Kembali</button>
              <button onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending || otp.length < 6}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-sm">
                {verifyMutation.isPending ? 'Memverifikasi...' : 'Verifikasi'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Change Phone Modal (2-step: password+phone → OTP WA) ────────────────────

function ChangePhoneModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [otp, setOtp] = useState('')
  const qc = useQueryClient()
  const { setAuth, user, token } = useAuthStore()

  const sendMutation = useMutation({
    mutationFn: () => changePhone(phone.trim(), password),
    onSuccess: () => { toast.success('Kode OTP dikirim via WhatsApp ke nomor baru.'); setStep('otp') },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const verifyMutation = useMutation({
    mutationFn: () => verifyChangePhone(otp),
    onSuccess: () => {
      if (user && token) setAuth({ ...user, phone_number: phone.trim() }, token)
      qc.invalidateQueries({ queryKey: ['user-profile'] })
      toast.success('Nomor HP berhasil diperbarui')
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Ubah Nomor HP</h2>
            {step === 'otp' && <p className="text-xs text-gray-400 mt-0.5">Langkah 2 — Verifikasi OTP WhatsApp</p>}
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"><X size={18} /></button>
        </div>
        {step === 'form' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password Saat Ini</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nomor HP Baru</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-gray-400 mt-1.5">OTP akan dikirim ke nomor baru via WhatsApp. Nomor berlaku setelah terverifikasi.</p>
            </div>
            <button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending || !phone || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-sm">
              {sendMutation.isPending ? 'Mengirim...' : 'Kirim Kode OTP'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Masukkan kode OTP yang dikirim via WhatsApp ke <span className="font-medium text-gray-800">{phone}</span>.</p>
            <input type="text" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2">
              <button onClick={() => setStep('form')} className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition">Kembali</button>
              <button onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending || otp.length < 6}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-sm">
                {verifyMutation.isPending ? 'Memverifikasi...' : 'Verifikasi'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const mutation = useMutation({
    mutationFn: () => changePassword({ old_password: oldPassword, new_password: newPassword }),
    onSuccess: () => { toast.success('Password berhasil diubah'); onClose() },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) { toast.error('Password minimal 6 karakter'); return }
    if (newPassword !== confirmPass) { toast.error('Konfirmasi password tidak cocok'); return }
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Ganti Password</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Password Lama', value: oldPassword, onChange: setOldPassword, show: showOld, toggle: () => setShowOld(!showOld) },
            { label: 'Password Baru', value: newPassword, onChange: setNewPassword, show: showNew, toggle: () => setShowNew(!showNew), showStrength: true },
          ].map(({ label, value, onChange, show, toggle, showStrength }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {showStrength && <PasswordStrengthBar password={value} />}
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Konfirmasi Password</label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-sm"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { user, setAuth, token } = useAuthStore()
  const { selected: selectedOutlet } = useOutletStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showEmailOtp, setShowEmailOtp] = useState(false)
  const [showChangePhone, setShowChangePhone] = useState(false)

  // ── Profile query ───────────────────────────────────────────────────────────
  const { data: profileData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => getUserProfile(),
  })
  const profile = profileData?.data?.data

  // Editable fields — initialized from server data when available, else from auth store
  const serverBusinessName = profile?.business?.business_name ?? user?.business?.business_name ?? ''
  const serverOwnerName    = profile?.business?.owner_name    ?? user?.business?.owner_name    ?? ''

  const [businessName, setBusinessName] = useState('')
  const [ownerName, setOwnerName]       = useState('')
  // Mirror server values into local state only on the first load (avoids lint warning)
  const [syncedKey, setSyncedKey] = useState('')
  const currentKey = `${serverBusinessName}|${serverOwnerName}`
  if (syncedKey !== currentKey && serverBusinessName) {
    setBusinessName(serverBusinessName)
    setOwnerName(serverOwnerName)
    setSyncedKey(currentKey)
  }

  // ── All outlets (for applying logo to all) ─────────────────────────────────
  const { data: myOutletsData } = useQuery({
    queryKey: ['my-outlets'],
    queryFn: getMyOutlets,
  })
  const allOutlets = myOutletsData?.data?.data ?? []

  // ── Outlet config (logo preview — use selected outlet) ──────────────────────
  const outletId = selectedOutlet?.id
  const { data: configData } = useQuery({
    queryKey: ['outlet-config', outletId],
    queryFn: () => getOutletConfig(outletId!),
    enabled: !!outletId,
  })
  const currentLogo = configData?.data?.data?.logo_url ?? null

  // ── Send email verification ─────────────────────────────────────────────────
  const sendVerifMutation = useMutation({
    mutationFn: () => sendEmailVerification(),
    onSuccess: () => {
      toast.success('Kode verifikasi dikirim! Cek kotak masuk email Anda.')
      setShowEmailOtp(true)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // ── Logo mutations — apply to ALL outlets ──────────────────────────────────
  const logoMutation = useMutation({
    mutationFn: async (base64: string) => {
      const targets = allOutlets.length > 0 ? allOutlets : outletId ? [{ id: outletId }] : []
      await Promise.all(targets.map((o) => updateOutletLogo(o.id, base64)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlet-config'] })
      toast.success(`Logo berhasil diperbarui untuk ${allOutlets.length > 1 ? `semua ${allOutlets.length} outlet` : 'outlet'}`)
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const removeLogoMutation = useMutation({
    mutationFn: async () => {
      const targets = allOutlets.length > 0 ? allOutlets : outletId ? [{ id: outletId }] : []
      await Promise.all(targets.map((o) => removeOutletLogo(o.id)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlet-config'] })
      toast.success('Logo berhasil dihapus dari semua outlet')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // ── Business info update ────────────────────────────────────────────────────
  const infoMutation = useMutation({
    mutationFn: () => updateBusinessInfo({ business_name: businessName, owner_name: ownerName }),
    onSuccess: (res) => {
      const updated = res.data.data
      if (user && token) setAuth({
        ...user,
        business: {
          ...user.business,
          ...updated,
          membership: updated.membership ?? user.business?.membership,
        },
      }, token)
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      toast.success('Info bisnis berhasil diperbarui')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const membership = profile?.business?.membership ?? user?.business?.membership
  const tierLabel  = membership?.tier === 'pro' ? 'Pro' : membership?.tier === 'trial' ? 'Trial' : 'Lite'

  return (
    <div className="flex flex-col h-full">
      <Header title="Profil & Akun" subtitle="Kelola info bisnis dan pengaturan akun Anda" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* ── Logo & Business Name ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Building2 size={15} className="text-blue-600" />
              Info Bisnis
            </h3>
            <div className="flex items-start gap-5">
              {/* Logo */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl border-2 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
                  {currentLogo ? (
                    <img src={currentLogo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 size={32} className="text-gray-300" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoMutation.isPending || allOutlets.length === 0}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center shadow transition disabled:opacity-60"
                  title="Upload logo ke semua outlet"
                >
                  <Camera size={13} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>

              {/* Business name & owner */}
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nama Bisnis</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nama Owner</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => infoMutation.mutate()}
                    disabled={infoMutation.isPending || !businessName || !ownerName}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
                  >
                    <Save size={14} />
                    {infoMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  {currentLogo && (
                    <button
                      onClick={() => removeLogoMutation.mutate()}
                      disabled={removeLogoMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:bg-red-50 text-sm rounded-xl transition border border-red-100"
                    >
                      <Trash2 size={14} />
                      Hapus Logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Outlet label */}
            <p className="text-xs text-gray-400 mt-4">
              {allOutlets.length > 1
                ? <>Logo akan diterapkan ke <span className="font-semibold text-gray-600">semua {allOutlets.length} outlet</span> sekaligus.</>
                : allOutlets.length === 1
                  ? <>Logo ditampilkan pada struk untuk outlet <span className="font-semibold text-gray-600">{toTitleCase(allOutlets[0].name)}</span>.</>
                  : 'Belum ada outlet yang terdaftar.'}
            </p>
          </div>

          {/* ── Account Info ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User size={15} className="text-blue-600" />
              Informasi Akun
            </h3>
            <div className="space-y-1">
              {/* Email */}
              <div className="flex items-center justify-between py-3 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Mail size={15} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Email</p>
                    <p className="text-sm font-medium text-gray-900">
                      {(profile?.email ?? user?.email)
                        ? (profile?.email ?? user?.email)!.toLowerCase()
                        : <span className="text-gray-400">Belum diatur</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(profile?.email ?? user?.email) ? (
                    (profile?.is_email_verified ?? user?.is_email_verified) ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-lg">
                        <CheckCircle size={11} />
                        Terverifikasi
                      </span>
                    ) : (
                      <button
                        onClick={() => sendVerifMutation.mutate()}
                        disabled={sendVerifMutation.isPending}
                        className="flex items-center gap-1 text-xs text-yellow-700 font-medium bg-yellow-50 px-2 py-0.5 rounded-lg hover:bg-yellow-100 transition disabled:opacity-60"
                      >
                        {sendVerifMutation.isPending ? 'Mengirim...' : 'Belum Terverifikasi · Kirim OTP'}
                      </button>
                    )
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-lg">
                      Belum Diatur
                    </span>
                  )}
                  <button
                    onClick={() => setShowChangeEmail(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    {profile?.email ?? user?.email ? 'Ubah' : 'Tambah'}
                  </button>
                </div>
              </div>

              {/* Phone — verified via WhatsApp OTP */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                    <Phone size={15} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Nomor HP (WhatsApp)</p>
                    <p className="text-sm font-medium text-gray-900">
                      {profile?.phone_number ?? user?.phone_number ?? '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {profile?.is_verified && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-lg">
                      <CheckCircle size={11} />
                      Terverifikasi
                    </span>
                  )}
                  <button
                    onClick={() => setShowChangePhone(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Ubah
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Security ─────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={15} className="text-blue-600" />
              Keamanan
            </h3>
            <button
              onClick={() => setShowChangePassword(true)}
              className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition">
                  <Shield size={15} className="text-gray-500 group-hover:text-blue-600 transition" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">Ganti Password</p>
                  <p className="text-xs text-gray-400">Perbarui password akun Anda</p>
                </div>
              </div>
              <span className="text-xs text-blue-600 font-semibold">Ubah</span>
            </button>
          </div>

          {/* ── Membership ───────────────────────────────────────────────────── */}
          {membership && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Crown size={15} className="text-blue-600" />
                Paket Berlangganan
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Paket {tierLabel}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {membership.is_active
                      ? `Aktif · Sisa ${membership.days_remaining} hari`
                      : 'Tidak aktif'}
                  </p>
                </div>
                <a href="/membership" className="text-xs text-blue-600 font-semibold hover:underline">
                  {membership.tier !== 'pro' ? 'Upgrade' : 'Detail'}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onClose={() => setCropSrc(null)}
          onSave={(base64) => { setCropSrc(null); logoMutation.mutate(base64) }}
        />
      )}
      {showChangeEmail && (
        <ChangeEmailModal onClose={() => setShowChangeEmail(false)} />
      )}
      {showEmailOtp && (profile?.email ?? user?.email) && (
        <EmailOtpModal
          email={(profile?.email ?? user?.email)!.toLowerCase()}
          onClose={() => setShowEmailOtp(false)}
          onVerified={() => queryClient.invalidateQueries({ queryKey: ['user-profile'] })}
        />
      )}
      {showChangePhone && (
        <ChangePhoneModal onClose={() => setShowChangePhone(false)} />
      )}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  )
}
