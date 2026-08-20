import { useEffect, useRef, useState } from 'react'
import { ScanLine, X, Plus, CameraOff, Loader2, AlertTriangle, Info } from 'lucide-react'
import { lookupBarcode } from '@/api/products'
import { t } from '@/lib/i18n'

/**
 * Daftar barcode satu barang.
 *
 * Daftar, bukan satu kolom teks, karena satu barang bisa punya lebih dari satu
 * kode: pemasok berbeda menempelkan kode berbeda pada barang yang sama, dan
 * kemasan lama masih beredar di rak saat kemasan baru datang. Dengan satu kode,
 * kasir yang memindai kemasan lama mendapat "belum terdaftar" untuk barang yang
 * jelas ada di daftar.
 *
 * Barcode juga dipisahkan dari SKU dengan sengaja. SKU adalah kode internal yang
 * dipilih pemiliknya sendiri agar mudah dibaca ("KOPI-250"); barcode ditentukan
 * pabrik. Selama keduanya berbagi satu kolom, pemilik toko harus memilih salah
 * satu — SKU yang rapi, atau kode yang bisa dipindai.
 */

/**
 * Bentuk barcode ritel yang lazim: EAN-8 (8 digit), UPC-A (12), EAN-13 (13),
 * ITF-14 (14).
 *
 * Dipakai sebagai PERINGATAN, bukan penolakan. Code 39 dan Code 128 boleh
 * memuat huruf, dan sebagian toko menempel label internalnya sendiri — menolak
 * keras akan menghalangi pemakaian yang sah. Tetapi menerima "trss" tanpa
 * berkata apa-apa juga salah: salah ketik tersimpan diam-diam dan baru ketahuan
 * berminggu-minggu kemudian, saat kasir memindai dan barangnya "tidak
 * ditemukan".
 *
 * Aturan ini sengaja SAMA dengan yang dipakai migrasi saat memutuskan SKU mana
 * yang layak disalin menjadi barcode (lihat config/databaseConfig.go).
 */
export const RETAIL_BARCODE_SHAPE = /^\d{8}$|^\d{12,14}$/

/** Pesan di bawah kolom isian. */
type Notice =
  | { kind: 'checking' }
  | { kind: 'error'; text: string }
  | { kind: 'warning'; text: string }
  | null

// BarcodeDetector belum ada di lib DOM TypeScript.
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike

function barcodeDetectorCtor(): BarcodeDetectorCtor | null {
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
  return typeof ctor === 'function' ? ctor : null
}

interface Props {
  barcodes: string[]
  onChange: (next: string[]) => void
  /** Tanpa judul dan penjelasan — dipakai di baris varian yang ruangnya sempit. */
  compact?: boolean
  /**
   * Produk yang sedang disunting. Barcode yang ternyata milik produk INI
   * sendiri bukan bentrokan — mis. saat kode dihapus lalu ditambahkan lagi
   * sebelum form disimpan.
   */
  currentProductId?: string
}

