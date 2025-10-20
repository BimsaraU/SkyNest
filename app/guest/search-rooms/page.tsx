// app/guest/search-rooms/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import GuestNavbar from '@/app/components/GuestNavbar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { 
  BedDouble, Users, Star, ArrowRight, Loader2,
  Wifi, Tv, Snowflake, ParkingCircle, Waves, Dumbbell,
  Sparkles, UtensilsCrossed, Wine, Bell, Shirt, Lock,
  Coffee, Home, Mountain, Bath, ShowerHead, Wind,
  Phone, PenTool, Sofa, ShoppingBag, Sun, Shield,
  CheckCircle2, XCircle, AlertCircle
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
  }
  return iconMap[iconName?.toLowerCase()] || Home
}

// Helper function to get local date in YYYY-MM-DD format without timezone issues
const getTodayDateString = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface Room {
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
  availableCount?: number;
  availability?: {
    available: boolean;
    status: 'available' | 'booked' | 'maintenance';
  };
}

export default function SearchRoomsPage() {
  const [priceRange, setPriceRange] = useState([50, 300000])
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [branches, setBranches] = useState<any[]>([])
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([])
  const [availableAmenities, setAvailableAmenities] = useState<any[]>([])
  const [sortBy, setSortBy] = useState('recommended')
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [guests, setGuests] = useState(2)
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  useEffect(() => {
    fetchRooms()
    fetchAmenities()
    fetchBranches()
  }, [])

  // Check availability when dates change
  useEffect(() => {
    if (checkInDate && checkOutDate && rooms.length > 0) {
      checkRoomsAvailability()
    }
  }, [checkInDate, checkOutDate, rooms.length])

  // Refetch rooms when filters change
  useEffect(() => {
    fetchRooms()
  }, [priceRange, selectedAmenities, selectedBranch, sortBy])

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches')
      const data = await response.json()
      setBranches(data.branches || [])
    } catch (error) {
      console.error('[FRONTEND] Error fetching branches:', error)
    }
  }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  const fetchAmenities = async () => {
    try {
      console.log('[FRONTEND] Fetching amenities...')
      const response = await fetch('/api/amenities')
      console.log('[FRONTEND] Amenities response status:', response.status)
      const data = await response.json()
      console.log('[FRONTEND] Amenities data:', data)
      if (data.amenities) {
        setAvailableAmenities(data.amenities)
        console.log('[FRONTEND] Set amenities count:', data.amenities.length)
      } else {
        console.error('[FRONTEND] No amenities in response:', data)
      }
    } catch (error) {
      console.error('[FRONTEND] Error fetching amenities:', error)
    }
  }

  const fetchRooms = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const params = new URLSearchParams()
      if (priceRange[0] > 0) params.append('minPrice', priceRange[0].toString())
      if (priceRange[1] < 500000) params.append('maxPrice', priceRange[1].toString())
      if (selectedBranch) params.append('branchId', selectedBranch)
      if (checkInDate) params.append('checkIn', checkInDate)
      if (checkOutDate) params.append('checkOut', checkOutDate)
      if (guests > 0) params.append('guests', guests.toString())
      if (selectedAmenities.length > 0) {
        params.append('amenities', selectedAmenities.join(','))
      }
      
      console.log('[FRONTEND] Fetching rooms with params:', params.toString())
      const response = await fetch(`/api/rooms?${params.toString()}`)
      console.log('[FRONTEND] Rooms response status:', response.status)
      const data = await response.json()
      console.log('[FRONTEND] Rooms data:', data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch rooms')
      }
      
      setRooms(data.rooms || [])
      console.log('[FRONTEND] Set rooms count:', data.rooms?.length || 0)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load rooms'
      console.error('[FRONTEND] Error fetching rooms:', err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const checkRoomsAvailability = async () => {
    if (!checkInDate || !checkOutDate) return
    
    setCheckingAvailability(true)
    
    try {
      // Check availability for all rooms
      const updatedRooms = await Promise.all(
        rooms.map(async (room) => {
          try {
            const response = await fetch('/api/guest/rooms/check-availability', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                room_id: room.id,
                check_in_date: checkInDate,
                check_out_date: checkOutDate
              })
            })
            
            const data = await response.json()
            
            const status: 'available' | 'booked' | 'maintenance' = data.available ? 'available' : 
                       data.reason?.includes('maintenance') ? 'maintenance' : 'booked'
            
            return {
              ...room,
              availability: {
                available: data.available,
                status: status
              }
            }
          } catch (error) {
            console.error(`Error checking availability for room ${room.id}:`, error)
            return room
          }
        })
      )
      
      setRooms(updatedRooms)
    } catch (error) {
      console.error('Error checking availability:', error)
    } finally {
      setCheckingAvailability(false)
    }
  }

  const handleApplyFilters = () => {
    fetchRooms()
  }

  const toggleAmenity = (amenityId: number) => {
    setSelectedAmenities(prev => 
      prev.includes(amenityId)
        ? prev.filter(id => id !== amenityId)
        : [...prev, amenityId]
    )
  }

  const getSortedRooms = () => {
    const sortedRooms = [...rooms]
    switch (sortBy) {
      case 'price-asc':
        return sortedRooms.sort((a, b) => a.basePrice - b.basePrice)
      case 'price-desc':
        return sortedRooms.sort((a, b) => b.basePrice - a.basePrice)
      default:
        return sortedRooms.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-t from-amber-700/30 to-amber-50 text-gray-800">
      <GuestNavbar />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-28">
              <Card className="shadow-lg bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-gray-900 font-l">Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <Label className="text-sm font-semibold text-gray-700 block mb-2">Branch Location</Label>
                        <Select value={selectedBranch || 'all'} onValueChange={(value) => setSelectedBranch(value === 'all' ? '' : value)}>
                          <SelectTrigger className="w-full bg-white border-gray-300">
                            <SelectValue placeholder="All Branches" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Branches</SelectItem>
                            {branches.map(branch => (
                              <SelectItem key={branch.id} value={branch.id.toString()}>
                                {branch.name} - {branch.location}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-sm font-semibold text-gray-700 block mb-2">Check-in Date</Label>
                        <input 
                          type="date" 
                          value={checkInDate}
                          onChange={(e) => setCheckInDate(e.target.value)}
                          min={getTodayDateString()}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <Label className="text-sm font-semibold text-gray-700 block mb-2">Check-out Date</Label>
                        <input 
                          type="date" 
                          value={checkOutDate}
                          onChange={(e) => setCheckOutDate(e.target.value)}
                          min={checkInDate || getTodayDateString()}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <Label className="text-sm font-semibold text-gray-700 block mb-2">Number of Guests</Label>
                        <Select value={guests.toString()} onValueChange={(value) => setGuests(parseInt(value))}>
                          <SelectTrigger className="w-full bg-white border-gray-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6].map(num => (
                              <SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'Guest' : 'Guests'}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label className="text-sm font-semibold text-gray-700">Price Range (per night)</Label>
                        </div>
                        <Slider 
                          defaultValue={[50, 1000]} 
                          max={1000} 
                          step={10} 
                          value={priceRange}
                          onValueChange={(value) => setPriceRange(value)} 
                        />
                        <div className="flex justify-between text-xs text-gray-600 mt-2">
                            <span>{formatPrice(priceRange[0])}</span>
                            <span>{formatPrice(priceRange[1])}</span>
                        </div>
                    </div>
                     <div>
                        <Label className="text-sm font-semibold text-gray-700 block mb-2">Amenities</Label>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {availableAmenities.length > 0 ? (
                            availableAmenities.map((amenity) => {
                              const IconComponent = getAmenityIcon(amenity.icon_name)
                              return (
                                <div key={amenity.id} className="flex items-center space-x-2">
                                  <Checkbox 
                                    id={`amenity-${amenity.id}`}
                                    checked={selectedAmenities.includes(amenity.id)}
                                    onCheckedChange={() => toggleAmenity(amenity.id)}
                                  />
                                  <Label 
                                    htmlFor={`amenity-${amenity.id}`} 
                                    className="text-sm cursor-pointer flex items-center gap-2"
                                  >
                                    <IconComponent size={16} className="text-amber-600" />
                                    {amenity.name}
                                  </Label>
                                </div>
                              )
                            })
                          ) : (
                            <p className="text-xs text-gray-500">Loading amenities...</p>
                          )}
                        </div>
                    </div>
                    <div>
                      <Button className="w-full font-bold" onClick={handleApplyFilters} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Apply Filters
                      </Button>
                    </div>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Room Results */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 font-l">Available Rooms</h1>
                <p className="text-gray-600">{rooms.length} rooms found</p>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] bg-white/50 border-gray-300">
                    <SelectValue placeholder="Sort by: Recommended" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="recommended">Recommended</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {error && (
              <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-4">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : (
              <div className="space-y-6">
                {getSortedRooms().map(room => (
                  <Card key={room.id} className="shadow-lg bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden group">
                    <div className="flex">
                        <div className="w-1/3 ml-5 relative overflow-hidden h-64">
                          {room.images && room.images.length > 0 ? (
                            <Image 
                              src={room.images[0].url} 
                              alt={room.name} 
                              fill 
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 flex flex-col items-center justify-center">
                              <Home className="w-12 h-12 text-amber-600 mb-2" />
                              <span className="text-amber-800 font-semibold">Sky Nest Hotels</span>
                              <span className="text-amber-600 text-sm">Image Coming Soon</span>
                            </div>
                          )}
                        </div>
                        <div className="w-2/3">
                          <CardHeader>
                              <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <CardTitle className="text-xl font-bold text-gray-900">{room.name}</CardTitle>
                                        {checkInDate && checkOutDate && room.availability && (
                                          <Badge 
                                            variant={room.availability.available ? "default" : "destructive"}
                                            className={`${
                                              room.availability.status === 'available' 
                                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                                : room.availability.status === 'maintenance'
                                                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                                            } flex items-center gap-1`}
                                          >
                                            {room.availability.status === 'available' && <CheckCircle2 size={12} />}
                                            {room.availability.status === 'booked' && <XCircle size={12} />}
                                            {room.availability.status === 'maintenance' && <AlertCircle size={12} />}
                                            {room.availability.status === 'available' ? 'Available' : 
                                             room.availability.status === 'maintenance' ? 'Maintenance' : 'Booked'}
                                          </Badge>
                                        )}
                                      </div>
                                      <CardDescription>{room.branch.name} - {room.branch.location}</CardDescription>
                                  </div>
                                  {room.isFeatured && (
                                    <div className="flex items-center space-x-1 text-amber-600 font-bold">
                                        <Star size={16} className="fill-current" /><span>Featured</span>
                                    </div>
                                  )}
                              </div>
                          </CardHeader>
                          <CardContent>
                              <div className="text-sm text-gray-600 flex space-x-4 mb-4">
                                  <span className="flex items-center"><Users size={14} className="mr-1.5"/> Up to {room.maxOccupancy} guests</span>
                                  <span className="flex items-center"><BedDouble size={14} className="mr-1.5"/> {room.numberOfBeds} × {room.bedType}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-4">
                                {room.amenities.slice(0, 3).map(amenity => {
                                  const IconComponent = getAmenityIcon(amenity.icon_name)
                                  return (
                                    <span key={amenity.id} className="px-2 py-1 bg-amber-100/50 text-amber-800 text-xs rounded-full flex items-center gap-1">
                                      <IconComponent size={12} />
                                      {amenity.name}
                                    </span>
                                  )
                                })}
                                {room.amenities.length > 3 && (
                                  <span className="px-2 py-1 bg-gray-100/50 text-gray-600 text-xs rounded-full">
                                    +{room.amenities.length - 3} more
                                  </span>
                                )}
                              </div>
                              <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">
                                      {formatPrice(room.basePrice)}
                                      <span className="text-sm font-normal text-gray-600">/night</span>
                                    </p>
                                    {checkInDate && checkOutDate && (() => {
                                      const nights = Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24))
                                      const total = room.basePrice * nights
                                      return nights > 0 ? (
                                        <p className="text-sm text-amber-700 font-semibold">
                                          Total: {formatPrice(total)} ({nights} {nights === 1 ? 'night' : 'nights'})
                                        </p>
                                      ) : null
                                    })()}
                                    {room.availableCount !== undefined && (
                                      <p className="text-xs text-gray-500">{room.availableCount} rooms available</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                  <Link href={`/guest/room-details/${room.id}`} passHref>
                                      <Button variant="outline" className="font-bold border-amber-600 text-amber-700 hover:bg-amber-50">
                                          View Details
                                      </Button>
                                  </Link>
                                  {checkInDate && checkOutDate ? (
                                    <Link href={`/guest/booking/create?roomId=${room.id}&checkIn=${checkInDate}&checkOut=${checkOutDate}&guests=${guests}`} passHref>
                                        <Button 
                                          className={`font-bold ${
                                            room.availability?.available 
                                              ? 'group-hover:bg-amber-600' 
                                              : 'opacity-75'
                                          }`}
                                          disabled={checkingAvailability}
                                        >
                                            {checkingAvailability ? (
                                              <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Checking...
                                              </>
                                            ) : (
                                              <>
                                                {room.availability?.available ? 'Book Now' : 'Check Availability'} 
                                                <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform"/>
                                              </>
                                            )}
                                        </Button>
                                    </Link>
                                  ) : (
                                    <Button variant="outline" disabled className="font-bold">
                                      Select Dates to Book
                                    </Button>
                                  )}
                                </div>
                              </div>
                          </CardContent>
                        </div>
                    </div>
                  </Card>
                ))}
                {!isLoading && rooms.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg">No rooms found matching your criteria.</p>
                    <p className="text-sm mt-2">Try adjusting your filters.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

