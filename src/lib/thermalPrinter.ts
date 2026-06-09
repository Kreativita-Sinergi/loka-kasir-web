/* eslint-disable @typescript-eslint/no-explicit-any */
// Cetak ESC/POS ke printer thermal langsung dari browser (best-effort, Chromium):
//   - WebUSB  : printer USB di counter (navigator.usb)
//   - Web Bluetooth : printer BLE portabel (navigator.bluetooth)
// Keduanya butuh HTTPS/localhost + gesture user (pemilihan device). Tidak tersedia
// di Safari/Firefox — pemanggil harus fallback ke window.print().

export const usbSupported = (): boolean =>
  typeof navigator !== 'undefined' && 'usb' in navigator

export const bluetoothSupported = (): boolean =>
  typeof navigator !== 'undefined' && 'bluetooth' in navigator

// ─── WebUSB ──────────────────────────────────────────────────────────────────

export async function printViaUSB(data: Uint8Array): Promise<void> {
  const usb = (navigator as any).usb
  if (!usb) throw new Error('WebUSB tidak didukung browser ini')

  // Pakai device yang sudah pernah diizinkan; kalau belum, minta user pilih.
  const known: any[] = await usb.getDevices()
  let device = known[0]
  if (!device) device = await usb.requestDevice({ filters: [] })
  if (!device) throw new Error('Tidak ada printer dipilih')

  await device.open()
  if (device.configuration === null) await device.selectConfiguration(1)

  // Cari interface dengan endpoint OUT (bulk) untuk dikirimi data.
  let endpointNumber = -1
  let interfaceNumber = -1
  for (const iface of device.configuration.interfaces) {
    for (const alt of iface.alternates) {
      const out = alt.endpoints.find((e: any) => e.direction === 'out')
      if (out) {
        interfaceNumber = iface.interfaceNumber
        endpointNumber = out.endpointNumber
        break
      }
    }
    if (endpointNumber !== -1) break
  }
  if (endpointNumber === -1) throw new Error('Printer tidak punya endpoint OUT')

  await device.claimInterface(interfaceNumber)
  await device.transferOut(endpointNumber, data)
  await device.close().catch(() => {})
}

// ─── Web Bluetooth ───────────────────────────────────────────────────────────

// Service & karakteristik umum untuk printer thermal BLE.
const PRINTER_SERVICE = '000018f0-0000-1000-8000-00805f9b34fb'

export async function printViaBluetooth(data: Uint8Array): Promise<void> {
  const bt = (navigator as any).bluetooth
  if (!bt) throw new Error('Web Bluetooth tidak didukung browser ini')

  const device = await bt.requestDevice({
    filters: [{ services: [PRINTER_SERVICE] }],
    optionalServices: [PRINTER_SERVICE],
  })
  const server = await device.gatt.connect()
  const service = await server.getPrimaryService(PRINTER_SERVICE)
  const chars: any[] = await service.getCharacteristics()
  const writable = chars.find(
    (c) => c.properties.write || c.properties.writeWithoutResponse,
  )
  if (!writable) throw new Error('Karakteristik tulis tidak ditemukan')

  // Tulis bertahap (MTU BLE kecil) agar tidak terpotong.
  const CHUNK = 180
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK)
    if (writable.writeValueWithoutResponse) {
      await writable.writeValueWithoutResponse(chunk)
    } else {
      await writable.writeValue(chunk)
    }
  }
  server.disconnect()
}
