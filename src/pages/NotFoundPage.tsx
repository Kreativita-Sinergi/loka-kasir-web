import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'
import { t } from '@/lib/i18n'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="text-center max-w-md">
        {/* Big 404 */}
        <p className="text-8xl font-black text-blue-600 dark:text-blue-400 leading-none select-none">404</p>

        {/* Divider */}
        <div className="w-16 h-1 bg-blue-600 rounded-full mx-auto my-6" />

        <h1 className="text-2xl font-bold text-foreground mb-2">{t('pageNotFound')}</h1>
        <p className="text-muted-foreground text-sm mb-8">
          {t('notFoundBody')}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-5 py-3 border border-border text-muted-foreground font-medium rounded-xl hover:bg-card transition text-sm"
          >
            <ArrowLeft size={16} /> {t('actionBack')}
          </button>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition text-sm"
          >
            <Home size={16} /> {t('backToHome')}
          </button>
        </div>
      </div>
    </div>
  )
}
