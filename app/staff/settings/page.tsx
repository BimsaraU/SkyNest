'use client';

import { useState, useEffect, useRef } from 'react';
import StaffNavbar from '@/app/components/StaffNavbar';
import { User, Camera, Save, Lock, Mail, Phone, Shield, Briefcase, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_picture: string;
  full_name: string;
  position?: string;
  branch_id?: number;
  branch_name?: string;
  branch_location?: string;
  created_at: string;
  two_factor_enabled?: boolean;
}

export default function StaffSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [changingTwoFactor, setChangingTwoFactor] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/profile');
      const data = await response.json();

      if (response.ok) {
        setProfile(data.profile);
        setFirstName(data.profile.first_name);
        setLastName(data.profile.last_name);
        setPhone(data.profile.phone || '');
        setPosition(data.profile.position || '');
        setTwoFactorEnabled(data.profile.two_factor_enabled || false);
      } else {
        setMessage({ type: 'error', text: 'Failed to load profile' });
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone
          // position removed - cannot be changed by staff
        })
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(data.profile);
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Please upload a valid image file (JPEG, PNG, WebP)' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 5MB' });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/profile-picture', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(prev => prev ? { ...prev, profile_picture: data.profile_picture } : null);
        setMessage({ type: 'success', text: 'Profile picture updated!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to upload image' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while uploading' });
    } finally {
      setUploading(false);
    }
  };

  const handleTwoFactorToggle = async () => {
    setChangingTwoFactor(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/auth/profile/two-factor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !twoFactorEnabled })
      });

      const data = await response.json();

      if (response.ok) {
        setTwoFactorEnabled(!twoFactorEnabled);
        setMessage({ 
          type: 'success', 
          text: `Two-factor authentication ${!twoFactorEnabled ? 'enabled' : 'disabled'} successfully!` 
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update 2FA settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating 2FA' });
    } finally {
      setChangingTwoFactor(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <StaffNavbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <StaffNavbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Account Settings</h1>
          <p className="text-gray-400">Manage your profile and account preferences</p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' :
            'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Profile Picture Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <User className="text-amber-400" />
            Profile Picture
          </h2>
          
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-700 border-4 border-amber-400">
                {profile?.profile_picture ? (
                  <Image
                    src={profile.profile_picture}
                    alt="Profile"
                    width={128}
                    height={128}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={48} className="text-gray-400" />
                  </div>
                )}
              </div>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-amber-400 text-gray-900 p-3 rounded-full hover:bg-amber-500 transition-all shadow-lg disabled:opacity-50"
              >
                <Camera size={20} />
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-white">{profile?.full_name}</h3>
              <p className="text-gray-400">{profile?.email}</p>
              {profile?.position && (
                <p className="text-amber-400 mt-1 flex items-center gap-1">
                  <Briefcase size={16} />
                  {profile.position}
                </p>
              )}
              {profile?.branch_name && (
                <p className="text-gray-400 mt-1 flex items-center gap-1">
                  <MapPin size={16} />
                  {profile.branch_name}, {profile.branch_location}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <form onSubmit={handleProfileUpdate} className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Mail className="text-amber-400" />
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-300 mb-2">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-amber-400 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 text-gray-300 mb-2">
              <Phone size={16} />
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-amber-400 focus:outline-none"
              placeholder="+94 77 123 4567"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 text-gray-300 mb-2">
              <Briefcase size={16} />
              Position/Role
            </label>
            <input
              type="text"
              value={position}
              readOnly
              disabled
              className="w-full px-4 py-2 bg-gray-700/50 text-gray-400 rounded-lg border border-gray-700 cursor-not-allowed"
              placeholder="Assigned by administration"
            />
            <p className="text-xs text-gray-500 mt-1">Your role can only be changed by administrators</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-amber-400 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-amber-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {/* Change Password */}
        <form onSubmit={handlePasswordChange} className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Lock className="text-amber-400" />
            Change Password
          </h2>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-amber-400 focus:outline-none"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-amber-400 focus:outline-none"
              minLength={8}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-amber-400 focus:outline-none"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
          >
            <Shield size={20} />
            Update Password
          </button>
        </form>

        {/* Two-Factor Authentication */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="text-amber-400" />
            Two-Factor Authentication
          </h2>

          <div className="mb-6">
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700 mb-4">
              <div className="flex items-center space-x-3">
                {twoFactorEnabled ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-gray-500" />
                )}
                <div>
                  <p className="font-medium text-white">2FA Status</p>
                  <p className="text-sm text-gray-400">
                    {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-gray-400 mb-4">
              Two-factor authentication adds an extra layer of security to your account by requiring a verification code when you sign in.
            </p>

            <button
              onClick={handleTwoFactorToggle}
              disabled={changingTwoFactor}
              className={`w-full px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                twoFactorEnabled 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-amber-400 hover:bg-amber-500 text-gray-900'
              }`}
            >
              <Shield size={20} />
              {changingTwoFactor ? 'Please wait...' : twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
