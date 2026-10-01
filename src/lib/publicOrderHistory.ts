/**
 * Riwayat pesanan pembeli di menu publik — disimpan di browser HP-nya sendiri.
 *
 * Tanpa akun: kuncinya adalah UUID pesanan, yang memang sudah menjadi kunci
 * halaman status pesanan di server. Yang disimpan hanya penunjuk + sedikit
 * ringkasan untuk daftar; status terkini selalu diambil ulang dari server.
 *
 * localStorage bisa kosong atau melempar (mode privat, data situs diblokir),
 * jadi setiap akses dibungkus try/catch dan halaman tetap jalan tanpanya.
 */

import { normalizeTextData } from './textCase'

export interface SavedPublicOrder {
  id: string
  /** Token QR meja / link toko — untuk kembali ke menu yang sama. */
  token: string
  mode: 'table' | 'pickup'
  businessName: string
  outletName: string
  /** Nomor meja; kosong untuk pesan online. */
  tableNumber?: string
  createdAt: string
}

export interface SavedContact {
  name: string
  phone: string
}

const ORDERS_KEY = 'loka.public.orders'
const CONTACT_KEY = 'loka.public.contact'
const MAX_ORDERS = 30
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export function loadOrders(): SavedPublicOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY)
    const list = raw ? (JSON.parse(raw) as SavedPublicOrder[]) : []
    const cutoff = Date.now() - MAX_AGE_MS
    return Array.isArray(list)
      ? normalizeTextData(list.filter((o) => o && o.id && new Date(o.createdAt).getTime() > cutoff), 'display')
      : []
  } catch {
    return []
  }
}

export function saveOrder(order: SavedPublicOrder) {
  try {
    const list = [order, ...loadOrders().filter((o) => o.id !== order.id)].slice(0, MAX_ORDERS)
    localStorage.setItem(ORDERS_KEY, JSON.stringify(normalizeTextData(list, 'storage')))
  } catch {
    // Riwayat hanya kenyamanan; pesanannya sendiri sudah tersimpan di server.
  }
}

export function loadContact(): SavedContact {
  try {
    const raw = localStorage.getItem(CONTACT_KEY)
    const c = raw ? (JSON.parse(raw) as Partial<SavedContact>) : {}
    return normalizeTextData({ name: c.name ?? '', phone: c.phone ?? '' }, 'display')
  } catch {
    return { name: '', phone: '' }
  }
}

export function saveContact(contact: SavedContact) {
  try {
    localStorage.setItem(CONTACT_KEY, JSON.stringify(normalizeTextData(contact, 'storage')))
  } catch {
    // Diabaikan: pembeli hanya perlu mengetik ulang lain kali.
  }
}
