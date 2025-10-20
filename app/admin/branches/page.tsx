// app/admin/branches/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image';
import Link from 'next/link';
import { Building, PlusCircle, Phone, Mail, MapPin, Edit, Trash2, X, Save, Loader2, Image as ImageIcon, Link2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Branch {
  id: number;
  name: string;
  location: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  manager_name: string;
  is_active: boolean;
  occupancyRate?: number;
  revenue?: number;
  totalRooms?: number;
  occupiedRooms?: number;
}

interface RoomType {
  id: number;
  name: string;
  description: string;
  base_price: number;
  capacity: number;
  bed_type: string;
  size_sqm: number;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
}

interface BranchImage {
  id?: number;
  imageUrl: string;
  caption: string;
  displayOrder: number;
}

const CustomToast = ({ message, type }: { message: string, type: 'success' | 'error' | 'info' }) => (
  <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
    type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  } text-white animate-slide-in-right`}>
    {message}
  </div>
)

interface Branch {
  id: number;
  name: string;
  location: string;
  phone: string;
  email: string;
  description: string;
  occupancyRate?: number;
  revenue?: number;
  totalRooms?: number;
  occupiedRooms?: number;
}

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[#181d28] border border-gray-800 rounded-xl ${className}`}>{children}</div>
);

const getOccupancyColor = (rate: number) => {
    if (rate >= 80) return 'text-green-400';
    if (rate >= 60) return 'text-yellow-400';
    return 'text-red-400';
};

