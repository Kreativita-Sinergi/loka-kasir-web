import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, X } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { changePassword, changePasswordWithOTP, requestChangePasswordOTP } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import PasswordStrengthBar from './PasswordStrengthBar'

type Mode = 'password' | 'otp-channel' | 'otp-verify'

interface Props {
  onClose: () => void
}

export default function ChangePasswordModal({ onClose }: Props) {
  const [mode, setMode] = useState<Mode>('password')

  // --- password mode ---
  const [oldPassword, setOldPassword] = useState('')
  const [showOld, setShowOld]         = useState(false)

  // --- otp-channel mode ---
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp')

  // --- otp-verify mode ---
  const [otp, setOtp]               = useState('')
  const [showNew, setShowNew]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // --- shared new / confirm password ---
  const [newPassword, setNewPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')

  // ---- mutations ----

  const changePasswordMutation = useMutation({
    mutationFn: () => changePassword({ old_password: oldPassword, new_password: newPassword }),
    onSuccess: () => {
      toast.success('Password berhasil diubah')
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const requestOtpMutation = useMutation({
    mutationFn: () => requestChangePasswordOTP(channel),
    onSuccess: () => {
      toast.success('OTP telah dikirim')
      setMode('otp-verify')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const changePasswordWithOTPMutation = useMutation({
    mutationFn: () => changePasswordWithOTP({ otp, new_password: newPassword }),
    onSuccess: () => {
      toast.success('Password berhasil diubah')
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // ---- handlers ----

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword) { toast.error('Password lama harus diisi'); return }
    if (newPassword.length < 6) { toast.error('Password baru minimal 6 karakter'); return }
    if (newPassword !== confirmPass) { toast.error('Konfirmasi password tidak cocok'); return }
    changePasswordMutation.mutate()
  }

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault()
    requestOtpMutation.mutate()
  }

  const handleOtpVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) { toast.error('Masukkan kode OTP 6 digit'); return }
    if (newPassword.length < 6) { toast.error('Password baru minimal 6 karakter'); return }
    if (newPassword !== confirmPass) { toast.error('Konfirmasi password tidak cocok'); return }
    changePasswordWithOTPMutation.mutate()
  }

  // newPasswordFields — JSX block (bukan komponen) agar tidak remount saat state berubah
  const newPasswordFields = (
    <>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Password Baru <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 6 karakter"
            className="w-full px-4 py-3 pr-11 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
          >
            {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        <PasswordStrengthBar password={newPassword} />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Konfirmasi Password Baru <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            placeholder="Ulangi password baru"
            className="w-full px-4 py-3 pr-11 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
          >
            {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
        {confirmPass && (
          <p className={`text-xs font-semibold mt-1 text-right transition-colors ${
            confirmPass === newPassword ? 'text-green-500 dark:text-green-400' : 'text-red-400'
          }`}>
            {confirmPass === newPassword ? 'Password cocok' : 'Password tidak cocok'}
          </p>
        )}
      </div>
    </>
  )

  // ---- render ----

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6">

        {/* ── MODE: password ─────────────────────────────────────────── */}
        {mode === 'password' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-foreground">Ganti Password</h2>
              <button
                onClick={onClose}
                className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Old password */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Password Lama <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan password lama"
                    className="w-full px-4 py-3 pr-11 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    {showOld ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Lupa password lama?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('otp-channel')}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Gunakan OTP
                  </button>
                </p>
              </div>

              {newPasswordFields}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-border text-muted-foreground text-sm font-medium rounded-xl hover:bg-muted transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
                >
                  {changePasswordMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── MODE: otp-channel ──────────────────────────────────────── */}
        {mode === 'otp-channel' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setMode('password')}
                className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-lg transition"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-lg font-bold text-foreground">Kirim OTP</h2>
              <button
                onClick={onClose}
                className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-lg transition ml-auto"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Pilih saluran pengiriman kode OTP untuk verifikasi ganti password.
              </p>

              <div className="space-y-2">
                {(['whatsapp', 'email'] as const).map((c) => (
                  <label
                    key={c}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${
                      channel === c
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <input
                      type="radio"
                      name="channel"
                      value={c}
                      checked={channel === c}
                      onChange={() => setChannel(c)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm font-medium text-foreground capitalize">
                      {c === 'whatsapp' ? 'WhatsApp' : 'Email'}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-border text-muted-foreground text-sm font-medium rounded-xl hover:bg-muted transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={requestOtpMutation.isPending}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
                >
                  {requestOtpMutation.isPending ? 'Mengirim...' : 'Kirim OTP'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── MODE: otp-verify ───────────────────────────────────────── */}
        {mode === 'otp-verify' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => { setOtp(''); setMode('otp-channel') }}
                className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-lg transition"
              >
                <ArrowLeft size={18} />
              </button>
              <h2 className="text-lg font-bold text-foreground">Verifikasi OTP</h2>
              <button
                onClick={onClose}
                className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-lg transition ml-auto"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleOtpVerifySubmit} className="space-y-4">
              {/* OTP field */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Kode OTP <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Masukkan 6 digit kode OTP"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {newPasswordFields}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-border text-muted-foreground text-sm font-medium rounded-xl hover:bg-muted transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={changePasswordWithOTPMutation.isPending}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
                >
                  {changePasswordWithOTPMutation.isPending ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </>
        )}

      </div>
    </div>
  )
}
