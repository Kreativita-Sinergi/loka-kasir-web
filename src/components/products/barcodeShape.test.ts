import { describe, it, expect } from 'vitest'
import { RETAIL_BARCODE_SHAPE } from './BarcodeField'

/**
 * Aturan bentuk barcode hidup di DUA tempat: di sini, dan di migrasi server
 * yang memutuskan SKU mana yang layak disalin menjadi barcode
 * (`config/databaseConfig.go`, regex `^[0-9]{8}$|^[0-9]{12,14}$`).
 *
 * Dua salinan aturan yang sama pasti berbeda suatu hari. Test ini menahannya
 * dengan mengeja kasus yang harus dijawab sama oleh keduanya.
 */
describe('bentuk barcode ritel', () => {
  const diterima = [
    '12345670',        // EAN-8
    '012345678905',    // UPC-A, nol di depan harus tetap sah
    '8991002101005',   // EAN-13
    '18991002101002',  // ITF-14
  ]
  const ditolak = [
    'trss',            // yang memicu perbaikan ini
    'KOPI-250',        // SKU buatan tangan, bukan barcode
    '123456789',       // 9 digit: tidak ada standar ritelnya
    '1234567',         // 7 digit
    '123456789012345', // 15 digit
    '899100210100a',   // 13 karakter tapi ada huruf
    '',
    ' 8991002101005',  // spasi di depan; pemanggil sudah trim lebih dulu
  ]

  it.each(diterima)('menerima %s', code => {
    expect(RETAIL_BARCODE_SHAPE.test(code)).toBe(true)
  })

  it.each(ditolak)('menolak %s', code => {
    expect(RETAIL_BARCODE_SHAPE.test(code)).toBe(false)
  })
})
