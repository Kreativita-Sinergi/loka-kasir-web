# Context: Loka Kasir Web (Dashboard Admin)

## Tech Stack
- **Framework:** React + Vite
- **Bahasa:** TypeScript (`.tsx`, `.ts`)
- **Networking:** Axios
- **State Management:** Zustand / Context API (via `src/store/`)

## Struktur Direktori
- `src/api/`: Berisi semua fungsi pemanggilan *endpoint* backend menggunakan Axios.
- `src/components/`:
  - `ui/`: Komponen dasar yang *reusable* (Modal, Badge, Table, dll).
  - `layout/`: Komponen struktural (Sidebar, Header).
- `src/pages/`: Komponen *View* utama yang di-render oleh *Router*.
- `src/store/`: *Global state management*.
- `src/types/`: Definisi *interface* dan *type* TypeScript.
- `.env`: Berisi variabel lingkungan untuk konfigurasi aplikasi.

## Aturan Penulisan Kode (Coding Rules)
1. **TypeScript Strictness:** - Selalu gunakan antarmuka (interface/type) yang jelas untuk *props* komponen dan *payload* API. Definisikan *type* di folder `src/types/` jika dipakai di banyak tempat.
2. **API Calls:** - Semua *request* jaringan harus diletakkan di `src/api/` dan menggunakan instance Axios dari `src/lib/axios.ts` (karena instance ini biasanya sudah memiliki interseptor untuk token).
3. **Komponen Fungsional:** - Gunakan *Functional Components* dengan React Hooks. Hindari penggunaan *Class Components*.
4. **Penggunaan UI:** - Prioritaskan pemakaian komponen dari `src/components/ui/` (contoh: `<Table />`, `<Modal />`, `<Pagination />`) agar desain tetap konsisten di seluruh dashboard.