'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { ArrowUpDown, XCircle, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import CustomToast from '@/app/components/CustomToast';

interface Room {
  id: number;
  room_number: string;
  status: string;
  branch_id: number;
  branch_name: string;
  branch_location: string;
  room_type_id: number;
  room_type_name: string;
  base_price: number;
  capacity: number;
  bed_type: string;
  size_sqm: number;
}

interface RoomStats {
  total_rooms: number;
  available: number;
  occupied: number;
  maintenance: number;
  cleaning: number;
}

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[#181d28] border border-gray-800 rounded-xl ${className}`}>{children}</div>
);

const FilterButton = ({ label, value, activeValue, onClick }: { label: string, value: string, activeValue: string, onClick: (value: string) => void }) => (
    <button onClick={() => onClick(value)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${activeValue === value ? 'bg-amber-400 text-black shadow-md' : 'text-gray-400 hover:bg-white/5'}`}>
        {label}
    </button>
);

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<RoomStats>({ total_rooms: 0, available: 0, occupied: 0, maintenance: 0, cleaning: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Room; direction: 'ascending' | 'descending' }>({ key: 'room_number', direction: 'ascending' });
  
  // Status edit modal state
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Fetch rooms data
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedBranch !== 'all') params.append('branchId', selectedBranch);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      
      const response = await fetch(`/api/admin/rooms/list?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setRooms(data.rooms || []);
        setStats(data.stats || { total_rooms: 0, available: 0, occupied: 0, maintenance: 0, cleaning: 0 });
      } else {
        console.error('[ROOMS] Error:', data.error);
      }
    } catch (error) {
      console.error('[ROOMS] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedBranch, selectedStatus]);

  const handleEditStatus = (room: Room) => {
    setEditingRoom(room);
    setNewStatus(room.status);
    setShowEditModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!editingRoom) return;

    setUpdating(true);

    try {
      console.log('[ROOMS] Updating room status:', { id: editingRoom.id, newStatus });
      const response = await fetch(`/api/admin/rooms/${editingRoom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      console.log('[ROOMS] Response status:', response.status);
      const data = await response.json();
      console.log('[ROOMS] Response data:', data);

      if (response.ok) {
        // Update local state
        setRooms(rooms.map(r => r.id === editingRoom.id ? { ...r, status: newStatus } : r));
        setMessage({ type: 'success', text: 'Room status updated successfully!' });
        setShowEditModal(false);
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
        
        // Refresh data to sync with backend
        await fetchRooms();
      } else {
        console.error('[ROOMS] Update failed:', data.error);
        setMessage({ type: 'error', text: data.error || 'Failed to update room status' });
        // Auto-hide error message after 5 seconds
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error) {
      console.error('[ROOMS] Update error:', error);
      setMessage({ type: 'error', text: `Error: ${(error as Error).message}` });
      // Auto-hide error message after 5 seconds
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Occupied': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'Available': return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'Maintenance': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
  };
  
  const processedRooms = useMemo(() => {
    let filtered = [...rooms];

    // Filter by room type (client-side)
    if (selectedType !== 'all') {
        filtered = filtered.filter(room => room.room_type_name === selectedType);
    }

    // Sorting
    filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aVal > bVal) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
    });

    return filtered;
  }, [rooms, selectedType, sortConfig]);

  const requestSort = (key: keyof Room) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  // Get unique room types from loaded rooms
  const roomTypes = ['all', ...Array.from(new Set(rooms.map(r => r.room_type_name)))];
  const statuses = ['all', 'Available', 'Occupied', 'Maintenance', 'Cleaning'];

  const clearFilters = () => {
    setSelectedBranch('all');
    setSelectedType('all');
    setSelectedStatus('all');
    setSortConfig({ key: 'room_number', direction: 'ascending' });
  };

  return (
    <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Room Management</h1>
            <p className="text-gray-400">View, filter, and sort rooms across all hotel branches.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-400">Total Rooms</p>
              <p className="text-2xl font-bold text-white">{stats.total_rooms}</p>
            </div>
            <div className="h-12 w-px bg-gray-700"></div>
            <div className="text-right">
              <p className="text-sm text-green-400">Available</p>
              <p className="text-2xl font-bold text-green-400">{stats.available}</p>
            </div>
          </div>
        </header>

        <Card className="p-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Filter by Branch</label>
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger className="w-full bg-[#10141c] border-gray-700 text-gray-300">
                        <SelectValue placeholder="All Branches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        {Array.from(
                          new Map(rooms.map(r => [r.branch_id, { id: r.branch_id, name: r.branch_name }])).values()
                        ).map(branch => (
                          <SelectItem key={branch.id} value={branch.id.toString()}>{branch.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Filter by Status</label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-full bg-[#10141c] border-gray-700 text-gray-300">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map(status => (
                          <SelectItem key={status} value={status}>{status === 'all' ? 'All Statuses' : status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Filter by Room Type</label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="w-full bg-[#10141c] border-gray-700 text-gray-300">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map(type => (
                          <SelectItem key={type} value={type}>{type === 'all' ? 'All Types' : type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
            </div>
            {(selectedBranch !== 'all' || selectedType !== 'all' || selectedStatus !== 'all') && (
                <div className="mt-4 flex justify-end">
                    <button onClick={clearFilters} className="flex items-center space-x-2 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                        <XCircle size={14} />
                        <span>Clear all filters</span>
                    </button>
                </div>
            )}
        </Card>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-gray-400">Loading rooms...</p>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-800">
                  <tr>
                    {(['room_number', 'branch_name', 'room_type_name', 'status', 'base_price'] as const).map(key => (
                       <th key={key} className="px-6 py-4 text-sm font-semibold text-gray-400">
                         <button onClick={() => requestSort(key)} className="flex items-center space-x-2 group">
                           <span>{key === 'room_number' ? 'Room' : key === 'branch_name' ? 'Branch' : key === 'room_type_name' ? 'Type' : key === 'base_price' ? 'Price' : key.charAt(0).toUpperCase() + key.slice(1)}</span>
                           <ArrowUpDown size={14} className={`transition-opacity ${sortConfig.key === key ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'}`} />
                         </button>
                       </th>
                    ))}
                    <th className="px-6 py-4 text-sm font-semibold text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {processedRooms.map((room, index) => (
                    <motion.tr 
                      key={room.id} 
                      className="hover:bg-white/5 transition-colors"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-white">{room.room_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{room.branch_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{room.room_type_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>{room.status}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">${room.base_price}/night</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleEditStatus(room)}
                          className="px-3 py-1.5 bg-amber-400/10 text-amber-400 hover:bg-amber-400 hover:text-black rounded-md transition-colors flex items-center space-x-1"
                        >
                          <Edit size={14} />
                          <span className="text-xs font-medium">Edit Status</span>
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {processedRooms.length === 0 && (
                  <div className="text-center py-12">
                      <p className="text-gray-400">No rooms match the current filters.</p>
                  </div>
              )}
            </div>
          </Card>
        )}

        {/* Status Edit Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="bg-[#181d28] border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">
                Edit Room Status - {editingRoom?.room_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Status: <span className={`px-2 py-1 rounded text-xs ${getStatusColor(editingRoom?.status || '')}`}>{editingRoom?.status}</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-3 bg-[#10141c] border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-amber-400"
                >
                  <option value="Available">Available</option>
                  <option value="Occupied">Occupied</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Cleaning">Cleaning</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleUpdateStatus}
                  disabled={updating || newStatus === editingRoom?.status}
                  className="flex-1 px-6 py-2 bg-amber-400 text-black font-semibold rounded-md hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-6 py-2 bg-gray-700 text-white font-semibold rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Toast Message */}
        {message && (
          <CustomToast
            message={message.text}
            type={message.type}
            onClose={() => setMessage(null)}
          />
        )}
      </div>
  );
}
