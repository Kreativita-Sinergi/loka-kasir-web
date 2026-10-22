import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Layers, Pencil, Plus, X } from 'lucide-react'
import ModifierGroupEditor from './ModifierGroupEditor'
import { getModifierGroups } from '@/api/products'
import type { ModifierGroup } from '@/types'
import { cn, formatCurrency } from '@/lib/utils'
import { modifierRuleLabel } from '@/lib/modifierGroups'
import { t } from '@/lib/i18n'

/**
 * Tab Ekstra di form produk: grup ekstra mana yang dipasang ke produk ini, dan
 * urutan tampilnya di kasir. Isi grup (pilihan & harga) tetap milik grupnya —
 * diubah dari sini pun berlaku untuk semua produk yang memasangnya.
 *
 * [value] adalah daftar id grup terurut; disimpan form setelah produknya
 * tersimpan, lewat PUT /product/:id/modifier-groups.
 */
export default function ProductExtrasSection({
  value, onChange, priceFromExtras, onPriceFromExtrasChange, priceFromExtrasAllowed, onEditorOpenChange,
}: {
  value: string[]
  onChange: (ids: string[]) => void
  priceFromExtras: boolean
  onPriceFromExtrasChange: (v: boolean) => void
  priceFromExtrasAllowed: boolean
  /** Form induk perlu tahu lembar editor terbuka supaya tidak ikut tertutup. */
  onEditorOpenChange?: (open: boolean) => void
}) {
  const [picking, setPicking] = useState(false)
  const [editor, setEditor] = useState<{ open: boolean; group: ModifierGroup | null }>({ open: false, group: null })

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['modifier-groups'],
    queryFn: async () => (await getModifierGroups()).data.data ?? [],
  })
  const byId = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups])
  const attached = value.map((id) => byId.get(id)).filter((g): g is ModifierGroup => !!g)
  const available = groups.filter((g) => !value.includes(g.id))

  const move = (i: number, dir: -1 | 1) => {
    const next = [...value]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  const openEditor = (group: ModifierGroup | null) => {
    setEditor({ open: true, group })
    onEditorOpenChange?.(true)
  }
  const closeEditor = () => {
    setEditor((e) => ({ ...e, open: false }))
    onEditorOpenChange?.(false)
  }

  return (
    <div className="space-y-5">
      {priceFromExtrasAllowed && (
        <label className="flex items-start gap-3 p-3 rounded-xl border border-border cursor-pointer">
          <input type="checkbox" checked={priceFromExtras} onChange={(e) => onPriceFromExtrasChange(e.target.checked)} className="mt-0.5 rounded" />
          <span>
            <span className="block text-sm font-medium text-foreground">{t('productPriceFromExtras')}</span>
            <span className="block text-xs text-muted-foreground mt-0.5">{t('productPriceFromExtrasHint')}</span>
          </span>
        </label>
      )}
      {priceFromExtras && attached.length === 0 && (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-3 py-2">
          {t('productExtrasNeedGroup')}
        </p>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('productExtrasAttached')}</p>
          <span className="text-xs text-muted-foreground">{t('extraCountLabel', { count: attached.length })}</span>
        </div>
        {attached.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground bg-muted rounded-lg border border-dashed border-border">
            <Layers size={20} className="mx-auto mb-2 opacity-60" />
            {t('productExtrasEmpty')}
          </div>
        ) : (
          <div className="border border-border rounded-xl divide-y divide-border">
            {attached.map((g, i) => (
              <div key={g.id} className="flex items-center gap-2 px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">{g.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[modifierRuleLabel(g), g.options.map((o) => o.name).join(', ')].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <button type="button" aria-label={t('productExtrasMoveUp')} disabled={i === 0} onClick={() => move(i, -1)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"><ArrowUp size={14} /></button>
                <button type="button" aria-label={t('productExtrasMoveDown')} disabled={i === attached.length - 1} onClick={() => move(i, 1)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"><ArrowDown size={14} /></button>
                <button type="button" aria-label={t('extraEdit')} onClick={() => openEditor(g)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"><Pencil size={14} /></button>
                <button type="button" aria-label={t('productExtrasDetach')} onClick={() => onChange(value.filter((id) => id !== g.id))} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setPicking((p) => !p)} disabled={available.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 border border-border text-sm font-medium rounded-xl hover:bg-muted disabled:opacity-50">
          <Plus size={14} /> {t('productExtrasAttach')}
        </button>
        <button type="button" onClick={() => openEditor(null)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700">
          <Plus size={14} /> {t('productExtrasCreate')}
        </button>
      </div>

      {picking && (
        <div className="border border-border rounded-xl divide-y divide-border max-h-64 overflow-y-auto">
          {isLoading && <p className="px-3 py-3 text-sm text-muted-foreground">{t('loading')}</p>}
          {available.map((g) => (
            <button key={g.id} type="button" onClick={() => { onChange([...value, g.id]); setPicking(false) }}
              className={cn('w-full text-left px-3 py-2.5 hover:bg-muted/50')}>
              <div className="text-sm font-semibold text-foreground">{g.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {[modifierRuleLabel(g), g.options.slice(0, 4).map((o) => `${o.name}${o.price > 0 ? ` +${formatCurrency(o.price)}` : ''}`).join(', ')].filter(Boolean).join(' · ')}
                {g.options.length > 4 ? ` +${g.options.length - 4}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}

      <ModifierGroupEditor
        open={editor.open}
        group={editor.group}
        showProducts={false}
        onClose={closeEditor}
        // Grup baru langsung terpasang ke produk ini.
        onSaved={(g) => { if (!editor.group && !value.includes(g.id)) onChange([...value, g.id]) }}
      />
    </div>
  )
}
