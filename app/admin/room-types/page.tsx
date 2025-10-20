'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X, Save, Loader2, DollarSign, Users, Bed, Square, Image as ImageIcon, Link2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface RoomType {
  id: number
  name: string
  description: string | null
  base_price: number
  capacity: number
  bed_type: string | null
  size_sqm: number | null
  amenities: string[] | null
  images: string[] | null
  status: 'active' | 'inactive' | 'archived'
  created_at: string
}

interface Amenity {
  id: number
  name: string
  description: string
  icon_name: string
}

interface RoomImage {
  url: string
  caption: string
  displayOrder: number
}

const CustomToast = ({ message, type }: { message: string, type: 'success' | 'error' | 'info' }) => (
  <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
    type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  } text-white animate-slide-in-right`}>
    {message}
  </div>
)

export default function RoomTypesPage() {
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price: '',
    capacity: '',
    bed_type: '',
    size_sqm: '',
    status: 'active' as 'active' | 'inactive' | 'archived',
    selectedAmenities: [] as number[],
    images: [] as RoomImage[]
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [roomTypesRes, amenitiesRes] = await Promise.all([
        fetch('/api/admin/room-types'),
        fetch('/api/admin/amenities')
      ])

      if (roomTypesRes.ok) {
        const roomTypesData = await roomTypesRes.json()
        setRoomTypes(roomTypesData.roomTypes || [])
      }

      if (amenitiesRes.ok) {
        const amenitiesData = await amenitiesRes.json()
        setAmenities(amenitiesData.amenities || [])
      }
    } catch (error) {
      showMessage('Failed to fetch data', 'error')
      console.error('[ROOM TYPES] Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleOpenDialog = async (roomType?: RoomType) => {
    if (roomType) {
      setEditingRoomType(roomType)
      
      // Fetch existing images for this room type
      let existingImages: RoomImage[] = []
      try {
        const response = await fetch(`/api/admin/room-types/${roomType.id}/images`)
        if (response.ok) {
          const data = await response.json()
          existingImages = data.images || []
        }
      } catch (error) {
        console.error('Failed to fetch images:', error)
      }
      
      setFormData({
        name: roomType.name,
        description: roomType.description || '',
        base_price: roomType.base_price.toString(),
        capacity: roomType.capacity.toString(),
        bed_type: roomType.bed_type || '',
        size_sqm: roomType.size_sqm?.toString() || '',
        status: roomType.status,
        selectedAmenities: (roomType.amenities || []).map(id => parseInt(id as any)),
        images: existingImages
      })
    } else {
      setEditingRoomType(null)
      setFormData({
        name: '',
        description: '',
        base_price: '',
        capacity: '',
        bed_type: '',
        size_sqm: '',
        status: 'active',
        selectedAmenities: [],
        images: []
      })
    }
    setShowDialog(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.base_price || !formData.capacity) {
      showMessage('Please fill in all required fields', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        base_price: parseFloat(formData.base_price),
        capacity: parseInt(formData.capacity),
        bed_type: formData.bed_type || null,
        size_sqm: formData.size_sqm ? parseFloat(formData.size_sqm) : null,
        status: formData.status,
        amenities: formData.selectedAmenities,
        images: formData.images
      }

      const url = editingRoomType 
        ? `/api/admin/room-types/${editingRoomType.id}`
        : '/api/admin/room-types'
      
      const response = await fetch(url, {
        method: editingRoomType ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        showMessage(
          editingRoomType ? 'Room type updated successfully!' : 'Room type created successfully!',
          'success'
        )
        setShowDialog(false)
        await fetchData()
      } else {
        showMessage(data.error || 'Failed to save room type', 'error')
      }
    } catch (error) {
      showMessage('An error occurred while saving', 'error')
      console.error('[ROOM TYPES] Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddImage = () => {
    setFormData({
      ...formData,
      images: [...formData.images, { url: '', caption: '', displayOrder: formData.images.length }]
    })
  }

  const handleRemoveImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index)
    // Re-order remaining images
    const reorderedImages = newImages.map((img, i) => ({ ...img, displayOrder: i }))
    setFormData({ ...formData, images: reorderedImages })
  }

  const handleImageChange = (index: number, field: keyof RoomImage, value: string | number) => {
    const newImages = [...formData.images]
    newImages[index] = { ...newImages[index], [field]: value }
    setFormData({ ...formData, images: newImages })
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this room type? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/room-types/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showMessage('Room type deleted successfully!', 'success')
        await fetchData()
      } else {
        const data = await response.json()
        showMessage(data.error || 'Failed to delete room type', 'error')
      }
    } catch (error) {
      showMessage('An error occurred while deleting', 'error')
      console.error('[ROOM TYPES] Delete error:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-400 border border-green-500/20'
      case 'inactive': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
      case 'archived': return 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {message && <CustomToast message={message.text} type={message.type} />}

      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Room Types</h1>
          <p className="text-gray-400">Manage room categories, pricing, and amenities</p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-amber-400 hover:bg-amber-500 text-black font-semibold"
        >
          <Plus size={18} className="mr-2" />
          Add Room Type
        </Button>
      </header>

      {/* Room Types Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roomTypes.map((roomType) => (
          <Card key={roomType.id} className="bg-[#181d28] border-gray-800 hover:border-amber-500/30 transition-colors">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-white">{roomType.name}</CardTitle>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(roomType.status)}`}>
                  {roomType.status}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-2">{roomType.description || 'No description'}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pricing & Specs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <DollarSign size={16} className="text-green-400" />
                  <div>
                    <p className="text-xs text-gray-500">Base Price</p>
                    <p className="text-sm font-bold text-white">${roomType.base_price}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Users size={16} className="text-blue-400" />
                  <div>
                    <p className="text-xs text-gray-500">Capacity</p>
                    <p className="text-sm font-bold text-white">{roomType.capacity} guests</p>
                  </div>
                </div>
                {roomType.bed_type && (
                  <div className="flex items-center space-x-2">
                    <Bed size={16} className="text-purple-400" />
                    <div>
                      <p className="text-xs text-gray-500">Bed Type</p>
                      <p className="text-sm font-bold text-white">{roomType.bed_type}</p>
                    </div>
                  </div>
                )}
                {roomType.size_sqm && (
                  <div className="flex items-center space-x-2">
                    <Square size={16} className="text-amber-400" />
                    <div>
                      <p className="text-xs text-gray-500">Size</p>
                      <p className="text-sm font-bold text-white">{roomType.size_sqm} m²</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Amenities */}
              {roomType.amenities && roomType.amenities.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Amenities</p>
                  <div className="flex flex-wrap gap-1">
                    {roomType.amenities.slice(0, 3).map((amenityId, idx) => {
                      const amenity = amenities.find(a => a.id === parseInt(amenityId as any))
                      return amenity ? (
                        <span key={idx} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                          {amenity.name}
                        </span>
                      ) : null
                    })}
                    {roomType.amenities.length > 3 && (
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                        +{roomType.amenities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleOpenDialog(roomType)}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <Edit size={14} className="mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={() => handleDelete(roomType.id)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                >
                  <Trash2 size={14} className="mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {roomTypes.length === 0 && (
        <Card className="bg-[#181d28] border-gray-800">
          <CardContent className="py-16 text-center">
            <p className="text-gray-400 text-lg">No room types found</p>
            <Button
              onClick={() => handleOpenDialog()}
              className="mt-4 bg-amber-400 hover:bg-amber-500 text-black font-semibold"
            >
              <Plus size={18} className="mr-2" />
              Create Your First Room Type
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#181d28] border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingRoomType ? 'Edit Room Type' : 'Create New Room Type'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                placeholder="e.g., Deluxe Suite"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none"
                placeholder="Describe the room type..."
              />
            </div>

            {/* Price and Capacity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Base Price ($) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                  className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Capacity (guests) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  placeholder="2"
                  required
                />
              </div>
            </div>

            {/* Bed Type and Size */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bed Type</label>
                <select
                  value={formData.bed_type}
                  onChange={(e) => setFormData({ ...formData, bed_type: e.target.value })}
                  className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                >
                  <option value="">Select bed type</option>
                  <option value="Single">Single</option>
                  <option value="Double">Double</option>
                  <option value="Queen">Queen</option>
                  <option value="King">King</option>
                  <option value="Twin">Twin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Size (m²)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.size_sqm}
                  onChange={(e) => setFormData({ ...formData, size_sqm: e.target.value })}
                  className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  placeholder="25.5"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Amenities</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 bg-[#10141c] border border-gray-700 rounded-lg">
                {amenities.map((amenity) => (
                  <label key={amenity.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-800 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={formData.selectedAmenities.includes(amenity.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            selectedAmenities: [...formData.selectedAmenities, amenity.id]
                          })
                        } else {
                          setFormData({
                            ...formData,
                            selectedAmenities: formData.selectedAmenities.filter(id => id !== amenity.id)
                          })
                        }
                      }}
                      className="w-4 h-4 text-amber-400 bg-gray-700 border-gray-600 rounded focus:ring-amber-400"
                    />
                    <span className="text-sm text-gray-300">{amenity.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Room Images */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-300">
                  <ImageIcon className="inline w-4 h-4 mr-1" />
                  Room Images
                </label>
                <Button
                  type="button"
                  onClick={handleAddImage}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                  size="sm"
                >
                  <Plus size={14} className="mr-1" />
                  Add Image
                </Button>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto p-3 bg-[#10141c] border border-gray-700 rounded-lg">
                {formData.images.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No images added yet</p>
                ) : (
                  formData.images.map((image, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 bg-gray-800 rounded-lg">
                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">
                            <Link2 className="inline w-3 h-3 mr-1" />
                            Image URL
                          </label>
                          <input
                            type="url"
                            value={image.url}
                            onChange={(e) => handleImageChange(index, 'url', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-[#10141c] border border-gray-600 rounded text-gray-300 focus:ring-2 focus:ring-amber-400"
                            placeholder="https://example.com/image.jpg"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Caption (Optional)</label>
                          <input
                            type="text"
                            value={image.caption}
                            onChange={(e) => handleImageChange(index, 'caption', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-[#10141c] border border-gray-600 rounded text-gray-300 focus:ring-2 focus:ring-amber-400"
                            placeholder="Describe the image..."
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="bg-red-600 hover:bg-red-700 text-white h-8 w-8 p-0"
                        size="sm"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                💡 Add image URLs from your hosting service (e.g., Imgur, Cloudinary, or direct links)
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-amber-400 hover:bg-amber-500 text-black font-semibold disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    {editingRoomType ? 'Update' : 'Create'} Room Type
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowDialog(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold"
              >
                <X size={16} className="mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
