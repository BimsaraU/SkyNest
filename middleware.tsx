import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('token')?.value;

  // Protected route prefixes that ALWAYS require authentication
  const protectedPrefixes = ['/admin', '/staff', '/guest/dashboard', '/guest/my-bookings', '/guest/profile'];
  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix));

  // Public routes that don't need authentication
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/register',
    '/auth/admin-login',
    '/auth/staff-login',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/guest/booking',
    '/guest/room-details',
    '/guest/search-rooms',
  ];

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => {
    if (route === '/') return pathname === '/';
    return pathname.startsWith(route);
  });

  // If it's a protected route, check authentication
  if (isProtectedRoute) {
    // If no session token, redirect to appropriate login
    if (!sessionToken) {
      if (pathname.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/auth/admin-login', request.url));
      }
      if (pathname.startsWith('/staff')) {
        return NextResponse.redirect(new URL('/auth/staff-login', request.url));
      }
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  } else if (isPublicRoute) {
    // If it's a public route and not protected, allow access
    return NextResponse.next();
  }

  try {
    // Verify the token (sessionToken is guaranteed to exist here due to the check above)
    const { payload } = await jwtVerify(sessionToken!, jwtSecret);
    const userRole = (payload.role as string).toUpperCase(); // Normalize to uppercase

    console.log('[MIDDLEWARE] Path:', pathname, 'Role:', userRole, 'UserID:', payload.userId);

    // Role-based access control
    if (pathname.startsWith('/api/admin')) {
      // API route protection for admin
      if (userRole !== 'ADMIN') {
        console.log('[MIDDLEWARE] API access denied to admin endpoint. Role:', userRole);
        return NextResponse.json({ error: 'Unauthorized', message: 'Admin access required' }, { status: 403 });
      }
      console.log('[MIDDLEWARE] Admin API access granted');
    } else if (pathname.startsWith('/api/staff')) {
      // API route protection for staff
      if (userRole !== 'STAFF' && userRole !== 'ADMIN') {
        console.log('[MIDDLEWARE] API access denied to staff endpoint. Role:', userRole);
        return NextResponse.json({ error: 'Unauthorized', message: 'Staff access required' }, { status: 403 });
      }
      console.log('[MIDDLEWARE] Staff API access granted');
    } else if (pathname.startsWith('/admin')) {
      if (userRole !== 'ADMIN') {
        console.log('[MIDDLEWARE] Access denied to admin area. Role:', userRole);
        return NextResponse.redirect(new URL('/auth/admin-login', request.url));
      }
      console.log('[MIDDLEWARE] Admin access granted');
    } else if (pathname.startsWith('/staff')) {
      if (userRole !== 'STAFF' && userRole !== 'ADMIN') {
        console.log('[MIDDLEWARE] Access denied to staff area. Role:', userRole);
        return NextResponse.redirect(new URL('/auth/staff-login', request.url));
      }
      console.log('[MIDDLEWARE] Staff access granted');
    } else if (pathname.startsWith('/guest')) {
      if (userRole !== 'GUEST' && userRole !== 'ADMIN') {
        console.log('[MIDDLEWARE] Access denied to guest area. Role:', userRole);
        return NextResponse.redirect(new URL('/auth/login', request.url));
      }
      console.log('[MIDDLEWARE] Guest access granted');
    }

    // Add user info to headers for use in API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', String(payload.userId));
    requestHeaders.set('x-user-role', userRole);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Middleware JWT verification error:', error);
    
    // Clear invalid token
    const response = NextResponse.redirect(
      new URL(
        pathname.startsWith('/admin') ? '/auth/admin-login' :
        pathname.startsWith('/staff') ? '/auth/staff-login' :
        '/auth/login',
        request.url
      )
    );
    
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/staff/:path*',
    '/guest/dashboard/:path*',
    '/guest/my-bookings/:path*',
    '/guest/profile/:path*',
    '/api/admin/:path*',
    '/api/staff/:path*',
  ],
};
