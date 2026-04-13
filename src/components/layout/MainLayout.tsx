import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      {/* capitalize-data: data user disimpan lowercase di DB, ditampilkan Title Case via CSS */}
      <div className="flex-1 flex flex-col overflow-hidden capitalize-data">
        <Outlet />
      </div>
    </div>
  )
}
