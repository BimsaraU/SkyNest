// app/guest/booking/create/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import GuestNavbar from '@/app/components/GuestNavbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Calendar, Users, Loader2, BedDouble, MapPin, DollarSign, Clock, AlertCircle, Home, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface RoomDetails {
  id: number
  name: string
  description: string
  basePrice: number
  maxOccupancy: number
  bedType: string
  numberOfBeds: number
  roomSize: number
  branch: {
    id: number
    name: string
    location: string
  }
  images: Array<{
    url: string
    caption: string
  }>
}

interface AvailabilityInfo {
  available: boolean
  message: string
  reason?: string
  conflicting_bookings?: Array<{
    booking_reference: string
    check_in: string
    check_out: string
    status: string
  }>
  booking_details?: {
    nights: number
    base_amount: number
  }
}

function BookingCreateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const roomId = searchParams.get('roomId')
  const checkIn = searchParams.get('checkIn')
  const checkOut = searchParams.get('checkOut')
  const guests = searchParams.get('guests')
  
  const [room, setRoom] = useState<RoomDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [specialRequests, setSpecialRequests] = useState('')
  const [availability, setAvailability] = useState<AvailabilityInfo | null>(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  
  useEffect(() => {
    if (roomId) {
      fetchRoomDetails()
    } else {
      setError('Room ID is required')
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    if (roomId && checkIn && checkOut) {
      checkAvailability()
    }
  }, [roomId, checkIn, checkOut])
  
  const fetchRoomDetails = async () => {
    try {
      setLoading(true)
      console.log('[BOOKING CREATE] Fetching room details for room:', roomId)
      const response = await fetch(`/api/rooms/${roomId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch room details')
      }
      
      const data = await response.json()
      console.log('[BOOKING CREATE] Room data:', data)
      setRoom(data)
    } catch (err) {
      console.error('[BOOKING CREATE] Error fetching room:', err)
      setError('Failed to load room details')
    } finally {
      setLoading(false)
    }
  }
  
  const checkAvailability = async () => {
    if (!roomId || !checkIn || !checkOut) return
    
    setCheckingAvailability(true)
    setError('')
    
    try {
      const response = await fetch('/api/guest/rooms/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: parseInt(roomId),
          check_in_date: checkIn,
          check_out_date: checkOut
        })
      })
      
      const data = await response.json()
      setAvailability(data)
      
      if (!data.available) {
        setError(data.reason || 'Room is not available for the selected dates')
      }
    } catch (err) {
      console.error('Error checking availability:', err)
      setError('Failed to check room availability')
    } finally {
      setCheckingAvailability(false)
    }
  }

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
  }
  
  const calculateTotal = () => {
    if (!room) return 0
    const nights = calculateNights()
    return room.basePrice * nights
  }
  
  const handleProceedToPayment = () => {
    if (!roomId || !checkIn || !checkOut) {
      setError('Missing required booking information')
      return
    }

    if (!availability?.available) {
      setError('Cannot proceed - room is not available for selected dates')
      return
    }
    
    // Redirect to payment options page
    const params = new URLSearchParams({
      roomId: roomId,
      checkIn: checkIn,
      checkOut: checkOut,
      guests: guests || '1',
      specialRequests: specialRequests.trim()
    })
    
    router.push(`/guest/booking/payment-options?${params.toString()}`)
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-t from-amber-700/30 to-amber-50">
        <GuestNavbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
        </div>
      </div>
    )
  }
  
  if (error && !room) {
    return (
      <div className="min-h-screen bg-gradient-to-t from-amber-700/30 to-amber-50">
        <GuestNavbar />
        <div className="max-w-4xl mx-auto px-6 py-10">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="py-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <p className="text-red-700 text-lg mb-4">{error}</p>
              <Button 
                onClick={() => router.push('/guest/search-rooms')} 
                className="bg-amber-600 hover:bg-amber-700"
              >
                Back to Search
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  const nights = calculateNights()
  const baseAmount = room ? room.basePrice * nights : 0
  const total = calculateTotal()
  
  return (
    <div className="min-h-screen bg-gradient-to-t from-amber-700/30 to-amber-50">
      <GuestNavbar />
      
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Booking</h1>
          <p className="text-gray-600 mt-2">Review your selection and confirm your reservation</p>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-xl border-white/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900">Booking Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Availability Status */}
                  {checkingAvailability && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                      <p className="text-blue-700">Checking room availability...</p>
                    </div>
                  )}

                  {!checkingAvailability && availability && (
                    <div className={`border rounded-lg p-4 flex items-start gap-3 ${
                      availability.available 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      {availability.available ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-green-900">Room Available!</p>
                            <p className="text-sm text-green-700">{availability.message}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-red-900">Room Not Available</p>
                            <p className="text-sm text-red-700 mb-2">{availability.reason}</p>
                            {availability.conflicting_bookings && availability.conflicting_bookings.length > 0 && (
                              <div className="text-xs text-red-600">
                                <p className="font-semibold mb-1">Conflicting bookings:</p>
                                {availability.conflicting_bookings.map((booking, idx) => (
                                  <p key={idx}>
                                    {new Date(booking.check_in).toLocaleDateString()} - {new Date(booking.check_out).toLocaleDateString()}
                                  </p>
                                ))}
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => router.push('/guest/search-rooms')}
                            >
                              Choose Different Dates
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Room Info */}
                  <div className="border-b pb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Selected Room</h3>
                    <div className="flex gap-4">
                      <div className="w-32 h-32 relative rounded-lg overflow-hidden flex-shrink-0">
                        {room?.images && room.images.length > 0 ? (
                          <Image
                            src={room.images[0].url}
                            alt={room.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                            <Home className="w-8 h-8 text-amber-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-900">{room?.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{room?.description}</p>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Up to {room?.maxOccupancy} guests
                          </span>
                          <span className="flex items-center gap-1">
                            <BedDouble className="w-4 h-4" />
                            {room?.bedType}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {room?.branch.name}, {room?.branch.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dates Info */}
                  <div className="border-b pb-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Stay Dates</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          <span className="text-xs text-gray-600 uppercase font-semibold">Check-in</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {checkIn ? new Date(checkIn).toLocaleDateString('en-US', { 
                            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                          }) : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-600">After 2:00 PM</p>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          <span className="text-xs text-gray-600 uppercase font-semibold">Check-out</span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {checkOut ? new Date(checkOut).toLocaleDateString('en-US', { 
                            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                          }) : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-600">Before 12:00 PM</p>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span className="text-xs text-gray-600 uppercase font-semibold">Duration</span>
                        </div>
                        <p className="font-semibold text-gray-900">{nights} Night{nights > 1 ? 's' : ''}</p>
                        <p className="text-xs text-gray-600">{guests || 1} Guest{(parseInt(guests || '1') > 1) ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Special Requests */}
                  <div className="border-b pb-6">
                    <h3 className="font-semibold text-gray-900 mb-2">Special Requests</h3>
                    <Label htmlFor="requests" className="text-sm text-gray-600 mb-2 block">
                      Any special requirements or preferences? (Optional)
                    </Label>
                    <Textarea
                      id="requests"
                      placeholder="E.g., Late check-in, high floor, extra pillows..."
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Proceed Button */}
                  <Button 
                    onClick={handleProceedToPayment}
                    disabled={!availability?.available || checkingAvailability}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-6 text-lg disabled:opacity-50"
                  >
                    {checkingAvailability ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Checking Availability...
                      </>
                    ) : availability?.available ? (
                      <>Proceed to Payment Options</>
                    ) : (
                      <>Room Not Available</>
                    )}
                  </Button>

                  <p className="text-center text-sm text-gray-500">
                    Choose your payment option on the next page
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white/80 backdrop-blur-xl border-white/20 shadow-lg sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Room Rate</span>
                    <span className="font-semibold text-gray-900">${room?.basePrice.toFixed(2)}/night</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{nights} night{nights > 1 ? 's' : ''}</span>
                    <span className="font-semibold text-gray-900">× {nights}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold text-gray-700">Base Amount</span>
                      <span className="font-semibold text-gray-900">${baseAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Services</span>
                      <span>$0.00</span>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-900">Total Amount</span>
                      <span className="font-bold text-xl text-amber-600">${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>Outstanding</span>
                      <span className="font-semibold">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Payment Information
                  </h4>
                  <p className="text-sm text-blue-800">
                    Payment will be processed after booking confirmation. You'll be redirected to the payment page.
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2">Cancellation Policy</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Free cancellation up to 5 days before check-in</li>
                    <li>• 1-4 days: 1 night charge</li>
                    <li>• Less than 24 hours: Full charge</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function BookingCreatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-t from-amber-700/30 to-amber-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
      </div>
    }>
      <BookingCreateContent />
    </Suspense>
  )
}
