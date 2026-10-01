import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Pagination from './Pagination'
import { DataTable } from './Table'
import SearchableSelect from './SearchableSelect'
import Modal from './Modal'

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.append(host); root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })
const click = (element: Element) => act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
const key = (element: Element, name: string) => act(() => element.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true })))
function type(input: HTMLInputElement, value: string) {
  act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })) })
}

describe('navigasi daftar', () => {
  it('halaman terakhir tetap menawarkan lima nomor halaman dan menonaktifkan lanjut', () => {
    const change = vi.fn()
    act(() => root.render(<Pagination page={10} total={100} limit={10} onChange={change} />))
    const numbered = [...host.querySelectorAll('button')].filter(button => /^\d+$/.test(button.textContent!))
    expect(numbered.map(button => button.textContent)).toEqual(['6', '7', '8', '9', '10'])
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('10')
    expect(host.querySelector('button:last-child')).toBeDisabled()
    click(host.querySelector('button')!)
    expect(change).toHaveBeenCalledWith(9)
  })
  it('tombol di dalam baris tidak membuka detail; baris tetap bisa dibuka dengan keyboard', () => {
    const open = vi.fn(); const edit = vi.fn()
    act(() => root.render(<DataTable data={[{ id: 'one', name: 'Tepung' }]} onRowClick={open} columns={[
      { key: 'name', label: 'Nama' }, { key: 'actions', label: 'Aksi', render: () => <button onClick={edit}>Edit</button> },
    ]} />))
    click(host.querySelector('button')!)
    expect(edit).toHaveBeenCalledOnce(); expect(open).not.toHaveBeenCalled()
    key(host.querySelector('tbody tr')!, 'Enter')
    expect(open).toHaveBeenCalledWith({ id: 'one', name: 'Tepung' })
  })
  it('gagal memuat menampilkan coba lagi tanpa pesan daftar kosong', () => {
    const retry = vi.fn()
    act(() => root.render(<DataTable columns={[{ key: 'name', label: 'Nama' }]} data={[]} error={new Error('network')} onRetry={retry} emptyMessage="Kosong" />))
    expect(host.querySelector('[role="alert"]')).not.toBeNull()
    expect(host.textContent).not.toContain('Kosong')
    click(host.querySelector('button')!)
    expect(retry).toHaveBeenCalledOnce()
  })
})

describe('pemilih yang bisa dicari', () => {
  const options = [{ value: 'kg', label: 'Kilogram', hint: 'berat' }, { value: 'ml', label: 'Mililiter', hint: 'volume' }]
  it('Enter setelah mencari memilih hasil, bukan mengosongkan pilihan', () => {
    const change = vi.fn()
    act(() => root.render(<SearchableSelect value="kg" onChange={change} options={options} />))
    click(host.querySelector('button')!)
    const input = document.querySelector('input[role="combobox"]') as HTMLInputElement
    type(input, 'volume')
    key(input, 'Enter')
    expect(change).toHaveBeenCalledWith('ml')
  })
  it('mencari lewat keterangan dan memilih dengan keyboard', () => {
    const change = vi.fn()
    act(() => root.render(<SearchableSelect value="" onChange={change} options={options} clearable={false} />))
    click(host.querySelector('button')!)
    const input = document.querySelector('input[role="combobox"]') as HTMLInputElement
    type(input, 'volume')
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(1)
    key(input, 'Enter')
    expect(change).toHaveBeenCalledWith('ml')
    expect(document.querySelector('[role="listbox"]')).toBeNull()
    expect(document.activeElement).toBe(host.querySelector('button'))
  })
  it('dropdown berada dalam scope modal dan Escape menutup dropdown lebih dulu', () => {
    const close = vi.fn()
    act(() => root.render(<Modal open onClose={close} title="Bahan"><SearchableSelect value="kg" onChange={vi.fn()} options={options} /></Modal>))
    click(document.querySelector('button[role="combobox"]')!)
    const input = document.querySelector('input[role="combobox"]')!
    expect(document.querySelector('[role="dialog"]')?.contains(document.querySelector('[role="listbox"]'))).toBe(true)
    key(input, 'Escape')
    expect(document.querySelector('[role="listbox"]')).toBeNull()
    expect(close).not.toHaveBeenCalled()
  })
})