// Branch images mapping
const branchImages: { [key: string]: string } = {
  'colombo': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
  'kandy': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400',
  'galle': 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400'
};

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showRoomTypeDialog, setShowRoomTypeDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [currentBranchImages, setCurrentBranchImages] = useState<BranchImage[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    phone: '',
    email: '',
    description: '',
    manager_name: '',
    is_active: true
  });

  const [roomTypeFormData, setRoomTypeFormData] = useState({
    name: '',
    description: '',
    base_price: '',
    capacity: '',
    bed_type: '',
    size_sqm: '',
    status: 'active' as 'active' | 'inactive' | 'archived'
  });

  const showMessage = (text: string, type: 'success' | 'error' | 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  // Fetch branches data
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoading(true);
        // Fetch basic branch info from admin API (includes inactive branches)
        const branchesRes = await fetch('/api/admin/branches');
        const branchesData = await branchesRes.json();

        if (!branchesRes.ok) {
          throw new Error(branchesData.error || 'Failed to fetch branches');
        }

        // Fetch statistics for each branch
        const branchesWithStats = await Promise.all(
          branchesData.branches.map(async (branch: Branch) => {
            try {
              const statsRes = await fetch(`/api/admin/reports?type=overview&period=month&branchId=${branch.id}`);
              const statsData = await statsRes.json();
              
              return {
                ...branch,
                occupancyRate: statsData.stats?.occupancyRate || 0,
                revenue: statsData.stats?.totalRevenue || 0,
                totalRooms: statsData.stats?.totalRooms || 0,
                occupiedRooms: statsData.stats?.occupiedRooms || 0
              };
            } catch (err) {
              console.error(`Error fetching stats for branch ${branch.id}:`, err);
              return { ...branch, occupancyRate: 0, revenue: 0 };
            }
          })
        );

        // Deduplicate branches by ID (just in case)
        const uniqueBranches = Array.from(
          new Map(branchesWithStats.map(b => [b.id, b])).values()
        );

        setBranches(uniqueBranches);
      } catch (err) {
        console.error('[BRANCHES] Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load branches');
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, []);

  // Fetch room types
  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        setLoadingRoomTypes(true);
        const response = await fetch('/api/admin/room-types');
        const data = await response.json();

        if (response.ok) {
          setRoomTypes(data.roomTypes || []);
        } else {
          console.error('[ROOM TYPES] Error fetching:', data.error);
        }
      } catch (err) {
        console.error('[ROOM TYPES] Error:', err);
      } finally {
        setLoadingRoomTypes(false);
      }
    };

    fetchRoomTypes();
  }, []);

  const handleOpenDialog = async (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name,
        location: branch.location,
        address: branch.address || '',
        phone: branch.phone || '',
        email: branch.email || '',
        description: branch.description || '',
        manager_name: branch.manager_name || '',
        is_active: branch.is_active
      });
      
      // Fetch existing images for this branch
      try {
        const response = await fetch(`/api/admin/branches/${branch.id}/images`);
        if (response.ok) {
          const data = await response.json();
          setCurrentBranchImages(data.images || []);
        } else {
          setCurrentBranchImages([]);
        }
      } catch (error) {
        console.error('Failed to fetch branch images:', error);
        setCurrentBranchImages([]);
      }
    } else {
      setEditingBranch(null);
      setFormData({
        name: '',
        location: '',
        address: '',
        phone: '',
        email: '',
        description: '',
        manager_name: '',
        is_active: true
      });
      setCurrentBranchImages([]);
    }
    setShowDialog(true);
  };

  const handleAddImage = () => {
    setCurrentBranchImages([
      ...currentBranchImages,
      { imageUrl: '', caption: '', displayOrder: currentBranchImages.length }
    ]);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = currentBranchImages.filter((_, i) => i !== index);
    // Re-order remaining images
    const reorderedImages = newImages.map((img, i) => ({ ...img, displayOrder: i }));
    setCurrentBranchImages(reorderedImages);
  };

  const handleImageChange = (index: number, field: keyof BranchImage, value: string | number) => {
    const newImages = [...currentBranchImages];
    newImages[index] = { ...newImages[index], [field]: value };
    setCurrentBranchImages(newImages);
  };

  const handleSaveImages = async (branchId: number) => {
    try {
      const response = await fetch(`/api/admin/branches/${branchId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: currentBranchImages })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save images');
      }

      return true;
    } catch (error) {
      console.error('Failed to save branch images:', error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.location) {
      showMessage('Name and location are required', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editingBranch 
        ? `/api/admin/branches/${editingBranch.id}`
        : '/api/admin/branches';
      
      const response = await fetch(url, {
        method: editingBranch ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        const branchId = editingBranch ? editingBranch.id : data.branch.id;
        
        // Save images if there are any
        try {
          await handleSaveImages(branchId);
        } catch (imageError) {
          console.error('Failed to save images, but branch was saved:', imageError);
          showMessage('Branch saved, but some images failed to upload', 'info');
        }
        
        showMessage(
          editingBranch ? 'Branch updated successfully!' : 'Branch created successfully!',
          'success'
        );
        setShowDialog(false);
        setCurrentBranchImages([]);
        
        // Refresh branches list
        const branchesRes = await fetch('/api/branches');
        const branchesData = await branchesRes.json();
        if (branchesRes.ok) {
          setBranches(branchesData.branches);
        }
      } else {
        showMessage(data.error || 'Failed to save branch', 'error');
      }
    } catch (error) {
      showMessage('An error occurred while saving', 'error');
      console.error('[BRANCHES] Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/branches/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showMessage('Branch deleted successfully!', 'success');
        setBranches(branches.filter(b => b.id !== id));
      } else {
        const data = await response.json();
        showMessage(data.error || 'Failed to delete branch', 'error');
      }
    } catch (error) {
      showMessage('An error occurred while deleting', 'error');
      console.error('[BRANCHES] Delete error:', error);
    }
  };

  // Room Type handlers
  const handleOpenRoomTypeDialog = (roomType?: RoomType) => {
    if (roomType) {
      setEditingRoomType(roomType);
      setRoomTypeFormData({
        name: roomType.name,
        description: roomType.description || '',
        base_price: roomType.base_price.toString(),
        capacity: roomType.capacity.toString(),
        bed_type: roomType.bed_type || '',
        size_sqm: roomType.size_sqm?.toString() || '',
        status: roomType.status
      });
    } else {
      setEditingRoomType(null);
      setRoomTypeFormData({
        name: '',
        description: '',
        base_price: '',
        capacity: '',
        bed_type: '',
        size_sqm: '',
        status: 'active'
      });
    }
    setShowRoomTypeDialog(true);
  };

  const handleSaveRoomType = async () => {
    if (!roomTypeFormData.name || !roomTypeFormData.base_price || !roomTypeFormData.capacity) {
      showMessage('Name, base price, and capacity are required', 'error');
      return;
    }

    if (parseFloat(roomTypeFormData.base_price) <= 0) {
      showMessage('Base price must be greater than 0', 'error');
      return;
    }

    if (parseInt(roomTypeFormData.capacity) <= 0) {
      showMessage('Capacity must be greater than 0', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editingRoomType 
        ? `/api/admin/room-types/${editingRoomType.id}`
        : '/api/admin/room-types';
      
      const response = await fetch(url, {
        method: editingRoomType ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomTypeFormData.name,
          description: roomTypeFormData.description,
          base_price: parseFloat(roomTypeFormData.base_price),
          capacity: parseInt(roomTypeFormData.capacity),
          bed_type: roomTypeFormData.bed_type,
          size_sqm: roomTypeFormData.size_sqm ? parseFloat(roomTypeFormData.size_sqm) : null,
          status: roomTypeFormData.status
        })
      });

      const data = await response.json();

      if (response.ok) {
        showMessage(
          editingRoomType ? 'Room type updated successfully!' : 'Room type created successfully!',
          'success'
        );
        setShowRoomTypeDialog(false);
        // Refresh room types list
        const roomTypesRes = await fetch('/api/admin/room-types');
        const roomTypesData = await roomTypesRes.json();
        if (roomTypesRes.ok) {
          setRoomTypes(roomTypesData.roomTypes);
        }
      } else {
        showMessage(data.error || 'Failed to save room type', 'error');
      }
    } catch (error) {
      showMessage('An error occurred while saving', 'error');
      console.error('[ROOM TYPES] Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoomType = async (id: number) => {
    if (!confirm('Are you sure you want to delete this room type? This may affect existing rooms.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/room-types/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showMessage('Room type deleted successfully!', 'success');
        setRoomTypes(roomTypes.filter(rt => rt.id !== id));
      } else {
        const data = await response.json();
        showMessage(data.error || 'Failed to delete room type', 'error');
      }
    } catch (error) {
      showMessage('An error occurred while deleting', 'error');
      console.error('[ROOM TYPES] Delete error:', error);
    }
  };

  // Get image for branch based on location
  const getBranchImage = (location: string) => {
    const locationLower = location.toLowerCase();
    if (locationLower.includes('colombo')) return branchImages.colombo;
    if (locationLower.includes('kandy')) return branchImages.kandy;
    if (locationLower.includes('galle')) return branchImages.galle;
    return branchImages.colombo; // Default
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto text-gray-300">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Branch Management</h1>
          <p className="text-gray-400">Loading branches...</p>
        </header>
        <div className="grid lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-48 bg-gray-700 animate-pulse"></div>
              <div className="p-6 space-y-4">
                <div className="h-6 bg-gray-700 animate-pulse rounded"></div>
                <div className="h-4 bg-gray-700 animate-pulse rounded w-2/3"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-20 bg-gray-700 animate-pulse rounded"></div>
                  <div className="h-20 bg-gray-700 animate-pulse rounded"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto text-gray-300">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Branch Management</h1>
        </header>
        <Card className="p-8 text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-amber-400 text-black rounded-md hover:bg-amber-500"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    
    <div className="max-w-7xl mx-auto text-gray-300">
        {message && <CustomToast message={message.text} type={message.type} />}
        
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white font-l">Branch Management</h1>
            <p className="text-gray-400">Manage all Sky Nest hotel branches and their operations.</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-400 text-black font-semibold rounded-md hover:bg-amber-500 transition-colors"
          >
            <PlusCircle size={16} />
            <span>Add New Branch</span>
          </Button>
        </header>

        {/* Branches Section */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white">Branches</h2>
          <p className="text-gray-400 text-sm">All hotel branch locations</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {branches.map(branch => (
            <Card key={branch.id} className="overflow-hidden">
              <div className="relative h-48">
                <Image src={getBranchImage(branch.location)} alt={branch.name} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex flex-col justify-end">
                  <h3 className="text-xl font-bold text-white">{branch.name}</h3>
                  <p className="text-sm text-gray-300 flex items-center">
                    <MapPin size={14} className="mr-1" />
                    {branch.location}
                  </p>
                </div>
                {/* Edit and Delete buttons */}
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => handleOpenDialog(branch)}
                    className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(branch.id)}
                    className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-[#10141c] rounded-lg">
                    <p className={`text-2xl font-bold ${getOccupancyColor(branch.occupancyRate || 0)}`}>
                      {branch.occupancyRate || 0}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Occupancy</p>
                  </div>
                  <div className="text-center p-3 bg-[#10141c] rounded-lg">
                    <p className="text-2xl font-bold text-green-400">
                      ${((branch.revenue || 0) / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Revenue</p>
                  </div>
                </div>
                <div className="text-sm space-y-2 mb-4">
                  <p className="flex items-center text-gray-400">
                    <Phone size={14} className="mr-2" />
                    {branch.phone}
                  </p>
                  <p className="flex items-center text-gray-400">
                    <Mail size={14} className="mr-2" />
                    {branch.email}
                  </p>
                  <p className="text-gray-500">
                    {branch.totalRooms || 0} rooms • {branch.occupiedRooms || 0} occupied
                  </p>
                </div>
                <Link href={`/admin/branches/${branch.id}`} className="block w-full mt-4 text-center py-2 bg-amber-400/10 text-amber-300 rounded-md hover:bg-amber-400/20 transition font-medium">
                  Manage Rooms
                </Link>
              </div>
            </Card>
          ))}
        </div>

        {/* Room Types Management Section */}
        <Card className="mt-8 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Room Types</h2>
              <p className="text-gray-400 text-sm">Manage room type categories and pricing</p>
            </div>
            <Button
              onClick={() => handleOpenRoomTypeDialog()}
              className="flex items-center space-x-2 px-4 py-2 bg-transparent border-2 border-amber-400/50 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(251,191,36,0.5)] text-amber-400 hover:text-amber-300 rounded-lg text-sm font-semibold transition-all duration-300"
            >
              <PlusCircle size={16} />
              <span>Add Room Type</span>
            </Button>
          </div>

          {loadingRoomTypes ? (
            <div className="text-center py-8 text-gray-400">Loading room types...</div>
          ) : roomTypes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No room types found. Create your first room type to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Base Price</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Capacity</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Bed Type</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Size (sqm)</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Status</th>
                    <th className="text-right py-3 px-4 text-gray-400 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roomTypes.map(roomType => (
                    <tr key={roomType.id} className="border-b border-gray-800 hover:bg-[#10141c] transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-white font-medium">{roomType.name}</p>
                          {roomType.description && (
                            <p className="text-xs text-gray-500 mt-1">{roomType.description.substring(0, 50)}{roomType.description.length > 50 ? '...' : ''}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-green-400 font-semibold">${roomType.base_price}</td>
                      <td className="py-4 px-4 text-gray-300">{roomType.capacity} {roomType.capacity === 1 ? 'guest' : 'guests'}</td>
                      <td className="py-4 px-4 text-gray-300">{roomType.bed_type || '-'}</td>
                      <td className="py-4 px-4 text-gray-300">{roomType.size_sqm || '-'}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          roomType.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          roomType.status === 'inactive' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {roomType.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenRoomTypeDialog(roomType)}
                            className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteRoomType(roomType.id)}
                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Add/Edit Branch Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-[#181d28] border-gray-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-2 bg-[#10141c]">
                <TabsTrigger 
                  value="info" 
                  className="text-gray-400 data-[state=active]:bg-amber-500 data-[state=active]:text-black data-[state=active]:font-semibold"
                >
                  Branch Information
                </TabsTrigger>
                <TabsTrigger 
                  value="images" 
                  className="text-gray-400 data-[state=active]:bg-amber-500 data-[state=active]:text-black data-[state=active]:font-semibold"
                >
                  <ImageIcon className="w-4 h-4 mr-2 inline" />
                  Images
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Branch Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  placeholder="e.g., Sky Nest Colombo"
                  required
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Location <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  placeholder="e.g., Colombo, Sri Lanka"
                  required
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none"
                  placeholder="Full address..."
                />
              </div>

              {/* Phone and Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    placeholder="+94 11 1234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    placeholder="branch@skynest.com"
                  />
                </div>
              </div>

              {/* Manager Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Manager Name</label>
                <input
                  type="text"
                  value={formData.manager_name}
                  onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  placeholder="e.g., John Doe"
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
                  placeholder="Brief description of the branch..."
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-amber-400 bg-gray-700 border-gray-600 rounded focus:ring-amber-400"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-300">
                  Branch is active and accepting bookings
                </label>
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
                      {editingBranch ? 'Update' : 'Create'} Branch
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
            </TabsContent>

            <TabsContent value="images" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-300">
                    <ImageIcon className="inline w-4 h-4 mr-1" />
                    Branch Images
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
                
                <div className="space-y-3 max-h-96 overflow-y-auto p-3 bg-[#10141c] border border-gray-700 rounded-lg">
                  {currentBranchImages.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No images added yet. Click "Add Image" to get started.
                    </p>
                  ) : (
                    currentBranchImages.map((image, index) => (
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
                              onChange={(e) => handleImageChange(index, 'imageUrl', e.target.value)}
                              className="w-full px-3 py-1.5 text-sm bg-[#10141c] border border-gray-600 rounded text-gray-300 focus:ring-2 focus:ring-amber-400"
                              placeholder="https://example.com/image.jpg or /uploads/branch1.jpg"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 block mb-1">Caption (Optional)</label>
                            <input
                              type="text"
                              value={image.caption || ''}
                              onChange={(e) => handleImageChange(index, 'caption', e.target.value)}
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
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="bg-red-600 hover:bg-red-700 text-white h-8 w-8 p-0 flex-shrink-0"
                          size="sm"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Tip: Use image hosting services like Imgur, Cloudinary, or upload to your server and paste the URL
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
                      {editingBranch ? 'Update' : 'Create'} Branch
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
            </TabsContent>
          </Tabs>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Room Type Dialog */}
        <Dialog open={showRoomTypeDialog} onOpenChange={setShowRoomTypeDialog}>
          <DialogContent className="bg-[#181d28] border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingRoomType ? 'Edit Room Type' : 'Add New Room Type'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Room Type Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={roomTypeFormData.name}
                  onChange={(e) => setRoomTypeFormData({ ...roomTypeFormData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  placeholder="e.g., Deluxe Suite, Standard Room"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={roomTypeFormData.description}
                  onChange={(e) => setRoomTypeFormData({ ...roomTypeFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none"
                  placeholder="Describe this room type..."
                />
              </div>

              {/* Base Price and Capacity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Base Price (per night) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={roomTypeFormData.base_price}
                      onChange={(e) => setRoomTypeFormData({ ...roomTypeFormData, base_price: e.target.value })}
                      className="w-full pl-8 pr-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      placeholder="100.00"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Capacity (guests) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={roomTypeFormData.capacity}
                    onChange={(e) => setRoomTypeFormData({ ...roomTypeFormData, capacity: e.target.value })}
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
                  <input
                    type="text"
                    value={roomTypeFormData.bed_type}
                    onChange={(e) => setRoomTypeFormData({ ...roomTypeFormData, bed_type: e.target.value })}
                    className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    placeholder="e.g., King, Queen, Twin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Size (sqm)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={roomTypeFormData.size_sqm}
                    onChange={(e) => setRoomTypeFormData({ ...roomTypeFormData, size_sqm: e.target.value })}
                    className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    placeholder="25.0"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={roomTypeFormData.status}
                  onChange={(e) => setRoomTypeFormData({ ...roomTypeFormData, status: e.target.value as 'active' | 'inactive' | 'archived' })}
                  className="w-full px-4 py-2 bg-[#10141c] border border-gray-700 rounded-lg text-gray-300 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSaveRoomType}
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
                  onClick={() => setShowRoomTypeDialog(false)}
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
  
  );
}
