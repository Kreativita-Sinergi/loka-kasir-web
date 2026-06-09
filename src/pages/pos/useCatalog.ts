// Loads the POS catalog with offline support: when online it delta-syncs
// products into IndexedDB and refreshes reference data (categories, taxes,
// payment methods, order types); it always renders from the IndexedDB cache so
// the kasir keeps working without a connection.

import { useCallback, useEffect, useState } from 'react'
import { posDb } from '@/lib/posDb'
import { pullProducts } from '@/lib/posSync'
import { getCategories, getTaxes } from '@/api/library'
import { getPaymentMethods, getOrderTypes } from '@/api/master'
import type { Product, Category, PaymentMethod, OrderType } from '@/types'

interface CatalogState {
  products: Product[]
  categories: Category[]
  paymentMethods: PaymentMethod[]
  orderTypes: OrderType[]
  loading: boolean
  syncing: boolean
  refresh: () => Promise<void>
}

export function useCatalog(outletId: string | null): CatalogState {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [orderTypes, setOrderTypes] = useState<OrderType[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const readCache = useCallback(async () => {
    const [p, c, pm, ot] = await Promise.all([
      posDb.products.filter((x) => x.is_active !== false).toArray(),
      posDb.categories.toArray(),
      posDb.paymentMethods.toArray(),
      posDb.orderTypes.toArray(),
    ])
    setProducts(p)
    setCategories(c)
    setPaymentMethods(pm)
    setOrderTypes(ot)
  }, [])

  const refresh = useCallback(async () => {
    if (!outletId) return
    if (!navigator.onLine) {
      await readCache()
      return
    }
    setSyncing(true)
    try {
      await pullProducts(outletId)
      // Refresh reference data (small, fully replace each time).
      const [catRes, taxRes, pmRes, otRes] = await Promise.all([
        getCategories({ limit: 500 }).catch(() => null),
        getTaxes({ limit: 200 }).catch(() => null),
        getPaymentMethods({ limit: 100 }).catch(() => null),
        getOrderTypes({ limit: 100 }).catch(() => null),
      ])
      if (catRes) {
        const cats = catRes.data.data ?? []
        await posDb.categories.clear()
        await posDb.categories.bulkPut(cats)
      }
      if (taxRes) {
        const taxes = taxRes.data.data ?? []
        await posDb.taxes.clear()
        await posDb.taxes.bulkPut(taxes)
      }
      if (pmRes) {
        const pms = pmRes.data.data ?? []
        await posDb.paymentMethods.clear()
        await posDb.paymentMethods.bulkPut(pms)
      }
      if (otRes) {
        const ots = otRes.data.data ?? []
        await posDb.orderTypes.clear()
        await posDb.orderTypes.bulkPut(ots)
      }
    } finally {
      await readCache()
      setSyncing(false)
    }
  }, [outletId, readCache])

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      await readCache() // instant paint from cache
      if (active) await refresh()
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [outletId, readCache, refresh])

  return { products, categories, paymentMethods, orderTypes, loading, syncing, refresh }
}
