import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import { DataTable } from '@/components/ui/Table'
import {
  getCourts, saveCourt, deleteCourt, formatMinuteOfDay, SPORTS,
  type Court,
} from '@/api/booking'
import { useOutletStore } from '@/store/outletStore'
import { getErrorMessage, formatCurrency } from '@/lib/utils'
import { t } from '@/lib/i18n'

/** Mengubah "HH:MM" dari <input type="time"> menjadi menit sejak tengah malam.
 *
 *  Tutup pukul 00.00 hampir selalu berarti tengah malam, bukan "tutup sepanjang
 *  hari" — diterjemahkan ke 1440 supaya jam operasionalnya masuk akal alih-alih
 *  menghasilkan lapangan tanpa satu pun slot. */
function toMinutes(value: string, isClose = false) {
  const [h, m] = value.split(':').map(Number)
  const minute = (h || 0) * 60 + (m || 0)
  return isClose && minute === 0 ? 1440 : minute
}

function toTimeValue(minute: number) {
  const h = Math.floor(minute / 60) % 24
  const m = minute % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const EMPTY: Omit<Court, 'id'> = {
  name: '',
  sport: 'PADEL',
  hourly_rate: 0,
  open_minute: 6 * 60,
  close_minute: 24 * 60,
  slot_minutes: 60,
  is_active: true,
  sort_order: 0,
}

function CourtModal({ open, onClose, outletId, editing }: {
  open: boolean
  onClose: () => void
  outletId: string
  editing: Court | null
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Omit<Court, 'id'>>(editing ?? EMPTY)

  const save = useMutation({
    mutationFn: () => saveCourt(outletId, form, editing?.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['courts'] })
      toast.success(t('saved'))
      onClose()
    },
    // Pesan server diteruskan apa adanya: "Jam operasional (06.00–23.00) harus
    // habis dibagi kelipatan 90 menit" memberi tahu pemilik apa yang salah.
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <Modal open={open} onClose={onClose} title={editing ? t('bkCourts') : t('bkAddCourt')}>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-1">{t('bkCourtName')}</p>
          <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>

        <div>
          <p className="text-sm font-medium mb-1">{t('bkSport')}</p>
          <div className="flex flex-wrap gap-2">
            {SPORTS.map(sport => (
              <button key={sport} type="button"
                onClick={() => setForm(f => ({ ...f, sport }))}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  form.sport === sport
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}>
                {t(`sport${sport}` as never)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">{t('bkHourlyRate')}</p>
          <input type="number" min={0}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={form.hourly_rate}
            onChange={e => setForm(f => ({ ...f, hourly_rate: Number(e.target.value) }))} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-sm font-medium mb-1">{t('bkOpenTime')}</p>
            <input type="time"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={toTimeValue(form.open_minute)}
              onChange={e => setForm(f => ({ ...f, open_minute: toMinutes(e.target.value) }))} />
          </div>
          <div>
            <p className="text-sm font-medium mb-1">{t('bkCloseTime')}</p>
            <input type="time"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={toTimeValue(form.close_minute)}
              onChange={e => setForm(f => ({ ...f, close_minute: toMinutes(e.target.value, true) }))} />
          </div>
          <div>
            <p className="text-sm font-medium mb-1">{t('bkSlotMinutes')}</p>
            <input type="number" min={15} step={15}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={form.slot_minutes}
              onChange={e => setForm(f => ({ ...f, slot_minutes: Number(e.target.value) }))} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_active}
            onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          {t('bkCourtActive')}
        </label>

        <button type="button" disabled={save.isPending || !form.name.trim()}
          onClick={() => save.mutate()}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {t('actionSave')}
        </button>
      </div>
    </Modal>
  )
}

export default function CourtsPage() {
  const outletId = useOutletStore(s => s.selected?.id) ?? ''
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Court | null>(null)
  const [creating, setCreating] = useState(false)

  const { data: courts = [], isLoading } = useQuery({
    queryKey: ['courts', outletId],
    queryFn: () => getCourts(outletId, true).then(r => r.data.data ?? []),
    enabled: !!outletId,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteCourt(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['courts'] })
      toast.success(t('saved'))
    },
    // "Lapangan masih punya 3 pemesanan mendatang" memberi tahu pemilik apa
    // yang harus ia lakukan dulu.
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <div className="space-y-5">
      <Header title={t('bkCourts')} subtitle={t('bkCourtsHint')} />

      <button type="button" onClick={() => setCreating(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        <Plus className="size-4" />{t('bkAddCourt')}
      </button>

      <DataTable<Court>
        loading={isLoading}
        data={courts}
        emptyMessage={t('bkNoCourts')}
        onRowClick={row => setEditing(row)}
        columns={[
          { key: 'name', label: t('bkCourtName'), render: r => r.name },
          { key: 'sport', label: t('bkSport'), render: r => t(`sport${r.sport}` as never) },
          {
            key: 'hours',
            label: `${t('bkOpenTime')}–${t('bkCloseTime')}`,
            render: r => `${formatMinuteOfDay(r.open_minute)}–${formatMinuteOfDay(r.close_minute)}`,
          },
          { key: 'slot', label: t('bkSlotMinutes'), render: r => `${r.slot_minutes}'` },
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
        <CourtModal open outletId={outletId} editing={editing}
          onClose={() => { setCreating(false); setEditing(null) }} />
      )}
    </div>
  )
}
