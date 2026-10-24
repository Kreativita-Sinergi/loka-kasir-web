import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Info, Sparkles, Tag, TrendingDown, TrendingUp } from 'lucide-react'
import Header from '@/components/layout/Header'
import StatCard from '@/components/ui/StatCard'
import Badge, { type BadgeVariant } from '@/components/ui/Badge'
import { getMenuMatrix, getPriceChanges, type MenuClass, type MenuItem, type PriceChange } from '@/api/ownerInsights'
import { formatCurrency, formatDate } from '@/lib/utils'
import { formatQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'
import type { MessageKey } from '@/lib/messages'
import { oneDecimal, pct } from '@/lib/ownerInsights'

const signedPct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${pct(Math.abs(v))}`
const signedMoney = (v: number) => `${v >= 0 ? '+' : '−'}${formatCurrency(Math.abs(v))}`

type Tab = 'changes' | 'menu'
type Period = '7d' | '30d' | '90d'

function changeBadge(c: PriceChange): [BadgeVariant, string] {
  if (c.status === 'too_early') return ['gray', t('plbWaitDays', { days: c.days_until_ready })]
  if (c.status === 'no_baseline') return ['gray', t('plbNoBaseline')]
  if (c.verdict === 'better') return ['green', t('plbVerdictBetter')]
  if (c.verdict === 'worse') return ['red', t('plbVerdictWorse')]
  return ['gray', t('plbVerdictFlat')]
}

function ChangeRow({ change: c }: { change: PriceChange }) {
  const [variant, label] = changeBadge(c)
  const lines: string[] = []
  if (c.status === 'ready') {
    if (c.metric_delta_per_day != null && c.metric_change_pct != null) {
      const args = { money: signedMoney(c.metric_delta_per_day), pct: signedPct(c.metric_change_pct) }
      lines.push(c.metric === 'profit' ? t('plbProfitPerDay', args) : t('plbRevenuePerDay', args))
    }
    if (c.qty_change_pct != null) lines.push(t('plbQtyChange', { pct: signedPct(c.qty_change_pct) }))
    if (c.traffic_change_pct != null && Math.abs(c.traffic_change_pct) >= 5) {
      lines.push(t('plbTrafficAdjusted', { pct: signedPct(c.traffic_change_pct) }))
    }
    if (c.before) lines.push(t('plbWindow', { days: c.before.days }))
  }
  return (
    <li className="px-4 py-3 space-y-1">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{c.name}</p>
        <Badge variant={variant}>{label}</Badge>
      </div>
      <p className="text-sm text-foreground">
        {t('plbPriceLine', {
          oldPrice: formatCurrency(c.old_price),
          newPrice: formatCurrency(c.new_price),
          pct: signedPct(c.price_change_pct),
          date: formatDate(c.changed_on),
        })}
      </p>
      {lines.map((l) => <p key={l} className="text-xs text-muted-foreground">{l}</p>)}
      {c.status === 'ready' && c.confidence === 'low' && <p className="text-xs text-warning">{t('plbLowConfidence')}</p>}
      <p className="text-[11px] text-muted-foreground">{c.source === 'catalog' ? t('plbSourceCatalog') : t('plbSourceSales')}</p>
    </li>
  )
}

const CLASS_ORDER: MenuClass[] = ['star', 'plowhorse', 'puzzle', 'dog', 'no_cost']
const CLASS_TEXT: Record<MenuClass, [MessageKey, MessageKey]> = {
  star: ['plbStarTitle', 'plbStarHint'],
  plowhorse: ['plbPlowTitle', 'plbPlowHint'],
  puzzle: ['plbPuzzleTitle', 'plbPuzzleHint'],
  dog: ['plbDogTitle', 'plbDogHint'],
  no_cost: ['plbNoCostTitle', 'plbNoCostHint'],
}

function MenuRow({ item: it }: { item: MenuItem }) {
  const qty = it.is_weight_based ? t('plbQtyKg', { qty: oneDecimal(it.qty) }) : formatQuantity(it.qty)
  return (
    <tr className="hover:bg-muted transition-colors">
      <td className="px-4 py-3 text-sm">
        <p className="font-medium text-foreground">{it.name}</p>
        {it.suggested_price != null && (
          <p className="text-xs font-semibold text-primary">
            {t('plbSuggestPrice', { current: formatCurrency(it.unit_price), suggested: formatCurrency(it.suggested_price) })}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-right text-muted-foreground">{qty}</td>
      <td className="px-4 py-3 text-sm text-right text-muted-foreground">{it.class === 'no_cost' ? '—' : pct(it.mix_share)}</td>
      <td className="px-4 py-3 text-sm text-right text-muted-foreground">{formatCurrency(it.unit_price)}</td>
      <td className="px-4 py-3 text-sm text-right text-muted-foreground">{it.class === 'no_cost' ? '—' : formatCurrency(it.unit_profit)}</td>
      <td className="px-4 py-3 text-sm text-right font-semibold text-foreground">{formatCurrency(it.revenue)}</td>
    </tr>
  )
}

export default function PriceLabPage() {
  const [tab, setTab] = useState<Tab>('changes')
  const [period, setPeriod] = useState<Period>('30d')

  const changes = useQuery({
    queryKey: ['price-changes'],
    queryFn: getPriceChanges,
    select: (res) => res.data.data.changes,
    enabled: tab === 'changes',
  })
  const menu = useQuery({
    queryKey: ['menu-matrix', period],
    queryFn: () => getMenuMatrix(period),
    select: (res) => res.data.data,
    enabled: tab === 'menu',
  })

  const list = changes.data ?? []
  const ready = list.filter((c) => c.status === 'ready')
  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-sm rounded-lg font-medium ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title={t('plbTitle')} subtitle={t('plbSubtitle')} />

      <div className="page-content flex-1 min-h-0 min-w-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex gap-1 rounded-xl border border-border bg-card p-1">
            <button type="button" className={tabClass(tab === 'changes')} onClick={() => setTab('changes')}>{t('plbTabChanges')}</button>
            <button type="button" className={tabClass(tab === 'menu')} onClick={() => setTab('menu')}>{t('plbTabMenu')}</button>
          </div>
          {tab === 'menu' && (
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground">
              <option value="7d">{t('plbPeriod7')}</option>
              <option value="30d">{t('plbPeriod30')}</option>
              <option value="90d">{t('plbPeriod90')}</option>
            </select>
          )}
        </div>

        {tab === 'changes' ? (
          <>
            <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-4">
              <StatCard title={t('plbStatChanges')} value={list.length} icon={<Tag size={18} />} color="blue" loading={changes.isLoading} />
              <StatCard title={t('plbStatBetter')} value={ready.filter((c) => c.verdict === 'better').length} icon={<TrendingUp size={18} />} color="green" loading={changes.isLoading} />
              <StatCard title={t('plbStatWorse')} value={ready.filter((c) => c.verdict === 'worse').length} icon={<TrendingDown size={18} />} color="red" loading={changes.isLoading} />
            </div>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 pt-4 pb-2">
                <p className="text-sm font-semibold text-foreground">{t('plbChangesTitle')}</p>
                <p className="text-xs text-muted-foreground">{t('plbChangesHint')}</p>
              </div>
              {changes.isError ? (
                <p className="px-4 pb-6 text-sm text-destructive">{t('cashDiscLoadFailed')}</p>
              ) : !changes.isLoading && list.length === 0 ? (
                <p className="px-4 pb-6 pt-2 text-sm text-muted-foreground text-center">{t('plbChangesEmpty')}</p>
              ) : (
                <ul className="divide-y divide-border">{list.map((c) => <ChangeRow key={`${c.item_id}-${c.changed_on}`} change={c} />)}</ul>
              )}
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              <Info size={16} className="mt-0.5 shrink-0" />
              <p>{t('plbChangesNote')}</p>
            </div>
          </>
        ) : (
          <>
            {menu.isError && <p className="text-sm text-destructive">{t('cashDiscLoadFailed')}</p>}
            {menu.data && menu.data.items.length === 0 && (
              <p className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">{t('plbMenuEmpty')}</p>
            )}
            {CLASS_ORDER.map((cls) => {
              const items = menu.data?.items.filter((i) => i.class === cls) ?? []
              if (!items.length) return null
              const [title, hint] = CLASS_TEXT[cls]
              return (
                <div key={cls} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        {cls === 'star' && <Sparkles size={14} className="text-warning" />}
                        {t(title)} ({items.length})
                      </p>
                      <p className="text-xs text-muted-foreground">{t(hint)}</p>
                    </div>
                    {cls === 'no_cost' && (
                      <Link to="/products/base-prices" className="shrink-0 text-sm font-medium text-primary hover:underline">{t('plbFillCost')}</Link>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">{t('plbColItem')}</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">{t('plbColSold')}</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">{t('plbColMix')}</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">{t('plbColPrice')}</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">{t('plbColProfit')}</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">{t('plbColRevenue')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">{items.map((it) => <MenuRow key={it.item_id} item={it} />)}</tbody>
                    </table>
                  </div>
                </div>
              )
            })}
            {menu.data && menu.data.items.length > 0 && (
              <div className="flex items-start gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                <Info size={16} className="mt-0.5 shrink-0" />
                <p>{t('plbMenuNote', { pct: pct(menu.data.popularity_threshold), profit: formatCurrency(menu.data.profit_threshold) })}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
