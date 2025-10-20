'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MailCheck, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/admin-login/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.status >= 500) {
        throw new Error("Server error, please try again later.");
      }
      
      setEmailSent(true);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#10141c] text-gray-300">
      <div className="relative min-h-screen flex">
        <div className="bg-[url('/ABG.jpg')] bg-cover bg-center bg-no-repeat hidden lg:flex lg:w-1/2 flex-col justify-center px-12 text-white relative">
            <div className="absolute top-30 left-8"><Image src="/Skyad.png" alt="Sky Nest Admin" width={400} height={50} /></div>
            <div className="max-w-md">
                <h1 className="text-6xl font-semibold mb-4 leading-tight font-l">Administrative<span className="text-4xl block text-amber-400">Control Center</span></h1>
            </div>
        </div>
        <div className="bg-gradient-to-r from-black/20 to-transparent w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {!emailSent ? (
              <Card className="bg-[#181d28]/80 border-gray-800 text-gray-300">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white font-l">Forgot Password</CardTitle>
                  <CardDescription>Enter your administrator email to receive a password reset link.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className='mb-4'>
                        <div className="h-6 mb-4">{error && <div className="text-red-400 text-sm">{error}</div>}</div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Administrator Email</Label>
                            <Input id="email" type="email" placeholder="admin@skynest.lk" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col items-start">
                        <Button type="submit" className="w-full font-bold mb-4" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send Reset Link</Button>
                        <Button variant="link" asChild className="text-gray-400 p-0 h-auto"><Link href="/auth/admin-login"><ArrowLeft size={14} className="mr-1"/>Back to Login</Link></Button>
                    </CardFooter>
                </form>
              </Card>
            ) : (
              <Card className="bg-[#181d28]/80 border-gray-800 text-gray-300 text-center">
                <CardHeader>
                  <div className="mx-auto bg-green-500/10 p-3 rounded-full w-fit"><MailCheck className="text-green-400" size={32}/></div>
                  <CardTitle className="text-2xl font-bold text-white font-l mt-4">Check Your Email</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">If an account with the email <span className="font-bold text-amber-400">{email}</span> exists, we have sent a password reset link to it.</p>
                </CardContent>
                 <CardFooter>
                    <Button variant="link" asChild className="text-gray-400 mx-auto"><Link href="/auth/admin-login"><ArrowLeft size={14} className="mr-1"/>Back to Login</Link></Button>
                 </CardFooter>
              </Card>
            )}
            </div>
          </div>
        </div>
      </div>
  );
}
