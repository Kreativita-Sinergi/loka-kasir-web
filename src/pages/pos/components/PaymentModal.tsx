import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, cn } from '@/lib/utils'
import type { PaymentMethod } from '@/types'
import { getOutletConfig } from '@/api/outlets'
import { useOutletStore } from '@/store/outletStore'
import { useCheckout, type CheckoutResult } from '@/pages/pos/useCheckout'
import { useQrisCheckout } from '@/pages/pos/useQrisCheckout'
import StaticQrisModal from '@/pages/pos/components/StaticQrisModal'
import DynamicQrisModal from '@/pages/pos/components/DynamicQrisModal'

export interface PaymentSuccessInfo {
  result: CheckoutResult
  methodName: string
  amountReceived: number
  change: number
}

interface Props {
  open: boolean
  total: number
  paymentMethods: PaymentMethod[]
  allowKasbon: boolean
  onClose: () => void
  onSuccess: (info: PaymentSuccessInfo) => void
}

type MethodKind = 'cash' | 'edc' | 'qris' | 'other'

function classifyMethod(m: PaymentMethod): MethodKind {
  const k = `${m.code} ${m.name}`.toLowerCase()
  if (/(tunai|cash)/.test(k)) return 'cash'
  if (/(edc|debit|kredit|credit|kartu|card)/.test(k)) return 'edc'
  if (/(qris|qr)/.test(k)) return 'qris'
  return 'other'
}

const QUICK_AMOUNTS = [50000, 100000, 150000, 200000]

