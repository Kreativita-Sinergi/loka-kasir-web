import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Award, Gift, Stamp, Sparkles, Ticket, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getTiers, saveTier, deleteTier,
  getRewards, saveReward, deleteReward,
  getStampCards, saveStampCard, deleteStampCard,
  getBonusRules, saveBonusRule, deleteBonusRule,
  getVouchers, issueVoucher,
  type Tier, type Reward, type StampCard, type BonusRule,
} from '@/api/loyalty'
import { getProducts } from '@/api/products'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import { t } from '@/lib/i18n'

type TabKey = 'tiers' | 'rewards' | 'stamps' | 'bonus' | 'vouchers'

const TABS: { key: TabKey; label: () => string; icon: typeof Award }[] = [
  { key: 'tiers',    label: () => t('loyaltyTabTiers'),    icon: Award },
  { key: 'rewards',  label: () => t('loyaltyTabRewards'),  icon: Gift },
  { key: 'stamps',   label: () => t('loyaltyTabStamps'),   icon: Stamp },
  { key: 'bonus',    label: () => t('loyaltyTabBonus'),    icon: Sparkles },
  { key: 'vouchers', label: () => t('loyaltyTabVouchers'), icon: Ticket },
]

const inputClass =
  'w-full border border-border bg-background rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500'

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-2xl p-4 space-y-3">{children}</div>
}