export default function BarcodeField({
  barcodes,
  onChange,
  compact = false,
  currentProductId,
}: Props) {
  const [draft, setDraft] = useState('')
  const [scanning, setScanning] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const checking = notice?.kind === 'checking'

  /**
   * Menambahkan satu kode setelah dua pemeriksaan.
   *
   * Bentrokan dengan produk lain MENOLAK; bentuk yang tidak lazim hanya
   * memperingatkan. Keduanya sengaja berbeda: satu kode yang menunjuk dua
   * barang membuat pemindaian ambigu dan kasir menerima barang yang salah —
   * itu harus dicegah. Sedangkan kode berhuruf mungkin memang label buatan
   * toko itu sendiri.
   */
  async function add(raw: string) {
    const code = raw.trim()
    if (!code) return

    // Kode kembar di daftar yang sama dulu dibuang tanpa suara: kotaknya
    // dikosongkan dan tidak terjadi apa-apa, sehingga pengguna wajar
    // menyimpulkan aplikasinya bermasalah.
    if (barcodes.some(b => b.toLowerCase() === code.toLowerCase())) {
      setDraft('')
      setNotice({ kind: 'error', text: t('productBarcodeDuplicate') })
      return
    }

    // Bentrokan dengan produk lain sebelumnya baru ketahuan sebagai galat 409
    // SETELAH seluruh form dikirim. Endpoint pencarian barcode sudah ada, jadi
    // jawabannya bisa didapat sekarang juga.
    setNotice({ kind: 'checking' })
    try {
      const res = await lookupBarcode(code)
      const owner = res.data?.data?.product
      if (owner && owner.id !== currentProductId) {
        setNotice({ kind: 'error', text: t('productBarcodeTaken', { name: owner.name }) })
        return
      }
    } catch (err) {
      // 404 = belum dipakai siapa pun. Itu jawaban yang paling diharapkan di
      // sini, dan bukan kegagalan.
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status !== 404) {
        // Server tidak terjangkau: JANGAN halangi pekerjaan. Kodenya tetap
        // ditambahkan, dan penjaga sesungguhnya tetap ada di server saat
        // disimpan.
        onChange([...barcodes, code])
        setDraft('')
        setNotice({ kind: 'warning', text: t('productBarcodeCheckFailed') })
        return
      }
    }

    onChange([...barcodes, code])
    setDraft('')
    setNotice(
      RETAIL_BARCODE_SHAPE.test(code)
        ? null
        : { kind: 'warning', text: t('productBarcodeOddFormat') },
    )
  }

  return (
    <div>
      {!compact && (
        <>
          <label className="block text-sm font-medium text-foreground mb-1">
            {t('productBarcodes')}
          </label>
          <p className="text-xs text-muted-foreground mb-2">{t('productBarcodesHint')}</p>
        </>
      )}

      {barcodes.length === 0 && !compact ? (
        <p className="text-xs text-muted-foreground mb-2">{t('productBarcodesEmpty')}</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-2">
          {barcodes.map(code => (
            <span
              key={code}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-foreground text-sm font-mono"
            >
              {code}
              <button
                type="button"
                onClick={() => onChange(barcodes.filter(b => b !== code))}
                aria-label={t('actionDelete')}
                className="text-muted-foreground hover:text-red-500 transition"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => {
            setDraft(e.target.value)
            // Pesan lama menempel pada kode yang sudah berlalu; begitu orangnya
            // mengetik lagi, ia hanya jadi kebisingan.
            if (notice) setNotice(null)
          }}
          onKeyDown={e => {
            // Pemindai USB berperilaku sebagai keyboard: ia mengetik angkanya
            // lalu menekan Enter. Menangani Enter di sini membuat pemindai meja
            // bekerja tanpa perlu apa pun yang lain.
            if (e.key === 'Enter') {
              e.preventDefault()
              void add(draft)
            }
          }}
          placeholder={t('productBarcodePlaceholder')}
          className="flex-1 px-3 py-2 border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => void add(draft)}
          disabled={!draft.trim() || checking}
          className="px-3 py-2 border border-border rounded-xl text-sm hover:bg-muted transition disabled:opacity-40 flex items-center gap-1.5"
        >
          {checking ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {t('actionAdd')}
        </button>
        <button
          type="button"
          onClick={() => setScanning(true)}
          className="px-3 py-2 border border-border rounded-xl text-sm hover:bg-muted transition flex items-center gap-1.5"
        >
          <ScanLine size={14} /> {t('productScanBarcode')}
        </button>
      </div>

      {notice && (
        <p
          className={`mt-2 flex items-start gap-1.5 text-xs ${
            notice.kind === 'error'
              ? 'text-red-600 dark:text-red-400'
              : notice.kind === 'warning'
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-muted-foreground'
          }`}
        >
          {notice.kind === 'checking' ? (
            <>
              <Loader2 size={13} className="mt-0.5 shrink-0 animate-spin" />
              {t('productBarcodeChecking')}
            </>
          ) : (
            <>
              {notice.kind === 'error' ? (
                <Info size={13} className="mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              )}
              {notice.text}
            </>
          )}
        </p>
      )}

      {scanning && (
        <CameraScanner
          onClose={() => setScanning(false)}
          onDetected={code => {
            add(code)
            setScanning(false)
          }}
        />
      )}
    </div>
  )
}

/**
 * Pemindai kamera untuk peramban.
 *
 * Memakai `BarcodeDetector` bawaan peramban alih-alih menarik pustaka pemindai
 * ke dalam bundel. Konsekuensinya jujur: API itu ada di Chrome dan Edge
 * (termasuk Android), tetapi TIDAK di Safari dan Firefox — di sana komponennya
 * mengatakan begitu apa adanya dan mengarahkan pengguna ke jalur ketik/pemindai
 * USB, yang bekerja di mana saja.
 */
function CameraScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const supported = barcodeDetectorCtor() !== null

  useEffect(() => {
    const Ctor = barcodeDetectorCtor()
    if (!Ctor) return

    let stream: MediaStream | null = null
    let frame = 0
    let stopped = false
    const detector = new Ctor({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'],
    })

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (stopped) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        tick()
      } catch {
        setError(t('productCameraDenied'))
      }
    }

    async function tick() {
      const video = videoRef.current
      if (stopped || !video || video.readyState < 2) {
        frame = requestAnimationFrame(tick)
        return
      }
      try {
        const found = await detector.detect(video)
        const code = found[0]?.rawValue?.trim()
        if (code) {
          onDetected(code)
          return
        }
      } catch {
        // Satu frame yang gagal dibaca bukan alasan menghentikan pemindaian —
        // frame berikutnya biasanya berhasil.
      }
      frame = requestAnimationFrame(tick)
    }

    void start()
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [onDetected])

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl p-4 w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">{t('productScanBarcode')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label={t('actionClose')}
          >
            <X size={18} />
          </button>
        </div>

        {!supported || error ? (
          <div className="py-8 text-center">
            <CameraOff size={28} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {error ?? t('productScannerUnsupported')}
            </p>
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-1/3 border-2 border-blue-500 rounded-lg" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
