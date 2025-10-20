'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No reset token provided. Please request a new password reset link.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
        setError("Missing token.");
        return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/admin-login/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: formData.password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }
      setSuccess(true);
      setTimeout(() => router.push('/auth/admin-login'), 3000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  if (success) {
    return (
      <Card className="bg-[#181d28]/80 border-gray-800 text-gray-300 text-center">
        <CardHeader>
            <div className="mx-auto bg-green-500/10 p-3 rounded-full w-fit"><CheckCircle className="text-green-400" size={32}/></div>
            <CardTitle className="text-2xl font-bold text-white font-l mt-4">Password Reset Successful</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-gray-400">Your password has been updated. You will be redirected to the login page shortly.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#181d28]/80 border-gray-800 text-gray-300">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white font-l">Set New Password</CardTitle>
        <CardDescription>Enter and confirm your new password.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className='mb-4'>
            <div className="h-6 mb-4">{error && <div className="text-red-400 text-sm flex items-center"><AlertTriangle size={16} className="mr-2"/>{error}</div>}</div>
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                        <Input id="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} required />
                </div>
            </div>
        </CardContent>
        <CardFooter>
            <Button type="submit" className="w-full font-bold" disabled={isLoading || !token}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Reset Password</Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-[#10141c] text-gray-300">
            <div className="relative min-h-screen flex">
                <div className="bg-[url('/ABG.jpg')] bg-cover bg-center bg-no-repeat hidden lg:flex lg:w-1/2 flex-col justify-center px-12 text-white relative">
                    <div className="absolute top-30 left-8"><Image src="/Skyad.png" alt="Sky Nest Admin" width={400} height={50} /></div>
                    <div className="max-w-md">
                        <h1 className="text-6xl font-semibold mb-4 leading-tight font-l">Administrative<span className="text-4xl block text-amber-400">Control Center</span></h1>
                    </div>
                </div>
                <div className="bg-gradient-to-r from-black/20 to-transparent w-full lg:w/2 flex items-center justify-center p-8">
                    <div className="w-full max-w-md">
                        <Suspense fallback={<Loader2 className="w-16 h-16 animate-spin" />}>
                           <ResetPasswordForm />
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}
