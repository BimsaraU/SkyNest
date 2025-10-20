'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import GuestNavbar from '@/app/components/GuestNavbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calendar, MapPin, Users, CreditCard, CheckCircle, Clock, XCircle, 
  AlertCircle, LogIn, LogOut, ArrowLeft, Loader2, Home, Phone, Mail,
  Plus, Trash2, Hotel, DollarSign
} from 'lucide-react'

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
  branch_location: string
  checked_in_at: string | null
  checked_out_at: string | null
  special_requests: string | null
  created_at: string
}

interface Service {
  service_usage_id: number
  service_id: number
  service_name: string
  quantity: number
  price_at_time: number
  total_price: number
  notes?: string
  added_at: string
}

interface Payment {
  payment_id: number
  amount: number
  payment_method: string
  payment_type: string
  payment_date: string
  payment_status: string
  transaction_id?: string
}

interface AvailableService {
  service_id: number
  name: string
  description: string
  price: number
  category: string
  available: boolean
}

export default function BookingDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = params.id
  const defaultTab = searchParams.get('tab') || 'overview'

  const [booking, setBooking] = useState<Booking | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [availableServices, setAvailableServices] = useState<AvailableService[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  
  // Dialog states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showAddServiceDialog, setShowAddServiceDialog] = useState(false)
  const [showDeleteServiceDialog, setShowDeleteServiceDialog] = useState(false)
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null)

  // Form states
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [serviceQuantity, setServiceQuantity] = useState('1')
  const [serviceNotes, setServiceNotes] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Credit Card')

  useEffect(() => {
    fetchBooking()
  }, [bookingId])

  const fetchBooking = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/guest/bookings/${bookingId}`)
      if (!response.ok) throw new Error('Failed to fetch booking')
      const data = await response.json()
      setBooking(data.booking)
    } catch (error) {
      console.error('Error fetching booking:', error)
      setMessage({ type: 'error', text: 'Failed to load booking details' })
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const response = await fetch(`/api/guest/bookings/${bookingId}/services`)
      if (!response.ok) throw new Error('Failed to fetch services')
      const data = await response.json()
      setServices(data.services || [])
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const fetchPayments = async () => {
    try {
      const response = await fetch(`/api/guest/bookings/${bookingId}/payments`)
      if (!response.ok) throw new Error('Failed to fetch payments')
      const data = await response.json()
      setPayments(data.payments || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
    }
  }

  const fetchAvailableServices = async () => {
    try {
      const response = await fetch('/api/guest/services')
      if (!response.ok) throw new Error('Failed to fetch available services')
      const data = await response.json()
      setAvailableServices(data.services || [])
    } catch (error) {
      console.error('Error fetching available services:', error)
    }
  }

  const handleAddService = async () => {
    if (!selectedServiceId || !serviceQuantity) {
      setMessage({ type: 'error', text: 'Please select a service and quantity' })
      return
    }

    try {
      setProcessing(true)
      const selectedService = availableServices.find(s => s.service_id.toString() === selectedServiceId)
      
      const response = await fetch(`/api/guest/bookings/${bookingId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: parseInt(selectedServiceId),
          quantity: parseInt(serviceQuantity),
          price_at_time: selectedService?.price || 0,
          notes: serviceNotes || null
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add service')
      }

      setMessage({ type: 'success', text: 'Service added successfully!' })
      setShowAddServiceDialog(false)
      setSelectedServiceId('')
      setServiceQuantity('1')
      setServiceNotes('')
      
      // Refresh data
      await fetchBooking()
      await fetchServices()
    } catch (error: any) {
      console.error('Error adding service:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to add service' })
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteService = async () => {
    if (!serviceToDelete) return

    try {
      setProcessing(true)
      const response = await fetch(`/api/guest/bookings/${bookingId}/services?service_usage_id=${serviceToDelete.service_usage_id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove service')
      }

      setMessage({ type: 'success', text: 'Service removed successfully!' })
      setShowDeleteServiceDialog(false)
      setServiceToDelete(null)
      
      // Refresh data
      await fetchBooking()
      await fetchServices()
    } catch (error: any) {
      console.error('Error removing service:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to remove service' })
    } finally {
      setProcessing(false)
    }
  }

  const handlePayment = async () => {
    if (!booking || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid payment amount' })
      return
    }

    const amount = parseFloat(paymentAmount)
    if (amount > booking.outstanding_amount) {
      setMessage({ type: 'error', text: 'Payment amount cannot exceed outstanding balance' })
      return
    }

    try {
      setProcessing(true)
      const response = await fetch(`/api/guest/bookings/${bookingId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          payment_method: paymentMethod,
          payment_type: amount === booking.outstanding_amount ? 'full' : 'partial'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Payment failed')
      }

      setMessage({ type: 'success', text: 'Payment processed successfully!' })
      setShowPaymentDialog(false)
      setPaymentAmount('')
      
      // Refresh data
      await fetchBooking()
      await fetchPayments()
    } catch (error: any) {
      console.error('Error processing payment:', error)
      setMessage({ type: 'error', text: error.message || 'Payment failed' })
    } finally {
      setProcessing(false)
    }
  }

  // Check-in and check-out functions removed - only staff can check in/out guests

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Confirmed': 'bg-green-100 text-green-800 border-green-300',
      'CheckedIn': 'bg-blue-100 text-blue-800 border-blue-300',
      'CheckedOut': 'bg-gray-100 text-gray-800 border-gray-300',
      'Cancelled': 'bg-red-100 text-red-800 border-red-300'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getPaymentTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'full': 'bg-green-100 text-green-800',
      'reservation_fee': 'bg-amber-100 text-amber-800',
      'partial': 'bg-blue-100 text-blue-800',
      'service_payment': 'bg-purple-100 text-purple-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getStatusBadge = () => {
    if (!booking) return null

    if (booking.status === 'Cancelled') {
      return <span className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-bold flex items-center gap-2"><XCircle className="w-4 h-4" />Cancelled</span>
    }
    if (booking.status === 'CheckedOut') {
      return <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold flex items-center gap-2"><CheckCircle className="w-4 h-4" />Completed</span>
    }
    if (booking.status === 'CheckedIn') {
      return <span className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-bold flex items-center gap-2"><Clock className="w-4 h-4" />Active</span>
    }
    if (booking.status === 'Confirmed') {
      return <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-bold flex items-center gap-2"><CheckCircle className="w-4 h-4" />Confirmed</span>
    }
    return <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-xl text-sm font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" />Pending</span>
  }

  const canCheckIn = () => {
    if (!booking) return false
    const today = new Date()
    const checkIn = new Date(booking.check_in_date)
    return booking.status === 'Confirmed' && checkIn <= today && booking.outstanding_amount === 0
  }

  const canCheckOut = () => {
    if (!booking) return false
    return booking.status === 'CheckedIn' && booking.outstanding_amount === 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-100/30">
        <GuestNavbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-100/30">
        <GuestNavbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-white/90 backdrop-blur-lg shadow-xl border border-gray-200/50 rounded-2xl">
            <CardContent className="p-16 text-center">
              <AlertCircle className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg mb-6">Booking not found</p>
              <Button 
                onClick={() => router.push('/guest/my-bookings')}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 py-6 text-lg rounded-xl shadow-lg"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to My Bookings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const nights = Math.ceil((new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-100/30">
      <GuestNavbar />

      <div className="container mx-auto px-4 py-8">
        {/* Message Alert */}
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

        {/* Back Button */}
        <Button
          onClick={() => router.push('/guest/my-bookings')}
          variant="outline"
          className="mb-6 border-2 border-gray-300 hover:border-amber-500 hover:bg-amber-50 font-semibold rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Bookings
        </Button>

        {/* Status Banner */}
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-black rounded-2xl shadow-xl mb-8 border-0">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-8 h-8" />
                  <h1 className="text-3xl font-bold">Booking Details</h1>
                </div>
                <p className="text-black/80 font-mono text-lg">{booking.booking_reference}</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Interface */}
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm border border-gray-200 rounded-xl p-1">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <Home className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="services" 
              className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black"
              onClick={() => fetchServices()}
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger 
              value="payments" 
              className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-black"
              onClick={() => fetchPayments()}
            >
              <Clock className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Room Details */}
            <Card className="bg-white/90 backdrop-blur-lg shadow-lg border border-gray-200/50 rounded-2xl overflow-hidden">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Home className="w-6 h-6 text-amber-600" />
                  Room Information
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6 p-5 bg-amber-50/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 rounded-lg">
                      <Home className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Room Type</p>
                      <p className="text-lg font-bold text-gray-900">{booking.room_type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 rounded-lg">
                      <Home className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Room Number</p>
                      <p className="text-lg font-bold text-gray-900">{booking.room_number}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 rounded-lg">
                      <MapPin className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Branch</p>
                      <p className="text-lg font-bold text-gray-900">{booking.branch_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 rounded-lg">
                      <Users className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Guests</p>
                      <p className="text-lg font-bold text-gray-900">{booking.number_of_guests} Guest{booking.number_of_guests > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Location</p>
                      <p className="text-sm text-gray-600">{booking.branch_location}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Details */}
            <Card className="bg-white/90 backdrop-blur-lg shadow-lg border border-gray-200/50 rounded-2xl overflow-hidden">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-amber-600" />
                  Stay Details
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-5 bg-green-50/50 rounded-xl border border-green-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <LogIn className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-green-600 font-bold uppercase">Check-in</p>
                        <p className="text-xl font-bold text-gray-900">
                          {new Date(booking.check_in_date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    {booking.checked_in_at && (
                      <p className="text-sm text-green-700 font-medium mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Checked in: {new Date(booking.checked_in_at).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>

                  <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 bg-blue-500/10 rounded-lg">
                        <LogOut className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-bold uppercase">Check-out</p>
                        <p className="text-xl font-bold text-gray-900">
                          {new Date(booking.check_out_date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    {booking.checked_out_at && (
                      <p className="text-sm text-blue-700 font-medium mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Checked out: {new Date(booking.checked_out_at).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50/50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">Total Duration</span>
                    <span className="text-lg font-bold text-amber-600">{nights} Night{nights > 1 ? 's' : ''}</span>
                  </div>
                </div>

                {booking.special_requests && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm font-bold text-gray-700 mb-2">Special Requests</p>
                    <p className="text-sm text-gray-600">{booking.special_requests}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="bg-white/90 backdrop-blur-lg shadow-lg border border-gray-200/50 rounded-2xl overflow-hidden">
              <CardContent className="p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Actions</h2>
                <div className="flex gap-3 flex-wrap">
                  {booking.outstanding_amount > 0 && (
                    <Button
                      onClick={() => {
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card className="bg-white/90 backdrop-blur-lg shadow-lg border border-gray-200/50 rounded-2xl overflow-hidden sticky top-4">
              <CardContent className="p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-amber-600" />
                  Payment Summary
                </h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="text-lg font-bold text-gray-900">
                      ${Number(booking.total_amount).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-gray-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Paid Amount
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      ${Number(booking.paid_amount).toFixed(2)}
                    </span>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl border-2 border-amber-300">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900 font-bold">Outstanding</span>
                      <span className="text-2xl font-bold text-amber-600">
                        ${Number(booking.outstanding_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {booking.outstanding_amount === 0 && booking.paid_amount > 0 && (
                    <div className="p-4 bg-green-50/80 rounded-xl border border-green-200">
                      <div className="flex items-center gap-2 text-green-700 font-bold">
                        <CheckCircle className="w-5 h-5" />
                        Fully Paid
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Booking Info */}
            <Card className="bg-white/90 backdrop-blur-lg shadow-lg border border-gray-200/50 rounded-2xl overflow-hidden">
              <CardContent className="p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Booking Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Booking Date</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(booking.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Reference Number</p>
                    <p className="text-sm font-mono font-bold text-gray-900 bg-gray-100 px-3 py-2 rounded-lg">
                      {booking.booking_reference}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Status</p>
                    {getStatusBadge()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <Card className="shadow-lg border-2 border-gray-200">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-6 h-6" />
                    Additional Services
                  </CardTitle>
                  {['Pending', 'Confirmed', 'CheckedIn'].includes(booking.status) && (
                    <Button
                      onClick={() => {
                        fetchAvailableServices()
                        setShowAddServiceDialog(true)
                      }}
                      className="bg-white text-purple-600 hover:bg-purple-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {services.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No additional services added yet</p>
                    {['Pending', 'Confirmed', 'CheckedIn'].includes(booking.status) && (
                      <Button
                        onClick={() => {
                          fetchAvailableServices()
                          setShowAddServiceDialog(true)
                        }}
                        variant="outline"
                        className="border-2 border-purple-300 hover:bg-purple-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Service
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {services.map((service) => (
                      <div
                        key={service.service_usage_id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{service.service_name}</h4>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>Quantity: {service.quantity}</span>
                            <span>Price: ${Number(service.price_at_time).toFixed(2)}</span>
                            <span className="font-semibold text-gray-900">Total: ${Number(service.total_price).toFixed(2)}</span>
                          </div>
                          {service.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">{service.notes}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">Added: {new Date(service.added_at).toLocaleString()}</p>
                        </div>
                        {['Pending', 'Confirmed', 'CheckedIn'].includes(booking.status) && (
                          <Button
                            onClick={() => {
                              setServiceToDelete(service)
                              setShowDeleteServiceDialog(true)
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    <div className="pt-4 border-t-2 border-gray-200">
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span>Total Services Cost:</span>
                        <span className="text-purple-600">${Number(booking.services_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card className="shadow-lg border-2 border-gray-200">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    Payment History
                  </CardTitle>
                  {booking.outstanding_amount > 0 && (
                    <Button
                      onClick={() => {
                        setPaymentAmount(booking.outstanding_amount.toString())
                        setShowPaymentDialog(true)
                      }}
                      className="bg-white text-blue-600 hover:bg-blue-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Make Payment
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {payments.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No payments made yet</p>
                    {booking.outstanding_amount > 0 && (
                      <Button
                        onClick={() => {
                          setPaymentAmount(booking.outstanding_amount.toString())
                          setShowPaymentDialog(true)
                        }}
                        variant="outline"
                        className="border-2 border-blue-300 hover:bg-blue-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Make Your First Payment
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <div
                        key={payment.payment_id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold text-xl text-gray-900">${Number(payment.amount).toFixed(2)}</span>
                          </div>
                          <Badge className={`${getPaymentTypeColor(payment.payment_type)} px-3 py-1`}>
                            {payment.payment_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Method:</span>
                            <span className="ml-2 font-semibold text-gray-900">{payment.payment_method}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Status:</span>
                            <Badge variant={payment.payment_status === 'Completed' ? 'default' : 'secondary'} className="ml-2">
                              {payment.payment_status}
                            </Badge>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-600">Date:</span>
                            <span className="ml-2 text-gray-900">{new Date(payment.payment_date).toLocaleString()}</span>
                          </div>
                          {payment.transaction_id && (
                            <div className="col-span-2">
                              <span className="text-gray-600">Transaction ID:</span>
                              <span className="ml-2 font-mono text-xs text-gray-900">{payment.transaction_id}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-4 border-t-2 border-gray-200 space-y-2">
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-semibold">Total Paid:</span>
                        <span className="text-green-600 font-bold">${Number(booking.paid_amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg">
                        <span className="font-semibold">Outstanding:</span>
                        <span className={`font-bold ${booking.outstanding_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${Number(booking.outstanding_amount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Service Dialog */}
      <Dialog open={showAddServiceDialog} onOpenChange={setShowAddServiceDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-600" />
              Add Service to Booking
            </DialogTitle>
            <DialogDescription>
              Select a service to add to your booking. The cost will be added to your outstanding balance.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="service">Service</Label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger id="service">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.filter(s => s.available).map((service) => (
                    <SelectItem key={service.service_id} value={service.service_id.toString()}>
                      {service.name} - ${Number(service.price).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedServiceId && (
                <p className="text-sm text-gray-600 mt-2">
                  {availableServices.find(s => s.service_id.toString() === selectedServiceId)?.description}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={serviceQuantity}
                onChange={(e) => setServiceQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={serviceNotes}
                onChange={(e) => setServiceNotes(e.target.value)}
                placeholder="Any special instructions..."
                rows={3}
              />
            </div>

            {selectedServiceId && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Estimated Cost:</span>
                  <span className="text-xl font-bold text-amber-600">
                    ${(Number(availableServices.find(s => s.service_id.toString() === selectedServiceId)?.price || 0) * parseInt(serviceQuantity || '1')).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddServiceDialog(false)
                setSelectedServiceId('')
                setServiceQuantity('1')
                setServiceNotes('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddService}
              disabled={processing || !selectedServiceId}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {processing ? 'Adding...' : 'Add Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Service Dialog */}
      <Dialog open={showDeleteServiceDialog} onOpenChange={setShowDeleteServiceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Remove Service
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this service from your booking? The cost will be deducted from your total.
            </DialogDescription>
          </DialogHeader>
          
          {serviceToDelete && (
            <div className="p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-2">{serviceToDelete.service_name}</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Quantity: {serviceToDelete.quantity}</div>
                <div className="font-semibold text-gray-900">Total: ${Number(serviceToDelete.total_price).toFixed(2)}</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteServiceDialog(false)
                setServiceToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteService}
              disabled={processing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {processing ? 'Removing...' : 'Remove Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Make Payment
            </DialogTitle>
            <DialogDescription>
              Pay for your outstanding balance. You can make a partial or full payment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Outstanding Balance:</span>
                <span className="text-2xl font-bold text-blue-600">${Number(booking.outstanding_amount).toFixed(2)}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="payment-amount">Payment Amount ($)</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={booking.outstanding_amount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount to pay"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount((booking.outstanding_amount * 0.5).toFixed(2))}
                >
                  50%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount(booking.outstanding_amount.toString())}
                >
                  Pay Full
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Debit Card">Debit Card</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="PayPal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentAmount && parseFloat(paymentAmount) > 0 && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Payment Amount:</span>
                    <span className="font-bold text-gray-900">${Number(paymentAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Remaining Balance:</span>
                    <span className="font-bold text-gray-900">
                      ${(booking.outstanding_amount - parseFloat(paymentAmount)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentDialog(false)
                setPaymentAmount('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={processing || !paymentAmount || parseFloat(paymentAmount) <= 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {processing ? 'Processing...' : 'Process Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
