import { useEffect, useRef, useState } from 'react'
import JsBarcode from 'jsbarcode'
import { X, Printer, Minus, Plus } from 'lucide-react'
import type { Product } from '@/types'
import { formatCurrency } from '@/lib/utils'

// ── Single barcode label ──────────────────────────────────────────────────────

interface BarcodeLabelProps {
  value: string
  name: string
  price: number | null
  sku: string | null
}

function BarcodeLabel({ value, name, price, sku }: BarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1.8,
        height: 56,
        displayValue: true,
        fontSize: 11,
        fontOptions: 'bold',
        margin: 6,
        background: '#ffffff',
        lineColor: '#000000',
      })
    } catch {
      // invalid barcode value — will show fallback
    }
  }, [value])

  return (
    <div className="flex flex-col items-center bg-white border border-gray-200 rounded-xl p-3 w-full">
      <p className="text-xs font-semibold text-gray-800 text-center leading-tight mb-1 line-clamp-2">
        {name}
      </p>
      <svg ref={svgRef} className="max-w-full" />
      <div className="flex items-center justify-between w-full mt-1 px-1">
        <p className="text-[10px] text-gray-400">{sku || value.slice(0, 12)}</p>
        {price != null && (
          <p className="text-xs font-bold text-gray-900">{formatCurrency(price)}</p>
        )}
      </div>
    </div>
  )
}

// ── Print area (hidden, only visible on print) ────────────────────────────────

interface PrintItem {
  product: Product
  qty: number
}

function PrintArea({ items }: { items: PrintItem[] }) {
  // Expand items by qty for printing
  const labels = items.flatMap(({ product, qty }) => {
    const value = product.sku ?? product.id.replace(/-/g, '').slice(0, 12)
    const price = product.has_variant ? null : (product.sell_price ?? product.final_price)
    return Array.from({ length: qty }, (_, i) => (
      <PrintBarcodeLabel
        key={`${product.id}-${i}`}
        value={value}
        name={product.name}
        price={price}
        sku={product.sku}
      />
    ))
  })

  return (
    <div id="barcode-print-area" className="hidden print:block">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #barcode-print-area { display: block !important; }
          @page { margin: 8mm; size: A4; }
        }
      `}</style>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '6mm',
        padding: '4mm',
      }}>
        {labels}
      </div>
    </div>
  )
}

function PrintBarcodeLabel({ value, name, price, sku }: BarcodeLabelProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1.8,
        height: 48,
        displayValue: true,
        fontSize: 10,
        margin: 4,
        background: '#ffffff',
        lineColor: '#000000',
      })
    } catch {
      // ignore
    }
  }, [value])

  return (
    <div style={{
      border: '1px solid #ccc',
      borderRadius: '4px',
      padding: '4mm',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: 'white',
      pageBreakInside: 'avoid',
    }}>
      <p style={{ fontSize: '9pt', fontWeight: 600, textAlign: 'center', marginBottom: '2mm', lineHeight: 1.2 }}>
        {name}
      </p>
      <svg ref={svgRef} style={{ maxWidth: '100%' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '2mm' }}>
        <span style={{ fontSize: '8pt', color: '#666' }}>{sku || value.slice(0, 12)}</span>
        {price != null && (
          <span style={{ fontSize: '9pt', fontWeight: 700 }}>{formatCurrency(price)}</span>
        )}
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────

interface Props {
  products: Product[]
  onClose: () => void
}

export default function BarcodePrintModal({ products, onClose }: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    () => Object.fromEntries(products.map(p => [p.id, 1]))
  )

  const setQty = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, Math.min(99, (prev[id] ?? 1) + delta)),
    }))
  }

  const handlePrint = () => window.print()

  const totalLabels = Object.values(quantities).reduce((a, b) => a + b, 0)

  const printItems: PrintItem[] = products.map(p => ({ product: p, qty: quantities[p.id] ?? 1 }))

  return (
    <>
      {/* Hidden print area injected into document */}
      <PrintArea items={printItems} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Cetak Barcode</h2>
              <p className="text-xs text-gray-500 mt-0.5">{products.length} produk · {totalLabels} label</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
              <X size={16} />
            </button>
          </div>

          {/* Product list with qty control */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {products.map(product => {
              const barcodeValue = product.sku ?? product.id.replace(/-/g, '').slice(0, 12)
              const price = product.has_variant ? null : (product.sell_price ?? product.final_price)
              const qty = quantities[product.id] ?? 1

              return (
                <div key={product.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition">
                  {/* Barcode preview */}
                  <div className="w-48 shrink-0">
                    <BarcodeLabel
                      value={barcodeValue}
                      name={product.name}
                      price={price}
                      sku={product.sku}
                    />
                  </div>

                  {/* Product info + qty */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize truncate">{product.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      SKU: <span className="font-mono">{product.sku || '—'}</span>
                    </p>
                    {!product.sku && (
                      <p className="text-[11px] text-amber-500 mt-1">
                        Menggunakan ID produk — atur SKU untuk barcode yang lebih pendek
                      </p>
                    )}
                    {price != null && (
                      <p className="text-xs font-semibold text-gray-700 mt-1">{formatCurrency(price)}</p>
                    )}
                  </div>

                  {/* Quantity control */}
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-xs text-gray-500 mr-1">Jumlah</p>
                    <button
                      onClick={() => setQty(product.id, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-gray-900">{qty}</span>
                    <button
                      onClick={() => setQty(product.id, +1)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <p className="text-sm text-gray-500">
              Total: <span className="font-semibold text-gray-900">{totalLabels} label</span> akan dicetak
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-white transition"
              >
                Batal
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
              >
                <Printer size={14} />
                Cetak {totalLabels} Label
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
