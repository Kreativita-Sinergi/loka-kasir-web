import { Link } from 'react-router-dom'
import { ChevronRight, Crown, Zap } from 'lucide-react'
import Header from '@/components/layout/Header'
import { NAV_ITEMS, type NavItem } from '@/components/layout/navItems'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'

/**
 * Hub Pengaturan — menggantikan 10 entri terpisah yang dulu memenuhi grup
 * "Pengaturan" di Sidebar. Kartunya diturunkan langsung dari NAV_ITEMS
 * (item ber-group 'Pengaturan' dengan `sidebar: false`), jadi menambah
 * halaman pengaturan baru cukup dilakukan di satu tempat.
 */
export default function SettingsHubPage() {
  const { can, canAny, isPro, isLite } = usePermissions()

  const items = NAV_ITEMS.filter((item) => {
    if (item.group !== 'Pengaturan' || item.sidebar !== false) return false
    if (item.anyOf && item.anyOf.length > 0) return canAny(...item.anyOf)
    if (item.permission) return can(item.permission)
    return true
  })

  const lockLabel = (item: NavItem): string | null => {
    if (item.planRequired === 'pro' && !isPro) return 'Pro'
    if (item.planRequired === 'lite' && !isLite) return 'Lite'
    return null
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Semua Pengaturan"
        subtitle="Pilih bagian yang ingin diatur: akun, langganan, usaha, atau akses karyawan"
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const lock = lockLabel(item)
            return (
              <Link
                key={item.path}
                to={item.path}
                className="group flex items-start gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary-subtle/40 transition"
              >
                <span className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition">
                  {item.icon}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {item.label}
                    </span>
                    {lock && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-0.5 shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold',
                          lock === 'Pro'
                            ? 'bg-warning-subtle text-warning'
                            : 'bg-primary-subtle text-primary'
                        )}
                      >
                        {lock === 'Pro' ? <Crown size={9} /> : <Zap size={9} />}
                        {lock}
                      </span>
                    )}
                  </span>
                  {item.description && (
                    <span className="block text-xs text-muted-foreground mt-1 leading-snug">
                      {item.description}
                    </span>
                  )}
                </span>
                <ChevronRight
                  size={15}
                  className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition"
                />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
