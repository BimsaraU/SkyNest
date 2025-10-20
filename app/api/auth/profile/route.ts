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
    console.error('[PROFILE] No token found in cookies');
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    console.log('[PROFILE] Token decoded successfully:', { userId: payload.userId, role: payload.role });
    return payload;
  } catch (error) {
    console.error('[PROFILE] Token verification failed:', error);
    return null;
  }
}

// GET - Fetch current user profile
export async function GET(request: NextRequest) {
  try {
    console.log('[PROFILE GET] Request received');
    const user = await getUserFromToken(request);

    if (!user) {
      console.error('[PROFILE GET] No user found from token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[PROFILE GET] User from token:', user);
    const userId = user.userId as number;
    const role = user.role as string;

    // Normalize role to lowercase
    const normalizedRole = role?.toLowerCase();
    console.log('[PROFILE GET] Normalized role:', normalizedRole);

    // Determine which table to query based on role
    let tableName = '';
    if (normalizedRole === 'admin') tableName = 'admins';
    else if (normalizedRole === 'staff') tableName = 'staff';
    else if (normalizedRole === 'guest') tableName = 'guests';
    else {
      console.error('[PROFILE GET] Invalid role:', normalizedRole);
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    console.log('[PROFILE GET] Querying table:', tableName, 'for userId:', userId);

    // Fetch user profile
    const query = `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        phone,
        profile_picture,
        is_active,
        created_at,
        last_login,
        ${normalizedRole === 'staff' ? 'branch_id, position, department, hire_date, employee_id,' : ''}
        ${normalizedRole === 'admin' ? 'position, access_level, branch_id,' : ''}
        ${normalizedRole === 'guest' ? 'loyalty_points, preferences, address, nationality, date_of_birth, id_number, passport_number, is_verified,' : ''}
        updated_at
      FROM ${tableName}
      WHERE id = $1
    `;

    const result = await pool.query(query, [userId]);

    console.log('[PROFILE GET] Query executed. Rows found:', result.rows.length);

    if (result.rows.length === 0) {
      console.error('[PROFILE GET] User not found in database for userId:', userId, 'in table:', tableName);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = result.rows[0];
    console.log('[PROFILE GET] Profile loaded for:', profile.email);

    // If staff, get branch name
    if (normalizedRole === 'staff' && profile.branch_id) {
      const branchResult = await pool.query(
        'SELECT name, location FROM branches WHERE id = $1',
        [profile.branch_id]
      );
      if (branchResult.rows.length > 0) {
        profile.branch_name = branchResult.rows[0].name;
        profile.branch_location = branchResult.rows[0].location;
      }
    }

    console.log('[PROFILE GET] Returning profile data successfully');
    return NextResponse.json({
      profile: {
        ...profile,
        role: normalizedRole,
        full_name: `${profile.first_name} ${profile.last_name}`
      }
    });
  } catch (error) {
    console.error('[PROFILE GET] Error in GET handler:', error);
    if (error instanceof Error) {
      console.error('[PROFILE GET] Error message:', error.message);
      console.error('[PROFILE GET] Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.userId as number;
    const role = user.role as string;
    const body = await request.json();

    // Normalize role to lowercase
    const normalizedRole = role?.toLowerCase();
    console.log('[PROFILE PUT] Normalized role:', normalizedRole);

    // Determine which table to update
    let tableName = '';
    if (normalizedRole === 'admin') tableName = 'admins';
    else if (normalizedRole === 'staff') tableName = 'staff';
    else if (normalizedRole === 'guest') tableName = 'guests';
    else {
      console.error('[PROFILE PUT] Invalid role:', normalizedRole);
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Build update query dynamically based on provided fields
    const allowedFields = ['first_name', 'last_name', 'phone', 'profile_picture'];
    if (normalizedRole === 'guest') allowedFields.push('preferences', 'address', 'nationality', 'date_of_birth');
    if (normalizedRole === 'staff' || normalizedRole === 'admin') allowedFields.push('position');

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramCount}`);
        values.push(body[field]);
        paramCount++;
      }
    });

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Add updated_at timestamp
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId); // WHERE clause parameter

    const query = `
      UPDATE ${tableName}
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id,
        email,
        first_name,
        last_name,
        phone,
        profile_picture,
        is_active,
        updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Profile updated successfully',
      profile: {
        ...result.rows[0],
        role: normalizedRole,
        full_name: `${result.rows[0].first_name} ${result.rows[0].last_name}`
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile', details: (error as Error).message },
      { status: 500 }
    );
  }
}
