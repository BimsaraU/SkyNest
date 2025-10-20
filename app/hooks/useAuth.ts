'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  userType: string;
  isVerified: boolean;
  profilePicture?: string;
  // Optional fields based on user type
  position?: string;
  branchId?: string;
  address?: string;
  dateOfBirth?: string;
  idNumber?: string;
  nationality?: string;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Inactivity timeout in milliseconds (30 minutes)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
// Warning before logout (2 minutes before timeout)
const WARNING_TIME = 2 * 60 * 1000;

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Fetch user data
  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setError(null);
      } else {
        setUser(null);
        setError('Not authenticated');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setUser(null);
      setError('Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        setUser(null);
        // Clear timers
        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        router.push('/auth/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, [router]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Clear existing timers
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    // Set warning timer (28 minutes)
    warningTimerRef.current = setTimeout(() => {
      if (user) {
        // Show warning notification
        const shouldStay = confirm('You will be logged out due to inactivity in 2 minutes. Click OK to stay logged in.');
        if (shouldStay) {
          resetInactivityTimer();
        }
      }
    }, INACTIVITY_TIMEOUT - WARNING_TIME);

    // Set logout timer (30 minutes)
    inactivityTimerRef.current = setTimeout(() => {
      if (user) {
        alert('You have been logged out due to inactivity.');
        logout();
      }
    }, INACTIVITY_TIMEOUT);
  }, [user, logout]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      const now = Date.now();
      // Only reset timer if more than 1 minute has passed since last activity
      if (now - lastActivityRef.current > 60000) {
        resetInactivityTimer();
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Start initial timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [user, resetInactivityTimer]);

  // Fetch user on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    loading,
    error,
    logout,
    refreshUser: fetchUser,
  };
}
