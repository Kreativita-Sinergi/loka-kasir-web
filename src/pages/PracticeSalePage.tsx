import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ShoppingBasket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { recordPractice } from '@/api/onboarding'
import { t } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'

const sampleItems = [
  { label: 'practiceSampleDrink', price: 10 },
  { label: 'practiceSampleFood', price: 15 },
] as const

export default function PracticeSalePage() {
  const qc = useQueryClient()
  const [counts, setCounts] = useState([0, 0])
  const [payment, setPayment] = useState<number | null>(null)
  const [phase, setPhase] = useState<'cart' | 'payment' | 'receipt'>('cart')
  const total = counts.reduce((sum, count, index) => sum + count * sampleItems[index].price, 0)
  const reset = () => {
    setCounts([0, 0])
    setPayment(null)
    setPhase('cart')
  }

  const finish = () => {
    if (payment === null || payment < total || total === 0) return
    setPhase('receipt')
    void recordPractice()
      .then(() => qc.invalidateQueries({ queryKey: ['onboarding-progress'] }))
      .catch(() => {})
  }

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-8">
      <Link to="/mulai" className="text-sm font-semibold text-primary hover:underline">
        {t('practiceBack')}
      </Link>
      <div className="flex items-center gap-3">
        <ShoppingBasket className="text-primary" aria-hidden />
        <h1 className="text-2xl font-bold">{t('practiceTitle')}</h1>
      </div>
      <p className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">{t('practiceIsolation')}</p>
      <section className="space-y-4 rounded-2xl border bg-card p-5" aria-live="polite">
        {phase === 'cart' && (
          <>
            <h2 className="font-semibold">{t('practiceChooseItems')}</h2>
            {sampleItems.map((item, index) => (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{t(item.label)}</p>
                  <p className="text-sm text-muted-foreground">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={t('practiceRemove', { item: t(item.label) })}
                    disabled={!counts[index]}
                    onClick={() => setCounts((items) => items.map((n, i) => (i === index ? n - 1 : n)))}
                  >
                    −
                  </Button>
                  <span className="tabular-nums">{counts[index]}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={t('practiceAdd', { item: t(item.label) })}
                    disabled={counts[index] >= 20}
                    onClick={() => setCounts((items) => items.map((n, i) => (i === index ? n + 1 : n)))}
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}
          </>
        )}
        <div className="flex justify-between border-t pt-3 text-lg font-semibold">
          <span>{t('practiceTotal')}</span>
          {formatCurrency(total)}
        </div>
        {phase === 'cart' && (
          <Button disabled={!total} onClick={() => setPhase('payment')}>
            {t('practiceGoPay')}
          </Button>
        )}
        {phase === 'payment' && (
          <>
            <h2 className="font-semibold">{t('practiceChooseCash')}</h2>
            <div className="flex gap-2">
              {[total, Math.ceil((total + 1) / 10) * 10].map((amount) => (
                <Button
                  key={amount}
                  variant={payment === amount ? 'default' : 'outline'}
                  onClick={() => setPayment(amount)}
                >
                  {formatCurrency(amount)}
                </Button>
              ))}
            </div>
            <Button disabled={payment === null} onClick={finish}>
              {t('practiceFinish')}
            </Button>
          </>
        )}
        {phase === 'receipt' && payment !== null && (
          <>
            <h2 className="font-semibold text-success">{t('practiceReceipt')}</h2>
            {sampleItems.map(
              (item, index) =>
                counts[index] > 0 && (
                  <p key={item.label}>
                    {counts[index]} × {t(item.label)} · {formatCurrency(counts[index] * item.price)}
                  </p>
                ),
            )}
            <p>{t('practiceChange', { money: formatCurrency(payment - total) })}</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={reset}>
                {t('practiceAgain')}
              </Button>
              <Link className="self-center text-sm font-semibold text-primary hover:underline" to="/mulai">
                {t('practiceBack')}
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
