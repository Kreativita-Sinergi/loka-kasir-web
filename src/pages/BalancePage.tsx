import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownCircle, ArrowUpCircle, Banknote, CheckCircle2,
  Clock, Info, Landmark, XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Modal from '@/components/ui/Modal'
import {
  getBalanceEntries, getMerchantBalance, getPayoutBanks, getPayouts,
  inquiryBankAccount, requestPayout, setBankAccount,
} from '@/api/balance'
import { getErrorMessage } from '@/lib/utils'
import type {
  BalanceEntry, BankInquiry, MerchantBalance, Payout,
} from '@/types'

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(amount)
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Persen ditulis apa adanya: 0.7 → "0,7", 1 → "1". */
function formatPercent(v: number) {
  return `${v.toString().replace('.', ',')}%`
}

const ENTRY_LABELS: Record<string, string> = {
  qris_sale: 'Pembayaran QRIS',
  gateway_fee: 'Biaya QRIS (MDR)',
  platform_fee: 'Biaya layanan Loka Kasir',
  payout: 'Pencairan ke rekening',
  payout_refund: 'Pencairan gagal — dikembalikan',
  adjustment: 'Penyesuaian',
}

function payoutStatusBadge(status: Payout['status']) {
  switch (status) {
    case 'success':
      return { label: 'Berhasil', className: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400', icon: <CheckCircle2 size={13} /> }
    case 'failed':
      return { label: 'Gagal', className: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400', icon: <XCircle size={13} /> }
    case 'processing':
      return { label: 'Diproses', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', icon: <Clock size={13} /> }
    default:
      return { label: 'Menunggu', className: 'bg-muted text-muted-foreground', icon: <Clock size={13} /> }
  }
}

export default function BalancePage() {
  const qc = useQueryClient()
  const [payoutOpen, setPayoutOpen] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)

  const { data: balanceRes, isLoading } = useQuery({
    queryKey: ['merchant-balance'],
    queryFn: getMerchantBalance,
  })
  const balance = balanceRes?.data?.data

  const { data: entriesRes } = useQuery({
    queryKey: ['balance-entries'],
    queryFn: () => getBalanceEntries(50, 0),
  })
  const entries = entriesRes?.data?.data ?? []

  const { data: payoutsRes } = useQuery({
    queryKey: ['payouts'],
    queryFn: () => getPayouts(20),
  })
  const payouts = payoutsRes?.data?.data ?? []

  return (
    <>
      <Header title="Saldo QRIS" />
      <div className="p-4 md:p-6 space-y-6">
        {isLoading || !balance ? (
          <div className="rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
            Memuat saldo…
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <BalanceCard
                balance={balance}
                onPayout={() => setPayoutOpen(true)}
              />
              <FeeCard balance={balance} />
              <BankCard balance={balance} onEdit={() => setBankOpen(true)} />
            </div>

            <EntriesTable entries={entries} />
            <PayoutsTable payouts={payouts} />

            <PayoutModal
              open={payoutOpen}
              balance={balance}
              onClose={() => setPayoutOpen(false)}
              onDone={() => {
                void qc.invalidateQueries({ queryKey: ['merchant-balance'] })
                void qc.invalidateQueries({ queryKey: ['balance-entries'] })
                void qc.invalidateQueries({ queryKey: ['payouts'] })
              }}
            />
            <BankAccountModal
              open={bankOpen}
              onClose={() => setBankOpen(false)}
              onDone={() => void qc.invalidateQueries({ queryKey: ['merchant-balance'] })}
            />
          </>
        )}
      </div>
    </>
  )
}

// ─── Kartu ────────────────────────────────────────────────────────────────────

function BalanceCard({ balance, onPayout }: { balance: MerchantBalance; onPayout: () => void }) {
  const blocked =
    !balance.payout_enabled
      ? 'Pencairan otomatis belum aktif di server'
      : !balance.bank_account
        ? 'Atur rekening tujuan dulu'
        : balance.available < balance.min_payout
          ? `Minimal pencairan ${formatRupiah(balance.min_payout)}`
          : null

  return (
    <div className="rounded-2xl bg-blue-600 p-5 text-white">
      <p className="text-xs text-white/80">Saldo Tersedia</p>
      <p className="mt-1 text-3xl font-semibold">{formatRupiah(balance.available)}</p>
      {balance.reserved > 0 && (
        <p className="mt-1 text-xs text-white/80">
          {formatRupiah(balance.reserved)} sedang diproses pencairan
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-white/70">Total Masuk</p>
          <p className="font-semibold">{formatRupiah(balance.total_earned)}</p>
        </div>
        <div>
          <p className="text-white/70">Total Biaya</p>
          <p className="font-semibold">{formatRupiah(balance.total_fee)}</p>
        </div>
        <div>
          <p className="text-white/70">Sudah Cair</p>
          <p className="font-semibold">{formatRupiah(balance.total_paid_out)}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onPayout}
        disabled={blocked !== null}
        className="mt-4 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {blocked ?? 'Cairkan Saldo'}
      </button>
    </div>
  )
}

/**
 * Biaya diumumkan di muka. Merchant berhak tahu potongannya sebelum menagih,
 * bukan menemukannya sendiri saat mencocokkan angka.
 */
function FeeCard({ balance }: { balance: MerchantBalance }) {
  const hasPlatformFee = balance.platform_fee_percent > 0
  const total = balance.gateway_fee_percent + balance.platform_fee_percent

  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="flex items-center gap-2">
        <Info size={16} className="text-muted-foreground" />
        <h3 className="text-sm font-semibold">Biaya per pembayaran QRIS</h3>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p>Biaya QRIS (MDR)</p>
            <p className="text-xs text-muted-foreground">Dipotong penyedia pembayaran</p>
          </div>
          <p>{formatPercent(balance.gateway_fee_percent)}</p>
        </div>

        {hasPlatformFee && (
          <div className="flex items-start justify-between gap-3">
            <div>
              <p>Biaya layanan Loka Kasir</p>
              <p className="text-xs text-muted-foreground">Gratis untuk pelanggan berlangganan</p>
            </div>
            <p>{formatPercent(balance.platform_fee_percent)}</p>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-2 font-semibold">
          <p>Total potongan</p>
          <p>{formatPercent(total)}</p>
        </div>
      </div>

      {hasPlatformFee && (
        <p className="mt-3 text-xs text-blue-600 dark:text-blue-400">
          Berlangganan membuat biaya QRIS turun menjadi{' '}
          {formatPercent(balance.gateway_fee_percent)}.
        </p>
      )}
    </div>
  )
}

function BankCard({ balance, onEdit }: { balance: MerchantBalance; onEdit: () => void }) {
  const account = balance.bank_account

  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="flex items-center gap-2">
        <Landmark size={16} className="text-muted-foreground" />
        <h3 className="text-sm font-semibold">Rekening Tujuan</h3>
      </div>

      {account ? (
        <div className="mt-3">
          <p className="text-sm font-medium">{account.account_name}</p>
          <p className="text-xs text-muted-foreground">
            {account.bank_name || account.bank_code} • {account.account_number_mask}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Belum diatur. Diperlukan untuk mencairkan saldo.
        </p>
      )}

      <button
        type="button"
        onClick={onEdit}
        disabled={!balance.payout_enabled}
        className="mt-4 w-full rounded-xl border border-border px-4 py-2 text-xs font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {account ? 'Ubah Rekening' : 'Atur Rekening'}
      </button>
    </div>
  )
}

// ─── Tabel ────────────────────────────────────────────────────────────────────

function EntriesTable({ entries }: { entries: BalanceEntry[] }) {
  return (
    <div className="rounded-2xl border border-border">
      <div className="border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold">Mutasi Saldo</h3>
      </div>
      {entries.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          Belum ada pembayaran QRIS yang masuk ke saldo.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
              {entry.amount >= 0 ? (
                <ArrowDownCircle size={18} className="shrink-0 text-green-600 dark:text-green-400" />
              ) : (
                <ArrowUpCircle size={18} className="shrink-0 text-red-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {ENTRY_LABELS[entry.type] ?? entry.description}
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
              </div>
              <p
                className={`text-sm font-semibold ${
                  entry.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'
                }`}
              >
                {entry.amount >= 0 ? '+' : '−'}
                {formatRupiah(Math.abs(entry.amount))}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PayoutsTable({ payouts }: { payouts: Payout[] }) {
  return (
    <div className="rounded-2xl border border-border">
      <div className="border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold">Riwayat Pencairan</h3>
      </div>
      {payouts.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">Belum ada pencairan.</p>
      ) : (
        <div className="divide-y divide-border">
          {payouts.map((payout) => {
            const badge = payoutStatusBadge(payout.status)
            return (
              <div key={payout.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{formatRupiah(payout.amount)}</p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${badge.className}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {payout.bank_name || payout.bank_code} • {payout.account_number_mask} •{' '}
                  {formatDateTime(payout.created_at)}
                </p>
                {payout.failure_reason && (
                  <p className="mt-1 text-xs text-red-500">{payout.failure_reason}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function PayoutModal({
  open, balance, onClose, onDone,
}: {
  open: boolean
  balance: MerchantBalance
  onClose: () => void
  onDone: () => void
}) {
  const [amount, setAmount] = useState<number>(balance.available)

  const problem =
    amount < balance.min_payout
      ? `Minimal pencairan ${formatRupiah(balance.min_payout)}`
      : amount > balance.available
        ? `Melebihi saldo tersedia (${formatRupiah(balance.available)})`
        : null

  const mut = useMutation({
    mutationFn: () => requestPayout(amount),
    onSuccess: () => {
      toast.success('Pencairan sedang diproses')
      onDone()
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Cairkan Saldo">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Saldo tersedia {formatRupiah(balance.available)}
        </p>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nominal</label>
          <input
            type="number"
            value={amount}
            min={balance.min_payout}
            max={balance.available}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setAmount(balance.available)}
            className="mt-1 text-xs text-blue-600 hover:underline"
          >
            Cairkan semua
          </button>
        </div>

        {balance.bank_account && (
          <div className="rounded-xl bg-muted p-3 text-sm">
            <p className="text-xs text-muted-foreground">Dikirim ke</p>
            <p className="font-medium">{balance.bank_account.account_name}</p>
            <p className="text-xs text-muted-foreground">
              {balance.bank_account.bank_name || balance.bank_account.bank_code} •{' '}
              {balance.bank_account.account_number_mask}
            </p>
          </div>
        )}

        {problem && <p className="text-xs text-red-500">{problem}</p>}

        <button
          type="button"
          onClick={() => mut.mutate()}
          disabled={problem !== null || mut.isPending}
          className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {mut.isPending ? 'Memproses…' : 'Cairkan Sekarang'}
        </button>
      </div>
    </Modal>
  )
}

/**
 * Alurnya dua langkah — cek rekening dulu, baru simpan. Nama pemilik tidak
 * pernah diketik sendiri: salah satu digit saja berarti uang mendarat di
 * rekening orang lain, dan tidak ada cara menariknya kembali.
 */
function BankAccountModal({
  open, onClose, onDone,
}: {
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [bankCode, setBankCode] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [verified, setVerified] = useState<BankInquiry | null>(null)

  const { data: banksRes } = useQuery({
    queryKey: ['payout-banks'],
    queryFn: getPayoutBanks,
    enabled: open,
  })
  const banks = banksRes?.data?.data ?? []
  const bankName = banks.find((b) => b.bank_code === bankCode)?.bank_name ?? ''

  const inquiryMut = useMutation({
    mutationFn: () => inquiryBankAccount({ bank_code: bankCode, account_number: accountNumber }),
    onSuccess: (res) => setVerified(res.data.data),
    onError: (err) => {
      setVerified(null)
      toast.error(getErrorMessage(err))
    },
  })

  const saveMut = useMutation({
    mutationFn: () =>
      setBankAccount({
        bank_code: bankCode,
        bank_name: bankName,
        account_number: accountNumber,
      }),
    onSuccess: () => {
      toast.success('Rekening tersimpan')
      onDone()
      onClose()
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  return (
    <Modal open={open} onClose={onClose} title="Rekening Tujuan">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Saldo QRIS akan dikirim ke rekening ini. Nama pemilik diambil langsung dari bank,
          jadi pastikan nomornya benar.
        </p>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Bank</label>
          <select
            value={bankCode}
            onChange={(e) => {
              setBankCode(e.target.value)
              setVerified(null)
            }}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Pilih bank…</option>
            {banks.map((bank) => (
              <option key={bank.bank_code} value={bank.bank_code}>
                {bank.bank_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Nomor Rekening
          </label>
          <input
            value={accountNumber}
            onChange={(e) => {
              setAccountNumber(e.target.value)
              setVerified(null)
            }}
            className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {verified && (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 dark:bg-green-500/10">
            <Banknote size={16} className="text-green-600 dark:text-green-400" />
            <div>
              <p className="text-xs text-green-700 dark:text-green-400">
                Rekening ditemukan atas nama
              </p>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                {verified.account_name}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => inquiryMut.mutate()}
            disabled={!bankCode || !accountNumber || inquiryMut.isPending}
            className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
          >
            {inquiryMut.isPending ? 'Memeriksa…' : 'Cek Rekening'}
          </button>
          <button
            type="button"
            onClick={() => saveMut.mutate()}
            disabled={!verified || saveMut.isPending}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saveMut.isPending ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