export default function PaymentModal({
  open,
  total,
  paymentMethods,
  allowKasbon,
  onClose,
  onSuccess,
}: Props) {
  const checkout = useCheckout()
  const qrisCheckout = useQrisCheckout()
  const outlet = useOutletStore((s) => s.selected)
  const [methodId, setMethodId] = useState<number | null>(null)
  const [received, setReceived] = useState<string>('')
  const [edcRef, setEdcRef] = useState('')
  const [edcApproval, setEdcApproval] = useState('')
  const [edcAcquirer, setEdcAcquirer] = useState('')
  const [isKasbon, setIsKasbon] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showQris, setShowQris] = useState(false)
  const [dynQris, setDynQris] = useState<{ orderId: string; paymentUrl: string | null } | null>(null)

  const { data: outletCfg } = useQuery({
    queryKey: ['outlet-config-qris', outlet?.id],
    queryFn: async () => (await getOutletConfig(outlet!.id)).data.data,
    enabled: open && !!outlet,
  })
  const qrisDynamic = outletCfg?.qris_mode === 'dynamic' && outletCfg?.duitku_configured === true

  const method = useMemo(
    () => paymentMethods.find((m) => m.id === methodId) ?? null,
    [paymentMethods, methodId],
  )
  const kind = method ? classifyMethod(method) : 'other'
  const receivedNum = Number(received) || 0
  const change = Math.max(0, receivedNum - total)
  const isCash = kind === 'cash'
  const enoughCash = !isCash || isKasbon || receivedNum >= total

  const reset = () => {
    setMethodId(null)
    setReceived('')
    setEdcRef('')
    setEdcApproval('')
    setEdcAcquirer('')
    setIsKasbon(false)
  }

  const handlePay = async () => {
    if (!method) {
      toast.error('Pilih metode pembayaran')
      return
    }

    if (kind === 'qris') {
      if (qrisDynamic) {
        // QRIS dinamis (Duitku merchant): buat transaksi + tagihan, tampilkan QR,
        // auto-lunas via webhook + polling.
        setSubmitting(true)
        const res = await qrisCheckout()
        setSubmitting(false)
        if (!res.ok) {
          toast.error(res.error ?? 'Gagal membuat tagihan QRIS')
          return
        }
        setDynQris({ orderId: res.orderId!, paymentUrl: res.paymentUrl ?? null })
      } else {
        // QRIS statis: tampilkan QR merchant, settle saat kasir konfirmasi manual.
        setShowQris(true)
      }
      return
    }

    if (!enoughCash) {
      toast.error('Uang diterima kurang dari total')
      return
    }
    setSubmitting(true)
    const result = await checkout({
      paymentMethodId: method.id,
      amountReceived: isCash ? receivedNum : total,
      isKasbon,
      edc:
        kind === 'edc'
          ? {
              referenceNo: edcRef || null,
              approvalCode: edcApproval || null,
              cardType: method.name,
              acquirer: edcAcquirer || null,
            }
          : null,
    })
    setSubmitting(false)

    if (!result.ok) {
      toast.error(result.error ?? 'Gagal memproses pembayaran')
      return
    }
    onSuccess({
      result,
      methodName: method.name,
      amountReceived: isCash ? receivedNum : total,
      change: isCash ? change : 0,
    })
    reset()
  }

  // QRIS dikonfirmasi manual oleh kasir → settle seperti pembayaran biasa.
  const confirmQris = async () => {
    if (!method) return
    setSubmitting(true)
    const result = await checkout({ paymentMethodId: method.id, amountReceived: total })
    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.error ?? 'Gagal memproses pembayaran')
      return
    }
    setShowQris(false)
    onSuccess({ result, methodName: method.name, amountReceived: total, change: 0 })
    reset()
  }

  return (
    <Modal open={open} onClose={onClose} title="Pembayaran" size="md">
      <div className="space-y-5">
        <div className="rounded-2xl bg-primary-subtle p-4 text-center">
          <p className="text-xs text-muted-foreground">Total Tagihan</p>
          <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Metode Pembayaran</p>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethodId(m.id)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-sm font-medium transition',
                  methodId === m.id
                    ? 'border-primary bg-primary-subtle'
                    : 'border-border hover:bg-muted',
                )}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>

        {isCash && !isKasbon && (
          <div>
            <p className="text-sm font-medium mb-2">Uang Diterima</p>
            <Input
              type="number"
              inputMode="numeric"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              placeholder="0"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setReceived(String(total))}>
                Uang Pas
              </Button>
              {QUICK_AMOUNTS.map((a) => (
                <Button key={a} variant="outline" size="sm" onClick={() => setReceived(String(a))}>
                  {formatCurrency(a)}
                </Button>
              ))}
            </div>
            {receivedNum > 0 && (
              <p className="mt-2 text-sm">
                Kembalian: <span className="font-semibold">{formatCurrency(change)}</span>
              </p>
            )}
          </div>
        )}

        {kind === 'qris' && (
          <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground">
            QR akan ditampilkan untuk dipindai pelanggan. Pembayaran masuk otomatis &
            layar berubah jadi lunas tanpa input manual.
          </div>
        )}

        {kind === 'edc' && (
          <div className="space-y-3 rounded-xl border border-border p-3">
            <p className="text-sm font-medium">Data EDC</p>
            <Input value={edcRef} onChange={(e) => setEdcRef(e.target.value)} placeholder="No. Referensi / Trace" />
            <Input value={edcApproval} onChange={(e) => setEdcApproval(e.target.value)} placeholder="Kode Approval" />
            <Input value={edcAcquirer} onChange={(e) => setEdcAcquirer(e.target.value)} placeholder="Bank / Acquirer (mis. BCA)" />
            <p className="text-xs text-muted-foreground">
              Gesek kartu di mesin EDC, lalu masukkan nomor referensi/approval di sini.
              Integrasi ECR otomatis tersedia di aplikasi pada mesin EDC yang didukung.
            </p>
          </div>
        )}

        {allowKasbon && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isKasbon}
              onChange={(e) => setIsKasbon(e.target.checked)}
              className="accent-primary"
            />
            Bayar nanti (Kasbon)
          </label>
        )}

        <Button className="w-full" disabled={submitting || !method || !enoughCash} onClick={handlePay}>
          {submitting
            ? 'Memproses…'
            : kind === 'qris'
              ? 'Tampilkan QRIS'
              : isKasbon
                ? 'Simpan Kasbon'
                : `Bayar ${formatCurrency(total)}`}
        </Button>
      </div>

      <StaticQrisModal
        open={showQris}
        total={total}
        submitting={submitting}
        onConfirm={confirmQris}
        onClose={() => setShowQris(false)}
      />

      {dynQris && (
        <DynamicQrisModal
          open
          total={total}
          orderId={dynQris.orderId}
          paymentUrl={dynQris.paymentUrl}
          onPaid={() => {
            onSuccess({
              result: { ok: true, offline: false },
              methodName: method?.name ?? 'QRIS',
              amountReceived: total,
              change: 0,
            })
            setDynQris(null)
            reset()
          }}
          onClose={() => setDynQris(null)}
        />
      )}
    </Modal>
  )
}
