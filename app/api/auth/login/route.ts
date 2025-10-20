import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { comparePassword } from '@/lib/authUtils';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get guest from database
    const result = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, phone, is_verified 
       FROM guests 
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const guest = result.rows[0];

    // Note: Allow login without email verification for guests
    // They can verify later in their profile

    // Verify password
    const isValid = await comparePassword(password, guest.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await new SignJWT({
      userId: guest.id,
      email: guest.email,
      role: 'GUEST',
      userType: 'GUEST',
      name: `${guest.first_name} ${guest.last_name}`
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Set cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: guest.id,
        email: guest.email,
        name: `${guest.first_name} ${guest.last_name}`,
        phone: guest.phone,
        role: 'GUEST',
        isVerified: guest.is_verified
      }
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    console.log('[GUEST LOGIN] Token cookie set for guest:', guest.id);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
