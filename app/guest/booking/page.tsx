// app/guest/booking/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GuestNavbar from '@/app/components/GuestNavbar'
import { Loader2 } from 'lucide-react'

export default function GuestBookingPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect directly to search rooms page
    router.push('/guest/search-rooms')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-t from-amber-100/50 to-amber-50">
      <GuestNavbar />
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
      </div>
    </div>
  )
}
