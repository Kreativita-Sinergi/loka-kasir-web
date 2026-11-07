import type { SVGProps } from 'react'

/** Peran tiap elemen SVG ikon Loka — lihat loka-kasir-app/design/loka_icons/STYLE.md. */
export type LokaRole = 'line' | 'fill' | 'accent'
export type LokaNode = readonly [tag: 'path' | 'circle' | 'ellipse' | 'rect' | 'line' | 'polyline' | 'polygon', attrs: Record<string, string | number>, role: LokaRole]

export interface LokaIconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Lebar & tinggi dalam px. Bawaan 24. */
  size?: number | string
  /** Warna bidang aksen. Bawaan: warna ikon itu sendiri (currentColor). */
  accent?: string
  /** Kepekatan bidang aksen. Bawaan 0.2 — sama dengan app. `0` mematikannya. */
  accentOpacity?: number
  /** Label untuk pembaca layar; tanpa ini ikonnya dekoratif (aria-hidden). */
  title?: string
}

/**
 * Membuat komponen ikon Loka: garis 2 px membulat + satu bidang aksen di
 * bawahnya, sama persis dengan font ikon di app. API-nya mengikuti
 * lucide-react (`size`, `className`, `strokeWidth`) supaya mudah ditukar.
 */
export function createLokaIcon(name: string, nodes: readonly LokaNode[]) {
  function LokaIcon({ size = 24, accent = 'currentColor', accentOpacity = 0.2, strokeWidth = 2, title, className, ...rest }: LokaIconProps) {
    const sw = Number(strokeWidth)
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className ? `loka-icon ${className}` : 'loka-icon'}
        role={title ? 'img' : undefined}
        aria-hidden={title ? undefined : true}
        aria-label={title}
        data-icon={name}
        {...rest}
      >
        {nodes.map(([Tag, attrs, role], i) => {
          if (role === 'accent') {
            return accentOpacity > 0
              ? <Tag key={i} {...attrs} fill={accent} fillOpacity={accentOpacity} stroke="none" />
              : null
          }
          if (role === 'fill') return <Tag key={i} {...attrs} fill="currentColor" stroke="none" />
          // Detail dalam ber-stroke 1.5 ikut berskala bila strokeWidth diubah.
          const own = attrs.strokeWidth
          return <Tag key={i} {...attrs} strokeWidth={own == null ? undefined : (Number(own) * sw) / 2} />
        })}
      </svg>
    )
  }
  LokaIcon.displayName = `Loka.${name}`
  return LokaIcon
}
