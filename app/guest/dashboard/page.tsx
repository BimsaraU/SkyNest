// app/guest/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import GuestNavbar from '@/app/components/GuestNavbar'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CalendarDays, ConciergeBell, Star, CreditCard, Loader2, AlertTriangle, Wrench, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react'

interface UpcomingBooking {
  booking_reference: string
  room_type: string
  room_number: string
  branch_name: string
  check_in_date: string
  check_out_date: string
  status: string
  id: number
}

interface Service {
  name: string
  date: string
  status: string
  booking_reference: string
}

interface Statistics {
  total_bookings: number
  active_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  total_spent: number
  pending_payments: number
  pending_amount: number
}

export default function GuestDashboardPage() {
  interface DashboardAlert {
    id: string
    type: 'maintenance'
    priority: 'Low' | 'Normal' | 'High' | 'Urgent'
    title: string
    message: string
    status: string
    created_at: string
    assigned_to?: string
    is_read: boolean
  }

  const [upcomingBooking, setUpcomingBooking] = useState<UpcomingBooking | null>(null)
  const [recentServices, setRecentServices] = useState<Service[]>([])
  const [alerts, setAlerts] = useState<DashboardAlert[]>([])
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0)
  const [statistics, setStatistics] = useState<Statistics>({
    total_bookings: 0,
    active_bookings: 0,
    completed_bookings: 0,
    cancelled_bookings: 0,
    total_spent: 0,
    pending_payments: 0,
    pending_amount: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
    fetchAlerts()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      console.log('[DASHBOARD FRONTEND] Fetching dashboard data...')
      const response = await fetch('/api/guest/dashboard')
      console.log('[DASHBOARD FRONTEND] Dashboard response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('[DASHBOARD FRONTEND] Dashboard API error:', errorData)
        throw new Error(errorData.error || 'Failed to fetch dashboard data')
      }
      
      const data = await response.json()
      console.log('[DASHBOARD FRONTEND] Dashboard data:', data)
      setUpcomingBooking(data.upcoming_booking)
      setRecentServices(data.recent_services || [])
      setStatistics(data.statistics || {
        total_bookings: 0,
        active_bookings: 0,
        completed_bookings: 0,
        cancelled_bookings: 0,
        total_spent: 0,
        pending_payments: 0,
        pending_amount: 0
      })
    } catch (err) {
      console.error('[DASHBOARD FRONTEND] Error:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAlerts = async () => {
    try {
      console.log('[DASHBOARD FRONTEND] Fetching alerts...')
      // Fetch InProgress alerts (active maintenance requests)
      const response = await fetch('/api/guest/alerts?status=InProgress')
      console.log('[DASHBOARD FRONTEND] Alerts response status:', response.status)
      
      if (!response.ok) {
        console.error('[DASHBOARD FRONTEND] Alerts API error:', response.statusText)
        setAlerts([])
        return
      }
      
      const data = await response.json()
      console.log('[DASHBOARD FRONTEND] Alerts data:', data)
      
      // Get top 5 most important InProgress alerts for dashboard
      const topAlerts = (data.alerts || []).slice(0, 5)
      setAlerts(topAlerts)
      
      // Also count pending alerts for the badge
      const pendingResponse = await fetch('/api/guest/alerts?status=Pending')
      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json()
        const totalUnread = topAlerts.filter((a: DashboardAlert) => !a.is_read).length + 
                           (pendingData.alerts || []).filter((a: DashboardAlert) => !a.is_read).length
        setUnreadAlertsCount(totalUnread)
      } else {
        setUnreadAlertsCount(topAlerts.filter((a: DashboardAlert) => !a.is_read).length)
      }
    } catch (err) {
      console.error('[DASHBOARD FRONTEND] Error fetching alerts:', err)
      setAlerts([]) // Set empty alerts on error
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'text-red-700 bg-red-100'
      case 'High': return 'text-orange-700 bg-orange-100'
      case 'Normal': return 'text-blue-700 bg-blue-100'
      case 'Low': return 'text-gray-700 bg-gray-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'InProgress': return <Clock className="w-4 h-4 text-blue-600" />
      case 'Pending': return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'Cancelled': return <AlertTriangle className="w-4 h-4 text-red-600" />
      default: return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-green-700 bg-green-100'
      case 'InProgress': return 'text-blue-700 bg-blue-100'
      case 'Pending': return 'text-yellow-700 bg-yellow-100'
      case 'Cancelled': return 'text-red-700 bg-red-100'
      default: return 'text-gray-700 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-t from-amber-700/30 to-amber-50">
      <GuestNavbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-5xl font-bold text-gray-900 mb-8 font-l">Welcome back!</h1>
        
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error loading dashboard: {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white/80 backdrop-blur-lg border border-gray-200/80 rounded-2xl">
                <CardContent className="pt-6">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Total Bookings</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{statistics.total_bookings}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/80 backdrop-blur-lg border border-gray-200/80 rounded-2xl">
                <CardContent className="pt-6">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Active</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{statistics.active_bookings}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/80 backdrop-blur-lg border border-gray-200/80 rounded-2xl">
                <CardContent className="pt-6">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Pending Payments</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">${Number(statistics.pending_amount).toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card className="bg-white/80 backdrop-blur-lg border border-gray-200/80 rounded-2xl">
                <CardContent className="pt-6">
                  <p className="text-xs text-gray-500 uppercase font-semibold">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">${Number(statistics.total_spent).toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Booking */}
            <Card className="mb-5 shadow-xl bg-gradient-to-b from-white/80 to-white/10 backdrop-blur-lg border border-gray-200/80 rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold text-gray-900">Upcoming Booking</CardTitle>
                        <CardDescription>Your next luxury escape is confirmed.</CardDescription>
                    </div>
                    <Link href="/guest/my-bookings" passHref><Button variant="outline">View all</Button></Link>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingBooking ? (
                  <div className="grid md:grid-cols-4 gap-6 items-center">
                    <div>
                      <p className="text-gray-500 text-xs uppercase font-semibold">Branch</p>
                      <p className="text-lg font-medium text-gray-900">{upcomingBooking.branch_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase font-semibold">Room</p>
                      <p className="text-lg font-medium text-gray-900">{upcomingBooking.room_type} - {upcomingBooking.room_number}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase font-semibold">Dates</p>
                      <p className="text-lg font-medium text-gray-900">
                        {new Date(upcomingBooking.check_in_date).toLocaleDateString()} – {new Date(upcomingBooking.check_out_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase font-semibold">Status</p>
                      <p className="text-lg font-medium text-green-600">{upcomingBooking.status}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-600">You have no upcoming bookings.</p>
                )}
                <div className="mt-6 flex space-x-4">
                  <Link href="/guest/booking" passHref><Button>Make a new booking</Button></Link>
                  <Link href="/guest/my-bookings" passHref><Button variant="secondary">Manage bookings</Button></Link>
                </div>
              </CardContent>
            </Card>

            {/* Alerts Summary Section */}
            <Card className="mb-5 shadow-xl bg-gradient-to-b from-white/80 to-white/10 backdrop-blur-lg border border-gray-200/80 rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900">Recent Alerts</CardTitle>
                      <CardDescription>Important notifications and updates</CardDescription>
                    </div>
                  </div>
                  <Link href="/guest/alerts" passHref>
                    <Button variant="outline" size="sm">
                      View All
                      {unreadAlertsCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
                          {unreadAlertsCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {alerts.length > 0 ? (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        className={`bg-white/50 rounded-lg p-4 border hover:shadow-md transition-shadow ${
                          !alert.is_read ? 'border-l-4 border-amber-500' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${
                            alert.type === 'maintenance' ? 'bg-orange-100 text-orange-700' :
                            alert.type === 'service' ? 'bg-purple-100 text-purple-700' :
                            alert.type === 'booking' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {alert.type === 'maintenance' ? <Wrench className="w-4 h-4" /> :
                             alert.type === 'service' ? <ConciergeBell className="w-4 h-4" /> :
                             alert.type === 'booking' ? <CalendarDays className="w-4 h-4" /> :
                             <CreditCard className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-gray-900 text-sm">
                                    {alert.title}
                                  </span>
                                  {!alert.is_read && (
                                    <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                      NEW
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-1">{alert.message}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(alert.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex flex-col gap-1 ml-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(alert.priority)}`}>
                                  {alert.priority}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(alert.status)}`}>
                                  {getStatusIcon(alert.status)}
                                  {alert.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-center pt-2">
                      <Link href="/guest/alerts" passHref>
                        <Button variant="link" className="text-amber-600 hover:text-amber-700">
                          View all alerts →
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">No alerts</p>
                    <p className="text-sm text-gray-500">You're all caught up!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Services & Quick Links */}
            <div className="grid md:grid-cols-2 gap-5">
                <Card className="shadow-xl bg-gradient-to-b from-white/80 to-white/10 backdrop-blur-lg border border-gray-200/80 rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-900">Recent Services</CardTitle>
                        <CardDescription>A look at your recently enjoyed amenities.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentServices.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {recentServices.map((service, idx) => (
                            <li key={idx} className="py-3 flex items-center justify-between">
                                <div>
                                    <span className="font-medium text-gray-800">{service.name}</span>
                                    <span className="ml-2 text-xs text-gray-500">{service.date}</span>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">{service.status}</span>
                            </li>
                            ))}
                        </ul>
                        ) : (
                        <p className="text-gray-600">No recent service requests.</p>
                        )}
                    </CardContent>
                </Card>
                
                <Card className="shadow-xl bg-gradient-to-b from-white/80 to-white/10 backdrop-blur-lg border border-gray-200/80 rounded-2xl">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-gray-900">Quick Links</CardTitle>
                        <CardDescription>Access your guest portal features.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Link href="/guest/bills" className="bg-white/50 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-amber-50/80 transition-colors hover:shadow-lg">
                            <CreditCard className="w-8 h-8 mb-2 text-amber-600"/>
                            <span className="font-semibold text-gray-800">My Bills</span>
                            <span className="text-xs text-gray-600">View & pay</span>
                        </Link>
                        <Link href="/guest/profile" className="bg-white/50 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-amber-50/80 transition-colors hover:shadow-lg">
                            <Star className="w-8 h-8 mb-2 text-amber-600"/>
                            <span className="font-semibold text-gray-800">Profile</span>
                            <span className="text-xs text-gray-600">Update settings</span>
                        </Link>
                        <Link href="/guest/services" className="bg-white/50 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-amber-50/80 transition-colors hover:shadow-lg">
                            <ConciergeBell className="w-8 h-8 mb-2 text-amber-600"/>
                            <span className="font-semibold text-gray-800">Order Services</span>
                            <span className="text-xs text-gray-600">Spa, Dining, More</span>
                        </Link>
                        <Link href="/guest/my-bookings" className="bg-white/50 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-amber-50/80 transition-colors hover:shadow-lg">
                            <CalendarDays className="w-8 h-8 mb-2 text-amber-600"/>
                            <span className="font-semibold text-gray-800">My Bookings</span>
                            <span className="text-xs text-gray-600">View all trips</span>
                        </Link>
                    </CardContent>
                </Card>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

