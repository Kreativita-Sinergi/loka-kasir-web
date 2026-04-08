import axios from 'axios'
import { useOutletStore } from '@/store/outletStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'

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

  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
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
