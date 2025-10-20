// app/guest/room-details/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import GuestNavbar from '@/app/components/GuestNavbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  Star, MapPin, BedDouble, Users, Ruler, Wifi, Wind, Tv, Utensils, Bath, Shield, Clock, Info, Loader2,
  Snowflake, ParkingCircle, Waves, Dumbbell, Sparkles, UtensilsCrossed, Wine, Bell, Shirt, Lock,
  Coffee, Home, Mountain, ShowerHead, Phone, PenTool, Sofa, ShoppingBag, Sun, AlertTriangle
} from 'lucide-react'
import CustomDatePicker2 from '@/app/components/CustomDatePicker2'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Map icon names from database to Lucide React components
const getAmenityIcon = (iconName: string) => {
  const iconMap: Record<string, any> = {
    'wifi': Wifi,
    'tv': Tv,
    'snowflake': Snowflake,
    'parking': ParkingCircle,
    'waves': Waves,
    'dumbbell': Dumbbell,
    'sparkles': Sparkles,
    'utensils': UtensilsCrossed,
    'wine': Wine,
    'bell': Bell,
    'shirt': Shirt,
    'lock': Lock,
    'coffee': Coffee,
    'home': Home,
    'mountain': Mountain,
    'bath': Bath,
    'shower': ShowerHead,
    'wind': Wind,
    'phone': Phone,
    'pen': PenTool,
    'sofa': Sofa,
    'shopping-bag': ShoppingBag,
    'shield': Shield,
    'sun': Sun,
    'briefcase': Shield,
    'spa': Sparkles,
  }
  return iconMap[iconName?.toLowerCase()] || Home
}

interface RoomDetails {
  id: number;
  name: string;
  description: string;
  basePrice: number;
  maxOccupancy: number;
  bedType: string;
  numberOfBeds: number;
  roomSize: number;
  viewType: string;
  isFeatured: boolean;
  branch: {
    id: number;
    name: string;
    location: string;
    phone: string;
    email: string;
  };
  images: Array<{
    id: number;
    url: string;
    caption: string;
    displayOrder: number;
  }>;
  amenities: Array<{
    id: number;
    name: string;
    icon_name: string;
  }>;
  amenitiesByCategory: Record<string, any[]>;
  availableRooms: number;
}

