import type { POProductSaleUnit } from '@/api/purchaseOrders'
import type { POItem } from '@/types'
import { materialUnitOptions } from '@/lib/materialUnits'
import { t } from '@/lib/i18n'

/** Satu pilihan satuan di baris PO. `factor` = banyaknya satuan dasar
 *  dalam satuan ini (Dus isi 40 → 40; kg terhadap gram → 1000). */
export interface POUnitOption {
  key: string
  label: string
  factor: number
  unitId?: string
  purchaseUnit?: boolean
}

/** Satuan untuk bahan baku & produk timbangan: kelompok berat/volume. */
export function measureUnitOptions(base: string): POUnitOption[] {
  return materialUnitOptions(base).map(option => ({ key: `m:${option.factor}`, label: option.label, factor: option.factor }))
}

/** Satuan untuk produk biasa: satuan dasar + satuan jual/beli yang lebih besar. */
export function productUnitOptions(base: string, saleUnits: POProductSaleUnit[]): POUnitOption[] {
  return [
    { key: 'base', label: base || 'pcs', factor: 1 },
    ...saleUnits
      .filter(unit => unit.conversion > 1)
      .map(unit => ({
        key: unit.is_purchase_unit ? 'purchase' : `u:${unit.id}`,
        label: t('poUnitContains', { unit: unit.name, conversion: unit.conversion }),
        factor: unit.conversion,
        unitId: unit.is_purchase_unit ? undefined : unit.id ?? undefined,
        purchaseUnit: unit.is_purchase_unit || undefined,
      })),
  ]
}

export const isProductItem = (item: Pick<POItem, 'item_type'>) => item.item_type === 'product'

/** Satuan yang bisa dipakai saat menerima satu baris PO. */
export function poItemUnitOptions(item: POItem): POUnitOption[] {
  if (!isProductItem(item) || item.is_weight_based) return measureUnitOptions(item.unit_alias)
  const conversion = item.unit_conversion ?? 1
  const options: POUnitOption[] = [{ key: 'base', label: item.unit_alias || 'pcs', factor: 1 }]
  if (item.unit_name && conversion > 1) {
    options.push({ key: 'po', label: t('poUnitContains', { unit: item.unit_name, conversion }), factor: conversion })
  }
  return options
}

/** Satuan bawaan saat menerima: satuan beli PO bila jumlahnya pas dibagi. */
export function defaultReceiveUnit(item: POItem, quantity: number): POUnitOption {
  const options = poItemUnitOptions(item)
  const purchase = options.find(option => option.key === 'po')
  if (purchase && quantity > 0 && Number.isInteger(quantity / purchase.factor)) return purchase
  return options.find(option => option.factor === 1) ?? options[0]
}

/** Nama baris lengkap: "Kaos — M". */
export function poItemName(item: Pick<POItem, 'name' | 'variant_name' | 'raw_material_name'>) {
  if (item.name && item.variant_name) return `${item.name} — ${item.variant_name}`
  return item.name || item.raw_material_name
}

/** "2 Dus (80 pcs)" bila jumlahnya pas dalam satuan beli, selain itu "80 pcs". */
export function formatPOQuantity(item: POItem, quantity: number, format: (n: number) => string): string {
  const conversion = item.unit_conversion ?? 1
  if (isProductItem(item) && item.unit_name && conversion > 1 && quantity > 0 && Number.isInteger(quantity / conversion)) {
    return t('poQtyWithBase', { qty: format(quantity / conversion), unit: item.unit_name, base: format(quantity), baseUnit: item.unit_alias })
  }
  return `${format(quantity)} ${item.unit_alias}`.trim()
}

export type CostChangeKind = 'first' | 'same' | 'up' | 'down'

export interface CostChange {
  kind: CostChangeKind
  /** Persen perubahan terhadap harga lama (0 bila tidak ada harga lama). */
  percent: number
  /** Lompatan lebih dari 50% — kemungkinan salah ketik. */
  large: boolean
}

/** Membandingkan harga modal sekarang dengan harga beli baru (per satuan dasar). */
export function costChange(current: number | null | undefined, next: number): CostChange {
  const before = current ?? 0
  if (before <= 0) return { kind: 'first', percent: 0, large: false }
  const diff = next - before
  if (Math.abs(diff) < 0.005) return { kind: 'same', percent: 0, large: false }
  const percent = (diff / before) * 100
  return { kind: diff > 0 ? 'up' : 'down', percent, large: Math.abs(percent) > 50 }
}
