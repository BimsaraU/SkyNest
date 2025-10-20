'use client'

import { useState, useEffect } from 'react'
import StaffNavbar from '@/app/components/StaffNavbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, BedDouble, AlertCircle, Loader2, CheckCircle, Clock, Wrench } from 'lucide-react'

export default function StaffRoomsPage() {
  const [rooms, setRooms] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      // TODO: Replace with actual API call
      setRooms([
        { id: 1, roomNumber: '101', type: 'Deluxe', status: 'Available', floor: 1, lastCleaned: '2 hours ago' },
        { id: 2, roomNumber: '102', type: 'Suite', status: 'Occupied', floor: 1, guestName: 'John Doe', checkOut: '2025-10-20' },
        { id: 3, roomNumber: '103', type: 'Deluxe', status: 'Cleaning', floor: 1, lastCleaned: 'In progress' },
        { id: 4, roomNumber: '201', type: 'Ocean View', status: 'Maintenance', floor: 2, issue: 'AC Repair' },
        { id: 5, roomNumber: '202', type: 'Suite', status: 'Available', floor: 2, lastCleaned: '1 hour ago' },
        { id: 6, roomNumber: '203', type: 'Deluxe', status: 'Occupied', floor: 2, guestName: 'Jane Smith', checkOut: '2025-10-19' },
      ])
    } catch (error) {
      console.error('Failed to fetch rooms:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Available':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'Occupied':
        return <BedDouble className="w-5 h-5 text-blue-500" />
      case 'Cleaning':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'Maintenance':
        return <Wrench className="w-5 h-5 text-red-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: any = {
      'Available': 'bg-green-900/50 text-green-300 border-green-800',
      'Occupied': 'bg-blue-900/50 text-blue-300 border-blue-800',
      'Cleaning': 'bg-yellow-900/50 text-yellow-300 border-yellow-800',
      'Maintenance': 'bg-red-900/50 text-red-300 border-red-800'
    }
    return <Badge className={`${colors[status]} border`}>{status}</Badge>
  }

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.roomNumber.includes(searchTerm) || room.type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statusCounts = {
    total: rooms.length,
    available: rooms.filter(r => r.status === 'Available').length,
    occupied: rooms.filter(r => r.status === 'Occupied').length,
    cleaning: rooms.filter(r => r.status === 'Cleaning').length,
    maintenance: rooms.filter(r => r.status === 'Maintenance').length,
  }

  return (
    <div className="min-h-screen bg-[#10141c] text-gray-300">
      <StaffNavbar />
      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Room Status</h1>
            <p className="text-gray-400">Monitor and manage room availability and status</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card className="bg-[#181d28] border-gray-800">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{statusCounts.total}</p>
                  <p className="text-sm text-gray-400">Total Rooms</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#181d28] border-gray-800">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{statusCounts.available}</p>
                  <p className="text-sm text-gray-400">Available</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#181d28] border-gray-800">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{statusCounts.occupied}</p>
                  <p className="text-sm text-gray-400">Occupied</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#181d28] border-gray-800">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">{statusCounts.cleaning}</p>
                  <p className="text-sm text-gray-400">Cleaning</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#181d28] border-gray-800">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{statusCounts.maintenance}</p>
                  <p className="text-sm text-gray-400">Maintenance</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="bg-[#181d28] border-gray-800 mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <Input
                    placeholder="Search by room number or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[#10141c] border-gray-700 text-white"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48 bg-[#10141c] border-gray-700 text-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181d28] border-gray-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Occupied">Occupied</SelectItem>
                    <SelectItem value="Cleaning">Cleaning</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Rooms Grid */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRooms.map(room => (
                <Card key={room.id} className="bg-[#181d28] border-gray-800 hover:border-gray-700 transition-colors">
                  <CardHeader className="border-b border-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(room.status)}
                        <div>
                          <CardTitle className="text-xl text-white">Room {room.roomNumber}</CardTitle>
                          <p className="text-sm text-gray-400">Floor {room.floor} • {room.type}</p>
                        </div>
                      </div>
                      {getStatusBadge(room.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-3">
                    {room.status === 'Occupied' && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">Guest</p>
                          <p className="text-sm text-white">{room.guestName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Check-out</p>
                          <p className="text-sm text-white">{room.checkOut}</p>
                        </div>
                      </>
                    )}
                    {room.status === 'Maintenance' && (
                      <div>
                        <p className="text-xs text-gray-500">Issue</p>
                        <p className="text-sm text-white">{room.issue}</p>
                      </div>
                    )}
                    {(room.status === 'Available' || room.status === 'Cleaning') && (
                      <div>
                        <p className="text-xs text-gray-500">Last Cleaned</p>
                        <p className="text-sm text-white">{room.lastCleaned}</p>
                      </div>
                    )}
                    <Button className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white">
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {filteredRooms.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No rooms found matching your criteria</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
