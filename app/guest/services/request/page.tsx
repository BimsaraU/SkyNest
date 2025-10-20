// app/guest/services/request/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import GuestNavbar from '@/app/components/GuestNavbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import LoadingScreen from '@/app/components/LoadingScreen'

// Mock Data
const services = [
    { id: '1', name: 'Room Service', requiresTime: true, requiresPeople: true },
    { id: '2', name: 'Spa Treatment', requiresTime: true, requiresPeople: true },
    { id: '3', name: 'Airport Transfer', requiresTime: true, requiresPeople: true },
];
const myBookings = [
    { id: 'BK-2025-12345', room: 'Deluxe Ocean View Suite', branch: 'Sky Nest Galle' },
    { id: 'BK-2025-12344', room: 'Presidential Suite', branch: 'Sky Nest Colombo' }
];

export default function ServiceRequestPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('serviceId')

  const [formData, setFormData] = useState({
    serviceId: serviceId || '', bookingId: '', date: '', time: '',
    location: 'room', roomNumber: '', numberOfPeople: 1, specialRequests: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const selectedService = services.find(s => s.id === formData.serviceId)

  const validateForm = () => {
    // Basic validation logic
    if (!formData.serviceId || !formData.date) {
        setErrors({ general: 'Please fill in all required fields.' });
        return false;
    }
    return true;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      router.push('/guest/services/confirmation?requestId=SR-2025-001')
    } catch (err) {
      setErrors({ general: 'Failed to submit request. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field] || errors.general) setErrors({})
  }
  
  if(isSubmitting) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-gradient-to-t from-amber-100/50 to-amber-50 text-gray-800">
      <GuestNavbar />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 font-l">Request a Service</h1>
          <p className="text-gray-600">Fill out the form below and we'll process your request promptly.</p>
        </header>

        {errors.general && <div className="mb-6 p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg">{errors.general}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="shadow-lg bg-white/60 backdrop-blur-xl border-white/20 rounded-xl">
            <CardHeader><CardTitle className="font-l">Service Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="serviceId">Select Service *</Label>
                <Select value={formData.serviceId} onValueChange={(value) => handleInputChange('serviceId', value)}>
                    <SelectTrigger id="serviceId"><SelectValue placeholder="Choose a service..." /></SelectTrigger>
                    <SelectContent>{services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="bookingId">Link to Booking (Optional)</Label>
                <Select value={formData.bookingId} onValueChange={(value) => handleInputChange('bookingId', value)}>
                    <SelectTrigger id="bookingId"><SelectValue placeholder="Not linked to a booking" /></SelectTrigger>
                    <SelectContent>{myBookings.map(b => <SelectItem key={b.id} value={b.id}>{b.id} - {b.room}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg bg-white/60 backdrop-blur-xl border-white/20 rounded-xl">
            <CardHeader><CardTitle className="font-l">Scheduling</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} />
              </div>
              {selectedService?.requiresTime && <div>
                <Label htmlFor="time">Preferred Time *</Label>
                <Input id="time" type="time" value={formData.time} onChange={(e) => handleInputChange('time', e.target.value)} />
              </div>}
            </CardContent>
          </Card>

           <Card className="shadow-lg bg-white/60 backdrop-blur-xl border-white/20 rounded-xl">
            <CardHeader><CardTitle className="font-l">Additional Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
               {selectedService?.requiresPeople && <div>
                  <Label>Number of People</Label>
                  <Select value={String(formData.numberOfPeople)} onValueChange={(val) => handleInputChange('numberOfPeople', Number(val))}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n} {n > 1 ? 'people' : 'person'}</SelectItem>)}</SelectContent>
                  </Select>
               </div>}
               <div>
                  <Label>Special Requests (Optional)</Label>
                  <Textarea value={formData.specialRequests} onChange={(e) => handleInputChange('specialRequests', e.target.value)} placeholder="e.g., Dietary restrictions, allergies..."/>
               </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg bg-white/60 backdrop-blur-xl border-white/20 rounded-xl">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3 mb-6">
                <Checkbox id="terms" required className="mt-1" />
                <Label htmlFor="terms" className="text-sm">I understand that service availability is subject to confirmation and charges may apply.</Label>
              </div>
              <Button type="submit" size="lg" className="w-full font-bold text-base">Submit Service Request</Button>
            </CardContent>
          </Card>
        </form>
      </main>
    </div>
  )
}
