/**
 * Cloudflare Turnstile hanya dipasang pada build produksi.
 *
 * Saat `npm run dev`, widget-nya sering gagal memuat — jaringan pengembang
 * memblokir `challenges.cloudflare.com`, atau mesinnya sedang offline. Karena
 * tombol kirim menunggu token captcha, kegagalan itu mengunci seluruh halaman
 * login dan pendaftaran padahal yang rusak cuma captchanya.
 *
 * Patokannya `import.meta.env.DEV` — bernilai true HANYA saat dev server, dan
 * selalu false pada `npm run build`. Jadi tidak ada jalan captcha ikut mati di
 * produksi, termasuk bila `.env` (yang ter-track git) tersalin ke mana-mana.
 */
export const CAPTCHA_ENABLED = !import.meta.env.DEV

/**
 * Token penanda yang dikirim saat captcha dimatikan.
 *
 * Backend memperlakukan keduanya secara terpisah: `middleware/captcha.go`
 * menolak header `X-Captcha-Token` yang KOSONG, sedangkan
 * `helper/captcha.go` melewati validasi bila `CAPTCHA_SECRET_KEY` tidak
 * dikonfigurasi. Maka header tetap harus terisi — cukup dengan penanda ini.
 *
 * Konsekuensinya: dev server harus menunjuk ke backend yang
 * `CAPTCHA_SECRET_KEY`-nya kosong. Menunjuk ke produksi tetap akan ditolak 403,
 * dan memang seharusnya begitu.
 */
export const DEV_CAPTCHA_TOKEN = 'dev-no-captcha'

/** Nilai awal/reset token captcha sesuai mode yang sedang berjalan. */
export const initialCaptchaToken = () =>
  CAPTCHA_ENABLED ? '' : DEV_CAPTCHA_TOKEN
