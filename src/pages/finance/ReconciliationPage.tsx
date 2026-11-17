import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileUp, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import QueryErrorState from '@/components/ui/QueryErrorState'
import { Button } from '@/components/ui/button'
import { getCashAccounts, type CashAccount } from '@/api/cashAccounts'
import {
  cancelBankMatch,
  createBankMatch,
  getReconciliation,
  importBankRows,
  type BankMatch,
  type BankRow,
  type PosPayment,
} from '@/api/reconciliation'
import {
  bankAmount,
  previewBankRows,
  readBankCsv,
  type BankColumnMap,
  type DateStyle,
  type NumberStyle,
} from '@/lib/bankCsv'
import { defaultLedgerRange } from '@/lib/cashBook'
import { getErrorMessage } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useCanWrite } from '@/hooks/useSubscription'

const field = 'block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm'
const pageSize = 100
const datesOf = (dates: string[]) =>
  dates.reduce(
    ({ min, max }, date) => ({
      min: !min || date < min ? date : min,
      max: !max || date > max ? date : max,
    }),
    { min: '', max: '' },
  )

function ImportStatement({
  account,
  digits,
  onClose,
  onImported,
}: {
  account: CashAccount
  digits: number
  onClose: () => void
  onImported: (from: string, to: string) => void
}) {
  const [file, setFile] = useState<{ name: string; text: string } | null>(null)
  const [error, setError] = useState('')
  const [separator, setSeparator] = useState(',')
  const [numberStyle, setNumberStyle] = useState<NumberStyle>('dot')
  const [dateStyle, setDateStyle] = useState<DateStyle>('iso')
  const [mapping, setMapping] = useState<BankColumnMap | null>(null)
  const parsed = useMemo(() => {
    if (!file) return null
    try {
      return { rows: readBankCsv(file.text, separator), error: '' }
    } catch (e) {
      return { rows: [], error: e instanceof Error ? e.message : 'CSV tidak dapat dibaca.' }
    }
  }, [file, separator])
  const guess = (names: string[]) =>
    parsed?.rows[0]?.findIndex((h) => names.includes(h.trim().toLowerCase())) ?? -1
  const map = mapping ?? {
    date: guess(['date', 'tanggal']),
    amount: guess(['amount', 'nominal', 'kredit', 'credit']),
    reference: guess(['reference', 'referensi']),
    description: guess(['description', 'keterangan']),
  }
  const preview = parsed?.rows.length ? previewBankRows(parsed.rows, map, dateStyle, numberStyle, digits) : null
  const mutation = useMutation({
    mutationFn: () => importBankRows(account.id, file!.name.slice(0, 160), preview!.items),
    onSuccess: (result) => {
      if (!result) return
      const dates = datesOf(preview!.items.map((row) => row.date))
      toast.success(`${result.inserted} dana masuk diimpor, ${result.duplicates} baris sudah ada.`)
      onImported(dates.min, dates.max)
    },
    onError: (e) => setError(getErrorMessage(e)),
  })

  return (
    <Modal
      open
      onClose={() => {
        if (!mutation.isPending) onClose()
      }}
      title="Impor dana masuk"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {account.name}. Pilih CSV yang berisi dana masuk saja. Gunakan ekspor periode lengkap beserta referensi
          bank agar baris yang sama bisa dikenali saat impor ulang.
        </p>
        <a
          className="text-sm font-semibold text-primary hover:underline"
          download="contoh-mutasi-bank.csv"
          href="data:text/csv;charset=utf-8,date%2Camount%2Creference%2Cdescription%0A2026-11-01%2C99500%2CREF-001%2CPencairan%20QRIS%0A"
        >
          Unduh contoh CSV
        </a>
        <input
          aria-label="File CSV bank"
          className={field}
          type="file"
          accept=".csv,text/csv"
          disabled={mutation.isPending}
          onChange={async (e) => {
            const picked = e.target.files?.[0]
            setFile(null)
            setError('')
            setMapping(null)
            if (!picked) return
            if (picked.size > 4 * 1024 * 1024) {
              setError('Ukuran CSV maksimal 4 MB.')
              return
            }
            try {
              setFile({ name: picked.name, text: await picked.text() })
            } catch {
              setError('File gagal dibaca. Coba simpan CSV sebagai UTF-8.')
            }
          }}
        />
        {file && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-sm">
              Pemisah
              <select
                className={field}
                value={separator}
                onChange={(e) => {
                  setSeparator(e.target.value)
                  setMapping(null)
                }}
              >
                <option value=",">Koma (,)</option>
                <option value=";">Titik koma (;)</option>
                <option value={'\t'}>Tab</option>
              </select>
            </label>
            <label className="text-sm">
              Tanggal
              <select
                className={field}
                value={dateStyle}
                onChange={(e) => setDateStyle(e.target.value as DateStyle)}
              >
                <option value="iso">YYYY-MM-DD</option>
                <option value="dmy">DD/MM/YYYY</option>
              </select>
            </label>
            <label className="text-sm">
              Angka
              <select
                className={field}
                value={numberStyle}
                onChange={(e) => setNumberStyle(e.target.value as NumberStyle)}
              >
                <option value="dot">1,250.50</option>
                <option value="comma">1.250,50</option>
              </select>
            </label>
          </div>
        )}
        {parsed?.rows[0] && (
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['date', 'Tanggal dana masuk'],
                ['amount', 'Diterima bersih'],
                ['reference', 'Referensi bank'],
                ['description', 'Keterangan'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm">
                {label}
                <select
                  className={field}
                  value={map[key]}
                  onChange={(e) => setMapping({ ...map, [key]: Number(e.target.value) })}
                >
                  <option value={-1}>Pilih kolom</option>
                  {parsed.rows[0].map((name, i) => (
                    <option key={i} value={i}>
                      {name || `Kolom ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
        {(error || parsed?.error) && (
          <p role="alert" className="text-sm text-destructive">
            {error || parsed?.error}
          </p>
        )}
        {preview && (
          <div className="space-y-2 text-sm">
            <p>
              {preview.items.length} baris siap diperiksa · {preview.errors.length} masalah
            </p>
            {preview.errors.slice(0, 5).map((message) => (
              <p key={message} className="text-destructive">
                {message}
              </p>
            ))}
            <ol className="space-y-1 rounded-lg bg-muted p-3">
              {preview.items.slice(0, 5).map((row, i) => (
                <li key={i}>
                  {row.date} · {row.amount} · {row.reference || row.description || '—'}
                </li>
              ))}
            </ol>
          </div>
        )}
        <Button
          disabled={!preview?.items.length || !!preview.errors.length || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Mengimpor…' : 'Konfirmasi impor'}
        </Button>
      </div>
    </Modal>
  )
}

export default function ReconciliationPage() {
  const qc = useQueryClient()
  const canWrite = useCanWrite()
  const businessId = useAuthStore((s) => s.user?.business?.id)
  const initial = defaultLedgerRange()
  const [range, setRange] = useState({ from: initial.start, to: initial.end })
  const [dateInput, setDateInput] = useState(range)
  const [accountId, setAccountId] = useState('')
  const [rowPage, setRowPage] = useState(1)
  const [paymentPage, setPaymentPage] = useState(1)
  const [matchPage, setMatchPage] = useState(1)
  const [includeMatched, setIncludeMatched] = useState(false)
  const [row, setRow] = useState<BankRow | null>(null)
  const [payments, setPayments] = useState<Record<string, PosPayment>>({})
  const [fee, setFee] = useState('0')
  const [note, setNote] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<BankMatch | null>(null)
  const [reason, setReason] = useState('')

  const accountsQuery = useQuery({
    queryKey: ['cash-accounts', businessId, 'reconciliation'],
    queryFn: () => getCashAccounts({ include_inactive: true }),
  })
  const accounts = accountsQuery.data?.data.data?.filter((a) => a.kind === 'bank') ?? []
  const account = accounts.find((a) => a.id === accountId) ?? accounts.find((a) => a.is_active) ?? accounts[0]
  const filter = {
    account_id: account?.id ?? '',
    ...range,
    row_page: rowPage,
    payment_page: paymentPage,
    match_page: matchPage,
    include_matched: includeMatched,
  }
  const query = useQuery({
    queryKey: ['reconciliation', businessId, filter],
    queryFn: () => getReconciliation(filter),
    enabled: !!account,
  })
  const workspace = query.data
  const digits = workspace?.decimal_digits ?? 0
  const money = (minor: number, currency = workspace?.currency_code || 'IDR', precision = digits) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(minor / 10 ** precision)
  const selected = Object.values(payments)
  const gross = selected.reduce((sum, payment) => sum + payment.amount_minor, 0)
  const parsedFee = bankAmount(fee, 'dot', digits)
  const difference = row && parsedFee ? row.amount_minor - (gross - parsedFee.minor) : null
  const resetSelection = () => {
    setRow(null)
    setPayments({})
    setFee('0')
    setNote('')
  }
  const resetPages = () => {
    setRowPage(1)
    setPaymentPage(1)
    setMatchPage(1)
    resetSelection()
  }
  const refresh = () => qc.invalidateQueries({ queryKey: ['reconciliation', businessId] })
  const match = useMutation({
    mutationFn: () =>
      createBankMatch({
        row_id: row!.id,
        payment_ids: selected.map((p) => p.id),
        fee: parsedFee!.major,
        note: note.trim(),
      }),
    onSuccess: () => {
      resetPages()
      void refresh()
      toast.success('Pencocokan disimpan.')
    },
    onError: (e) => {
      toast.error(getErrorMessage(e))
      void refresh()
    },
  })
  const cancel = useMutation({
    mutationFn: () => cancelBankMatch(cancelTarget!.id, reason.trim()),
    onSuccess: () => {
      setCancelTarget(null)
      resetPages()
      void refresh()
      toast.success('Pencocokan dibatalkan. Riwayat tersimpan.')
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <Header title="Rekonsiliasi non-tunai" subtitle="Cocokkan dana masuk bank dengan pembayaran kasir." />
      <main className="page-content flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
        <QueryErrorState
          error={accountsQuery.error || query.error}
          onRetry={() => {
            void accountsQuery.refetch()
            if (account) void query.refetch()
          }}
        />
        {accountsQuery.isPending && <p role="status">Memuat rekening…</p>}
        {!accountsQuery.isPending && !accountsQuery.isError && !accounts.length && (
          <p>
            Tambahkan rekening bank di{' '}
            <Link className="text-primary underline" to="/finance/accounts">
              Kas & Rekening
            </Link>{' '}
            untuk mulai.
          </p>
        )}
        {account && (
          <>
            <form
              className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
              onSubmit={(e) => {
                e.preventDefault()
                if (Date.parse(dateInput.to) - Date.parse(dateInput.from) > 366 * 86400000) {
                  toast.error('Pilih periode maksimal satu tahun.')
                  return
                }
                setRange(dateInput)
                resetPages()
              }}
            >
              <label className="text-sm">
                Rekening
                <select
                  className={field}
                  value={account.id}
                  onChange={(e) => {
                    setAccountId(e.target.value)
                    resetPages()
                  }}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.is_active ? '' : ' (nonaktif)'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Dari
                <input
                  className={field}
                  type="date"
                  required
                  value={dateInput.from}
                  onChange={(e) => setDateInput({ ...dateInput, from: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Sampai
                <input
                  className={field}
                  type="date"
                  required
                  min={dateInput.from}
                  value={dateInput.to}
                  onChange={(e) => setDateInput({ ...dateInput, to: e.target.value })}
                />
              </label>
              <Button type="submit" variant="outline">
                Terapkan
              </Button>
              <Button
                type="button"
                className="sm:ml-auto"
                disabled={!canWrite || !account.is_active || !workspace}
                onClick={() => setImportOpen(true)}
              >
                <FileUp size={16} /> Impor CSV
              </Button>
            </form>
            <p className="text-sm text-muted-foreground">
              Periode {range.from} s.d. {range.to} · pilih satu baris dana masuk dan satu atau beberapa pembayaran.
              Pencocokan tersimpan terpisah dari buku kas.
            </p>
            {query.isPending && <p role="status">Memuat dana masuk dan pembayaran…</p>}
            {workspace && (
              <>
                <div className="grid items-start gap-4 xl:grid-cols-2">
                  <section className="space-y-3 rounded-xl border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-semibold">Dana masuk · {workspace.rows_total}</h2>
                      <label className="text-sm">
                        <input
                          type="checkbox"
                          checked={includeMatched}
                          onChange={(e) => {
                            setIncludeMatched(e.target.checked)
                            setRowPage(1)
                          }}
                        />{' '}
                        Termasuk sudah cocok
                      </label>
                    </div>
                    {!workspace.rows.length && (
                      <p className="text-sm text-muted-foreground">Belum ada dana masuk pada halaman ini.</p>
                    )}
                    <ul className="max-h-[28rem] divide-y overflow-y-auto">
                      {workspace.rows.map((item) => (
                        <li key={item.id}>
                          <label className="flex items-center gap-3 py-2.5 text-sm">
                            <input
                              type="radio"
                              name="bank-row"
                              disabled={
                                item.matched || item.currency_code !== workspace.currency_code || match.isPending
                              }
                              checked={row?.id === item.id}
                              onChange={() => setRow(item)}
                            />
                            <span className="min-w-0 flex-1">
                              <strong>{money(item.amount_minor, item.currency_code, item.decimal_digits)}</strong>{' '}
                              · {item.date}
                              <span className="block truncate text-muted-foreground">
                                {item.reference || item.description || item.import_name}
                              </span>
                            </span>
                            {item.matched && <span className="text-success">Cocok</span>}
                            {item.currency_code !== workspace.currency_code && (
                              <span className="text-xs text-warning">Mata uang berbeda</span>
                            )}
                          </label>
                        </li>
                      ))}
                    </ul>
                    <Pagination
                      page={rowPage}
                      limit={pageSize}
                      total={workspace.rows_total}
                      onChange={setRowPage}
                    />
                  </section>
                  <section className="space-y-3 rounded-xl border bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-semibold">Pembayaran kasir tersedia · {workspace.payments_total}</h2>
                      {!!workspace.payments.length && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={match.isPending}
                          onClick={() =>
                            setPayments((previous) => {
                              const next = { ...previous }
                              const allSelected = workspace.payments.every((payment) => next[payment.id])
                              for (const payment of workspace.payments) {
                                if (allSelected) delete next[payment.id]
                                else next[payment.id] = payment
                              }
                              return next
                            })
                          }
                        >
                          {workspace.payments.every((payment) => payments[payment.id])
                            ? 'Lepas pilihan halaman ini'
                            : 'Pilih semua di halaman ini'}
                        </Button>
                      )}
                    </div>
                    {!workspace.payments.length && (
                      <p className="text-sm text-muted-foreground">
                        Belum ada pembayaran yang bisa dipilih pada halaman ini.
                      </p>
                    )}
                    <ul className="max-h-[28rem] divide-y overflow-y-auto">
                      {workspace.payments.map((payment) => (
                        <li key={payment.id}>
                          <label className="flex items-center gap-3 py-2.5 text-sm">
                            <input
                              type="checkbox"
                              disabled={match.isPending}
                              checked={!!payments[payment.id]}
                              onChange={(e) => {
                                const next = { ...payments }
                                if (e.target.checked) next[payment.id] = payment
                                else delete next[payment.id]
                                setPayments(next)
                              }}
                            />
                            <span>
                              <strong>{money(payment.amount_minor)}</strong> · {payment.method_code}
                              <span className="block text-muted-foreground">
                                {payment.bill_number || '—'} · {new Date(payment.paid_at).toLocaleString('id-ID')}
                                {payment.reference ? ` · ${payment.reference}` : ''}
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    <Pagination
                      page={paymentPage}
                      limit={pageSize}
                      total={workspace.payments_total}
                      onChange={setPaymentPage}
                    />
                  </section>
                </div>
                <section className="space-y-3 rounded-xl border bg-card p-4">
                  <h2 className="font-semibold">Periksa pencocokan</h2>
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <p>
                      Bruto {selected.length} pembayaran <strong className="block">{money(gross)}</strong>
                    </p>
                    <p>
                      Dana masuk dipilih <strong className="block">{row ? money(row.amount_minor) : '—'}</strong>
                    </p>
                    <p>
                      Selisih setelah biaya{' '}
                      <strong className={difference ? 'block text-warning' : 'block'}>
                        {difference === null ? '—' : money(difference)}
                      </strong>
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      Biaya penyedia atau bank
                      <input
                        className={field}
                        inputMode="decimal"
                        value={fee}
                        onChange={(e) => setFee(e.target.value)}
                      />
                      <span className="text-xs text-muted-foreground">
                        Gunakan titik untuk desimal. Contoh 10.50.
                      </span>
                    </label>
                    <label className="text-sm">
                      Catatan{difference ? ' (wajib untuk selisih)' : ''}
                      <textarea
                        className={field}
                        maxLength={2000}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={
                        !canWrite ||
                        !row ||
                        row.currency_code !== workspace.currency_code ||
                        !selected.length ||
                        selected.length > 5000 ||
                        gross > 9e15 ||
                        !parsedFee ||
                        parsedFee.minor > gross ||
                        (!!difference && !note.trim()) ||
                        match.isPending
                      }
                      onClick={() => match.mutate()}
                    >
                      <Link2 size={16} /> Simpan pencocokan
                    </Button>
                    <Button variant="ghost" onClick={resetSelection} disabled={match.isPending}>
                      Bersihkan pilihan
                    </Button>
                  </div>
                </section>
                <section className="space-y-3 rounded-xl border bg-card p-4">
                  <h2 className="font-semibold">Riwayat pencocokan · {workspace.matches_total}</h2>
                  {!workspace.matches.length && (
                    <p className="text-sm text-muted-foreground">Belum ada pencocokan.</p>
                  )}
                  {workspace.matches.map((item) => {
                    const historicalMoney = (amount: number) =>
                      money(amount, item.currency_code, item.decimal_digits)
                    return (
                      <details key={item.id} className="rounded-lg border p-3 text-sm">
                        <summary className="cursor-pointer">
                          <strong>{historicalMoney(item.received_minor)}</strong> ·{' '}
                          {new Date(item.created_at).toLocaleString('id-ID')} · {item.payments.length} pembayaran
                          {' · '}
                          {item.cancelled_at
                            ? 'Dibatalkan'
                            : item.stale
                              ? 'Pembayaran sumber berubah'
                              : item.difference_minor
                                ? 'Ada selisih'
                                : 'Cocok'}
                        </summary>
                        <div className="mt-3 space-y-2">
                          <p>
                            Dana masuk {item.bank_date}
                            {item.bank_reference ? ` · ${item.bank_reference}` : ''}
                          </p>
                          <p>
                            Bruto {historicalMoney(item.gross_minor)} · biaya {historicalMoney(item.fee_minor)} ·
                            selisih {historicalMoney(item.difference_minor)}
                          </p>
                          {item.note && <p className="whitespace-pre-wrap">{item.note}</p>}
                          {item.cancelled_at && (
                            <p>
                              {new Date(item.cancelled_at).toLocaleString('id-ID')} · {item.cancel_reason}
                            </p>
                          )}
                          <ul className="max-h-48 overflow-y-auto">
                            {item.payments.map((p) => (
                              <li key={p.id}>
                                {p.bill_number || '—'} · {p.method_code} · {historicalMoney(p.amount_minor)}
                              </li>
                            ))}
                          </ul>
                          {canWrite && !item.cancelled_at && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setReason('')
                                setCancelTarget(item)
                              }}
                            >
                              Batalkan pencocokan
                            </Button>
                          )}
                        </div>
                      </details>
                    )
                  })}
                  <Pagination
                    page={matchPage}
                    limit={pageSize}
                    total={workspace.matches_total}
                    onChange={setMatchPage}
                  />
                </section>
              </>
            )}
            {importOpen && workspace && (
              <ImportStatement
                account={account}
                digits={digits}
                onClose={() => setImportOpen(false)}
                onImported={(from, to) => {
                  // Transfers and QRIS can settle later than the POS payment.
                  const start = new Date(Date.parse(from) - 7 * 86400000).toISOString().slice(0, 10)
                  const period = { from: start, to }
                  if (Date.parse(to) - Date.parse(start) <= 366 * 86400000) {
                    setRange(period)
                    setDateInput(period)
                  }
                  resetPages()
                  setImportOpen(false)
                  void refresh()
                }}
              />
            )}
          </>
        )}
        <Modal
          open={!!cancelTarget}
          title="Batalkan pencocokan"
          onClose={() => {
            if (!cancel.isPending) setCancelTarget(null)
          }}
        >
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              cancel.mutate()
            }}
          >
            <label className="text-sm">
              Alasan pembatalan
              <textarea
                className={field}
                required
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <p className="text-sm text-muted-foreground">
              Dana masuk dan pembayaran bisa dicocokkan kembali. Riwayat keputusan ini tetap tersimpan.
            </p>
            <Button type="submit" variant="destructive" disabled={!reason.trim() || cancel.isPending}>
              Ya, batalkan pencocokan
            </Button>
          </form>
        </Modal>
      </main>
    </div>
  )
}
