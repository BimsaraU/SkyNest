'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GuestNavbar from '@/app/components/GuestNavbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar, MapPin, Users, Loader2, CreditCard, LogIn, LogOut, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'

interface Booking {
  id: number
  booking_reference: string
  room_number: string
  room_type: string
  check_in_date: string
  check_out_date: string
  number_of_guests: number
  status: string
  base_amount: number
  services_amount: number
  total_amount: number
  paid_amount: number
  outstanding_amount: number
  branch_name: string
  checked_in_at: string | null
  checked_out_at: string | null
  image?: string
  category?: string
  can_modify?: boolean
  can_cancel?: boolean
}

export default function MyBookingsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState('all')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('CreditCard')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/bookings')
      const data = await response.json()
      if (data.success) {
        setBookings(data.bookings)
      }
    } catch (err) {
      console.error('Error fetching bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  // Check-in and check-out functions removed - only staff can check in/out guests

  const handlePayment = async () => {
    if (!selectedBooking || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid payment amount' })
      return
    }

    try {
      setProcessing(true)
      console.log('[PAYMENT] Sending payment request:', {
        booking_id: selectedBooking.id,
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod
      })

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
          amount: parseFloat(paymentAmount),
          payment_method: paymentMethod
        })
      })
      
      const data = await response.json()
      console.log('[PAYMENT] Response:', data)

      if (data.success) {
        setMessage({ type: 'success', text: 'Payment processed successfully!' })
        setShowPaymentDialog(false)
        setSelectedBooking(null)
        setPaymentAmount('')
        // Wait a bit before refreshing to ensure DB is updated
        setTimeout(() => fetchBookings(), 500)
      } else {
        setMessage({ type: 'error', text: data.error || 'Payment failed' })
      }
    } catch (err) {
      console.error('[PAYMENT] Error:', err)
      setMessage({ type: 'error', text: 'Payment processing failed' })
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (booking: Booking) => {
    if (booking.status === 'Cancelled') {
      return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold flex items-center gap-1"><XCircle size={12} />Cancelled</span>
    }
    if (booking.status === 'CheckedOut') {
      return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold flex items-center gap-1"><CheckCircle size={12} />Completed</span>
    }
    if (booking.status === 'CheckedIn') {
      return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1"><Clock size={12} />Active</span>
    }
    if (booking.status === 'Confirmed') {
      return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold flex items-center gap-1"><CheckCircle size={12} />Confirmed</span>
    }
    return <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold flex items-center gap-1"><AlertCircle size={12} />Pending</span>
  }

  const canCheckIn = (booking: Booking) => {
    const today = new Date()
    const checkIn = new Date(booking.check_in_date)
    return booking.status === 'Confirmed' && checkIn <= today && booking.outstanding_amount === 0
  }

  const canCheckOut = (booking: Booking) => {
    return booking.status === 'CheckedIn' && booking.outstanding_amount === 0
  }

  const filteredBookings = bookings.filter(b => {
    if (filter === 'upcoming') return b.status === 'Confirmed' || b.status === 'Pending'
    if (filter === 'active') return b.status === 'CheckedIn'
    if (filter === 'past') return b.status === 'CheckedOut'
    if (filter === 'cancelled') return b.status === 'Cancelled'
    return true
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-100/30">
      <GuestNavbar />
      
      <div className="container mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">My Bookings</h1>
          <p className="text-gray-600 text-lg">View and manage your reservations</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl shadow-md backdrop-blur-sm ${
            message.type === 'success' 
              ? 'bg-green-50/80 text-green-800 border border-green-200' 
              : 'bg-red-50/80 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-8 border-b-2 border-gray-200/50 overflow-x-auto pb-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'upcoming', label: 'Upcoming' },
            { key: 'active', label: 'Active' },
            { key: 'past', label: 'Past' },
            { key: 'cancelled', label: 'Cancelled' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-6 py-3 font-semibold transition-all rounded-t-lg whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-amber-500 text-black shadow-lg border-b-4 border-amber-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-amber-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
          </div>
        )}

        {!loading && filteredBookings.length === 0 && (
          <Card className="bg-white/90 backdrop-blur-lg shadow-xl border border-gray-200/50 rounded-2xl">
            <CardContent className="p-16 text-center">
              <Calendar className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-6">No bookings found</p>
              <Button
                onClick={() => router.push('/guest/booking')}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Make a Booking
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && filteredBookings.length > 0 && (
          <div className="space-y-6">
            {filteredBookings.map(booking => (
              <Card key={booking.id} className="bg-white/90 backdrop-blur-lg shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-200/50 rounded-2xl overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl font-bold text-gray-900">{booking.room_type}</h3>
                        {getStatusBadge(booking)}
                      </div>
                      <p className="text-sm text-gray-500 font-mono bg-gray-100 px-3 py-1 rounded-md inline-block">
                        {booking.booking_reference}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-amber-600">${Number(booking.total_amount).toFixed(2)}</p>
                      {booking.outstanding_amount > 0 && (
                        <p className="text-sm text-red-600 font-bold flex items-center gap-1 justify-end mt-1">
                          <AlertCircle size={16} />
                          Due: ${Number(booking.outstanding_amount).toFixed(2)}
                        </p>
                      )}
                      {booking.outstanding_amount === 0 && booking.paid_amount > 0 && (
                        <p className="text-sm text-green-600 font-bold flex items-center gap-1 justify-end mt-1">
                          <CheckCircle size={16} />
                          Fully Paid
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-6 p-4 bg-amber-50/50 rounded-xl">
                    <div className="flex items-center gap-3 text-gray-800">
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <MapPin className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Location</p>
                        <span className="text-sm font-semibold">{booking.branch_name} - Room {booking.room_number}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-800">
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <Users className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Guests</p>
                        <span className="text-sm font-semibold">{booking.number_of_guests} Guest{booking.number_of_guests > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-800">
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <LogIn className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Check-in</p>
                        <span className="text-sm font-semibold">{new Date(booking.check_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-800">
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <LogOut className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Check-out</p>
                        <span className="text-sm font-semibold">{new Date(booking.check_out_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary - NEW */}
                  <div className="mb-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      Payment Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Room Cost:</span>
                        <span className="font-semibold text-gray-900">${Number(booking.base_amount || booking.total_amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Additional Services:</span>
                        <span className="font-semibold text-gray-900">${Number(booking.services_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-300">
                        <span className="font-semibold text-gray-700">Total Amount:</span>
                        <span className="font-bold text-gray-900">${Number(booking.total_amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600 font-medium">Amount Paid:</span>
                        <span className="font-semibold text-green-600">-${Number(booking.paid_amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-300">
                        <span className="font-bold text-gray-900 text-base">Outstanding Balance:</span>
                        <span className={`font-bold text-base ${booking.outstanding_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${Number(booking.outstanding_amount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {booking.checked_in_at && (
                    <div className="mb-6 p-4 bg-green-50/80 backdrop-blur-sm rounded-xl border border-green-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <LogIn className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-green-600 font-medium">Checked In</p>
                          <p className="text-sm text-green-800 font-semibold">{new Date(booking.checked_in_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {booking.checked_out_at && (
                    <div className="mb-6 p-4 bg-blue-50/80 backdrop-blur-sm rounded-xl border border-blue-200 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <LogOut className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 font-medium">Checked Out</p>
                          <p className="text-sm text-blue-800 font-semibold">{new Date(booking.checked_out_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 flex-wrap">
                    {booking.outstanding_amount > 0 && (
                      <Button
                        onClick={() => {
                          setSelectedBooking(booking)
                          setPaymentAmount(booking.outstanding_amount.toString())
                          setShowPaymentDialog(true)
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-6 text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
                      >
                        <CreditCard className="w-5 h-5 mr-2" />
                        Pay Now
                      </Button>
                    )}
                    {/* Check-in/Check-out removed - only staff can perform these actions */}
                    <Button
                      onClick={() => router.push(`/guest/my-bookings/${booking.id}`)}
                      variant="outline"
                      className="border-2 border-gray-300 hover:border-amber-500 hover:bg-amber-50 font-semibold px-6 py-6 text-base rounded-xl shadow-md hover:shadow-lg transition-all"
                    >
                      <Calendar className="w-5 h-5 mr-2" />
                      View Details
                    </Button>
                  </div>
                  
                  {/* Additional Action Buttons Row - NEW */}
                  {['Pending', 'Confirmed', 'CheckedIn'].includes(booking.status) && (
                    <div className="flex gap-3 flex-wrap mt-3 pt-3 border-t border-gray-200">
                      <Button
                        onClick={() => router.push(`/guest/my-bookings/${booking.id}?tab=services`)}
                        variant="outline"
                        className="border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50 text-purple-700 font-semibold px-5 py-3 text-sm rounded-xl shadow-md hover:shadow-lg transition-all"
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Add Services
                      </Button>
                      <Button
                        onClick={() => router.push(`/guest/my-bookings/${booking.id}?tab=payments`)}
                        variant="outline"
                        className="border-2 border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-700 font-semibold px-5 py-3 text-sm rounded-xl shadow-md hover:shadow-lg transition-all"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Payment History
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="bg-white">
          <DialogHeader className="border-b border-amber-200 pb-4">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-amber-600" />
              Make Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {selectedBooking && (
              <div className="p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border border-amber-200 shadow-sm">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600 font-medium">Booking Reference</p>
                    <p className="text-sm font-mono font-bold text-gray-900">{selectedBooking.booking_reference}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600 font-medium">Total Amount</p>
                    <p className="text-sm font-bold text-gray-900">${Number(selectedBooking.total_amount).toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600 font-medium">Amount Paid</p>
                    <p className="text-sm font-bold text-green-600">${Number(selectedBooking.paid_amount).toFixed(2)}</p>
                  </div>
                  <div className="pt-2 border-t border-amber-300">
                    <div className="flex justify-between items-center">
                      <p className="text-base text-gray-900 font-bold">Outstanding Balance</p>
                      <p className="text-xl font-bold text-red-600">${Number(selectedBooking.outstanding_amount).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                Payment Amount
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-base font-semibold"
                placeholder="Enter amount"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all text-base font-semibold bg-white"
              >
                <option value="CreditCard">Credit Card</option>
                <option value="DebitCard">Debit Card</option>
                <option value="Cash">Cash</option>
                <option value="BankTransfer">Bank Transfer</option>
              </select>
            </div>

            <div className="p-4 bg-blue-50/80 backdrop-blur-sm rounded-xl border border-blue-200 shadow-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800 font-medium">
                  This is a demo payment system. No actual charges will be made to your account.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handlePayment}
                disabled={processing}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold py-6 text-base rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Process Payment
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowPaymentDialog(false)}
                variant="outline"
                className="flex-1 border-2 border-gray-300 hover:border-red-500 hover:bg-red-50 font-bold py-6 text-base rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
