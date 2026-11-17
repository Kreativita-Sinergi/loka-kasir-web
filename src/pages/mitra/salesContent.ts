import type { SalesContent, SalesContentMedia } from '@/api/sales'
import { salesContentAssets } from '@/data/salesContentAssets'

export const SALES_TERMS_VERSION = '2026-10-26'

export interface SalesShareContext { active: boolean; code: string; link: string }

export const salesContentTitle = (item: SalesContent) => item.caption.split('\n').find((line) => line.trim())?.trim() || 'Konten Loka Kasir'

// Official HD copies remain available after Instagram's archive replaces its
// delivery copies with smaller WebP files. Match by stable media identity.
export const salesContentImageURL = (media: SalesContentMedia) => salesContentAssets[media.id] || media.url

export function salesContentCaption(item: SalesContent, channel: 'instagram' | 'threads', vars: SalesShareContext) {
  const original = channel === 'threads' ? item.threads_text : item.caption
  if (!original.trim()) return ''
  if (!vars.active) return original.trim()
  const suffix = `\n\nCoba Loka Kasir lewat link saya:\n${vars.link}`
  const limit = channel === 'threads' ? 500 : 2200
  return original.trim().length + suffix.length <= limit ? original.trim() + suffix : original.trim()
}

async function imageForDownload(media: SalesContentMedia): Promise<Uint8Array> {
  const response = await fetch(salesContentImageURL(media), { credentials: 'omit', referrerPolicy: 'no-referrer' })
  if (!response.ok) throw new Error('Gambar belum dapat diunduh. Silakan coba lagi.')
  const blob = await response.blob()
  if (blob.type === 'image/jpeg') return new Uint8Array(await blob.arrayBuffer())
  if (!blob.type.startsWith('image/')) throw new Error('Berkas gambar tidak tersedia.')
  // Older published posts can be delivered as WebP. Export actual JPEG bytes
  // rather than merely renaming a WebP file, so the kit is ready for Instagram.
  const bitmap = await createImageBitmap(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Gambar tidak dapat diproses di perangkat ini.')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0)
    const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Gambar gagal disiapkan.')), 'image/jpeg', 0.95))
    return new Uint8Array(await jpeg.arrayBuffer())
  } finally { bitmap.close() }
}

export async function createSalesContentZip(item: SalesContent, vars: SalesShareContext, loadImage = imageForDownload) {
  const { zipSync, strToU8 } = await import('fflate')
  const ordered = [...item.media].sort((a, b) => a.position - b.position)
  if (!ordered.length) throw new Error('Konten belum memiliki gambar.')
  const images = await Promise.all(ordered.map(loadImage))
  const files: Record<string, Uint8Array> = {}
  images.forEach((bytes, index) => { files[`${String(index + 1).padStart(2, '0')}.jpg`] = bytes })
  files['caption-instagram.txt'] = strToU8(salesContentCaption(item, 'instagram', vars))
  const threads = salesContentCaption(item, 'threads', vars)
  if (threads) files['caption-threads.txt'] = strToU8(threads)
  files['baca-dulu.txt'] = strToU8(`Materi resmi Loka Kasir\n${salesContentTitle(item)}\n\nUnggah gambar sesuai urutan nomor, lalu gunakan caption yang disertakan. Sesuaikan waktu pemakaian untuk materi musiman.\n${vars.active ? 'Tautan pribadi Anda sudah ditambahkan jika muat batas caption.' : 'Akun Anda masih menunggu aktivasi; tautan referral pribadi tersedia setelah akun aktif.'}`)
  return zipSync(files, { level: 0 })
}

export async function downloadSalesContent(item: SalesContent, vars: SalesShareContext) {
  const bytes = await createSalesContentZip(item, vars)
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/zip' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `loka-kasir-${item.id.slice(0, 8)}.zip`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
