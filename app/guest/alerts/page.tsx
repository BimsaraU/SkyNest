// app/guest/alerts/page.tsx
'use client'

import { useState, useEffect } from 'react'
import GuestNavbar from '@/app/components/GuestNavbar'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Bell, 
  Wrench, 
  ConciergeBell, 
  Calendar, 
  CreditCard,
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Filter,
  Loader2,
  Info
} from 'lucide-react'

interface Alert {
  id: string
  type: 'maintenance'
  priority: 'Low' | 'Normal' | 'High' | 'Urgent'
  title: string
  message: string
  status: string
  created_at: string
  reference: string
  booking_reference?: string
  room_info?: string
  assigned_to?: string
  is_read: boolean
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchAlerts()
  }, [filter])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/guest/alerts?filter=${filter}`)
      if (!response.ok) throw new Error('Failed to fetch alerts')
      const data = await response.json()
      setAlerts(data.alerts || [])
      setUnreadCount(data.unread_count || 0)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'maintenance': return <Wrench className="w-5 h-5" />
      case 'service': return <ConciergeBell className="w-5 h-5" />
      case 'booking': return <Calendar className="w-5 h-5" />
      case 'payment': return <CreditCard className="w-5 h-5" />
      default: return <Info className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'maintenance': return 'bg-orange-100 text-orange-700'
      case 'service': return 'bg-purple-100 text-purple-700'
      case 'booking': return 'bg-blue-100 text-blue-700'
      case 'payment': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'text-red-700 bg-red-100 border-red-300'
      case 'High': return 'text-orange-700 bg-orange-100 border-orange-300'
      case 'Normal': return 'text-blue-700 bg-blue-100 border-blue-300'
      case 'Low': return 'text-gray-700 bg-gray-100 border-gray-300'
      default: return 'text-gray-700 bg-gray-100 border-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'CheckedOut':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'InProgress':
      case 'CheckedIn':
      case 'Confirmed':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'Pending':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'Cancelled':
      case 'Failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'CheckedOut':
        return 'text-green-700 bg-green-100'
      case 'InProgress':
      case 'CheckedIn':
      case 'Confirmed':
        return 'text-blue-700 bg-blue-100'
      case 'Pending':
        return 'text-yellow-700 bg-yellow-100'
      case 'Cancelled':
      case 'Failed':
        return 'text-red-700 bg-red-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const filterButtons = [
    { value: 'all' as const, label: 'All Maintenance Requests', icon: Wrench },
    { value: 'unread' as const, label: 'Unread', icon: AlertCircle },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-t from-amber-700/30 to-amber-50">
      <GuestNavbar />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-amber-600" />
              <div>
                <h1 className="text-4xl font-bold text-gray-900 font-l">Alerts & Notifications</h1>
                <p className="text-gray-600 mt-1">Stay updated with your bookings and requests</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <div className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold">
                {unreadCount} Unread
              </div>
            )}
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {filterButtons.map((btn) => {
              const Icon = btn.icon
              return (
                <Button
                  key={btn.value}
                  onClick={() => setFilter(btn.value)}
                  variant={filter === btn.value ? 'default' : 'outline'}
                  className={filter === btn.value ? 'bg-amber-600 hover:bg-amber-700' : ''}
                  size="sm"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {btn.label}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
          </div>
        )}

        {/* Alerts List */}
        {!loading && (
          <>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Card 
                    key={alert.id}
                    className={`shadow-md hover:shadow-lg transition-all duration-200 ${
                      !alert.is_read ? 'border-l-4 border-amber-500 bg-amber-50/30' : 'bg-white/80'
                    } backdrop-blur-lg border border-gray-200/80 rounded-xl`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Type Icon */}
                        <div className={`p-3 rounded-full ${getTypeColor(alert.type)}`}>
                          {getTypeIcon(alert.type)}
                        </div>

                        {/* Alert Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-gray-900 text-lg">{alert.title}</h3>
                                {!alert.is_read && (
                                  <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                                    NEW
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700 mb-2">{alert.message}</p>
                              
                              {/* Meta Information */}
                              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <strong>Ref:</strong> {alert.reference}
                                </span>
                                {alert.booking_reference && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <strong>Booking:</strong> {alert.booking_reference}
                                    </span>
                                  </>
                                )}
                                {alert.room_info && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <strong>Room:</strong> {alert.room_info}
                                    </span>
                                  </>
                                )}
                                <span>•</span>
                                <span className="text-gray-500">{formatDate(alert.created_at)}</span>
                              </div>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-col gap-2 ml-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(alert.priority)}`}>
                                {alert.priority}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(alert.status)}`}>
                                {getStatusIcon(alert.status)}
                                {alert.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="shadow-xl bg-white/80 backdrop-blur-lg border border-gray-200/80 rounded-2xl">
                <CardContent className="py-16">
                  <div className="text-center">
                    <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Alerts Found</h3>
                    <p className="text-gray-600">
                      {filter === 'unread' 
                        ? "You're all caught up! No unread alerts."
                        : `No ${filter === 'all' ? '' : filter} alerts at the moment.`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
