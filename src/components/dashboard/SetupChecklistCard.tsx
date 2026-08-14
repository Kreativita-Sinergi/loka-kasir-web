import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Rocket, CheckCircle2, Circle, ChevronRight } from 'lucide-react'
import { getMyOutlets } from '@/api/outlets'
import { getProducts } from '@/api/products'
import { getEmployees } from '@/api/employees'
import { getTerminalsByBusiness } from '@/api/terminals'
import { useAuthStore } from '@/store/authStore'

/// Kartu "Langkah Persiapan" — bentuknya sengaja dibuat sama dengan kartu di
/// aplikasi tablet: satu daftar vertikal berprogres, bukan grid pintasan.
/// Pemilik yang membuka dashboard di web dan di tablet melihat hal yang sama.

const DISMISS_KEY = 'loka.dashboard.setup-dismissed'

interface StepDef {
  id: string
  title: string
  description: string
  path: string
}

const STEPS: StepDef[] = [
  { id: 'outlet', title: 'Buat outlet pertama', description: 'Tambahkan lokasi toko atau cabang', path: '/outlets' },
  { id: 'product', title: 'Tambah produk', description: 'Produk yang akan dijual di kasir', path: '/products' },
  { id: 'employee', title: 'Daftarkan karyawan', description: 'Tambahkan kasir, manajer, dan staf', path: '/employees' },
  { id: 'terminal', title: 'Daftarkan perangkat', description: 'Hubungkan ponsel atau tablet kasir', path: '/master/terminals' },
]

export default function SetupChecklistCard() {
  const navigate = useNavigate()
  const businessId = useAuthStore((s) => s.user?.business?.id ?? '')
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  // Setiap langkah hanya butuh tahu "ada isinya atau tidak", jadi cukup ambil
  // satu baris dan baca totalnya dari pagination.
  const outlets = useQuery({
    queryKey: ['setup-checklist', 'outlets'],
    queryFn: () => getMyOutlets().then((r) => r.data.data?.length ?? 0),
    staleTime: 60_000,
  })
  const products = useQuery({
    queryKey: ['setup-checklist', 'products'],
    queryFn: () => getProducts({ page: 1, limit: 1 }).then((r) => r.data.pagination?.total ?? 0),
    staleTime: 60_000,
  })
  const employees = useQuery({
    queryKey: ['setup-checklist', 'employees'],
    queryFn: () => getEmployees({ page: 1, limit: 1 }).then((r) => r.data.pagination?.total ?? 0),
    staleTime: 60_000,
  })
  const terminals = useQuery({
    queryKey: ['setup-checklist', 'terminals', businessId],
    queryFn: () => getTerminalsByBusiness(businessId, { page: 1, limit: 1 }).then((r) => r.data.pagination?.total ?? 0),
    staleTime: 60_000,
  })

  const queries = [outlets, products, employees, terminals]
  // Selama masih ada yang dimuat, kartu belum tahu langkah mana yang beres.
  // Menampilkannya lebih dulu berarti semua langkah sempat terlihat "belum" —
  // kedipan yang tidak perlu.
  if (dismissed || queries.some((q) => q.isLoading)) return null

  const counts: Record<string, number> = {
    outlet: outlets.data ?? 0,
    product: products.data ?? 0,
    employee: employees.data ?? 0,
    terminal: terminals.data ?? 0,
  }
  const steps = STEPS.map((s) => ({ ...s, done: counts[s.id] > 0 }))
  const total = steps.length
  const done = steps.filter((s) => s.done).length

  // Sudah tuntas: kartu menghilang sendiri, tidak perlu ditutup manual.
  if (done === total) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="bg-card border border-blue-500/25 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <Rocket size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
        <p className="flex-1 text-sm font-bold text-foreground">Langkah Persiapan</p>
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
          {done}/{total}
        </span>
      </div>

      <div className="mt-2.5 h-1.5 rounded bg-blue-500/12 overflow-hidden">
        <div
          className="h-full rounded bg-blue-600 dark:bg-blue-400 transition-all"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>

      <div className="mt-1.5">
        {steps.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={step.done ? undefined : () => navigate(step.path)}
            disabled={step.done}
            className="w-full flex items-start gap-2.5 py-2 px-1 rounded-lg text-left transition enabled:hover:bg-blue-50 dark:enabled:hover:bg-blue-500/10 disabled:cursor-default"
          >
            {step.done ? (
              <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            ) : (
              <Circle size={18} className="text-muted-foreground shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={
                  step.done
                    ? 'text-sm text-muted-foreground line-through'
                    : 'text-sm font-semibold text-foreground'
                }
              >
                {step.title}
              </p>
              {!step.done && (
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              )}
            </div>
            {!step.done && (
              <ChevronRight size={18} className="text-muted-foreground shrink-0 mt-0.5" />
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={dismiss}
          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 transition"
        >
          Nanti saja
        </button>
      </div>
    </div>
  )
}
