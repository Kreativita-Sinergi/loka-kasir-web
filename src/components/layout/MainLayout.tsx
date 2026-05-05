import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { X, FlaskConical } from 'lucide-react'
import Sidebar from './Sidebar'

const BANNER_KEY = 'close_testing_banner_dismissed'

function CloseTestingBanner() {
  const [visible, setVisible] = useState(() => localStorage.getItem(BANNER_KEY) !== '1')

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem(BANNER_KEY, '1')
    setVisible(false)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-600 text-white text-sm shrink-0">
      <FlaskConical size={15} className="shrink-0 opacity-80" />
      <p className="flex-1">
        <span className="font-semibold">Close Testing — </span>
        Aplikasi Loka Kasir sedang dalam tahap uji coba tertutup.{' '}
        <a
          href="https://play.google.com/store/apps/details?id=com.loka.kasir"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 font-semibold hover:opacity-80 transition"
        >
          Daftar sebagai tester di Google Play
        </a>
        {' '}untuk mencoba aplikasi mobile.
      </p>
      <button
        onClick={dismiss}
        className="shrink-0 p-0.5 hover:opacity-70 transition"
        aria-label="Tutup"
      >
        <X size={15} />
      </button>
    </div>
  )
}

export default function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden capitalize-data">
        <CloseTestingBanner />
        <Outlet />
      </div>
    </div>
  )
}
