// components/StaffNavbar.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings } from 'lucide-react';

interface StaffMember {
    name: string;
    role: string;
    employeeId?: string;
    branch?: string;
}

interface StaffNavbarProps {
    staffMember?: StaffMember;
}

export default function StaffNavbar({ staffMember: propStaffMember }: StaffNavbarProps) {
    const [staffMember, setStaffMember] = useState<StaffMember>(
        propStaffMember || { name: 'Staff Member', role: 'Staff' }
    );

    useEffect(() => {
        // If no staff member prop provided, fetch from API
        if (!propStaffMember) {
            fetchStaffData();
        } else {
            setStaffMember(propStaffMember);
        }
    }, [propStaffMember]);

    const fetchStaffData = async () => {
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                const data = await response.json();
                const meData = data.user || data;
                setStaffMember({
                    name: `${meData.firstName} ${meData.lastName}`,
                    role: meData.position || 'Staff',
                    employeeId: meData.employeeId,
                    branch: meData.branchName
                });
            }
        } catch (error) {
            console.error('Failed to fetch staff data:', error);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/auth/staff-login';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <header className="bg-[#181d28] border-b border-gray-800 p-4 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center space-x-8">
                    <Link href="/staff/dashboard" className="flex items-center space-x-3">
                        <Image src="/SNC.png" alt="Sky Nest Logo" width={150} height={40} />
                    </Link>
                    
                    {/* Navigation Links */}
                    <nav className="hidden md:flex items-center space-x-6">
                        <Link href="/staff/dashboard" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                            Dashboard
                        </Link>
                        <Link href="/staff/rooms" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                            Rooms
                        </Link>
                        <Link href="/staff/bookings" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                            Bookings
                        </Link>
                        {(staffMember.role.toLowerCase().includes('maintenance') || staffMember.role.toLowerCase().includes('manager')) && (
                            <Link href="/staff/maintenance/assigned" className="text-gray-300 hover:text-white transition-colors text-sm font-medium">
                                Maintenance
                            </Link>
                        )}
                    </nav>
                </div>

                <div className="flex items-center space-x-6">
                    {/* User Profile Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                                <div className="text-right">
                                    <p className="font-semibold text-white text-sm">{staffMember.name}</p>
                                    <p className="text-xs text-gray-500">{staffMember.role}</p>
                                </div>
                                <Avatar className="h-10 w-10 border-2 border-amber-500/30">
                                    <AvatarFallback className="bg-amber-500/10 text-amber-400">
                                        {staffMember.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                </Avatar>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-[#181d28] border-gray-800" align="end">
                            <DropdownMenuItem className="cursor-pointer text-gray-300 hover:text-white hover:bg-gray-800">
                                <Link href="/staff/settings" className="flex items-center w-full">
                                    <User size={14} className="mr-2" /> My Profile
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-gray-300 hover:text-white hover:bg-gray-800">
                                <Link href="/staff/settings" className="flex items-center w-full">
                                    <Settings size={14} className="mr-2" /> Settings
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                                onClick={handleLogout}
                                className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                                <LogOut size={14} className="mr-2" /> Sign Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
