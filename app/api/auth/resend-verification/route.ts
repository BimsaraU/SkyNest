import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateOtp } from '@/lib/authUtils';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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

    // Delete any existing OTPs for this user
    await pool.query(
      'DELETE FROM otps WHERE user_id = $1',
      [user.id]
    );

    // Generate new OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP
    await pool.query(
      `INSERT INTO otps (user_id, otp_code, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, otp, expiresAt]
    );

    // Send OTP email
    await sendOtpEmail(email, otp);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent! Please check your email.'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    );
  }
}
