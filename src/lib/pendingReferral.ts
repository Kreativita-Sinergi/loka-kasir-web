import { applyReferral, isReferralCode } from '@/api/referral'

const key = 'referral-code'

export function pendingReferralCode() {
  try { return sessionStorage.getItem(key)?.trim().toUpperCase() || null } catch { return null }
}

export function capturePendingReferral(value: string | null) {
  const code = value?.trim().toUpperCase()
  if (code && isReferralCode(code)) {
    try { sessionStorage.setItem(key, code) } catch { /* Preserve it in navigation state when storage is unavailable. */ }
    return code
  }
  return pendingReferralCode()
}

export function clearPendingReferral(code: string) {
  try { if (pendingReferralCode() === code.trim().toUpperCase()) sessionStorage.removeItem(key) } catch { /* Browser storage can be unavailable. */ }
}

export async function applyPendingReferral(explicitCode?: string | null) {
  const code = explicitCode?.trim().toUpperCase() || pendingReferralCode()
  if (!code || !isReferralCode(code)) return false
  const response = await applyReferral(code)
  if (response.data?.status !== true) throw new Error('Kode referral belum diterapkan.')
  clearPendingReferral(code)
  return true
}
