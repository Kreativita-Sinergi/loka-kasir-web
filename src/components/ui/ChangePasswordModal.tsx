import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, X } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { changePassword, changePasswordWithOTP, requestChangePasswordOTP } from '@/api/auth'
import { getErrorMessage } from '@/lib/utils'
import PasswordStrengthBar from './PasswordStrengthBar'
import { t } from '@/lib/i18n'
import { useAuthStore } from '@/store/authStore'

type Mode = 'password' | 'otp-channel' | 'otp-verify'

interface Props {
  onClose: () => void
  required?: boolean
}

export default function ChangePasswordModal({ onClose, required = false }: Props) {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [mode, setMode] = useState<Mode>('password')

  // --- password mode ---
  const [oldPassword, setOldPassword] = useState('')
  const [showOld, setShowOld]         = useState(false)

  // --- otp-channel mode --- (hanya email; WhatsApp tidak digunakan lagi)
  const channel = 'email' as const

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
      toast.success(required ? 'Password berhasil diganti. Silakan masuk kembali.' : t('pwChanged'))
      clearAuth()
      onClose()
      navigate('/login', { replace: true })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const requestOtpMutation = useMutation({
    mutationFn: () => requestChangePasswordOTP(channel),
    onSuccess: () => {
      toast.success(t('pwOtpSent'))
      setMode('otp-verify')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const changePasswordWithOTPMutation = useMutation({
    mutationFn: () => changePasswordWithOTP({ otp, new_password: newPassword }),
    onSuccess: () => {
      toast.success(required ? 'Password berhasil diganti. Silakan masuk kembali.' : t('pwChanged'))
      clearAuth()
      onClose()
      navigate('/login', { replace: true })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // ---- handlers ----

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword) { toast.error(t('pwOldRequired')); return }
    if (newPassword.length < 6) { toast.error(t('pwMinLength')); return }
    if (newPassword !== confirmPass) { toast.error(t('pwMismatch')); return }
    changePasswordMutation.mutate()
  }

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault()
    requestOtpMutation.mutate()
  }

  const handleOtpVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) { toast.error(t('pwOtpSixDigits')); return }
    if (newPassword.length < 6) { toast.error(t('pwMinLength')); return }
    if (newPassword !== confirmPass) { toast.error(t('pwMismatch')); return }
    changePasswordWithOTPMutation.mutate()
  }

  // newPasswordFields — JSX block (bukan komponen) agar tidak remount saat state berubah
  const newPasswordFields = (
    <>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {t('profileNewPassword')} <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('pwMinHint')}
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
          {t('pwConfirmNew')} <span className="text-red-500 dark:text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            placeholder={t('pwRepeatNew')}
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
            {confirmPass === newPassword ? t('pwMatch') : t('pwNoMatch')}
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
              <h2 className="text-lg font-bold text-foreground">{t('accountChangePassword')}</h2>
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
                  {t('profileOldPassword')} <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder={t('pwEnterOld')}
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
                    {t('pwUseOtp')}
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
                  {t('actionCancel')}
                </button>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
                >
                  {changePasswordMutation.isPending ? 'Menyimpan...' : t('actionSave')}
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
              <h2 className="text-lg font-bold text-foreground">{t('otpSend')}</h2>
              <button
                onClick={onClose}
                className="p-1.5 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-lg transition ml-auto"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('pwOtpToEmail', { channel: t('labelEmailLower') })}
              </p>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-border text-muted-foreground text-sm font-medium rounded-xl hover:bg-muted transition"
                >
                  {t('actionCancel')}
                </button>
                <button
                  type="submit"
                  disabled={requestOtpMutation.isPending}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
                >
                  {requestOtpMutation.isPending ? t('loading') : t('otpSend')}
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
              <h2 className="text-lg font-bold text-foreground">{t('otpVerify')}</h2>
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
                  {t('pwOtpCode')} <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder={t('pwEnterOtp')}
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
                  {t('actionCancel')}
                </button>
                <button
                  type="submit"
                  disabled={changePasswordWithOTPMutation.isPending}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
                >
                  {changePasswordWithOTPMutation.isPending ? 'Menyimpan...' : t('actionSave')}
                </button>
              </div>
            </form>
          </>
        )}

      </div>
    </div>
  )
}
