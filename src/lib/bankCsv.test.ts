import { describe, expect, it } from 'vitest'
import { bankAmount, previewBankRows, readBankCsv } from './bankCsv'

describe('bank CSV preview', () => {
  it('normalizes Indonesian dates and amounts and preserves embedded statement text', () => {
    const csv = '\uFEFFtanggal;kredit;referensi;keterangan\r\n18/11/2026;"1.250,50";A-32;"QRIS\nToko ""Melati"""\r\n'
    const preview = previewBankRows(readBankCsv(csv, ';'), { date: 0, amount: 1, reference: 2, description: 3 }, 'dmy', 'comma', 2)
    expect(preview.errors).toEqual([])
    expect(preview.items).toEqual([{ date: '2026-11-18', amount: '1250.5', reference: 'A-32', description: 'QRIS\nToko "Melati"' }])
  })

  it('flags invalid dates and money instead of silently coercing a bank entry', () => {
    const rows = readBankCsv('date,amount\n2026-02-30,500\n2026-11-18,-500\n2026-11-18,0.001', ',')
    const preview = previewBankRows(rows, { date: 0, amount: 1, reference: -1, description: -1 }, 'iso', 'dot', 2)
    expect(preview.errors).toHaveLength(3)
    expect(preview.items).toEqual([])
    expect(bankAmount('1000.00', 'dot', 0)).toEqual({ major: '1000', minor: 1000 })
  })
})
