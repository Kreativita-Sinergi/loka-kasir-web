import { useRef, useState } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, ChevronRight, Eye, EyeOff, FileImage, Link2, MessageCircle, ShieldCheck, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import Form from '@/components/ui/Form'
import Modal from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getSalesRecruitment, loginSales, registerSales, salesToken } from '@/api/sales'
import { getErrorMessage } from '@/lib/utils'
import { whatsappContactUrlWith } from '@/lib/constants'
import SalesTerms from './SalesTerms'
import { SALES_TERMS_VERSION } from './salesContent'
import { CAPTCHA_ENABLED, initialCaptchaToken } from '@/lib/captcha'

export default function SalesRegisterPage() {
  const navigate = useNavigate()
  const quota = useQuery({ queryKey: ['sales-public', 'recruitment'], queryFn: async () => (await getSalesRecruitment()).data.data, staleTime: 15000, retry: 1 })
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmation: '', website: '' })
  const [accepted, setAccepted] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [error, setError] = useState('')
  const [captchaToken, setCaptchaToken] = useState(initialCaptchaToken)
  const captchaRef = useRef<TurnstileInstance>(null)
  if (salesToken.get() && !registered) return <Navigate to="/mitra" replace />
  const capacity = quota.data
  const termsCurrent = capacity?.terms_version === SALES_TERMS_VERSION
  const canRegister = capacity?.registration_open && termsCurrent
  const change = (key: keyof typeof form, value: string) => setForm((old) => ({ ...old, [key]: value }))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!canRegister) return
    if (!captchaToken) { setError('Selesaikan verifikasi keamanan terlebih dahulu.'); return }
    if ([...form.password].length < 8 || new TextEncoder().encode(form.password).length > 72) { setError('Gunakan kata sandi minimal 8 karakter dan tidak terlalu panjang.'); return }
    if (form.password !== form.confirmation) { setError('Konfirmasi kata sandi belum sama.'); return }
    if (!accepted) { setError('Baca dan setujui ketentuan program terlebih dahulu.'); return }
    setLoading(true)
    try {
      await registerSales({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password, website: form.website, accept_terms: accepted, terms_version: SALES_TERMS_VERSION }, captchaToken)
      setRegistered(true)
      try {
        const result = await loginSales(form.email.trim(), form.password)
        salesToken.set(result.data.data.token)
        toast.success('Pendaftaran diterima. Anda sudah bisa membuka materi jualan.')
        navigate('/mitra/bahan', { replace: true })
      } catch { /* Registration succeeded; show the sign-in action instead of submitting twice. */ }
    } catch (cause) {
      setError(getErrorMessage(cause))
      setCaptchaToken(initialCaptchaToken())
      captchaRef.current?.reset()
      void quota.refetch()
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <a href="https://lokakasir.id" aria-label="Beranda Loka Kasir"><img src="/logo.svg" alt="Loka Kasir" className="h-8 w-auto" /></a>
        <Button variant="outline" size="sm" asChild><Link to="/mitra/login">Sudah jadi mitra? Masuk<ChevronRight size={15} /></Link></Button>
      </header>
      <main className="mx-auto grid max-w-6xl gap-8 px-5 pb-12 pt-4 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pt-7">
        <section>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"><span className="size-1.5 rounded-full bg-primary" /> PROGRAM MITRA SALES · MAKSIMAL 100 MITRA</span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl">Bantu usaha lebih tertata.<br /><span className="text-primary">Jualan Loka Kasir.</span></h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">Kenalkan aplikasi kasir ke pemilik usaha di sekitar Anda. Materi promosi, tautan pribadi, dan pantauan komisi tersedia dalam satu portal.</p>
          <div className="relative mt-6 overflow-hidden rounded-[24px] bg-[#145cff]">
            <img src="/sales/recruitment-hero.jpg" alt="Mitra mendampingi pemilik kedai mencoba Loka Kasir" className="h-72 w-full object-cover object-[50%_73%] sm:h-80" fetchPriority="high" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#081d3b] to-transparent p-5 pt-12 text-white">
              <p className="text-lg font-bold">Anda fokus bantu pelanggan.</p><p className="mt-1 text-sm text-white/85">Bahan untuk mulai menawarkan sudah disiapkan.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[[FileImage, 'Konten resmi', 'Gambar, caption, dan video tutorial.'], [Link2, 'Link pribadi', 'Pelanggan terhubung ke kode Anda.'], [TrendingUp, 'Komisi tercatat', 'Pantau hasil lewat portal mitra.']].map(([Icon, heading, body]) => {
              const FeatureIcon = Icon as typeof FileImage
              return <div key={String(heading)} className="rounded-2xl border border-border bg-card p-4"><FeatureIcon className="mb-2 text-primary" size={21} /><h2 className="text-sm font-semibold">{String(heading)}</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{String(body)}</p></div>
            })}
          </div>
        </section>

        <section className="self-start rounded-[24px] border border-border bg-card p-5 shadow-sm sm:p-7" aria-labelledby="sales-register-title">
          {registered ? <div className="space-y-4 py-8"><Check className="size-12 rounded-full bg-success/10 p-2 text-success" /><h2 id="sales-register-title" className="text-2xl font-bold">Pendaftaran diterima.</h2><p className="text-sm leading-relaxed text-muted-foreground">Masuk dengan email dan kata sandi yang baru Anda buat untuk mengambil materi jualan. Tim Loka Kasir akan memverifikasi akun sebelum kode referral diaktifkan.</p><Button asChild className="w-full"><Link to="/mitra/login">Masuk ke portal mitra<ArrowRight /></Link></Button></div> : <>
            <h2 id="sales-register-title" className="text-2xl font-bold tracking-tight">Daftar jadi mitra sales</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Buat akun, pelajari bahan jualan, lalu tunggu aktivasi dari tim Loka Kasir.</p>
            <div className="mt-5 rounded-xl bg-muted/60 p-3.5 text-sm" aria-live="polite">
              {quota.isPending ? <p className="text-muted-foreground">Memuat kuota pendaftaran…</p> : quota.isError ? <div className="flex items-center justify-between gap-3"><p className="text-muted-foreground">Kuota belum dapat dimuat.</p><button type="button" className="font-semibold text-primary underline" onClick={() => void quota.refetch()}>Coba lagi</button></div> : capacity && <>
                <div className="flex items-center justify-between gap-3"><span className="font-semibold">{capacity.registration_open ? `${capacity.remaining} tempat tersedia` : 'Kuota pendaftaran penuh'}</span><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{capacity.reserved}/{capacity.limit} terisi</span></div>
                <div role="progressbar" aria-label="Kuota mitra terisi" aria-valuenow={Math.min(capacity.reserved, capacity.limit)} aria-valuemin={0} aria-valuemax={capacity.limit} className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, capacity.reserved / capacity.limit * 100)}%` }} /></div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Pendaftaran yang menunggu verifikasi sudah termasuk kuota.</p>
              </>}
            </div>
            {capacity && !termsCurrent && <p role="alert" className="mt-3 text-sm text-destructive">Ketentuan program diperbarui. Muat ulang halaman untuk membacanya sebelum mendaftar.</p>}
            {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/20 bg-destructive-subtle p-3 text-sm text-destructive">{error}</p>}
            <Form onSubmit={submit} className="mt-5 space-y-4">
              <div className="space-y-1.5"><Label htmlFor="sales-name">Nama lengkap</Label><Input id="sales-name" autoComplete="name" maxLength={120} value={form.name} onChange={(e) => change('name', e.target.value)} required className="h-11 rounded-xl" /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="sales-signup-email">Email</Label><Input id="sales-signup-email" type="email" autoComplete="email" maxLength={200} value={form.email} onChange={(e) => change('email', e.target.value)} required className="h-11 rounded-xl" /></div>
                <div className="space-y-1.5"><Label htmlFor="sales-phone">Nomor WhatsApp</Label><Input id="sales-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={32} placeholder="0812… atau +62…" value={form.phone} onChange={(e) => change('phone', e.target.value)} required className="h-11 rounded-xl" /></div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="sales-signup-password">Kata sandi</Label><div className="relative"><Input id="sales-signup-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={72} value={form.password} onChange={(e) => change('password', e.target.value)} required className="h-11 rounded-xl pr-11" /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 size-9 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</Button></div><p className="text-xs text-muted-foreground">Minimal 8 karakter.</p></div>
              <div className="space-y-1.5"><Label htmlFor="sales-signup-confirmation">Ulangi kata sandi</Label><Input id="sales-signup-confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={72} value={form.confirmation} onChange={(e) => change('confirmation', e.target.value)} required className="h-11 rounded-xl" /></div>
              <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden"><label htmlFor="sales-website">Website</label><input id="sales-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => change('website', e.target.value)} /></div>
              <div className="flex items-start gap-2.5"><input id="sales-accept-terms" type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 size-4 shrink-0 accent-primary" required /><label htmlFor="sales-accept-terms" className="text-sm leading-relaxed text-muted-foreground">Saya telah membaca dan menyetujui <button type="button" onClick={(e) => { e.preventDefault(); setTermsOpen(true) }} className="font-semibold text-primary underline underline-offset-2">syarat & ketentuan program mitra sales</button>.</label></div>
              {CAPTCHA_ENABLED && <Turnstile ref={captchaRef} siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY} onSuccess={setCaptchaToken} onExpire={() => setCaptchaToken('')} onError={() => setCaptchaToken('')} options={{ size: 'flexible' }} />}
              <Button type="submit" disabled={loading || !canRegister || !accepted || !captchaToken} className="h-12 w-full rounded-xl text-base font-semibold">{loading ? 'Mendaftarkan akun…' : capacity && !capacity.registration_open ? 'Kuota sudah penuh' : 'Daftar & buka materi jualan'}<ArrowRight size={18} /></Button>
            </Form>
            <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck size={15} className="mt-0.5 shrink-0" /><p>Kode referral aktif setelah pemeriksaan KTP dan rekening atas nama yang sama oleh tim. Data ini dilengkapi bersama tim setelah pendaftaran. Kode dilarang dipakai untuk toko sendiri atau identitas pinjaman.</p></div>
            <div className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">Perlu tanya sebelum daftar? <a href={whatsappContactUrlWith('Halo Loka Kasir, saya ingin bertanya tentang pendaftaran mitra sales.')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"><MessageCircle size={14} />Hubungi tim Loka Kasir</a></div>
          </>}
        </section>
      </main>
      <Modal open={termsOpen} onClose={() => setTermsOpen(false)} title="Syarat & ketentuan mitra sales"><div className="max-h-[65vh] overflow-y-auto pr-2"><SalesTerms /></div><Button className="mt-5 w-full" onClick={() => { setAccepted(true); setTermsOpen(false) }}>Saya sudah membaca & setuju</Button></Modal>
    </div>
  )
}
