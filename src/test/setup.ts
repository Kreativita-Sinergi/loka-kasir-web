import '@testing-library/jest-dom'

// Node 25 membawa `localStorage` bawaan yang menimpa milik jsdom. Tanpa
// `--localstorage-file` objek itu tidak punya getItem/setItem, sehingga setiap
// modul yang membaca sesi saat dimuat gagal di mesin lokal walau lolos di CI
// (Node 20). Pasang penyimpanan di memori bila yang tersedia tidak berfungsi.
function memoryStorage(): Storage {
  let data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear: () => { data = new Map() },
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => { data.delete(key) },
    setItem: (key, value) => { data.set(key, String(value)) },
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (typeof globalThis[name]?.getItem !== 'function') {
    Object.defineProperty(globalThis, name, { configurable: true, value: memoryStorage() })
  }
}
