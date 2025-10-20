'use client'

import { useState, useEffect, useRef } from 'react'
import { Camera, User, KeyRound, UploadCloud } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import CustomToast from '@/app/components/CustomToast';

// Reusable components matching the dashboard theme
const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[#181d28] border border-gray-800 rounded-xl ${className}`}>{children}</div>
);
const CardHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => <div className={`p-6 border-b border-gray-800 flex items-center space-x-4 ${className}`}>{children}</div>;
const CardContent = ({ children, className }: { children: React.ReactNode, className?: string }) => <div className={`p-6 ${className}`}>{children}</div>;
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`w-full p-3 bg-[#10141c] border border-gray-700 rounded-md focus:ring-2 focus:ring-amber-400 focus:border-amber-400 ${props.className}`} />
);
const Button = ({ children, className, ...props }: { children: React.ReactNode, className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} className={`px-6 py-2 bg-amber-400 text-black font-semibold rounded-md hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>{children}</button>
);

interface Profile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  position?: string;
  profile_picture: string;
  role: string;
  full_name: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    position: ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/auth/profile');
        const data = await response.json();
        
        if (response.ok && data.profile) {
          setProfile(data.profile);
          setFormData({
            first_name: data.profile.first_name || '',
            last_name: data.profile.last_name || '',
            phone: data.profile.phone || '',
            position: data.profile.position || ''
          });
        } else {
          setMessage({ type: 'error', text: 'Failed to load profile' });
        }
      } catch (error) {
        console.error('[SETTINGS] Error fetching profile:', error);
        setMessage({ type: 'error', text: 'Failed to load profile' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Please upload a JPEG, PNG, or WebP image' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 5MB' });
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarSave = async () => {
    if (!avatarPreview || !fileInputRef.current?.files?.[0]) return;

    setUploading(true);
    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload/profile-picture', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(prev => prev ? { ...prev, profile_picture: data.profile_picture } : null);
        setMessage({ type: 'success', text: 'Profile picture updated successfully!' });
        setIsModalOpen(false);
        setAvatarPreview(null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to upload image' });
      }
    } catch (error) {
      console.error('[SETTINGS] Upload error:', error);
      setMessage({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setUploading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(data.profile);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      console.error('[SETTINGS] Update error:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validate passwords
    if (passwordData.new_password.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.current_password,
          newPassword: passwordData.new_password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error) {
      console.error('[SETTINGS] Password change error:', error);
      setMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-400">Failed to load profile</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto text-gray-300">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400">Manage your account and system preferences.</p>
      </header>

      {message && (
        <CustomToast
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
        />
      )}

      <div className="space-y-8">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <User className="text-amber-400" />
            <h2 className="text-xl font-bold text-white">Profile Information</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate}>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group flex-shrink-0">
                  <Avatar className="w-24 h-24 border-2 border-gray-700">
                    <AvatarImage src={profile.profile_picture} alt={profile.full_name} />
                    <AvatarFallback>{profile.first_name?.[0]}{profile.last_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                      <button type="button" className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="text-white" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#181d28] border-gray-700 text-white">
                      <DialogHeader>
                        <DialogTitle>Change Profile Picture</DialogTitle>
                      </DialogHeader>
                      <div className="py-4 space-y-6">
                        <div className="flex justify-center">
                          <Avatar className="w-32 h-32 border-4 border-gray-600">
                            <AvatarImage src={avatarPreview || profile.profile_picture} />
                            <AvatarFallback>AV</AvatarFallback>
                          </Avatar>
                        </div>
                        <div 
                          className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-amber-400 hover:bg-white/5 transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/png, image/jpeg, image/webp"
                          />
                          <UploadCloud className="mx-auto text-gray-500 mb-2" size={32} />
                          <p className="text-sm text-gray-400">Click to upload or drag and drop</p>
                          <p className="text-xs text-gray-500">PNG, JPG, or WebP (max 5MB)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Button type="button" onClick={handleAvatarSave} disabled={!avatarPreview || uploading}>
                          {uploading ? 'Uploading...' : 'Save Changes'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-4 flex-grow w-full">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">First Name</label>
                      <Input 
                        type="text" 
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Last Name</label>
                      <Input 
                        type="text" 
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                    <Input type="email" value={profile.email} disabled className="opacity-50 cursor-not-allowed" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                      <Input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Position</label>
                      <Select 
                        value={formData.position} 
                        onValueChange={(value) => setFormData({ ...formData, position: value })}
                      >
                        <SelectTrigger className="w-full bg-[#10141c] border-gray-700 text-gray-300">
                          <SelectValue placeholder="Select Position" />
                        </SelectTrigger>
                        <SelectContent>
                          {profile.role === 'admin' && (
                            <>
                              <SelectItem value="System Administrator">System Administrator</SelectItem>
                              <SelectItem value="Hotel Manager">Hotel Manager</SelectItem>
                              <SelectItem value="Operations Manager">Operations Manager</SelectItem>
                              <SelectItem value="IT Administrator">IT Administrator</SelectItem>
                              <SelectItem value="General Manager">General Manager</SelectItem>
                            </>
                          )}
                          {profile.role === 'staff' && (
                            <>
                              <SelectItem value="Front Desk Manager">Front Desk Manager</SelectItem>
                              <SelectItem value="Receptionist">Receptionist</SelectItem>
                              <SelectItem value="Concierge">Concierge</SelectItem>
                              <SelectItem value="Housekeeping Manager">Housekeeping Manager</SelectItem>
                              <SelectItem value="Maintenance Staff">Maintenance Staff</SelectItem>
                              <SelectItem value="Guest Services">Guest Services</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-black/20 border-t border-gray-800 text-right mt-6 -mb-6 -mx-6">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Update Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <KeyRound className="text-amber-400" />
            <h2 className="text-xl font-bold text-white">Change Password</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Current Password</label>
                <Input 
                  type="password" 
                  placeholder="••••••••"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
                <Input 
                  type="password" 
                  placeholder="••••••••"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
                <Input 
                  type="password" 
                  placeholder="••••••••"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  required
                />
              </div>
              <div className="p-6 bg-black/20 border-t border-gray-800 text-right -mb-6 -mx-6 mt-6">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
