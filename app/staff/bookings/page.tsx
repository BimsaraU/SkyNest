'use client'

import { useState, useEffect } from 'react'
import StaffNavbar from '@/app/components/StaffNavbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search, Calendar, Phone, Mail, Loader2, CheckCircle, Clock, XCircle, DollarSign, FileText, LogIn, LogOut, Send } from 'lucide-react'

export default function StaffBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Modals
  const [paymentModal, setPaymentModal] = useState<any>(null)
  const [billsModal, setBillsModal] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'Cash',
    notes: ''
  })

  useEffect(() => {
    fetchBookings()
  }, [statusFilter])

  const fetchBookings = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (searchTerm.trim()) {
        params.append('search', searchTerm)
      }

      const res = await fetch(`/api/staff/bookings?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setBookings(data.data || [])
      } else {
        alert('Failed to fetch bookings')
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
      alert('Failed to fetch bookings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = () => {
    fetchBookings()
  }

  const handleStatusUpdate = async (bookingId: number, newStatus: string) => {
    try {
      setIsProcessing(true)
      const res = await fetch(`/api/staff/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        alert(`Booking status updated to ${newStatus}`)
        fetchBookings() // Refresh list
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update booking status')
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update booking status')
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePaymentSubmit = async () => {
    if (!paymentModal || !paymentForm.amount) {
      alert('Please enter a valid amount')
      return
    }

    try {
      setIsProcessing(true)
      const res = await fetch('/api/staff/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: paymentModal.id,
          amount: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          notes: paymentForm.notes
        })
      })

      if (res.ok) {
        const data = await res.json()
        alert(`Payment of $${paymentForm.amount} received. Balance: $${data.data.remaining_balance.toFixed(2)}`)
        setPaymentModal(null)
        setPaymentForm({ amount: '', payment_method: 'Cash', notes: '' })
        fetchBookings()
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to confirm payment')
      }
    } catch (error) {
      console.error('Failed to confirm payment:', error)
      alert('Failed to confirm payment')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleViewBills = async (guestName: string) => {
    try {
      setIsProcessing(true)
      // Search for guest first
      const searchRes = await fetch(`/api/staff/guests/search?q=${encodeURIComponent(guestName)}`)
      if (searchRes.ok) {
        const searchData = await searchRes.json()
        if (searchData.data && searchData.data.length > 0) {
          const guest = searchData.data[0]
          
          // Fetch bills
          const billsRes = await fetch(`/api/staff/guests/${guest.id}/bills`)
          if (billsRes.ok) {
            const billsData = await billsRes.json()
            setBillsModal(billsData)
          }
        } else {
          alert('Guest not found')
        }
      }
    } catch (error) {
      console.error('Failed to fetch bills:', error)
      alert('Failed to fetch guest bills')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSendInvoice = async (bookingId: number) => {
    try {
      setIsProcessing(true)
      const res = await fetch('/api/staff/payments/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId })
      })

      if (res.ok) {
        const data = await res.json()
        alert(`Invoice sent successfully to ${data.data.email}`)
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Failed to send invoice')
      }
    } catch (error: any) {
      console.error('Failed to send invoice:', error)
      alert(error.message || 'Failed to send invoice')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: any = {
      'Pending': 'bg-yellow-900/50 text-yellow-300 border-yellow-800',
      'Confirmed': 'bg-blue-900/50 text-blue-300 border-blue-800',
      'CheckedIn': 'bg-green-900/50 text-green-300 border-green-800',
      'CheckedOut': 'bg-gray-900/50 text-gray-300 border-gray-800',
      'Cancelled': 'bg-red-900/50 text-red-300 border-red-800',
      'NoShow': 'bg-red-900/50 text-red-300 border-red-800'
    }
    return <Badge className={`${colors[status]} border`}>{status.replace(/([A-Z])/g, ' $1').trim()}</Badge>
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CheckedIn':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'Confirmed':
        return <Clock className="w-5 h-5 text-blue-500" />
      case 'CheckedOut':
        return <CheckCircle className="w-5 h-5 text-gray-500" />
      case 'Cancelled':
      case 'NoShow':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />
    }
  }

  const statusCounts = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'Pending').length,
    confirmed: bookings.filter(b => b.status === 'Confirmed').length,
    checkedIn: bookings.filter(b => b.status === 'CheckedIn').length,
  }

  return (
    <div className="min-h-screen bg-[#10141c] text-gray-300">
      <StaffNavbar />
      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Bookings Management</h1>
            <p className="text-gray-400">View and manage all hotel bookings</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-[#181d28] border-gray-800">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{statusCounts.total}</p>
                  <p className="text-sm text-gray-400">Total Bookings</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#181d28] border-gray-800">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{statusCounts.confirmed}</p>
                  <p className="text-sm text-gray-400">Confirmed</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#181d28] border-gray-800">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{statusCounts.checkedIn}</p>
                  <p className="text-sm text-gray-400">Checked In</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#181d28] border-gray-800">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">{statusCounts.pending}</p>
                  <p className="text-sm text-gray-400">Pending</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-[#181d28] border-gray-800 mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <Input
                    placeholder="Search by booking reference, guest name, or room..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10 bg-[#10141c] border-gray-700 text-white"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48 bg-[#10141c] border-gray-700 text-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181d28] border-gray-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="CheckedIn">Checked In</SelectItem>
                    <SelectItem value="CheckedOut">Checked Out</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} className="bg-amber-500 hover:bg-amber-600 text-black">
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bookings List */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking: any) => (
                <Card key={booking.id} className="bg-[#181d28] border-gray-800 hover:border-gray-700 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Left Section - Guest Info */}
                      <div className="flex items-start space-x-4 flex-1">
                        {getStatusIcon(booking.status)}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">{booking.guest_name}</h3>
                            {getStatusBadge(booking.status)}
                          </div>
                          <p className="text-sm text-gray-400">{booking.booking_reference}</p>
                          <div className="flex flex-col sm:flex-row sm:space-x-4 text-sm text-gray-400 mt-2">
                            <div className="flex items-center space-x-1">
                              <Mail className="w-4 h-4" />
                              <span>{booking.guest_email}</span>
                            </div>
                            {booking.guest_phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="w-4 h-4" />
                                <span>{booking.guest_phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle Section - Booking Details */}
                      <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Room</p>
                          <p className="text-white font-medium">{booking.room_number} - {booking.room_type}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Branch</p>
                          <p className="text-white font-medium">{booking.branch_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Check-in</p>
                          <p className="text-white font-medium">{new Date(booking.check_in_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Check-out</p>
                          <p className="text-white font-medium">{new Date(booking.check_out_date).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Right Section - Amount & Actions */}
                      <div className="flex flex-col items-end space-y-3">
                        <div className="text-right">
                          <p className="text-gray-500 text-sm">Total Amount</p>
                          <p className="text-xl font-bold text-white">${parseFloat(booking.total_amount).toLocaleString()}</p>
                          <p className="text-sm text-green-400">Paid: ${parseFloat(booking.paid_amount || 0).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleViewBills(booking.guest_name)}
                            className="bg-gray-800 hover:bg-gray-700 text-white"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Bills
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => setPaymentModal(booking)}
                            className="bg-blue-700 hover:bg-blue-600 text-white"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Payment
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleSendInvoice(booking.id)}
                            disabled={isProcessing}
                            className="bg-purple-700 hover:bg-purple-600 text-white"
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Email Invoice
                          </Button>
                          {booking.status === 'Confirmed' && (
                            <Button 
                              size="sm"
                              onClick={() => handleStatusUpdate(booking.id, 'CheckedIn')}
                              disabled={isProcessing}
                              className="bg-green-700 hover:bg-green-600 text-white"
                            >
                              <LogIn className="w-4 h-4 mr-1" />
                              Check In
                            </Button>
                          )}
                          {booking.status === 'CheckedIn' && (
                            <Button 
                              size="sm"
                              onClick={() => handleStatusUpdate(booking.id, 'CheckedOut')}
                              disabled={isProcessing}
                              className="bg-orange-700 hover:bg-orange-600 text-white"
                            >
                              <LogOut className="w-4 h-4 mr-1" />
                              Check Out
                            </Button>
                          )}
                          {booking.status === 'Pending' && (
                            <Button 
                              size="sm"
                              onClick={() => handleStatusUpdate(booking.id, 'Confirmed')}
                              disabled={isProcessing}
                              className="bg-amber-700 hover:bg-amber-600 text-black"
                            >
                              Confirm
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {bookings.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No bookings found matching your criteria</p>
            </div>
          )}
        </div>
      </main>

      {/* Payment Confirmation Modal */}
      <Dialog open={!!paymentModal} onOpenChange={() => setPaymentModal(null)}>
        <DialogContent className="bg-[#181d28] border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription className="text-gray-400">
              Record payment received for booking {paymentModal?.booking_reference}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="amount" className="text-gray-300">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                className="bg-[#10141c] border-gray-700 text-white mt-1"
              />
              <p className="text-sm text-gray-400 mt-1">
                Total: ${parseFloat(paymentModal?.total_amount || 0).toLocaleString()} | 
                Paid: ${parseFloat(paymentModal?.paid_amount || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <Label htmlFor="method" className="text-gray-300">Payment Method</Label>
              <Select value={paymentForm.payment_method} onValueChange={(val) => setPaymentForm({...paymentForm, payment_method: val})}>
                <SelectTrigger className="bg-[#10141c] border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#181d28] border-gray-700">
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="CreditCard">Credit Card</SelectItem>
                  <SelectItem value="DebitCard">Debit Card</SelectItem>
                  <SelectItem value="BankTransfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes" className="text-gray-300">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                className="bg-[#10141c] border-gray-700 text-white mt-1"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button onClick={() => setPaymentModal(null)} variant="outline" className="border-gray-700">
                Cancel
              </Button>
              <Button onClick={handlePaymentSubmit} disabled={isProcessing} className="bg-amber-500 hover:bg-amber-600 text-black">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Guest Bills Modal */}
      <Dialog open={!!billsModal} onOpenChange={() => setBillsModal(null)}>
        <DialogContent className="bg-[#181d28] border-gray-800 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guest Bills - {billsModal?.guest.first_name} {billsModal?.guest.last_name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {billsModal?.guest.email} | Loyalty Points: {billsModal?.guest.loyalty_points}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-[#10141c] rounded-lg border border-gray-800">
              <div>
                <p className="text-sm text-gray-400">Total Amount</p>
                <p className="text-lg font-bold text-white">${billsModal?.summary.total_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Paid</p>
                <p className="text-lg font-bold text-green-400">${billsModal?.summary.total_paid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Outstanding</p>
                <p className="text-lg font-bold text-red-400">${billsModal?.summary.total_outstanding.toLocaleString()}</p>
              </div>
            </div>

            {/* Bills List */}
            <div className="space-y-3">
              {billsModal?.bills.map((bill: any) => (
                <div key={bill.id} className="p-4 bg-[#10141c] rounded-lg border border-gray-800">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-white">{bill.booking_reference}</p>
                      <p className="text-sm text-gray-400">Room {bill.room_number} - {bill.room_type}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(bill.check_in_date).toLocaleDateString()} - {new Date(bill.check_out_date).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(bill.status)}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Room Charges</p>
                      <p className="text-white">${bill.room_charges.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Service Charges</p>
                      <p className="text-white">${bill.service_charges.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Paid</p>
                      <p className="text-green-400">${bill.total_paid.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Balance</p>
                      <p className={bill.outstanding_balance > 0 ? 'text-red-400' : 'text-green-400'}>
                        ${bill.outstanding_balance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
