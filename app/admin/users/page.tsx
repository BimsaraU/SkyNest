// app/admin/users/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Search, UserPlus, Trash2, Edit, X, Building2 } from 'lucide-react'

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: boolean;
  position?: string;
  branch_name?: string;
  branch_id?: number;
  joined_date: string;
  last_login: string;
  first_name?: string;
  last_name?: string;
  employee_id?: string;  // Added for staff members
}

interface UserStats {
  active_admins: number;
  active_staff: number;
  active_guests: number;
  total_admins: number;
  total_staff: number;
  total_guests: number;
}

interface Branch {
  id: number;
  name: string;
}

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[#181d28] border border-gray-800 rounded-xl ${className}`}>{children}</div>
);

const Modal = ({ children, isOpen, onClose }: { children: React.ReactNode, isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#181d28] border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={`w-full p-3 bg-[#10141c] border border-gray-700 rounded-md focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-white ${props.className}`} />
);

const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={`w-full p-3 bg-[#10141c] border border-gray-700 rounded-md focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-white ${props.className}`}>
    {children}
  </select>
);

const Button = ({ children, variant = 'primary', ...props }: { children: React.ReactNode, variant?: 'primary' | 'secondary' | 'danger' } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const variants = {
    primary: 'bg-amber-400 text-black hover:bg-amber-500',
    secondary: 'bg-gray-700 text-white hover:bg-gray-600',
    danger: 'bg-red-500 text-white hover:bg-red-600'
  };
  
  return (
    <button {...props} className={`px-4 py-2 font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${props.className}`}>
      {children}
    </button>
  );
};

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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [nextStaffId, setNextStaffId] = useState<string>('');
  const [loadingStaffId, setLoadingStaffId] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'guest',
    position: '',
    branch_id: '',
    is_active: true
  });

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch('/api/branches');
        if (response.ok) {
          const data = await response.json();
          setBranches(data.branches || []);
        }
      } catch (error) {
        console.error('[USERS] Error fetching branches:', error);
      }
    };
    fetchBranches();
  }, []);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        if (filterRole !== 'all') params.append('role', filterRole);
        if (searchQuery) params.append('search', searchQuery);

        const response = await fetch(`/api/admin/users?${params.toString()}`);
        const data = await response.json();

        if (response.ok) {
          setUsers(data.users || []);
          setStats(data.stats);
        } else {
          setError(data.error || 'Failed to fetch users');
          console.error('[USERS] Error:', data);
        }
      } catch (error) {
        setError('Network error - please check your connection');
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

  const handleAddUser = async () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      password: '',
      role: 'guest',
      position: '',
      branch_id: '',
      is_active: true
    });
    setNextStaffId('');
    setIsAddModalOpen(true);
  };

  // Fetch next staff ID when role changes to staff
  const fetchNextStaffId = async () => {
    try {
      setLoadingStaffId(true);
      const response = await fetch('/api/admin/staff/next-id');
      if (response.ok) {
        const data = await response.json();
        setNextStaffId(data.employee_id);
      }
    } catch (error) {
      console.error('[USERS] Error fetching next staff ID:', error);
    } finally {
      setLoadingStaffId(false);
    }
  };

  // Watch for role changes to staff
  useEffect(() => {
    if (formData.role === 'staff' && isAddModalOpen && !isEditModalOpen) {
      fetchNextStaffId();
    } else if (formData.role !== 'staff') {
      setNextStaffId('');
    }
  }, [formData.role, isAddModalOpen, isEditModalOpen]);

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email,
      phone: user.phone || '',
      password: '',
      role: user.role,
      position: user.position || '',
      branch_id: user.branch_id?.toString() || '',
      is_active: user.status
    });
    setIsEditModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = isEditModalOpen 
        ? `/api/admin/users/${selectedUser?.id}`
        : '/api/admin/users';
      
      const method = isEditModalOpen ? 'PUT' : 'POST';
      
      const payload: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        is_active: formData.is_active
      };

      // Add password only if provided (and for new users)
      if (formData.password || !isEditModalOpen) {
        payload.password = formData.password;
      }

      // Add role-specific fields
      if (formData.role === 'admin' || formData.role === 'staff') {
        payload.position = formData.position;
      }
      
      if (formData.role === 'staff' && formData.branch_id) {
        payload.branch_id = parseInt(formData.branch_id);
        // Add the generated employee_id if creating a new staff member
        if (!isEditModalOpen && nextStaffId) {
          payload.employee_id = nextStaffId;
        }
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        // Refresh users list
        const refreshResponse = await fetch(`/api/admin/users?role=${filterRole}`);
        const refreshData = await refreshResponse.json();
        if (refreshResponse.ok) {
          setUsers(refreshData.users || []);
          setStats(refreshData.stats);
        }
        
        // Close modal
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
      } else {
        setError(data.error || 'Failed to save user');
      }
    } catch (error) {
      setError('Network error - please try again');
      console.error('[USERS] Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) return;

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: user.role })
      });

      if (response.ok) {
        // Refresh users list
        const refreshResponse = await fetch(`/api/admin/users?role=${filterRole}`);
        const refreshData = await refreshResponse.json();
        if (refreshResponse.ok) {
          setUsers(refreshData.users || []);
          setStats(refreshData.stats);
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete user');
      }
    } catch (error) {
      setError('Network error - please try again');
      console.error('[USERS] Delete error:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto text-gray-300">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">User Management</h1>
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
          <button 
            onClick={handleAddUser}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-400 text-black font-semibold rounded-md hover:bg-amber-500 transition-colors"
          >
            <UserPlus size={16} />
            <span>Add User</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

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
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full bg-[#10141c] border border-gray-700 rounded-md pl-10 pr-4 py-2 focus:ring-amber-400 focus:border-amber-400 text-white" 
            />
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
                  <tr key={`${user.role}-${user.id}`} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-white">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.phone && <p className="text-xs text-gray-600">{user.phone}</p>}
                      {user.employee_id && user.role === 'staff' && (
                        <p className="text-xs text-blue-400 mt-1 font-mono">ID: {user.employee_id}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                      {user.position && <p className="text-xs text-gray-500 mt-1">{user.position}</p>}
                      {user.branch_name && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Building2 size={12} /> {user.branch_name}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                        {user.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{formatDate(user.last_login)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="px-3 py-1.5 text-sm text-gray-300 bg-amber-400/10 hover:bg-amber-400 hover:text-black border border-amber-400/20 hover:border-amber-400 rounded-md transition-all duration-200 flex items-center gap-2"
                        >
                          <Edit size={14}/>
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user)}
                          className="px-3 py-1.5 text-sm text-red-400 bg-red-400/10 hover:bg-red-500 hover:text-white border border-red-400/20 hover:border-red-500 rounded-md transition-all duration-200 flex items-center gap-2 font-medium"
                        >
                          <Trash2 size={14}/>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit User Modal */}
      <Modal isOpen={isAddModalOpen || isEditModalOpen} onClose={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {isEditModalOpen ? 'Edit User' : 'Add New User'}
          </h2>
          <button 
            onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name fields - side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">First Name</label>
              <Input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Last Name</label>
              <Input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Email and Phone - side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isEditModalOpen}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          {/* Password - full width */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Password {isEditModalOpen && '(leave blank to keep current)'}
            </label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!isEditModalOpen}
              minLength={8}
            />
          </div>

          {/* Role and Position - side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Role</label>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="guest">Guest</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </Select>
            </div>

            {(formData.role === 'admin' || formData.role === 'staff') && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Position</label>
                <Select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  required
                >
                  <option value="">Select Position</option>
                  <option value="General Manager">General Manager</option>
                  <option value="Assistant Manager">Assistant Manager</option>
                  <option value="Front Desk Manager">Front Desk Manager</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Concierge">Concierge</option>
                  <option value="Housekeeping Manager">Housekeeping Manager</option>
                  <option value="Housekeeping Supervisor">Housekeeping Supervisor</option>
                  <option value="Room Attendant">Room Attendant</option>
                  <option value="Maintenance Manager">Maintenance Manager</option>
                  <option value="Maintenance Technician">Maintenance Technician</option>
                  <option value="Maintenance Staff">Maintenance Staff</option>
                  <option value="Security Manager">Security Manager</option>
                  <option value="Security Officer">Security Officer</option>
                  <option value="IT Manager">IT Manager</option>
                  <option value="IT Support">IT Support</option>
                  <option value="Accountant">Accountant</option>
                  <option value="HR Manager">HR Manager</option>
                </Select>
              </div>
            )}
          </div>

          {formData.role === 'staff' && (
            <>
              {!isEditModalOpen && nextStaffId && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-blue-400 mb-1">
                        Auto-Generated Staff ID
                      </label>
                      <p className="text-xl font-bold text-white">{nextStaffId}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        This ID will be automatically assigned
                      </p>
                    </div>
                    {loadingStaffId && (
                      <div className="text-blue-400 animate-pulse">Loading...</div>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Branch</label>
                <Select
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                  required
                >
                  <option value="">Select Branch</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </Select>
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-amber-400 bg-[#10141c] border-gray-700 rounded focus:ring-amber-400"
            />
            <label htmlFor="is_active" className="text-sm text-gray-400">Active User</label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : (isEditModalOpen ? 'Update User' : 'Create User')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
