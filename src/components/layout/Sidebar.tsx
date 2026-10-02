import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Zap, Crown, X, CreditCard, SlidersHorizontal, ChevronRight } from 'lucide-react'
import { IconLogout } from '@/components/icons/LokaIcons'
import { useAuthStore } from '@/store/authStore'
import { usePermissions, PERMS } from '@/hooks/usePermissions'
import { useUIStore } from '@/store/uiStore'
import { getActiveMembership } from '@/api/membership'
import { cn, toTitleCase } from '@/lib/utils'
import OutletSelector from '@/components/ui/OutletSelector'
import ChangePasswordModal from '@/components/ui/ChangePasswordModal'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { NAV_GROUPS, navDescription, navGroupLabel, navLabel } from './navItems'
import { t } from '@/lib/i18n'
import { roleLabel } from '@/lib/roles'
import { groupSidebarItems, type SidebarNavItem } from './navigationHubs'
import { useNavigationItems } from './useNavigationItems'

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
        {t('statusTrial')}
      </span>
    )
  }
  if (tier === 'free') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-muted text-muted-foreground shrink-0">
        {t('loginStatFree')}
      </span>
    )
  }
  return null
}

interface SidebarProps {
  onClose?: () => void
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2.5 min-h-11 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary-subtle text-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  )

