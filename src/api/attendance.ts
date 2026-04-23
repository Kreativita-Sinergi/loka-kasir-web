import api from '@/lib/axios'
import type { PaginatedApiResponse, Attendance, AttendanceFilterParams } from '@/types'

export const getAttendances = (params?: AttendanceFilterParams) =>
  api.get<PaginatedApiResponse<Attendance>>('/attendance', { params })

/** Trigger CSV download by building a query-string URL and opening it. Returns the promise so callers can handle errors. */
export const exportAttendanceCsv = (params?: Omit<AttendanceFilterParams, 'page' | 'limit'>): Promise<void> => {
  const base = api.defaults.baseURL ?? ''
  const qs = new URLSearchParams()
  if (params?.start_date)  qs.set('start_date', params.start_date)
  if (params?.end_date)    qs.set('end_date',   params.end_date)
  if (params?.outlet_id)   qs.set('outlet_id',  params.outlet_id)
  if (params?.employee_id) qs.set('employee_id',params.employee_id)
  if (params?.status)      qs.set('status',     params.status)
  qs.set('export', 'csv')
  const token = localStorage.getItem('token') ?? sessionStorage.getItem('token') ?? ''
  const url = `${base}/attendance?${qs.toString()}`
  const a = document.createElement('a')
  a.setAttribute('download', 'absensi.csv')
  // Attach auth header via a Blob fetch so credentials travel with the request
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res.blob()
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob)
      a.href = objectUrl
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    })
}
