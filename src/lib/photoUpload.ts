/**
 * Mengecilkan foto sebelum dibaca server: tulisan menu dan nota tetap terbaca
 * di sisi terpanjang 1.800 piksel, dan unggahan beberapa ratus KB jauh lebih
 * cepat daripada foto kamera asli 5 MB (server menolak di atas 3,5 MB).
 */
export async function compressPhoto(file: File, maxSide = 1800, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('compress failed'))), 'image/jpeg', quality),
  )
}

/** Batas server: empat foto sekali baca. */
export const MAX_PHOTOS = 4

export async function photoForm(files: File[]): Promise<FormData> {
  const form = new FormData()
  const picked = files.slice(0, MAX_PHOTOS)
  for (let i = 0; i < picked.length; i++) {
    form.append('images', await compressPhoto(picked[i]), `foto-${i + 1}.jpg`)
  }
  return form
}

/** Baris CSV impor yang dibaca dari foto, untuk diperiksa sebelum disimpan. */
export interface CsvMenuRow {
  name: string
  category: string
  price: string
}

/** Membaca CSV template impor (tanpa tanda kutip bersarang yang rumit). */
export function parseMenuCsv(csv: string): CsvMenuRow[] {
  const lines = csv.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const split = (line: string) => {
    const out: string[] = []
    let cur = ''
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { cur += '"'; i++ } else quoted = !quoted
      } else if (ch === ',' && !quoted) {
        out.push(cur); cur = ''
      } else cur += ch
    }
    out.push(cur)
    return out
  }
  const header = split(lines[0])
  const col = (name: string) => header.indexOf(name)
  const [ni, ci, pi] = [col('product_name'), col('category'), col('sell_price')]
  return lines.slice(1).map(split).map((cells) => ({
    name: cells[ni] ?? '',
    category: cells[ci] ?? '',
    price: cells[pi] ?? '',
  }))
}
