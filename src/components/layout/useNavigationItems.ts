import { useQuery } from '@tanstack/react-query'
import { getOutletConfig } from '@/api/outlets'
import { usePermissions } from '@/hooks/usePermissions'
import { useAuthStore } from '@/store/authStore'
import { useOutletStore } from '@/store/outletStore'
import { NAV_ITEMS, roleAllowsNav } from './navItems'

export function useNavigationItems() {
  const { can, canAny } = usePermissions()
  const user = useAuthStore(state => state.user)
  const selectedOutlet = useOutletStore(state => state.selected)
  const { data } = useQuery({
    queryKey: ['outlet-config', selectedOutlet?.id],
    queryFn: () => getOutletConfig(selectedOutlet!.id),
    enabled: !!selectedOutlet?.id,
  })
  const vertical = (user?.business?.business_vertical?.code ?? '').toUpperCase()
  return NAV_ITEMS.filter((item, index, all) => {
    if (all.findIndex(entry => entry.path === item.path) !== index) return false
    if (!roleAllowsNav(item, user?.role?.code)) return false
    if (item.path === '/master/tables' && data?.data?.data && !data.data.data.has_table) return false
    if (item.verticals && !item.verticals.includes(vertical)) return false
    if (item.anyOf?.length) return canAny(...item.anyOf)
    return !item.permission || can(item.permission)
  })
}
