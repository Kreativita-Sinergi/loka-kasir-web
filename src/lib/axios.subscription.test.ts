import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import api from './axios'
import { useSubscriptionStore } from '@/store/subscriptionStore'

const originalAdapter = api.defaults.adapter
beforeEach(() => {
  localStorage.setItem('token', 'valid-session')
  useSubscriptionStore.getState().reset()
})
afterEach(() => { api.defaults.adapter = originalAdapter })

function reject402(code: string) {
  api.defaults.adapter = async config => {
    throw new AxiosError('Payment Required', 'ERR_BAD_RESPONSE', config, undefined, {
      config, status: 402, statusText: 'Payment Required', headers: {},
      data: {
        status: false,
        message: 'Masa langganan Anda sudah berakhir. Perpanjang langganan untuk melanjutkan.',
        error: { code, field: 'membership' },
        data: { ended_at: null, last_plan: 'trial' },
      },
    })
  }
}

describe('402 SUBSCRIPTION_EXPIRED locks the business into view-only mode', () => {
  it.each(['SUBSCRIPTION_EXPIRED', 'NO_SUBSCRIPTION', 'TRIAL_EXPIRED'])('%s marks EXPIRED and opens the paywall without logging out', async code => {
    reject402(code)
    await expect(api.post('/transaction', {})).rejects.toBeInstanceOf(AxiosError)
    expect(useSubscriptionStore.getState().status).toBe('EXPIRED')
    expect(useSubscriptionStore.getState().paywallOpen).toBe(true)
    expect(localStorage.getItem('token')).toBe('valid-session')
  })

  it('concurrent rejections open only one paywall', async () => {
    reject402('SUBSCRIPTION_EXPIRED')
    await Promise.allSettled([api.post('/a', {}), api.put('/b', {}), api.delete('/c')])
    expect(useSubscriptionStore.getState().paywallOpen).toBe(true)
    useSubscriptionStore.getState().closePaywall()
    await expect(api.post('/d', {})).rejects.toBeInstanceOf(AxiosError)
    expect(useSubscriptionStore.getState().paywallOpen).toBe(false)
  })

  it('other 402 codes do not lock an active session', async () => {
    useSubscriptionStore.getState().setStatus('ACTIVE')
    reject402('PRO_PLAN_REQUIRED')
    await expect(api.get('/analytics')).rejects.toBeInstanceOf(AxiosError)
    expect(useSubscriptionStore.getState().status).toBe('ACTIVE')
    expect(useSubscriptionStore.getState().paywallOpen).toBe(false)
  })
})
