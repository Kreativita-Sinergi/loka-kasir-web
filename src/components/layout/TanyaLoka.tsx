import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const supportOrigin = 'https://www.lokakasir.id'
const embedUrl = supportOrigin + '/tanya-loka/embed'

export default function TanyaLoka() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const panelId = useId()
  const launcher = useRef<HTMLButtonElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)

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
      className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 lg:right-6 lg:bottom-6"
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.stopPropagation()
          closeChat()
        }
      }}
    >
      <Button
        ref={launcher}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={mounted ? panelId : undefined}
        onClick={() => {
          if (open) closeChat()
          else {
            setMounted(true)
            setOpen(true)
          }
        }}
        className="rounded-full shadow-lg"
      >
        <MessageCircle aria-hidden="true" />
        Tanya Loka
      </Button>
      {mounted && (
        <section
          id={panelId}
          role="dialog"
          aria-label="Tanya Loka"
          hidden={!open}
          className="absolute right-0 bottom-full mb-2 h-[min(33rem,calc(100dvh-8.5rem-env(safe-area-inset-bottom)))] w-[min(25rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-xl lg:h-[min(33rem,calc(100dvh-6rem))]"
        >
          <iframe
            ref={frame}
            src={embedUrl}
            title="Tanya Loka"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            className={cn('block size-full border-0', !ready && 'invisible')}
          />
          {!ready && (
            <div className="absolute inset-0 bg-card p-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-bold">Tanya Loka</h2>
                <Button type="button" size="icon" variant="ghost" aria-label={t('actionClose')} onClick={closeChat}>
                  <X aria-hidden="true" />
                </Button>
              </div>
              <p role="status" className="mt-3 text-sm text-muted-foreground">{t(timedOut ? 'supportChatUnavailable' : 'supportChatLoading')}</p>
              <a href={supportOrigin + '/panduan'} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-semibold text-primary underline underline-offset-2">
                {t('supportChatOpenGuide')}
              </a>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
