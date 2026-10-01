import { afterEach, describe, expect, it } from 'vitest'
import api, { publicApi } from './axios'
import type { AxiosAdapter } from 'axios'

const originalPrivate = api.defaults.adapter
const originalPublic = publicApi.defaults.adapter
afterEach(() => { api.defaults.adapter = originalPrivate; publicApi.defaults.adapter = originalPublic })

describe('aturan teks seluruh request web', () => {
  it('menjaga nama rak katalog sebagai key pencarian asli', async () => {
    api.defaults.adapter = async config => ({ config, status: 200, statusText: 'OK', headers: {}, data: { data: [{ name: 'makanan RINGAN', product_count: 2 }] } })
    const result = await api.get('/product/catalog/categories')
    expect(result.data.data[0].name).toBe('makanan RINGAN')
  })
  it.each([['admin', api], ['publik', publicApi]] as const)('berlaku saat simpan dan membaca data %s', async (_name, client) => {
    let sent: unknown
    const adapter: AxiosAdapter = async config => {
      sent = JSON.parse(config.data)
      return { config, status: 200, statusText: 'OK', headers: {}, data: { data: { name: 'nASI GORENG', customer_name: 'bUDI SANTOSO', token: 'AaBbC', status: 'PENDING' } } }
    }
    client.defaults.adapter = adapter
    const result = await client.post('/case-test', { name: 'nASI GORENG', password: 'AaBbC', items: [{ name: 'KOPI SUSU' }] })
    expect(sent).toEqual({ name: 'nasi goreng', password: 'AaBbC', items: [{ name: 'kopi susu' }] })
    expect(result.data.data).toEqual({ name: 'Nasi Goreng', customer_name: 'Budi Santoso', token: 'AaBbC', status: 'PENDING' })
  })
})
