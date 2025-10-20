// app/admin/bookings/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Filter, ChevronDown } from 'lucide-react'
import React from 'react'
import gsap from 'gsap'

interface Booking {
  id: number;
  booking_reference: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  room_number: string;
  room_type: string;
  branch_name: string;
  branch_location: string;
  total_amount: number;
  paid_amount: number;
  check_in_date: string;
  check_out_date: string;
  status: string;
  special_requests: string;
  created_at: string;
}

interface BookingStats {
  total_bookings: number;
  pending: number;
  confirmed: number;
  checked_in: number;
  checked_out: number;
  cancelled: number;
  total_revenue: number;
  collected_revenue: number;
}

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[#181d28] border border-gray-800 rounded-xl ${className}`}>{children}</div>
);

const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return 'bg-blue-500/10 text-blue-400';
      case 'CheckedIn': return 'bg-green-500/10 text-green-400';
      case 'CheckedOut': return 'bg-gray-500/10 text-gray-400';
      case 'Cancelled': return 'bg-red-500/10 text-red-400';
      case 'Pending': return 'bg-yellow-500/10 text-yellow-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
};

const BookingRow = ({ booking, onCancel, onViewDetails }: { booking: Booking, onCancel: (id: number) => void, onViewDetails: (id: number) => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const detailsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isExpanded && detailsRef.current) {
            gsap.fromTo(detailsRef.current, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out' });
        } else {
            gsap.to(detailsRef.current, { height: 0, opacity: 0, duration: 0.2, ease: 'power2.in' });
        }
    }, [isExpanded]);

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    };

    const handleCancel = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to cancel this booking?')) {
        onCancel(booking.id);
      }
    };

    const handleViewDetails = (e: React.MouseEvent) => {
      e.stopPropagation();
      onViewDetails(booking.id);
    };
    
    return (
        <>
            <tr onClick={() => setIsExpanded(!isExpanded)} className="hover:bg-white/5 transition-colors cursor-pointer">
                <td className="px-6 py-4 text-sm font-medium text-white">{booking.booking_reference}</td>
                <td className="px-6 py-4 text-sm text-gray-300">{booking.guest_name}</td>
                <td className="px-6 py-4 text-sm text-gray-300">{booking.branch_name}</td>
                <td className="px-6 py-4 text-sm font-semibold text-green-400">${typeof booking.total_amount === 'number' ? booking.total_amount.toFixed(2) : parseFloat(booking.total_amount || '0').toFixed(2)}</td>
                <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>{booking.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                    <ChevronDown size={16} className={`text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </td>
            </tr>
            <tr>
                <td colSpan={6} className="p-0">
                    <div ref={detailsRef} className="bg-[#10141c] overflow-hidden" style={{ height: 0, opacity: 0 }}>
                        <div className="p-6 grid grid-cols-3 gap-6 text-sm text-gray-300">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-400 mb-2">Guest Information</h4>
                                <p><strong>Email:</strong> {booking.guest_email}</p>
                                <p><strong>Phone:</strong> {booking.guest_phone}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-400 mb-2">Stay Details</h4>
                                <p><strong>Room:</strong> {booking.room_number} ({booking.room_type})</p>
                                <p><strong>Check-in:</strong> {formatDate(booking.check_in_date)}</p>
                                <p><strong>Check-out:</strong> {formatDate(booking.check_out_date)}</p>
                                <p><strong>Paid:</strong> ${typeof booking.paid_amount === 'number' ? booking.paid_amount.toFixed(2) : parseFloat(booking.paid_amount || '0').toFixed(2)} / ${typeof booking.total_amount === 'number' ? booking.total_amount.toFixed(2) : parseFloat(booking.total_amount || '0').toFixed(2)}</p>
                                {booking.special_requests && (
                                  <p><strong>Requests:</strong> {booking.special_requests}</p>
                                )}
                            </div>
                            <div className="flex items-center justify-end space-x-3">
                                <button 
                                  onClick={handleCancel}
                                  className="px-4 py-2 text-sm font-semibold bg-red-500/20 text-red-300 rounded-md hover:bg-red-500/30"
                                >
                                  Cancel Booking
                                </button>
                                <button 
                                  onClick={handleViewDetails}
                                  className="px-4 py-2 text-sm font-semibold bg-amber-400/20 text-amber-300 rounded-md hover:bg-amber-400/30"
                                >
                                  View Details
                                </button>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        </>
    );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedBranch !== 'all') params.append('branchId', selectedBranch);
        if (selectedStatus !== 'all') params.append('status', selectedStatus);
        if (searchTerm) params.append('search', searchTerm);

        const response = await fetch(`/api/admin/bookings?${params.toString()}`);
        const data = await response.json();

        if (response.ok) {
          setBookings(data.bookings || []);
          setStats(data.stats);
        } else {
          console.error('[BOOKINGS] Error:', data.error);
        }
      } catch (error) {
        console.error('[BOOKINGS] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchBookings, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, selectedBranch, selectedStatus]);

  const handleCancelBooking = async (bookingId: number) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled' })
      });

      if (response.ok) {
        // Refresh bookings
        setBookings(prev => prev.map(b => 
          b.id === bookingId ? { ...b, status: 'Cancelled' } : b
        ));
        alert('Booking cancelled successfully');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('[BOOKINGS] Error cancelling booking:', error);
      alert('Failed to cancel booking');
    }
  };

  const handleViewDetails = (bookingId: number) => {
    // Navigate to booking details page or open modal
    window.location.href = `/admin/bookings/${bookingId}`;
  };

  return (
    
      <div className="max-w-7xl mx-auto text-gray-300">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white font-l">Manage Bookings</h1>
            <p className="text-gray-400">View, search, and manage all guest reservations.</p>
          </div>
          {stats && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-gray-400">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total_bookings}</p>
              </div>
              <div className="h-12 w-px bg-gray-700"></div>
              <div className="text-right">
                <p className="text-sm text-green-400">Collected Revenue</p>
                <p className="text-2xl font-bold text-green-400">${(Number(stats.collected_revenue) / 1000).toFixed(1)}K</p>
              </div>
            </div>
          )}
        </header>

        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Search by guest name, email, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#10141c] border border-gray-700 rounded-md text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full p-2 bg-[#10141c] border border-gray-700 rounded-md text-gray-300"
            >
              <option value="all">All Branches</option>
              {Array.from(new Set(bookings.map(b => b.branch_name))).map((branchName, index) => (
                <option key={`branch-${index}-${branchName}`} value={branchName}>{branchName}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 bg-[#10141c] border border-gray-700 rounded-md text-gray-300"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="CheckedIn">Checked In</option>
              <option value="CheckedOut">Checked Out</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </Card>

        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-gray-400">Loading bookings...</p>
          </Card>
        ) : (
        <Card>
          <div className="p-6 flex justify-between items-center border-b border-gray-800">
            <div className="relative w-1/3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input type="text" placeholder="Search by guest, ID, or room..." className="w-full bg-[#10141c] border border-gray-700 rounded-md pl-10 pr-4 py-2 focus:ring-amber-400 focus:border-amber-400" />
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-[#10141c] border border-gray-700 rounded-md hover:bg-gray-800">
              <Filter size={16} />
              <span>Filter</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-400">Booking ID</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-400">Guest</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-400">Branch</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-400">Amount</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-400">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {bookings.map(booking => (
                  <BookingRow 
                    key={booking.id} 
                    booking={booking}
                    onCancel={handleCancelBooking}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        )}
      </div>
  );
}


