import { useEffect, useRef, useState } from 'react'

/**
 * Pengingat waktu meja rental di HP pembeli: bunyi, getar, dan notifikasi
 * browser saat waktunya hampir habis dan saat habis.
 *
 * Batasnya jujur: ini halaman web, bukan aplikasi. Selama halamannya terbuka
 * (termasuk di tab belakang) pengingatnya berbunyi; begitu browsernya ditutup
 * atau HP-nya lama terkunci, browser menghentikan halamannya dan tidak ada yang
 * bisa berbunyi. Yang menjaga meja tetap alarm di HP kasir.
 */

export type RentalAlertKind = 'warn' | 'over'

const firedKey = (key: string) => `rental-alert:${key}`

/**
 * Sudah berbunyi untuk batas ini? Disimpan per HP supaya memuat ulang halaman
 * tidak membunyikan batas yang sama lagi. Penyimpanan bisa tidak tersedia
 * (mode privat) — saat itu pengingatnya paling buruk berbunyi dua kali.
 */
const wasFired = (key: string) => {
  try {
    return localStorage.getItem(firedKey(key)) === '1'
  } catch {
    return false
  }
}

const markFired = (key: string) => {
  try {
    localStorage.setItem(firedKey(key), '1')
  } catch {
    // Tanpa penyimpanan: cukup diingat selama halaman ini hidup.
  }
}

let audio: AudioContext | null = null

/**
 * Membuka kunci suara. Browser hanya mengizinkan bunyi setelah pembeli
 * menyentuh halaman, jadi ini dipanggil dari ketukan tombol.
 */
export const unlockRentalSound = () => {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    audio ??= new Ctx()
    void audio.resume()
  } catch {
    // Browser tanpa Web Audio: getar dan notifikasi tetap jalan.
  }
}

/** Dua nada pendek — cukup terdengar di ruang biliar tanpa berkas suara. */
const chime = (times: number) => {
  if (!audio || audio.state !== 'running') return
  const start = audio.currentTime
  for (let i = 0; i < times; i++) {
    const at = start + i * 0.35
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.frequency.value = i % 2 === 0 ? 880 : 660
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.4, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3)
    osc.connect(gain).connect(audio.destination)
    osc.start(at)
    osc.stop(at + 0.32)
  }
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

/**
 * Notifikasi sistem. Android Chrome menolak `new Notification()` — di sana
 * notifikasi harus lewat service worker, jadi itu dicoba lebih dulu.
 */
const showNotification = async (title: string, body: string, tag: string) => {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body,
    tag,
    renotify: true,
    icon: '/icon-192.png',
    vibrate: [300, 150, 300],
  }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, options)
      return
    }
  } catch {
    // Jatuh ke Notification biasa di bawah.
  }
  try {
    new Notification(title, options)
  } catch {
    // Browser ini tidak bisa menampilkan notifikasi dari halaman.
  }
}

/**
 * Membunyikan pengingat SEKALI untuk tiap batas. [key] membedakan batasnya —
 * sertakan durasi paket, supaya perpanjangan melahirkan pengingat baru.
 */
export function useRentalAlert(
  active: boolean,
  key: string,
  kind: RentalAlertKind,
  message: { title: string; body: string },
) {
  const fired = useRef(false)
  // Sentuhan apa pun di halaman membuka kunci suaranya, bukan hanya tombol
  // pengingat — pembeli yang tidak pernah mengetuknya tetap mendengar bunyi.
  useEffect(() => {
    document.addEventListener('pointerdown', unlockRentalSound, { once: true })
    return () => document.removeEventListener('pointerdown', unlockRentalSound)
  }, [])
  useEffect(() => {
    if (!active || fired.current || wasFired(key)) return
    fired.current = true
    markFired(key)
    chime(kind === 'over' ? 4 : 2)
    try {
      navigator.vibrate?.(kind === 'over' ? [400, 150, 400, 150, 400] : [300, 150, 300])
    } catch {
      // Getar tidak tersedia (iPhone, desktop).
    }
    void showNotification(message.title, message.body, key)
  }, [active, key, kind, message.title, message.body])
}

/** Izin notifikasi browser, diperbarui setelah pembeli menjawab. */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationsSupported() ? Notification.permission : 'unsupported',
  )
  const request = async () => {
    unlockRentalSound()
    if (!notificationsSupported()) return
    try {
      setPermission(await Notification.requestPermission())
    } catch {
      setPermission(Notification.permission)
    }
  }
  return { permission, request }
}
