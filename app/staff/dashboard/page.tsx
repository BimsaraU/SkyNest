// app/staff/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import StaffNavbar from '@/app/components/StaffNavbar'
import { Key, DoorOpen, BedDouble, Bell, AlertCircle, Search, Loader2 } from 'lucide-react'

// Reusable Themed Components
const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[#181d28] border border-gray-800 rounded-xl ${className}`}>{children}</div>
)
const CardHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 border-b border-gray-800 ${className}`}>{children}</div>
)
const CardContent = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-6 ${className}`}>{children}</div>
)

const getPriorityColor = (priority: string) => {
  if (priority === 'High' || priority === 'Urgent') return 'text-red-400'
  if (priority === 'Normal') return 'text-yellow-400'
  return 'text-blue-400'
}

export default function StaffDashboardPage() {
  const [staffMember, setStaffMember] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [pendingTasks, setPendingTasks] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [guestSearch, setGuestSearch] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch staff member info
      const meRes = await fetch('/api/auth/me')
      if (meRes.ok) {
        const response = await meRes.json()
        const meData = response.user || response
        setStaffMember({
          name: `${meData.firstName} ${meData.lastName}`,
          employeeId: meData.employeeId || 'N/A',
          role: meData.position || 'Staff',
          branch: meData.branchName || 'Sky Nest'
        })
      }

      // Fetch today's statistics
      const today = new Date().toISOString().split('T')[0]
      const bookingsRes = await fetch(`/api/staff/bookings?date=${today}`)
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json()
        const checkInsToday = bookingsData.data?.filter((b: any) => 
          b.check_in_date === today && b.status === 'CheckedIn'
        ).length || 0
        const checkOutsToday = bookingsData.data?.filter((b: any) => 
          b.check_out_date === today && b.status === 'CheckedOut'
        ).length || 0
        const currentOccupancy = bookingsData.data?.filter((b: any) => 
          b.status === 'CheckedIn'
        ).length || 0

        setStats({
          checkInsToday,
          checkOutsToday,
          currentOccupancy,
          totalRooms: 60, // Can be fetched from rooms API
          pendingRequests: 0 // Will be updated from maintenance API
        })
      }

      // Fetch pending tasks (maintenance for maintenance staff, bookings for front desk)
      const maintenanceRes = await fetch('/api/staff/maintenance/assigned')
      if (maintenanceRes.ok) {
        const maintenanceData = await maintenanceRes.json()
        const pendingMaintenance = maintenanceData.data?.filter((m: any) => 
          m.status === 'Pending' || m.status === 'InProgress'
        ).slice(0, 5) || []
        
        setPendingTasks(pendingMaintenance.map((m: any) => ({
          id: m.id,
          type: 'maintenance',
          description: m.description || `Maintenance: ${m.room_number}`,
          priority: m.priority,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })))
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGuestSearch = async () => {
    if (!guestSearch.trim()) return
    window.location.href = `/staff/bookings?search=${encodeURIComponent(guestSearch)}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#10141c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#10141c] text-gray-300">
      <StaffNavbar staffMember={staffMember || { name: 'Staff Member', role: 'Staff' }} />
      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-6 mb-8 text-white">
            <h1 className="text-2xl font-bold mb-1 text-amber-300">
              Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {staffMember?.name.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-amber-100/80">
              {staffMember?.role} at {staffMember?.branch}
            </p>
          </div>

          {/* Guest Search (Front Desk Only) */}
          {staffMember?.role?.toLowerCase().includes('front desk') && (
            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search guest by name, email, or booking reference..."
                      value={guestSearch}
                      onChange={(e) => setGuestSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGuestSearch()}
                      className="w-full pl-10 pr-4 py-3 bg-[#10141c] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    onClick={handleGuestSearch}
                    className="px-6 py-3 bg-amber-500 text-black font-semibold rounded-lg hover:bg-amber-600 transition-colors"
                  >
                    Search Guest
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-gray-400">Check-ins Today</p>
                  <Key size={18} className="text-green-400"/>
                </div>
                <p className="text-3xl font-bold text-white">{stats?.checkInsToday || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-gray-400">Check-outs Today</p>
                  <DoorOpen size={18} className="text-red-400"/>
                </div>
                <p className="text-3xl font-bold text-white">{stats?.checkOutsToday || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-gray-400">Current Occupancy</p>
                  <BedDouble size={18} className="text-blue-400"/>
                </div>
                <p className="text-3xl font-bold text-white">{stats?.currentOccupancy || 0}</p>
                <p className="text-xs text-gray-500 mt-1">of {stats?.totalRooms || 0} rooms</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-gray-400">Pending Tasks</p>
                  <Bell size={18} className="text-yellow-400"/>
                </div>
                <p className="text-3xl font-bold text-white">{pendingTasks.length}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Pending Tasks */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold text-white">Your Priority Tasks</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingTasks.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No pending tasks</p>
                ) : (
                  pendingTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-[#10141c] rounded-lg border border-gray-800">
                      <div className="flex items-center space-x-3">
                        <div className={`p-1.5 rounded-full ${getPriorityColor(task.priority)}/20`}>
                          <AlertCircle size={16} className={getPriorityColor(task.priority)} />
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{task.description}</p>
                          {task.time && <p className="text-xs text-gray-500">Created: {task.time}</p>}
                        </div>
                      </div>
                      <Link
                        href={task.type === 'maintenance' ? '/staff/maintenance/assigned' : '/staff/bookings'}
                        className="px-3 py-1 text-xs font-semibold bg-amber-400 text-black rounded-md hover:bg-amber-500"
                      >
                        Handle
                      </Link>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold text-white">Quick Actions</h2>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Link 
                  href="/staff/bookings" 
                  className="flex flex-col items-center justify-center p-4 bg-[#10141c] rounded-lg border border-gray-800 hover:border-amber-400 hover:text-amber-400 transition-colors"
                >
                  <Key size={24} className="mb-2"/>
                  <span className="text-sm font-semibold">Manage Bookings</span>
                </Link>
                <Link 
                  href="/staff/rooms" 
                  className="flex flex-col items-center justify-center p-4 bg-[#10141c] rounded-lg border border-gray-800 hover:border-amber-400 hover:text-amber-400 transition-colors"
                >
                  <BedDouble size={24} className="mb-2"/>
                  <span className="text-sm font-semibold">Room Status</span>
                </Link>
                {staffMember?.role?.toLowerCase().includes('maintenance') && (
                  <Link 
                    href="/staff/maintenance/assigned" 
                    className="flex flex-col items-center justify-center p-4 bg-[#10141c] rounded-lg border border-gray-800 hover:border-amber-400 hover:text-amber-400 transition-colors"
                  >
                    <Bell size={24} className="mb-2"/>
                    <span className="text-sm font-semibold">My Tasks</span>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
