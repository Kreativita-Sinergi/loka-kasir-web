import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { getStoreMenu, createStoreOrder, checkStoreMember, getPublicOrderStatus, payOrderWithDeposit, payPickupOrder } from '@/api/public'
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
it('invites customers to become members with the savings from the menu, and hints the phone number in the cart',async()=>{
 vi.mocked(getStoreMenu).mockResolvedValue({data:{data:{...menu,categories:[{id:null,name:'Minuman',products:[
  {id:'product-1',name:'Kopi',sell_price:15000,member_price:12000,is_available:true,is_active:true,has_variant:false,attributes:[]},
 ]}]}}} as never)
 await render('/o/store-token')
 expect(host.textContent).toContain(t('menuMemberPerksTitle'))
 expect(host.textContent).toContain(t('menuMemberPerksBody',{count:1,saving:formatCurrency(3000)}))
 await openCart()
 expect(host.textContent).toContain(t('menuMemberPhoneHint'))
})
it('shows no member invitation when the menu has no member prices',async()=>{
 await render('/o/store-token');await openCart()
 expect(host.textContent).not.toContain(t('menuMemberPerksTitle'));expect(host.textContent).not.toContain(t('menuMemberPhoneHint'))
})
it('switches the cart to member prices once the server recognizes the phone number',async()=>{
 vi.mocked(getStoreMenu).mockResolvedValue({data:{data:{...menu,categories:[{id:null,name:'Minuman',products:[
  {id:'product-1',name:'Kopi',sell_price:8000,member_price:6500,is_available:true,is_active:true,has_variant:false,attributes:[]},
 ]}]}}} as never)
 vi.mocked(checkStoreMember).mockImplementation(async(_token,phone)=>({data:{data:{is_member:phone==='081300000001'}}}) as never)
 await render('/o/store-token?service=dine_in');await click('Kopi');await click('Kopi');await click(t('menuViewOrder'))
 const settle=async()=>act(async()=>{await new Promise(r=>setTimeout(r,650))})
 await act(async()=>{type('input[autocomplete="tel"]','081300000002')});await settle()
 expect(host.textContent).not.toContain(t('menuMemberSaving',{amount:formatCurrency(3000)}))
 await act(async()=>{type('input[autocomplete="tel"]','081300000001')});await settle();await settle()
 expect(checkStoreMember).toHaveBeenCalledWith('store-token','081300000001')
 expect(host.textContent).toContain(`· ${t('menuMemberApplied')}`)
 expect(host.textContent).toContain(t('menuMemberSaving',{amount:formatCurrency(3000)}))
})

const depositInfo = { max_per_tx: 200000, min_remaining: 1000 }
const unpaidOrder = {
  transaction_id: 'order-balance', payment_status: 'unpaid', fulfillment_status: 'pending',
  final_price: 5500, bill_number: 'NOTA-1', order_type: { code: 'DIN' }, requires_prepayment: true,
}
function offerDeposit(prepay = true, max = depositInfo.max_per_tx) {
  localStorage.clear()
  vi.mocked(getStoreMenu).mockResolvedValue({ data: { data: {
    ...menu, pickup_payment: prepay ? 'manual' : '', prepay_dine_in: prepay,
    deposit_pay: { ...depositInfo, max_per_tx: max },
  } } } as never)
  let requiresPrepayment = prepay
  let autoDeposit = false
  vi.mocked(createStoreOrder).mockImplementation(async (_token, payload) => {
    autoDeposit = payload.pay_with === 'deposit'
    requiresPrepayment = !autoDeposit && prepay && !payload.pay_at_counter
    return { data: { data: { ...unpaidOrder, requires_prepayment: requiresPrepayment, deposit_on_confirmation: autoDeposit } } } as never
  })
  vi.mocked(getPublicOrderStatus).mockImplementation(async () => (
    { data: { data: { ...unpaidOrder, requires_prepayment: requiresPrepayment, deposit_on_confirmation: autoDeposit } } } as never
  ))
}
async function chooseOrderPay(label: string) {
  const button = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-testid="order-pay"] button')).find(b => b.textContent?.includes(label))
  expect(button).toBeTruthy()
  await act(async () => { button!.click(); await new Promise(r => setTimeout(r, 20)) })
}
async function sendContact() {
  await act(async () => { type('input[autocomplete="name"]', 'Rama'); type('input[autocomplete="tel"]', '081234567890') })
  await click(t('menuSendOrder'))
  await act(async () => { await new Promise(r => setTimeout(r, 50)) })
}

async function enterBalanceCode(value = '482913') {
  await act(async () => { type(`input[aria-label="${t('bqCode')}"]`, value) })
}

