import { useMemo, useState } from 'react'
import { ChevronDown, Copy, MonitorPlay, PlayCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { captionPlatforms, captions, downloadLinks, fillSalesTemplate, objections, sellingPoints, tutorialSteps, type CaptionPlatform } from './salesKit'
import { tutorialGroups, YOUTUBE_CHANNEL_URL, type TutorialVideo } from './salesVideos'
import { useSalesProfile } from './salesPortal'

const videoUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`
const videosByKey = new Map(tutorialGroups.flatMap((g) => g.videos).map((v) => [v.key, v]))

async function copyText(text: string, label: string) {
  try { await navigator.clipboard.writeText(text); toast.success(`${label} disalin`) } catch { toast.error(`${label} tidak dapat disalin`) }
}

function VideoLinks({ video }: { video: TutorialVideo }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="font-medium text-foreground">{video.title}</span>
      {video.phone && <a href={videoUrl(video.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><PlayCircle size={14} />HP</a>}
      {video.tablet && <a href={videoUrl(video.tablet)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><PlayCircle size={14} />Tablet</a>}
    </div>
  )
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function SalesKitPage() {
  const profile = useSalesProfile()
  const vars = useMemo(() => ({ code: profile.code, link: `${window.location.origin}/register?ref=${encodeURIComponent(profile.code)}` }), [profile.code])
  const fill = (text: string) => fillSalesTemplate(text, vars)
  const [platform, setPlatform] = useState<CaptionPlatform>('threads')
  const active = captionPlatforms.find((p) => p.key === platform)!

  return (
    <>
      <section className="space-y-2">
        <h1 className="text-xl font-bold tracking-tight">Bahan jualan</h1>
        <p className="text-sm text-muted-foreground">Caption siap salin, jawaban untuk calon pelanggan, dan tutorial cara pakai Loka Kasir. Kode <strong className="text-foreground">{profile.code}</strong> dan link daftar Anda sudah otomatis terisi.</p>
        <nav className="flex gap-2 overflow-x-auto pb-1 text-sm" aria-label="Bagian bahan jualan">
          {[['caption', 'Caption'], ['poin', 'Poin jualan'], ['tutorial', 'Tutorial'], ['video', 'Semua video']].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-border px-3 py-1.5 font-medium text-muted-foreground hover:text-foreground">{label}</a>
          ))}
        </nav>
      </section>

      <Section id="caption" title="Caption siap pakai" description="Pilih platform, lalu salin. Boleh diubah sedikit supaya terasa seperti tulisan Anda sendiri.">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {captionPlatforms.map((p) => (
            <button key={p.key} type="button" onClick={() => setPlatform(p.key)} className={cn(
              'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              platform === p.key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
            )}>{p.label}</button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{active.hint}</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {captions[platform].map((c) => {
            const text = fill(c.text)
            const over = active.limit !== undefined && text.length > active.limit
            return (
              <article key={c.title} className="flex flex-col rounded-xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{c.title}</h3>
                  <span className={cn('text-xs tabular-nums', over ? 'text-destructive' : 'text-muted-foreground')}>{text.length}{active.limit ? `/${active.limit}` : ''} karakter</span>
                </div>
                <p className="mt-2 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{text}</p>
                <Button variant="outline" size="sm" className="mt-3 self-start" onClick={() => void copyText(text, 'Caption')}><Copy />Salin caption</Button>
              </article>
            )
          })}
        </div>
      </Section>

      <Section id="poin" title="Poin jualan & jawaban" description="Pegangan saat menjelaskan Loka Kasir dan menjawab pertanyaan yang sering muncul.">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          {sellingPoints.map((p) => <li key={p}>{fill(p)}</li>)}
        </ul>
        <div className="mt-4 divide-y divide-border rounded-xl border border-border">
          {objections.map((o) => (
            <details key={o.q} className="group px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium">
                {o.q}<ChevronDown size={16} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{fill(o.a)}</p>
              <Button variant="ghost" size="sm" className="mt-1 -ml-3" onClick={() => void copyText(fill(o.a), 'Jawaban')}><Copy />Salin jawaban</Button>
            </details>
          ))}
        </div>
      </Section>

      <Section id="tutorial" title="Tutorial cara pakai Loka Kasir" description="Urutan untuk membantu pelanggan baru mulai berjualan. Setiap langkah punya video untuk HP dan tablet.">
        <ol className="space-y-4">
          {tutorialSteps.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{i + 1}</span>
              <div className="min-w-0 space-y-1.5">
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">{fill(step.body)}</p>
                {step.videos.map((key) => { const v = videosByKey.get(key); return v ? <VideoLinks key={key} video={v} /> : null })}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild><a href={downloadLinks.android} target="_blank" rel="noopener noreferrer">Play Store (Android)</a></Button>
          <Button variant="outline" size="sm" asChild><a href={downloadLinks.windows} target="_blank" rel="noopener noreferrer">Microsoft Store (Windows)</a></Button>
          <Button variant="outline" size="sm" onClick={() => void copyText(vars.link, 'Link daftar')}><Copy />Salin link daftar</Button>
        </div>
      </Section>

      <Section id="video" title="Semua video tutorial" description="Kirim video yang sesuai saat pelanggan bertanya cara memakai fitur tertentu.">
        <div className="grid gap-5 md:grid-cols-2">
          {tutorialGroups.map((g) => (
            <div key={g.title}>
              <h3 className="text-sm font-semibold text-muted-foreground">{g.title}</h3>
              <div className="mt-2 space-y-2">{g.videos.map((v) => <VideoLinks key={v.key} video={v} />)}</div>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-5" asChild>
          <a href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer"><MonitorPlay />Buka channel YouTube Loka Kasir</a>
        </Button>
      </Section>
    </>
  )
}
