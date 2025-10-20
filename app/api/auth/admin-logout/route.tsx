import { NextResponse, NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

// It's crucial that this JWT_SECRET matches the one used for signing the token in the login route.
const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(request: NextRequest) {
  try {
    const sessionToken = (await cookies()).get('token')?.value;

    if (sessionToken) {
      try {
        // Before deleting the cookie, verify the token to identify the user for the audit log.
        const { payload } = await jwtVerify(sessionToken, jwtSecret);
        const userId = payload.userId;
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');

        // If a user ID is found in the token, log the logout event for security auditing.
        if (userId) {
          await pool.query(
            "INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)",
            [userId, 'ADMIN_LOGOUT', ip, { message: 'Admin user logged out successfully.' }]
          );
        }
      } catch (logError) {
        // If the token is invalid or expired, we still proceed with the logout.
        // This ensures the user is logged out even if their session was tampered with.
        console.error('[LOGOUT AUDIT ERROR]: Could not verify token for audit log, but proceeding with logout.', logError);
      }
    }

    // Clear the token cookie by setting its maxAge to 0, effectively deleting it.
    (await cookies()).set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0, // Expire the cookie immediately
      path: '/',
    });

    return NextResponse.json({ success: true, message: 'Admin logged out successfully.' });
  } catch (error) {
    console.error('[LOGOUT API ERROR]:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}

