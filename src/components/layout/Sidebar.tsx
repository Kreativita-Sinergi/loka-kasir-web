import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Zap, Crown, X, SlidersHorizontal, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { IconLogout } from '@/components/icons/LokaIcons'
import { useAuthStore } from '@/store/authStore'
import { usePermissions, PERMS } from '@/hooks/usePermissions'
import { useUIStore } from '@/store/uiStore'
import { getActiveMembership } from '@/api/membership'
import { cn, toTitleCase } from '@/lib/utils'
import OutletSelector from '@/components/ui/OutletSelector'
import ChangePasswordModal from '@/components/ui/ChangePasswordModal'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { SIDEBAR_SECTIONS, navLabel, sidebarSectionLabel, sidebarSectionOf } from './navItems'
import { t } from '@/lib/i18n'
import { roleLabel } from '@/lib/roles'
import { groupSidebarItems, type SidebarNavItem } from './navigationHubs'
import { useNavigationItems } from './useNavigationItems'

/** Lencana paket di samping logo — sama dengan sidebar tablet aplikasi. */
function PlanBadge({ tier }: { tier: string }) {
  if (tier === 'pro') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-primary-subtle px-1.5 py-0.5 text-[10px] font-bold text-primary">
        <Crown size={10} aria-hidden="true" />
        Pro
      </span>
    )
  }
  if (tier === 'trial') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-warning-subtle px-1.5 py-0.5 text-[10px] font-bold text-warning">
        <Zap size={10} aria-hidden="true" />
        {t('statusTrial')}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
      {t('loginStatFree')}
    </span>
  )
}

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const { can, isPro } = usePermissions()
  const { pathname } = useLocation()
  const simpleMode = useUIStore((s) => s.simpleMode)
  const toggleSimpleMode = useUIStore((s) => s.toggleSimpleMode)
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleCollapsed = useUIStore((s) => s.toggleSidebarCollapsed)
  // Laci di ponsel selalu lebar; hanya sidebar desktop yang bisa menjadi rail.
  const rail = collapsed && !onClose
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const passwordChangeRequired = user?.must_change_password === true

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

  const accessibleItems = useNavigationItems()
  const visibleItems = groupSidebarItems(accessibleItems, isPro, simpleMode)
  const hiddenCount = simpleMode
    ? groupSidebarItems(accessibleItems, isPro, false).filter(item => item.advanced).length
    : 0

  const sections = SIDEBAR_SECTIONS.map((section) => ({
    section,
    label: sidebarSectionLabel(section),
    items: visibleItems.filter((item) => sidebarSectionOf(item.group) === section),
  })).filter((section) => section.items.length > 0)

  const isActive = (item: SidebarNavItem) => item.activePaths
    ? item.activePaths.some(path => pathname === path || pathname.startsWith(`${path}/`))
    : pathname === item.path || (item.path !== '/' && pathname.startsWith(`${item.path}/`))

  const ownerName = toTitleCase(user?.business?.owner_name) || 'Admin'

  return (
    <div className={cn(
      'operations-sidebar flex h-full min-h-0 shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 ease-out motion-reduce:transition-none',
      rail ? 'w-18' : 'w-full lg:w-60',
    )}>
      {/* Logo + lencana paket + tombol ciutkan. Setinggi header supaya garis
          bawah header dan sidebar segaris. */}
      <div className={cn('flex h-16 shrink-0 items-center gap-2', rail ? 'justify-center px-2' : 'pl-5 pr-2')}>
        {rail ? (
          <img src="/icon-current.svg" alt="Loka Kasir" className="h-8 w-8" />
        ) : (
          <>
            <img src="/logo.svg" alt="Loka Kasir" className="h-7 w-auto" />
            {membership && canSeeMembership && (
              <Link to="/membership" onClick={onClose} title={t('navMembership')} className="rounded-md transition hover:opacity-80">
                <PlanBadge tier={tier} />
              </Link>
            )}
            <span className="flex-1" />
          </>
        )}
        {onClose ? (
          <button type="button" onClick={onClose} aria-label={t('closeMenu')}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <X size={18} />
          </button>
        ) : !rail && (
          <button type="button" onClick={toggleCollapsed} aria-label={t('sidebarCollapse')} title={t('sidebarCollapse')}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      {rail && (
        <button type="button" onClick={toggleCollapsed} aria-label={t('sidebarExpand')} title={t('sidebarExpand')}
          className="mx-auto mb-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <PanelLeftOpen size={18} />
        </button>
      )}

      <div className={cn('shrink-0 border-b border-border pb-3', rail ? 'px-3.5' : 'px-3')}>
        <OutletSelector compact={rail} />
      </div>

      {/* Menu */}
      <nav aria-label={t('openMenu')} className={cn('flex-1 min-h-0 overflow-y-auto overscroll-contain py-2', rail ? 'px-3' : 'px-3')}>
        {sections.map(({ section, label, items }, index) => (
          <div key={section} className={cn(index > 0 && 'mt-3')}>
            {label && (rail
              ? <div className="mx-2 mb-2 border-t border-border" aria-hidden="true" />
              : <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">{label}</p>)}
            <div className="space-y-0.5">
              {items.map((item) => {
                const locked = item.planRequired === 'pro' && !isPro
                const active = isActive(item)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={active ? 'page' : undefined}
                    aria-label={rail ? navLabel(item) : undefined}
                    title={rail ? navLabel(item) : undefined}
                    onClick={onClose}
                    className={cn(
                      'relative flex h-10 items-center rounded-[10px] text-[13px] transition-colors [&>svg]:size-4.5 [&>svg]:shrink-0',
                      rail ? 'justify-center' : 'gap-2.5 px-3',
                      active
                        ? 'bg-primary/10 font-bold text-primary dark:bg-primary-subtle'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {/* Penanda 3px seperti _SidebarNavItem di aplikasi. */}
                    {active && !rail && <span aria-hidden="true" className="absolute left-1 h-5 w-0.75 rounded-full bg-primary" />}
                    {item.icon}
                    {!rail && <span className="min-w-0 flex-1 truncate">{navLabel(item)}</span>}
                    {locked && !rail && <Crown size={12} className="shrink-0 text-warning" aria-label="Pro" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('shrink-0 space-y-1 border-t border-border py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]', rail ? 'px-3' : 'px-3')}>
        {/* Trial hampir habis adalah satu-satunya hal di sini yang menuntut
            tindakan, jadi hanya ia yang tampil sebagai pita. */}
        {isTrial && !rail && (
          <button
            type="button"
            onClick={() => { navigate('/membership'); onClose?.() }}
            className="mb-1 flex w-full items-center gap-2.5 rounded-[10px] border border-warning/30 bg-warning-subtle px-3 py-2 text-left transition hover:opacity-90"
          >
            <Zap size={15} className="shrink-0 text-warning" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold leading-tight text-warning">{t('trialActiveBadge')}</span>
              <span className="mt-0.5 block text-[11px] text-warning/80">
                {daysLeft > 0 ? t('trialDaysLeft', { days: daysLeft }) : t('planEndsToday')}
              </span>
            </span>
            <span className="shrink-0 rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold text-warning">{t('actionUpgrade')}</span>
          </button>
        )}

        {/* Mode Sederhana / Lengkap. Seluruh baris satu tombol role="switch";
            sakelarnya hanya visual. ON = Mode Lengkap (menu lanjutan tampil).
            Tidak tampil di rail: jarang diubah, dan tinggi rail lebih berguna
            untuk ikon menu. */}
        {!rail && <button
          type="button"
          role="switch"
          aria-checked={!simpleMode}
          aria-label={simpleMode ? t('showAllMenus') : t('showMainMenusOnly')}
          onClick={toggleSimpleMode}
          title={simpleMode ? t('simpleModeOnTitle', { count: hiddenCount }) : t('showAllMenusOn')}
          className={cn('flex h-10 w-full items-center rounded-[10px] text-left text-muted-foreground transition hover:bg-muted hover:text-foreground',
            rail ? 'justify-center' : 'gap-2.5 px-3')}
        >
          <SlidersHorizontal size={16} className="shrink-0" />
          {!rail && <>
            <span className="min-w-0 flex-1 truncate text-xs font-semibold">
              {simpleMode ? t('menuMainOnly') : t('showAllMenusAction')}
            </span>
            <span aria-hidden="true" className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors', simpleMode ? 'bg-muted-foreground/30' : 'bg-primary')}>
              <span className={cn('pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', simpleMode ? 'translate-x-0' : 'translate-x-4')} />
            </span>
          </>}
        </button>}

        {/* Profil dan Keluar dalam satu baris — dulu dua baris penuh. */}
        <div className={cn('flex items-center gap-1', rail && 'flex-col')}>
          <NavLink
            to="/profile"
            onClick={onClose}
            aria-label={rail ? ownerName : undefined}
            title={rail ? ownerName : undefined}
            className={({ isActive: profileActive }) => cn('flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] transition hover:bg-muted',
              rail ? 'justify-center p-1.5' : 'px-2 py-1.5', profileActive && 'bg-muted')}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary-subtle text-xs font-bold text-primary">{ownerName[0]}</AvatarFallback>
            </Avatar>
            {!rail && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-foreground">{ownerName}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{roleLabel(user?.role) || t('roleOwner')}</span>
              </span>
            )}
          </NavLink>
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            aria-label={t('navLogout')}
            title={t('navLogout')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-destructive transition hover:bg-destructive-subtle"
          >
            <IconLogout size={17} />
          </button>
        </div>
      </div>

      {/* Tombol keluar bersebelahan dengan profil; satu salah tekan tidak
          boleh langsung memutus sesi — sama seperti dialog konfirmasi di app. */}
      <Modal open={confirmLogout} onClose={() => setConfirmLogout(false)} title={t('logoutConfirmTitle')} size="sm">
        <p className="text-sm text-muted-foreground">{t('logoutConfirmMessage')}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setConfirmLogout(false)}>{t('actionCancel')}</Button>
          <Button type="button" variant="destructive" onClick={handleLogout}>{t('navLogout')}</Button>
        </div>
      </Modal>

      {(showChangePassword || passwordChangeRequired) && (
        <ChangePasswordModal
          required={passwordChangeRequired}
          onClose={() => setShowChangePassword(false)}
        />
      )}
    </div>
  )
}
