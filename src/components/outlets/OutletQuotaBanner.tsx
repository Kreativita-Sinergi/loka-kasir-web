import { useNavigate } from 'react-router-dom'
import { Crown } from 'lucide-react'

interface OutletQuotaBannerProps {
  membershipTier?: string
  totalOutlets: number
}

function isQuotaFull(tier: string | undefined, total: number): boolean {
  if (!tier) return false
  if (tier === 'lite' || tier === 'trial') return total >= 1
  return false
}

export default function OutletQuotaBanner({ membershipTier, totalOutlets }: OutletQuotaBannerProps) {
  const navigate = useNavigate()

  if (!isQuotaFull(membershipTier, totalOutlets)) return null

  return (
    <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <Crown size={18} className="text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800">Kuota Outlet Tercapai</p>
        <p className="text-xs text-amber-700 mt-0.5">
          {membershipTier === 'lite'
            ? 'Paket Lite hanya mendukung 1 outlet.'
            : 'Trial hanya mendukung 1 outlet.'}
          {' '}Upgrade ke Paket Pro untuk menambah outlet.
        </p>
      </div>
      <button
        onClick={() => navigate('/membership')}
        className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition"
      >
        Upgrade
      </button>
    </div>
  )
}
