'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Edit, 
  Trash2, 
  Building2, 
  BedDouble, 
  DoorOpen,
  AlertCircle,
  X,
  Save,
  Loader2,
  CheckCircle,
  Wifi,
  Tv,
  Coffee,
  Wind,
  Snowflake,
  Wine,
  Lock,
  Shield,
  Shirt,
  Bell,
  Briefcase,
  Sun,
  Waves,
  Building,
  Bed,
  Sofa,
  Bath,
  Droplet,
  Sparkles,
  Phone,
  Moon,
  VolumeX,
  Utensils,
  Package,
  Image as ImageIcon,
  Link2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Custom Toast Component
const CustomToast = ({ message, type }: { message: string, type: 'success' | 'error' | 'info' }) => (
  <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    'bg-blue-500 text-white'
  } text-white animate-slide-in-right`}>
    {type === 'success' && <CheckCircle size={20} />}
    {type === 'error' && <AlertCircle size={20} />}
    {message}
  </div>
);

// Dialog Component
const Dialog = ({ open, onOpenChange, children }: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  children: React.ReactNode 
}) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={() => onOpenChange(false)} />
      <div className="relative z-50 w-full h-full max-w-7xl max-h-[95vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

const DialogContent = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`h-full flex flex-col p-8 rounded-xl shadow-2xl ${className}`}>
    {children}
  </div>
);

const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-4">{children}</div>
);

const DialogTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <h2 className={`text-2xl font-bold ${className}`}>{children}</h2>
);

// Button Component
const Button = ({ 
  onClick, 
  children, 
  className, 
  disabled 
}: { 
  onClick?: () => void, 
  children: React.ReactNode, 
  className?: string,
  disabled?: boolean 
}) => (
  <button 
    onClick={onClick} 
    className={`px-4 py-2 rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    disabled={disabled}
  >
    {children}
  </button>
);

interface Branch {
  id: number;
  name: string;
  location: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  manager_name?: string;
  is_active: boolean;
}

interface Room {
  id: number;
  room_number: string;
  room_type_id: number;
  room_type_name?: string;
  branch_id: number;
  floor_number?: number;
  status: string;
  notes?: string;
  amenities?: Amenity[];
}

interface RoomType {
  id: number;
  name: string;
  base_price: number;
  capacity: number;
  amenities?: Amenity[];
}

interface Amenity {
  id: number;
  name: string;
  description?: string;
  icon_name?: string;
}

interface RoomImage {
  id?: number;
  imageUrl: string;
  caption: string;
  displayOrder: number;
}

