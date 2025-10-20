// app/admin/alerts/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  Info,
  User,
  MapPin,
  X,
  UserCheck,
  Hourglass
} from 'lucide-react'

interface Alert {
  id: string
  type: 'maintenance' | 'service' | 'booking' | 'payment' | 'staff'
  priority: 'Low' | 'Normal' | 'High' | 'Urgent'
  title: string
  message: string
  status: string
  created_at: string
  reference: string
  guest_name?: string
  staff_name?: string
  assigned_to?: string
  reported_by_staff?: string
  reported_by_guest?: string
  booking_reference?: string
  room_info?: string
  branch_name?: string
  requires_action: boolean
  maintenance_id?: number  // Added for updating assignment
}

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[#181d28] border border-gray-800 rounded-xl ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = 'default', className = '', disabled = false }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
      variant === 'default' 
        ? 'bg-amber-500 hover:bg-amber-600 text-white' 
        : 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
  >
    {children}
  </button>
);

export default function AdminAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [staffMembers, setStaffMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'urgent' | 'pending' | 'in-progress' | 'completed'>('pending') // Changed to pending by default
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [actionRequiredCount, setActionRequiredCount] = useState(0)
  const [urgentCount, setUrgentCount] = useState(0)
  const [updatingAssignment, setUpdatingAssignment] = useState<string | null>(null)

  useEffect(() => {
    fetchBranches()
    fetchStaff()
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [filter, selectedBranch])

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches')
      if (response.ok) {
        const data = await response.json()
        setBranches(data.branches || [])
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
    }
  }

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/admin/staff')
      if (response.ok) {
        const result = await response.json()
        setStaffMembers(result.staff || [])
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/alerts?filter=${filter}&branchId=${selectedBranch}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Alerts API error:', errorData)
        throw new Error(errorData.error || errorData.details || 'Failed to fetch alerts')
      }
      
      const data = await response.json()
      setAlerts(data.alerts || [])
      setActionRequiredCount(data.action_required_count || 0)
      setUrgentCount(data.urgent_count || 0)
    } catch (error) {
      console.error('Error fetching alerts:', error)
      // Don't break the UI, just show empty state
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  const handleAssignStaff = async (alertId: string, maintenanceId: number, staffId: number) => {
    try {
      console.log('[ASSIGN STAFF] Assigning:', { alertId, maintenanceId, staffId })
      setUpdatingAssignment(alertId)
      
      const action = staffId === 0 ? 'unassign' : 'assign'
      const body: any = { maintenanceId, action }
      if (staffId !== 0) {
        body.staffId = staffId
      }
      
      const response = await fetch('/api/admin/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('[ASSIGN STAFF] Success:', result)
        // Refresh alerts to show updated assignment
        await fetchAlerts()
      } else {
        const error = await response.json()
        console.error('[ASSIGN STAFF] Failed:', error)
        alert(`Failed to ${action} staff member: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('[ASSIGN STAFF] Error:', error)
      alert('Failed to assign staff member')
    } finally {
      setUpdatingAssignment(null)
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
      case 'maintenance': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'service': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'booking': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'payment': return 'bg-green-500/20 text-green-400 border-green-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'High': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
      case 'Normal': return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
      case 'Low': return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'CheckedOut':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'InProgress':
      case 'CheckedIn':
      case 'Confirmed':
        return <Clock className="w-4 h-4 text-blue-400" />
      case 'Pending':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />
      case 'Cancelled':
      case 'Failed':
        return <AlertTriangle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'CheckedOut':
        return 'text-green-400 bg-green-500/20'
      case 'InProgress':
      case 'CheckedIn':
      case 'Confirmed':
        return 'text-blue-400 bg-blue-500/20'
      case 'Pending':
        return 'text-yellow-400 bg-yellow-500/20'
      case 'Cancelled':
      case 'Failed':
        return 'text-red-400 bg-red-500/20'
      default:
        return 'text-gray-400 bg-gray-500/20'
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
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const getActionLink = (alert: Alert) => {
    switch (alert.type) {
      case 'maintenance':
        return '/admin/maintenance'
      case 'service':
        return '/admin/services'
      case 'booking':
        return '/admin/bookings'
      case 'payment':
        return '/admin/payments'
      default:
        return '/admin/dashboard'
    }
  }

  const filterButtons = [
    { value: 'pending' as const, label: 'Pending', icon: Clock },
    { value: 'in-progress' as const, label: 'In Progress', icon: Hourglass },
    { value: 'completed' as const, label: 'Completed (Last 10)', icon: CheckCircle },
    { value: 'urgent' as const, label: 'Urgent Only', icon: AlertTriangle },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e1a] via-[#1a1f2e] to-[#0f1419] text-gray-100">
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/20 rounded-xl border border-amber-500/30">
                <Bell className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Maintenance Alerts</h1>
                <p className="text-gray-400 mt-1">Monitor and manage maintenance requests</p>
              </div>
            </div>
            <div className="flex gap-3">
              {actionRequiredCount > 0 && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {actionRequiredCount} Action Required
                </div>
              )}
              {urgentCount > 0 && (
                <div className="bg-orange-500/20 border border-orange-500/30 text-orange-400 px-4 py-2 rounded-lg font-semibold">
                  {urgentCount} Urgent
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Type Filters */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Filter Maintenance</label>
              <div className="flex flex-wrap gap-2">{filterButtons.map((btn) => {
                  const Icon = btn.icon
                  return (
                    <button
                      key={btn.value}
                      onClick={() => setFilter(btn.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                        filter === btn.value
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 border border-gray-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {btn.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Branch Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Filter by Branch</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="all">All Branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} - {branch.location}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
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
                    className={`p-5 hover:border-amber-500/30 transition-all duration-200 ${
                      alert.requires_action ? 'border-l-4 !border-l-amber-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Type Icon */}
                      <div className={`p-3 rounded-lg border ${getTypeColor(alert.type)}`}>
                        {getTypeIcon(alert.type)}
                      </div>

                      {/* Alert Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-white text-lg">{alert.title}</h3>
                              {alert.requires_action && (
                                <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  ACTION REQUIRED
                                </span>
                              )}
                            </div>
                            <p className="text-gray-300 mb-3">{alert.message}</p>
                            
                            {/* Meta Information */}
                            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <strong className="text-gray-300">Ref:</strong> {alert.reference}
                              </span>
                              
                              {/* Show who reported the issue */}
                              {(alert.reported_by_staff || alert.reported_by_guest) && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    <strong className="text-gray-300">Reported by:</strong> 
                                    {alert.reported_by_staff && ` ${alert.reported_by_staff} (Staff)`}
                                    {alert.reported_by_guest && ` ${alert.reported_by_guest} (Guest)`}
                                  </span>
                                </>
                              )}
                              
                              {alert.guest_name && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    <strong className="text-gray-300">Current Guest:</strong> {alert.guest_name}
                                  </span>
                                </>
                              )}
                              {alert.booking_reference && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <strong className="text-gray-300">Booking:</strong> {alert.booking_reference}
                                  </span>
                                </>
                              )}
                              {alert.room_info && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <strong className="text-gray-300">Room:</strong> {alert.room_info}
                                  </span>
                                </>
                              )}
                              {alert.branch_name && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {alert.branch_name}
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span className="text-gray-500">{formatDate(alert.created_at)}</span>
                            </div>

                            {/* Staff Assignment Dropdown - Only for Maintenance Alerts */}
                            {alert.type === 'maintenance' && alert.maintenance_id && (
                              <div className="mt-3 pt-3 border-t border-gray-700">
                                <label className="block text-xs font-semibold text-gray-400 mb-2">
                                  Assigned To: (Alert ID: {alert.id} | Maintenance ID: {alert.maintenance_id})
                                </label>
                                <select
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    console.log('[DROPDOWN] Selected value:', value, 'for alert:', alert.id, 'maintenance:', alert.maintenance_id);
                                    if (value && alert.maintenance_id) {
                                      handleAssignStaff(alert.id, alert.maintenance_id, parseInt(value));
                                    }
                                  }}
                                  value=""
                                  disabled={updatingAssignment === alert.id}
                                  className="w-full min-w-[250px] px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white hover:border-blue-500 focus:border-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="">
                                    {updatingAssignment === alert.id 
                                      ? 'Updating...' 
                                      : alert.assigned_to 
                                        ? `Currently: ${alert.assigned_to} (Click to change)` 
                                        : 'Select Staff Member to Assign'}
                                  </option>
                                  {alert.assigned_to && (
                                    <option value="0">Unassign</option>
                                  )}
                                  <optgroup label="─────────────────────"></optgroup>
                                  
                                  {/* Grouped Staff Dropdown */}
                                  {(() => {
                                    // Group staff by position
                                    const grouped = staffMembers.reduce((acc: any, staff: any) => {
                                      const position = staff.role || staff.position || 'Other Staff';
                                      if (!acc[position]) {
                                        acc[position] = [];
                                      }
                                      acc[position].push(staff);
                                      return acc;
                                    }, {});

                                    // Sort positions by relevance (Maintenance first)
                                    const positionOrder = ['Maintenance Staff', 'Housekeeping', 'Front Desk', 'Manager'];
                                    const sortedPositions = Object.keys(grouped).sort((a, b) => {
                                      const aIndex = positionOrder.findIndex(p => a.toLowerCase().includes(p.toLowerCase()));
                                      const bIndex = positionOrder.findIndex(p => b.toLowerCase().includes(p.toLowerCase()));
                                      
                                      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                                      if (aIndex !== -1) return -1;
                                      if (bIndex !== -1) return 1;
                                      return a.localeCompare(b);
                                    });

                                    return sortedPositions.map(position => (
                                      <optgroup key={position} label={position}>
                                        {grouped[position]
                                          .sort((a: any, b: any) => a.name.localeCompare(b.name))
                                          .map((staff: any) => (
                                            <option key={staff.id} value={staff.id}>
                                              {staff.name} ({staff.role || 'Staff'})
                                              {staff.department ? ` - ${staff.department}` : ''}
                                            </option>
                                          ))}
                                      </optgroup>
                                    ));
                                  })()}
                                </select>
                              </div>
                            )}
                          </div>

                          {/* Badges and Actions */}
                          <div className="flex flex-col gap-2 ml-4">
                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getPriorityColor(alert.priority)}`}>
                              {alert.priority}
                            </span>
                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${getStatusColor(alert.status)}`}>
                              {getStatusIcon(alert.status)}
                              {alert.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-16">
                <div className="text-center">
                  <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No Alerts Found</h3>
                  <p className="text-gray-400">
                    {filter === 'urgent' 
                      ? "No urgent alerts at the moment. Great job!"
                      : `No ${filter === 'all' ? '' : filter} alerts at the moment.`}
                  </p>
                </div>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
