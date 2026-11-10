import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { getOrderCheck, lookupOrderCheck, payOrderCheckWithDeposit } from '@/api/public'
import { setActiveLocale, t } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import OrderCheckPage from './OrderCheckPage'
vi.mock('@/api/public', () => ({getOrderCheck:vi.fn(),lookupOrderCheck:vi.fn(),payOrderCheckWithDeposit:vi.fn()}))
let host:HTMLDivElement,root:Root,client:QueryClient
const fixture={business_name:'Arena',business_logo:null,outlet_name:'Utama',server_time:'2026-10-11T12:00:00Z',orders:[]}
const order={bill_number:'261011-0007',queue_number:'7',customer:'Rama',table_number:null,created_at:'2026-10-11T12:00:00Z',items:[],total:10000,paid:0}
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});setActiveLocale('id');host=document.createElement('div');document.body.append(host);root=createRoot(host);client=new QueryClient({defaultOptions:{queries:{retry:false}}})})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();client.clear();vi.clearAllMocks()})
async function render(canAdd?:boolean,newOrderUrl?:string){
 vi.mocked(getOrderCheck).mockResolvedValue({data:{data:{...fixture,new_order_url:newOrderUrl??null}}} as never)
 vi.mocked(lookupOrderCheck).mockResolvedValue({data:{data:{orders:canAdd===undefined?[]:[{...order,can_add:canAdd}]}}} as never)
 await act(async()=>{root.render(<MemoryRouter initialEntries={[canAdd===undefined?'/cek/check-token':'/cek/check-token?bill=261011-0007']}><QueryClientProvider client={client}><Routes><Route path="/cek/:token" element={<OrderCheckPage/>}/></Routes></QueryClientProvider></MemoryRouter>);await new Promise(r=>setTimeout(r,30))})
 await act(async()=>{await new Promise(r=>setTimeout(r,30))})
}
// Tautan pesanan saja — tautan brand "Dibuat dengan Loka Kasir" di kaki halaman bukan jalan memesan.
const orderLink = () => host.querySelector('a:not([href*="lokakasir.id"])')
it('never offers a standalone new bill from the checker',async()=>{await render();expect(orderLink()).toBeNull();expect(host.textContent).toContain(t('ocEmpty'))})
it('adds only to the canonical matched bill, including orders without a table',async()=>{await render(true);expect(lookupOrderCheck).toHaveBeenCalledWith('check-token','261011-0007');expect(orderLink()?.getAttribute('href')).toBe('/cek/check-token/tambah/261011-0007');expect(host.textContent).toContain(t('ocAddHint'))})
it('hides additions when the matched bill is no longer eligible',async()=>{await render(false);expect(orderLink()).toBeNull();expect(host.textContent).toContain('Rama')})
it('offers a new order through the outlet online order link when the server allows it',async()=>{await render(undefined,'https://loka.test/o/store-token');const a=orderLink();expect(a?.getAttribute('href')).toBe('https://loka.test/o/store-token');expect(a?.textContent).toContain(t('ocNewOrder'))})

// Pilihan pembayaran ada di checkout; respons server lama tidak boleh
// memunculkan pembayaran saldo lagi pada kartu cek pesanan.
const depositPay={max_per_tx:0,min_remaining:0}
async function renderDeposit(canPay:boolean,info:typeof depositPay|null=depositPay){
 vi.mocked(getOrderCheck).mockResolvedValue({data:{data:{...fixture,new_order_url:null}}} as never)
 vi.mocked(lookupOrderCheck).mockResolvedValue({data:{data:{orders:[{...order,queue_number:null,can_add:true,paid:2000,can_pay_deposit:canPay}],deposit_pay:info}}} as never)
 await act(async()=>{root.render(<MemoryRouter initialEntries={['/cek/check-token?bill=261011-0007']}><QueryClientProvider client={client}><Routes><Route path="/cek/:token" element={<OrderCheckPage/>}/></Routes></QueryClientProvider></MemoryRouter>);await new Promise(r=>setTimeout(r,30))})
 await act(async()=>{await new Promise(r=>setTimeout(r,30))})
}
const depositButton=()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes(t('depositPayButton')))
it.each([
 {canPay:true,info:depositPay},
 {canPay:false,info:depositPay},
 {canPay:true,info:null},
])('keeps order details and additions without offering member payment: %j',async({canPay,info})=>{
 await renderDeposit(canPay,info)
 expect(depositButton()).toBeUndefined()
 expect(host.querySelector(`input[aria-label="${t('bqPhone')}"]`)).toBeNull()
 expect(host.querySelector(`input[aria-label="${t('bqCode')}"]`)).toBeNull()
 expect(payOrderCheckWithDeposit).not.toHaveBeenCalled()
 expect(host.textContent).toContain('#261011-0007')
 expect(host.textContent).toContain('Rama')
 expect(host.textContent).toContain(formatCurrency(10000))
 expect(host.textContent).toContain(t('ocPaid'))
 expect(host.textContent).toContain(formatCurrency(2000))
 expect(host.textContent).toContain(t('ocRemaining'))
 expect(host.textContent).toContain(formatCurrency(8000))
 expect(orderLink()?.getAttribute('href')).toBe('/cek/check-token/tambah/261011-0007')
 expect(host.textContent).toContain(t('ocAddHint'))
})