export default function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const branchId = parseInt(resolvedParams.id);

  const [branch, setBranch] = useState<Branch | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [allAmenities, setAllAmenities] = useState<Amenity[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>([]);
  const [currentRoomImages, setCurrentRoomImages] = useState<RoomImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [uploadedImages, setUploadedImages] = useState<Array<{filename: string, url: string, timestamp: Date}>>([]);
  const [showImageBrowser, setShowImageBrowser] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [roomFormData, setRoomFormData] = useState({
    room_number: '',
    room_type_id: '',
    floor_number: '',
    status: 'Available',
    notes: ''
  });

  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // Get icon component by name
  const getAmenityIcon = (iconName?: string) => {
    if (!iconName) return Package;
    
    const iconMap: { [key: string]: any } = {
      wifi: Wifi,
      tv: Tv,
      coffee: Coffee,
      wind: Wind,
      snowflake: Snowflake,
      wine: Wine,
      lock: Lock,
      shield: Shield,
      shirt: Shirt,
      bell: Bell,
      briefcase: Briefcase,
      sun: Sun,
      waves: Waves,
      building: Building,
      bed: Bed,
      couch: Sofa,
      bath: Bath,
      droplet: Droplet,
      sparkles: Sparkles,
      phone: Phone,
      moon: Moon,
      'volume-x': VolumeX,
      utensils: Utensils,
      package: Package
    };
    
    return iconMap[iconName.toLowerCase()] || Package;
  };

  // Fetch branch details and rooms
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch branch details
        const branchRes = await fetch(`/api/admin/branches/${branchId}`);
        const branchData = await branchRes.json();

        if (!branchRes.ok) {
          throw new Error(branchData.error || 'Failed to fetch branch');
        }

        setBranch(branchData.branch);

        // Fetch rooms for this branch
        const roomsRes = await fetch(`/api/admin/rooms/list?branchId=${branchId}`);
        const roomsData = await roomsRes.json();

        if (roomsRes.ok) {
          setRooms(roomsData.rooms || []);
        }

        // Fetch room types (with amenities)
        const typesRes = await fetch('/api/admin/room-types');
        const typesData = await typesRes.json();

        if (typesRes.ok) {
          setRoomTypes(typesData.roomTypes || []);
        }

        // Fetch all amenities
        const amenitiesRes = await fetch('/api/admin/amenities');
        const amenitiesData = await amenitiesRes.json();

        if (amenitiesRes.ok) {
          setAllAmenities(amenitiesData.amenities || []);
        }

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching branch data:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [branchId]);

  const handleOpenRoomDialog = async (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setRoomFormData({
        room_number: room.room_number,
        room_type_id: room.room_type_id.toString(),
        floor_number: room.floor_number?.toString() || '',
        status: room.status,
        notes: room.notes || ''
      });
      // Load amenities for this room (either from room itself or room type)
      if (room.amenities && room.amenities.length > 0) {
        setSelectedAmenities(room.amenities.map(a => a.id));
      } else {
        const roomType = roomTypes.find(rt => rt.id === room.room_type_id);
        if (roomType && roomType.amenities) {
          setSelectedAmenities(roomType.amenities.map(a => a.id));
        } else {
          setSelectedAmenities([]);
        }
      }
      
      // Fetch existing images for this room
      try {
        const response = await fetch(`/api/admin/rooms/list/${room.id}/images`);
        if (response.ok) {
          const data = await response.json();
          setCurrentRoomImages(data.images || []);
        } else {
          setCurrentRoomImages([]);
        }
      } catch (error) {
        console.error('Failed to fetch room images:', error);
        setCurrentRoomImages([]);
      }
    } else {
      setEditingRoom(null);
      setRoomFormData({
        room_number: '',
        room_type_id: '',
        floor_number: '',
        status: 'Available',
        notes: ''
      });
      setSelectedAmenities([]);
      setCurrentRoomImages([]);
    }
    setShowRoomDialog(true);
  };

  // Image management handlers
  const handleAddRoomImage = () => {
    setCurrentRoomImages([
      ...currentRoomImages,
      { imageUrl: '', caption: '', displayOrder: currentRoomImages.length }
    ]);
  };

  const handleRemoveRoomImage = (index: number) => {
    const newImages = currentRoomImages.filter((_, i) => i !== index);
    const reorderedImages = newImages.map((img, i) => ({ ...img, displayOrder: i }));
    setCurrentRoomImages(reorderedImages);
  };

  const handleRoomImageChange = (index: number, field: keyof RoomImage, value: string | number) => {
    const newImages = [...currentRoomImages];
    newImages[index] = { ...newImages[index], [field]: value };
    setCurrentRoomImages(newImages);
  };

  const handleSaveRoomImages = async (roomId: number) => {
    try {
      const response = await fetch(`/api/admin/rooms/list/${roomId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: currentRoomImages })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save room images');
      }

      return true;
    } catch (error) {
      console.error('Error saving room images:', error);
      throw error;
    }
  };

  // File upload handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/upload/room-image', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      // Add the uploaded image to the room images list
      setCurrentRoomImages([
        ...currentRoomImages,
        { imageUrl: data.url, caption: '', displayOrder: currentRoomImages.length }
      ]);

      showMessage('Image uploaded successfully', 'success');
      
      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      showMessage((error as Error).message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const fetchUploadedImages = async () => {
    try {
      const response = await fetch('/api/admin/upload/room-image');
      if (response.ok) {
        const data = await response.json();
        setUploadedImages(data.images || []);
      }
    } catch (error) {
      console.error('Error fetching uploaded images:', error);
    }
  };

  const handleSelectUploadedImage = (url: string) => {
    setCurrentRoomImages([
      ...currentRoomImages,
      { imageUrl: url, caption: '', displayOrder: currentRoomImages.length }
    ]);
    setShowImageBrowser(false);
    showMessage('Image added', 'success');
  };

  const handleSaveRoom = async () => {
    if (!roomFormData.room_number || !roomFormData.room_type_id) {
      showMessage('Room number and room type are required', 'error');
      return;
    }

    try {
      setSaving(true);

      const url = editingRoom 
        ? `/api/admin/rooms/list/${editingRoom.id}`
        : '/api/admin/rooms/list';

      const body = {
        room_number: roomFormData.room_number,
        room_type_id: parseInt(roomFormData.room_type_id),
        branch_id: branchId,
        floor_number: roomFormData.floor_number ? parseInt(roomFormData.floor_number) : null,
        status: roomFormData.status,
        notes: roomFormData.notes || null,
        amenities: selectedAmenities // Include selected amenities
      };

      const response = await fetch(url, {
        method: editingRoom ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save room');
      }

      // Save images if there are any
      const roomId = editingRoom ? editingRoom.id : data.room.id;
      try {
        await handleSaveRoomImages(roomId);
      } catch (imageError) {
        console.error('Failed to save room images:', imageError);
        showMessage('Room saved, but some images failed to upload', 'info');
      }

      showMessage(
        editingRoom ? 'Room updated successfully' : 'Room created successfully',
        'success'
      );

      setShowRoomDialog(false);
      setCurrentRoomImages([]);

      // Refresh rooms list
      const roomsRes = await fetch(`/api/admin/rooms/list?branchId=${branchId}`);
      const roomsData = await roomsRes.json();
      if (roomsRes.ok) {
        setRooms(roomsData.rooms || []);
      }
    } catch (err: any) {
      console.error('Error saving room:', err);
      showMessage(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = async (roomId: number) => {
    if (!confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/rooms/list/${roomId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete room');
      }

      showMessage('Room deleted successfully', 'success');

      // Refresh rooms list
      const roomsRes = await fetch(`/api/admin/rooms/list?branchId=${branchId}`);
      const roomsData = await roomsRes.json();
      if (roomsRes.ok) {
        setRooms(roomsData.rooms || []);
      }
    } catch (err: any) {
      console.error('Error deleting room:', err);
      showMessage(err.message, 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'text-green-400 bg-green-400/10';
      case 'Occupied': return 'text-red-400 bg-red-400/10';
      case 'Maintenance': return 'text-orange-400 bg-orange-400/10';
      case 'Cleaning': return 'text-blue-400 bg-blue-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="h-12 w-64 bg-gray-700 animate-pulse rounded mb-8"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-700 animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !branch) {
    return (
      <div className="max-w-7xl mx-auto">
        <Link href="/admin/branches" className="text-amber-400 hover:text-amber-300 flex items-center gap-2 mb-4">
          <ArrowLeft size={16} />
          Back to Branches
        </Link>
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-400">
          <AlertCircle className="inline mr-2" size={20} />
          {error || 'Branch not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto text-gray-300">
      {message && <CustomToast message={message.text} type={message.type} />}

      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/branches" className="text-amber-400 hover:text-amber-300 flex items-center gap-2 mb-4">
          <ArrowLeft size={16} />
          Back to Branches
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white font-l flex items-center gap-3">
              <Building2 size={32} />
              {branch.name}
            </h1>
            <p className="text-gray-400 mt-2">{branch.location}</p>
            {branch.address && <p className="text-gray-500 text-sm mt-1">{branch.address}</p>}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleOpenRoomDialog()}
              className="flex items-center space-x-2 px-4 py-2 bg-amber-400 text-black font-semibold rounded-md hover:bg-amber-500 transition-colors"
            >
              <Plus size={16} />
              <span>Add Room</span>
            </Button>
          </div>
        </div>

        {/* Branch Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-[#181d28] border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Total Rooms</p>
            <p className="text-2xl font-bold text-white">{rooms.length}</p>
          </div>
          <div className="bg-[#181d28] border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Available</p>
            <p className="text-2xl font-bold text-green-400">
              {rooms.filter(r => r.status === 'Available').length}
            </p>
          </div>
          <div className="bg-[#181d28] border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Occupied</p>
            <p className="text-2xl font-bold text-red-400">
              {rooms.filter(r => r.status === 'Occupied').length}
            </p>
          </div>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="bg-[#181d28] border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DoorOpen size={24} />
            Rooms
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#10141c]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Room Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Room Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Floor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amenities
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No rooms added yet. Click "Add Room" to create one.
                  </td>
                </tr>
              ) : (
                rooms.map(room => (
                  <tr key={room.id} className="hover:bg-[#10141c] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <BedDouble size={16} className="text-gray-500" />
                        <span className="text-white font-medium">{room.room_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {room.room_type_name || `Type ${room.room_type_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                      {room.floor_number ? `Floor ${room.floor_number}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
                        {room.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {room.amenities && room.amenities.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {room.amenities.slice(0, 4).map(amenity => {
                            const IconComponent = getAmenityIcon(amenity.icon_name);
                            return (
                              <div
                                key={amenity.id}
                                className="w-7 h-7 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center"
                                title={amenity.name}
                              >
                                <IconComponent size={14} />
                              </div>
                            );
                          })}
                          {room.amenities.length > 4 && (
                            <div className="w-7 h-7 rounded-full bg-gray-700 text-gray-400 flex items-center justify-center text-xs">
                              +{room.amenities.length - 4}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No amenities</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm max-w-xs truncate">
                      {room.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenRoomDialog(room)}
                          className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Room Dialog */}
      <Dialog open={showRoomDialog} onOpenChange={setShowRoomDialog}>
        <DialogContent className="bg-[#181d28] border border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center justify-between">
              <span>{editingRoom ? 'Edit Room' : 'Add New Room'}</span>
              <button
                onClick={() => setShowRoomDialog(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="info" className="mt-4">
            <TabsList className="grid w-full grid-cols-2 bg-[#10141c]">
              <TabsTrigger 
                value="info" 
                className="text-gray-400 data-[state=active]:bg-amber-500 data-[state=active]:text-black data-[state=active]:font-semibold"
              >
                Room Information
              </TabsTrigger>
              <TabsTrigger 
                value="images" 
                className="text-gray-400 data-[state=active]:bg-amber-500 data-[state=active]:text-black data-[state=active]:font-semibold"
              >
                <ImageIcon className="w-4 h-4 mr-2 inline" />
                Images
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6 mt-4 flex-1 overflow-y-auto pr-2">
            {/* Room Number */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Room Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={roomFormData.room_number}
                onChange={(e) => setRoomFormData({ ...roomFormData, room_number: e.target.value })}
                className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                placeholder="e.g., 101, A-201"
                required
              />
            </div>

            {/* Room Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Room Type <span className="text-red-400">*</span>
              </label>
              <select
                value={roomFormData.room_type_id}
                onChange={(e) => {
                  const typeId = e.target.value;
                  setRoomFormData({ ...roomFormData, room_type_id: typeId });
                  
                  // Auto-populate amenities when room type is selected
                  if (typeId) {
                    const selectedType = roomTypes.find(rt => rt.id === parseInt(typeId));
                    if (selectedType && selectedType.amenities) {
                      setSelectedAmenities(selectedType.amenities.map(a => a.id));
                    } else {
                      setSelectedAmenities([]);
                    }
                  } else {
                    setSelectedAmenities([]);
                  }
                }}
                className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                required
              >
                <option value="">Select a room type</option>
                {roomTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name} - ${type.base_price}/night (Capacity: {type.capacity})
                  </option>
                ))}
              </select>
            </div>

            {/* Floor Number and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Floor Number</label>
                <input
                  type="number"
                  value={roomFormData.floor_number}
                  onChange={(e) => setRoomFormData({ ...roomFormData, floor_number: e.target.value })}
                  className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  placeholder="e.g., 1"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={roomFormData.status}
                  onChange={(e) => setRoomFormData({ ...roomFormData, status: e.target.value })}
                  className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                >
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Cleaning">Cleaning</option>
                </select>
              </div>
            </div>

            {/* Amenities Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Room Amenities
                <span className="text-gray-500 text-xs ml-2">(Toggle to add/remove)</span>
              </label>
              <div className="p-4 bg-[#10141c] rounded-lg overflow-x-auto max-h-48">
                <div className="flex flex-col gap-2 items-center">
                  {/* First Row */}
                  <div className="flex gap-2 justify-center">
                    {allAmenities.slice(0, Math.ceil(allAmenities.length / 2)).map(amenity => {
                      const IconComponent = getAmenityIcon(amenity.icon_name);
                      const isSelected = selectedAmenities.includes(amenity.id);
                      
                      return (
                        <button
                          key={amenity.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedAmenities(selectedAmenities.filter(id => id !== amenity.id));
                            } else {
                              setSelectedAmenities([...selectedAmenities, amenity.id]);
                            }
                          }}
                          className={`
                            group relative overflow-hidden
                            transition-all duration-300 ease-in-out
                            flex items-center justify-center
                            h-10 rounded-full
                            ${isSelected 
                              ? 'bg-amber-400 text-black hover:bg-amber-500' 
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }
                            hover:pr-3
                            w-10 hover:w-auto transition-all duration-500 ease-in-out
                          `}
                          title={amenity.name}
                        >
                          {/* Icon - always visible */}
                          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                            <IconComponent size={18} />
                          </div>
                          
                          {/* Text - appears on hover */}
                          <span className="
                            max-w-0 group-hover:max-w-xs
                            overflow-hidden
                            whitespace-nowrap
                            transition-all duration-300 ease-in-out
                            text-sm font-medium
                            opacity-0 group-hover:opacity-100
                          ">
                            {amenity.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Second Row */}
                  <div className="flex gap-2 justify-center">
                    {allAmenities.slice(Math.ceil(allAmenities.length / 2)).map(amenity => {
                      const IconComponent = getAmenityIcon(amenity.icon_name);
                      const isSelected = selectedAmenities.includes(amenity.id);
                      
                      return (
                        <button
                          key={amenity.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedAmenities(selectedAmenities.filter(id => id !== amenity.id));
                            } else {
                              setSelectedAmenities([...selectedAmenities, amenity.id]);
                            }
                          }}
                          className={`
                            group relative overflow-hidden
                            transition-all duration-300 ease-in-out
                            flex items-center justify-center
                            h-10 rounded-full
                            ${isSelected 
                              ? 'bg-amber-400 text-black hover:bg-amber-500' 
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }
                            hover:pr-3
                            w-10 hover:w-auto
                          `}
                          title={amenity.name}
                        >
                          {/* Icon - always visible */}
                          <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                            <IconComponent size={18} />
                          </div>
                          
                          {/* Text - appears on hover */}
                          <span className="
                            max-w-0 group-hover:max-w-xs
                            overflow-hidden
                            whitespace-nowrap
                            transition-all duration-300 ease-in-out
                            text-sm font-medium
                            opacity-0 group-hover:opacity-100
                          ">
                            {amenity.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {selectedAmenities.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  No amenities selected. Click icons above to add amenities.
                </p>
              )}
              {selectedAmenities.length > 0 && (
                <p className="text-sm text-amber-400 mt-2">
                  {selectedAmenities.length} amenitie{selectedAmenities.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
              <textarea
                value={roomFormData.notes}
                onChange={(e) => setRoomFormData({ ...roomFormData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none"
                placeholder="Any additional notes about this room..."
              />
            </div>
          </TabsContent>

          <TabsContent value="images" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-300">
                  <ImageIcon className="inline w-4 h-4 mr-1" />
                  Room Images
                </label>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <div className="min-w-[120px] h-[32px] text-xs bg-amber-500 hover:bg-amber-600 text-black px-3 rounded-md font-semibold flex items-center justify-center gap-1 transition-colors">
                      {uploading ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Plus size={14} />
                          Upload Image
                        </>
                      )}
                    </div>
                  </label>
                  <Button
                    onClick={() => {
                      setShowImageBrowser(true);
                      fetchUploadedImages();
                    }}
                    className="min-w-[120px] h-[32px] text-xs bg-amber-500 hover:bg-amber-600 text-black px-3 font-semibold"
                  >
                    <ImageIcon size={14} className="mr-1" />
                    Browse Uploads
                  </Button>
                  <Button
                    onClick={handleAddRoomImage}
                    className="min-w-[120px] h-[32px] text-xs bg-amber-500 hover:bg-amber-600 text-black px-3 font-semibold"
                  >
                    <Link2 size={14} className="mr-1" />
                    Add URL
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto p-3 bg-[#10141c] border border-gray-700 rounded-lg">
                {currentRoomImages.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No images added yet. Click "Add Image" to get started.
                  </p>
                ) : (
                  currentRoomImages.map((image, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 bg-gray-800 rounded-lg">
                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">
                            <Link2 className="inline w-3 h-3 mr-1" />
                            Image URL *
                          </label>
                          <input
                            type="url"
                            value={image.imageUrl}
                            onChange={(e) => handleRoomImageChange(index, 'imageUrl', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-[#10141c] border border-gray-600 rounded text-gray-300 focus:ring-2 focus:ring-amber-400"
                            placeholder="https://example.com/image.jpg or /uploads/room1.jpg"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Caption (Optional)</label>
                          <input
                            type="text"
                            value={image.caption || ''}
                            onChange={(e) => handleRoomImageChange(index, 'caption', e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-[#10141c] border border-gray-600 rounded text-gray-300 focus:ring-2 focus:ring-amber-400"
                            placeholder="Describe the image..."
                          />
                        </div>
                        {image.imageUrl && (
                          <div className="mt-2">
                            <img
                              src={image.imageUrl}
                              alt={image.caption || 'Preview'}
                              className="w-full h-32 object-cover rounded"
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EInvalid URL%3C/text%3E%3C/svg%3E';
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleRemoveRoomImage(index)}
                        className="bg-red-600 hover:bg-red-700 text-white h-8 w-8 p-0 flex-shrink-0"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Tip: Upload images directly or paste URLs from image hosting services
              </p>
            </div>
          </TabsContent>
          </Tabs>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex gap-4 pt-6 border-t border-gray-800 mt-6">
            <Button
              onClick={handleSaveRoom}
              disabled={saving}
              className="flex-1 bg-amber-400 hover:bg-amber-500 text-black font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>{editingRoom ? 'Update' : 'Create'} Room</span>
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowRoomDialog(false)}
              disabled={saving}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold flex items-center justify-center gap-2"
            >
              <X size={18} />
              <span>Cancel</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Browser Modal */}
      <Dialog open={showImageBrowser} onOpenChange={setShowImageBrowser}>
        <DialogContent className="bg-[#181d28] border border-gray-800 text-white max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center justify-center relative">
              <span>Browse Uploaded Images</span>
              <button
                onClick={() => setShowImageBrowser(false)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-6">
            {uploadedImages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p>No uploaded images yet. Upload an image to see it here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
                {uploadedImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectUploadedImage(img.url)}
                    className="cursor-pointer group relative overflow-hidden rounded-lg border-2 border-transparent hover:border-amber-500 transition-all"
                  >
                    <img
                      src={img.url}
                      alt={img.filename}
                      className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 font-semibold">
                        Click to Add
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-xs text-white truncate">{img.filename}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
