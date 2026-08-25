import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Gift, Plus, Clock, TrendingUp, TrendingDown, Wallet, Award } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import {
  getCustomerLoyalty, getLoyaltyHistory, addCustomerPoints, redeemCustomerPoints,
  getCustomerLoyaltyDetail, getRewards, redeemReward, adjustDeposit,
} from '@/api/loyalty'
import { formatCurrency, formatDateTime, getErrorMessage } from '@/lib/utils'
import type { LoyaltyTransaction } from '@/types'
import { formatNumber } from '@/lib/money'
import { t } from '@/lib/i18n'

interface Props {
  customerId: string
  customerName: string
  onClose: () => void
}

type ActionMode = 'add' | 'redeem' | null

export default function CustomerLoyaltyModal({ customerId, customerName, onClose }: Props) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [action, setAction] = useState<ActionMode>(null)
  const [points, setPoints] = useState('')
  const [notes, setNotes] = useState('')
  const [topup, setTopup] = useState('')

  const { data: loyalty, isLoading } = useQuery({
    queryKey: ['customer-loyalty', customerId],
    queryFn: () => getCustomerLoyalty(customerId),
    select: (res) => res.data.data,
  })

  const { data: historyData } = useQuery({
    queryKey: ['loyalty-history', customerId, page],
    queryFn: () => getLoyaltyHistory(customerId, { page, limit: 10 }),
  })

  const history: LoyaltyTransaction[] = historyData?.data?.data ?? []
  const pagination = historyData?.data?.pagination

  const addMut = useMutation({
    mutationFn: () => addCustomerPoints(customerId, { points: parseInt(points), notes: notes || null }),
    onSuccess: () => {
      toast.success(t('pointsAdded'))
      qc.invalidateQueries({ queryKey: ['customer-loyalty', customerId] })
      qc.invalidateQueries({ queryKey: ['loyalty-history', customerId] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      setAction(null); setPoints(''); setNotes('')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const redeemMut = useMutation({
    mutationFn: () => redeemCustomerPoints(customerId, { points: parseInt(points), notes: notes || null }),
    onSuccess: () => {
      toast.success(t('pointsRedeemed'))
      qc.invalidateQueries({ queryKey: ['customer-loyalty', customerId] })
      qc.invalidateQueries({ queryKey: ['loyalty-history', customerId] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      setAction(null); setPoints(''); setNotes('')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  // Ringkasan lengkap dipakai untuk tingkat, stempel, voucher, dan saldo —
  // hal-hal yang tidak ada di endpoint poin lama.
  const { data: detail } = useQuery({
    queryKey: ['customer-loyalty-detail', customerId],
    queryFn: () => getCustomerLoyaltyDetail(customerId),
    select: (res) => res.data.data,
  })

  const { data: rewards } = useQuery({
    queryKey: ['loyalty-rewards', 'active'],
    queryFn: getRewards,
    select: (res) => (res.data.data ?? []).filter((r) => r.is_active),
  })

  const refreshAll = () => {
    for (const key of [
      ['customer-loyalty', customerId],
      ['customer-loyalty-detail', customerId],
      ['loyalty-history', customerId],
      ['customers'],
    ]) {
      qc.invalidateQueries({ queryKey: key })
    }
  }

  const redeemRewardMut = useMutation({
    mutationFn: (rewardId: string) => redeemReward(customerId, rewardId),
    onSuccess: (res) => {
      const code = res.data.data?.code
      toast.success(code ? t('loyaltyVoucherIssued', { code }) : t('loyaltySaved'))
      refreshAll()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const depositMut = useMutation({
    mutationFn: (amount: number) => adjustDeposit(customerId, { type: 'topup', amount }),
    onSuccess: () => {
      toast.success(t('loyaltyDepositAdded'))
      setTopup('')
      refreshAll()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const config = loyalty?.config
  const balance = loyalty?.points_balance ?? 0
  const redeemValue = config ? parseInt(points || '0') * config.point_value_idr : 0
  const isPending = addMut.isPending || redeemMut.isPending

  const handleSubmit = () => {
    const p = parseInt(points)
    if (!p || p <= 0) return toast.error(t('pointsInvalidAmount'))
    if (action === 'add') addMut.mutate()
    else if (action === 'redeem') redeemMut.mutate()
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Loyalty — ${customerName}`}
    >
      <div className="space-y-5">
        {/* Balance card */}
        {isLoading ? (
          <div className="h-24 bg-muted rounded-xl animate-pulse" />
        ) : (
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-5 text-white">
            <p className="text-sm opacity-80">{t('pointsTotal')}</p>
            <p className="text-4xl font-bold mt-1">{formatNumber(balance)}</p>
            {config && (
              <p className="text-xs opacity-70 mt-2">
                {t('loyaltyBalanceHint', {
                  value: formatCurrency(balance * config.point_value_idr),
                  min: config.min_redeem_points,
                })}
              </p>
            )}
          </div>
        )}

        {/* Tingkat & saldo — keadaan pelanggan yang tidak terbaca dari poin saja */}
        {detail && (
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border rounded-xl p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Award size={13} /> {t('loyaltyTierLabel')}
              </p>
              <p className="text-sm font-semibold text-foreground mt-1">
                {detail.tier?.name ?? t('loyaltyNoTier')}
              </p>
              {detail.next_tier && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('loyaltyNextTierHint', {
                    points: Math.max(detail.next_tier.min_lifetime_points - detail.lifetime_points, 0),
                    tier: detail.next_tier.name,
                  })}
                </p>
              )}
            </div>
            <div className="border border-border rounded-xl p-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wallet size={13} /> {t('loyaltyDepositLabel')}
              </p>
              <p className="text-sm font-semibold text-foreground mt-1">
                {formatCurrency(detail.deposit_balance)}
              </p>
              <div className="flex gap-1.5 mt-2">
                <input
                  type="number"
                  min="1"
                  placeholder={t('loyaltyTopupAmount')}
                  value={topup}
                  onChange={(e) => setTopup(e.target.value)}
                  className="min-w-0 flex-1 border border-border bg-background rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  disabled={depositMut.isPending || !parseFloat(topup)}
                  onClick={() => depositMut.mutate(parseFloat(topup))}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 rounded-lg transition"
                >
                  {t('loyaltyTopup')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stempel yang sedang dikumpulkan */}
        {!!detail?.stamps?.length && (
          <div className="border border-border rounded-xl p-3 space-y-1.5">
            <p className="text-xs text-muted-foreground">{t('loyaltyStampProgress')}</p>
            {detail.stamps.map((stamp) => (
              <div key={stamp.id} className="flex items-center gap-2">
                <span className="text-sm text-foreground flex-1 truncate">{stamp.name}</span>
                <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                  {stamp.collected ?? 0}/{stamp.buy_qty}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Voucher siap pakai */}
        {!!detail?.vouchers?.length && (
          <div className="border border-border rounded-xl p-3 space-y-1.5">
            <p className="text-xs text-muted-foreground">{t('loyaltyActiveVouchers')}</p>
            {detail.vouchers.map((voucher) => (
              <div key={voucher.id} className="flex items-center gap-2">
                <code className="text-xs font-mono font-semibold text-teal-700 dark:text-teal-400">{voucher.code}</code>
                <span className="text-sm text-foreground flex-1 truncate">{voucher.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tebus hadiah dari katalog */}
        {!!rewards?.length && (
          <div className="border border-border rounded-xl p-3 space-y-2">
            <p className="text-xs text-muted-foreground">{t('loyaltyRedeemCatalog')}</p>
            {rewards.map((reward) => (
              <div key={reward.id} className="flex items-center gap-2">
                <span className="text-sm text-foreground flex-1 truncate">{reward.name}</span>
                <span className="text-xs text-muted-foreground">{formatNumber(reward.points_cost)}</span>
                <button
                  disabled={redeemRewardMut.isPending || balance < reward.points_cost}
                  onClick={() => redeemRewardMut.mutate(reward.id)}
                  className="px-2.5 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-500/10 disabled:opacity-40 transition"
                >
                  {t('loyaltyRedeem')}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {action === null && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAction('add')}
              className="flex items-center justify-center gap-2 border-2 border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl py-3 text-sm font-semibold transition"
            >
              <Plus size={16} />
              {t('pointsAddTab')}
            </button>
            <button
              onClick={() => setAction('redeem')}
              disabled={!config || balance < (config?.min_redeem_points ?? 0)}
              className="flex items-center justify-center gap-2 border-2 border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:bg-orange-500/15 rounded-xl py-3 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Gift size={16} />
              {t('pointsRedeemTab')}
            </button>
          </div>
        )}

        {/* Inline form */}
        {action !== null && (
          <div className="border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">
              {action === 'add' ? t('pointsAddManual') : t('pointsRedeem')}
            </p>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('pointsAmount')}</label>
              <input
                type="number"
                min="1"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder={t('pointsExampleFifty')}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
              {action === 'redeem' && parseInt(points) > 0 && config && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {t('loyaltyRedeemEquiv', { value: formatCurrency(redeemValue) })}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t('labelNoteOptional')}</label>
              <input
                type="text"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder={t('pointsNoteExample')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setAction(null); setPoints(''); setNotes('') }}
                className="flex-1 border border-border text-muted-foreground rounded-lg py-2 text-sm font-medium hover:bg-muted transition"
              >
                {t('actionCancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || !points}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg py-2 text-sm font-semibold transition disabled:opacity-60"
              >
                {isPending ? t('processing') : t('actionConfirm2')}
              </button>
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">{t('pointsHistory')}</p>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">{t('pointsNoHistory')}</p>
          ) : (
            <div className="space-y-2">
              {history.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    {tx.type === 'EARN'
                      ? <TrendingUp size={14} className="text-green-500 dark:text-green-400 shrink-0" />
                      : <TrendingDown size={14} className="text-orange-500 dark:text-orange-400 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {tx.type === 'EARN' ? '+' : '-'}{t('loyaltyPoints', { points: tx.points })}
                      </p>
                      {tx.notes && <p className="text-xs text-muted-foreground">{tx.notes}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-muted-foreground">{t('loyaltyPoints', { points: formatNumber(tx.balance_after) })}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(tx.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination && pagination.total > 10 && (
            <Pagination
              page={page}
              total={pagination.total}
              limit={10}
              onChange={setPage}
            />
          )}
        </div>
      </div>
    </Modal>
  )
}
