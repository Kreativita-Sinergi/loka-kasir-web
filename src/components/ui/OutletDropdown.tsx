/**
 * OutletDropdown — compact header-bar outlet switcher.
 *
 * Differences from the sidebar OutletSelector:
 *  • Renders as a <select>-style pill, not a custom popover.
 *  • Always shows "Semua Outlet" (value = "all") as the first option.
 *  • Sets outletStore.selected = null when "Semua Outlet" is picked so the
 *    axios interceptor omits the X-Outlet-Id header → backend returns
 *    aggregated/global data. This is the Moka/Majoo "Global View" pattern.
 *
 * React Query re-fetches across the app automatically because every query
 * that depends on the outlet uses outletStore.selected?.id in its queryKey.
 */
import { useQuery } from '@tanstack/react-query'
import { GitBranch } from 'lucide-react'
import { getOutletsByBusiness } from '@/api/outlets'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import type { Outlet } from '@/types'

const ALL_OUTLETS_VALUE = '__all__'

export default function OutletDropdown() {
  const { user } = useAuthStore()
  const { selected, setOutlet } = useOutletStore()
  const businessId = user?.business?.id

  const { data } = useQuery({
    queryKey: ['outlets-dropdown', businessId],
    queryFn: () => getOutletsByBusiness(businessId!, { limit: 100, page: 1 }),
    enabled: !!businessId,
    staleTime: 60_000,
  })

  const outlets: Outlet[] = data?.data?.data ?? []

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    if (val === ALL_OUTLETS_VALUE) {
      setOutlet(null)
    } else {
      const found = outlets.find((o) => o.id === val) ?? null
      setOutlet(found)
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-xl border border-blue-100">
      <GitBranch size={13} className="text-blue-500 shrink-0" />
      <select
        value={selected?.id ?? ALL_OUTLETS_VALUE}
        onChange={handleChange}
        className="bg-transparent text-xs font-medium text-blue-700 outline-none cursor-pointer max-w-[160px] truncate"
      >
        <option value={ALL_OUTLETS_VALUE}>Semua Outlet</option>
        {outlets.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  )
}
