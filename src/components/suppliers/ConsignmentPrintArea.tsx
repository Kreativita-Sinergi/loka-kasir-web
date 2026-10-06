import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { ConsignmentReturn, ConsignmentSettlement } from '@/api/consignment'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { isPaymentKind, qtyText, settlementStatus } from './consignmentUtils'

export type ConsignmentPrintDoc =
  | { kind: 'settlement'; data: ConsignmentSettlement }
  | { kind: 'return'; data: ConsignmentReturn }

// dd/MM/yyyy dan dd/MM/yyyy HH:mm — sama dengan struk thermal di aplikasi.
const two = (n: number) => String(n).padStart(2, '0')
const dmy = (v: string | Date) => {
  const d = new Date(v)
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`
}
const dmyHm = (v: string | Date) => {
  const d = new Date(v)
  return `${dmy(d)} ${two(d.getHours())}:${two(d.getMinutes())}`
}

function Line({ label, value, bold, indent }: { label: ReactNode; value: ReactNode; bold?: boolean; indent?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-2 py-px ${bold ? 'font-bold' : ''}`}>
      <span className={`flex-1 ${indent ? 'pl-2' : ''}`}>{label}</span>
      <span className="text-right whitespace-nowrap">{value}</span>
    </div>
  )
}

const Divider = () => <div className="my-1.5 border-t border-dashed border-black" />

function Signatures({ left }: { left: string }) {
  return (
    <div className="mt-5 flex justify-around text-center">
      {[left, t('csPrintStore')].map((who) => (
        <div key={who}>
          <p>{who}</p>
          <p className="mt-9">(..............)</p>
        </div>
      ))}
    </div>
  )
}

function Header({ storeName, title }: { storeName?: string | null; title: string }) {
  return (
    <>
      {storeName?.trim() && <p className="text-center text-base font-bold">{storeName.trim().toUpperCase()}</p>}
      <p className="text-center font-bold">{title}</p>
      <Divider />
    </>
  )
}

/**
 * Bukti penyerahan uang / pembayaran ke penitip. Yang dicetak hanya hak
 * penitip — omzet dan laba toko sengaja TIDAK dicetak, itu urusan toko.
 */
function SettlementReceipt({ s, storeName }: { s: ConsignmentSettlement; storeName?: string | null }) {
  const payment = isPaymentKind(s)
  const paid = settlementStatus(s.status) === 'PAID'
  const items = s.items ?? []
  return (
    <>
      <Header storeName={storeName} title={payment ? t('csPrintPaymentTitle') : t('csPrintSettlementTitle')} />
      <Line label={t('csConsignor')} value={s.consignor_name} />
      {!payment && <Line label={t('csPeriodSale')} value={`${dmy(s.start_date)} – ${dmy(s.end_date)}`} />}
      <Line label={paid ? t('csPaidAt') : t('labelStatus')} value={paid ? dmyHm(s.paid_at ?? new Date()) : t('csPrintUnpaid')} />
      <Divider />
      {payment && (
        <>
          {s.balance_before != null && <Line label={t('csBalanceBefore')} value={formatCurrency(s.balance_before)} />}
          <Line label={t('csPrintHanded')} value={formatCurrency(s.total)} bold />
          {s.balance_after != null && <Line label={t('csBalanceAfter')} value={formatCurrency(s.balance_after)} />}
          {s.note?.trim() && <p className="mt-1">{t('csPrintNoteLine', { note: s.note.trim() })}</p>}
        </>
      )}
      {items.map((item, i) => (
        <div key={i}>
          <p>{item.type === 'REFUND' ? `${item.product_name} (${t('csRefundTag').toLowerCase()})` : item.product_name}</p>
          <Line label={`${qtyText(item.quantity)} x ${formatCurrency(item.deposit_price)}`} value={formatCurrency(item.amount)} indent />
        </div>
      ))}
      {!payment && (
        <>
          <Divider />
          <Line label={t('csPrintTotalPaid')} value={formatCurrency(s.total)} bold />
        </>
      )}
      <Signatures left={t('csPrintReceiver')} />
    </>
  )
}

/** Bukti retur barang titipan — tanpa harga: retur tidak menyangkut uang. */
function ReturnReceipt({ r, storeName }: { r: ConsignmentReturn; storeName?: string | null }) {
  return (
    <>
      <Header storeName={storeName} title={t('csPrintReturnTitle')} />
      <Line label={t('csPrintNo')} value={r.return_number} />
      <Line label={t('csConsignor')} value={r.consignor_name} />
      <Line label={t('labelOutlet')} value={r.outlet_name} />
      <Line label={t('labelDate')} value={dmyHm(r.created_at)} />
      <Divider />
      {r.items.map((i, idx) => (
        <Line key={idx} label={i.variant_name ? `${i.product_name} (${i.variant_name})` : i.product_name} value={String(i.quantity)} />
      ))}
      <Divider />
      <Line label={t('csPrintTotalItems')} value={String(r.total_quantity)} bold />
      {r.notes?.trim() && <p className="mt-1">{t('csPrintNoteLine', { note: r.notes.trim() })}</p>}
      <Signatures left={t('csConsignor')} />
    </>
  )
}

/**
 * Area cetak bukti konsinyasi. Dirender ke <body> lewat portal supaya CSS
 * @media print bisa menyembunyikan seluruh halaman dan hanya menampilkan
 * struknya. Begitu `doc` terisi, dialog cetak peramban dibuka; `onDone`
 * dipanggil setelah dialog ditutup (dicetak maupun dibatalkan).
 */
export default function ConsignmentPrintArea({ doc, onDone }: { doc: ConsignmentPrintDoc | null; onDone: () => void }) {
  const storeName = useAuthStore((s) => s.user?.business?.business_name)

  useEffect(() => {
    if (!doc) return
    const finish = () => onDone()
    window.addEventListener('afterprint', finish, { once: true })
    // Tunggu satu frame agar struk sudah ter-render sebelum dialog cetak dibuka.
    const frame = requestAnimationFrame(() => window.print())
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('afterprint', finish)
    }
  }, [doc, onDone])

  if (!doc) return null
  return createPortal(
    <div id="consignment-print-area" className="hidden print:block">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #consignment-print-area { display: block !important; }
          @page { margin: 8mm; }
        }
      `}</style>
      <div className="mx-auto w-[72mm] bg-white p-2 text-[11px] leading-snug text-black">
        {doc.kind === 'settlement'
          ? <SettlementReceipt s={doc.data} storeName={storeName} />
          : <ReturnReceipt r={doc.data} storeName={storeName} />}
      </div>
    </div>,
    document.body,
  )
}
