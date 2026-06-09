// Persistent storage: minta browser agar TIDAK menghapus IndexedDB (antrian
// transaksi offline POS) saat storage menipis. Best-effort — beberapa browser
// memberi otomatis, sebagian minta interaksi/izin. Aman dipanggil berkali-kali.

export interface StorageStatus {
  supported: boolean
  persisted: boolean
}

export async function requestPersistentStorage(): Promise<StorageStatus> {
  try {
    if (!navigator.storage?.persist) {
      return { supported: false, persisted: false }
    }
    const already = (await navigator.storage.persisted?.()) ?? false
    if (already) return { supported: true, persisted: true }
    const granted = await navigator.storage.persist()
    return { supported: true, persisted: granted }
  } catch {
    return { supported: false, persisted: false }
  }
}
