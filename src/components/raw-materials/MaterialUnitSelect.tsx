import { materialUnitOptions } from '@/lib/materialUnits'
import SearchableSelect from '@/components/ui/SearchableSelect'
import { t } from '@/lib/i18n'

export default function MaterialUnitSelect({ base, factor, onChange }: {
  base: string
  factor: number
  onChange: (factor: number) => void
}) {
  const options = materialUnitOptions(base)
  // Faktornya angka, sedangkan pemilih hanya mengenal string: dibungkus
  // String() di daftar dan dikembalikan lewat Number() saat dipilih.
  return <SearchableSelect label={t('labelUnit')} value={String(factor)} onChange={value => onChange(Number(value))}
    options={options.map(option => ({ value: String(option.factor), label: option.label }))}
    clearable={false} size="sm" className="w-full" />
}
