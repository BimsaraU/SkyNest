import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db';
import { hashPassword } from '@/lib/authUtils';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    
    console.log('[ADMIN RESET PASSWORD] Request received');
    
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required.' }, { status: 400 });
    }
    
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    console.log('[ADMIN RESET PASSWORD] Looking up token in database');

    // Find valid reset token for admin (V2 Schema)
    const tokenRes = await pool.query(
      `SELECT user_email, user_type, expires_at, used 
       FROM password_reset_tokens 
       WHERE reset_token = $1 AND user_type = 'ADMIN' AND expires_at > NOW() AND used = false`,
      [token]
    );

    if (tokenRes.rowCount === 0) {
      console.log('[ADMIN RESET PASSWORD] Token not found, expired, or already used');
      return NextResponse.json({ error: 'Invalid or expired password reset token.' }, { status: 400 });
    }
    
    const tokenData = tokenRes.rows[0];
    
    console.log('[ADMIN RESET PASSWORD] Token valid for:', tokenData.user_email);
    
    // Hash new password
    const newPasswordHash = await hashPassword(password);

    // Update admin password in admins table (V2 Schema)
    const updateResult = await pool.query(
      'UPDATE admins SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [newPasswordHash, tokenData.user_email]
    );

    if (updateResult.rowCount === 0) {
      console.log('[ADMIN RESET PASSWORD] Admin not found in admins table');
      return NextResponse.json({ error: 'Admin not found.' }, { status: 404 });
    }

    console.log('[ADMIN RESET PASSWORD] Password updated successfully');

    // Mark token as used instead of deleting
    await pool.query(
      'UPDATE password_reset_tokens SET used = true WHERE reset_token = $1',
      [token]
    );

    console.log('[ADMIN RESET PASSWORD] Token marked as used');

    return NextResponse.json({ 
      success: true,
      message: 'Password has been reset successfully.' 
    });

  } catch (err) {
    console.error('[ADMIN RESET PASSWORD ERROR]:', err);
    return NextResponse.json({ 
      error: 'An internal server error occurred.',
      details: (err as Error).message 
    }, { status: 500 });
  }
}
