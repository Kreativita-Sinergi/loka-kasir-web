import { describe, expect, it } from 'vitest'
import { displayedText, normalizeCsvText, normalizeTextData, storedText } from './textCase'

describe('kapitalisasi data', () => {
  it('menyimpan huruf kecil dan menampilkan setiap awal kata besar', () => {
    expect(storedText('nASI GORENG SPESIAL')).toBe('nasi goreng spesial')
    expect(displayedText('nASI GORENG SPESIAL')).toBe('Nasi Goreng Spesial')
    expect(displayedText('  ÉCLAIR\nroti-manis')).toBe('  Éclair\nRoti-Manis')
  })
  it('mencakup objek bersarang, varian, supplier dan catatan tanpa mengubah objek asal', () => {
    const source = { name: 'BERAS MERAH', variants: [{ name: 'KEMASAN KECIL' }], supplier_name: 'TOKO MAKMUR', notes: 'KIRIM BESOK', count: 3, deleted_at: null }
    expect(normalizeTextData(source, 'storage')).toEqual({ name: 'beras merah', variants: [{ name: 'kemasan kecil' }], supplier_name: 'toko makmur', notes: 'KIRIM BESOK', count: 3, deleted_at: null })
    expect(normalizeTextData(source, 'display').variants[0].name).toBe('Kemasan Kecil')
    expect(source.name).toBe('BERAS MERAH')
  })
  it('menjaga password, token, enum, barcode, ID, simbol satuan dan URL', () => {
    const source = { password: 'AbC123!', new_password: 'XyZ987', token: 'AaBbC', code: 'OWNER', sku: 'SKU-AbC', barcodes: ['AbC-123'], id: 'CaseID', unit_alias: 'mL', image: 'data:image/png;base64,AaBbC', url: 'https://example.com/AbC', status: 'PENDING' }
    expect(normalizeTextData(source, 'storage')).toEqual(source)
    expect(normalizeTextData(source, 'display')).toEqual(source)
    const prose = 'LIHAT https://example.com/AbC?Key=XyZ SEKARANG'
    expect(storedText(prose)).toBe('lihat https://example.com/AbC?Key=XyZ sekarang')
    expect(displayedText(prose)).toBe('Lihat https://example.com/AbC?Key=XyZ Sekarang')
  })
  it('email disimpan lowercase dan tetap terbaca sebagai email', () => {
    const source = { email: 'ADMIN@TOKO.ID', username: 'KasirSatu' }
    expect(normalizeTextData(source, 'storage')).toEqual({ email: 'admin@toko.id', username: 'kasirsatu' })
    expect(normalizeTextData({ email: 'admin@toko.id' }, 'display').email).toBe('admin@toko.id')
  })
  it('tidak mengubah file, FormData, tanggal, atau alasan status pesanan', () => {
    const payload = new FormData(); payload.append('name', 'File ASLI')
    expect(normalizeTextData(payload, 'storage')).toBe(payload)
    const date = new Date()
    expect(normalizeTextData(date, 'display')).toBe(date)
    expect(normalizeTextData({ canceled_reason: 'Pembeli tidak datang' }, 'display').canceled_reason).toBe('Pembeli tidak datang')
  })
})

describe('impor CSV', () => {
  it('menormalkan teks dengan koma dan newline dalam sel, menjaga SKU dan nominal', () => {
    const source = '\uFEFFname,sku,description,unit_name,initial_stock\r\n"BERAS, MERAH",SKU-AbC,"ENAK\nUNTUK SEMUA",KG,2.5\r\n'
    expect(normalizeCsvText(source)).toBe('\uFEFFname,sku,description,unit_name,initial_stock\r\n"beras, merah",SKU-AbC,"enak\nuntuk semua",kg,2.5\r\n')
  })
  it('menjaga kutip ganda dan tidak mencoba memperbaiki CSV yang rusak', () => {
    expect(normalizeCsvText('name,sku\n"KOPI ""SUSU""",AbC')).toBe('name,sku\n"kopi ""susu""",AbC')
    expect(normalizeCsvText('name\n"BELUM TUTUP')).toBe('name\n"BELUM TUTUP')
  })
})

describe('catatan tidak diubah hurufnya', () => {
  it('disimpan dan ditampilkan persis seperti diketik', () => {
    const source = { note: 'kurang gula, es dipisah', notes: 'Antar ke Meja 3', items: [{ note: 'tanpa sambal' }] }
    expect(normalizeTextData(source, 'storage')).toEqual(source)
    expect(normalizeTextData(source, 'display')).toEqual(source)
  })
})
