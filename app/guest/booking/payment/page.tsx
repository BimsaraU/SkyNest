'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}> 
      <PaymentPageInner />
    </Suspense>
  )
}

function PaymentPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('bookingId')

  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    saveCard: false
  })

  const [paymentMethod, setPaymentMethod] = useState('card')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Mock booking data
  const booking = {
    id: bookingId || '12345',
    room: 'Deluxe Ocean View Suite',
    branch: 'Sky Nest Galle',
    checkIn: '2025-11-10',
    checkOut: '2025-11-14',
    guests: 2,
    nights: 4,
    roomPrice: 200,
    serviceFee: 80,
    taxes: 96,
    total: 976,
    paymentType: 'full', // or 'partial'
    amountDue: 976
  }

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const chunks = cleaned.match(/.{1,4}/g)
    return chunks ? chunks.join(' ') : cleaned
  }

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4)
    }
    return cleaned
  }

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value

    if (field === 'cardNumber') {
      formattedValue = formatCardNumber(value.replace(/\s/g, '').slice(0, 16))
    } else if (field === 'expiryDate') {
      formattedValue = formatExpiryDate(value.slice(0, 5))
    } else if (field === 'cvv') {
      formattedValue = value.replace(/\D/g, '').slice(0, 3)
    }

    setPaymentData(prev => ({ ...prev, [field]: formattedValue }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validatePayment = () => {
    const newErrors: Record<string, string> = {}

    if (paymentMethod === 'card') {
      if (!paymentData.cardNumber.replace(/\s/g, '') || paymentData.cardNumber.replace(/\s/g, '').length !== 16) {
        newErrors.cardNumber = 'Please enter a valid 16-digit card number'
      }
      if (!paymentData.cardName.trim()) {
        newErrors.cardName = 'Cardholder name is required'
      }
      if (!paymentData.expiryDate || paymentData.expiryDate.length !== 5) {
        newErrors.expiryDate = 'Please enter expiry date (MM/YY)'
      }
      if (!paymentData.cvv || paymentData.cvv.length !== 3) {
        newErrors.cvv = 'Please enter 3-digit CVV'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePayment()) return

    setIsProcessing(true)

    try {
      // TODO: Implement actual payment API call
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Redirect to confirmation page
      router.push(`/guest/booking/confirmation?bookingId=${booking.id}`)
    } catch (err) {
      setErrors({ general: 'Payment failed. Please try again or use a different payment method.' })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">SN</span>
            </div>
            <div>
              <span className="text-xl font-bold text-gray-800">Sky Nest</span>
              <p className="text-xs text-gray-500 -mt-1">Secure Payment</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                ✓
              </div>
              <span className="ml-2 text-sm font-medium text-gray-700">Booking Details</span>
            </div>
            <div className="w-16 h-1 bg-green-600"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                2
              </div>
              <span className="ml-2 text-sm font-medium text-blue-600">Payment</span>
            </div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                3
              </div>
              <span className="ml-2 text-sm font-medium text-gray-500">Confirmation</span>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Complete Your Payment</h1>

        {errors.general && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <span className="text-red-500 mr-2">⚠️</span>
              <span className="text-red-700 text-sm">{errors.general}</span>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Select Payment Method</h2>

              <div className="space-y-3 mb-6">
                <div
                  onClick={() => setPaymentMethod('card')}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                    paymentMethod === 'card' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="w-5 h-5 text-blue-600"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Credit / Debit Card</p>
                      <p className="text-sm text-gray-600">Visa, Mastercard, American Express</p>
                    </div>
                    <div className="flex space-x-2">
                      <span className="text-2xl">💳</span>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setPaymentMethod('paypal')}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                    paymentMethod === 'paypal' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      checked={paymentMethod === 'paypal'}
                      onChange={() => setPaymentMethod('paypal')}
                      className="w-5 h-5 text-blue-600"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">PayPal</p>
                      <p className="text-sm text-gray-600">Pay securely with your PayPal account</p>
                    </div>
                    <span className="text-2xl">🅿️</span>
                  </div>
                </div>

                <div
                  onClick={() => setPaymentMethod('bank')}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                    paymentMethod === 'bank' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      checked={paymentMethod === 'bank'}
                      onChange={() => setPaymentMethod('bank')}
                      className="w-5 h-5 text-blue-600"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Bank Transfer</p>
                      <p className="text-sm text-gray-600">Direct bank transfer</p>
                    </div>
                    <span className="text-2xl">🏦</span>
                  </div>
                </div>
              </div>

              {paymentMethod === 'card' && (
                <form onSubmit={handlePayment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Card Number *
                    </label>
                    <input
                      type="text"
                      value={paymentData.cardNumber}
                      onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.cardNumber ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="1234 5678 9012 3456"
                    />
                    {errors.cardNumber && <p className="mt-1 text-sm text-red-600">{errors.cardNumber}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cardholder Name *
                    </label>
                    <input
                      type="text"
                      value={paymentData.cardName}
                      onChange={(e) => handleInputChange('cardName', e.target.value)}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.cardName ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="John Doe"
                    />
                    {errors.cardName && <p className="mt-1 text-sm text-red-600">{errors.cardName}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Expiry Date *
                      </label>
                      <input
                        type="text"
                        value={paymentData.expiryDate}
                        onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.expiryDate ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="MM/YY"
                      />
                      {errors.expiryDate && <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        CVV *
                      </label>
                      <input
                        type="text"
                        value={paymentData.cvv}
                        onChange={(e) => handleInputChange('cvv', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.cvv ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="123"
                      />
                      {errors.cvv && <p className="mt-1 text-sm text-red-600">{errors.cvv}</p>}
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="saveCard"
                      type="checkbox"
                      checked={paymentData.saveCard}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, saveCard: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="saveCard" className="ml-2 text-sm text-gray-700">
                      Save this card for future bookings
                    </label>
                  </div>
                </form>
              )}

              {paymentMethod === 'paypal' && (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">You will be redirected to PayPal to complete your payment securely.</p>
                  <button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="bg-yellow-500 text-gray-900 px-8 py-3 rounded-lg hover:bg-yellow-600 transition font-semibold"
                  >
                    Continue to PayPal
                  </button>
                </div>
              )}

              {paymentMethod === 'bank' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Bank Transfer Details</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p><strong>Bank Name:</strong> Commercial Bank of Ceylon</p>
                    <p><strong>Account Name:</strong> Sky Nest Hotels (Pvt) Ltd</p>
                    <p><strong>Account Number:</strong> 1234567890</p>
                    <p><strong>SWIFT Code:</strong> CCEYLKLX</p>
                    <p><strong>Reference:</strong> Booking #{booking.id}</p>
                  </div>
                  <p className="mt-4 text-sm text-blue-900">
                    Please include your booking reference number in the transfer details.
                    Your booking will be confirmed once payment is received (usually within 1-2 business days).
                  </p>
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">🔒</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Secure Payment</h3>
                  <p className="text-sm text-gray-600">
                    Your payment information is encrypted and secure. We use industry-standard SSL encryption to protect your data.
                    We never store your full credit card details.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-xl p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="mb-4 pb-4 border-b">
                <h3 className="font-semibold text-gray-900 mb-1">{booking.room}</h3>
                <p className="text-sm text-gray-600">{booking.branch}</p>
              </div>

              <div className="space-y-2 mb-4 pb-4 border-b text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-in</span>
                  <span className="font-medium text-gray-900">{booking.checkIn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Check-out</span>
                  <span className="font-medium text-gray-900">{booking.checkOut}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Guests</span>
                  <span className="font-medium text-gray-900">{booking.guests} guests</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nights</span>
                  <span className="font-medium text-gray-900">{booking.nights} nights</span>
                </div>
              </div>

              <div className="space-y-2 mb-4 pb-4 border-b text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">${booking.roomPrice} × {booking.nights} nights</span>
                  <span className="text-gray-900">${booking.roomPrice * booking.nights}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service fee</span>
                  <span className="text-gray-900">${booking.serviceFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taxes</span>
                  <span className="text-gray-900">${booking.taxes}</span>
                </div>
              </div>

              <div className="flex justify-between font-bold text-lg mb-6">
                <span>Amount Due</span>
                <span className="text-blue-600">${booking.amountDue}</span>
              </div>

              {paymentMethod === 'card' && (
                <button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing Payment...
                    </div>
                  ) : (
                    `Pay $${booking.amountDue}`
                  )}
                </button>
              )}

              <p className="text-center text-xs text-gray-500 mt-4">
                By completing this payment, you agree to our Terms of Service and Cancellation Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}