import { useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'

type Point = { x: number; y: number }

const inset = 8
const dragThreshold = 5
const keyboardStep = 24
const directions = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
}

function loadPosition(key: string): Point | null {
  try {
    const point = JSON.parse(sessionStorage.getItem(key) ?? 'null') as Point | null
    return point && Number.isFinite(point.x) && Number.isFinite(point.y) ? point : null
  } catch {
    return null
  }
}

export function floatingChatStyle(point: Point | null, width: string, height: string) {
  if (!point) return undefined
  return {
    left: `clamp(${inset}px, ${point.x}px, calc(100vw - ${width} - ${inset}px))`,
    top: `clamp(${inset}px, ${point.y}px, calc(100dvh - ${height} - ${inset}px))`,
  }
}

export function useTanyaLokaPosition(target: RefObject<HTMLElement | null>, key: string) {
  const [position, setPosition] = useState(() => loadPosition(key))
  const gesture = useRef<{ id: number; x: number; y: number; rect: DOMRect; movedTo?: Point } | null>(null)
  const suppressClick = useRef(false)

  function bounded(point: Point, rect: DOMRect): Point {
    return {
      x: Math.max(inset, Math.min(point.x, window.innerWidth - rect.width - inset)),
      y: Math.max(inset, Math.min(point.y, window.innerHeight - rect.height - inset)),
    }
  }

  function save(point: Point | null) {
    setPosition(point)
    try {
      if (point) sessionStorage.setItem(key, JSON.stringify(point))
      else sessionStorage.removeItem(key)
    } catch {
      // Moving the chat still works in the current view if storage is blocked.
    }
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    const rect = target.current?.getBoundingClientRect()
    if (!rect || event.button !== 0 || !event.isPrimary) return
    suppressClick.current = false
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, rect }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const drag = gesture.current
    if (!drag || drag.id !== event.pointerId) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.movedTo && Math.hypot(dx, dy) < dragThreshold) return
    suppressClick.current = true
    drag.movedTo = bounded({ x: drag.rect.left + dx, y: drag.rect.top + dy }, drag.rect)
    setPosition(drag.movedTo)
  }

  function finishDrag(event: PointerEvent<HTMLElement>) {
    const drag = gesture.current
    if (!drag || drag.id !== event.pointerId) return
    gesture.current = null
    if (drag.movedTo) save(drag.movedTo)
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Home') {
      event.preventDefault()
      save(null)
      return
    }
    if (!Object.hasOwn(directions, event.key)) return
    const rect = target.current?.getBoundingClientRect()
    if (!rect) return
    const offset = directions[event.key as keyof typeof directions]
    event.preventDefault()
    save(bounded({ x: rect.left + offset.x * keyboardStep, y: rect.top + offset.y * keyboardStep }, rect))
  }

  return {
    position,
    reset: () => save(null),
    suppressClick,
    handle: {
      onPointerDown, onPointerMove, onPointerUp: finishDrag, onPointerCancel: finishDrag,
      onLostPointerCapture: finishDrag, onKeyDown,
    },
  }
}
