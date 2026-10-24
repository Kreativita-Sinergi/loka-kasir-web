import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CheckCircle2, MessageSquareHeart, Star } from 'lucide-react'
import { getPublicRating, submitPublicRating } from '@/api/public'
import { t } from '@/lib/i18n'
import { displayedText as titleCase } from '@/lib/textCase'

/**
 * Penilaian dari QR di bawah struk.
 *
 * Pembeli memberi bintang dan komentar dalam satu layar tanpa akun. Nomor
 * WhatsApp opsional, dan baru masuk daftar pelanggan toko bila pembeli
 * mencentang persetujuan — tanpa centang, nomornya hanya dipakai pemilik untuk
 * membalas keluhan ini. Nilai 1–3 bintang langsung dikabarkan ke pemilik, jadi
 * keluhan sampai ke toko sebelum ke ulasan publik.
 */
export default function RatingPage() {
  const { token = '' } = useParams()
  const [params] = useSearchParams()
  const bill = params.get('n') ?? ''
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)

  const info = useQuery({
    queryKey: ['public-rating', token, bill],
    queryFn: async () => (await getPublicRating(token, bill)).data.data,
    enabled: !!token,
    retry: false,
  })
  const submit = useMutation({
    mutationFn: () => submitPublicRating(token, { bill, rating, comment, name, phone, consent }),
  })

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8 space-y-5">{children}</div>
    </div>
  )

  if (info.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }
  if (info.isError || !info.data) {
    return shell(<p className="pt-24 text-center text-sm text-gray-600">{t('rtgInvalid')}</p>)
  }
  const d = info.data
  const header = (
    <div className="text-center space-y-1">
      {d.business_logo && <img src={d.business_logo} alt="" className="mx-auto h-14 w-14 rounded-2xl object-cover" />}
      <p className="text-lg font-semibold text-gray-900">{titleCase(d.business_name)}</p>
      {d.outlet_name && <p className="text-xs text-gray-500">{titleCase(d.outlet_name)}</p>}
    </div>
  )

  if (submit.isSuccess || d.already_rated) {
    return shell(
      <>
        {header}
        <div className="rounded-2xl bg-white border border-gray-200 p-6 text-center space-y-2">
          <CheckCircle2 size={40} className="mx-auto text-green-600" />
          <p className="text-base font-semibold text-gray-900">{d.already_rated && !submit.isSuccess ? t('rtgAlready') : t('rtgThanks')}</p>
          <p className="text-sm text-gray-600">{t('rtgThanksBody')}</p>
        </div>
      </>,
    )
  }

  const errorText = submit.isError ? t('rtgFailed') : ''
  return shell(
    <>
      {header}
      <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-5">
        <div className="text-center space-y-1">
          <p className="text-base font-semibold text-gray-900">{t('rtgQuestion')}</p>
          {d.bill_found && <p className="text-xs text-gray-500">{t('rtgBill', { bill: d.bill_number })}</p>}
        </div>
        <div className="flex justify-center gap-2" role="radiogroup" aria-label={t('rtgQuestion')}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}`}
              onClick={() => setRating(n)} className="p-1">
              <Star size={38} className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-900">
                {rating <= 3 ? t('rtgCommentLow') : t('rtgCommentHigh')}
              </span>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={500}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900" />
            </label>
            <div className="rounded-xl bg-gray-50 p-3 space-y-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                <MessageSquareHeart size={16} className="text-blue-600" /> {t('rtgContactTitle')}
              </p>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('rtgName')} maxLength={120}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('rtgPhone')} inputMode="tel" maxLength={20}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900" />
              <label className="flex items-start gap-2 text-xs text-gray-600">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
                {t('rtgConsent')}
              </label>
            </div>
            {errorText && <p className="text-sm text-red-600">{errorText}</p>}
            <button type="button" onClick={() => submit.mutate()} disabled={submit.isPending}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {t('rtgSubmit')}
            </button>
          </>
        )}
      </div>
      <p className="text-center text-xs text-gray-400">{t('rtgFootnote')}</p>
    </>,
  )
}
