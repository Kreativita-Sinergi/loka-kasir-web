import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn, getErrorMessage } from '@/lib/utils'
import { getTerminalsByBusiness } from '@/api/terminals'
import { openShift } from '@/api/pos'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import { usePosSessionStore } from '@/store/posSessionStore'
import type { Shift } from '@/types'

interface Props {
  onOpened: (shift: Shift) => void
}

/** Shown when the cashier has no active shift. Opens one to start selling. */
export default function ShiftGate({ onOpened }: Props) {
  const user = useAuthStore((s) => s.user)
  const outlet = useOutletStore((s) => s.selected)
  const setTerminal = usePosSessionStore((s) => s.setTerminal)
  const storedTerminal = usePosSessionStore((s) => s.terminalId)

  const [terminalId, setTerminalId] = useState<string | null>(storedTerminal)
  const [openingCash, setOpeningCash] = useState('')
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: terminals = [] } = useQuery({
    queryKey: ['pos-terminals', user?.business.id],
    queryFn: async () => {
      const res = await getTerminalsByBusiness(user!.business.id, { limit: 100 })
      return res.data.data ?? []
    },
    enabled: !!user,
  })

  const handleOpen = async () => {
    if (!terminalId) return toast.error('Pilih terminal')
    if (pin.length < 4) return toast.error('PIN minimal 4 digit')
    setSubmitting(true)
    try {
      const res = await openShift({
        terminal_id: terminalId,
        outlet_id: outlet?.id ?? null,
        opening_cash: Number(openingCash) || 0,
        pin,
      })
      setTerminal(terminalId)
      toast.success('Shift dibuka')
      onOpened(res.data.data)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
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
          <p className="text-sm text-muted-foreground">Buka shift untuk mulai bertransaksi</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Terminal</label>
            <div className="grid grid-cols-2 gap-2">
              {terminals.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTerminalId(t.id)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-sm transition',
                    terminalId === t.id ? 'border-primary bg-primary-subtle' : 'border-border hover:bg-muted',
                  )}
                >
                  {t.name}
                </button>
              ))}
              {terminals.length === 0 && (
                <p className="col-span-2 text-xs text-muted-foreground">
                  Belum ada terminal. Buat di menu Master → Terminal.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Kas Awal</label>
            <Input
              type="number"
              inputMode="numeric"
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">PIN Kasir</label>
            <Input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              maxLength={6}
            />
          </div>

          <Button className="w-full" disabled={submitting} onClick={handleOpen}>
            {submitting ? 'Membuka…' : 'Buka Shift'}
          </Button>
        </div>
      </div>
    </div>
  )
}
