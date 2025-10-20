'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: string;
  userType: string;
  position?: string;
  profilePicture?: string;
}

interface UserProfileProps {
  user: User;
  onLogout: () => void;
  isScrolled: boolean;
}

export default function UserProfile({ user, onLogout, isScrolled }: UserProfileProps) {
  // Get initials for avatar fallback
  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  // Get profile picture URL or use fallback
  const getProfilePictureUrl = () => {
    if (user.profilePicture && user.profilePicture.trim() !== '') {
      // If it's a full URL, use it directly
      if (user.profilePicture.startsWith('http')) {
        return user.profilePicture;
      }
      // If it's a relative path, ensure it starts with /
      return user.profilePicture.startsWith('/') ? user.profilePicture : `/${user.profilePicture}`;
    }
    // Fallback to generated avatar
    return `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`;
  };

  // Get dashboard route based on user type
  const getDashboardRoute = () => {
    switch (user.userType) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'STAFF':
        return '/staff/dashboard';
      case 'GUEST':
        return '/guest/dashboard';
      default:
        return '/';
    }
  };

  // Get profile route based on user type
  const getProfileRoute = () => {
    switch (user.userType) {
      case 'ADMIN':
        return '/admin/settings';
      case 'STAFF':
        return '/staff/dashboard';
      case 'GUEST':
        return '/guest/profile';
      default:
        return '/';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          {/* User info - hidden on mobile */}
          <div className={`hidden md:flex flex-col items-end transition-colors ${
            isScrolled ? 'text-gray-700' : 'text-white'
          }`}>
            <span className="text-sm font-medium">{user.name}</span>
            <span className="text-xs opacity-70">
              {user.position || user.userType}
            </span>
          </div>
          
          {/* Avatar */}
          <Avatar className="h-10 w-10 border-2 border-amber-400 shadow-lg">
            <AvatarImage src={getProfilePictureUrl()} alt={user.name} />
            <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className="w-56 bg-white shadow-xl border-amber-200"
      >
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href={getDashboardRoute()} className="cursor-pointer">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href={getProfileRoute()} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        
        {user.userType === 'ADMIN' && (
          <DropdownMenuItem asChild>
            <Link href="/admin/settings" className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={onLogout}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
