import { changePercent, type StatementLine } from '@/lib/accounting'
import { cn, formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { thClass } from './accountingUi'

/**
 * Tabel Laba Rugi / Neraca: judul bagian, perkiraan bertingkat (indent =
 * level), subtotal induk, total bagian, dan baris ringkasan (Laba Kotor,
 * Laba Bersih, Total Aset …). Dipakai di layar maupun di area cetak.
 */
export default function StatementTable({ lines, currentLabel, compareLabel, onAccountClick, print }: {
  lines: StatementLine[]
  /** Judul kolom nilai periode ini (mis. rentang tanggal). */
  currentLabel: string
  compareLabel?: string
  onAccountClick?: (accountId: string) => void
  /** Gaya hitam-putih untuk kertas. */
  print?: boolean
}) {
  const withCompare = !!compareLabel
  const money = (value: number | null) => value == null ? '' : formatCurrency(value)
  const negative = (value: number | null) => !print && value != null && value < 0 && 'text-red-600 dark:text-red-400'

  return (
    <div className={cn('min-w-0 max-w-full', !print && 'overflow-x-auto')}>
      <table className="w-full text-sm">
        <thead>
          <tr className={cn('border-b', print ? 'border-black' : 'border-border bg-muted/30')}>
            <th scope="col" className={thClass}>{t('accColAccount')}</th>
            <th scope="col" className={cn(thClass, 'text-right')}>{currentLabel}</th>
            {withCompare && <th scope="col" className={cn(thClass, 'text-right')}>{compareLabel}</th>}
            {withCompare && <th scope="col" className={cn(thClass, 'text-right')}>{t('accColChange')}</th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            if (line.kind === 'header') {
              return (
                <tr key={index} className={cn(index > 0 && 'border-t', print ? 'border-black' : 'border-border')}>
                  <td colSpan={withCompare ? 4 : 2} className="px-4 pt-4 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{line.label}</td>
                </tr>
              )
            }
            const clickable = !print && line.kind === 'row' && !line.isGroup && !line.computed && !!line.accountId && !!onAccountClick
            const strong = line.kind !== 'row' || line.isGroup
            const pct = withCompare && line.amount != null && line.compare != null ? changePercent(line.amount, line.compare) : null
            const diff = withCompare && line.amount != null && line.compare != null ? line.amount - line.compare : null
            return (
              <tr key={index}
                onClick={clickable ? () => onAccountClick!(line.accountId!) : undefined}
                className={cn(
                  line.kind === 'total' && 'border-t border-dashed',
                  (line.kind === 'summary' || line.kind === 'grand') && cn('border-t', !print && 'bg-muted/40'),
                  print ? 'border-black' : 'border-border',
                  clickable && 'cursor-pointer hover:bg-muted/40',
                )}>
                <td className={cn('px-4 py-2 text-foreground', strong && 'font-semibold', line.kind === 'grand' && 'font-bold')}
                  style={line.kind === 'row' ? { paddingLeft: `${1 + (line.level ?? 0) * 1.25}rem` } : undefined}>
                  {line.code && <span className="mr-2 font-mono text-xs text-muted-foreground">{line.code}</span>}
                  <span className={cn(line.computed && 'italic')}>{line.label}</span>
                </td>
                <td className={cn('px-4 py-2 text-right tabular-nums whitespace-nowrap', strong && 'font-semibold', line.kind === 'grand' && 'font-bold', negative(line.amount))}>{money(line.amount)}</td>
                {withCompare && <td className={cn('px-4 py-2 text-right tabular-nums whitespace-nowrap text-muted-foreground', strong && 'font-semibold')}>{money(line.compare)}</td>}
                {withCompare && (
                  <td className={cn('px-4 py-2 text-right tabular-nums whitespace-nowrap text-xs', negative(diff))}>
                    {diff == null ? '' : formatCurrency(diff)}
                    {pct != null && <span className="ml-1 text-muted-foreground">({pct > 0 ? '+' : ''}{pct.toFixed(1)}%)</span>}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
