import api from '@/lib/axios'
import type { ApiResponse, PaginatedApiResponse, Notification } from '@/types'

export const getNotifications = (params?: Record<string, unknown>) =>
  api.get<PaginatedApiResponse<Notification>>('/notification', { params })

export const markAsRead = (id: string) =>
  api.put(`/notification/${id}/read`)

export const markAllAsRead = () =>
  api.put('/notification/read-all')

export const getUnreadCount = () =>
  api.get<ApiResponse<{ count: number }>>('/notification/unread-count')
