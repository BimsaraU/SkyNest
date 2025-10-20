import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

// Admin Users List API - Get all users (admins, staff, guests)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role'); // 'admin', 'staff', 'guest', or 'all'
    const search = searchParams.get('search');

    // Get current user from JWT to exclude them
    let currentUserId: number | null = null;
    let currentUserRole: string | null = null;
    
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        currentUserId = payload.userId as number;
        currentUserRole = payload.role as string;
      } catch (error) {
        console.error('[USERS API] Token verification failed:', error);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Unauthorized - No token' }, { status: 401 });
    }

    // Get admins (exclude current user if they're an admin)
    const adminsQuery = role === 'all' || role === 'admin' || !role ? `
      SELECT 
        id,
        email,
        first_name || ' ' || last_name as name,
        first_name,
        last_name,
        phone,
        'admin' as role,
        COALESCE(position, 'Administrator') as position,
        is_active as status,
        created_at as joined_date,
        COALESCE(last_login, created_at) as last_login
      FROM admins
      WHERE 1=1
      ${currentUserRole === 'ADMIN' && currentUserId ? `AND id != ${currentUserId}` : ''}
      ${search ? `AND (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)` : ''}
      ORDER BY created_at DESC
    ` : '';

    // Get staff
    const staffQuery = role === 'all' || role === 'staff' || !role ? `
      SELECT 
        s.id,
        s.email,
        s.first_name || ' ' || s.last_name as name,
        s.first_name,
        s.last_name,
        s.phone,
        'staff' as role,
        COALESCE(s.position, 'Staff Member') as position,
        s.is_active as status,
        s.created_at as joined_date,
        COALESCE(s.last_login, s.created_at) as last_login,
        b.name as branch_name,
        s.employee_id
      FROM staff s
      LEFT JOIN branches b ON s.branch_id = b.id
      ${search ? `WHERE s.first_name ILIKE $1 OR s.last_name ILIKE $1 OR s.email ILIKE $1` : ''}
      ORDER BY s.created_at DESC
    ` : '';

    // Get guests
    const guestsQuery = role === 'all' || role === 'guest' || !role ? `
      SELECT 
        id,
        email,
        first_name || ' ' || last_name as name,
        first_name,
        last_name,
        phone,
        'guest' as role,
        NULL as position,
        is_active as status,
        created_at as joined_date,
        COALESCE(last_login, created_at) as last_login
      FROM guests
      ${search ? `WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1` : ''}
      ORDER BY created_at DESC
    ` : '';

    const searchParam = search ? [`%${search}%`] : [];
    
    const results = await Promise.all([
      adminsQuery ? pool.query(adminsQuery, searchParam) : Promise.resolve({ rows: [] }),
      staffQuery ? pool.query(staffQuery, searchParam) : Promise.resolve({ rows: [] }),
      guestsQuery ? pool.query(guestsQuery, searchParam) : Promise.resolve({ rows: [] })
    ]);

    // Combine all users
    const allUsers = [
      ...results[0].rows,
      ...results[1].rows,
      ...results[2].rows
    ].sort((a, b) => new Date(b.joined_date).getTime() - new Date(a.joined_date).getTime());

    // Get statistics
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM admins WHERE is_active = true) as active_admins,
        (SELECT COUNT(*) FROM staff WHERE is_active = true) as active_staff,
        (SELECT COUNT(*) FROM guests WHERE is_active = true) as active_guests,
        (SELECT COUNT(*) FROM admins) as total_admins,
        (SELECT COUNT(*) FROM staff) as total_staff,
        (SELECT COUNT(*) FROM guests) as total_guests
    `;

    const statsResult = await pool.query(statsQuery);

    return NextResponse.json({
      users: allUsers,
      stats: statsResult.rows[0]
    });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// CREATE new user
export async function POST(request: NextRequest) {
  try {
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
      employee_id,
      is_active = true
    } = data;

    // Validate required fields
    if (!first_name || !last_name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    let query: string;
    let values: any[];
    let result;

    if (role === 'admin') {
      query = `
        INSERT INTO admins (email, password_hash, first_name, last_name, phone, position, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, email, first_name, last_name, phone, position, is_active, created_at
      `;
      values = [email, hashedPassword, first_name, last_name, phone || null, position || 'Administrator', is_active];
    } else if (role === 'staff') {
      if (!branch_id) {
        return NextResponse.json(
          { error: 'Branch ID is required for staff members' },
          { status: 400 }
        );
      }
      
      const generatedEmployeeId = employee_id || `EMP-${Date.now()}`;
      
      query = `
        INSERT INTO staff (employee_id, password_hash, first_name, last_name, phone, email, branch_id, position, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, employee_id, first_name, last_name, phone, email, branch_id, position, is_active, created_at
      `;
      values = [generatedEmployeeId, hashedPassword, first_name, last_name, phone || null, email, parseInt(branch_id), position || 'Staff Member', is_active];
    } else {
      // guest
      query = `
        INSERT INTO guests (email, password_hash, first_name, last_name, phone, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, first_name, last_name, phone, is_active, created_at
      `;
      values = [email, hashedPassword, first_name, last_name, phone || null, is_active];
    }

    result = await pool.query(query, values);
    
    const newUser = result.rows[0];

    return NextResponse.json({
      message: 'User created successfully',
      user: {
        ...newUser,
        role
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Create user error:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.constraint?.includes('email')) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }
      if (error.constraint?.includes('employee_id')) {
        return NextResponse.json(
          { error: 'Employee ID already exists' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create user', details: error.message },
      { status: 500 }
    );
  }
}
