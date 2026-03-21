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
      toast.success('Semua notifikasi ditandai dibaca')
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['unread-count'] })
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })

  const notifications = data?.data?.data?.data ?? []
  const pagination = data?.data?.data?.pagination
  const hasUnread = notifications.some((n) => !n.is_read)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Notifikasi" subtitle="Semua pemberitahuan masuk" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-600">
                {pagination?.total ?? 0} notifikasi
              </span>
            </div>
            {hasUnread && (
              <button
                onClick={() => markAllMut.mutate()}
                disabled={markAllMut.isPending}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition"
              >
                <CheckCheck size={14} />
                Tandai semua dibaca
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-gray-400">Tidak ada notifikasi</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((notif: Notification) => (
                <div
                  key={notif.id}
                  className={cn(
                    'px-5 py-4 flex gap-3 hover:bg-gray-50 transition-colors',
                    !notif.is_read && 'bg-blue-50/50'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    notif.is_read ? 'bg-gray-100' : 'bg-blue-100'
                  )}>
                    <Bell size={14} className={notif.is_read ? 'text-gray-400' : 'text-blue-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm font-medium', notif.is_read ? 'text-gray-700' : 'text-gray-900')}>
                        {notif.title}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {!notif.is_read && (
                          <button
                            onClick={() => markMut.mutate(notif.id)}
                            className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded transition"
                            title="Tandai dibaca"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <Badge variant={notif.is_read ? 'gray' : 'blue'} className="text-[10px]">
                          {notif.type}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{notif.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(notif.created_at)}</p>
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
