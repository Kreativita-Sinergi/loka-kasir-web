import axios from 'axios'
import { useOutletStore } from '@/store/outletStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { queryClient } from './queryClient'
import { activeLocale } from './i18n'

/**
 * Public API instance — no auth headers, no 401→/login redirect.
 * Use this for endpoints that are accessible without a JWT (e.g. registration dropdowns).
 */
export const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
})

/**
 * Bahasa yang diminta dari server, mengikuti pilihan di dasbor.
 *
 * Tanpa header ini peramban mengirim `Accept-Language` miliknya sendiri, dan
 * server menjawab dalam bahasa itu — pemilik yang memilih 日本語 di dasbor
 * tetap menerima insight berbahasa Inggris karena Chrome-nya berbahasa Inggris.
 * Teks yang disusun server (insight, pesan galat, nama izin) jadi tidak pernah
 * sejalan dengan antarmukanya.
 *
 * Dibaca dari `activeLocale()`, bukan dari store, supaya berlaku juga untuk
 * permintaan yang berjalan di luar pohon React.
 */
function localeHeader() {
  return activeLocale()
}

publicApi.interceptors.request.use((config) => {
  // Layar registrasi dan pemulihan kata sandi juga menerima teks dari server,
  // dan keduanya berjalan sebelum ada JWT.
  config.headers['Accept-Language'] = localeHeader()
  return config
})

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  // Inject active outlet into every request as a header.
  // Pages that need to override per-request can still pass outlet_id as a param.
  const outletId = useOutletStore.getState().selected?.id
  if (outletId) config.headers['X-Outlet-Id'] = outletId

  config.headers['Accept-Language'] = localeHeader()

  return config
})

let isRedirectingToLogin = false

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !isRedirectingToLogin) {
      isRedirectingToLogin = true
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      useOutletStore.getState().setOutlet(null)
      useSubscriptionStore.getState().setStatus(null)
      queryClient.clear()
      window.location.href = '/login'
    }

    // HTTP 402: subscription or trial expired.
    // Both TRIAL_EXPIRED and SUBSCRIPTION_EXPIRED codes result in the same
    // lockout — SubscriptionGuard redirects to /membership on next render.
    // We set status here rather than hard-navigating so in-flight React Query
    // mutations can still clean up before the navigation fires.
    if (error.response?.status === 402) {
      useSubscriptionStore.getState().setStatus('EXPIRED')
    }

    return Promise.reject(error)
  }
)

export default api
