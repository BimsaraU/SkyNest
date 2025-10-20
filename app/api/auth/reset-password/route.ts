import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { hashPassword } from '@/lib/authUtils';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    console.log('[RESET PASSWORD] Request received');

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
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

    console.log('[RESET PASSWORD] Looking up token in database');

    // Find valid reset token (V2 Schema)
    const tokenResult = await pool.query(
      `SELECT user_email, user_type, expires_at, used 
       FROM password_reset_tokens 
       WHERE reset_token = $1 AND expires_at > NOW() AND used = false`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      console.log('[RESET PASSWORD] Token not found or expired');
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const { user_email, user_type } = tokenResult.rows[0];

    console.log('[RESET PASSWORD] Token valid for:', user_email, 'Type:', user_type);

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password in the appropriate table based on user type (V2 Schema)
    let updateResult;
    if (user_type === 'ADMIN') {
      updateResult = await pool.query(
        'UPDATE admins SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
        [hashedPassword, user_email]
      );
    } else if (user_type === 'STAFF') {
      updateResult = await pool.query(
        'UPDATE staff SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
        [hashedPassword, user_email]
      );
    } else if (user_type === 'GUEST') {
      updateResult = await pool.query(
        'UPDATE guests SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
        [hashedPassword, user_email]
      );
    } else {
      console.log('[RESET PASSWORD] Invalid user type:', user_type);
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }

    if (updateResult.rowCount === 0) {
      console.log('[RESET PASSWORD] User not found in', user_type, 'table');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[RESET PASSWORD] Password updated successfully');

    // Mark token as used instead of deleting
    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE reset_token = $1',
      [token]
    );

    console.log('[RESET PASSWORD] Token marked as used');

    return NextResponse.json({
      success: true,
      message: 'Password reset successful! You can now login with your new password.'
    });
  } catch (error) {
    console.error('[RESET PASSWORD ERROR]:', error);
    return NextResponse.json(
      { error: 'An error occurred while resetting password', details: (error as Error).message },
      { status: 500 }
    );
  }
}
