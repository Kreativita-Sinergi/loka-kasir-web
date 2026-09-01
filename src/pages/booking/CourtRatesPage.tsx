import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import { DataTable } from '@/components/ui/Table'
import {
  getRates, saveRate, deleteRate, getCourts, formatMinuteOfDay,
  type CourtRate,
} from '@/api/booking'
import { useOutletStore } from '@/store/outletStore'
import { getErrorMessage, formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'

/** Nama hari ringkas, ISO: indeks 1 = Senin. */
const DAY_NAMES = ['', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function toMinutes(value: string, isEnd = false) {
  const [h, m] = value.split(':').map(Number)
  const minute = (h || 0) * 60 + (m || 0)
  return isEnd && minute === 0 ? 1440 : minute
}

function toTimeValue(minute: number) {
  const h = Math.floor(minute / 60) % 24
  return `${String(h).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}

function daysLabel(daysOfWeek: string) {
  const parts = daysOfWeek.split(',').map(s => Number(s.trim())).filter(n => n >= 1 && n <= 7)
  return parts.length ? parts.map(n => DAY_NAMES[n]).join(', ') : t('bkRateAllDays')
}

const EMPTY: Omit<CourtRate, 'id'> = {
  court_id: null,
  name: '',
  days_of_week: '',
  start_minute: 18 * 60,
  end_minute: 22 * 60,
  hourly_rate: 0,
  is_active: true,
}

function RateModal({ open, onClose, editing }: {
  open: boolean
  onClose: () => void
  editing: CourtRate | null
}) {
  const qc = useQueryClient()
  const outletId = useOutletStore(s => s.selected?.id) ?? ''
  const [form, setForm] = useState<Omit<CourtRate, 'id'>>(editing ?? EMPTY)

  const { data: courts = [] } = useQuery({
    queryKey: ['courts', outletId],
    queryFn: () => getCourts(outletId, true).then(r => r.data.data ?? []),
    enabled: !!outletId,
  })

  const days = new Set(
    form.days_of_week.split(',').map(s => Number(s.trim())).filter(n => n >= 1 && n <= 7),
  )

  const save = useMutation({
    mutationFn: () => saveRate(form, editing?.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['court-rates'] })
      toast.success(t('saved'))
      onClose()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('bkRates') : t('bkAddRate')}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">{t('bkRateName')}</p>
          <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={form.name} placeholder="Prime Time"
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>

        <div>
          <p className="text-sm font-medium mb-1">{t('bkHourlyRate')}</p>
          <input type="number" min={0}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={form.hourly_rate}
            onChange={e => setForm(f => ({ ...f, hourly_rate: Number(e.target.value) }))} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-sm font-medium mb-1">{t('bkRateFrom')}</p>
            <input type="time"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={toTimeValue(form.start_minute)}
              onChange={e => setForm(f => ({ ...f, start_minute: toMinutes(e.target.value) }))} />
          </div>
          <div>
            <p className="text-sm font-medium mb-1">{t('bkRateTo')}</p>
            <input type="time"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={toTimeValue(form.end_minute)}
              onChange={e => setForm(f => ({ ...f, end_minute: toMinutes(e.target.value, true) }))} />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">{t('bkRateDays')}</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map(day => (
              <button key={day} type="button"
                onClick={() => {
                  const next = new Set(days)
                  if (!next.delete(day)) next.add(day)
                  setForm(f => ({ ...f, days_of_week: [...next].sort().join(',') }))
                }}
                className={`w-11 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                  days.has(day)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}>
                {DAY_NAMES[day]}
              </button>
            ))}
          </div>
          {/* Tanpa satu pun hari dipilih, aturannya berlaku setiap hari.
              Disebutkan supaya pemilik tidak mengira aturannya mati. */}
          {days.size === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">{t('bkRateAllDays')}</p>
          )}
        </div>

        <div>
          <p className="text-sm font-medium mb-1">{t('bkCourts')}</p>
          <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={form.court_id ?? ''}
            onChange={e => setForm(f => ({ ...f, court_id: e.target.value || null }))}>
            <option value="">{t('bkRateAllCourts')}</option>
            {courts.map(court => (
              <option key={court.id} value={court.id}>{court.name}</option>
            ))}
          </select>
        </div>

        <button type="button" disabled={save.isPending || !form.name.trim()}
          onClick={() => save.mutate()}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {t('actionSave')}
        </button>
      </div>
    </Modal>
  )
}

export default function CourtRatesPage() {
  const qc = useQueryClient()
  const outletId = useOutletStore(s => s.selected?.id) ?? ''
  const [editing, setEditing] = useState<CourtRate | null>(null)
  const [creating, setCreating] = useState(false)

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['court-rates'],
    queryFn: () => getRates().then(r => r.data.data ?? []),
  })
  const { data: courts = [] } = useQuery({
    queryKey: ['courts', outletId],
    queryFn: () => getCourts(outletId, true).then(r => r.data.data ?? []),
    enabled: !!outletId,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteRate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['court-rates'] })
      toast.success(t('saved'))
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <div className="space-y-5">
      <Header title={t('bkRates')} subtitle={t('bkRatesHint')} />

      <button type="button" onClick={() => setCreating(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        <Plus className="size-4" />{t('bkAddRate')}
      </button>

      <DataTable<CourtRate>
        loading={isLoading}
        data={rates}
        emptyMessage={t('bkNoRates')}
        onRowClick={row => setEditing(row)}
        columns={[
          { key: 'name', label: t('bkRateName'), render: r => r.name },
          {
            key: 'window',
            label: `${t('bkRateFrom')}–${t('bkRateTo')}`,
            render: r => `${formatMinuteOfDay(r.start_minute)}–${formatMinuteOfDay(r.end_minute)}`,
          },
          { key: 'days', label: t('bkRateDays'), render: r => daysLabel(r.days_of_week) },
          {
            key: 'court',
            label: t('bkCourts'),
            render: r => r.court_id
              ? (courts.find(c => c.id === r.court_id)?.name ?? t('bkRateAllCourts'))
              : t('bkRateAllCourts'),
          },
          { key: 'rate', label: t('bkHourlyRate'), render: r => formatCurrency(r.hourly_rate) },
          {
            key: 'actions',
            label: '',
            render: r => (
              <button type="button"
                onClick={e => { e.stopPropagation(); remove.mutate(r.id) }}
                className="rounded p-1 text-red-600 hover:bg-red-50">
                <Trash2 className="size-4" />
              </button>
            ),
          },
        ]}
      />

      {(creating || editing) && (
        <RateModal open editing={editing}
          onClose={() => { setCreating(false); setEditing(null) }} />
      )}
    </div>
  )
}
