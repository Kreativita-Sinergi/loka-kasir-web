import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { parseNumericInput } from '@/lib/materialUnits'
import { t } from '@/lib/i18n'

/** Preserve decimal drafts and native form constraints, with comma support. */
const NumericInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function NumericInput({ onChange, onBlur, value, defaultValue, min, max, step = 1, required, ...props }, forwardedRef) {
    const ref = useRef<HTMLInputElement>(null)
    const [draft, setDraft] = useState(String(value ?? defaultValue ?? ''))
    useImperativeHandle(forwardedRef, () => ref.current!)
    // A numeric consumer may parse "2." as 2. Keep the draft until its value
    // changes externally so the user can finish typing "2.5" or clear the field.
    useLayoutEffect(() => {
      if (value === undefined) return
      setDraft(current => typeof value === 'number' && Number(current) === value ? current : String(value))
    }, [value])
    const validate = (input: HTMLInputElement) => {
      const number = parseNumericInput(input.value)
      const stepNumber = Number(step)
      const offset = (number - Number(min ?? 0)) / stepNumber
      const invalid = input.value !== '' && (!Number.isFinite(number)
        || (min !== undefined && number < Number(min)) || (max !== undefined && number > Number(max))
        || (step !== 'any' && stepNumber > 0 && Math.abs(offset - Math.round(offset)) > 1e-7))
      input.setCustomValidity(invalid ? t('inputInvalidNumbers') : '')
    }
    useLayoutEffect(() => { if (ref.current) validate(ref.current) })
    return <input {...props} ref={ref} value={draft} required={required}
      type="text" inputMode={step === 1 || step === '1' ? 'numeric' : 'decimal'} onChange={event => {
        const next = event.target.value
        if (!/^-?\d*(?:[.,]\d*)?$/.test(next)) return
        event.target.value = next.replace(',', '.')
        setDraft(event.target.value)
        validate(event.target)
        onChange?.(event)
      }} onBlur={event => {
        validate(event.target)
        if (!event.target.checkValidity()) { event.target.reportValidity(); return }
        onBlur?.(event)
      }} />
  }
)

export default NumericInput
