import { expect, it } from 'vitest'
import { parseMenuCsv } from '@/lib/photoUpload'

it('membaca baris CSV impor, termasuk nama bertanda kutip', () => {
  const rows = parseMenuCsv(
    'product_name,sku,barcode,category,base_price,sell_price,initial_stock,min_stock,track_stock,is_taxable,is_weight_based,price_from_extras\n' +
      'Seblak Original,,,Aneka Seblak,,12000,,,false,,,false\n' +
      '"Es Teh ""Jumbo"", Dingin",,,Minuman,,6000,,,false,,,false\n',
  )
  expect(rows).toEqual([
    { name: 'Seblak Original', category: 'Aneka Seblak', price: '12000' },
    { name: 'Es Teh "Jumbo", Dingin', category: 'Minuman', price: '6000' },
  ])
})
