/**
 * Contoh isian ("Contoh: …") yang menyesuaikan jenis usaha.
 *
 * Kembarannya di aplikasi kasir: `lib/app/config/vertical_examples.dart`.
 * Isinya sengaja dijaga sama supaya pemilik yang menambah produk lewat
 * dashboard dan lewat HP melihat contoh yang sama — contoh yang berbeda antar
 * layar membuat orang mengira keduanya meminta hal yang berbeda.
 *
 * Kuncinya kode vertical dari server (`business_verticals.code`). Bisnis yang
 * belum memilih sub-jenis jatuh ke contoh per pilar (FNB / RETAIL / SERVICES),
 * lalu ke contoh netral.
 */

type Table = Record<string, string>

const PRODUCT_NAME: Table = {
  RESTORAN: 'Contoh: Nasi Goreng Spesial',
  KAFE: 'Contoh: Kopi Susu Gula Aren',
  KATERING: 'Contoh: Paket Nasi Box Ayam Bakar',
  FNB_LAINNYA: 'Contoh: Es Teh Manis',
  MINIMARKET: 'Contoh: Indomie Goreng',
  FASHION: 'Contoh: Kaos Polos Lengan Pendek',
  APOTEK: 'Contoh: Paracetamol 500 mg',
  KONTER_PULSA: 'Contoh: Pulsa Telkomsel 10.000',
  RETAIL_LAINNYA: 'Contoh: Sabun Mandi 250 ml',
  BENGKEL: 'Contoh: Ganti Oli Mesin',
  KONTER_HP: 'Contoh: Ganti LCD',
  LAUNDRY: 'Contoh: Cuci Kering Kiloan',
  SALON: 'Contoh: Potong Rambut Pria',
  PERCETAKAN: 'Contoh: Cetak Banner 3×1 m',
  SERVICES_LAINNYA: 'Contoh: Jasa Perbaikan',
  FNB: 'Contoh: Nasi Goreng Spesial',
  RETAIL: 'Contoh: Sabun Mandi 250 ml',
  SERVICES: 'Contoh: Jasa Perbaikan',
}

const VARIANT_TYPE: Table = {
  RESTORAN: 'Nama tipe (contoh: Porsi)',
  KAFE: 'Nama tipe (contoh: Ukuran)',
  KATERING: 'Nama tipe (contoh: Paket)',
  FNB_LAINNYA: 'Nama tipe (contoh: Ukuran)',
  MINIMARKET: 'Nama tipe (contoh: Kemasan)',
  FASHION: 'Nama tipe (contoh: Ukuran)',
  APOTEK: 'Nama tipe (contoh: Kemasan)',
  KONTER_PULSA: 'Nama tipe (contoh: Nominal)',
  RETAIL_LAINNYA: 'Nama tipe (contoh: Kemasan)',
  BENGKEL: 'Nama tipe (contoh: Merek Oli)',
  KONTER_HP: 'Nama tipe (contoh: Kualitas Part)',
  LAUNDRY: 'Nama tipe (contoh: Layanan)',
  SALON: 'Nama tipe (contoh: Kategori)',
  PERCETAKAN: 'Nama tipe (contoh: Bahan)',
  SERVICES_LAINNYA: 'Nama tipe (contoh: Layanan)',
  FNB: 'Nama tipe (contoh: Porsi)',
  RETAIL: 'Nama tipe (contoh: Ukuran)',
  SERVICES: 'Nama tipe (contoh: Layanan)',
}

/** Contoh SATU opsi varian — dipakai sebagai "Pilihan 1 (contoh: …)". */
const VARIANT_OPTION: Table = {
  RESTORAN: 'Kecil',
  KAFE: 'Panas',
  KATERING: '50 porsi',
  FNB_LAINNYA: 'Kecil',
  MINIMARKET: 'Sachet',
  FASHION: 'S',
  APOTEK: 'Strip',
  KONTER_PULSA: '10.000',
  RETAIL_LAINNYA: 'Kecil',
  BENGKEL: '1 L',
  KONTER_HP: 'Original',
  LAUNDRY: 'Reguler',
  SALON: 'Dewasa',
  PERCETAKAN: 'Flexi',
  SERVICES_LAINNYA: 'Reguler',
  FNB: 'Kecil',
  RETAIL: 'S',
  SERVICES: 'Reguler',
}

function pick(
  table: Table,
  verticalCode: string | undefined,
  businessTypeCode: string | undefined,
  fallback: string,
): string {
  return (
    table[(verticalCode ?? '').toUpperCase()] ??
    table[(businessTypeCode ?? '').toUpperCase()] ??
    fallback
  )
}

export const verticalExamples = {
  productName: (vertical?: string, type?: string) =>
    pick(PRODUCT_NAME, vertical, type, 'Contoh: Nama produk'),
  variantType: (vertical?: string, type?: string) =>
    pick(VARIANT_TYPE, vertical, type, 'Nama tipe (contoh: Pilihan)'),
  variantOption: (vertical?: string, type?: string) =>
    pick(VARIANT_OPTION, vertical, type, 'A'),
}