export default function RoomDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = params.id

  const [selectedImage, setSelectedImage] = useState(0)
  const [checkIn, setCheckIn] = useState<Date | undefined>()
  const [checkOut, setCheckOut] = useState<Date | undefined>()
  const [guests, setGuests] = useState(2)
  const [room, setRoom] = useState<RoomDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (roomId) {
      fetchRoomDetails()
    }
    
    // Initialize from URL params if coming from booking page
    const checkInParam = searchParams.get('checkIn')
    const checkOutParam = searchParams.get('checkOut')
    const guestsParam = searchParams.get('guests')
    
    if (checkInParam) setCheckIn(new Date(checkInParam))
    if (checkOutParam) setCheckOut(new Date(checkOutParam))
    if (guestsParam) setGuests(parseInt(guestsParam))
  }, [roomId, searchParams])

  const fetchRoomDetails = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/rooms/${roomId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch room details')
      }
      
      setRoom(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load room details'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0
    const diff = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 0
  }

  const nights = calculateNights()
  const subtotal = room ? nights * room.basePrice : 0
  const serviceFee = Math.round(subtotal * 0.1 * 100) / 100
  const totalPrice = subtotal + serviceFee

  const handleReserveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault() // Prevent form submission
    
    if (!checkIn || !checkOut) {
      alert('Please select check-in and check-out dates')
      return
    }
    
    // Redirect to booking create page with URL parameters
    const params = new URLSearchParams({
      roomId: roomId as string,
      checkIn: checkIn.toISOString().split('T')[0],
      checkOut: checkOut.toISOString().split('T')[0],
      guests: guests.toString()
    })
    
    router.push(`/guest/booking/create?${params.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-t from-amber-700/30 to-amber-50">
        <GuestNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-amber-600" />
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-t from-amber-700/30 to-amber-50">
        <GuestNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="p-8 text-center">
            <p className="text-red-600 mb-4">{error || 'Room not found'}</p>
            <Link href="/guest/search-rooms">
              <Button>Back to Search</Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-t from-amber-700/30 to-amber-50">
      <GuestNavbar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Room Title */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 font-l">{room.name}</h1>
          <div className="flex items-center space-x-4 text-gray-600">
            {room.isFeatured && (
              <span className="flex items-center"><Star size={16} className="text-amber-500 mr-1.5 fill-current"/> Featured</span>
            )}
            <span className="flex items-center"><MapPin size={16} className="text-gray-500 mr-1.5"/> {room.branch.name} - {room.branch.location}</span>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="grid grid-cols-4 grid-rows-2 gap-2 mb-8 h-[500px]">
          {room.images && room.images.length > 0 ? (
            <>
              <div className="col-span-2 row-span-2 rounded-l-xl overflow-hidden">
                <Image src={room.images[0]?.url || ''} alt={room.name} width={800} height={800} className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-300"/>
              </div>
              {room.images.slice(1, 5).map((img, idx) => (
                <div key={img.id} className={`overflow-hidden ${idx === 1 ? 'rounded-tr-xl' : ''} ${idx === 3 ? 'rounded-br-xl' : ''}`}>
                  <Image src={img.url} alt={`${room.name} ${idx + 2}`} width={400} height={400} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"/>
                </div>
              ))}
            </>
          ) : (
            <div className="col-span-4 row-span-2 bg-gradient-to-br from-amber-100 via-amber-50 to-amber-200 rounded-xl flex flex-col items-center justify-center">
              <Home className="w-20 h-20 text-amber-600 mb-4" />
              <h3 className="text-2xl font-bold text-amber-900 mb-2">Sky Nest Hotels</h3>
              <p className="text-amber-700 text-lg">Gallery images coming soon</p>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-lg bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl">
              <CardHeader><CardTitle className="text-2xl font-bold text-gray-900 font-l">Room Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 mb-6 text-center">
                  <div className="p-4 bg-amber-50/50 rounded-lg"><Ruler className="mx-auto mb-1 text-amber-700"/><p className="font-semibold text-gray-900">{room.roomSize} sqm</p></div>
                  <div className="p-4 bg-amber-50/50 rounded-lg"><BedDouble className="mx-auto mb-1 text-amber-700"/><p className="font-semibold text-gray-900">{room.numberOfBeds} × {room.bedType}</p></div>
                  <div className="p-4 bg-amber-50/50 rounded-lg"><Users className="mx-auto mb-1 text-amber-700"/><p className="font-semibold text-gray-900">Up to {room.maxOccupancy} guests</p></div>
                </div>
                <p className="text-gray-700 leading-relaxed font-l">{room.description}</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl">
              <CardHeader><CardTitle className="text-2xl font-bold text-gray-900 font-l">Amenities</CardTitle></CardHeader>
              <CardContent>
                {Object.entries(room.amenitiesByCategory).map(([category, amenities]) => (
                  <div key={category} className="mb-6 last:mb-0">
                    <h4 className="font-semibold text-gray-900 mb-3">{category}</h4>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {amenities.map((amenity: any) => {
                        const IconComponent = getAmenityIcon(amenity.icon_name)
                        return (
                          <div key={amenity.id} className="flex items-center space-x-3">
                            <IconComponent size={20} className="text-amber-700 flex-shrink-0" />
                            <span className="text-gray-700">{amenity.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-lg bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl">
              <CardHeader><CardTitle className="text-2xl font-bold text-gray-900 font-l">Hotel Policies</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                    <Clock size={20} className="text-gray-500 mt-1 flex-shrink-0"/>
                    <div>
                        <h4 className="font-semibold text-gray-800">Check-in & Check-out</h4>
                        <p className="text-gray-600">Check-in: 2:00 PM | Check-out: 12:00 PM</p>
                    </div>
                </div>
                 <div className="flex items-start space-x-3">
                    <Info size={20} className="text-gray-500 mt-1 flex-shrink-0"/>
                    <div>
                        <h4 className="font-semibold text-gray-800">Cancellation Policy</h4>
                        <p className="text-gray-600">Free cancellation up to 5 days before check-in. Cancellations within 1-4 days incur a 1-night charge.</p>
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-xl border border-white/30 rounded-xl shadow-xl p-6 sticky top-24">
              <div className="mb-6">
                <div className="flex items-baseline space-x-2 mb-1">
                  <span className="text-3xl font-bold text-gray-900">${room.basePrice}</span>
                  <span className="text-gray-600">/ night</span>
                </div>
              </div>

              {room.availableRooms <= 5 && (
                <div className="mb-4 p-3 bg-red-100/50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Only {room.availableRooms} room{room.availableRooms === 1 ? '' : 's'} left!
                  </p>
                </div>
              )}

              <form className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Check-in</Label>
                  <CustomDatePicker2 
                    value={checkIn} 
                    onChange={(date) => {
                      setCheckIn(date)
                      // If check-out is before new check-in, reset check-out
                      if (date && checkOut && checkOut <= date) {
                        setCheckOut(undefined)
                      }
                    }} 
                    placeholder="Select check-in date" 
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Check-out</Label>
                  <CustomDatePicker2 
                    value={checkOut} 
                    onChange={setCheckOut} 
                    placeholder="Select check-out date"
                    minDate={checkIn ? new Date(checkIn.getTime() + 86400000) : undefined}
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Guests</Label>
                  <Select value={guests.toString()} onValueChange={(value) => setGuests(Number(value))}>
                    <SelectTrigger className="w-full px-4 py-3 border border-gray-300 bg-white/50 focus:ring-2 focus:ring-amber-500">
                      <SelectValue placeholder="Select number of guests" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...Array(room.maxOccupancy)].map((_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1} guest{i > 0 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {nights > 0 && (
                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex justify-between text-gray-700"><span>${room.basePrice} × {nights} night{nights > 1 ? 's' : ''}</span><span>${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-gray-700"><span>Service fee (10%)</span><span>${serviceFee.toFixed(2)}</span></div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-lg text-gray-900"><span>Total</span><span>${totalPrice.toFixed(2)}</span></div>
                  </div>
                )}

                <Button 
                  type="button" 
                  size="lg" 
                  className="w-full font-bold bg-amber-600 hover:bg-amber-700" 
                  onClick={handleReserveClick} 
                  disabled={!checkIn || !checkOut || nights === 0}
                >
                  Reserve Now
                </Button>
                <p className="text-center text-sm text-gray-500">Complete booking on next page</p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
