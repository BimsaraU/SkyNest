// app/admin/maintenance/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Wrench, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  User,
  Filter,
  Loader2,
  Search,
  UserCheck
} from 'lucide-react'

interface MaintenanceRequest {
  id: number
  log_reference: string
  issue_description: string
  priority: 'Low' | 'Normal' | 'High' | 'Urgent'
  status: string
  approval_status: 'Pending' | 'Approved' | 'Rejected'
  rejection_reason?: string
  created_at: string
  updated_at: string
  resolved_at?: string
  room_number: string
  room_type: string
  branch_name: string
  reported_by_name?: string
  assigned_to_name?: string
  approved_by_name?: string
  approved_at?: string
}

interface StaffMember {
  id: number
  name: string
  role: string
  branch_name?: string
}

export default function AdminMaintenancePage() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'in-progress' | 'completed'>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null)
  const [assignStaffId, setAssignStaffId] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    fetchRequests()
    fetchStaff()
  }, [filter])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/maintenance?filter=${filter}`)
      if (!response.ok) throw new Error('Failed to fetch requests')
      const data = await response.json()
      setRequests(data.requests || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/admin/staff')
      if (!response.ok) throw new Error('Failed to fetch staff')
      const data = await response.json()
      setStaffMembers(data.staff || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const handleApprove = async (requestId: number, assign_to?: number) => {
    try {
      setActionLoading(requestId)
      const response = await fetch(`/api/admin/maintenance/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to_staff_id: assign_to })
      })

      if (!response.ok) throw new Error('Failed to approve request')
      
      await fetchRequests()
      setSelectedRequest(null)
      setAssignStaffId('')
    } catch (error) {
      console.error('Error approving request:', error)
      alert('Failed to approve request')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (requestId: number) => {
    try {
      setActionLoading(requestId)
      const response = await fetch(`/api/admin/maintenance/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason })
      })

      if (!response.ok) throw new Error('Failed to reject request')
      
      await fetchRequests()
      setShowRejectModal(false)
      setSelectedRequest(null)
      setRejectionReason('')
    } catch (error) {
      console.error('Error rejecting request:', error)
      alert('Failed to reject request')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAssignStaff = async (requestId: number, staffId: number) => {
    try {
      setActionLoading(requestId)
      const response = await fetch(`/api/admin/maintenance/${requestId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to_staff_id: staffId })
      })

      if (!response.ok) throw new Error('Failed to assign staff')
      
      await fetchRequests()
    } catch (error) {
      console.error('Error assigning staff:', error)
      alert('Failed to assign staff')
    } finally {
      setActionLoading(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-700 border-red-300'
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'Normal': return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'Low': return 'bg-gray-100 text-gray-700 border-gray-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'text-green-600'
      case 'InProgress': return 'text-blue-600'
      case 'Pending': return 'text-yellow-600'
      case 'Cancelled': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const filteredRequests = requests.filter(req =>
    req.log_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.room_number.includes(searchTerm) ||
    req.branch_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.issue_description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pendingApprovalCount = requests.filter(r => r.approval_status === 'Pending').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Simple Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/admin/dashboard" className="text-xl font-bold text-white">
            Admin Portal
          </Link>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Wrench className="w-8 h-8 text-amber-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Maintenance Management</h1>
                <p className="text-slate-400 mt-1">Approve requests and assign staff</p>
              </div>
            </div>
            {pendingApprovalCount > 0 && (
              <div className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold">
                {pendingApprovalCount} Pending Approval
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            {[
              { value: 'pending', label: 'Pending Approval', icon: Clock },
              { value: 'approved', label: 'Approved', icon: CheckCircle },
              { value: 'in-progress', label: 'In Progress', icon: Wrench },
              { value: 'completed', label: 'Completed', icon: CheckCircle },
              { value: 'all', label: 'All', icon: Filter }
            ].map((btn) => {
              const Icon = btn.icon
              return (
                <Button
                  key={btn.value}
                  onClick={() => setFilter(btn.value as any)}
                  variant={filter === btn.value ? 'default' : 'outline'}
                  className={
                    filter === btn.value
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'border-slate-600 text-slate-300 hover:bg-slate-700'
                  }
                  size="sm"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {btn.label}
                </Button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reference, room, branch, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
          </div>
        )}

        {/* Requests List */}
        {!loading && (
          <div className="space-y-4">
            {filteredRequests.length === 0 ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No maintenance requests found</p>
                </CardContent>
              </Card>
            ) : (
              filteredRequests.map((request) => (
                <Card key={request.id} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Left side - Request info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-4 mb-4">
                          <Wrench className="w-6 h-6 text-amber-400 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-white">
                                {request.log_reference}
                              </h3>
                              <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${getPriorityColor(request.priority)}`}>
                                {request.priority}
                              </span>
                              {request.approval_status === 'Pending' && (
                                <span className="px-2 py-1 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
                                  Awaiting Approval
                                </span>
                              )}
                              {request.approval_status === 'Rejected' && (
                                <span className="px-2 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                                  Rejected
                                </span>
                              )}
                              <span className={`text-sm font-medium ${getStatusColor(request.status)}`}>
                                {request.status}
                              </span>
                            </div>
                            <p className="text-slate-300 mb-3">{request.issue_description}</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                              <div className="text-slate-400">
                                Room: <span className="text-slate-200">{request.room_type} - Room {request.room_number}</span>
                              </div>
                              <div className="text-slate-400">
                                Branch: <span className="text-slate-200">{request.branch_name}</span>
                              </div>
                              {request.reported_by_name && (
                                <div className="text-slate-400">
                                  Reported by: <span className="text-slate-200">{request.reported_by_name}</span>
                                </div>
                              )}
                              {request.assigned_to_name && (
                                <div className="text-slate-400">
                                  Assigned to: <span className="text-slate-200">{request.assigned_to_name}</span>
                                </div>
                              )}
                              <div className="text-slate-400">
                                Created: <span className="text-slate-200">{new Date(request.created_at).toLocaleString()}</span>
                              </div>
                              {request.resolved_at && (
                                <div className="text-slate-400">
                                  Resolved: <span className="text-slate-200">{new Date(request.resolved_at).toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                            {request.rejection_reason && (
                              <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                                <p className="text-sm text-red-300">
                                  <span className="font-semibold">Rejection Reason:</span> {request.rejection_reason}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right side - Actions */}
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        {request.approval_status === 'Pending' && (
                          <>
                            <Button
                              onClick={() => {
                                setSelectedRequest(request)
                                setAssignStaffId('')
                              }}
                              className="bg-green-600 hover:bg-green-700 w-full"
                              size="sm"
                              disabled={actionLoading === request.id}
                            >
                              {actionLoading === request.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedRequest(request)
                                setShowRejectModal(true)
                                setRejectionReason('')
                              }}
                              variant="outline"
                              className="border-red-500 text-red-400 hover:bg-red-900/30 w-full"
                              size="sm"
                              disabled={actionLoading === request.id}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                        
                        {request.approval_status === 'Approved' && !request.assigned_to_name && (
                          <div>
                            <select
                              value={assignStaffId}
                              onChange={(e) => {
                                setAssignStaffId(e.target.value)
                                if (e.target.value) {
                                  handleAssignStaff(request.id, parseInt(e.target.value))
                                }
                              }}
                              className="w-full mb-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                              disabled={actionLoading === request.id}
                            >
                              <option value="">Assign staff...</option>
                              {staffMembers.map((staff) => (
                                <option key={staff.id} value={staff.id}>
                                  {staff.name} ({staff.role})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Approve Modal */}
        {selectedRequest && !showRejectModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <Card className="bg-slate-800 border-slate-700 max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-white">Approve Maintenance Request</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-300">
                  Approve request <span className="font-semibold text-white">{selectedRequest.log_reference}</span>?
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Assign to staff member (optional):
                  </label>
                  <select
                    value={assignStaffId}
                    onChange={(e) => setAssignStaffId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    <option value="">Assign later</option>
                    {staffMembers.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} - {staff.role} {staff.branch_name ? `(${staff.branch_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApprove(selectedRequest.id, assignStaffId ? parseInt(assignStaffId) : undefined)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={actionLoading === selectedRequest.id}
                  >
                    {actionLoading === selectedRequest.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedRequest(null)
                      setAssignStaffId('')
                    }}
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                    disabled={actionLoading === selectedRequest.id}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reject Modal */}
        {selectedRequest && showRejectModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <Card className="bg-slate-800 border-slate-700 max-w-md w-full">
              <CardHeader>
                <CardTitle className="text-white">Reject Maintenance Request</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-300">
                  Reject request <span className="font-semibold text-white">{selectedRequest.log_reference}</span>?
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Reason for rejection <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white resize-none"
                    placeholder="Explain why this request is being rejected..."
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleReject(selectedRequest.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    disabled={!rejectionReason.trim() || actionLoading === selectedRequest.id}
                  >
                    {actionLoading === selectedRequest.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedRequest(null)
                      setShowRejectModal(false)
                      setRejectionReason('')
                    }}
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                    disabled={actionLoading === selectedRequest.id}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