it('verifies the balance code with the order and waits for automatic debit at cashier confirmation', async () => {
  offerDeposit()
  await render('/o/store-token?service=dine_in'); await openCart()
  expect(host.querySelector('[data-testid="order-pay"]')?.querySelectorAll('[role="radio"]')).toHaveLength(3)
  await chooseOrderPay(t('rentalMemberBalance'))
  expect(host.textContent).toContain(t('menuDepositAfterConfirmNote'))
  const send = () => Array.from(host.querySelectorAll('button')).find(b => b.textContent?.includes(t('menuSendOrder')))!
  expect(send().disabled).toBe(true)
  await enterBalanceCode('48291')
  expect(send().disabled).toBe(true)
  await enterBalanceCode()
  await sendContact()
  expect(createStoreOrder).toHaveBeenCalledWith('store-token', expect.objectContaining({
    service_type: 'dine_in', pay_at_counter: true, pay_with: 'deposit', balance_code: '482913', customer_phone: '081234567890',
  }))
  expect(payPickupOrder).not.toHaveBeenCalled()
  expect(payOrderWithDeposit).not.toHaveBeenCalled()
  expect(host.textContent).toContain(t('menuDepositAfterConfirmNote'))
  await act(async () => {
    client.setQueryData(['public-order', 'order-balance'], { data: { data: { ...unpaidOrder, requires_prepayment: false, payment_status: 'paid', fulfillment_status: 'confirmed' } } })
    await new Promise(r => setTimeout(r, 200))
  })
  expect(host.textContent).toContain(t('menuThanksPaid'))
  expect(host.querySelector('form')).toBeNull()
  expect(payOrderWithDeposit).not.toHaveBeenCalled()
  expect(createStoreOrder).toHaveBeenCalledTimes(1)
})

it('uses automatic balance confirmation even when QRIS is unavailable', async () => {
  offerDeposit(false)
  await render('/o/store-token?service=dine_in'); await openCart()
  const methods = host.querySelector('[data-testid="order-pay"]')!
  expect(methods.querySelectorAll('[role="radio"]')).toHaveLength(2)
  expect(methods.textContent).not.toContain(t('menuPayQrisNow'))
  await chooseOrderPay(t('rentalMemberBalance'))
  await enterBalanceCode()
  await sendContact()
  expect(createStoreOrder).toHaveBeenCalledWith('store-token', expect.objectContaining({ pay_at_counter: true, pay_with: 'deposit', balance_code: '482913' }))
  expect(host.textContent).toContain(t('menuDepositAfterConfirmNote'))
  expect(payOrderWithDeposit).not.toHaveBeenCalled()
  await act(async () => {
    client.setQueryData(['public-order', 'order-balance'], { data: { data: { ...unpaidOrder, requires_prepayment: false, payment_status: 'paid', fulfillment_status: 'confirmed' } } })
    await new Promise(r => setTimeout(r, 200))
  })
  expect(host.querySelector(`input[aria-label="${t('bqCode')}"]`)).toBeNull()
  expect(host.textContent).toContain(t('menuThanksPaid'))
  expect(payPickupOrder).not.toHaveBeenCalled()
})

it('keeps the cart after failed balance verification and requires entering the code again', async () => {
  offerDeposit()
  vi.mocked(createStoreOrder).mockRejectedValueOnce({ isAxiosError: true, response: { status: 422, data: { message: 'Kode saldo tidak sesuai' } } })
  await render('/o/store-token?service=dine_in'); await openCart()
  await chooseOrderPay(t('rentalMemberBalance'))
  await enterBalanceCode()
  await sendContact()
  expect(host.textContent).toContain(t('menuYourOrder'))
  expect(host.querySelector(`input[aria-label="${t('bqCode')}"]`)).toHaveProperty('value', '')
  expect(payOrderWithDeposit).not.toHaveBeenCalled()
  await enterBalanceCode()
  await click(t('menuSendOrder'))
  expect(createStoreOrder).toHaveBeenCalledTimes(2)
})

it('uses the same descriptions and sends QRIS orders without a balance authorization', async () => {
  offerDeposit()
  await render('/o/store-token?service=dine_in'); await openCart()
  for (const key of ['menuDepositAfterConfirmNote', 'menuQrisOrderNote', 'menuCounterOrderNote'] as const) {
    expect(host.querySelector('[data-testid="order-pay"]')?.textContent).toContain(t(key))
  }
  await chooseOrderPay(t('menuPayQrisNow'))
  await sendContact()
  expect(createStoreOrder).toHaveBeenCalledWith('store-token', expect.objectContaining({ pay_at_counter: false }))
  expect(vi.mocked(createStoreOrder).mock.calls[0][1]).not.toHaveProperty('pay_with')
  expect(vi.mocked(createStoreOrder).mock.calls[0][1]).not.toHaveProperty('balance_code')
})

it('blocks balance checkout over the outlet limit and still lets the customer choose cashier payment', async () => {
  offerDeposit(true, 4000)
  await render('/o/store-token?service=dine_in'); await openCart()
  await chooseOrderPay(t('rentalMemberBalance'))
  const send = () => Array.from(host.querySelectorAll('button')).find(b => b.textContent?.includes(t('menuSendOrder')))!
  expect(send().disabled).toBe(true)
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(t('depositPayOverLimit', { max: formatCurrency(4000) }))
  await chooseOrderPay(t('menuPayAtCounterOption'))
  expect(send().disabled).toBe(false)
  await sendContact()
  expect(createStoreOrder).toHaveBeenCalledWith('store-token', expect.objectContaining({ pay_at_counter: true }))
  expect(payOrderWithDeposit).not.toHaveBeenCalled()
  expect(payPickupOrder).not.toHaveBeenCalled()
})

it('keeps QRIS and cashier choices when member balance is disabled at the outlet', async () => {
  vi.mocked(getStoreMenu).mockResolvedValue({ data: { data: { ...menu, prepay_dine_in: true } } } as never)
  await render('/o/store-token?service=dine_in'); await openCart()
  const methods = host.querySelector('[data-testid="order-pay"]')!
  expect(methods.querySelectorAll('[role="radio"]')).toHaveLength(2)
  expect(methods.textContent).not.toContain(t('rentalMemberBalance'))
  expect(methods.textContent).toContain(t('menuPayQrisNow'))
  expect(methods.textContent).toContain(t('menuPayAtCounterOption'))
})
