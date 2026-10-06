import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SearchableSelect from './SearchableSelect'

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })
const click = (element: Element) => act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
const key = (element: Element, name: string) => act(() => element.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true })))

describe('pemilih daftar pendek (tanpa kolom cari)', () => {
  const options = [{ value: 'fix', label: 'Nominal' }, { value: 'pct', label: 'Persen' }, { value: 'free', label: 'Gratis' }]
  it('tiga pilihan tidak memunculkan kolom cari; panah bawah lalu Enter memilih pilihan berikutnya', () => {
    const change = vi.fn()
    act(() => root.render(<SearchableSelect value="fix" onChange={change} options={options} clearable={false} />))
    click(host.querySelector('button')!)
    expect(document.querySelector('input[role="combobox"]')).toBeNull()
    const list = document.querySelector('[role="listbox"]')!
    expect(list).not.toBeNull()
    key(list, 'ArrowDown')
    key(list, 'Enter')
    expect(change).toHaveBeenCalledWith('pct')
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  })
  it('clearable={false} dengan pilihan "" tetap menampilkan dan membolehkan memilihnya', () => {
    const change = vi.fn()
    const withAll = [{ value: '', label: 'Semua Status' }, ...options]
    act(() => root.render(<SearchableSelect value="pct" onChange={change} options={withAll} clearable={false} />))
    expect(host.querySelector('button')?.textContent).toContain('Persen')
    click(host.querySelector('button')!)
    const rendered = [...document.querySelectorAll('[role="option"]')]
    expect(rendered.map(option => option.textContent)).toEqual(['Semua Status', 'Nominal', 'Persen', 'Gratis'])
    click(rendered[0])
    expect(change).toHaveBeenCalledWith('')
  })
})
