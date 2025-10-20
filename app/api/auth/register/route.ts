import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword, generateOtp } from '@/lib/authUtils';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { firstName, lastName, email, password, phone, address } = await request.json();

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: 'First name, last name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if guest already exists
    const existingGuest = await pool.query(
      'SELECT id FROM guests WHERE email = $1',
      [email]
    );

    if (existingGuest.rows.length > 0) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert guest into database
    const result = await pool.query(
      `INSERT INTO guests (first_name, last_name, email, password_hash, phone, address, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, false)
       RETURNING id, email, first_name, last_name`,
      [firstName, lastName, email, hashedPassword, phone || null, address || null]
    );

    const guest = result.rows[0];

    // Generate OTP for email verification
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await pool.query(
      `INSERT INTO otps (user_email, user_type, otp_code, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [email, 'GUEST', otp, expiresAt]
    );

    // Send OTP email asynchronously (don't wait)
    sendOtpEmail(email, otp).catch(emailError => {
      console.error('Failed to send OTP email:', emailError);
      // Continue anyway - user can request resend
    });

    return NextResponse.json({
      success: true,
      message: 'Registration successful! Please check your email for verification code.',
      user: {
        id: guest.id,
        email: guest.email,
        name: `${guest.first_name} ${guest.last_name}`
      },
      needsVerification: true
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
