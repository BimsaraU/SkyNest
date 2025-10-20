import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Get user
    const userResult = await pool.query(
      'SELECT id, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    if (user.is_verified) {
      return NextResponse.json(
        { error: 'Email already verified' },
        { status: 400 }
      );
    }

    // Verify OTP
    const otpResult = await pool.query(
      `SELECT id, otp_code, expires_at 
       FROM otps 
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY created_at DESC 
       LIMIT 1`,
      [user.id]
    );

    if (otpResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    const otpRecord = otpResult.rows[0];

    if (otpRecord.otp_code !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 400 }
      );
    }

    // Mark user as verified
    await pool.query(
      'UPDATE users SET is_verified = true WHERE id = $1',
      [user.id]
    );

    // Delete used OTP
    await pool.query(
      'DELETE FROM otps WHERE id = $1',
      [otpRecord.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! You can now login.'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}
