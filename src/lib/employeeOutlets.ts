/**
 * Penugasan karyawan per outlet.
 *
 * Server menyimpan penugasan sebagai `outlet_ids`, dan array KOSONG berarti
 * "bertugas di semua outlet" — itulah keadaan setiap karyawan lama. Formulir
 * memakai bentuk { all, ids } supaya centang "Semua outlet" bisa dilepas tanpa
 * kehilangan daftar outlet yang tadinya dicentang.
 */
export interface OutletAssignment {
  all: boolean
  ids: string[]
}

// OWNER dan ADMIN selalu boleh ke semua outlet di server, apa pun isi
// penugasannya — memilih outlet untuk mereka hanya memberi kesan palsu.
const ALL_OUTLET_ROLES = new Set(['OWNER', 'ADMIN'])

export const roleAlwaysAllOutlets = (roleCode: string | null | undefined) =>
  ALL_OUTLET_ROLES.has((roleCode ?? '').toUpperCase())

export function assignmentFromIds(ids: readonly string[] | null | undefined): OutletAssignment {
  const list = ids ?? []
  return { all: list.length === 0, ids: [...list] }
}

export function assignmentToIds(a: OutletAssignment): string[] {
  return a.all ? [] : [...a.ids]
}

export function sameAssignment(a: OutletAssignment, b: OutletAssignment): boolean {
  if (a.all || b.all) return a.all === b.all
  const sa = new Set(a.ids)
  const sb = new Set(b.ids)
  return sa.size === sb.size && [...sa].every(id => sb.has(id))
}

/** "Bukan semua outlet" tapi tidak satu pun dicentang — server akan membacanya sebagai semua. */
export const isAssignmentEmpty = (a: OutletAssignment) => !a.all && a.ids.length === 0

/** Isi `outlet_ids` untuk karyawan baru: selalu dikirim, `[]` = semua outlet. */
export function outletIdsForCreate(a: OutletAssignment, roleCode: string, pickerShown: boolean): string[] {
  if (!pickerShown || roleAlwaysAllOutlets(roleCode)) return []
  return assignmentToIds(a)
}

/**
 * Isi `outlet_ids` untuk ubah karyawan, atau `undefined` = jangan kirim.
 *
 * Server membaca field yang tidak ada sebagai "tidak berubah". Mengirimnya
 * hanya saat bagian ini benar-benar diubah menjaga penyimpanan nama atau PIN
 * agar tidak ikut menimpa penugasan — termasuk penugasan yang tidak tampil di
 * formulir ini (peran OWNER/ADMIN, atau bisnis yang baru punya satu outlet).
 */
export function outletIdsForUpdate(
  initial: OutletAssignment,
  current: OutletAssignment,
  roleCode: string,
  pickerShown: boolean,
): string[] | undefined {
  if (!pickerShown || roleAlwaysAllOutlets(roleCode)) return undefined
  if (sameAssignment(initial, current)) return undefined
  return assignmentToIds(current)
}

/**
 * Nama outlet tempat karyawan bertugas, dipisah koma. `null` berarti semua
 * outlet. Outlet yang sudah tidak ada di daftar dilewati saja.
 */
export function assignedOutletNames(
  ids: readonly string[] | null | undefined,
  outlets: ReadonlyArray<{ id: string; name: string }>,
): string[] | null {
  if (!ids || ids.length === 0) return null
  const byId = new Map(outlets.map(o => [o.id, o.name]))
  return ids.map(id => byId.get(id)).filter((n): n is string => !!n)
}
