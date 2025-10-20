import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    // Get user ID
    const userRes = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    );

    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userRes.rows[0];

    // Get all OTPs for this user
    const otpsRes = await pool.query(
      `SELECT id, otp_code, expires_at, created_at, 
              expires_at > NOW() as is_valid,
              EXTRACT(EPOCH FROM (expires_at - NOW())) as seconds_until_expiry
       FROM otps 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [user.id]
    );

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      otps: otpsRes.rows,
      totalOtps: otpsRes.rowCount,
      currentTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug OTP error:', error);
    return NextResponse.json(
      { error: 'An error occurred', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
