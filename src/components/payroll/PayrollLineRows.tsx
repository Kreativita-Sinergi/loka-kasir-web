import type { PayrollLine } from '@/api/payroll'
import { lineAmountText, lineDetail, lineForfeitNote } from './payrollText'
import { PayrollRow } from './payrollUi'

/**
 * Baris-baris komponen gaji di modal terbitkan dan modal slip.
 *
 * Setiap baris menyebut hitungannya ("28 hari × Rp15.000") dan, bila ada,
 * alasan bagian yang hangus — "Uang Hadir Rp0" tanpa keterangan adalah slip
 * yang pasti ditanyakan orangnya.
 */
export default function PayrollLineRows({ lines }: { lines: PayrollLine[] | null | undefined }) {
  if (!lines?.length) return null
  return (
    <>
      {lines.map((line, index) => (
        <PayrollRow
          key={`${line.component_id ?? 'line'}-${index}`}
          label={line.name}
          detail={lineDetail(line)}
          note={lineForfeitNote(line)}
          value={lineAmountText(line)}
          negative={line.kind === 'DEDUCTION'}
        />
      ))}
    </>
  )
}
