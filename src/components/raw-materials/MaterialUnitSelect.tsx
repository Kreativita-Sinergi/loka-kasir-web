import { materialUnitOptions } from '@/lib/materialUnits'
import { t } from '@/lib/i18n'

export default function MaterialUnitSelect({ base, factor, onChange }: {
  base: string
  factor: number
  onChange: (factor: number) => void
}) {
  const options = materialUnitOptions(base)
  return <select aria-label={t('labelUnit')} value={factor} onChange={event => onChange(Number(event.target.value))}
    className="w-full border border-border rounded px-2 py-1.5 text-sm bg-card">
    {options.map(option => <option key={option.label} value={option.factor}>{option.label}</option>)}
  </select>
}
