// components/GuestNavbar.tsx
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { LayoutDashboard, CalendarDays, User, BedDouble, Bell, LogOut } from 'lucide-react';
import AnimatedButton from './AnimatedButton';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const navItems = [
    { href: "/guest/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/guest/my-bookings", icon: CalendarDays, label: "My Bookings" },
    { href: "/guest/alerts", icon: Bell, label: "Alerts" },
    { href: "/guest/profile", icon: User, label: "Profile" },
    { href: "/guest/search-rooms", icon: BedDouble, label: "Rooms" },
];

const NavItem = ({ href, icon: Icon, label }: { href: string, icon: React.ElementType, label: string }) => {
    const pathname = usePathname();
    const isActive = pathname.startsWith(href);
    const itemRef = useRef<HTMLAnchorElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const animationRef = useRef<gsap.core.Timeline | null>(null);

    // Set up the GSAP animation timeline on mount
    useEffect(() => {
        animationRef.current = gsap.timeline({ paused: true })
            .to(itemRef.current, { 
                width: '11rem', // 176px
                backgroundColor: 'rgba(245, 245, 244, 0.5)', // stone-200/50
                duration: 0.5, 
                ease: 'power3.inOut' 
            }, 0)
            .to(textRef.current, { 
                opacity: 1, 
                x: 0, 
                duration: 0.3, 
                ease: 'power2.out' 
            }, 0.15); // Stagger the text animation

        return () => {
            if (animationRef.current) {
                animationRef.current.kill();
            }
        };
    }, []);
    
    // Handle hover events
    const handleMouseEnter = () => { if (!isActive) animationRef.current?.play(); };
    const handleMouseLeave = () => { if (!isActive) animationRef.current?.reverse(); };

    return (
        <Link
            ref={itemRef}
            href={href}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative flex items-center mr-2 h-12 rounded-full focus:outline-none overflow-hidden transition-colors duration-300
                ${isActive ? 'w-44 bg-amber-100/80' : 'w-12'}
            `}
        >
            <div className="absolute left-3.5">
                <Icon className={`transition-colors duration-300 z-10 ${isActive ? 'text-amber-700' : 'text-gray-600'}`} />
            </div>
            <span 
                ref={textRef} 
                className={`absolute left-14 font-l font-ligt text-sm text-gray-800 whitespace-nowrap z-10 transform -translate-x-2 
                ${isActive ? 'opacity-100' : 'opacity-0'}`}
            >
                {label}
            </span>
        </Link>
    );
};

export default function GuestNavbar() {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
            });
            
            if (response.ok) {
                router.push('/');
                router.refresh();
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <header className="backdrop-blur-lg bg-gradient-to-r from-amber-400/10 to-amber-600/30 border-b border-white/20 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
                <Link href="/" className="flex items-center space-x-3">
                    <Image src="/SNC.png" alt="Sky Nest Logo" width={150} height={40} />
                </Link>
                <div className="flex items-center space-x-4">
                    <nav className="flex items-center space-x-2 bg-gray-100/50 p-1 rounded-full">
                        {navItems.map(item => <NavItem key={item.label} {...item} />)}
                    </nav>
                    <div className="w-px h-8 bg-gray-300/50"></div>
                    <AnimatedButton href="/guest/booking">
                        Book Now
                    </AnimatedButton>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-gray-600 hover:text-gray-800 rounded-full transition-all duration-300 text-xs font-medium border border-white/40 hover:border-white/60"
                        title="Sign Out"
                    >
                        <LogOut size={14} className="opacity-70" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </header>
    );
}

