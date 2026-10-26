import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, MessageCircle, Moon, Sun } from 'lucide-react'
import toast from 'react-hot-toast'
import Form from '@/components/ui/Form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSales, salesToken } from '@/api/sales'
import { whatsappContactUrlWith } from '@/lib/constants'
import { getErrorMessage } from '@/lib/utils'
import { useThemeStore } from '@/store/themeStore'

export default function SalesLoginPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useThemeStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  if (salesToken.get()) return <Navigate to="/mitra" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await loginSales(email.trim(), password)
      salesToken.set(res.data.data.token)
      navigate('/mitra', { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background px-6 py-5 sm:px-10">
      <div className="flex justify-end">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Tema terang' : 'Tema gelap'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center py-6">
        <div className="w-full max-w-sm">
          <img src="/logo.svg" alt="Loka Kasir" className="mb-8 h-9 w-auto" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Portal Mitra Sales</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Pantau pelanggan dan komisi Anda dari jualan Loka Kasir.</p>
          <Form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sales-email">Email</Label>
              <Input id="sales-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-[10px]" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sales-password">Kata sandi</Label>
              <div className="relative">
                <Input id="sales-password" type={showPass ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="h-11 rounded-[10px] pr-12" />
                <Button type="button" variant="ghost" size="icon" onClick={() => setShowPass(!showPass)} aria-label={showPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'} className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-[15px]">{loading ? 'Memproses…' : 'Masuk'}</Button>
          </Form>
          <p className="mt-6 text-center text-sm text-muted-foreground">Akun mitra dibuat oleh tim Loka Kasir.</p>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Lupa kata sandi atau ingin jadi mitra?{' '}
        <a href={whatsappContactUrlWith('Halo Loka Kasir, saya ingin bertanya tentang program mitra sales.')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-success hover:underline">
          <MessageCircle size={13} /> Hubungi kami
        </a>
      </p>
    </div>
  )
}
