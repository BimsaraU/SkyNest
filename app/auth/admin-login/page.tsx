'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, ShieldCheck, Loader2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import gsap from 'gsap'
import { useAuth } from '@/app/hooks/useAuth'

export default function AdminLoginPage() {
  const [formData, setFormData] = useState({ email: '', password: '', twoFactorCode: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  
  const router = useRouter();
  const formContainerRef = useRef<HTMLDivElement>(null);
  const { user, loading } = useAuth();

  // Redirect if already logged in as admin
  useEffect(() => {
    if (!loading && user && user.userType === 'ADMIN') {
      router.push('/admin/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (formContainerRef.current) {
        gsap.to(formContainerRef.current, {
            height: show2FA ? formContainerRef.current.scrollHeight : 'auto',
            duration: 0.5,
            ease: 'power3.inOut'
        });
    }
  }, [show2FA]);

  // Cooldown timer for resend OTP
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
        const endpoint = '/api/auth/admin-login';
        
        let payload;
        if (!show2FA) {
            payload = { email: formData.email, password: formData.password };
        } else {
            payload = { email: formData.email, twoFactorCode: formData.twoFactorCode };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'An error occurred.');
        }
      
        if (!show2FA) {
            setShow2FA(true);
            setResendCooldown(300); // 5 minutes cooldown after initial send
        } else {
            // OTP verified successfully, navigate to dashboard
            router.push('/admin/dashboard');
            router.refresh(); // Force a refresh to ensure session is loaded
        }

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setError(errorMessage);
    } finally {
        setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    setError('');

    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP.');
      }

      setResendCooldown(300); // 5 minutes cooldown
      setError(''); // Clear any existing errors
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend OTP.';
      setError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleBack = () => {
    setShow2FA(false);
    setFormData(prev => ({ ...prev, twoFactorCode: '' }));
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#10141c] text-gray-300">
      <div className="relative min-h-screen flex">
        <div className="bg-[url('/ABG.jpg')] bg-cover bg-center bg-no-repeat hidden lg:flex lg:w-1/2 flex-col justify-center px-12 text-white relative">
            <div className="absolute top-30 left-8"><Image src="/Skyad.png" alt="Sky Nest Admin" width={400} height={50} /></div>
            <div className="max-w-md">
                <h1 className="text-6xl font-semibold mb-4 leading-tight font-l">Administrative<span className="text-4xl block text-amber-400">Control Center</span></h1>
                <h3 className='font-base mb-4 font-l text-lg'></h3>
            </div>
        </div>
        <div className="bg-gradient-to-r from-black/20 to-transparent w-full lg:w-1/2 flex items-center justify-center p-8">
          <div ref={formContainerRef} className="w-full max-w-md overflow-hidden">
            {!show2FA ? (
              <Card className="bg-[#181d28]/80 border-gray-800 text-gray-300">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white font-l">Administrator Access</CardTitle>
                  <CardDescription>Secure login for system administrators.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className='mb-4'>
                        <div className="h-6 mb-4">{error && <div className="text-red-400 text-sm">{error}</div>}</div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email">Administrator Email</Label>
                                <Input id="email" type="email" placeholder="admin@skynest.lk" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="Password" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="remember-me" className="border-gray-600 data-[state=checked]:bg-amber-400 data-[state=checked]:text-black"/>
                                    <Label htmlFor="remember-me" className="text-sm">Remember me</Label>
                                </div>
                                {/* Link path updated to reflect new nested structure */}
                                <Link href="/auth/admin-login/forgot-password" className="text-sm text-amber-400 hover:underline">Forgot password?</Link>
                            </div>
                        </div>
                    </CardContent>
            
                    <CardFooter>
                        <Button type="submit" className="w-full font-bold" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isLoading ? 'Authenticating...' : 'Continue'}</Button>
                    </CardFooter>
                </form>
              </Card>
            ) : (
              <Card className="bg-[#181d28]/80 border-gray-800 text-gray-300">
                   <CardHeader>
                     <CardTitle className="text-2xl font-bold text-white font-l flex items-center space-x-2"><ShieldCheck className="text-amber-400" /><span>Two-Factor Authentication</span></CardTitle>
                     <CardDescription>Enter the 6-digit code sent to your email.</CardDescription>
                   </CardHeader>
                   <form onSubmit={handleSubmit}>
                        <CardContent>
                            <div className="h-6 mb-4">{error && <div className="text-red-400 text-sm">{error}</div>}</div>
                            <div className="space-y-4">
                                <Input id="twoFactorCode" type="text" placeholder="000000" value={formData.twoFactorCode} onChange={(e) => handleInputChange('twoFactorCode', e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} className="text-center text-2xl tracking-[0.5em]" required />
                                <Button type="submit" className="w-full font-bold" disabled={isLoading || formData.twoFactorCode.length !== 6}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {isLoading ? 'Verifying...' : 'Access Dashboard'}</Button>
                                
                                {/* Resend OTP Button */}
                                <div className="text-center">
                                  <Button
                                    type="button"
                                    variant="link"
                                    className="text-amber-400 hover:text-amber-300"
                                    onClick={handleResendOTP}
                                    disabled={resendCooldown > 0 || isResending}
                                  >
                                    {isResending ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Resending...
                                      </>
                                    ) : resendCooldown > 0 ? (
                                      <>
                                        <Clock className="mr-2 h-4 w-4" />
                                        Resend in {Math.floor(resendCooldown / 60)}:{(resendCooldown % 60).toString().padStart(2, '0')}
                                      </>
                                    ) : (
                                      'Resend OTP'
                                    )}
                                  </Button>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="link" className="text-gray-400" onClick={handleBack} disabled={isLoading}>Back to login</Button>
                        </CardFooter>
                   </form>
                 </Card>
            )}
            </div>
          </div>
        </div>
      </div>
  )
}

