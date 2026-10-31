import { ArrowDownLeft, ArrowUpRight, Clock, Package, ReceiptText, Star } from 'lucide-react'
import type { PublicBalance, PublicBalanceMovement } from '@/api/public'
import { formatCurrency } from '@/lib/utils'
import { formatGrams, formatQuantity } from '@/lib/money'
import { t } from '@/lib/i18n'
import { displayedText as titleCase } from '@/lib/textCase'
import { durationText } from './publicBookingTime'

/**
 * Jenis baris riwayat. Server menyimpan empat peristiwa dalam dua jenis:
 * "topup" = isi saldo, atau pengembalian dari nota yang batal; "use" =
 * pemakaian belanja, atau penarikan tunai (catatannya diawali "Penarikan").
 */
const labelOf = (m: PublicBalanceMovement) => {
  const notes = m.notes ?? ''
  if (m.type === 'topup') return notes.startsWith('Pengembalian') ? t('balReturn') : t('balTopUp')
  return notes.startsWith('Penarikan') ? t('balWithdraw') : t('balUse')
}

const dateOf = (iso: string) =>
  new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/**
 * Seluruh saldo seorang pelanggan: saldo titipan & poin, bon yang belum
 * lunas, sisa paket sesi, saldo waktu sewa, dan riwayat saldo. Dipakai oleh
 * tautan cek saldo per pelanggan maupun QR cek saldo toko.
 */
export default function BalanceView({ data, footnote }: { data: PublicBalance; footnote: string }) {
  const packages = data.packages ?? []
  const time = data.time_balances ?? []
  const kasbon = data.kasbon_outstanding ?? 0
  const bills = data.kasbon_bills ?? []

  return (
    <>
      <div>
        <p className="text-xs font-medium text-gray-500">{titleCase(data.business_name)}</p>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900">{titleCase(data.customer_name)}</h1>
          {data.is_member && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {t('balMember')}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-blue-600 text-white p-5">
        <p className="text-sm text-blue-100">{t('balTitle')}</p>
        <p className="text-3xl font-bold mt-1 tabular-nums">{formatCurrency(data.deposit_balance)}</p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs">
          <Star size={12} />
          {t('balPoints')}: {data.points_balance.toLocaleString('id-ID')}
        </div>
      </div>

      {/* Bon dirinci per nota beserta barangnya: angka total saja terbaca
          seperti toko menambah bon sendiri. */}
      {kasbon > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 shrink-0 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <ReceiptText size={16} />
            </div>
            <p className="flex-1 text-sm font-medium text-gray-900">{t('balKasbon')}</p>
            <p className="text-sm font-semibold text-red-600 tabular-nums">{formatCurrency(kasbon)}</p>
          </div>
          {bills.length > 0 && (
            <ul className="border-t border-gray-100 divide-y divide-gray-100">
              {bills.map((b) => (
                <li key={b.bill_number} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">#{b.bill_number}</p>
                      <p className="text-xs text-gray-500">{dateOf(b.created_at)}</p>
                    </div>
                    <p className="text-sm font-semibold text-red-600 tabular-nums shrink-0">
                      {t('balKasbonRemaining', { amount: formatCurrency(b.remaining) })}
                    </p>
                  </div>
                  {b.items.length > 0 && (
                    <div className="mt-2 space-y-0.5">
                      {b.items.map((it, i) => (
                        <div key={i} className="flex justify-between gap-3 text-xs">
                          <span className="text-gray-600 min-w-0 truncate">
                            {it.is_weight_based ? formatGrams(it.quantity) : `${formatQuantity(it.quantity)}×`} {titleCase(it.name)}
                          </span>
                          <span className="text-gray-900 tabular-nums shrink-0">{formatCurrency(it.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {b.paid > 0 && (
                    <p className="mt-1.5 text-xs text-gray-500 tabular-nums">
                      {t('balKasbonPaid', { total: formatCurrency(b.total), paid: formatCurrency(b.paid) })}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {bills.length >= 20 && (
            <p className="px-4 pb-3 text-xs text-gray-500">{t('balKasbonMore', { n: bills.length })}</p>
          )}
        </div>
      )}

      {(packages.length > 0 || time.length > 0) && (
        <div className="rounded-2xl bg-white border border-gray-200 divide-y divide-gray-100">
          {packages.map((p) => (
            <div key={`p-${p.name}`} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 shrink-0 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
                <Package size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">{t('balPackages')}</p>
                <p className="text-sm font-medium text-gray-900 truncate">{titleCase(p.name)}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900 tabular-nums">{t('balSessions', { count: p.quantity })}</p>
            </div>
          ))}
          {time.map((b) => (
            <div key={`t-${b.name}`} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 shrink-0 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Clock size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500">{t('balTime')}</p>
                <p className="text-sm font-medium text-gray-900 truncate">{titleCase(b.name)}</p>
              </div>
              <p className="text-sm font-semibold text-gray-900 tabular-nums">{durationText(b.quantity)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-white border border-gray-200">
        <p className="px-4 pt-4 pb-2 text-sm font-semibold text-gray-900">{t('balHistory')}</p>
        {data.movements.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-gray-500">{t('balEmpty')}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {data.movements.map((m, i) => {
              const incoming = m.type === 'topup'
              return (
                <li key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${incoming ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                    {incoming ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{labelOf(m)}</p>
                    <p className="text-xs text-gray-500 truncate">{dateOf(m.created_at)}{m.notes ? ` · ${m.notes}` : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${incoming ? 'text-green-600' : 'text-gray-900'}`}>
                      {incoming ? '+' : '−'}{formatCurrency(m.amount)}
                    </p>
                    <p className="text-xs text-gray-500 tabular-nums">{t('balAfter')} {formatCurrency(m.balance_after)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-gray-500 text-center px-4">{footnote}</p>
    </>
  )
}
