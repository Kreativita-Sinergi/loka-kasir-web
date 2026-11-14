import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import * as Loka from '@/components/icons/loka'
import { publicApi } from '@/lib/axios'
import { t } from '@/lib/i18n'

export const QR_PRO_REQUIRED = 'QR_PRO_REQUIRED'

/** A server refusal replaces the whole QR page, including cached menus,
 * balance data and an already-open checkout. The visitor's own login or plan
 * never determines access: the server checks the business behind the QR. */
function QRScreen() {
  const [unavailable, setUnavailable] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const interceptor = publicApi.interceptors.response.use(undefined, (error) => {
      if (error.response?.data?.error?.code === QR_PRO_REQUIRED) setUnavailable(true)
      return Promise.reject(error)
    })
    // Axios captures response interceptors when a request starts. Mount the
    // page only after this guard is installed, including on the first visit.
    setReady(true)
    return () => publicApi.interceptors.response.eject(interceptor)
  }, [])

  if (!ready) return null
  if (!unavailable) return <Outlet />
  return (
    <div role="alert" className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center gap-4">
      <Loka.Qr size={40} className="text-gray-400" />
      <h1 className="text-lg font-semibold text-gray-900">{t('qrUnavailableTitle')}</h1>
      <p className="text-sm text-gray-600 max-w-sm">{t('errQrProRequired')}</p>
    </div>
  )
}

export default function PublicQRAccess() {
  const location = useLocation()
  return <QRScreen key={location.pathname} />
}
