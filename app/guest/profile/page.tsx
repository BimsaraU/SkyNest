'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GuestNavbar from '@/app/components/GuestNavbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Mail, Phone, MapPin, Calendar, CreditCard, Globe, Award, Camera, Lock, Shield, Loader2 } from 'lucide-react'

interface GuestProfile {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string | null
  profile_picture: string
  address: string | null
  date_of_birth: string | null
  nationality: string | null
  passport_number: string | null
  preferences: string | null
  loyalty_points: number
  is_verified: boolean
  created_at: string
  two_factor_enabled?: boolean
}

interface CustomToastProps {
  message: string
  type: 'success' | 'error' | 'info'
}

const CustomToast = ({ message, type }: CustomToastProps) => (
  <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
    type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  } text-white animate-slide-in-right`}>
    {message}
  </div>
)

export default function GuestProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<GuestProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<CustomToastProps | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    date_of_birth: '',
    nationality: '',
    passport_number: '',
    preferences: ''
  })
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [changingPassword, setChangingPassword] = useState(false)
  
  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [toggling2FA, setToggling2FA] = useState(false)
  
  // Profile picture state
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/profile')
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/login')
          return
        }
        throw new Error('Failed to fetch profile')
      }
      const data = await response.json()
      setProfile(data.profile)
      setFormData({
        first_name: data.profile.first_name || '',
        last_name: data.profile.last_name || '',
        phone: data.profile.phone || '',
        address: data.profile.address || '',
        date_of_birth: data.profile.date_of_birth || '',
        nationality: data.profile.nationality || '',
        passport_number: data.profile.passport_number || '',
        preferences: data.profile.preferences || ''
      })
      setTwoFactorEnabled(data.profile.two_factor_enabled || false)
      setImagePreview(data.profile.profile_picture)
    } catch (error) {
      showMessage('Failed to load profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage({ message: msg, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value })
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) throw new Error('Failed to update profile')
      
      const data = await response.json()
      setProfile(data.profile)
      showMessage('Profile updated successfully!', 'success')
    } catch (error) {
      showMessage('Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      showMessage('New passwords do not match', 'error')
      return
    }
    
    if (passwordData.new_password.length < 8) {
      showMessage('Password must be at least 8 characters', 'error')
      return
    }
    
    try {
      setChangingPassword(true)
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to change password')
      }
      
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
      showMessage('Password changed successfully!', 'success')
    } catch (error) {
      showMessage((error as Error).message, 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      showMessage('Please select an image file', 'error')
      return
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showMessage('Image must be less than 5MB', 'error')
      return
    }
    
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/upload/profile-picture', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) throw new Error('Failed to upload image')
      
      const data = await response.json()
      setImagePreview(data.url)
      
      // Update profile with new picture
      const updateResponse = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_picture: data.url })
      })
      
      if (updateResponse.ok) {
        showMessage('Profile picture updated!', 'success')
        fetchProfile()
      }
    } catch (error) {
      showMessage('Failed to upload image', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleToggle2FA = async () => {
    try {
      setToggling2FA(true)
      const response = await fetch('/api/auth/profile/two-factor', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !twoFactorEnabled })
      })
      
      if (!response.ok) throw new Error('Failed to toggle 2FA')
      
      setTwoFactorEnabled(!twoFactorEnabled)
      showMessage(`Two-factor authentication ${!twoFactorEnabled ? 'enabled' : 'disabled'}!`, 'success')
    } catch (error) {
      showMessage('Failed to toggle 2FA', 'error')
    } finally {
      setToggling2FA(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-t from-amber-700/40 to-amber-50">
        <GuestNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 text-amber-600 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-t from-amber-700/40 to-amber-50">
      <GuestNavbar />
      
      {message && <CustomToast message={message.message} type={message.type} />}
      
      <main className="max-w-7xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 font-l">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Profile Picture & Stats */}
          <div className="space-y-6">
            {/* Profile Picture Card */}
            <Card className="bg-white/80 backdrop-blur-lg border border-gray-200/80 rounded-2xl shadow-xl">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-amber-400 shadow-lg">
                      <img
                        src={imagePreview || profile?.profile_picture || '/uploads/profile-pictures/default-guest.png'}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <label
                      htmlFor="profile-picture"
                      className="absolute bottom-0 right-0 bg-amber-500 text-white p-2 rounded-full cursor-pointer hover:bg-amber-600 transition-colors shadow-lg"
                    >
                      <Camera size={18} />
                      <input
                        id="profile-picture"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleProfilePictureUpload}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mt-4">
                    {profile?.first_name} {profile?.last_name}
                  </h2>
                  <p className="text-gray-600 text-sm">{profile?.email}</p>
                  {profile?.is_verified && (
                    <span className="mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      ✓ Verified
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Loyalty Points Card */}
            <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl shadow-xl">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-sm font-medium">Loyalty Points</p>
                    <p className="text-4xl font-bold mt-1">{profile?.loyalty_points || 0}</p>
                  </div>
                  <Award size={48} className="text-amber-200" />
                </div>
                <p className="text-amber-100 text-xs mt-3">
                  Member since {new Date(profile?.created_at || '').toLocaleDateString()}
                </p>
              </CardContent>
            </Card>

            {/* Security Card */}
            <Card className="bg-white/80 backdrop-blur-lg border border-gray-200/80 rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
                  <Shield className="mr-2 text-amber-600" size={20} />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      twoFactorEnabled ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {twoFactorEnabled ? (
                        <Shield className="text-green-600" size={20} />
                      ) : (
                        <Shield className="text-gray-400" size={20} />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Two-Factor Auth</p>
                      <p className="text-xs text-gray-500">
                        {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggle2FA}
                    disabled={toggling2FA}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      twoFactorEnabled
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    } disabled:opacity-50`}
                  >
                    {toggling2FA ? 'Processing...' : twoFactorEnabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Forms */}
          <div className="md:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="bg-white/80 backdrop-blur-lg border border-gray-200/80 rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User size={16} className="inline mr-1" />
                        First Name
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User size={16} className="inline mr-1" />
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone size={16} className="inline mr-1" />
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar size={16} className="inline mr-1" />
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin size={16} className="inline mr-1" />
                      Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Globe size={16} className="inline mr-1" />
                        Nationality
                      </label>
                      <input
                        type="text"
                        name="nationality"
                        value={formData.nationality}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <CreditCard size={16} className="inline mr-1" />
                        Passport Number
                      </label>
                      <input
                        type="text"
                        name="passport_number"
                        value={formData.passport_number}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferences & Special Requests
                    </label>
                    <textarea
                      name="preferences"
                      value={formData.preferences}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none resize-none"
                      placeholder="e.g., Ground floor rooms, extra pillows, non-smoking..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="bg-white/80 backdrop-blur-lg border border-gray-200/80 rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                  <Lock className="mr-2 text-amber-600" size={20} />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      name="current_password"
                      value={passwordData.current_password}
                      onChange={handlePasswordChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                      required
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="new_password"
                        value={passwordData.new_password}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                        required
                        minLength={8}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirm_password"
                        value={passwordData.confirm_password}
                        onChange={handlePasswordChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={changingPassword}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      {changingPassword ? 'Changing...' : 'Change Password'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
