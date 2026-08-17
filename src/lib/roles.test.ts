import { describe, it, expect, afterEach } from 'vitest'
import { roleLabel } from './roles'
import { setActiveLocale } from './i18n'

afterEach(() => setActiveLocale('id'))

describe('roleLabel', () => {
  it('menerjemahkan peran bawaan lewat kodenya, bukan namanya', () => {
    setActiveLocale('ja')
    // `name` dari server tetap "Kasir" — bahasa Indonesia, karena ia isi
    // database hasil seeder. Yang dibaca harus kodenya.
    expect(roleLabel({ code: 'KASIR', name: 'Kasir' })).toBe('レジ担当')
    expect(roleLabel({ code: 'WAITERS', name: 'Waiters' })).toBe('ホール担当')
    expect(roleLabel({ code: 'OWNER', name: 'Owner' })).toBe('オーナー')
  })

  it('mengikuti bahasa yang sedang aktif', () => {
    const role = { code: 'WAREHOUSE', name: 'Warehouse' }
    setActiveLocale('id')
    expect(roleLabel(role)).toBe('Gudang')
    setActiveLocale('ms')
    expect(roleLabel(role)).toBe('Gudang')
    setActiveLocale('en')
    expect(roleLabel(role)).toBe('Warehouse')
  })

  it('membiarkan peran buatan pemilik apa adanya', () => {
    setActiveLocale('ja')
    // Peran yang dibuat sendiri tidak punya terjemahan, dan nama yang diketik
    // pemilik adalah jawaban yang benar — bukan kode mentah atau teks kosong.
    expect(roleLabel({ code: 'BARISTA', name: 'Barista' })).toBe('Barista')
    expect(roleLabel({ code: null, name: 'Kepala Dapur' })).toBe('Kepala Dapur')
  })

  it('menjawab teks kosong untuk peran yang tidak ada', () => {
    expect(roleLabel(null)).toBe('')
    expect(roleLabel(undefined)).toBe('')
  })

  it('tidak peka huruf besar-kecil pada kode', () => {
    setActiveLocale('ja')
    expect(roleLabel({ code: 'owner', name: 'Owner' })).toBe('オーナー')
  })
})
