// app/auth/login/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import LoadingScreen from '@/app/components/LoadingScreen'
import gsap from 'gsap'; // Import GSAP

// --- Data for the Carousel (Backend Ready) ---
const carouselItems = [
    {
  image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=2070&auto=format&fit=crop',
        title: 'Unparalleled Luxury',
        description: 'Discover world-class amenities and personalized service at every Sky Nest location.'
    },
    {
  image: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?q=80&w=1974&auto=format&fit=crop',
        title: 'Breathtaking Views',
        description: 'From serene coastlines to vibrant cityscapes, your perfect escape awaits.'
    },
    {
        image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=1949&auto=format&fit=crop',
        title: 'Seamless Booking',
        description: 'Manage your reservations and plan your stay with ease through our guest portal.'
    }
];

// --- SVG for the Google Icon ---
const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.483-11.13-8.232l-6.571,4.819C9.656,39.663,16.318,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.916,36.48,44,30.865,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);


export default function GuestLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const router = useRouter();
  const titleRef = useRef(null);
  const descriptionRef = useRef(null);

  // Carousel Logic
  useEffect(() => {
    const timer = setInterval(() => {
      // Animate out the current text
      if (titleRef.current && descriptionRef.current) {
        gsap.to([titleRef.current, descriptionRef.current], { 
          opacity: 0, 
          y: 20, 
          duration: 0.5, 
          ease: 'power3.in',
          onComplete: () => {
            // Change the slide after the text has faded out
            setCurrentSlide(prev => (prev === carouselItems.length - 1 ? 0 : prev + 1));
          }
        });
      }
    }, 5000); // Change slide every 5 seconds
    return () => clearInterval(timer);
  }, []);

  // GSAP animation for text fade-in
  useEffect(() => {
    if (titleRef.current && descriptionRef.current) {
      gsap.fromTo([titleRef.current, descriptionRef.current], 
        { opacity: 0, y: -20 }, 
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.2 }
      );
    }
  }, [currentSlide]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Successfully logged in - no email verification check needed
      // (Verification is optional, users can verify in their profile)
      router.push('/guest/dashboard');
      router.refresh(); // Force refresh to ensure session is loaded
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid email or password';
      setError(errorMessage);
      setIsLoading(false);
    }
  }
  
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#10141c] text-gray-300 flex">
      {/* Left Side - Carousel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {carouselItems.map((item, index) => (
            <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
                <Image src={item.image} alt={item.title} fill className="object-cover"/>
                <div className="absolute inset-0 bg-black/60"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-amber-900/30 to-transparent"></div>
            </div>
        ))}
        <div className="relative z-10 flex flex-col justify-between p-10 text-white h-full w-full">
          <Link href="/" className="flex items-center space-x-3">
              <Image src="/SNC.png" alt="Sky Nest Logo" width={200} height={50} />
          </Link>
          <div className="mb-8">
            <h1 ref={titleRef} className="text-amber-400 text-4xl font-bold mb-4 leading-tight font-l">
              {carouselItems[currentSlide].title}
            </h1>
            <p ref={descriptionRef} className="text-xl text-white/80 font-l">
              {carouselItems[currentSlide].description}
            </p>
          </div>
        </div>
      </div>
      <div className="w-1 bg-gradient-to-b from-amber-400 to-amber-600"></div>

      {/* Right Side - Login Form */}
      <div className="bg-[url('/LBG.jpg')] bg-cover bg-center bg-no-repeat w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Card className="bg-black/20 backdrop-blur-xs border border-white/10 text-gray-300">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-white font-l">Sign In</CardTitle>
              <CardDescription>Welcome back! Please enter your details.</CardDescription>
            </CardHeader>
            <CardContent>
              {error && <div className="mb-4 text-red-400 text-sm p-3 bg-red-500/10 rounded-md">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-400">Email address</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                       <Checkbox id="remember-me" className="border-gray-600 data-[state=checked]:bg-amber-400 data-[state=checked]:text-black"/>
                       <Label htmlFor="remember-me" className="text-sm">Remember me</Label>
                    </div>
                    <Link href="/auth/forgot-password" className="text-sm text-amber-400 hover:underline">Forgot password?</Link>
                </div>
                <Button type="submit" className="w-full font-bold text-base" size="lg">
                  Sign In
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-700" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#181d28] px-2 text-gray-500">Or continue with</span>
                </div>
              </div>

              <Button variant="secondary" className="w-full text-base">
                <GoogleIcon />
                Sign in with Google
              </Button>

            </CardContent>
            <CardFooter className="justify-center text-sm">
                <p>Don't have an account? <Link href="/auth/register" className="font-semibold text-amber-400 hover:underline">Sign up</Link></p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