export default function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const { can, isPro } = usePermissions()
  const { pathname } = useLocation()
  const simpleMode = useUIStore((s) => s.simpleMode)
  const toggleSimpleMode = useUIStore((s) => s.toggleSimpleMode)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const passwordChangeRequired = user?.must_change_password === true
  const [searchQuery, setSearchQuery] = useState('')

  const canSeeMembership = can(PERMS.SETTINGS_VIEW)
  const { data: membershipData } = useQuery({
    queryKey: ['membership'],
    queryFn: () => getActiveMembership(),
    enabled: canSeeMembership,
    staleTime: 5 * 60 * 1000,
  })
  const membership = membershipData?.data?.data

  // Sinkronkan membership terbaru ke authStore agar usePermissions.isPro
  // tidak memakai data login basi — mis. setelah upgrade ke Pro tanpa re-login.
  const setMembership = useAuthStore((s) => s.setMembership)
  useEffect(() => {
    if (membership) setMembership(membership)
  }, [membership, setMembership])

  const tier = membership?.tier ?? 'free'
  const isTrial = tier === 'trial'
  const daysLeft = membership?.days_remaining ?? 0

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const q = searchQuery.trim().toLowerCase()

  const accessibleItems = useNavigationItems()
  const visibleItems = q
    ? accessibleItems.filter(item => {
      const text = [navLabel(item), navGroupLabel(item.group), navDescription(item), ...(item.keywords ?? [])].join(' ').toLowerCase()
      return text.includes(q)
    })
    : groupSidebarItems(accessibleItems, isPro, simpleMode)

  const hiddenCount = simpleMode
    ? groupSidebarItems(accessibleItems, isPro, false).filter(item => item.advanced).length
    : 0

  const sections: { group: string; label: string; items: SidebarNavItem[] }[] = NAV_GROUPS.map((group) => ({
    group,
    label: navGroupLabel(group),
    items: visibleItems.filter((item) => item.group === group),
  })).filter((section) => section.items.length > 0)

  return (
    <div className="operations-sidebar flex flex-col h-full min-h-0 bg-card border-r border-border w-full lg:w-64 shrink-0">
      {/* Logo + mobile close */}
      <div className="flex shrink-0 items-center justify-between px-5 py-2 lg:py-4">
        <img src="/logo.svg" alt="Loka Kasir" className="h-7 w-auto" />
        {onClose && (
          <button
            onClick={onClose}
            className="p-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition lg:hidden"
            aria-label={t('closeMenu')}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Outlet Selector */}
      <div className="shrink-0 px-3 py-2 lg:py-3 border-b border-border">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 px-1">
          {t('sidebarActiveOutlet')}
        </p>
        <OutletSelector />
      </div>

      {/* Search menu */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 px-3 bg-muted/50 rounded-lg border border-border focus-within:border-primary/50 focus-within:bg-card transition-colors">
          <Search size={13} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchMenuPlaceholder')}
            aria-label={t('searchMenuPlaceholder')}
            className="min-w-0 flex-1 text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label={t('actionReset')}
              className="text-muted-foreground hover:text-foreground transition text-xs leading-none"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav aria-label={t('openMenu')} className="flex-1 min-h-0 overscroll-contain overflow-y-auto px-3 py-3 space-y-4">
        {q ? (
          <div className="space-y-0.5">
            {visibleItems.length === 0 ? (
              <div className="text-center py-4 px-2">
                <p className="text-xs font-medium text-foreground">{t('menuNotFound')}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{t('menuNotFoundHint')}</p>
              </div>
            ) : (
              visibleItems.map((item) => {
                const locked = item.planRequired === 'pro' && !isPro
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/' || item.path === '/reports'}
                    className={linkClass}
                    onClick={() => { setSearchQuery(''); onClose?.() }}
                  >
                    {item.icon}
                    <span className="flex-1">{navLabel(item)}</span>
                    {locked && <Crown size={11} className="text-warning shrink-0" />}
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
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const locked = item.planRequired === 'pro' && !isPro
                  const active = item.activePaths
                    ? item.activePaths.some(path => pathname === path || pathname.startsWith(`${path}/`))
                    : pathname === item.path || (item.path !== '/' && pathname.startsWith(`${item.path}/`))
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      aria-current={active ? 'page' : undefined}
                      className={linkClass({ isActive: active })}
                      onClick={onClose}
                    >
                      {item.icon}
                      <span className="flex-1">{navLabel(item)}</span>
                      {locked && <Crown size={11} className="text-warning shrink-0" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))
        )}
      <div className="pt-3 border-t border-border space-y-3">
        {/* Toggle Mode Sederhana / Lengkap — satu baris ringkas.
            Seluruh baris adalah satu tombol dengan role="switch"; sakelarnya hanya
            visual (span) agar tidak ada button bersarang di dalam button.
            ON = Mode Lengkap (menu lanjutan ditampilkan). */}
        <div className="px-0">
          <button
            type="button"
            role="switch"
            aria-checked={!simpleMode}
            aria-label={simpleMode ? t('showAllMenus') : t('showMainMenusOnly')}
            onClick={toggleSimpleMode}
            title={
              simpleMode
                ? t('simpleModeOnTitle', { count: hiddenCount })
                : t('showAllMenusOn')
            }
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
          >
            <SlidersHorizontal size={15} className="shrink-0" />
            <span className="flex-1 min-w-0 text-xs font-semibold leading-tight truncate">
              {simpleMode ? t('menuMainOnly') : t('showAllMenusAction')}
            </span>
            {simpleMode && hiddenCount > 0 && (
              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-lg shrink-0">
                +{hiddenCount}
              </span>
            )}
            <span
              aria-hidden="true"
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${
                simpleMode ? 'bg-muted-foreground/30' : 'bg-primary'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-card shadow transform transition-transform ${
                  simpleMode ? 'translate-x-0' : 'translate-x-4'
                }`}
              />
            </span>
          </button>
        </div>

        {/* Trial upgrade banner */}
        {isTrial && (
          <div className="px-0">
            <button
              onClick={() => navigate('/membership')}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-warning-subtle border border-warning/30 rounded-xl text-left hover:opacity-90 transition"
            >
              <Zap size={15} className="text-warning shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-warning leading-tight">{t('trialActiveBadge')}</p>
                <p className="text-[11px] text-warning/80 mt-0.5">
                  {daysLeft > 0 ? t('trialDaysLeft', { days: daysLeft }) : t('planEndsToday')}
                </p>
              </div>
              <span className="text-[10px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-lg shrink-0">
                {t('actionUpgrade')}
              </span>
            </button>
          </div>
        )}

        {/* Akses cepat Langganan & Pembayaran untuk paket Gratis dan Pro. */}
        {canSeeMembership && !isTrial && (
          <div className="px-0">
            <button
              onClick={() => navigate('/membership')}
              className="w-full flex items-center gap-2.5 px-3 py-2 bg-primary-subtle border border-primary/20 rounded-xl text-left hover:bg-primary/10 transition group"
            >
              <CreditCard size={15} className="text-primary shrink-0" />
              <p
                className="flex-1 min-w-0 text-xs font-semibold text-primary leading-tight truncate"
                title={tier === 'pro' ? t('managePlanAndOutlets') : t('activatePlanOneClick')}
              >
                {t('navMembership')}
              </p>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-lg shrink-0">
                {t('sidebarPayBadge')}
              </span>
            </button>
          </div>
        )}

      </div>
      </nav>

      {/* User info + logout */}
      <div className="shrink-0 grid grid-cols-[minmax(0,1fr)_auto] lg:block items-center px-3 py-2 border-t border-border pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {/* Blok user sekaligus pintu masuk ke Profil & Akun — menggantikan
            entri "Profil & Akun" yang dulu memenuhi grup Pengaturan. */}
        <NavLink
          to="/profile"
          onClick={onClose}
          className="flex min-w-0 items-center gap-3 px-2 py-2 lg:mb-2 rounded-lg hover:bg-muted transition"
        >
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
                {roleLabel(user?.role) || t('roleOwner')}
              </p>
              {membership && canSeeMembership && <PlanBadge tier={tier} />}
            </div>
          </div>
          <ChevronRight size={14} className="text-muted-foreground shrink-0" />
        </NavLink>
        <Separator className="hidden lg:block mb-2" />

        <Button
          variant="ghost"
          onClick={handleLogout}
          aria-label={t('navLogout')}
          title={t('navLogout')}
          className="lg:w-full justify-start gap-3 text-destructive hover:bg-destructive-subtle hover:text-destructive"
        >
          <IconLogout size={16} />
          <span className="hidden lg:inline">{t('navLogout')}</span>
        </Button>
      </div>

      {(showChangePassword || passwordChangeRequired) && (
        <ChangePasswordModal
          required={passwordChangeRequired}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </div>
  )
}
