import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Coba ulang sekali saja saat gagal (hindari memperburuk beban saat backend
      // sedang tertekan karena banyak pengguna).
      retry: 1,
      // Data dianggap "segar" 30 detik — dalam rentang ini tidak ada refetch.
      staleTime: 30_000,
      // Simpan cache 5 menit setelah tak terpakai agar navigasi balik terasa instan.
      gcTime: 5 * 60_000,
      // JANGAN refetch otomatis saat tab kembali fokus. Default React Query (true)
      // memicu badai request ke backend saat banyak pengguna sering berpindah tab.
      // Penyegaran manual tersedia lewat tombol "Muat ulang data" di Header.
      refetchOnWindowFocus: false,
    },
  },
})
