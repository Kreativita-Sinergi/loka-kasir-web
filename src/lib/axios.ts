import axios from 'axios'
import toast from 'react-hot-toast'
import { useOutletStore } from '@/store/outletStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { queryClient } from './queryClient'
import { activeLocale } from './i18n'
import { normalizeTextData } from './textCase'
import { errorCodeOf, getErrorMessage } from './utils'

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
 * server menjawab dalam bahasa itu — pemilik yang memilih Bahasa Indonesia di dasbor
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

function normalizeWrite(config: import('axios').InternalAxiosRequestConfig) {
  if (['post', 'put', 'patch'].includes(config.method?.toLowerCase() ?? '')) {
    config.data = normalizeTextData(config.data, 'storage')
  }
  return config
}

function normalizeResponse(response: import('axios').AxiosResponse) {
  // Catalog category names are also exact-match search keys; format their
  // labels at render time instead of replacing the values sent back to search.
  if (response.config.url?.split('?')[0].endsWith('/product/catalog/categories')) return response
  response.data = normalizeTextData(response.data, 'display')
  return response
}

publicApi.interceptors.response.use(normalizeResponse)

publicApi.interceptors.request.use((config) => {
  // Layar registrasi dan pemulihan kata sandi juga menerima teks dari server,
  // dan keduanya berjalan sebelum ada JWT.
  config.headers['Accept-Language'] = localeHeader()
  return normalizeWrite(config)
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

  return normalizeWrite(config)
})

let isRedirectingToLogin = false

/** Kode galat server saat karyawan menyentuh outlet di luar penugasannya. */
export const OUTLET_NOT_ASSIGNED = 'OUTLET_NOT_ASSIGNED'

api.interceptors.response.use(
  normalizeResponse,
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

    // Paket berakhir turun ke Free; penolakan kuota/fitur 402 tidak
    // mengunci dasbor atau mengakhiri sesi pengguna.
    if (error.response?.status === 402 &&
        ['NO_SUBSCRIPTION', 'TRIAL_EXPIRED', 'SUBSCRIPTION_EXPIRED'].includes(errorCodeOf(error) ?? '')) {
      useSubscriptionStore.getState().setStatus('FREE')
    }

    // HTTP 403 OUTLET_NOT_ASSIGNED: karyawan membuka outlet di luar
    // penugasannya (biasanya outlet aktif yang tersimpan sebelum penugasannya
    // diubah). Outlet aktif dilepas supaya permintaan berikutnya tidak membawa
    // outlet itu lagi, dan pengguna memilih outlet yang boleh — bukan logout,
    // karena sesinya sendiri sah. Tidak dicoba ulang otomatis: pilihan ulang
    // ada di tangan pengguna. Toast memakai id tetap agar beberapa permintaan
    // yang gagal bersamaan hanya memunculkan satu pesan.
    if (error.response?.status === 403 && errorCodeOf(error) === OUTLET_NOT_ASSIGNED) {
      toast.error(getErrorMessage(error), { id: OUTLET_NOT_ASSIGNED })
      const outletId = useOutletStore.getState().selected?.id
      if (outletId) useOutletStore.getState().rejectOutlet(outletId)
    }

    return Promise.reject(error)
  }
)

export default api
