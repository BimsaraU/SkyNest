// app/auth/staff-login/page.tsx
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import LoadingScreen from '@/app/components/LoadingScreen'
import gsap from 'gsap';

// --- Data for the Carousel (Staff Features) ---
const carouselItems = [
    { 
        image: 'https://images.unsplash.com/photo-1554224155-1696413565d3?q=80&w=2070&auto=format&fit=crop', 
        title: 'Empowering Our Team', 
        description: 'Access your dashboard to manage bookings, assist guests, and uphold our standards of excellence.' 
    },
    { 
        image: 'https://images.unsplash.com/photo-1582653553534-82f195d7f1d4?q=80&w=2070&auto=format&fit=crop', 
        title: 'Stay Connected', 
        description: 'View your schedule, communicate with your team, and stay updated on daily operations.' 
    },
    { 
        image: 'https://images.unsplash.com/photo-1621293933528-4a572a157123?q=80&w=2070&auto=format&fit=crop', 
        title: 'Deliver Excellence', 
        description: 'Utilize our powerful tools to provide an unforgettable experience for every guest.' 
    }
];

export default function StaffLoginPage() {
    const [formData, setFormData] = useState({ employeeId: '', password: '', branch: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [currentSlide, setCurrentSlide] = useState(0);
    const router = useRouter();
    const titleRef = useRef(null);
    const descriptionRef = useRef(null);
    
    const branches = [
        { id: 'colombo', name: 'Sky Nest Colombo' },
        { id: 'kandy', name: 'Sky Nest Kandy' },
        { id: 'galle', name: 'Sky Nest Galle' }
    ];

    // Carousel Logic
    useEffect(() => {
        const timer = setInterval(() => {
            if (titleRef.current && descriptionRef.current) {
                gsap.to([titleRef.current, descriptionRef.current], { 
                    opacity: 0, y: 20, duration: 0.5, ease: 'power3.in',
                    onComplete: () => {
                        setCurrentSlide(prev => (prev === carouselItems.length - 1 ? 0 : prev + 1));
                    }
                });
            }
        }, 5000);
        return () => clearInterval(timer);
    }, []);

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
            const response = await fetch('/api/auth/staff-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: formData.employeeId,
                    password: formData.password,
                    branch: formData.branch
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Successfully logged in
            router.push('/staff/dashboard');
            router.refresh(); // Force refresh to ensure session is loaded
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Invalid credentials or unauthorized access.';
            setError(errorMessage);
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (error) setError('');
    };
    
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
                        <h1 ref={titleRef} className="text-4xl font-bold mb-4 leading-tight font-l">{carouselItems[currentSlide].title}</h1>
                        <p ref={descriptionRef} className="text-xl text-white/80 font-l">{carouselItems[currentSlide].description}</p>
                    </div>
                </div>
            </div>
            <div className="w-1 bg-gradient-to-b from-amber-400 to-amber-600"></div>

            {/* Right Side - Login Form */}
            <div className="bg-[url('/LBG.jpg')] bg-cover bg-center bg-no-repeat w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <Card className="bg-black/20 backdrop-blur-xs border border-white/10 text-gray-300">
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-bold text-white font-l">Staff Portal</CardTitle>
                            <CardDescription>Access your work dashboard and tools.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {error && <div className="mb-4 text-red-400 text-sm p-3 bg-red-500/10 rounded-md">{error}</div>}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="branch" className="text-gray-400">Select Branch</Label>
                                    <Select value={formData.branch} onValueChange={(value) => handleInputChange('branch', value)}>
                                        <SelectTrigger id="branch">
                                            <SelectValue placeholder="Choose your branch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map(branch => (
                                                <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="employeeId" className="text-gray-400">Employee ID</Label>
                                    <Input id="employeeId" placeholder="e.g., EMP-2025-052" value={formData.employeeId} onChange={(e) => handleInputChange('employeeId', e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} required />
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
                                    Sign In to Dashboard
                                </Button>
                            </form>
                        </CardContent>
                         <CardFooter className="justify-center text-sm">
                            <p>Not a staff member? Go to <Link href="/auth/login" className="font-semibold text-amber-400 hover:underline">Guest Login</Link></p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
