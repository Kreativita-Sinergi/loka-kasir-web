import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, GitBranch, Check } from 'lucide-react'
import { getOutletsByBusiness } from '@/api/outlets'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import type { Outlet } from '@/types'

export default function OutletSelector() {
  const { user } = useAuthStore()
  const { selected, setOutlet } = useOutletStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const businessId = user?.business?.id

  const { data } = useQuery({
    queryKey: ['outlets-selector', businessId],
    queryFn: () => getOutletsByBusiness(businessId!, { limit: 50, page: 1 }),
    enabled: !!businessId,
    staleTime: 60_000,
  })

  const outlets: Outlet[] = data?.data?.data ?? []

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const label = selected ? selected.name : 'Semua Outlet'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors text-left"
      >
        <GitBranch size={14} className="text-blue-500 shrink-0" />
        <span className="flex-1 text-xs font-medium text-blue-700 truncate">{label}</span>
        <ChevronDown size={13} className={`text-blue-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* All outlets option */}
          <button
            onClick={() => { setOutlet(null); setOpen(false) }}
            className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors border-b border-gray-50"
          >
            <span>Semua Outlet</span>
            {!selected && <Check size={13} className="text-blue-500" />}
          </button>

          {outlets.length === 0 ? (
            <div className="px-3 py-3 text-xs text-gray-400 text-center">Belum ada outlet</div>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {outlets.map((outlet) => (
                <button
                  key={outlet.id}
                  onClick={() => { setOutlet(outlet); setOpen(false) }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-gray-800 truncate">{outlet.name}</p>
                    {outlet.address && (
                      <p className="text-gray-400 truncate mt-0.5">{outlet.address}</p>
                    )}
                  </div>
                  {selected?.id === outlet.id && <Check size={13} className="text-blue-500 ml-2 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
