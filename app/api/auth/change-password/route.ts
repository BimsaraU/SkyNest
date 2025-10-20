import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

// Helper to get user from token
async function getUserFromToken(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    console.error('[CHANGE-PASSWORD] No token found');
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    console.log('[CHANGE-PASSWORD] Token verified for user:', payload.userId);
    return payload;
  } catch (error) {
    console.error('[CHANGE-PASSWORD] Token verification failed:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.userId as number;
    const role = (user.role as string).toLowerCase();
    const { currentPassword, newPassword } = await request.json();

    console.log('[CHANGE-PASSWORD] Request for user:', userId, 'role:', role);

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Determine which table to query
    let tableName = '';
    if (role === 'admin') tableName = 'admins';
    else if (role === 'staff') tableName = 'staff';
    else if (role === 'guest') tableName = 'guests';
    else {
      return NextResponse.json({ error: 'Invalid user role' }, { status: 400 });
    }

    // Get current password hash
    const result = await pool.query(
      `SELECT password_hash FROM ${tableName} WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentPasswordHash = result.rows[0].password_hash;

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, currentPasswordHash);

    if (!isPasswordValid) {
      console.log('[CHANGE-PASSWORD] Current password is incorrect');
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      `UPDATE ${tableName} SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newPasswordHash, userId]
    );

    console.log('[CHANGE-PASSWORD] Password updated successfully for user:', userId);

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('[CHANGE-PASSWORD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
