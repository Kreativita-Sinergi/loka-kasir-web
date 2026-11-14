import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AxiosError, type AxiosResponse } from 'axios'
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { publicApi } from '@/lib/axios'
import PublicQRAccess from './PublicQRAccess'

vi.mock('@/lib/axios', async () => {
  const { default: axios } = await import('axios')
  return { publicApi: axios.create() }
})
vi.mock('@/lib/i18n', () => ({ t: (key: string) => key }))

let refusal: string | null
let host: HTMLDivElement, root: Root
beforeEach(() => {
  ;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
  refusal = null
  publicApi.defaults.adapter = async (config) => {
    if (refusal) throw new AxiosError('Forbidden', 'ERR_BAD_REQUEST', config, undefined, {
      status: 403, data: { error: { code: refusal } }, config,
    } as AxiosResponse)
    return { status: 200, data: {}, headers: {}, config, statusText: 'OK' }
  }
})
afterEach(() => { act(() => root.unmount()); host.remove() })

function Page() {
  useEffect(() => { void publicApi.get('/public/menu/token').catch(() => {}) }, [])
  return <div>
    <p>Cached menu and balance</p>
    <button onClick={() => { void publicApi.post('/public/pay/order').catch(() => {}) }}>Pay</button>
  </div>
}
async function mount() {
  await act(async () => { root.render(<MemoryRouter initialEntries={['/menu/old']}>
    <Link to="/menu/renewed">Another QR</Link>
    <Routes><Route element={<PublicQRAccess />}>
      <Route path="/menu/:token" element={<Page />} />
    </Route></Routes>
  </MemoryRouter>) })
}

it('replaces the entire QR page when the first request is denied', async () => {
  refusal = 'QR_PRO_REQUIRED'
  await mount()
  expect(host.querySelector('[role=alert]')).not.toBeNull()
  expect(host.textContent).toContain('errQrProRequired')
  expect(host.textContent).not.toContain('Cached menu and balance')
  expect(host.querySelector('button')).toBeNull()
})

it('closes an already-open checkout after expiry and resets for another QR', async () => {
  await mount()
  expect(host.querySelector('button')).not.toBeNull()
  refusal = 'QR_PRO_REQUIRED'
  await act(async () => { host.querySelector('button')!.click() })
  expect(host.querySelector('[role=alert]')).not.toBeNull()
  refusal = null
  await act(async () => { host.querySelector('a')!.click() })
  expect(host.textContent).toContain('Cached menu and balance')
  expect(host.querySelector('[role=alert]')).toBeNull()
})

it('leaves ordinary errors to the page error handler', async () => {
  refusal = 'SLOT_TAKEN'
  await mount()
  expect(host.textContent).toContain('Cached menu and balance')
  expect(host.querySelector('[role=alert]')).toBeNull()
})
