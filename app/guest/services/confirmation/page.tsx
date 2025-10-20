// app/guest/services/confirmation/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import GuestNavbar from '@/app/components/GuestNavbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, Users, Info, HelpCircle, CheckCircle } from 'lucide-react'
import gsap from 'gsap'

export default function ServiceConfirmationPage() {
  const [showSuccess, setShowSuccess] = useState(false)
  useEffect(() => {
    gsap.fromTo("#success-message", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, delay: 0.2 });
  }, [])

  const serviceRequest = {
    id: 'SR-2025-001',
    service: { name: 'Spa Treatment', description: 'Relaxing massages and wellness' },
    details: { date: '2025-10-15', time: '2:00 PM', location: 'Spa Venue', numberOfPeople: 2 },
    guest: { name: 'Rashmika Nawanjana' },
  }

  return (
    <div className="min-h-screen bg-gradient-to-t from-amber-700/30 to-amber-50">
      <GuestNavbar />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div id="success-message" className="text-center mb-12 opacity-0">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
             <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3 font-l">Service Request Submitted!</h1>
          <p className="text-xl text-gray-600 mb-2">Thank you, {serviceRequest.guest.name}! We've received your request.</p>
          <p className="text-gray-600">Request ID: <span className="font-semibold text-amber-700">{serviceRequest.id}</span></p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <Link href="/guest/services/my-requests" passHref><Button>View My Requests</Button></Link>
          <Link href="/guest/services" passHref><Button variant="secondary">Browse More Services</Button></Link>
        </div>

        <Card className="shadow-lg bg-white/60 backdrop-blur-xl border-white/20 rounded-xl">
          <CardHeader className="bg-white/50 rounded-t-xl">
             <CardTitle className="text-2xl font-bold text-gray-900">{serviceRequest.service.name}</CardTitle>
             <p className="text-gray-600">{serviceRequest.service.description}</p>
          </CardHeader>
          <CardContent className="p-6">
             <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-3"><Calendar className="text-amber-700"/><p><strong>Date:</strong> {serviceRequest.details.date}</p></div>
                <div className="flex items-center space-x-3"><Clock className="text-amber-700"/><p><strong>Time:</strong> {serviceRequest.details.time}</p></div>
                <div className="flex items-center space-x-3"><MapPin className="text-amber-700"/><p><strong>Location:</strong> {serviceRequest.details.location}</p></div>
                <div className="flex items-center space-x-3"><Users className="text-amber-700"/><p><strong>Guests:</strong> {serviceRequest.details.numberOfPeople}</p></div>
             </div>
          </CardContent>
        </Card>

        <Card className="mt-6 shadow-lg bg-white/60 backdrop-blur-xl border-white/20 rounded-xl">
            <CardHeader><CardTitle className="text-xl font-bold text-gray-900">What Happens Next?</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <p className="text-gray-700">Our team will review your request and you'll receive a confirmation via your preferred contact method shortly. You can track the status of all your requests in the "My Requests" section.</p>
                <Link href="/guest/help" className="flex items-center text-amber-600 hover:underline"><HelpCircle size={16} className="mr-2"/><span>Need help? Contact support</span></Link>
            </CardContent>
        </Card>
      </main>
    </div>
  )
}
