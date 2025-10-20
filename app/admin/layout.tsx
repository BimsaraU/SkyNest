'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from '@/app/components/AdminSidebar'; // Assuming sidebar is in src/components

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Initialize State from LocalStorage
  // This function runs only once on component load to get the saved state.
  // It defaults to 'false' (expanded) if no saved state is found.
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // This check prevents errors during Server-Side Rendering (SSR) where 'window' doesn't exist.
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true';
    }
    return false;
  });

  // 2. Save State Changes to LocalStorage
  // This effect hook runs every time the 'isCollapsed' state changes.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', String(isCollapsed));
    }
  }, [isCollapsed]);

  return (
    // This is the main flex container for the entire admin section.
    <div className="flex min-h-screen bg-[#10141c]">
      <AdminSidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed}
      />
      
      {/* 3. Main Content with Dynamic Padding */}
      {/* This <main> tag wraps your page content ({children}). */}
      {/* The left margin (`ml-24` or `ml-72`) changes based on the sidebar's state. */}
      {/* `transition-all` ensures the content slides smoothly. */}
      <main className={`flex-1 p-8 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'ml-24' : 'ml-72'
        }`}
      >
        {children}
      </main>
    </div>
  );
}

