import { t } from '@/lib/i18n'
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
  RESTORAN: 'Nasi Goreng Spesial',
  KAFE: 'Kopi Susu Gula Aren',
  KATERING: 'Paket Nasi Box Ayam Bakar',
  FNB_LAINNYA: 'Es Teh Manis',
  MINIMARKET: 'Indomie Goreng',
  FASHION: 'Kaos Polos Lengan Pendek',
  APOTEK: 'Paracetamol 500 mg',
  KONTER_PULSA: 'Pulsa Telkomsel 10.000',
  RETAIL_LAINNYA: 'Sabun Mandi 250 ml',
  BENGKEL: 'Ganti Oli Mesin',
  KONTER_HP: 'Ganti LCD',
  LAUNDRY: 'Cuci Kering Kiloan',
  SALON: 'Potong Rambut Pria',
  PERCETAKAN: 'Cetak Banner 3×1 m',
  SERVICES_LAINNYA: 'Jasa Perbaikan',
  FNB: 'Nasi Goreng Spesial',
  RETAIL: 'Sabun Mandi 250 ml',
  SERVICES: 'Jasa Perbaikan',
}

const VARIANT_TYPE: Table = {
  RESTORAN: 'Porsi',
  KAFE: 'Ukuran',
  KATERING: 'Paket',
  FNB_LAINNYA: 'Ukuran',
  MINIMARKET: 'Kemasan',
  FASHION: 'Ukuran',
  APOTEK: 'Kemasan',
  KONTER_PULSA: 'Nominal',
  RETAIL_LAINNYA: 'Kemasan',
  BENGKEL: 'Merek Oli',
  KONTER_HP: 'Kualitas Part',
  LAUNDRY: 'Layanan',
  SALON: 'Kategori',
  PERCETAKAN: 'Bahan',
  SERVICES_LAINNYA: 'Layanan',
  FNB: 'Porsi',
  RETAIL: 'Ukuran',
  SERVICES: 'Layanan',
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

// Tabel di atas menyimpan CONTOHNYA saja ("Nasi Goreng Spesial", "Porsi"),
// bukan kalimat pembungkusnya. Contohnya memang berjangkar pada pasar
// Indonesia dan tidak diterjemahkan — mengganti "Nasi Goreng Spesial" dengan
// terjemahan harfiah tidak menolong siapa pun. Yang diterjemahkan adalah
// bingkainya, sehingga pemilik izakaya di Osaka membaca "例：Nasi Goreng
// Spesial" alih-alih kalimat berbahasa Indonesia utuh.
export const verticalExamples = {
  productName: (vertical?: string, type?: string) =>
    t('exampleFrame', { example: pick(PRODUCT_NAME, vertical, type, t('productName')) }),
  variantType: (vertical?: string, type?: string) =>
    t('exampleVariantTypeFrame', { example: pick(VARIANT_TYPE, vertical, type, t('menuVariant')) }),
  variantOption: (vertical?: string, type?: string) =>
    pick(VARIANT_OPTION, vertical, type, 'A'),
}