function RowShell({ title, subtitle, onDelete, children }: {
  title: string
  subtitle: string
  onDelete: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 border border-border rounded-xl px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
        {children}
      </div>
      <button
        onClick={onDelete}
        title={t('actionDelete')}
        className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ─── Tingkat pelanggan ───────────────────────────────────────────────────────

function TiersTab() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['loyalty-tiers'], queryFn: getTiers, select: (r) => r.data.data ?? [] })
  const [form, setForm] = useState({ name: '', min_lifetime_points: '0', discount_percent: '0' })

  const save = useMutation({
    mutationFn: (payload: Partial<Tier>) => saveTier(payload),
    onSuccess: () => {
      toast.success(t('loyaltySaved'))
      setForm({ name: '', min_lifetime_points: '0', discount_percent: '0' })
      qc.invalidateQueries({ queryKey: ['loyalty-tiers'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const remove = useMutation({
    mutationFn: deleteTier,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-tiers'] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <Card>
      <p className="text-xs text-muted-foreground">{t('loyaltyTiersHelp')}</p>
      <div className="space-y-2">
        {(data ?? []).map((tier) => (
          <RowShell
            key={tier.id}
            title={tier.name}
            subtitle={t('loyaltyTierRow', { points: tier.min_lifetime_points, percent: tier.discount_percent })}
            onDelete={() => remove.mutate(tier.id)}
          />
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground">{t('loyaltyTiersEmpty')}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-border">
        <input className={inputClass} placeholder={t('loyaltyTierName')} value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={inputClass} type="number" min="0" placeholder={t('loyaltyTierMinPoints')}
          value={form.min_lifetime_points} onChange={(e) => setForm({ ...form, min_lifetime_points: e.target.value })} />
        <input className={inputClass} type="number" min="0" max="100" placeholder={t('loyaltyTierPercent')}
          value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
        <button
          disabled={save.isPending || form.name.trim().length < 2}
          onClick={() => save.mutate({
            name: form.name.trim(),
            min_lifetime_points: parseInt(form.min_lifetime_points) || 0,
            discount_percent: parseFloat(form.discount_percent) || 0,
          })}
          className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2 transition"
        >
          <Plus size={14} /> {t('actionAdd')}
        </button>
      </div>
    </Card>
  )
}

// ─── Katalog hadiah ──────────────────────────────────────────────────────────

function RewardsTab() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['loyalty-rewards'], queryFn: getRewards, select: (r) => r.data.data ?? [] })
  const { data: products } = useQuery({
    queryKey: ['products', 'loyalty-picker'],
    queryFn: () => getProducts({ limit: 100 }),
    select: (r) => r.data?.data ?? [],
  })
  const [form, setForm] = useState({ name: '', points_cost: '100', type: 'discount_amount' as Reward['type'], value: '10000', product_id: '' })

  const save = useMutation({
    mutationFn: (payload: Partial<Reward>) => saveReward(payload),
    onSuccess: () => {
      toast.success(t('loyaltySaved'))
      qc.invalidateQueries({ queryKey: ['loyalty-rewards'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const remove = useMutation({
    mutationFn: deleteReward,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-rewards'] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const describe = (r: Reward) => {
    if (r.type === 'free_product') return t('loyaltyRewardFreeProduct')
    if (r.type === 'discount_percent') return t('loyaltyRewardPercent', { percent: r.value })
    if (r.type === 'deposit') return t('loyaltyRewardDeposit', { amount: formatCurrency(r.value) })
    return t('loyaltyRewardAmount', { amount: formatCurrency(r.value) })
  }

  return (
    <Card>
      <p className="text-xs text-muted-foreground">{t('loyaltyRewardsHelp')}</p>
      <div className="space-y-2">
        {(data ?? []).map((reward) => (
          <RowShell
            key={reward.id}
            title={reward.name}
            subtitle={t('loyaltyRewardRow', { points: reward.points_cost, detail: describe(reward) })}
            onDelete={() => remove.mutate(reward.id)}
          />
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground">{t('loyaltyRewardsEmpty')}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 border-t border-border">
        <input className={inputClass} placeholder={t('loyaltyRewardName')} value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={inputClass} type="number" min="1" placeholder={t('loyaltyRewardPoints')}
          value={form.points_cost} onChange={(e) => setForm({ ...form, points_cost: e.target.value })} />
        <select className={inputClass} value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as Reward['type'] })}>
          <option value="discount_amount">{t('loyaltyRewardTypeAmount')}</option>
          <option value="discount_percent">{t('loyaltyRewardTypePercent')}</option>
          <option value="free_product">{t('loyaltyRewardTypeProduct')}</option>
          <option value="deposit">{t('loyaltyRewardTypeDeposit')}</option>
        </select>
        {form.type === 'free_product' ? (
          <select className={inputClass} value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
            <option value="">{t('loyaltyPickProduct')}</option>
            {(products ?? []).map((p: { id: string; name: string }) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        ) : (
          <input className={inputClass} type="number" min="1" placeholder={t('loyaltyRewardValue')}
            value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        )}
        <button
          disabled={save.isPending || form.name.trim().length < 2}
          onClick={() => save.mutate({
            name: form.name.trim(),
            points_cost: parseInt(form.points_cost) || 1,
            type: form.type,
            value: form.type === 'free_product' ? 0 : parseFloat(form.value) || 0,
            product_id: form.type === 'free_product' ? form.product_id || null : null,
            valid_days: 30,
          })}
          className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2 transition"
        >
          <Plus size={14} /> {t('actionAdd')}
        </button>
      </div>
    </Card>
  )
}

// ─── Kartu stempel ───────────────────────────────────────────────────────────

function StampsTab() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['loyalty-stamps'], queryFn: getStampCards, select: (r) => r.data.data ?? [] })
  const { data: products } = useQuery({
    queryKey: ['products', 'loyalty-picker'],
    queryFn: () => getProducts({ limit: 100 }),
    select: (r) => r.data?.data ?? [],
  })
  const [form, setForm] = useState({ name: '', product_id: '', buy_qty: '10', reward_free_qty: '1' })

  const save = useMutation({
    mutationFn: (payload: Partial<StampCard>) => saveStampCard(payload),
    onSuccess: () => {
      toast.success(t('loyaltySaved'))
      qc.invalidateQueries({ queryKey: ['loyalty-stamps'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const remove = useMutation({
    mutationFn: deleteStampCard,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-stamps'] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <Card>
      <p className="text-xs text-muted-foreground">{t('loyaltyStampsHelp')}</p>
      <div className="space-y-2">
        {(data ?? []).map((card) => (
          <RowShell
            key={card.id}
            title={card.name}
            subtitle={t('loyaltyStampRow', { buy: card.buy_qty, free: card.reward_free_qty })}
            onDelete={() => remove.mutate(card.id)}
          />
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground">{t('loyaltyStampsEmpty')}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-2 border-t border-border">
        <input className={inputClass} placeholder={t('loyaltyStampName')} value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <select className={inputClass} value={form.product_id}
          onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
          <option value="">{t('loyaltyStampAnyProduct')}</option>
          {(products ?? []).map((p: { id: string; name: string }) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input className={inputClass} type="number" min="1" placeholder={t('loyaltyStampBuyQty')}
          value={form.buy_qty} onChange={(e) => setForm({ ...form, buy_qty: e.target.value })} />
        <input className={inputClass} type="number" min="1" placeholder={t('loyaltyStampFreeQty')}
          value={form.reward_free_qty} onChange={(e) => setForm({ ...form, reward_free_qty: e.target.value })} />
        <button
          disabled={save.isPending || form.name.trim().length < 2}
          onClick={() => save.mutate({
            name: form.name.trim(),
            scope: form.product_id ? 'product' : 'global',
            ref_id: form.product_id || null,
            buy_qty: parseInt(form.buy_qty) || 10,
            reward_free_qty: parseInt(form.reward_free_qty) || 1,
            valid_days: 30,
          })}
          className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2 transition"
        >
          <Plus size={14} /> {t('actionAdd')}
        </button>
      </div>
    </Card>
  )
}

// ─── Bonus poin ──────────────────────────────────────────────────────────────

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

function BonusTab() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['loyalty-bonus'], queryFn: getBonusRules, select: (r) => r.data.data ?? [] })
  const [form, setForm] = useState({
    name: '', kind: 'day_of_week' as BonusRule['kind'], day_mask: 0,
    start_hour: '14', end_hour: '17', multiplier: '2', bonus_points: '0',
  })

  const save = useMutation({
    mutationFn: (payload: Partial<BonusRule>) => saveBonusRule(payload),
    onSuccess: () => {
      toast.success(t('loyaltySaved'))
      qc.invalidateQueries({ queryKey: ['loyalty-bonus'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const remove = useMutation({
    mutationFn: deleteBonusRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loyalty-bonus'] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const describe = (rule: BonusRule) => {
    const gain = rule.multiplier > 1
      ? t('loyaltyBonusMultiplier', { times: rule.multiplier })
      : t('loyaltyBonusExtra', { points: rule.bonus_points })
    switch (rule.kind) {
      case 'day_of_week': {
        const days = DAY_LABELS.filter((_, i) => rule.day_mask & (1 << i)).join(', ')
        return `${days} — ${gain}`
      }
      case 'hour_range': return `${rule.start_hour}:00–${rule.end_hour}:00 — ${gain}`
      case 'birthday': return `${t('loyaltyBonusBirthday')} — ${gain}`
      default: return `${t('loyaltyBonusFirstPurchase')} — ${gain}`
    }
  }

  const toggleDay = (index: number) =>
    setForm({ ...form, day_mask: form.day_mask ^ (1 << index) })

  return (
    <Card>
      <p className="text-xs text-muted-foreground">{t('loyaltyBonusHelp')}</p>
      <div className="space-y-2">
        {(data ?? []).map((rule) => (
          <RowShell key={rule.id} title={rule.name} subtitle={describe(rule)} onDelete={() => remove.mutate(rule.id)} />
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground">{t('loyaltyBonusEmpty')}</p>}
      </div>

      <div className="space-y-2 pt-2 border-t border-border">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input className={inputClass} placeholder={t('loyaltyBonusName')} value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className={inputClass} value={form.kind}
            onChange={(e) => setForm({ ...form, kind: e.target.value as BonusRule['kind'] })}>
            <option value="day_of_week">{t('loyaltyBonusKindDay')}</option>
            <option value="hour_range">{t('loyaltyBonusKindHour')}</option>
            <option value="birthday">{t('loyaltyBonusKindBirthday')}</option>
            <option value="first_purchase">{t('loyaltyBonusKindFirst')}</option>
          </select>
          <input className={inputClass} type="number" min="1" step="0.5" placeholder={t('loyaltyBonusMultiplierLabel')}
            value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: e.target.value })} />
          <input className={inputClass} type="number" min="0" placeholder={t('loyaltyBonusExtraLabel')}
            value={form.bonus_points} onChange={(e) => setForm({ ...form, bonus_points: e.target.value })} />
        </div>

        {form.kind === 'day_of_week' && (
          <div className="flex flex-wrap gap-1.5">
            {DAY_LABELS.map((label, index) => (
              <button
                key={label}
                onClick={() => toggleDay(index)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  form.day_mask & (1 << index)
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {form.kind === 'hour_range' && (
          <div className="grid grid-cols-2 gap-2">
            <input className={inputClass} type="number" min="0" max="23" value={form.start_hour}
              onChange={(e) => setForm({ ...form, start_hour: e.target.value })} />
            <input className={inputClass} type="number" min="0" max="24" value={form.end_hour}
              onChange={(e) => setForm({ ...form, end_hour: e.target.value })} />
          </div>
        )}

        <button
          disabled={save.isPending || form.name.trim().length < 2}
          onClick={() => save.mutate({
            name: form.name.trim(),
            kind: form.kind,
            day_mask: form.kind === 'day_of_week' ? form.day_mask : 0,
            start_hour: parseInt(form.start_hour) || 0,
            end_hour: parseInt(form.end_hour) || 24,
            multiplier: parseFloat(form.multiplier) || 1,
            bonus_points: parseInt(form.bonus_points) || 0,
          })}
          className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2 transition"
        >
          <Plus size={14} /> {t('actionAdd')}
        </button>
      </div>
    </Card>
  )
}

// ─── Voucher ─────────────────────────────────────────────────────────────────

function VouchersTab() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['loyalty-vouchers'],
    queryFn: () => getVouchers(),
    select: (r) => r.data.data ?? [],
  })
  const [form, setForm] = useState({ name: '', value: '10000' })

  const issue = useMutation({
    mutationFn: () => issueVoucher({
      name: form.name.trim(), type: 'amount',
      value: parseFloat(form.value) || 0, valid_days: 30,
    }),
    onSuccess: (res) => {
      toast.success(t('loyaltyVoucherIssued', { code: res.data.data?.code ?? '' }))
      setForm({ name: '', value: '10000' })
      qc.invalidateQueries({ queryKey: ['loyalty-vouchers'] })
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const statusLabel = (status: string) =>
    status === 'used' ? t('loyaltyVoucherUsed')
      : status === 'expired' ? t('loyaltyVoucherExpired')
        : t('loyaltyVoucherReady')

  return (
    <Card>
      <p className="text-xs text-muted-foreground">{t('loyaltyVouchersHelp')}</p>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {(data ?? []).map((voucher) => (
          <div key={voucher.id} className="flex items-center gap-3 border border-border rounded-xl px-4 py-2.5">
            <code className="text-sm font-mono font-semibold text-teal-700 dark:text-teal-400">{voucher.code}</code>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground truncate">{voucher.name}</p>
              <p className="text-xs text-muted-foreground">
                {voucher.type === 'free_product' ? t('loyaltyRewardFreeProduct')
                  : voucher.type === 'percent' ? t('loyaltyRewardPercent', { percent: voucher.value })
                    : formatCurrency(voucher.value)}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{statusLabel(voucher.status)}</span>
          </div>
        ))}
        {!data?.length && <p className="text-sm text-muted-foreground">{t('loyaltyVouchersEmpty')}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-border">
        <input className={inputClass} placeholder={t('loyaltyVoucherName')} value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={inputClass} type="number" min="1" placeholder={t('loyaltyVoucherValue')}
          value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        <button
          disabled={issue.isPending || form.name.trim().length < 2}
          onClick={() => issue.mutate()}
          className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg px-4 py-2 transition"
        >
          <Plus size={14} /> {t('loyaltyVoucherIssue')}
        </button>
      </div>
    </Card>
  )
}

export default function LoyaltyMechanics() {
  const [tab, setTab] = useState<TabKey>('tiers')

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border transition ${
              tab === key
                ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30 text-teal-700 dark:text-teal-300'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Icon size={14} /> {label()}
          </button>
        ))}
      </div>

      {tab === 'tiers' && <TiersTab />}
      {tab === 'rewards' && <RewardsTab />}
      {tab === 'stamps' && <StampsTab />}
      {tab === 'bonus' && <BonusTab />}
      {tab === 'vouchers' && <VouchersTab />}
    </div>
  )
}
