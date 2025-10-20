'use client'

import { useState, useEffect } from 'react'
import GuestNavbar from '@/app/components/GuestNavbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Loader2, Receipt, DollarSign, Calendar, MapPin, Mail } from 'lucide-react'
import { downloadBill } from '@/lib/billGenerator'

interface Service {
  name: string
  description: string
  price: number
  status: string
}

interface BillBreakdown {
  room_charges: number
  base_price: number
  nights: number
  services: Service[]
  service_charges_total: number
  subtotal: number
  service_charge: number
  vat: number
  total: number
}

interface Bill {
  id: number
  booking_reference: string
  check_in_date: string
  check_out_date: string
  nights: number
  room_number: string
  room_type: string
  branch_name: string
  branch_location: string
  branch_phone: string
  branch_email: string
  guest_name: string
  guest_email: string
  guest_phone: string
  status: string
  payment_status: string
  payment_method: string | null
  paid_at: string | null
  breakdown: BillBreakdown
}

interface Summary {
  total_bills: number
  total_pending: number
  total_paid: number
  pending_count: number
  paid_count: number
}

export default function GuestBillsPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [summary, setSummary] = useState<Summary>({
    total_bills: 0,
    total_pending: 0,
    total_paid: 0,
    pending_count: 0,
    paid_count: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [sendingEmail, setSendingEmail] = useState<number | null>(null)

  useEffect(() => {
    fetchBills()
  }, [])

  const fetchBills = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/guest/bills')
      if (!response.ok) throw new Error('Failed to fetch bills')
      const data = await response.json()
      setBills(data.bills)
      setSummary(data.summary)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadBill = (bill: Bill) => {
    const billData = {
      bookingReference: bill.booking_reference,
      guestName: bill.guest_name,
      guestEmail: bill.guest_email,
      guestPhone: bill.guest_phone,
      roomNumber: bill.room_number,
      roomType: bill.room_type,
      checkInDate: bill.check_in_date,
      checkOutDate: bill.check_out_date,
      nights: bill.breakdown.nights,
      basePrice: bill.breakdown.base_price,
      taxAmount: bill.breakdown.vat,
      serviceCharge: bill.breakdown.service_charge,
      totalAmount: bill.breakdown.total,
      paymentStatus: bill.payment_status,
      paymentMethod: bill.payment_method || 'N/A',
      branchName: bill.branch_name,
      branchLocation: bill.branch_location,
      branchPhone: bill.branch_phone,
      branchEmail: bill.branch_email,
      bookingDate: bill.check_in_date
    }
    downloadBill(billData, `Bill-${bill.booking_reference}.pdf`)
  }

  const handleSendEmail = async (bill: Bill) => {
    try {
      setSendingEmail(bill.id)
      const response = await fetch('/api/guest/bills/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId: bill.id })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send email')
      }

      alert(`Invoice sent successfully to ${bill.guest_email}`)
    } catch (err) {
      alert(`Error: ${(err as Error).message}`)
    } finally {
      setSendingEmail(null)
    }
  }

  const filteredBills = bills.filter(bill => {
    if (filter === 'all') return true
    if (filter === 'pending') return bill.payment_status === 'Pending'
    if (filter === 'paid') return bill.payment_status === 'Completed'
    return true
  })

  const getPaymentStatusColor = (status: string) => {
    if (status === 'Pending') return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    if (status === 'Completed') return 'bg-green-100 text-green-700 border-green-200'
    if (status === 'Failed') return 'bg-red-100 text-red-700 border-red-200'
    return 'bg-gray-100 text-gray-700 border-gray-200'
  }

  return (
    <div className="min-h-screen bg-gradient-to-t from-amber-700/40 to-amber-50 text-gray-800">
      <GuestNavbar />
      <main className="max-w-7xl mx-auto p-8">
        <header className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900">My Bills</h1>
          <p className="text-gray-600 mt-2">View detailed billing information and download invoices</p>
        </header>

        {/* Summary Cards */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Bills</CardTitle>
                <Receipt className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{summary.total_bills}</div>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-yellow-600">Pending</CardTitle>
                <DollarSign className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">${Number(summary.total_pending).toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">{summary.pending_count} bill(s)</p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Paid</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">${Number(summary.total_paid).toFixed(2)}</div>
                <p className="text-xs text-gray-500 mt-1">{summary.paid_count} bill(s)</p>
              </CardContent>
            </Card>

            <Card className="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  ${(Number(summary.total_pending) + Number(summary.total_paid)).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex space-x-2 border-b border-gray-200 mb-8">
          <button 
            onClick={() => setFilter('all')} 
            className={`px-4 py-2 font-semibold transition-colors ${filter === 'all' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500 hover:text-gray-800'}`}
          >
            All Bills
          </button>
          <button 
            onClick={() => setFilter('pending')} 
            className={`px-4 py-2 font-semibold transition-colors ${filter === 'pending' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Pending ({summary.pending_count})
          </button>
          <button 
            onClick={() => setFilter('paid')} 
            className={`px-4 py-2 font-semibold transition-colors ${filter === 'paid' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Paid ({summary.paid_count})
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error loading bills: {error}
          </div>
        )}

        {/* Bills List */}
        {!loading && !error && (
          <div className="space-y-6">
            {filteredBills.length > 0 ? (
              filteredBills.map(bill => (
                <Card key={bill.id} className="shadow-lg bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl font-bold text-gray-900">
                          {bill.booking_reference}
                        </CardTitle>
                        <div className="flex items-center text-sm text-gray-600 mt-2 space-x-4">
                          <div className="flex items-center">
                            <MapPin size={14} className="mr-1" />
                            {bill.branch_name}
                          </div>
                          <div className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {new Date(bill.check_in_date).toLocaleDateString()} - {new Date(bill.check_out_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPaymentStatusColor(bill.payment_status)}`}>
                          {bill.payment_status}
                        </span>
                        <div className="mt-2 text-sm text-gray-600">
                          {bill.room_type} - Room {bill.room_number}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Billing Breakdown */}
                    <div className="bg-gray-50/50 rounded-lg p-6 mb-4">
                      <h3 className="font-semibold text-gray-900 mb-4">Billing Breakdown</h3>
                      
                      <table className="w-full">
                        <tbody>
                          {/* Room Charges */}
                          <tr className="border-b border-gray-200">
                            <td className="py-2 text-gray-700">
                              Room Charges ({bill.breakdown.nights} night{bill.breakdown.nights > 1 ? 's' : ''} × ${bill.breakdown.base_price.toFixed(2)})
                            </td>
                            <td className="py-2 text-right font-medium text-gray-900">
                              ${bill.breakdown.room_charges.toFixed(2)}
                            </td>
                          </tr>

                          {/* Services */}
                          {bill.breakdown.services.length > 0 && (
                            <>
                              <tr>
                                <td colSpan={2} className="pt-4 pb-2 font-semibold text-gray-700">
                                  Services & Amenities:
                                </td>
                              </tr>
                              {bill.breakdown.services.map((service, idx) => (
                                <tr key={idx} className="border-b border-gray-200">
                                  <td className="py-2 text-gray-700">
                                    <div>{service.name}</div>
                                    {service.description && (
                                      <div className="text-xs text-gray-500">{service.description}</div>
                                    )}
                                  </td>
                                  <td className="py-2 text-right font-medium text-gray-900">
                                    ${service.price.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}

                          {/* Subtotal */}
                          <tr className="border-t-2 border-gray-300">
                            <td className="py-2 font-semibold text-gray-700">Subtotal</td>
                            <td className="py-2 text-right font-semibold text-gray-900">
                              ${bill.breakdown.subtotal.toFixed(2)}
                            </td>
                          </tr>

                          {/* Service Charge */}
                          <tr className="border-b border-gray-200">
                            <td className="py-2 text-gray-700">Service Charge (10%)</td>
                            <td className="py-2 text-right font-medium text-gray-900">
                              ${bill.breakdown.service_charge.toFixed(2)}
                            </td>
                          </tr>

                          {/* VAT */}
                          <tr className="border-b border-gray-300">
                            <td className="py-2 text-gray-700">VAT (12%)</td>
                            <td className="py-2 text-right font-medium text-gray-900">
                              ${bill.breakdown.vat.toFixed(2)}
                            </td>
                          </tr>

                          {/* Total */}
                          <tr className="border-t-2 border-gray-400">
                            <td className="py-3 font-bold text-lg text-gray-900">Total Amount</td>
                            <td className="py-3 text-right font-bold text-xl text-amber-600">
                              ${bill.breakdown.total.toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Payment Info */}
                    {bill.payment_method && (
                      <div className="flex items-center text-sm text-gray-600 mb-4">
                        <span className="font-medium mr-2">Payment Method:</span>
                        {bill.payment_method}
                        {bill.paid_at && (
                          <span className="ml-4">
                            <span className="font-medium mr-2">Paid on:</span>
                            {new Date(bill.paid_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <Button 
                        onClick={() => handleDownloadBill(bill)}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Invoice
                      </Button>
                      <Button 
                        onClick={() => handleSendEmail(bill)}
                        disabled={sendingEmail === bill.id}
                        variant="outline"
                        className="border-amber-500 text-amber-600 hover:bg-amber-50"
                      >
                        {sendingEmail === bill.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Email Invoice
                          </>
                        )}
                      </Button>
                      {bill.payment_status === 'Pending' && (
                        <Button variant="outline">
                          Pay Now
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-16">
                <Receipt className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <p className="text-gray-600">
                  {filter === 'all' 
                    ? 'No bills found.' 
                    : `No ${filter} bills found.`}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
