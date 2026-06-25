import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Zap, Crown, X } from 'lucide-react'
import { IconLogout } from '@/components/icons/LokaIcons'
import { useAuthStore } from '@/store/authStore'
import { usePermissions, PERMS } from '@/hooks/usePermissions'
import { useOutletStore } from '@/store/outletStore'
import { getOutletConfig } from '@/api/outlets'
import { getActiveMembership } from '@/api/membership'
import { cn, toTitleCase } from '@/lib/utils'
import OutletSelector from '@/components/ui/OutletSelector'
import ChangePasswordModal from '@/components/ui/ChangePasswordModal'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { NAV_ITEMS, type NavItem } from './navItems'

function PlanBadge({ tier }: { tier: string }) {
  if (tier === 'pro') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary-subtle text-primary shrink-0">
        <Crown size={9} />
        Pro
      </span>
    )
  }
  if (tier === 'trial') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-warning-subtle text-warning shrink-0">
        <Zap size={9} />
        Trial
      </span>
    )
  }
  if (tier === 'free') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-muted text-muted-foreground shrink-0">
        Gratis
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-muted text-muted-foreground shrink-0">
      Lite
    </span>
  )
}

interface SidebarProps {
  onClose?: () => void
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
    isActive
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  )

export default function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const { can, canAny, isPro, isLite: isLitePlan } = usePermissions()
  const { selected: selectedOutlet } = useOutletStore()
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: configData } = useQuery({
    queryKey: ['outlet-config', selectedOutlet?.id],
    queryFn: () => getOutletConfig(selectedOutlet!.id),
    enabled: !!selectedOutlet?.id,
  })
  const outletConfig = configData?.data?.data

  const canSeeMembership = can(PERMS.SETTINGS_VIEW)
  const { data: membershipData } = useQuery({
    queryKey: ['membership'],
    queryFn: () => getActiveMembership(),
    enabled: canSeeMembership,
    staleTime: 5 * 60 * 1000,
  })
  const membership = membershipData?.data?.data

  // Sinkronkan membership terbaru ke authStore agar usePermissions (isPro/isLite)
  // tidak memakai data login basi — mis. setelah upgrade ke Pro tanpa re-login.
  const setMembership = useAuthStore((s) => s.setMembership)
  useEffect(() => {
    if (membership) setMembership(membership)
  }, [membership, setMembership])

  const tier = membership?.tier ?? 'free'
  const isTrial = tier === 'trial'
  const isLite = tier === 'lite' && membership?.is_active
  const daysLeft = membership?.days_remaining ?? 0

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const q = searchQuery.trim().toLowerCase()
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.path === '/master/tables' && outletConfig && !outletConfig.has_table) return false
    if (item.anyOf && item.anyOf.length > 0) { if (!canAny(...item.anyOf)) return false }
    else if (item.permission) { if (!can(item.permission)) return false }
    if (q) return item.label.toLowerCase().includes(q)
    return true
  })

  const sections: { group: string; items: NavItem[] }[] = []
  for (const item of visibleItems) {
    if (item.group) {
      sections.push({ group: item.group, items: [item] })
    } else {
      const last = sections[sections.length - 1]
      if (last) {
        last.items.push(item)
      } else {
        sections.push({ group: '', items: [item] })
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-card border-r border-border w-64 shrink-0">
      {/* Logo + mobile close */}
      <div className="flex items-center justify-between px-5 py-4">
        <img src="/logo.svg" alt="Loka Kasir" className="h-7 w-auto" />
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition md:hidden"
            aria-label="Tutup menu"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Outlet Selector */}
      <div className="px-3 py-3 border-b border-border">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 px-1">
          Outlet Aktif
        </p>
        <div data-tour="outlet-selector">
          <OutletSelector />
        </div>
      </div>

      {/* Search menu */}
      <div className="px-3 py-2 border-b border-border">
        <div data-tour="sidebar-search" className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl border border-border focus-within:border-primary/50 focus-within:bg-card transition-colors">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari menu..."
            className="flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-muted-foreground hover:text-foreground transition text-xs leading-none"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {q ? (
          <div className="space-y-0.5">
            {visibleItems.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Menu tidak ditemukan</p>
            ) : (
              visibleItems.map((item) => {
                const locked =
                  (item.planRequired === 'pro' && !isPro) ||
                  (item.planRequired === 'lite' && !isLitePlan)
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/' || item.path === '/reports'}
                    className={linkClass}
                    onClick={() => setSearchQuery('')}
                  >
                    {item.icon}
                    <span className="flex-1">{item.label}</span>
                    {locked && (
                      item.planRequired === 'pro'
                        ? <Crown size={11} className="text-warning shrink-0" />
                        : <Zap size={11} className="text-primary shrink-0" />
                    )}
                  </NavLink>
                )
              })
            )}
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.group || '__root__'}>
              {section.group && (
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 px-1">
                  {section.group}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const locked =
                    (item.planRequired === 'pro' && !isPro) ||
                    (item.planRequired === 'lite' && !isLitePlan)
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/' || item.path === '/reports'}
                      className={linkClass}
                    >
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      {locked && (
                        item.planRequired === 'pro'
                          ? <Crown size={11} className="text-warning shrink-0" />
                          : <Zap size={11} className="text-primary shrink-0" />
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* Trial upgrade banner */}
      {isTrial && (
        <div className="px-3 pb-3">
          <button
            onClick={() => navigate('/membership')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-warning-subtle border border-warning/30 rounded-xl text-left hover:opacity-90 transition"
          >
            <Zap size={15} className="text-warning shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-warning leading-tight">Free Trial Aktif</p>
              <p className="text-[11px] text-warning/80 mt-0.5">
                {daysLeft > 0 ? `Sisa ${daysLeft} hari` : 'Berakhir hari ini'}
              </p>
            </div>
            <span className="text-[10px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-lg shrink-0">
              Upgrade
            </span>
          </button>
        </div>
      )}

      {/* Lite upgrade banner */}
      {isLite && canSeeMembership && (
        <div className="px-3 pb-3">
          <button
            onClick={() => navigate('/membership')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-muted border border-border rounded-xl text-left hover:bg-primary-subtle hover:border-primary/30 transition group"
          >
            <Crown size={15} className="text-muted-foreground group-hover:text-primary shrink-0 transition" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-muted-foreground group-hover:text-primary leading-tight transition">
                Paket Lite
              </p>
              <p className="text-[11px] text-muted-foreground/70 group-hover:text-primary/70 mt-0.5 transition">
                Upgrade ke Pro
              </p>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground group-hover:text-primary group-hover:bg-primary-subtle bg-muted px-1.5 py-0.5 rounded-lg shrink-0 transition">
              Pro
            </span>
          </button>
        </div>
      )}

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="text-xs font-bold">
              {toTitleCase(user?.business?.owner_name)?.[0] ?? 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {toTitleCase(user?.business?.owner_name) || 'Admin'}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-muted-foreground truncate">
                {toTitleCase(user?.role?.name) || 'Owner'}
              </p>
              {membership && canSeeMembership && <PlanBadge tier={tier} />}
            </div>
          </div>
        </div>
        <Separator className="mb-2" />

        {/* Bantuan & masukan — kami terbuka untuk perbaikan */}
        <div className="mb-2 rounded-lg bg-muted/50 px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground">Butuh bantuan atau punya masukan?</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Ada kendala? Jangan sungkan menghubungi admin. Kami terbuka untuk saran & perbaikan.
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            <a
              href={`https://wa.me/6285393737313?text=${encodeURIComponent(
                'Halo Admin Loka Kasir, saya ingin bertanya/menyampaikan masukan terkait aplikasi.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-green-600 hover:underline"
            >
              💬 Chat admin via WhatsApp
            </a>
            <a
              href="https://ig.me/m/lokakasir.id"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-pink-600 hover:underline"
            >
              📷 Chat admin via Instagram
            </a>
            <a
              href="mailto:help@lokakasir.id"
              className="text-xs font-medium text-primary hover:underline"
            >
              ✉ help@lokakasir.id
            </a>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-destructive hover:bg-destructive-subtle hover:text-destructive"
        >
          <IconLogout size={16} />
          Keluar
        </Button>
      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  )
}
