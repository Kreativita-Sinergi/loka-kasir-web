import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import api from './axios'
import { useSubscriptionStore } from '@/store/subscriptionStore'

const originalAdapter = api.defaults.adapter
beforeEach(() => {
  localStorage.setItem('token', 'valid-session')
  useSubscriptionStore.setState({ status: 'FREE' })
})
afterEach(() => { api.defaults.adapter = originalAdapter })

describe('Free billing errors preserve access', () => {
  it.each(['FREE_TX_LIMIT', 'FREE_PLAN_RESTRICTED', 'PRO_PLAN_REQUIRED', 'NO_SUBSCRIPTION', 'TRIAL_EXPIRED', 'SUBSCRIPTION_EXPIRED'])('%s does not lock or log out the user', async code => {
    api.defaults.adapter = async config => {
      throw new AxiosError('Limit reached', 'ERR_BAD_RESPONSE', config, undefined, {
        config, status: 402, statusText: 'Payment Required', headers: {},
        data: { error: { code, details: 'Batas tercapai' } },
      })
    }
    await expect(api.post('/transaction', {})).rejects.toBeInstanceOf(AxiosError)
    expect(useSubscriptionStore.getState().status).toBe('FREE')
    expect(localStorage.getItem('token')).toBe('valid-session')
  })

  it('premium feature rejection does not change a paid session', async () => {
    useSubscriptionStore.setState({ status: 'ACTIVE' })
    api.defaults.adapter = async config => {
      throw new AxiosError('Unavailable', 'ERR_BAD_RESPONSE', config, undefined, {
        config, status: 402, statusText: 'Payment Required', headers: {},
        data: { error: { code: 'PRO_PLAN_REQUIRED' } },
      })
    }
    await expect(api.get('/analytics')).rejects.toBeInstanceOf(AxiosError)
    expect(useSubscriptionStore.getState().status).toBe('ACTIVE')
  })
})
