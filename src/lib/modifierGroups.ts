import type { Product, ProductAttribute, ProductModifierGroup } from '@/types'
import { t } from '@/lib/i18n'

/**
 * Satu kelompok pilihan ekstra di layar pembeli. `group` null = modifier lepas
 * milik produk sendiri (cara lama), ditampilkan tanpa aturan pilih.
 */
export interface AddonSection {
  group: ProductModifierGroup | null
  addons: ProductAttribute[]
}

/**
 * Mengelompokkan modifier yang bisa dipilih menurut grup ekstranya, mengikuti
 * urutan grup di produk. Modifier yang grupnya tidak dikenal (server lama, atau
 * grup baru saja dilepas) jatuh ke kelompok lepas: lebih baik tampil tanpa
 * aturan daripada hilang.
 */
export function addonSections(product: Product): AddonSection[] {
  const addons = (product.attributes ?? []).filter((a) => a.is_available && a.is_active)
  const groups = product.modifier_groups ?? []
  const known = new Set(groups.map((g) => g.id))
  const sections: AddonSection[] = groups
    .map((g) => ({ group: g, addons: addons.filter((a) => a.group_id === g.id) }))
    .filter((s) => s.addons.length > 0)
  const loose = addons.filter((a) => !a.group_id || !known.has(a.group_id))
  if (loose.length > 0) sections.push({ group: null, addons: loose })
  return sections
}

/**
 * Pilihan berikutnya setelah [id] diketuk di [section].
 *
 * Pilih-satu bertukar (mengetuk pilihan lain memindahkan centang); pilihan
 * wajib tidak bisa dikosongkan dengan mengetuknya lagi. Pilih-beberapa dengan
 * batas menolak centang yang melebihi batas — pilihan yang sudah ada tidak
 * dibuang diam-diam.
 */
export function toggleAddon(selected: ReadonlySet<string>, section: AddonSection, id: string): Set<string> {
  const next = new Set(selected)
  const g = section.group
  if (next.has(id)) {
    if (g?.select_type === 'SINGLE' && g.is_required) return next
    next.delete(id)
    return next
  }
  if (g?.select_type === 'SINGLE') {
    for (const a of section.addons) next.delete(a.id)
  } else if (g?.max_select) {
    const picked = section.addons.filter((a) => next.has(a.id)).length
    if (picked >= g.max_select) return next
  }
  next.add(id)
  return next
}

/** Grup wajib pertama yang belum dipilih, atau null bila semua terpenuhi. */
export function missingRequiredGroup(sections: AddonSection[], selected: ReadonlySet<string>): ProductModifierGroup | null {
  for (const s of sections) {
    if (s.group?.is_required && !s.addons.some((a) => selected.has(a.id))) return s.group
  }
  return null
}

/**
 * Ringkasan aturan pilih grup: "Pilih salah satu · wajib", "Pilih beberapa ·
 * paling banyak 2". Grup berisi satu pilihan saja tidak punya "cara pilih" —
 * hanya "wajib" bila wajib, selain itu kosong.
 */
export function modifierRuleLabel(
  g: Pick<ProductModifierGroup, 'select_type' | 'is_required' | 'max_select'> & { options?: unknown[] },
): string {
  const several = (g.options?.length ?? 2) > 1
  const parts = [
    several ? (g.select_type === 'SINGLE' ? t('extraPickSingle') : t('extraPickMultiple')) : '',
    several && g.select_type === 'MULTIPLE' && g.max_select ? `${t('extraMaxSelect').toLowerCase()} ${g.max_select}` : '',
    g.is_required ? t('extraRequired').toLowerCase() : '',
  ].filter(Boolean)
  const label = parts.join(' · ')
  return label.charAt(0).toUpperCase() + label.slice(1)
}
