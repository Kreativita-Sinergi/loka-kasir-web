import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { getStoreMenu, createStoreOrder } from '@/api/public'
import { setActiveLocale, t } from '@/lib/i18n'
import { formatCurrency } from '@/lib/utils'
import PublicMenuPage from './PublicMenuPage'
vi.mock('@/api/public')
vi.mock('react-hot-toast',()=>({default:{success:vi.fn(),error:vi.fn()}}))
let host:HTMLDivElement,root:Root,client:QueryClient
// Outlet yang melayani bawa pulang (QRIS siap) DAN makan di tempat bayar di kasir.
const menu={business_name:'Arena',outlet_name:'Utama',table_number:'',business_logo:null,mode:'pickup',self_payment_enabled:true,pickup_payment:'manual',pay_at_counter:true,prepay_dine_in:false,categories:[{id:null,name:'Minuman',products:[{id:'product-1',name:'Kopi',sell_price:5000,is_available:true,is_active:true,has_variant:false,attributes:[]}]}]}
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});setActiveLocale('id');host=document.createElement('div');document.body.append(host);root=createRoot(host);client=new QueryClient({defaultOptions:{queries:{retry:false}}});vi.mocked(getStoreMenu).mockResolvedValue({data:{data:menu}} as never);vi.mocked(createStoreOrder).mockResolvedValue({data:{data:{id:'order-1',status:'pending',total:5000}}} as never)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();client.clear();vi.clearAllMocks()})
async function render(url:string){await act(async()=>{root.render(<MemoryRouter initialEntries={[url]}><QueryClientProvider client={client}><Routes><Route path="/o/:token" element={<PublicMenuPage mode="pickup"/>}/></Routes></QueryClientProvider></MemoryRouter>);await new Promise(r=>setTimeout(r,30))});await act(async()=>{await new Promise(r=>setTimeout(r,30))})}
async function click(text:string){const button=Array.from(host.querySelectorAll('button')).find(b=>b.textContent?.includes(text));expect(button).toBeTruthy();await act(async()=>{button!.click();await new Promise(r=>setTimeout(r,20))})}
function type(selector:string,value:string){const input=host.querySelector<HTMLInputElement>(selector);expect(input).toBeTruthy();const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;setter.call(input,value);input!.dispatchEvent(new Event('input',{bubbles:true}))}
async function openCart(){await click('Kopi');await click(t('menuViewOrder'))}
it('from the order-check QR (?service=dine_in) it is dine in only: no pickup choice, order sent as dine in paid at the cashier',async()=>{
 await render('/o/store-token?service=dine_in');await openCart()
 const labels=Array.from(host.querySelectorAll('button')).map(b=>b.textContent??'')
 expect(labels.some(l=>l.includes(t('menuServicePickup')))).toBe(false)
 expect(host.textContent).toContain(t('menuDineInOnlyNote'));expect(host.textContent).not.toContain(t('menuPickupNoQris'))
 await act(async()=>{type('input[autocomplete="name"]','Rama');type('input[autocomplete="tel"]','081234567890')})
 await click(t('menuSendOrder'))
 expect(createStoreOrder).toHaveBeenCalledWith('store-token',expect.objectContaining({service_type:'dine_in',pay_at_counter:true,customer_name:'Rama'}))
})
it('without the flag the online order link still offers pickup first',async()=>{
 await render('/o/store-token');await openCart()
 const labels=Array.from(host.querySelectorAll('button')).map(b=>b.textContent??'')
 expect(labels.some(l=>l.includes(t('menuServicePickup')))).toBe(true);expect(host.textContent).not.toContain(t('menuDineInOnlyNote'))
})
it('shows the member price next to the regular price only when it is cheaper',async()=>{
 vi.mocked(getStoreMenu).mockResolvedValue({data:{data:{...menu,categories:[{id:null,name:'Minuman',products:[
  {id:'product-1',name:'Kopi',sell_price:15000,member_price:12000,is_available:true,is_active:true,has_variant:false,attributes:[]},
  {id:'product-2',name:'Teh',sell_price:8000,member_price:8000,is_available:true,is_active:true,has_variant:false,attributes:[]},
 ]}]}}} as never)
 await render('/o/store-token')
 expect(host.textContent).toContain(t('menuMemberPrice',{price:formatCurrency(12000)}))
 expect(host.textContent).not.toContain(t('menuMemberPrice',{price:formatCurrency(8000)}))
})
