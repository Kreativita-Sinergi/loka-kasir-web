/**
 * Gerak antarmuka menu publik (QR meja / pesan online), dibangun di atas
 * `motion`. Semua komponen di sini menghormati pengaturan "kurangi gerakan"
 * dari sistem lewat `useReducedMotion` atau `MotionConfig reducedMotion="user"`
 * yang dipasang halaman.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import * as m from 'motion/react-m'
import { formatCurrency } from '@/lib/utils'
import { springSnappy, useMotionReady } from './publicMotionHooks'

// ─── Angka ───────────────────────────────────────────────────────────────────

/**
 * Nominal rupiah yang "berputar" menuju nilai barunya alih-alih melompat —
 * total keranjang terasa bertambah saat barang dimasukkan.
 */
export function AnimatedCurrency({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion()
  const raw = useMotionValue(value)
  const spring = useSpring(raw, { stiffness: 260, damping: 30, mass: 0.7 })
  const text = useTransform(spring, (v) => formatCurrency(Math.round(v)))
  useEffect(() => { raw.set(value) }, [value, raw])
  if (reduce) return <span className={className}>{formatCurrency(value)}</span>
  return <m.span className={className}>{text}</m.span>
}

/**
 * Angka yang bergulir ke atas saat bertambah dan ke bawah saat berkurang —
 * dipakai di penghitung jumlah barang.
 */
const rollVariants = {
  enter: (dir: number) => ({ y: dir * 12, opacity: 0, scale: 0.8 }),
  center: { y: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ y: -dir * 12, opacity: 0, scale: 0.8 }),
}

export function PopNumber({ value, className }: { value: number; className?: string }) {
  // Arah gulir dihitung dari nilai sebelumnya; `custom` meneruskannya juga ke
  // angka lama yang sedang keluar.
  const [prev, setPrev] = useState(value)
  const [dir, setDir] = useState(1)
  if (value !== prev) {
    setDir(value > prev ? 1 : -1)
    setPrev(value)
  }
  return (
    <span className={`relative inline-grid place-items-center overflow-hidden ${className ?? ''}`}>
      <AnimatePresence initial={false} mode="popLayout" custom={dir}>
        <m.span
          key={value}
          custom={dir}
          variants={rollVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="col-start-1 row-start-1 tabular-nums"
          transition={springSnappy}
        >
          {value}
        </m.span>
      </AnimatePresence>
    </span>
  )
}

// ─── Pembungkus kecil ────────────────────────────────────────────────────────

/** Kartu/baris yang muncul mengambang masuk; `index` memberi jeda berurutan (dibatasi). */
export function Rise({ children, index = 0, className, ...data }: {
  children: ReactNode
  index?: number
  className?: string
  [attr: `data-${string}`]: string | boolean | undefined
}) {
  const ready = useMotionReady()
  return (
    <m.div
      {...data}
      className={className}
      initial={ready ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springSnappy, delay: Math.min(index * 0.035, 0.3) }}
    >
      {children}
    </m.div>
  )
}

/** Muncul mengembang dari tengah — untuk ikon status dan penanda terpilih. */
export function PopIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ready = useMotionReady()
  return (
    <m.div
      className={className}
      initial={ready ? { scale: 0.4, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22, delay }}
    >
      {children}
    </m.div>
  )
}
