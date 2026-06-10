import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency, getErrorMessage } from '@/lib/utils'
import { getTerminalsByBusiness } from '@/api/terminals'
import { getMyOutlets } from '@/api/outlets'
import { getEmployees } from '@/api/employees'
import { getShiftSchedules } from '@/api/shifts'
import { openShift, getActiveShiftForCashier } from '@/api/pos'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'

export interface ShiftSession {
  cashierId: string
  cashierName: string
  shiftId: string
  terminalId: string | null
}

interface Props {
  onOpened: (session: ShiftSession) => void
}

/**
 * Alur buka shift mengikuti app: pilih outlet → pilih kasir → pilih jadwal shift
 * → kas awal → isi PIN kasir. Shift dibuka UNTUK kasir terpilih (PIN-nya
 * diverifikasi backend). Bila kasir sudah punya shift aktif → lanjutkan.
 */
export default function ShiftGate({ onOpened }: Props) {
  const user = useAuthStore((s) => s.user)
  const outlet = useOutletStore((s) => s.selected)
  const setOutlet = useOutletStore((s) => s.setOutlet)

  const [outletId, setOutletId] = useState<string | null>(outlet?.id ?? null)
  const [cashierId, setCashierId] = useState<string>('')
  const [scheduleId, setScheduleId] = useState<string>('')
  const [openingCash, setOpeningCash] = useState('')
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: outlets = [] } = useQuery({
    queryKey: ['pos-outlets'],
    queryFn: async () => (await getMyOutlets()).data.data ?? [],
  })
  const { data: employees = [] } = useQuery({
    queryKey: ['pos-employees'],
    queryFn: async () => (await getEmployees({ limit: 200 })).data.data ?? [],
  })
  const { data: schedules = [] } = useQuery({
    queryKey: ['pos-shift-schedules'],
    queryFn: async () => (await getShiftSchedules({ limit: 100 })).data.data ?? [],
  })
  const { data: terminals = [] } = useQuery({
    queryKey: ['pos-terminals', user?.business.id],
    queryFn: async () => (await getTerminalsByBusiness(user!.business.id, { limit: 200 })).data.data ?? [],
    enabled: !!user,
  })

  // Cek shift aktif kasir terpilih LEBIH DULU — agar tidak mengandalkan jalur
  // error backend. Bila kasir sudah punya shift aktif (mis. dibuka di app),
  // tampilkan opsi "Lanjutkan Shift" alih-alih form buka.
  const { data: existingShift, isFetching: checkingShift } = useQuery({
    queryKey: ['pos-active-shift', cashierId],
    queryFn: async () => (await getActiveShiftForCashier(cashierId)).data.data ?? null,
    enabled: !!cashierId,
  })

  // Default outlet → first available bila belum dipilih.
  useEffect(() => {
    // Async data load; setState terjadi setelah fetch, bukan render sinkron.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!outletId && outlets.length > 0) setOutletId(outlets[0].id)
  }, [outletId, outlets])

  const terminalForOutlet = terminals.find((t) => t.is_active && (t.outlet_id === outletId || t.outlet_id == null))
  const activeEmployees = employees.filter((e) => e.is_active)

  /** Sinkronkan outlet aktif agar katalog/transaksi pakai outlet yang benar. */
  const syncOutlet = () => {
    const chosen = outlets.find((o) => o.id === outletId)
    if (chosen && chosen.id !== outlet?.id) setOutlet(chosen)
  }

  const cashierName = () => activeEmployees.find((e) => e.id === cashierId)?.name ?? 'Kasir'

  // Lanjutkan shift yang sudah aktif (tanpa PIN/kas awal) — sesi yang sama
  // dengan yang dibuka di app/terminal lain.
  const handleContinue = () => {
    if (!existingShift) return
    syncOutlet()
    toast.success('Melanjutkan shift aktif')
    onOpened({
      cashierId,
      cashierName: cashierName(),
      shiftId: existingShift.id,
      terminalId: existingShift.terminal?.id ?? terminalForOutlet?.id ?? null,
    })
  }

  const handleOpen = async () => {
    if (!outletId) return toast.error('Pilih outlet')
    if (!cashierId) return toast.error('Pilih kasir')
    if (pin.length < 4) return toast.error('PIN minimal 4 digit')
    if (!terminalForOutlet) return toast.error('Outlet ini belum punya terminal. Buat dulu di Master → Terminal.')

    setSubmitting(true)
    try {
      syncOutlet()
      await openShift({
        terminal_id: terminalForOutlet.id,
        outlet_id: outletId,
        shift_schedule_id: scheduleId || null,
        opening_cash: Number(openingCash) || 0,
        pin,
        cashier_id: cashierId, // buka shift untuk kasir terpilih (PIN-nya diverifikasi)
      })
      const shift = (await getActiveShiftForCashier(cashierId)).data.data
      toast.success('Shift dibuka')
      onOpened({
        cashierId,
        cashierName: cashierName(),
        shiftId: shift?.id ?? '',
        terminalId: terminalForOutlet.id,
      })
    } catch (e) {
      const err = e as { response?: { status?: number } }
      if (err?.response?.status === 401) {
        toast.error('PIN salah')
      } else {
        toast.error(getErrorMessage(e))
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-subtle">
            <Clock className="text-primary" size={24} />
          </div>
          <h2 className="text-lg font-bold">Buka Shift</h2>
          <p className="text-sm text-muted-foreground">Pilih outlet & kasir untuk mulai bertransaksi</p>
        </div>

        <div className="space-y-4">
          <Field label="Outlet">
            <Select value={outletId ?? ''} onChange={setOutletId} placeholder="Pilih outlet"
              options={outlets.map((o) => ({ value: o.id, label: o.name }))} />
          </Field>

          <Field label="Kasir">
            <Select value={cashierId} onChange={setCashierId} placeholder="Pilih kasir"
              options={activeEmployees.map((e) => ({ value: e.id, label: e.name }))} />
          </Field>

          {cashierId && checkingShift ? (
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Memeriksa shift aktif…
            </div>
          ) : existingShift ? (
            // ── Kasir sudah punya shift aktif → lanjutkan, bukan buka baru ──
            <>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
                <div className="font-semibold text-amber-700 dark:text-amber-400">Shift aktif ditemukan</div>
                <p className="mt-1 text-amber-700/90 dark:text-amber-400/90">
                  Kasir ini sudah punya shift terbuka{existingShift.terminal?.name ? ` di ${existingShift.terminal.name}` : ''}.
                  Lanjutkan sesi yang sama — tidak membuka shift baru.
                </p>
                <div className="mt-2 flex justify-between text-amber-700/90 dark:text-amber-400/90">
                  <span>Kas Awal</span>
                  <span className="font-medium">{formatCurrency(existingShift.opening_cash)}</span>
                </div>
              </div>
              <Button className="w-full" onClick={handleContinue}>
                Lanjutkan Shift
              </Button>
            </>
          ) : (
            // ── Belum ada shift → form buka shift ──────────────────────────
            <>
              <Field label="Jadwal Shift">
                <Select value={scheduleId} onChange={setScheduleId} placeholder={schedules.length ? 'Pilih jadwal' : 'Tidak ada jadwal'}
                  options={schedules.map((s) => ({ value: s.id, label: s.name }))} />
              </Field>

              <Field label="Kas Awal">
                <Input type="number" inputMode="numeric" value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)} placeholder="0" />
              </Field>

              <Field label="PIN Kasir">
                <Input type="password" inputMode="numeric" value={pin}
                  onChange={(e) => setPin(e.target.value)} placeholder="••••" maxLength={6} />
              </Field>

              <Button className="w-full" disabled={submitting} onClick={handleOpen}>
                {submitting ? 'Membuka…' : 'Buka Shift'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}

function Select({ value, onChange, options, placeholder }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
        !value && 'text-muted-foreground',
      )}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="text-foreground">{o.label}</option>
      ))}
    </select>
  )
}
