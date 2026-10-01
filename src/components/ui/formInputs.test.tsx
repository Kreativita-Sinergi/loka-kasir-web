import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Form from './Form'
import NumericInput from './NumericInput'

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })
function type(input: HTMLInputElement, draft: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, draft)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('input angka dan form', () => {
  it('desimal bisa diketik bertahap, pakai koma, dan dikosongkan', () => {
    function Draft() {
      const [value, setValue] = useState('')
      return <NumericInput min={0} step="any" value={value} onChange={event => setValue(event.target.value)} />
    }
    act(() => root.render(<Draft />))
    const input = host.querySelector('input')!
    type(input, '2')
    type(input, '2,')
    expect(input.value).toBe('2.')
    type(input, '2.5')
    expect(input.value).toBe('2.5')
    expect(input.checkValidity()).toBe(true)
    type(input, '')
    expect(input.value).toBe('')
  })
  it('draft desimal tidak hilang pada form yang langsung menyimpan state angka', () => {
    function DraftNumber() {
      const [value, setValue] = useState(0)
      return <NumericInput step="any" value={value} onChange={event => setValue(Number(event.target.value))} />
    }
    act(() => root.render(<DraftNumber />))
    const input = host.querySelector('input')!
    type(input, '2.')
    expect(input.value).toBe('2.')
    type(input, '2.5')
    expect(input.value).toBe('2.5')
    type(input, '')
    expect(input.value).toBe('')
  })
  it('batas dan bilangan bulat tetap berlaku meskipun input memakai text', () => {
    act(() => root.render(<NumericInput min={1} max={10} defaultValue="2" />))
    const input = host.querySelector('input')!
    type(input, '2.5')
    expect(input.checkValidity()).toBe(false)
    type(input, '11')
    expect(input.checkValidity()).toBe(false)
    type(input, '0')
    expect(input.checkValidity()).toBe(false)
    type(input, '3')
    expect(input.checkValidity()).toBe(true)
  })
  it('form menolak spasi saja dan kembali bisa dikirim setelah diperbaiki', () => {
    const save = vi.fn((event: React.FormEvent) => event.preventDefault())
    act(() => root.render(<Form onSubmit={save}><input required defaultValue="   " /><button>Simpan</button></Form>))
    const form = host.querySelector('form')!
    act(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(save).not.toHaveBeenCalled()
    type(host.querySelector('input')!, 'Tepung')
    act(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(save).toHaveBeenCalledOnce()
  })
  it('nama kolom terhubung ke input meskipun layout memakai label terpisah', () => {
    act(() => root.render(<Form><label>Nama bahan</label><input defaultValue="Tepung" /></Form>))
    const label = host.querySelector('label')!
    expect(label.control).toBe(host.querySelector('input'))
    expect(label.htmlFor).not.toBe('')
  })
  it('email invalid dan angka negatif tidak memanggil penyimpanan', () => {
    const save = vi.fn()
    act(() => root.render(<Form onSubmit={save}><input type="email" defaultValue="invalid" /><NumericInput min={0} step="any" defaultValue="-1" /></Form>))
    act(() => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(save).not.toHaveBeenCalled()
  })
})
