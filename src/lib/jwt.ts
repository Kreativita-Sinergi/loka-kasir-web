/**
 * Lightweight JWT payload parser — no signature verification.
 *
 * The backend already verifies the token. On the client we only need the
 * claims (permissions, app_mode, role_id, exp) to drive the UI.
 * Never use this for access control decisions on the server.
 */

export interface JwtPayload {
  user_id?: string
  business_id?: string
  role_id?: number
  email?: string
  permissions?: string[]
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
 * Returns true if the token exists and is not yet expired.
 */
export function isTokenValid(token: string): boolean {
  const payload = parseJwtPayload(token)
  if (!payload?.exp) return false
  return payload.exp * 1000 > Date.now()
}
