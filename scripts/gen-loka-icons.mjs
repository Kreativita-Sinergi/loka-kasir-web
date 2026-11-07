#!/usr/bin/env node
// Membuat src/components/icons/loka/icons.generated.tsx dari SVG ikon Loka
// yang sama dengan app (sumber tunggal: loka-kasir-app/design/loka_icons/svg).
//
//   node scripts/gen-loka-icons.mjs [folder-svg]
//
// Bawaan folder: ../loka-kasir-app/design/loka_icons/svg. Jalankan ulang
// setiap ada ikon baru/berubah di app, lalu commit hasilnya.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(process.argv[2] ?? join(root, '../loka-kasir-app/design/loka_icons/svg'))
const out = join(root, 'src/components/icons/loka/icons.generated.tsx')

const TAGS = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'])
const NUMERIC = new Set(['cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'width', 'height', 'x1', 'y1', 'x2', 'y2', 'strokeWidth'])
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
const pascal = (name) => {
  const p = name.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join('')
  // Nama global yang tidak boleh dibayangi (no-shadow-restricted-names).
  if (p === 'Infinity' || p === 'NaN') return `${p}Icon`
  return /^\d/.test(p) ? `I${p}` : p
}

const files = readdirSync(src).filter((f) => f.endsWith('.svg')).sort()
if (files.length === 0) throw new Error(`Tidak ada SVG di ${src}`)

const lines = []
for (const file of files) {
  const name = file.slice(0, -4)
  const svg = readFileSync(join(src, file), 'utf8')
  const nodes = []
  for (const m of svg.matchAll(/<(\w+)\s([^>]*?)\/?>/g)) {
    const tag = m[1]
    if (tag === 'svg') continue
    if (!TAGS.has(tag)) throw new Error(`${file}: elemen <${tag}> tidak didukung`)
    const attrs = {}
    let role = 'line'
    for (const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g)) {
      if (a[1] === 'class') { role = a[2] === 'accent' ? 'accent' : a[2] === 'fill' ? 'fill' : 'line'; continue }
      const key = camel(a[1])
      attrs[key] = NUMERIC.has(key) ? Number(a[2]) : a[2]
    }
    nodes.push([tag, attrs, role])
  }
  lines.push(`export const ${pascal(name)} = /* @__PURE__ */ createLokaIcon('${name}', ${JSON.stringify(nodes)})`)
}

writeFileSync(out, [
  '// DIBUAT OTOMATIS oleh scripts/gen-loka-icons.mjs dari',
  '// loka-kasir-app/design/loka_icons/svg — jangan diubah manual.',
  "import { createLokaIcon } from './createLokaIcon'",
  '',
  ...lines,
  '',
].join('\n'))
console.log(`${files.length} ikon → ${out}`)
