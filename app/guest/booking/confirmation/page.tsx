'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import GuestNavbar from '@/app/components/GuestNavbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Calendar, MapPin, Users, DollarSign, Loader2 } from 'lucide-react'

interface BookingDetails {
  booking_reference: string
  check_in_date: string
  check_out_date: string
  room_type: string
  room_number: string
  branch_name: string
  total_amount: number
  status: string
  number_of_guests: number
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-t from-amber-100/50 to-amber-50" />}> 
      <BookingConfirmationInner />
    </Suspense>
  )
}

function BookingConfirmationInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingRef = searchParams.get('ref')
  
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (bookingRef) {
      fetchBookingDetails()
    } else {
      setError('No booking reference provided')
      setLoading(false)
    }
  }, [bookingRef])

  const fetchBookingDetails = async () => {
    try {
      const response = await fetch('/api/bookings')
      const data = await response.json()
      
      if (data.success && data.bookings) {
        const foundBooking = data.bookings.find(
          (b: any) => b.booking_reference === bookingRef
        )
        
        if (foundBooking) {
          setBooking(foundBooking)
        } else {
          setError('Booking not found')
        }
      }
    } catch (err) {
      setError('Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-t from-amber-100/50 to-amber-50">
        <GuestNavbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-t from-amber-100/50 to-amber-50">
        <GuestNavbar />
        <div className="container mx-auto px-4 py-20">
          <Card className="max-w-2xl mx-auto bg-white/70 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <p className="text-red-600 mb-4">{error || 'Booking not found'}</p>
              <Button 
                onClick={() => router.push('/guest/dashboard')}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-t from-amber-100/50 to-amber-50 text-gray-800">
      <GuestNavbar />
      
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-gray-600">
              Your reservation has been successfully created
            </p>
          </div>

          {/* Booking Details Card */}
          <Card className="bg-white/70 backdrop-blur-sm mb-6">
            <CardContent className="p-8">
              <div className="mb-6 pb-6 border-b border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Booking Reference</p>
                <p className="text-2xl font-bold text-gray-900">
                  {booking.booking_reference}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-amber-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Check-in</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(booking.check_in_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-amber-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Check-out</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(booking.check_out_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-amber-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-semibold text-gray-900">{booking.branch_name}</p>
                    <p className="text-sm text-gray-600">Room {booking.room_number}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-amber-600 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Guests</p>
                    <p className="font-semibold text-gray-900">
                      {booking.number_of_guests} Guest{booking.number_of_guests > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                    <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                  </div>
                  <span className="text-2xl font-bold text-amber-600">
                    ${Number(booking.total_amount).toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Status: <span className="font-semibold text-amber-600">{booking.status}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={() => router.push('/guest/my-bookings')}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold py-6"
            >
              View My Bookings
            </Button>
            <Button
              onClick={() => router.push('/guest/dashboard')}
              variant="outline"
              className="flex-1 py-6 border-gray-300"
            >
              Go to Dashboard
            </Button>
          </div>

          {/* Additional Info */}
          <Card className="mt-6 bg-blue-50/70 backdrop-blur-sm border-blue-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2">Important Information</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Check-in time is 2:00 PM</li>
                <li>• Check-out time is 12:00 PM</li>
                <li>• Please bring a valid ID for check-in</li>
                <li>• Cancellation policy applies as per terms and conditions</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
