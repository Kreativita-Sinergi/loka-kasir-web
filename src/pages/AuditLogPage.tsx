import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/ui/EmptyState'
import { DataTable } from '@/components/ui/Table'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import { getAuditLogs, type AuditLogItem } from '@/api/auditLog'
import { formatDateTime } from '@/lib/utils'
import { t } from '@/lib/i18n'

const ENTITY_TYPES = ['', 'Product', 'Transaction', 'Employee', 'Outlet', 'RawMaterial']
const ACTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'REFUND', 'CANCEL', 'STOCK_ADJUST']

function actionBadge(action: string) {
  const map: Record<string, 'green' | 'blue' | 'red' | 'yellow' | 'gray'> = {
    CREATE: 'green',
    UPDATE: 'blue',
    DELETE: 'red',
    REFUND: 'yellow',
    CANCEL: 'red',
    STOCK_ADJUST: 'blue',
  }
  return <Badge variant={map[action] ?? 'gray'}>{action}</Badge>
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [entityType, setEntityType] = useState('')
  const [action, setAction] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', { page, limit: 20, entityType, action }],
    queryFn: () => getAuditLogs({
      page,
      limit: 20,
      entity_type: entityType || undefined,
      action: action || undefined,
    }),
  })

  const logs = data?.data?.data?.results ?? []
  const total = data?.data?.data?.total ?? 0

  const columns = [
    {
      key: 'created_at',
      label: t('labelTime'),
      render: (row: AuditLogItem) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>
      ),
    },
    {
      key: 'user_name',
      label: t('labelUser'),
      render: (row: AuditLogItem) => (
        <span className="text-sm font-medium text-foreground">{row.user_name || '-'}</span>
      ),
    },
    {
      key: 'action',
      label: t('labelActions'),
      render: (row: AuditLogItem) => actionBadge(row.action),
    },
    {
      key: 'entity_type',
      label: t('labelEntity'),
      render: (row: AuditLogItem) => (
        <Badge variant="gray">{row.entity_type}</Badge>
      ),
    },
    {
      key: 'description',
      label: t('finDescription'),
      render: (row: AuditLogItem) => (
        <span className="text-sm text-muted-foreground max-w-xs truncate block">{row.description || '-'}</span>
      ),
    },
    {
      key: 'ip_address',
      label: 'IP',
      render: (row: AuditLogItem) => (
        <span className="text-xs text-muted-foreground font-mono">{row.ip_address || '-'}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t('navActivityLog')} subtitle={t('auditPageSubtitle')} />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="bg-card rounded-2xl border border-border">
          {/* Filters */}
          <div className="p-4 border-b border-border flex flex-wrap items-center gap-3">
            <select
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1) }}
              className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ENTITY_TYPES.map((entity) => (
                <option key={entity} value={entity}>{entity || t('auditAllEntities')}</option>
              ))}
            </select>
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1) }}
              className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ACTIONS.map((a) => (
                <option key={a} value={a}>{a || t('auditAllActions')}</option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground ml-auto">{t('auditLogCount', { count: total })}</span>
          </div>

          <DataTable
            columns={columns as never[]}
            data={logs as never[]}
            loading={isLoading}
            emptySlot={
              <EmptyState
                title={t('auditEmpty')}
                description={t('auditEmptyDesc')}
              />
            }
          />
          <Pagination page={page} total={total} limit={20} onChange={setPage} />
        </div>
      </div>
    </div>
  )
}
