import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { resendAccountOtp, verifyAccountOtp } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { hydrateUserFromToken } from '@/lib/jwt'
import { currentLandingPath } from '@/lib/landing'
import { getErrorMessage, getFailureMessage } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import LanguageMenu from '@/components/ui/LanguageMenu'
import { t } from '@/lib/i18n'

interface VerifyEmailState {
  email?: string
  /** register: OTP baru saja dikirim. login: kodenya mungkin sudah kedaluwarsa. */
  from?: 'register' | 'login'
}

const RESEND_COOLDOWN_SECONDS = 60

// Langkah terakhir pendaftaran: akun baru aktif setelah kode dari emailnya
// dimasukkan (`IsVerified: false` di `service/registration_service.go`).
//
// Dibuka dari dua tempat. Dari /register, OTP baru saja dikirim, jadi tombol
// kirim ulang menunggu sebentar. Dari /login (jawaban `AUTH_NOT_VERIFIED`),
// kode pendaftarannya kemungkinan sudah lewat 10 menit, jadi tombol itu
// langsung bisa ditekan.
export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const state = (location.state ?? {}) as VerifyEmailState
  const email = state.email?.trim() ?? ''
  const fromRegister = state.from === 'register'

  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(fromRegister ? RESEND_COOLDOWN_SECONDS : 0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  // Dibuka langsung tanpa email (dimuat ulang, atau tautan diketik): tidak
  // ada yang bisa diverifikasi. Login akan membawa ke sini lagi bila perlu.
  if (!email) return <Navigate to="/login" replace />

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{6}$/.test(code)) { toast.error(t('verifyEmailCodeInvalid')); return }
    setVerifying(true)
    try {
      const res = await verifyAccountOtp(email, code)
      const user = res.data?.data
      if (!res.data.status || !user?.token) {
        toast.error(res.data.status ? t('verifyEmailFailed') : getFailureMessage(res.data))
        return
      }
      setAuth(hydrateUserFromToken(user), user.token)
      toast.success(t('regWelcome'))
      // Pemilik yang baru mendaftar belum bisa melayani pembeli sampai
      // aplikasi kasirnya terpasang — /mulai yang mengatakan itu.
      navigate(fromRegister ? '/mulai' : currentLandingPath(), { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      const res = await resendAccountOtp(email)
      if (res.data.status === false) {
        toast.error(getFailureMessage(res.data))
        return
      }
      toast.success(t('verifyEmailResent'))
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="absolute top-4 right-4">
        <LanguageMenu />
      </div>
      <Card className="w-full max-w-md">
        <CardContent className="p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MailCheck size={24} />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">{t('verifyEmailTitle')}</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {t('verifyEmailBodyPrefix')}
            <span className="font-semibold text-foreground break-all">{email}</span>
            {t('verifyEmailBodySuffix')}
          </p>

          <form onSubmit={handleVerify} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">{t('verifyEmailCodeLabel')}</Label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="h-12 text-center text-2xl font-semibold tracking-[0.5em]"
              />
            </div>
            <Button type="submit" disabled={verifying || code.length !== 6} className="w-full h-11" size="lg">
              {verifying ? t('processing') : t('verifyEmailSubmit')}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
            <p>
              {t('verifyEmailNoCode')}{' '}
              {cooldown > 0 ? (
                <span>{t('verifyEmailResendIn', { seconds: cooldown })}</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-primary font-semibold hover:underline disabled:opacity-50"
                >
                  {t('verifyEmailResend')}
                </button>
              )}
            </p>
            <p className="text-xs">{t('verifyEmailCheckSpam')}</p>
            <p>
              <Link to="/login" className="text-primary font-semibold hover:underline">
                {t('verifyEmailBackToLogin')}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
