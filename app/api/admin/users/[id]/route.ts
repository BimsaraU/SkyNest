import { NextResponse, NextRequest } from 'next/server';
import pool from '../../../../../lib/db';
import bcrypt from 'bcryptjs';
import { verifyAdmin } from '../../../../../lib/adminAuth';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

// GET single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin authentication
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(params.id);
    
    // Check all three tables
    const queries = [
      pool.query('SELECT *, \'admin\' as role FROM admins WHERE id = $1', [userId]),
      pool.query('SELECT *, \'staff\' as role FROM staff WHERE id = $1', [userId]),
      pool.query('SELECT *, \'guest\' as role FROM guests WHERE id = $1', [userId])
    ];
    
    const [adminRes, staffRes, guestRes] = await Promise.all(queries);
    
    const user = adminRes.rows[0] || staffRes.rows[0] || guestRes.rows[0];
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Remove sensitive data
    delete user.password_hash;
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// UPDATE user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);
    const data = await request.json();
    
    const {
      first_name,
      last_name,
      email,
      phone,
      password,
      role,
      position,
      branch_id,
      is_active
    } = data;

    // Determine which table to update based on role
    let table: string;
    let updateFields: string[] = [];
    let values: any[] = [];
    let paramCounter = 1;

    if (role === 'admin') {
      table = 'admins';
      updateFields.push(`first_name = $${paramCounter++}`);
      values.push(first_name);
      updateFields.push(`last_name = $${paramCounter++}`);
      values.push(last_name);
      updateFields.push(`email = $${paramCounter++}`);
      values.push(email);
      
      if (phone) {
        updateFields.push(`phone = $${paramCounter++}`);
        values.push(phone);
      }
      if (position) {
        updateFields.push(`position = $${paramCounter++}`);
        values.push(position);
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push(`password_hash = $${paramCounter++}`);
        values.push(hashedPassword);
      }
      if (typeof is_active !== 'undefined') {
        updateFields.push(`is_active = $${paramCounter++}`);
        values.push(is_active);
      }
    } else if (role === 'staff') {
      table = 'staff';
      updateFields.push(`first_name = $${paramCounter++}`);
      values.push(first_name);
      updateFields.push(`last_name = $${paramCounter++}`);
      values.push(last_name);
      
      if (phone) {
        updateFields.push(`phone = $${paramCounter++}`);
        values.push(phone);
      }
      if (email) {
        updateFields.push(`email = $${paramCounter++}`);
        values.push(email);
      }
      if (position) {
        updateFields.push(`position = $${paramCounter++}`);
        values.push(position);
      }
      if (branch_id) {
        updateFields.push(`branch_id = $${paramCounter++}`);
        values.push(parseInt(branch_id));
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push(`password_hash = $${paramCounter++}`);
        values.push(hashedPassword);
      }
      if (typeof is_active !== 'undefined') {
        updateFields.push(`is_active = $${paramCounter++}`);
        values.push(is_active);
      }
    } else {
      // guest
      table = 'guests';
      updateFields.push(`first_name = $${paramCounter++}`);
      values.push(first_name);
      updateFields.push(`last_name = $${paramCounter++}`);
      values.push(last_name);
      updateFields.push(`email = $${paramCounter++}`);
      values.push(email);
      
      if (phone) {
        updateFields.push(`phone = $${paramCounter++}`);
        values.push(phone);
      }
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push(`password_hash = $${paramCounter++}`);
        values.push(hashedPassword);
      }
      if (typeof is_active !== 'undefined') {
        updateFields.push(`is_active = $${paramCounter++}`);
        values.push(is_active);
      }
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId); // For WHERE clause

    const query = `
      UPDATE ${table}
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedUser = result.rows[0];
    delete updatedUser.password_hash;

    return NextResponse.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);
    
    // Get JWT token to prevent deleting self
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    let currentUserId: number | null = null;
    let currentUserRole: string | null = null;
    
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        currentUserId = payload.userId as number;
        currentUserRole = payload.role as string;
      } catch {}
    }
    
    // Get user info from request to determine table
    const { role } = await request.json();
    
    // Normalize role to lowercase for comparison
    const normalizedRole = role?.toLowerCase();
    
    // Prevent admin from deleting themselves
    if (normalizedRole === 'admin' && currentUserId === userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    let table: string;
    if (normalizedRole === 'admin') table = 'admins';
    else if (normalizedRole === 'staff') table = 'staff';
    else table = 'guests';

    // Permanent delete - remove the record completely
    const result = await pool.query(
      `DELETE FROM ${table} WHERE id = $1 RETURNING id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'User deleted permanently',
      id: userId
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user', details: (error as Error).message },
      { status: 500 }
    );
  }
}
