import type { ComponentType } from 'react'
import * as Loka from '@/components/icons/loka'
import type { LokaIconProps } from '@/components/icons/loka'

type Glyph = ComponentType<LokaIconProps>

// Urutan penting: yang lebih khusus lebih dulu ("es teh" minuman, bukan
// makanan; "paket nasi" paket). Dicocokkan per kata/awal kata.
const RULES: [RegExp, Glyph][] = [
  [/\b(sewa|rental|biliar|billiard|ps\d?|playstation|meja|jam main|lapangan|futsal|badminton)/, Loka.Gamepad],
  [/\b(paket|bundle|combo|hemat)/, Loka.Box],
  [/\b(minum|drink|beverage|kopi|coffee|teh|tea|es |jus|juice|susu|milk|soda|air|lemon|latte|matcha|boba|sirup)/, Loka.Cup],
  [/\b(kue|cake|roti|bread|dessert|manis|puding|donat|snack|camilan|cemilan|keripik|gorengan|titip)/, Loka.Cake],
  [/\b(obat|apotek|vitamin|medic)/, Loka.Pill],
  [/\b(rokok|lain)/, Loka.Bag],
  [/\b(makan|food|nasi|mie|mi |bakso|soto|ayam|ikan|sate|geprek|goreng|lauk|sayur|rice|noodle)/, Loka.Utensils],
]

/**
 * Ikon Loka untuk produk tanpa foto: ditebak dari nama produk dulu ("Lemon
 * Tea" di kategori "Lainnya" tetap cangkir), lalu dari nama kategorinya.
 */
export function productGlyph(category: string | null | undefined, product = ''): Glyph {
  for (const text of [product, category ?? '']) {
    const s = ` ${text.toLowerCase()} `
    for (const [re, glyph] of RULES) if (re.test(s)) return glyph
  }
  return Loka.Cloche
}
