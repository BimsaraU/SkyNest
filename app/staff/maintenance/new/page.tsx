// app/staff/maintenance/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import StaffNavbar from '@/app/components/StaffNavbar'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Wrench, 
  ArrowLeft, 
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Room {
  id: number
  room_number: string
  room_type: string
  branch_name: string
  status: string
}

export default function NewMaintenanceRequestPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    room_id: '',
    issue_description: '',
    priority: 'Normal' as 'Low' | 'Normal' | 'High' | 'Urgent'
  })

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      setLoadingRooms(true)
      const response = await fetch('/api/staff/rooms')
      if (!response.ok) throw new Error('Failed to fetch rooms')
      const data = await response.json()
      setRooms(data.rooms || [])
    } catch (err) {
      console.error('Error fetching rooms:', err)
      setError('Failed to load rooms')
    } finally {
      setLoadingRooms(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.room_id || !formData.issue_description.trim()) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/staff/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/staff/maintenance')
      }, 2000)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const selectedRoom = rooms.find(r => r.id === parseInt(formData.room_id))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <StaffNavbar />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mb-4 border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            <Wrench className="w-8 h-8 text-amber-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Submit Maintenance Request</h1>
              <p className="text-slate-400 mt-1">Report an issue that needs attention</p>
            </div>
          </div>
        </div>

        {success && (
          <Card className="mb-6 bg-green-900/30 border-green-500/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-400">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <p className="font-semibold">Request submitted successfully!</p>
                  <p className="text-sm text-green-300">Pending admin approval...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="mb-6 bg-red-900/30 border-red-500/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="w-6 h-6" />
                <p>{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Room Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Room <span className="text-red-400">*</span>
                </label>
                {loadingRooms ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading rooms...</span>
                  </div>
                ) : (
                  <select
                    value={formData.room_id}
                    onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a room</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        Room {room.room_number} - {room.room_type} ({room.branch_name}) - {room.status}
                      </option>
                    ))}
                  </select>
                )}
                {selectedRoom && (
                  <p className="mt-2 text-sm text-slate-400">
                    Branch: {selectedRoom.branch_name} | Type: {selectedRoom.room_type} | Status: {selectedRoom.status}
                  </p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Priority <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {(['Low', 'Normal', 'High', 'Urgent'] as const).map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority })}
                      className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                        formData.priority === priority
                          ? priority === 'Urgent'
                            ? 'border-red-500 bg-red-500/20 text-red-400'
                            : priority === 'High'
                            ? 'border-orange-500 bg-orange-500/20 text-orange-400'
                            : priority === 'Normal'
                            ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                            : 'border-slate-500 bg-slate-500/20 text-slate-400'
                          : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>

              {/* Issue Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Issue Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.issue_description}
                  onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  placeholder="Describe the maintenance issue in detail..."
                  required
                />
                <p className="mt-2 text-sm text-slate-400">
                  {formData.issue_description.length}/500 characters
                </p>
              </div>

              {/* Info Notice */}
              <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-300">
                    <p className="font-semibold mb-1">Approval Required</p>
                    <p>
                      Your maintenance request will be sent to the admin for approval. 
                      Once approved, it will be assigned to a maintenance staff member.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={loading || loadingRooms}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Wrench className="w-4 h-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
