import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { getAdditionMenu, createOrderAddition, createPublicOrder, createStoreOrder } from '@/api/public'
import { setActiveLocale, t } from '@/lib/i18n'
import PublicMenuPage from './PublicMenuPage'
vi.mock('@/api/public')
vi.mock('react-hot-toast',()=>({default:{success:vi.fn(),error:vi.fn()}}))
let host:HTMLDivElement,root:Root,client:QueryClient
const menu={business_name:'Arena',outlet_name:'Utama',table_number:'',business_logo:null,categories:[{id:null,name:'Minuman',products:[{id:'product-1',name:'Kopi',sell_price:5000,is_available:true,is_active:true,has_variant:false,attributes:[]}]}]}
beforeEach(()=>{Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});setActiveLocale('id');host=document.createElement('div');document.body.append(host);root=createRoot(host);client=new QueryClient({defaultOptions:{queries:{retry:false}}});vi.mocked(getAdditionMenu).mockResolvedValue({data:{data:menu}} as never);vi.mocked(createOrderAddition).mockResolvedValue({data:{data:{transaction_id:'addition-1'}}} as never)})
afterEach(async()=>{await act(async()=>root.unmount());host.remove();client.clear();vi.clearAllMocks()})
async function render(){await act(async()=>{root.render(<MemoryRouter initialEntries={['/cek/token-1/tambah/261011-0007']}><QueryClientProvider client={client}><Routes><Route path="/cek/:token/tambah/:bill" element={<PublicMenuPage mode="addition"/>}/></Routes></QueryClientProvider></MemoryRouter>);await new Promise(r=>setTimeout(r,30))});await act(async()=>{await new Promise(r=>setTimeout(r,30))})}
async function click(text:string){const button=Array.from(host.querySelectorAll('button')).find(b=>b.textContent?.includes(text));expect(button).toBeTruthy();await act(async()=>{button!.click();await new Promise(r=>setTimeout(r,20))})}
it('sends items to the selected bill without asking for contact or creating an independent order',async()=>{
 await render();expect(getAdditionMenu).toHaveBeenCalledWith('token-1','261011-0007');expect(host.textContent).toContain(t('ocAddBill',{bill:'261011-0007'}))
 await click('Kopi');await click(t('menuViewOrder'))
 expect(host.querySelector('input[autocomplete="name"]')).toBeNull();expect(host.textContent).toContain(t('ocAddHint'))
 await click(t('ocAddSend'))
 expect(createOrderAddition).toHaveBeenCalledWith('token-1','261011-0007',{items:[{item_type:'PRODUCT',reference_id:'product-1',quantity:1,attributes:[]}],notes:null})
 expect(createPublicOrder).not.toHaveBeenCalled();expect(createStoreOrder).not.toHaveBeenCalled();expect(host.textContent).toContain(t('ocAddSent'));expect(host.querySelector('a')?.getAttribute('href')).toBe('/cek/token-1?bill=261011-0007')
})
it('prevents ordering when the bill menu is unavailable',async()=>{vi.mocked(getAdditionMenu).mockRejectedValue(new Error('closed bill'));await render();expect(host.textContent).not.toContain('Kopi');expect(createOrderAddition).not.toHaveBeenCalled()})
