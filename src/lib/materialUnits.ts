/** Raw material quantities and costs are stored in the material's configured unit. */
const groups = [
  [
    { label: 'kg', scale: 1000, aliases: ['kg', 'kilogram', 'kilo'] },
    { label: 'ons', scale: 100, aliases: ['ons', 'hg', 'hektogram'] },
    { label: 'gram', scale: 1, aliases: ['g', 'gr', 'gram'] },
    { label: 'mg', scale: 0.001, aliases: ['mg', 'miligram', 'milligram'] },
  ],
  [
    { label: 'L', scale: 1000, aliases: ['l', 'lt', 'liter', 'litre'] },
    { label: 'mL', scale: 1, aliases: ['ml', 'mililiter', 'milliliter'] },
  ],
]

export function materialUnitOptions(base: string) {
  const normalized = base.trim().toLowerCase()
  const group = groups.find(units => units.some(unit => unit.aliases.includes(normalized)))
  if (!group) return [{ label: base || '—', factor: 1 }]
  const baseScale = group.find(unit => unit.aliases.includes(normalized))!.scale
  return group.map(unit => ({ label: unit.label, factor: unit.scale / baseScale }))
}

export function parseNumericInput(value: string | number): number {
  const normalized = String(value).trim().replace(',', '.')
  if (!/^-?\d+(?:\.\d*)?$|^-?\.\d+$/.test(normalized)) return NaN
  const number = Number(normalized)
  return Number.isFinite(number) ? number : NaN
}

export function validNumericInput(value: string | number, minimum = 0, exclusive = false) {
  const number = parseNumericInput(value)
  return Number.isFinite(number) && (exclusive ? number > minimum : number >= minimum)
}

export function convertMaterialQuantity(quantity: number, factor: number) {
  // Avoid binary floating point tails while retaining sub-gram quantities.
  return Number((quantity * factor).toPrecision(12))
}

export function validWholeNumberInput(value: string | number, minimum = 0) {
  return validNumericInput(value, minimum) && Number.isSafeInteger(parseNumericInput(value))
}
