import { describe, expect, it } from 'vitest'
import { addonSections, missingRequiredGroup, toggleAddon } from './modifierGroups'
import type { Product, ProductAttribute, ProductModifierGroup } from '@/types'

const attr = (id: string, group_id: string | null = null): ProductAttribute => ({
  id, name: id, price: 1000, image: null, is_available: true, is_active: true, group_id,
})
const group = (id: string, patch: Partial<ProductModifierGroup> = {}): ProductModifierGroup => ({
  id, name: id, select_type: 'MULTIPLE', is_required: false, max_select: null, ...patch,
})
const product = (attributes: ProductAttribute[], modifier_groups?: ProductModifierGroup[]) =>
  ({ attributes, modifier_groups }) as unknown as Product

describe('addonSections', () => {
  it('mengelompokkan per grup menurut urutan grup, modifier lepas di akhir', () => {
    const p = product(
      [attr('lepas'), attr('t1', 'topping'), attr('l0', 'level'), attr('l1', 'level')],
      [group('level'), group('topping')],
    )
    const s = addonSections(p)
    expect(s.map((x) => x.group?.id ?? null)).toEqual(['level', 'topping', null])
    expect(s[0].addons.map((a) => a.id)).toEqual(['l0', 'l1'])
  })

  it('server lama tanpa modifier_groups: semua modifier jadi satu kelompok lepas', () => {
    const s = addonSections(product([attr('a', 'hilang'), attr('b')]))
    expect(s).toHaveLength(1)
    expect(s[0].group).toBeNull()
    expect(s[0].addons).toHaveLength(2)
  })
})

describe('toggleAddon', () => {
  const level = { group: group('level', { select_type: 'SINGLE', is_required: true }), addons: [attr('l0'), attr('l1')] }

  it('pilih-satu wajib: tidak terisi sendiri, bertukar, tidak bisa dikosongkan', () => {
    let sel = toggleAddon(new Set(), level, 'l0')
    expect([...sel]).toEqual(['l0'])
    sel = toggleAddon(sel, level, 'l1')
    expect([...sel]).toEqual(['l1'])
    sel = toggleAddon(sel, level, 'l1')
    expect([...sel]).toEqual(['l1'])
  })

  it('pilih-beberapa berbatas menolak centang melebihi batas', () => {
    const topping = { group: group('t', { max_select: 2 }), addons: [attr('a'), attr('b'), attr('c')] }
    let sel = new Set<string>()
    for (const id of ['a', 'b', 'c']) sel = toggleAddon(sel, topping, id)
    expect([...sel].sort()).toEqual(['a', 'b'])
  })

  it('grup wajib yang belum dipilih dilaporkan', () => {
    const wajib = { group: group('saus', { is_required: true }), addons: [attr('s1')] }
    expect(missingRequiredGroup([wajib], new Set())?.id).toBe('saus')
    expect(missingRequiredGroup([wajib], new Set(['s1']))).toBeNull()
  })
})
