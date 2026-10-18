import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { getOrderCheck, lookupOrderCheck } from '@/api/public'
import { setActiveLocale, t } from '@/lib/i18n'
import OrderCheckPage from './OrderCheckPage'
vi.mock('@/api/public', () => ({getOrderCheck:vi.fn(),lookupOrderCheck:vi.fn()}))
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
it('never offers a standalone new bill from the checker',async()=>{await render();expect(host.querySelector('a')).toBeNull();expect(host.textContent).toContain(t('ocEmpty'))})
it('adds only to the canonical matched bill, including orders without a table',async()=>{await render(true);expect(lookupOrderCheck).toHaveBeenCalledWith('check-token','261011-0007');expect(host.querySelector('a')?.getAttribute('href')).toBe('/cek/check-token/tambah/261011-0007');expect(host.textContent).toContain(t('ocAddHint'))})
it('hides additions when the matched bill is no longer eligible',async()=>{await render(false);expect(host.querySelector('a')).toBeNull();expect(host.textContent).toContain('Rama')})
it('offers a new order through the outlet online order link when the server allows it',async()=>{await render(undefined,'https://loka.test/o/store-token');const a=host.querySelector('a');expect(a?.getAttribute('href')).toBe('https://loka.test/o/store-token');expect(a?.textContent).toContain(t('ocNewOrder'))})
