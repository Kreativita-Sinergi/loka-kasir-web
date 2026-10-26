import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogOut, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import Modal from '@/components/ui/Modal'
import QueryErrorState from '@/components/ui/QueryErrorState'
import { acceptSalesTerms, getSalesProfile, salesToken } from '@/api/sales'
import { cn, getErrorMessage } from '@/lib/utils'
import { useThemeStore } from '@/store/themeStore'
import SalesTerms from './SalesTerms'

const tabs = [
  { to: '/mitra', label: 'Beranda', end: true },
  { to: '/mitra/pelanggan', label: 'Pelanggan' },
  { to: '/mitra/komisi', label: 'Komisi' },
  { to: '/mitra/pencairan', label: 'Pencairan' },
  { to: '/mitra/akun', label: 'Akun' },
]

export default function SalesLayout() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { theme, toggleTheme } = useThemeStore()
  const hasToken = Boolean(salesToken.get())
  const profile = useQuery({ queryKey: ['sales', 'me'], queryFn: async () => (await getSalesProfile()).data.data, enabled: hasToken })
  const terms = useMutation({
    mutationFn: acceptSalesTerms,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales', 'me'] }),
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  if (!hasToken) return <Navigate to="/mitra/login" replace />

  const logout = () => {
    salesToken.clear()
    qc.removeQueries({ queryKey: ['sales'] })
    navigate('/mitra/login', { replace: true })
  }
  const p = profile.data

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <img src="/logo.svg" alt="Loka Kasir" className="h-7 w-auto" />
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Mitra</span>
          <div className="ml-auto flex items-center gap-1">
            {p && <span className="mr-2 hidden text-sm text-muted-foreground sm:inline">{p.name}</span>}
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Tema terang' : 'Tema gelap'}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Keluar" title="Keluar"><LogOut size={18} /></Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4" aria-label="Menu portal mitra">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => cn(
              'whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
              isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}>{tab.label}</NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        {profile.isPending && <div className="h-40 animate-pulse rounded-2xl bg-muted" />}
        {profile.isError && <QueryErrorState error={profile.error} onRetry={() => profile.refetch()} />}
        {p && <>
          {p.status === 'pending' && <p className="rounded-xl border border-warning/20 bg-warning-subtle p-3 text-sm text-warning">Akun Anda sedang diverifikasi. Kode sales belum bisa dipakai pelanggan sampai akun diaktifkan tim Loka Kasir.</p>}
          {p.status === 'suspended' && <p className="rounded-xl border border-destructive/20 bg-destructive-subtle p-3 text-sm text-destructive">Akun Anda sedang dibekukan. Komisi tetap tercatat, tetapi kode tidak bisa dipakai pelanggan baru dan pencairan ditahan. Hubungi tim Loka Kasir.</p>}
          <Outlet context={p} />
        </>}
      </main>

      <Modal open={Boolean(p && p.terms_version !== p.current_terms_version)} onClose={logout} title="Syarat & ketentuan mitra sales">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Baca dan setujui ketentuan program sebelum memakai portal.</p>
          <div className="max-h-[50vh] overflow-y-auto pr-1"><SalesTerms /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={logout}>Keluar</Button>
            <Button onClick={() => terms.mutate()} disabled={terms.isPending}>{terms.isPending ? 'Menyimpan…' : 'Saya setuju'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
