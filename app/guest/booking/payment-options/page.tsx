// app/guest/booking/payment-options/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import GuestNavbar from '@/app/components/GuestNavbar'
import PaymentDialog from '@/app/components/PaymentDialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CreditCard, Clock, CheckCircle2, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface RoomDetails {
  id: number
  name: string
  basePrice: number
  branch: {
    name: string
    location: string
  }
}

function PaymentOptionsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const roomId = searchParams.get('roomId')
  const checkIn = searchParams.get('checkIn')
  const checkOut = searchParams.get('checkOut')
  const guests = searchParams.get('guests')
  const specialRequests = searchParams.get('specialRequests')
  
  const [room, setRoom] = useState<RoomDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  
  // Payment dialog states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [currentPaymentOption, setCurrentPaymentOption] = useState<string>('')
  
  useEffect(() => {
    if (roomId) {
      fetchRoomDetails()
    }
  }, [roomId])
  
  const fetchRoomDetails = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`)
      if (!response.ok) throw new Error('Failed to fetch room details')
      const data = await response.json()
      setRoom(data)
    } catch (err) {
      setError('Failed to load room details')
    } finally {
      setLoading(false)
    }
  }
  
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
  }
  
  const nights = calculateNights()
  const baseAmount = room ? room.basePrice * nights : 0
  const reservationFee = Math.round(baseAmount * 0.2 * 100) / 100 // 20% reservation fee
  
  // Handle payment option click
  const handlePaymentOptionClick = (option: string) => {
    setSelectedOption(option)
    
    if (option === 'pay_later') {
      // Create booking immediately without payment
      createBooking(option, 0, null)
    } else {
      // Show payment dialog for reservation_fee or full payment
      const amount = option === 'full' ? baseAmount : reservationFee
      setPaymentAmount(amount)
      setCurrentPaymentOption(option)
      setShowPaymentDialog(true)
    }
  }
  
  // Handle payment submission from dialog
  const handlePaymentSubmit = async (paymentMethod: string) => {
    console.log('[PAYMENT] Submitting payment:', { 
      option: currentPaymentOption, 
      amount: paymentAmount, 
      method: paymentMethod 
    })
    await createBooking(currentPaymentOption, paymentAmount, paymentMethod)
    setShowPaymentDialog(false)
  }
  
  const createBooking = async (paymentOption: string, paymentAmount: number, paymentMethod: string | null) => {
    setProcessing(true)
    setError('')
    
    try {
      const bookingData: any = {
        room_id: parseInt(roomId!),
        check_in_date: checkIn,
        check_out_date: checkOut,
        number_of_guests: parseInt(guests || '1'),
        special_requests: specialRequests || null,
        payment_option: paymentOption
      }
      
      // Add payment details if not paying later
      if (paymentOption !== 'pay_later' && paymentAmount > 0 && paymentMethod) {
        bookingData.payment_amount = paymentAmount
        bookingData.payment_method = paymentMethod
      }
      
      console.log('[BOOKING] Creating booking with data:', bookingData)
      
      const response = await fetch('/api/guest/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(bookingData)
      })
      
      console.log('[BOOKING] Response status:', response.status, response.statusText)
      
      const data = await response.json()
      console.log('[BOOKING] Response data:', data)
      
      if (!response.ok) {
        console.error('[BOOKING] Error response:', data)
        throw new Error(data.error || 'Failed to create booking')
      }
      
      console.log('[BOOKING] Success! Booking reference:', data.booking?.booking_reference)
      
      // Redirect to confirmation page
      if (data.booking && data.booking.booking_reference) {
        router.push(`/guest/booking/confirmation?ref=${data.booking.booking_reference}`)
      } else {
        throw new Error('Booking created but no reference returned')
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to create booking')
      setProcessing(false)
    }
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
  
  return (
    <div className="min-h-screen bg-gradient-to-t from-amber-700/30 to-amber-50">
      <GuestNavbar />
      
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Payment Option</h1>
          <p className="text-gray-600">Select how you'd like to secure your booking</p>
        </div>

        {/* Booking Summary */}
        <Card className="mb-6 bg-white/80 backdrop-blur-xl border-white/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Room</p>
                <p className="font-semibold">{room?.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Location</p>
                <p className="font-semibold">{room?.branch.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Dates</p>
                <p className="font-semibold">
                  {checkIn && new Date(checkIn).toLocaleDateString()} - {checkOut && new Date(checkOut).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Duration</p>
                <p className="font-semibold">{nights} night{nights > 1 ? 's' : ''}</p>
              </div>
              <div className="col-span-2 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Total Amount</span>
                  <span className="font-bold text-2xl text-amber-600">${baseAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Payment Options */}
        <div className="space-y-4">
          {/* Option 1: Book Now, Pay Later */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedOption === 'pay_later' ? 'ring-2 ring-amber-500 shadow-lg' : ''
            } bg-white/80 backdrop-blur-xl border-white/20`}
            onClick={() => !processing && setSelectedOption('pay_later')}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <CardTitle className="text-xl">Book Now, Pay Later</CardTitle>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">Most Flexible</Badge>
                  </div>
                  <CardDescription className="text-base">
                    Reserve your room without any payment now. Pay anytime before or during your stay.
                  </CardDescription>
                </div>
                {selectedOption === 'pay_later' && (
                  <CheckCircle2 className="w-6 h-6 text-amber-600 flex-shrink-0" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900 font-semibold mb-2">Payment Details:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Pay $0 now</li>
                  <li>• Make payment anytime before check-in</li>
                  <li>• Total due at check-in: ${baseAmount.toFixed(2)}</li>
                </ul>
              </div>
              {selectedOption === 'pay_later' && (
                <Button 
                  onClick={() => handlePaymentOptionClick('pay_later')}
                  disabled={processing}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Booking...
                    </>
                  ) : (
                    <>
                      Reserve Without Payment
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Option 2: Reservation Fee (20%) */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedOption === 'reservation_fee' ? 'ring-2 ring-amber-500 shadow-lg' : ''
            } bg-white/80 backdrop-blur-xl border-white/20`}
            onClick={() => !processing && setSelectedOption('reservation_fee')}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-amber-600" />
                    <CardTitle className="text-xl">Pay Reservation Fee</CardTitle>
                    <Badge variant="outline" className="bg-green-100 text-green-800">Popular</Badge>
                  </div>
                  <CardDescription className="text-base">
                    Secure your booking with a 20% deposit. Pay the remaining balance later.
                  </CardDescription>
                </div>
                {selectedOption === 'reservation_fee' && (
                  <CheckCircle2 className="w-6 h-6 text-amber-600 flex-shrink-0" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-amber-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-900 font-semibold mb-2">Payment Breakdown:</p>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Pay now: ${reservationFee.toFixed(2)} (20%)</li>
                  <li>• Remaining balance: ${(baseAmount - reservationFee).toFixed(2)}</li>
                  <li>• Pay remaining before check-in or at checkout</li>
                </ul>
              </div>
              {selectedOption === 'reservation_fee' && (
                <Button 
                  onClick={() => handlePaymentOptionClick('reservation_fee')}
                  disabled={processing}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      Pay ${reservationFee.toFixed(2)} Now
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Option 3: Full Payment */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedOption === 'full' ? 'ring-2 ring-amber-500 shadow-lg' : ''
            } bg-white/80 backdrop-blur-xl border-white/20`}
            onClick={() => !processing && setSelectedOption('full')}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <CardTitle className="text-xl">Pay Full Amount</CardTitle>
                    <Badge variant="outline" className="bg-purple-100 text-purple-800">Instant Confirmation</Badge>
                  </div>
                  <CardDescription className="text-base">
                    Pay the full amount now and your booking is instantly confirmed.
                  </CardDescription>
                </div>
                {selectedOption === 'full' && (
                  <CheckCircle2 className="w-6 h-6 text-amber-600 flex-shrink-0" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-900 font-semibold mb-2">Payment Details:</p>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Pay full amount: ${baseAmount.toFixed(2)}</li>
                  <li>• Booking instantly confirmed</li>
                  <li>• No additional payment required</li>
                  <li>• Can add services later (billed separately)</li>
                </ul>
              </div>
              {selectedOption === 'full' && (
                <Button 
                  onClick={() => handlePaymentOptionClick('full')}
                  disabled={processing}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      Pay ${baseAmount.toFixed(2)} Now
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>All payments are secure and encrypted. You can cancel or modify your booking later.</p>
        </div>
      </main>

      {/* Payment Dialog */}
      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        amount={paymentAmount}
        onSubmit={handlePaymentSubmit}
        title={currentPaymentOption === 'reservation_fee' ? 'Pay Reservation Fee' : 'Pay Full Amount'}
        description={
          currentPaymentOption === 'reservation_fee'
            ? `Pay 20% reservation fee to secure your booking. Remaining balance can be paid later.`
            : 'Complete full payment now to instantly confirm your booking.'
        }
      />
    </div>
  )
}

export default function PaymentOptionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-t from-amber-700/30 to-amber-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
      </div>
    }>
      <PaymentOptionsContent />
    </Suspense>
  )
}
