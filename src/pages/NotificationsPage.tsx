import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import Header from '@/components/layout/Header'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import { getNotifications, markAsRead, markAllAsRead } from '@/api/notifications'
import type { Notification } from '@/types'
import { formatDateTime, getErrorMessage } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function NotificationsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', { page, limit: 15 }],
    queryFn: () => getNotifications({ page, limit: 15 }),
  })

  const markMut = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['unread-count'] }) },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const markAllMut = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      toast.success('Semua Notifikasi Ditandai Dibaca')
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['unread-count'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const notifications = data?.data?.data ?? []
  const pagination = data?.data?.pagination
  const hasUnread = notifications.some((n) => !n.is_read)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Notifikasi" subtitle="Semua Pemberitahuan Masuk" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="bg-card rounded-2xl border border-border">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {pagination?.total ?? 0} Notifikasi
              </span>
            </div>
            {hasUnread && (
              <button
                onClick={() => markAllMut.mutate()}
                disabled={markAllMut.isPending}
                className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:text-blue-300 font-medium transition"
              >
                <CheckCheck size={14} />
                Tandai Semua Dibaca
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex gap-3">
                  <div className="w-8 h-8 bg-muted rounded-full animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-muted rounded animate-pulse w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">Tidak Ada Notifikasi</div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notif: Notification) => (
                <div
                  key={notif.id}
                  className={cn(
                    'px-5 py-4 flex gap-3 hover:bg-muted transition-colors',
                    !notif.is_read && 'bg-blue-50/50'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    notif.is_read ? 'bg-muted' : 'bg-blue-100 dark:bg-blue-500/15'
                  )}>
                    <Bell size={14} className={notif.is_read ? 'text-muted-foreground' : 'text-blue-600 dark:text-blue-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm font-medium', notif.is_read ? 'text-foreground' : 'text-foreground')}>
                        {notif.title}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {!notif.is_read && (
                          <button
                            onClick={() => markMut.mutate(notif.id)}
                            className="p-1 text-blue-400 hover:text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:bg-blue-500/15 rounded transition"
                            title="Tandai Dibaca"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <Badge variant={notif.is_read ? 'gray' : 'blue'} className="text-[10px]">
                          {notif.type}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{notif.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateTime(notif.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination page={page} total={pagination?.total ?? 0} limit={15} onChange={setPage} />
        </div>
      </div>
    </div>
  )
}
