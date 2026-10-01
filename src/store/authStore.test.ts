import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser, Membership } from '@/types'

beforeEach(() => { localStorage.clear(); vi.resetModules() })
afterEach(() => { localStorage.clear() })

describe('pemulihan sesi', () => {
  it('cache profil disimpan lowercase dan dipulihkan dengan awal kata besar', async () => {
    let store = (await import('./authStore')).useAuthStore
    store.getState().setAuth({ id: 'u1', business: { business_name: 'TOKO MAKMUR', owner_name: 'bUDI SANTOSO' } } as AuthUser, 'AaBbC')
    expect(JSON.parse(localStorage.getItem('user')!).business.business_name).toBe('toko makmur')
    expect(store.getState().user?.business.business_name).toBe('Toko Makmur')
    vi.resetModules()
    store = (await import('./authStore')).useAuthStore
    expect(store.getState().user?.business.owner_name).toBe('Budi Santoso')
    expect(store.getState().token).toBe('AaBbC')
  })
  it.each(['{rusak', 'null', '"user"', '{}'])('tidak tetap login dengan profil tersimpan invalid: %s', async raw => {
    localStorage.setItem('token', 'old-token')
    localStorage.setItem('user', raw)
    const { useAuthStore } = await import('./authStore')
    expect(useAuthStore.getState().isAuthenticated()).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
  })
  it('memperbarui akses Pro dan sisa hari meskipun tier dan tanggal akhir sama', async () => {
    const { useAuthStore } = await import('./authStore')
    const membership: Membership = { id: 'm1', type: 'trial', tier: 'trial', is_active: true, is_pro: true, days_remaining: 1, start_date: '2026-09-01', end_date: '2026-10-02' }
    useAuthStore.getState().setAuth({ id: 'u1', business: { membership } } as AuthUser, 'token')
    useAuthStore.getState().setMembership({ ...membership, is_pro: false, days_remaining: 0 })
    expect(useAuthStore.getState().user?.business.membership?.is_pro).toBe(false)
    expect(JSON.parse(localStorage.getItem('user')!).business.membership.days_remaining).toBe(0)
  })
})
