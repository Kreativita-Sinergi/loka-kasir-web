import { describe, it, expect } from 'vitest'
import { parseJwtPayload, isTokenValid, toPermissions } from './jwt'

// A real JWT with payload { "user_id": "abc", "exp": 9999999999 }
// Header: {"alg":"HS256","typ":"JWT"}, Payload: {"user_id":"abc","exp":9999999999}
const FAR_FUTURE_EXP = 9999999999
const makeToken = (payload: object) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${header}.${body}.fakesig`
}

describe('parseJwtPayload', () => {
  it('parses a valid JWT and returns payload', () => {
    const token = makeToken({ user_id: 'abc', exp: FAR_FUTURE_EXP })
    const payload = parseJwtPayload(token)
    expect(payload).not.toBeNull()
    expect(payload?.user_id).toBe('abc')
    expect(payload?.exp).toBe(FAR_FUTURE_EXP)
  })

  it('returns null for a malformed token (not 3 parts)', () => {
    expect(parseJwtPayload('not.a')).toBeNull()
    expect(parseJwtPayload('only-one-part')).toBeNull()
  })

  it('returns null for invalid base64 payload', () => {
    expect(parseJwtPayload('header.!!!invalid!!!.sig')).toBeNull()
  })

  it('parses token with permissions array', () => {
    const token = makeToken({ permissions: ['pos.create_order', 'reports.view'], exp: FAR_FUTURE_EXP })
    const payload = parseJwtPayload(token)
    expect(payload?.permissions).toEqual(['pos.create_order', 'reports.view'])
  })

  it('parses token with app_mode', () => {
    const token = makeToken({ app_mode: 'FNB', exp: FAR_FUTURE_EXP })
    expect(parseJwtPayload(token)?.app_mode).toBe('FNB')
  })
})

describe('isTokenValid', () => {
  it('returns true for a token with exp far in the future', () => {
    const token = makeToken({ exp: FAR_FUTURE_EXP })
    expect(isTokenValid(token)).toBe(true)
  })

  it('returns false for an expired token', () => {
    const token = makeToken({ exp: 1000000 }) // past
    expect(isTokenValid(token)).toBe(false)
  })

  it('returns false for a token without exp', () => {
    const token = makeToken({ user_id: 'abc' })
    expect(isTokenValid(token)).toBe(false)
  })

  it('returns false for a malformed token', () => {
    expect(isTokenValid('bad.token')).toBe(false)
  })

  it('uses exp * 1000 comparison (seconds vs milliseconds)', () => {
    // exp exactly at now — should be invalid
    const nowSeconds = Math.floor(Date.now() / 1000) - 1
    const token = makeToken({ exp: nowSeconds })
    expect(isTokenValid(token)).toBe(false)
  })
})

/**
 * Server menaruh izin di token sebagai SATU STRING dipisah koma
 * (`strings.Join(codes, ",")` di jwt_service.go), sementara web
 * menganggapnya array.
 *
 * Akibatnya `permissions.includes(code)` di authStore berubah diam-diam dari
 * "apakah daftar ini memuat kode itu" menjadi "apakah teks ini memuat
 * potongan itu". Ia menjawab benar selama tidak ada kode yang menjadi
 * potongan kode lain — jaminan yang tidak pernah ditulis di mana pun dan
 * hilang pada hari seseorang menambahkan izin bernama mirip.
 */
describe('toPermissions', () => {
  it('memecah klaim string berkoma menjadi daftar kode', () => {
    expect(toPermissions('inventory.view,inventory.stock_in')).toEqual([
      'inventory.view',
      'inventory.stock_in',
    ])
  })

  it('tidak lagi mencocokkan potongan kode', () => {
    const perms = toPermissions('inventory.view,inventory.stock_in')
    expect(perms.includes('inventory.stock' as never)).toBe(false)
    expect(perms.includes('inventory.view')).toBe(true)
  })

  it('menerima bentuk array apa adanya', () => {
    expect(toPermissions(['reports.view'])).toEqual(['reports.view'])
  })

  it('klaim kosong atau hilang menjadi daftar kosong', () => {
    expect(toPermissions('')).toEqual([])
    expect(toPermissions(undefined)).toEqual([])
  })

  it('membuang spasi di sekitar kode', () => {
    expect(toPermissions('reports.view, inventory.view ')).toEqual([
      'reports.view',
      'inventory.view',
    ])
  })
})
