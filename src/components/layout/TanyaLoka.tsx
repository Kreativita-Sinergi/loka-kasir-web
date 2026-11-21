import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { GripHorizontal, MessageCircle, RotateCcw, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { whatsappContactUrl } from '@/lib/constants'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { floatingChatStyle, useTanyaLokaPosition } from './useTanyaLokaPosition'

const supportOrigin = 'https://www.lokakasir.id'
const embedUrl = supportOrigin + '/tanya-loka/embed'

export default function TanyaLoka() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const panelId = useId()
  const moveHelpId = useId()
  const launcher = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLElement>(null)
  const panelHandle = useRef<HTMLButtonElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const launcherMove = useTanyaLokaPosition(launcher, 'loka.tanya-loka.launcher')
  const panelMove = useTanyaLokaPosition(panel, 'loka.tanya-loka.panel')
  const launcherStyle = floatingChatStyle(launcherMove.position, '2.75rem', '2.75rem')
  const panelStyle = floatingChatStyle(panelMove.position, 'var(--chat-width)', 'var(--chat-height)') ?? (
    launcherStyle && {
      left: `clamp(8px, calc(${launcherStyle.left} + 2.75rem - var(--chat-width)), calc(100vw - var(--chat-width) - 8px))`,
      top: `clamp(8px, calc(${launcherStyle.top} + 3.25rem), calc(100dvh - var(--chat-height) - 8px))`,
    }
  )

  const closeChat = useCallback(() => {
    setOpen(false)
    launcher.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== supportOrigin || event.source !== frame.current?.contentWindow) return
      if (event.data === 'loka:support-chat:ready') setReady(true)
      if (open && event.data === 'loka:support-chat:close') closeChat()
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [open, closeChat])

  useEffect(() => {
    if (!mounted || ready) return
    const timer = window.setTimeout(() => setTimedOut(true), 8000)
    return () => window.clearTimeout(timer)
  }, [mounted, ready])

  useEffect(() => {
    if (open && ready) frame.current?.focus({ preventScroll: true })
  }, [open, ready])

  return (
    <div
      className="relative size-11 shrink-0"
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.stopPropagation()
          closeChat()
        }
      }}
    >
      <span id={moveHelpId} className="sr-only">{t('supportChatMoveHelp')}</span>
      <Button
        ref={launcher}
        type="button"
        variant={launcherStyle ? 'default' : 'ghost'}
        size="icon"
        aria-label="Tanya Loka"
        title="Tanya Loka"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={moveHelpId}
        aria-controls={mounted ? panelId : undefined}
        className={cn('touch-none select-none cursor-grab active:cursor-grabbing', launcherStyle && 'fixed z-10 rounded-full shadow-lg')}
        style={launcherStyle}
        {...launcherMove.handle}
        onClick={event => {
          if (event.detail !== 0 && launcherMove.suppressClick.current) return
          if (open) closeChat()
          else {
            setMounted(true)
            setOpen(true)
          }
        }}
      >
        <MessageCircle aria-hidden="true" />
      </Button>
      {mounted && (
        <section
          ref={panel}
          id={panelId}
          role="dialog"
          aria-label="Tanya Loka"
          hidden={!open}
          style={panelStyle}
          className={cn(
            'z-20 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl',
            '[--chat-width:min(25rem,calc(100vw-2rem))] [--chat-height:min(33rem,calc(100dvh-8.5rem-env(safe-area-inset-bottom)))]',
            'h-[var(--chat-height)] w-[var(--chat-width)]',
            open ? 'flex' : 'hidden',
            panelStyle ? 'fixed' : 'absolute right-0 top-full mt-2',
          )}
        >
          <div className="flex shrink-0 items-center border-b border-border px-1">
            <Button ref={panelHandle} type="button" variant="ghost" size="sm" aria-describedby={moveHelpId}
              className="h-11 flex-1 touch-none select-none justify-start cursor-grab active:cursor-grabbing"
              {...panelMove.handle}>
              <GripHorizontal aria-hidden="true" />
              {t('supportChatMove')}
            </Button>
            {(launcherMove.position || panelMove.position) && (
              <Button type="button" variant="ghost" size="icon" aria-label={t('supportChatResetPosition')}
                title={t('supportChatResetPosition')} onClick={() => {
                  launcherMove.reset()
                  panelMove.reset()
                  panelHandle.current?.focus({ preventScroll: true })
                }}>
                <RotateCcw aria-hidden="true" />
              </Button>
            )}
            <Button type="button" size="icon" variant="ghost" aria-label={t('actionClose')} onClick={closeChat}>
              <X aria-hidden="true" />
            </Button>
          </div>
          <div className="relative min-h-0 flex-1">
            <iframe
              ref={frame}
              src={embedUrl}
              title="Tanya Loka"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              className={cn('block size-full border-0', !ready && 'invisible')}
            />
            {!ready && (
              <div className="absolute inset-0 overflow-y-auto bg-card p-4">
                <p role="status" className="text-sm text-muted-foreground">{t(timedOut ? 'supportChatUnavailable' : 'supportChatLoading')}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-3 text-sm font-semibold text-primary underline underline-offset-2">
                  <a href={supportOrigin + '/panduan'} target="_blank" rel="noopener noreferrer">
                    {t('supportChatOpenGuide')}
                  </a>
                  <a href={whatsappContactUrl()} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
