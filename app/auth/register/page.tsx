// app/auth/register/page.tsx
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
import gsap from 'gsap';

// --- Data for the Carousel (Benefits of Registering) with updated images ---
const carouselItems = [
    { 
        image: '/B1.avif', 
        title: 'Unlock Exclusive Member Rates', 
        description: 'Join today and get access to special discounts of up to 15% on your bookings.' 
    },
    { 
        image: '/B2.avif', 
        title: 'Enjoy a Faster Booking Experience', 
        description: 'Save your details for quick, seamless reservations and enjoy priority check-in services.' 
    },
    { 
        image: '/B3.avif', 
        title: 'Access Premium Services', 
        description: 'Get priority access to our spa, fine dining reservations, and other exclusive services.' 
    }
];

export default function GuestRegisterPage() {
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [currentSlide, setCurrentSlide] = useState(0);
    const router = useRouter();
    const titleRef = useRef(null);
    const descriptionRef = useRef(null);

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

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'A valid email is required';
        if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!agreeToTerms) newErrors.terms = 'You must agree to the terms';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsLoading(true);
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Registration successful - redirect to login page
            router.push(`/auth/login?registered=true&email=${encodeURIComponent(formData.email)}`);
            router.refresh();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Registration failed. Please try again.';
            setErrors({ general: errorMessage });
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
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
                        <h1 ref={titleRef} className="text-amber-400 text-4xl font-bold mb-4 leading-tight font-l">{carouselItems[currentSlide].title}</h1>
                        <p ref={descriptionRef} className="text-xl text-white/80 font-l">{carouselItems[currentSlide].description}</p>
                    </div>
                </div>
            </div>
            <div className="w-1 bg-gradient-to-b from-amber-400 to-amber-600"></div>

            {/* Right Side - Registration Form */}
            <div className="bg-[url('/LBG.jpg')] bg-cover bg-center bg-no-repeat w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <Card className="bg-black/20 backdrop-blur-xs border border-white/10 text-gray-300">
                        <CardHeader className="text-center">
                            <CardTitle className="text-3xl font-bold text-white font-l">Create an Account</CardTitle>
                            <CardDescription>Join us for exclusive benefits and personalized experiences.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {errors.general && <div className="mb-4 text-red-400 text-sm p-3 bg-red-500/10 rounded-md">{errors.general}</div>}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName" className="text-gray-400">First Name</Label>
                                        <Input id="firstName" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} />
                                        {errors.firstName && <p className="text-xs text-red-400">{errors.firstName}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName" className="text-gray-400">Last Name</Label>
                                        <Input id="lastName" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-gray-400">Email address</Label>
                                    <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} />
                                    {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Input id="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => handleInputChange('password', e.target.value)} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><Eye size={16} /></button>
                                    </div>
                                    {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                     <div className="relative">
                                        <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => handleInputChange('confirmPassword', e.target.value)} />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><Eye size={16} /></button>
                                    </div>
                                    {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword}</p>}
                                </div>
                                <div className="flex items-start space-x-2 pt-2">
                                    <Checkbox id="terms" checked={agreeToTerms} onCheckedChange={(checked) => setAgreeToTerms(!!checked)} className="border-gray-600 data-[state=checked]:bg-amber-400 data-[state=checked]:text-black mt-1" />
                                    <div className="grid gap-1.5 leading-none">
                                        <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            I agree to the <Link href="/terms" className="text-amber-400 hover:underline">Terms & Conditions</Link>
                                        </label>
                                        {errors.terms && <p className="text-xs text-red-400">{errors.terms}</p>}
                                    </div>
                                </div>
                                <Button type="submit" className="w-full font-bold text-base" size="lg">Create Account</Button>
                            </form>
                        </CardContent>
                        <CardFooter className="justify-center text-sm">
                            <p>Already have an account? <Link href="/auth/login" className="font-semibold text-amber-400 hover:underline">Sign in</Link></p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}

