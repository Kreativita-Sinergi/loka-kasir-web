/**
 * Lightweight JWT payload parser — no signature verification.
 *
 * The backend already verifies the token. On the client we only need the
 * claims (permissions, app_mode, role_id, exp) to drive the UI.
 * Never use this for access control decisions on the server.
 */

import type { AppMode, PermissionCode, AuthUser } from '@/types'

export interface JwtPayload {
  user_id?: string
  business_id?: string
  role_id?: number
  email?: string
  /**
   * Server mengirimnya sebagai SATU STRING dipisah koma
   * (`strings.Join(codes, ",")` di jwt_service.go), bukan array JSON.
   * Bentuk array ikut diterima supaya token lama maupun perubahan format
   * di kemudian hari tidak diam-diam mengosongkan izin. Lihat [toPermissions].
   */
  permissions?: string[] | string
  app_mode?: string
  exp?: number
  iss?: string
}

/**
 * Decodes a JWT and returns its payload object.
 * Returns null if the token is malformed.
 */
export function parseJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Base64url → Base64 → JSON
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='))
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}

/**
 * Melengkapi AuthUser dengan klaim yang hanya ada di dalam token.
 *
 * Dipakai oleh halaman login dan pendaftaran — keduanya menaruh sesi ke store
 * dengan cara yang sama, jadi logikanya tinggal di satu tempat supaya tidak
 * ada satu jalur masuk yang diam-diam kehilangan permissions.
 */
/**
 * Mengubah klaim `permissions` menjadi daftar kode yang sesungguhnya.
 *
 * Tanpa pemisahan ini, `user.permissions` tetap berupa STRING, dan
 * `permissions.includes(code)` di authStore berubah diam-diam dari
 * "apakah daftar ini memuat kode itu" menjadi "apakah teks ini memuat
 * potongan itu". Ia menjawab benar untuk sebagian besar kode hanya karena
 * kebetulan tidak ada kode yang menjadi potongan kode lain — jaminan yang
 * hilang pada hari seseorang menambahkan izin bernama mirip.
 */
export function toPermissions(claim?: string[] | string): PermissionCode[] {
  if (Array.isArray(claim)) return claim as PermissionCode[]
  if (typeof claim !== 'string') return []
  return claim
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean) as PermissionCode[]
}

export function hydrateUserFromToken(user: AuthUser): AuthUser {
  const payload = parseJwtPayload(user.token)
  return {
    ...user,
    permissions: toPermissions(payload?.permissions),
    app_mode: (payload?.app_mode as AppMode) ?? 'RETAIL',
  }
}

/**
 * Returns true if the token exists and is not yet expired.
 */
export function isTokenValid(token: string): boolean {
  const payload = parseJwtPayload(token)
  if (!payload?.exp) return false
  return payload.exp * 1000 > Date.now()
}
