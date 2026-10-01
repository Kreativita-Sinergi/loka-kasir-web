import { useId, useLayoutEffect, useRef, type FormHTMLAttributes } from 'react'
import { t } from '@/lib/i18n'

/** Native required text fields must contain more than whitespace. */
export default function Form({ onSubmit, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  const ref = useRef<HTMLFormElement>(null)
  const formId = useId()
  // Existing field layouts put labels beside their controls. Link those labels
  // so tapping the label focuses the input and screen readers announce it.
  useLayoutEffect(() => {
    const form = ref.current
    if (!form) return
    let index = 0
    for (const label of form.querySelectorAll('label')) {
      if (label.htmlFor || label.control) continue
      const sibling = label.nextElementSibling
      const control = sibling?.matches('input, select, textarea, button[role="combobox"]')
        ? sibling : sibling?.querySelector('input, select, textarea, button[role="combobox"]')
      if (!(control instanceof HTMLElement)) continue
      if (!control.id) {
        let id: string
        do { id = `${formId}-field-${index++}` } while (document.getElementById(id))
        control.id = id
      }
      label.htmlFor = control.id
    }
  })
  return <form {...props} ref={ref} onSubmit={event => {
    const fields = Array.from(event.currentTarget.elements)
    for (const field of fields) {
      if ((field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) && field.required
        && !field.disabled && !field.readOnly && !['checkbox', 'radio', 'file', 'password'].includes(field.type)
        && !field.value.trim()) {
        event.preventDefault()
        field.setCustomValidity(t('inputRequiredText'))
        field.reportValidity()
        field.addEventListener('input', () => field.setCustomValidity(''), { once: true })
        return
      }
    }
    if (!event.currentTarget.reportValidity()) { event.preventDefault(); return }
    onSubmit?.(event)
  }} />
}
