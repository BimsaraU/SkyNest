import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email, userType } = await request.json();

    console.log('[FORGOT PASSWORD] Request for email:', email, 'Type:', userType);

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedUserType = (userType || 'GUEST').toUpperCase();

    // Check if user exists in the appropriate table (V2 Schema)
    let userResult;
    let tableName;

    if (normalizedUserType === 'ADMIN') {
      tableName = 'admins';
      userResult = await pool.query(
        'SELECT id, first_name, last_name, email FROM admins WHERE email = $1',
        [normalizedEmail]
      );
    } else if (normalizedUserType === 'STAFF') {
      tableName = 'staff';
      userResult = await pool.query(
        'SELECT id, first_name, last_name, email FROM staff WHERE email = $1',
        [normalizedEmail]
      );
    } else {
      tableName = 'guests';
      userResult = await pool.query(
        'SELECT id, first_name, last_name, email FROM guests WHERE email = $1',
        [normalizedEmail]
      );
    }

    console.log('[FORGOT PASSWORD] Checked', tableName, 'table, found:', userResult.rows.length);

    // Security: Always return success even if user doesn't exist
    if (userResult.rows.length === 0) {
      console.log('[FORGOT PASSWORD] User not found, returning generic message');
      return NextResponse.json(
        {
          success: true,
          message: 'If an account exists with this email, you will receive a password reset link.',
        },
        { status: 200 }
      );
    }

    const user = userResult.rows[0];
    const fullName = `${user.first_name} ${user.last_name}`;

    // Generate reset token (64 character hex string)
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    console.log('[FORGOT PASSWORD] Generated reset token for:', user.email);

    // Delete old unused tokens for this email and user type
    await pool.query(
      'DELETE FROM password_reset_tokens WHERE user_email = $1 AND user_type = $2',
      [user.email, normalizedUserType]
    );

    // Create new reset token (V2 Schema)
    await pool.query(
      `INSERT INTO password_reset_tokens (user_email, user_type, reset_token, expires_at, used)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.email, normalizedUserType, resetToken, expiresAt, false]
    );

    console.log('[FORGOT PASSWORD] Token saved to database');

    // Create reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

    console.log('[FORGOT PASSWORD] Reset link created:', resetLink);

    // Send email
    try {
      await sendPasswordResetEmail(fullName, user.email, resetLink);
      console.log('[FORGOT PASSWORD] Reset email sent successfully');
    } catch (emailError) {
      console.error('[FORGOT PASSWORD] Failed to send email:', emailError);
      // Don't fail the request if email fails - token is still valid
    }

    return NextResponse.json(
      {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[FORGOT PASSWORD ERROR]:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request', details: (error as Error).message },
      { status: 500 }
    );
  }
}
