import { Link } from 'react-router-dom'
import { ChevronRight, Crown } from 'lucide-react'
import Header from '@/components/layout/Header'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import CurrencyMenu from '@/components/ui/CurrencyMenu'
import {
  NAV_ITEMS,
  SETTINGS_GROUPS,
  navDescription,
  navLabel,
  settingsGroupLabel,
  settingsGroupScope,
  type NavItem,
} from '@/components/layout/navItems'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/store/authStore'
import { t } from '@/lib/i18n'

/**
 * Hub Pengaturan — menggantikan 10 entri terpisah yang dulu memenuhi grup
 * "Pengaturan" di Sidebar. Kartunya diturunkan langsung dari NAV_ITEMS
 * (item ber-`settingsGroup`), jadi menambah halaman pengaturan baru cukup
 * dilakukan di satu tempat.
 *
 * Dikelompokkan seperti aplikasi kasir — Toko, Kasir & Karyawan, Pembayaran,
 * Akun, Lainnya — dan tiap kelompok membawa satu baris yang menjawab "setelan
 * ini berlaku ke mana". Itu pertanyaan yang paling sering salah dijawab
 * pemilik: ia mengubah sesuatu di dashboard lalu heran HP kasir tidak ikut
 * berubah, atau sebaliknya. Dua puluh kartu berderet tanpa judul tidak pernah
 * menjawabnya.
 */
export default function SettingsHubPage() {
  const { can, canAny, isPro } = usePermissions()
  const { user } = useAuthStore()
  const verticalCode = (
    user?.business?.business_vertical?.code ?? ''
  ).toUpperCase()
  // [CurrencyMenu] sudah menolak peran selain Owner dengan mengembalikan null;
  // syarat yang sama dipasang di sini agar kartu pembungkusnya tidak tersisa
  // sebagai kotak kosong bagi manajer.
  const isOwner = user?.role?.code === 'OWNER'

  const items = NAV_ITEMS.filter((item) => {
    if (!item.settingsGroup) return false
    // Kartu yang isinya hanya punya arti di sub-jenis usaha tertentu — setelan
    // apoteker penanggung jawab di sebuah bengkel hanya menambah satu baris
    // yang tidak akan pernah diisi.
    if (item.verticals && !item.verticals.includes(verticalCode)) return false
    if (item.anyOf && item.anyOf.length > 0) return canAny(...item.anyOf)
    if (item.permission) return can(item.permission)
    return true
  })

  const lockLabel = (item: NavItem): string | null => {
    if (item.planRequired === 'pro' && !isPro) return 'Pro'
    return null
  }

  const groups = SETTINGS_GROUPS.map((group) => ({
    group,
    items: items.filter((item) => item.settingsGroup === group),
  })).filter((section) => section.items.length > 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={t('navSettingsHub')}
        subtitle={t('settingsHubSubtitle')}
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {/*
          Bahasa ditaruh di atas daftar pengaturan, bukan di dalam salah satu
          halamannya: ia preferensi PERANGKAT INI, bukan setelan usaha, dan
          pengguna yang dasbornya salah bahasa harus bisa menemukannya tanpa
          menebak halaman mana yang memuatnya.
        */}
        <div className="max-w-4xl mb-6 p-4 bg-card border border-border rounded-xl">
          <LanguageSwitcher />
        </div>

        <div className="max-w-4xl space-y-7">
          {groups.map(({ group, items: groupItems }) => (
            <section key={group}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {settingsGroupLabel(group)}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                {settingsGroupScope(group)}
              </p>
              {/*
                Mata uang duduk di kelompok Toko karena ia memang berlaku ke
                seluruh toko, bukan ke perangkat ini. Ia dipasang sebagai
                komponennya sendiri, bukan kartu-tautan: menukar mata uang
                TIDAK mengonversi nominal yang sudah tersimpan, jadi ia butuh
                langkah konfirmasi yang sudah dimiliki [CurrencyMenu] — dan
                halaman kedua yang mengulang langkah itu hanya menambah tempat
                untuk salah menekannya. Hanya Owner yang melihatnya, mengikuti
                `AuthorizeOwner` di server.
              */}
              {group === 'store' && isOwner && (
                <div className="mb-3 p-4 bg-card border border-border rounded-xl">
                  <CurrencyMenu />
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {groupItems.map((item) => {
                  const lock = lockLabel(item)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="group flex items-start gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary-subtle/40 transition"
                    >
                      <span className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition">
                        {item.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {navLabel(item)}
                          </span>
                          {lock && (
                            <span className="inline-flex items-center gap-0.5 shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-warning-subtle text-warning">
                              <Crown size={9} />
                              {lock}
                            </span>
                          )}
                        </span>
                        {item.descriptionKey && (
                          <span className="block text-xs text-muted-foreground mt-1 leading-snug">
                            {navDescription(item)}
                          </span>
                        )}
                      </span>
                      <ChevronRight
                        size={15}
                        className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition"
                      />
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
