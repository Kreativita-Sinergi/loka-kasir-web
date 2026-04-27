/**
 * ImageCropModal — modal crop gambar dengan aspect ratio 1:1 (kotak).
 * Menerima src (data URL), menghasilkan base64 JPEG hasil crop via onSave.
 */
import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { X, ZoomIn, ZoomOut } from 'lucide-react'

interface Props {
  src: string
  onSave: (base64: string, dataUrl: string) => void
  onClose: () => void
}

async function getCroppedImage(imageSrc: string, pixelCrop: Area): Promise<{ base64: string; dataUrl: string }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  canvas.width  = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)

  // Scale down to max 800px to keep file small
  const MAX = 800
  let { width, height } = canvas
  if (width > MAX || height > MAX) {
    const scale = MAX / Math.max(width, height)
    width  = Math.round(width * scale)
    height = Math.round(height * scale)
    const scaled = document.createElement('canvas')
    scaled.width = width; scaled.height = height
    scaled.getContext('2d')!.drawImage(canvas, 0, 0, width, height)
    const dataUrl = scaled.toDataURL('image/jpeg', 0.85)
    return { base64: dataUrl.split(',')[1], dataUrl }
  }

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  return { base64: dataUrl.split(',')[1], dataUrl }
}

export default function ImageCropModal({ src, onSave, onClose }: Props) {
  const [crop, setCrop]   = useState({ x: 0, y: 0 })
  const [zoom, setZoom]   = useState(1)
  const [croppedArea, setCroppedArea] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedArea) return
    setSaving(true)
    try {
      const result = await getCroppedImage(src, croppedArea)
      onSave(result.base64, result.dataUrl)
    } catch (err) {
      console.error('Image crop failed:', err)
      toast.error('Gagal memotong gambar. Coba gunakan gambar lain.')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Potong Gambar</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X size={18} />
          </button>
        </div>

        {/* Cropper area */}
        <div className="relative w-full bg-gray-900" style={{ height: 320 }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid={false}
            style={{
              containerStyle: { borderRadius: 0 },
              cropAreaStyle: { border: '2px solid rgba(255,255,255,0.8)' },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
          <button type="button" onClick={() => setZoom(z => Math.max(1, z - 0.1))}
            className="p-1.5 text-gray-500 hover:text-blue-600 transition">
            <ZoomOut size={16} />
          </button>
          <input
            type="range" min={1} max={3} step={0.05}
            value={zoom} onChange={e => setZoom(Number(e.target.value))}
            className="flex-1 h-1.5 accent-blue-600"
          />
          <button type="button" onClick={() => setZoom(z => Math.min(3, z + 0.1))}
            className="p-1.5 text-gray-500 hover:text-blue-600 transition">
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition">
            Batal
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60">
            {saving ? 'Memproses...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
