// components/AdminSidebar.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LineChart, Briefcase, Building, Home, Users, FileText, Settings, LogOut, ChevronLeft, User } from 'lucide-react';
import gsap from 'gsap';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/admin/dashboard", icon: LineChart, label: "Dashboard" },
  { href: "/admin/reports", icon: FileText, label: "Reports" },
  { href: "/admin/bookings", icon: Briefcase, label: "Bookings" },
  { href: "/admin/branches", icon: Building, label: "Branches" },
  { href: "/admin/rooms", icon: Home, label: "Rooms" },
  { href: "/admin/users", icon: Users, label: "Users" },
];

interface AdminSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
}

export default function AdminSidebar({ isCollapsed, setIsCollapsed }: AdminSidebarProps) {
  const sidebarRef = useRef<HTMLElement>(null);
  const animationRef = useRef<gsap.core.Timeline | null>(null);
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string; role: string; profile_picture?: string } | null>(null);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/auth/profile');
        const data = await response.json();
        if (response.ok && data.profile) {
          setUser({
            name: data.profile.full_name || `${data.profile.first_name} ${data.profile.last_name}`,
            email: data.profile.email,
            role: data.profile.role,
            profile_picture: data.profile.profile_picture
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    animationRef.current = gsap.timeline({ paused: true })
      .to(".nav-text, .bottom-nav", { opacity: 0, duration: 0.2, ease: 'power2.in' })
      .to(sidebarRef.current, { width: '6rem', duration: 0.4, ease: 'power3.inOut' }, "-=0.1");
  }, []);

  useEffect(() => {
    if (isCollapsed) {
      animationRef.current?.play();
    } else {
      animationRef.current?.reverse();
    }
  }, [isCollapsed]);

  return (
    <aside ref={sidebarRef} className="fixed top-0 left-0 pg-10 h-screen bg-[#181d28] border-r border-gray-800 p-6 flex flex-col w-72 flex-shrink-0 z-50">
      <div className="flex items-center justify-between mb-10 w-full h-[50px]">
        <Link 
          href="/" 
          className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}
          suppressHydrationWarning
        >
           <Image 
             src="/Skyad.png"
             priority 
             alt="Sky Nest Admin" 
             width={180} 
             height={50} 
             className="w-auto h-auto cursor-pointer hover:opacity-80 transition-opacity"
           />
        </Link>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="mr-3 bg-transparent rounded-md flex items-center justify-center"
          suppressHydrationWarning
        >
          <ChevronLeft 
            size={24} 
            className={`text-gray-400 hover:text-amber-400 transition-transform duration-500 ease-in-out ${isCollapsed ? 'rotate-180' : ''}`}
            suppressHydrationWarning 
          />
        </button>
      </div>

      <nav className="flex flex-col space-y-2 flex-grow">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.label} 
              href={item.href}
              className={`relative flex items-center space-x-4 p-3 transition-colors duration-200 focus:outline-none
                ${isActive 
                  ? `text-amber-400 font-semibold ${isCollapsed ? 'bg-gradient-to-r from-amber-400/2 to-transparent' : 'bg-gradient-to-r from-amber-400/10 to-transparent'}`
                  : `text-gray-400 hover:text-white ${isCollapsed ? 'hover:bg-gradient-to-r from-transparent via-white/5 to-transparent' : ''}`
                }`}
              suppressHydrationWarning
            >
                <div className={`absolute left-0 top-0 h-full w-1 bg-amber-400 transition-opacity duration-300 ${isActive ? 'opacity-100 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'opacity-0'}`}></div>
                <item.icon size={22} className="flex-shrink-0 ml-2" />
                <span className="nav-text font-l font-light whitespace-nowrap">{item.label}</span>
            </Link>
          )
        })}
      </nav>
      
      <div className="bottom-nav mt-auto space-y-2">
        {/* User Profile Section */}
        {user && !isCollapsed && (
          <div className="px-4 py-3 mb-2 bg-gradient-to-r from-amber-400/5 to-transparent border border-amber-400/10 rounded-lg">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10 border-2 border-amber-400/30">
                <AvatarImage src={user.profile_picture} alt={user.name} />
                <AvatarFallback className="bg-amber-400/20 text-amber-400 text-sm">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                <p className="text-xs text-amber-400 capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        )}
        {user && isCollapsed && (
          <div className="flex justify-center mb-2">
            <Avatar className="w-10 h-10 border-2 border-amber-400/30">
              <AvatarImage src={user.profile_picture} alt={user.name} />
              <AvatarFallback className="bg-amber-400/20 text-amber-400 text-sm">
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        
        <Link href="/admin/settings" className="flex items-center space-x-3 px-4 py-2 rounded-md text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
          <Settings size={18} /><span>Settings</span>
        </Link>
         <Link href="/auth/admin-login" className="flex items-center space-x-3 px-4 py-2 rounded-md text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
          <LogOut size={18} /><span>Sign Out</span>
        </Link>
      </div>
    </aside>
  );
}

