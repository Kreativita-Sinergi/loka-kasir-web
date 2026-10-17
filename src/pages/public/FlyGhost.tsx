/**
 * Bayangan produk yang terbang dari kartu menu ke ikon keranjang — dirender
 * oleh `useFlyToCart`; berkas ini hanya berisi komponennya.
 */
import { useLayoutEffect, useState, type RefObject } from 'react'
import * as m from 'motion/react-m'

export interface FlyGhost {
  id: number
  from: DOMRect
  /** Isi bayangan: foto produk, atau inisial bila tak berfoto. */
  image?: string | null
  label: string
}

const GHOST_SIZE = 44

export function FlyGhostView({ ghost, targetRef, onDone }: { ghost: FlyGhost; targetRef: RefObject<HTMLElement | null>; onDone: () => void }) {
  const [to, setTo] = useState<{ x: number; y: number } | null>(null)
  // Tujuan dibaca setelah bilah keranjang ikut terpasang (penambahan pertama
  // memunculkan bilahnya di render yang sama dengan bayangan ini).
  useLayoutEffect(() => {
    const r = targetRef.current?.getBoundingClientRect()
    setTo(r && r.width > 0
      ? { x: r.left + r.width / 2 - GHOST_SIZE / 2, y: r.top + r.height / 2 - GHOST_SIZE / 2 }
      : { x: window.innerWidth / 2 - GHOST_SIZE / 2, y: window.innerHeight - 72 })
  }, [targetRef])
  if (!to) return null
  const from = {
    x: ghost.from.left + ghost.from.width / 2 - GHOST_SIZE / 2,
    y: ghost.from.top + ghost.from.height / 2 - GHOST_SIZE / 2,
  }
  const midX = (from.x + to.x) / 2
  const arcY = Math.min(from.y, to.y) - 70
  return (
    <m.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] overflow-hidden rounded-xl bg-white shadow-xl ring-2 ring-white"
      style={{ width: GHOST_SIZE, height: GHOST_SIZE }}
      initial={{ x: from.x, y: from.y, scale: 1, opacity: 1 }}
      animate={{
        x: [from.x, midX, to.x],
        y: [from.y, arcY, to.y],
        scale: [1, 0.9, 0.25],
        opacity: [1, 1, 0.5],
      }}
      transition={{ duration: 0.62, times: [0, 0.38, 1], ease: [0.3, 0.9, 0.35, 1] }}
      onAnimationComplete={onDone}
    >
      {ghost.image ? (
        <img src={ghost.image} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 text-sm font-bold text-indigo-600">
          {ghost.label}
        </div>
      )}
    </m.div>
  )
}
