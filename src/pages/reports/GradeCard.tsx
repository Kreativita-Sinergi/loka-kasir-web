import { gradeMeaning, gradeTone } from '@/lib/reportCard'

const ringTone = {
  green: 'bg-success-subtle text-success',
  yellow: 'bg-warning-subtle text-warning',
  red: 'bg-destructive-subtle text-destructive',
} as const

/** Kartu nilai besar: huruf, angka, arti, dan beberapa baris ringkasan. */
export default function GradeCard({ score, grade, title, lines }: { score: number; grade: string; title?: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4">
      <div className={`size-16 shrink-0 rounded-full flex flex-col items-center justify-center leading-none ${ringTone[gradeTone(grade)]}`}>
        <span className="text-2xl font-extrabold">{grade}</span>
        <span className="text-xs font-bold tabular-nums">{score}</span>
      </div>
      <div className="min-w-0">
        <p className="text-base font-semibold text-foreground">{title ?? gradeMeaning(grade)}</p>
        {lines.map((l) => <p key={l} className="text-sm text-muted-foreground">{l}</p>)}
      </div>
    </div>
  )
}
