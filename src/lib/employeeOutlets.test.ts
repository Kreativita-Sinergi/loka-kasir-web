import { describe, it, expect } from 'vitest'
import {
  assignmentFromIds, assignmentToIds, sameAssignment, isAssignmentEmpty,
  outletIdsForCreate, outletIdsForUpdate, assignedOutletNames, roleAlwaysAllOutlets,
} from './employeeOutlets'

describe('assignmentFromIds / assignmentToIds', () => {
  it('array kosong atau tidak ada = semua outlet', () => {
    expect(assignmentFromIds([])).toEqual({ all: true, ids: [] })
    expect(assignmentFromIds(undefined)).toEqual({ all: true, ids: [] })
    expect(assignmentFromIds(null)).toEqual({ all: true, ids: [] })
  })

  it('daftar outlet bolak-balik tanpa berubah', () => {
    const a = assignmentFromIds(['o1', 'o2'])
    expect(a).toEqual({ all: false, ids: ['o1', 'o2'] })
    expect(assignmentToIds(a)).toEqual(['o1', 'o2'])
  })

  it('"semua outlet" dikirim sebagai [] walau masih ada centang tersisa', () => {
    expect(assignmentToIds({ all: true, ids: ['o1'] })).toEqual([])
  })
})

describe('sameAssignment', () => {
  it('urutan tidak berpengaruh', () => {
    expect(sameAssignment({ all: false, ids: ['a', 'b'] }, { all: false, ids: ['b', 'a'] })).toBe(true)
  })
  it('semua outlet sama dengan semua outlet, apa pun sisa centangnya', () => {
    expect(sameAssignment({ all: true, ids: [] }, { all: true, ids: ['x'] })).toBe(true)
    expect(sameAssignment({ all: true, ids: [] }, { all: false, ids: ['x'] })).toBe(false)
  })
})

describe('isAssignmentEmpty', () => {
  it('menandai pilihan tanpa outlet', () => {
    expect(isAssignmentEmpty({ all: false, ids: [] })).toBe(true)
    expect(isAssignmentEmpty({ all: true, ids: [] })).toBe(false)
  })
})

describe('outletIdsForCreate', () => {
  it('mengirim pilihan untuk peran biasa', () => {
    expect(outletIdsForCreate({ all: false, ids: ['o1'] }, 'KASIR', true)).toEqual(['o1'])
    expect(outletIdsForCreate({ all: true, ids: [] }, 'KASIR', true)).toEqual([])
  })
  it('OWNER/ADMIN dan bisnis satu outlet selalu []', () => {
    expect(outletIdsForCreate({ all: false, ids: ['o1'] }, 'ADMIN', true)).toEqual([])
    expect(outletIdsForCreate({ all: false, ids: ['o1'] }, 'owner', true)).toEqual([])
    expect(outletIdsForCreate({ all: false, ids: ['o1'] }, 'KASIR', false)).toEqual([])
  })
})

describe('outletIdsForUpdate', () => {
  const initial = assignmentFromIds(['o1'])

  it('ubah tanpa menyentuh bagian outlet tidak mengirim field', () => {
    expect(outletIdsForUpdate(initial, { all: false, ids: ['o1'] }, 'KASIR', true)).toBeUndefined()
    // Dicentang lalu dikembalikan juga dihitung tidak berubah.
    expect(outletIdsForUpdate(assignmentFromIds([]), { all: true, ids: ['o2'] }, 'KASIR', true)).toBeUndefined()
  })

  it('mengirim daftar baru bila berubah', () => {
    expect(outletIdsForUpdate(initial, { all: false, ids: ['o1', 'o2'] }, 'KASIR', true)).toEqual(['o1', 'o2'])
  })

  it('kembali ke semua outlet dikirim sebagai []', () => {
    expect(outletIdsForUpdate(initial, { all: true, ids: ['o1'] }, 'KASIR', true)).toEqual([])
  })

  it('OWNER/ADMIN atau pemilih tersembunyi tidak menyentuh data', () => {
    expect(outletIdsForUpdate(initial, { all: true, ids: [] }, 'ADMIN', true)).toBeUndefined()
    expect(outletIdsForUpdate(initial, { all: true, ids: [] }, 'KASIR', false)).toBeUndefined()
  })
})

describe('roleAlwaysAllOutlets', () => {
  it('hanya OWNER dan ADMIN', () => {
    expect(roleAlwaysAllOutlets('OWNER')).toBe(true)
    expect(roleAlwaysAllOutlets('admin')).toBe(true)
    expect(roleAlwaysAllOutlets('MANAGER')).toBe(false)
    expect(roleAlwaysAllOutlets('')).toBe(false)
  })
})

describe('assignedOutletNames', () => {
  const outlets = [{ id: 'o1', name: 'Pusat' }, { id: 'o2', name: 'Cabang' }]
  it('null untuk semua outlet', () => {
    expect(assignedOutletNames([], outlets)).toBeNull()
    expect(assignedOutletNames(undefined, outlets)).toBeNull()
  })
  it('memetakan id ke nama dan melewati yang tak dikenal', () => {
    expect(assignedOutletNames(['o2', 'x', 'o1'], outlets)).toEqual(['Cabang', 'Pusat'])
  })
})
