import { parseNumericInput } from './materialUnits'
import { weightUnitScale } from './money'

/** Convert display units to the integer stock units used by the API. */
export function stockTransferQuantity(value: string | number, available: number | undefined, measured: boolean, unit?: string | null) {
  const amount = parseNumericInput(value)
  const quantity = measured ? Math.round(amount * weightUnitScale(unit)) : amount
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || available === undefined || quantity > available) return null
  return quantity
}
