import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

/**
 * Verify admin authentication from JWT token in cookies
 * Returns the decoded token payload if valid, null otherwise
 */
export async function verifyAdmin(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    console.log('[AUTH] No token found in cookies');
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;
    
    if (role?.toLowerCase() !== 'admin') {
      console.log('[AUTH] Invalid role:', role);
      return null;
    }
    
    console.log('[AUTH] Admin verified:', payload.userId);
    return payload;
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error);
    return null;
  }
}

/**
 * Verify staff or admin authentication from JWT token in cookies
 * Returns the decoded token payload if valid, null otherwise
 */
export async function verifyStaffOrAdmin(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    console.log('[AUTH] No token found in cookies');
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;
    const normalizedRole = role?.toLowerCase();
    
    if (normalizedRole !== 'admin' && normalizedRole !== 'staff') {
      console.log('[AUTH] Invalid role:', role);
      return null;
    }
    
    console.log('[AUTH] Staff/Admin verified:', payload.userId, 'Role:', role);
    return payload;
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error);
    return null;
  }
}
