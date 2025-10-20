// components/NavBar.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AnimatedButton from './AnimatedButton';
import LoginButton from './LoginButton';
import UserProfile from './UserProfile';
import { useAuth } from '../hooks/useAuth';

const NavBar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const linkStyle = isScrolled 
    ? 'font-l font-medium text-gray-600 hover:text-amber-400 text-sm' 
    : 'font-l font-medium text-amber-400 hover:text-gray-100 text-sm';

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 
      ${isScrolled 
        ? 'bg-[#10141c] shadow-lg' 
        : 'bg-gradient-to-b from-amber-500/20 viaamber-500/5 to-transparent'
      }`}
    >
      <div className="h-1 bg-gradient-to-r from-amber-500 to-amber-400"></div>

      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/">
            <div className="relative w-[110px] h-10">
              <Image 
                src="/SNC.png"
                alt="Sky Nest Logo" 
                fill
                className="object-contain"
              />
            </div>
          </Link>
        </div>

        <div className="hidden md:flex items-center space-x-8">
          <Link href="#rooms" className={`font-medium transition-colors ${linkStyle}`}>ROOMS</Link>
          <Link href="#services" className={`font-medium transition-colors ${linkStyle}`}>SERVICES</Link>
          <Link href="#branches" className={`font-medium transition-colors ${linkStyle}`}>LOCATIONS</Link>
          <Link href="#about" className={`font-medium transition-colors ${linkStyle}`}>ABOUT</Link>
        </div>

        <div className="font-semibold flex items-center space-x-4">
          {/* Show loading skeleton while fetching user data */}
          {loading ? (
            <div className={`h-10 w-10 rounded-full animate-pulse ${
              isScrolled ? 'bg-gray-200' : 'bg-white/20'
            }`} />
          ) : user ? (
            /* Show user profile with avatar when logged in */
            <>
              <UserProfile user={user} onLogout={logout} isScrolled={isScrolled} />
              <AnimatedButton className='font-sans font-extrabold' href={
                user.userType === 'ADMIN' ? '/admin/dashboard' : 
                user.userType === 'STAFF' ? '/staff/dashboard' : 
                '/guest/booking'
              }>
                {user.userType === 'GUEST' ? 'BOOK NOW' : 'DASHBOARD'}
              </AnimatedButton>
            </>
          ) : (
            /* Show login and book now buttons when not logged in */
            <>
              <LoginButton isScrolled={isScrolled} />
              <AnimatedButton className='font-sans font-extrabold' href="./auth/register">
                BOOK NOW
              </AnimatedButton>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;

