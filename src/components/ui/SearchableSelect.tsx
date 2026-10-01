import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, Check } from 'lucide-react'
import { t } from '@/lib/i18n'

export interface SelectOption { value: string; label: string; group?: string; hint?: string }
interface Props { value: string; onChange: (value: string) => void; options: SelectOption[]; placeholder?: string; clearable?: boolean; disabled?: boolean }

export default function SearchableSelect({ value, onChange, options, placeholder, clearable = true, disabled = false }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState<{ left: number; top: number; width: number; height: number; root: HTMLElement } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find(option => option.value === value)
  const q = query.trim().toLowerCase()
  const filtered = options.filter(option => !q || [option.label, option.group, option.hint].some(text => text?.toLowerCase().includes(q)))
  const visible: SelectOption[] = clearable ? [{ value: '', label: placeholder ?? t('selectPlaceholder') }, ...filtered] : filtered
  const activeIndex = Math.min(active, Math.max(visible.length - 1, 0))
  const close = () => { setOpen(false); triggerRef.current?.focus() }
  const choose = (option: SelectOption) => { onChange(option.value); close() }

  useLayoutEffect(() => {
    if (!open || disabled) return
    const place = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      // Keep the popup inside Radix's focus scope, outside its scrolling card.
      const root = trigger.closest<HTMLElement>('[role="dialog"]') ?? document.body
      const rootRect = root === document.body ? { left: 0, top: 0 } : root.getBoundingClientRect()
      const viewport = window.visualViewport
      const topEdge = viewport?.offsetTop ?? 0
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight)
      const below = bottomEdge - rect.bottom - 8
      const above = rect.top - topEdge - 8
      const upward = below < 200 && above > below
      const height = Math.max(96, Math.min(320, upward ? above : below))
      setPosition({ left: rect.left - rootRect.left, top: (upward ? rect.top - height - 4 : rect.bottom + 4) - rootRect.top, width: rect.width, height, root })
    }
    place()
    const scroll = (event: Event) => { if (!popupRef.current?.contains(event.target as Node)) place() }
    window.addEventListener('resize', place)
    document.addEventListener('scroll', scroll, true)
    window.visualViewport?.addEventListener('resize', place)
    return () => { window.removeEventListener('resize', place); document.removeEventListener('scroll', scroll, true); window.visualViewport?.removeEventListener('resize', place) }
  }, [open, disabled])
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node) && !popupRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  useEffect(() => { listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView?.({ block: 'nearest' }) }, [activeIndex, open, query])
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setActive(index => Math.max(0, Math.min(index + direction, visible.length - 1)))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (visible[activeIndex]) choose(visible[activeIndex])
    } else if (event.key === 'Tab') setOpen(false)
  }

  return (
    <>
      <button ref={triggerRef} type="button" role="combobox" aria-expanded={open && !disabled} aria-controls={open ? listId : undefined} aria-haspopup="listbox"
        aria-label={placeholder ?? t('selectPlaceholder')} disabled={disabled}
        onClick={() => { setOpen(current => !current); setQuery(''); setActive(Math.max(0, options.findIndex(option => option.value === value) + (clearable ? 1 : 0))) }}
        onKeyDown={event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); setActive(0) } }}
        className="flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60">
        <span className={`min-w-0 break-words ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>{selected?.label ?? placeholder ?? t('selectPlaceholder')}</span>
        <ChevronDown size={16} className="shrink-0 text-muted-foreground" />
      </button>
      {open && !disabled && position && createPortal(
        <div ref={popupRef} data-select-popup style={{ position: 'fixed', left: position.left, top: position.top, width: position.width, height: position.height }}
          className="z-[110] flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl" onKeyDown={onKeyDown}>
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-3">
            <Search size={15} className="shrink-0 text-muted-foreground" />
            <input autoFocus role="combobox" aria-label={t('searchEllipsis')} aria-expanded aria-controls={listId} aria-autocomplete="list"
              aria-activedescendant={visible.length ? `${listId}-${activeIndex}` : undefined} value={query}
              onChange={event => { setQuery(event.target.value); setActive(clearable && event.target.value.trim() ? 1 : 0) }} placeholder={t('searchEllipsis')} className="min-w-0 w-full bg-transparent py-3 text-sm outline-none" />
          </div>
          <div ref={listRef} id={listId} role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
            {visible.map((option, index) => <div key={option.value}>
              {option.group && option.group !== visible[index - 1]?.group && <p className="px-3 pb-1 pt-3 text-xs font-semibold text-muted-foreground">{option.group}</p>}
              <button id={`${listId}-${index}`} type="button" role="option" tabIndex={-1} aria-selected={value === option.value} data-active={index === activeIndex}
                onPointerMove={() => setActive(index)} onClick={() => choose(option)}
                className={`flex min-h-11 w-full min-w-0 items-start justify-between gap-2 px-3 py-2.5 text-left text-sm ${index === activeIndex ? 'bg-primary-subtle text-primary' : 'hover:bg-muted'}`}>
                <span className="min-w-0 break-words">{option.label}</span>
                <span className="flex max-w-[45%] shrink-0 items-center gap-2">{option.hint && <span className="break-words text-right text-xs text-muted-foreground">{option.hint}</span>}{option.value === value && <Check size={15} className="shrink-0 text-primary" />}</span>
              </button>
            </div>)}
            {!filtered.length && <p className="px-3 py-4 text-center text-sm text-muted-foreground">{t('notFound')}</p>}
          </div>
        </div>, position.root,
      )}
    </>
  )
}
