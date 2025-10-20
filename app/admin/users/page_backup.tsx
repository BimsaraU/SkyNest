// app/admin/users/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, UserPlus, Trash2, Edit, CheckCircle, XCircle, Clock } from 'lucide-react'

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: boolean;
  position?: string;
  branch_name?: string;
  joined_date: string;
  last_login: string;
}

interface UserStats {
  active_admins: number;
  active_staff: number;
  active_guests: number;
  total_admins: number;
  total_staff: number;
  total_guests: number;
}

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[#181d28] border border-gray-800 rounded-xl ${className}`}>{children}</div>
);

const getStatusColor = (status: boolean) => {
    return status ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400';
};

const getRoleBadge = (role: string) => {
    if (role === 'admin') return 'bg-red-500/10 text-red-400';
    if (role === 'staff') return 'bg-blue-500/10 text-blue-400';
    if (role === 'guest') return 'bg-purple-500/10 text-purple-400';
    return 'bg-gray-500/10 text-gray-400';
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterRole !== 'all') params.append('role', filterRole);
        if (searchQuery) params.append('search', searchQuery);

        const response = await fetch(`/api/admin/users?${params.toString()}`);
        const data = await response.json();

        if (response.ok) {
          setUsers(data.users || []);
          setStats(data.stats);
        } else {
          console.error('[USERS] Error:', data.error);
        }
      } catch (error) {
        console.error('[USERS] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [filterRole, searchQuery]);
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (

        <div className="max-w-7xl mx-auto text-gray-300">
          <header className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white font-l">User Management</h1>
              <p className="text-gray-400">Manage all system users including guests, staff, and administrators.</p>
            </div>
            <div className="flex items-center gap-4">
              {stats && (
                <div className="text-right mr-4">
                  <p className="text-sm text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white">
                    {stats.total_admins + stats.total_staff + stats.total_guests}
                  </p>
                </div>
              )}
              <button className="flex items-center space-x-2 px-4 py-2 bg-amber-400 text-black font-semibold rounded-md hover:bg-amber-500 transition-colors">
                <UserPlus size={16} />
                <span>Add User</span>
              </button>
            </div>
          </header>

          <Card>
            <div className="p-6 flex flex-wrap gap-4 items-center justify-between border-b border-gray-800">
                <div className="flex space-x-2 bg-[#10141c] p-1 rounded-md">
                    <button onClick={() => setFilterRole('all')} className={`px-3 py-1 text-sm font-medium rounded ${filterRole === 'all' ? 'bg-amber-400 text-black' : 'text-gray-400'}`}>All</button>
                    <button onClick={() => setFilterRole('guest')} className={`px-3 py-1 text-sm font-medium rounded ${filterRole === 'guest' ? 'bg-amber-400 text-black' : 'text-gray-400'}`}>Guests</button>
                    <button onClick={() => setFilterRole('staff')} className={`px-3 py-1 text-sm font-medium rounded ${filterRole === 'staff' ? 'bg-amber-400 text-black' : 'text-gray-400'}`}>Staff</button>
                    <button onClick={() => setFilterRole('admin')} className={`px-3 py-1 text-sm font-medium rounded ${filterRole === 'admin' ? 'bg-amber-400 text-black' : 'text-gray-400'}`}>Admins</button>
                </div>
                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-[#10141c] border border-gray-700 rounded-md pl-10 pr-4 py-2 focus:ring-amber-400 focus:border-amber-400" />
                </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-400">User</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-400">Role</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-400">Status</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-400">Last Login</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {loading ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading users...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No users found</td></tr>
                  ) : (
                    users.map(user => (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.phone && <p className="text-xs text-gray-600">{user.phone}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                            {user.role}
                          </span>
                          {user.position && <p className="text-xs text-gray-500 mt-1">{user.position}</p>}
                          {user.branch_name && <p className="text-xs text-gray-500 mt-1">{user.branch_name}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                            {user.status ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">{formatDate(user.last_login)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <button className="p-2 text-gray-400 hover:text-amber-400"><Edit size={16}/></button>
                            <button className="p-2 text-gray-400 hover:text-red-400"><Trash2 size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
  )
}
