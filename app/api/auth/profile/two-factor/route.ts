import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

// Helper to get user from token
async function getUserFromToken(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

// PUT - Toggle Two-Factor Authentication
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.userId as number;
    const role = user.role as string;
    const { enabled } = await request.json();

    // Normalize role to lowercase
    const normalizedRole = role?.toLowerCase();

    // Determine which table to update
    let tableName = '';
    if (normalizedRole === 'admin') tableName = 'admins';
    else if (normalizedRole === 'staff') tableName = 'staff';
    else if (normalizedRole === 'guest') tableName = 'guests';
    else {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Update two_factor_enabled field
    const query = `
      UPDATE ${tableName}
      SET two_factor_enabled = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, first_name, last_name, two_factor_enabled
    `;

    const result = await pool.query(query, [enabled, userId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`[2FA] ${enabled ? 'Enabled' : 'Disabled'} 2FA for user ${result.rows[0].email}`);

    return NextResponse.json({
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`,
      two_factor_enabled: result.rows[0].two_factor_enabled
    });
  } catch (error) {
    console.error('Toggle 2FA error:', error);
    return NextResponse.json(
      { error: 'Failed to update two-factor authentication', details: (error as Error).message },
      { status: 500 }
    );
  }
}
