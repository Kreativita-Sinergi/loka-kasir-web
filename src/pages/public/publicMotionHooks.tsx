/**
 * Pengait & pengaturan gerak menu publik — dipisah dari komponennya supaya
 * Fast Refresh Vite tetap berjalan (berkas komponen hanya mengekspor komponen).
 */
import { useEffect, useRef, useState, type RefObject } from 'react'
import { useReducedMotion, type FeatureBundle, type Transition } from 'motion/react'
import { FlyGhostView, type FlyGhost } from './FlyGhost'

// ─── Pemuatan fitur ──────────────────────────────────────────────────────────

let featuresPromise: Promise<FeatureBundle> | null = null
let featuresReady = false

/** Paket fitur `motion` (gestur, drag, layout) untuk `LazyMotion` — dimuat sekali. */
export const loadMotionFeatures = () =>
  (featuresPromise ??= import('./motionFeatures').then((x) => { featuresReady = true; return x.default }))

/**
 * Benar setelah paket fitur tiba. Sebelum itu komponen `m` hanya memakai gaya
 * `initial`-nya tanpa pernah beranjak — kartu dengan `opacity: 0` akan tak
 * terlihat. Animasi masuk dipasang hanya bila sudah siap; tampilan pertama di
 * jaringan lambat tetap polos tetapi lengkap.
 */
export function useMotionReady() {
  const [ready, setReady] = useState(featuresReady)
  useEffect(() => {
    if (ready) return
    let alive = true
    void loadMotionFeatures().then(() => { if (alive) setReady(true) })
    return () => { alive = false }
  }, [ready])
  return ready
}

/** Pegas yang terasa "ringan": cepat menetap tanpa pantulan berlebih. */
export const springSnappy: Transition = { type: 'spring', stiffness: 520, damping: 32, mass: 0.8 }
/** Pegas untuk panel besar (lembar bawah, bilah keranjang). */
export const springSheet: Transition = { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }

/**
 * Bayangan kecil produk yang melesat dari kartu menu ke ikon keranjang di
 * bilah bawah. Mengembalikan `fly(el, …)` untuk dipanggil saat menambah, dan
 * `layer` yang dirender sekali di akar halaman. `onLand` dipanggil setiap
 * bayangan mendarat — dipakai untuk memantulkan ikon keranjang.
 */
export function useFlyToCart(targetRef: RefObject<HTMLElement | null>, onLand?: () => void) {
  const reduce = useReducedMotion()
  const [ghosts, setGhosts] = useState<FlyGhost[]>([])
  const seq = useRef(0)

  const fly = (source: Element | null | undefined, meta: { image?: string | null; label: string }) => {
    if (reduce || !source) return
    const from = source.getBoundingClientRect()
    if (from.width === 0 && from.height === 0) return
    seq.current += 1
    setGhosts((g) => [...g, { id: seq.current, from, ...meta }])
  }
  const remove = (id: number) => {
    setGhosts((g) => g.filter((x) => x.id !== id))
    onLand?.()
  }

  const layer = (
    <>
      {ghosts.map((g) => (
        <FlyGhostView key={g.id} ghost={g} targetRef={targetRef} onDone={() => remove(g.id)} />
      ))}
    </>
  )
  return { fly, layer }
}
