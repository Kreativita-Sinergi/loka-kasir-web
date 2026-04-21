import { useState, useRef, useEffect } from 'react'
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
import { getUserProfile, updateBusinessInfo, updateBusinessLogo, removeBusinessLogo } from '@/api/business'
import { changePassword, changeEmail } from '@/api/auth'
import { getErrorMessage, toTitleCase } from '@/lib/utils'

// ─── Change Email Modal ──────────────────────────────────────────────────────

function ChangeEmailModal({ currentEmail, onClose }: { currentEmail: string | null; onClose: () => void }) {
  const [email, setEmail] = useState(currentEmail ?? '')
  const { setAuth, user, token } = useAuthStore()

  const mutation = useMutation({
    mutationFn: () => changeEmail(email),
    onSuccess: () => {
      if (user && token) {
        const updated = { ...user, email }
        setAuth(updated, token)
      }
      toast.success('Email berhasil diperbarui')
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Ubah Email</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Baru</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@bisnis.com"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !email}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-sm"
          >
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Email'}
          </button>
        </div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password Lama</label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password Baru</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrengthBar password={newPassword} />
          </div>
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
  const { user, setAuth, token, setBusinessImage } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  const [businessName, setBusinessName] = useState(user?.business?.business_name ?? '')
  const [ownerName, setOwnerName] = useState(user?.business?.owner_name ?? '')

  const { data: profileData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => getUserProfile(),
  })

  useEffect(() => {
    const data = profileData?.data?.data
    if (data) {
      setBusinessName(data.business?.business_name ?? '')
      setOwnerName(data.business?.owner_name ?? '')
    }
  }, [profileData])
  const profile = profileData?.data?.data

  // ── Logo upload ─────────────────────────────────────────────────────────────
  const logoMutation = useMutation({
    mutationFn: (base64: string) => updateBusinessLogo(base64),
    onSuccess: (res) => {
      const imageUrl = res.data.data?.image ?? null
      setBusinessImage(imageUrl)
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      toast.success('Logo bisnis berhasil diperbarui')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const removeLogoMutation = useMutation({
    mutationFn: () => removeBusinessLogo(),
    onSuccess: () => {
      setBusinessImage(null)
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      toast.success('Logo berhasil dihapus')
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
      if (user && token) {
        setAuth({ ...user, business: { ...user.business, ...updated } }, token)
      }
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      toast.success('Info bisnis berhasil diperbarui')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const currentLogo = profile?.business?.image ?? user?.business?.image
  const membership = profile?.business?.membership ?? user?.business?.membership
  const tierLabel = membership?.tier === 'pro' ? 'Pro' : membership?.tier === 'trial' ? 'Trial' : 'Lite'

  return (
    <div className="flex flex-col h-full">
      <Header title="Profil & Akun" subtitle="Kelola info bisnis dan pengaturan akun Anda" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* ── Logo & Business Name ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
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
                  disabled={logoMutation.isPending}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center shadow transition"
                  title="Upload logo"
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
                    disabled={infoMutation.isPending || (!businessName || !ownerName)}
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
          </div>

          {/* ── Account Info ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User size={15} className="text-blue-600" />
              Informasi Akun
            </h3>
            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-center justify-between py-3 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Mail size={15} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Email</p>
                    <p className="text-sm font-medium text-gray-900">
                      {profile?.email ?? user?.email ?? '—'}
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
                    onClick={() => setShowChangeEmail(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Ubah
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3 py-3">
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                  <Phone size={15} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Nomor HP</p>
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.phone_number ?? user?.phone_number ?? '—'}
                  </p>
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
                <a
                  href="/membership"
                  className="text-xs text-blue-600 font-semibold hover:underline"
                >
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
          onSave={(base64) => {
            setCropSrc(null)
            logoMutation.mutate(base64)
          }}
        />
      )}
      {showChangeEmail && (
        <ChangeEmailModal
          currentEmail={profile?.email ?? user?.email ?? null}
          onClose={() => setShowChangeEmail(false)}
        />
      )}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  )
}
