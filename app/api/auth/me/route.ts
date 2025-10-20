import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function GET(request: NextRequest) {
  try {
    // Try to get token from either 'token' or 'session' cookie for backward compatibility
    const token = request.cookies.get('token')?.value || request.cookies.get('session')?.value;

    if (!token) {
      console.log('[AUTH ME] No token found in cookies');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    console.log('[AUTH ME] Token found, verifying...');

    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userType = (payload.userType as string)?.toUpperCase();
    const userId = payload.userId;

    console.log('[AUTH ME] Token verified - UserType:', userType, 'UserId:', userId);

    let result;
    let user;

    // Query the appropriate table based on userType (V2 Schema)
    if (userType === 'ADMIN') {
      result = await pool.query(
        `SELECT id, email, first_name, last_name, phone, profile_picture, position, 'ADMIN' as role, 
                true as is_verified, created_at
         FROM admins 
         WHERE id = $1`,
        [userId]
      );
    } else if (userType === 'STAFF') {
      result = await pool.query(
        `SELECT s.id, s.email, s.first_name, s.last_name, s.phone, s.position, 
                s.profile_picture, s.employee_id, s.department,
                'STAFF' as role, true as is_verified, s.branch_id, 
                b.name as branch_name, s.created_at
         FROM staff s
         LEFT JOIN branches b ON s.branch_id = b.id
         WHERE s.id = $1`,
        [userId]
      );
    } else if (userType === 'GUEST') {
      result = await pool.query(
        `SELECT id, email, first_name, last_name, phone, address, profile_picture,
                date_of_birth, id_number, nationality, 'GUEST' as role, 
                is_verified, created_at
         FROM guests 
         WHERE id = $1`,
        [userId]
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    user = result.rows[0];

    // Construct response based on user type
    const responseData: any = {
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      profilePicture: user.profile_picture,
      role: user.role,
      userType: userType,
      isVerified: user.is_verified,
      createdAt: user.created_at
    };

    // Add type-specific fields
    if (userType === 'ADMIN') {
      responseData.position = user.position;
    } else if (userType === 'STAFF') {
      responseData.employeeId = user.employee_id;
      responseData.position = user.position;
      responseData.department = user.department;
      responseData.branchId = user.branch_id;
      responseData.branchName = user.branch_name;
    } else if (userType === 'GUEST') {
      responseData.address = user.address;
      responseData.dateOfBirth = user.date_of_birth;
      responseData.idNumber = user.id_number;
      responseData.nationality = user.nationality;
    }

    return NextResponse.json({
      user: responseData
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userType = (payload.userType as string)?.toUpperCase();
    const userId = payload.userId;

    const { firstName, lastName, phone, address, dateOfBirth, idNumber, nationality } = await request.json();

    let result;
    let user;

    // Update user data in appropriate table (V2 Schema)
    if (userType === 'ADMIN') {
      result = await pool.query(
        `UPDATE admins 
         SET first_name = $1, last_name = $2, phone = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING id, email, first_name, last_name, phone, 'ADMIN' as role, true as is_verified`,
        [firstName, lastName, phone, userId]
      );
    } else if (userType === 'STAFF') {
      result = await pool.query(
        `UPDATE staff 
         SET first_name = $1, last_name = $2, phone = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING id, email, first_name, last_name, phone, position, branch_id, 'STAFF' as role, true as is_verified`,
        [firstName, lastName, phone, userId]
      );
    } else if (userType === 'GUEST') {
      result = await pool.query(
        `UPDATE guests 
         SET first_name = $1, last_name = $2, phone = $3, address = $4, 
             date_of_birth = $5, id_number = $6, nationality = $7, updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING id, email, first_name, last_name, phone, address, date_of_birth, 
                   id_number, nationality, 'GUEST' as role, is_verified`,
        [firstName, lastName, phone, address || null, dateOfBirth || null, idNumber || null, nationality || null, userId]
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    user = result.rows[0];

    const responseData: any = {
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      isVerified: user.is_verified
    };

    // Add type-specific fields
    if (userType === 'STAFF') {
      responseData.position = user.position;
      responseData.branchId = user.branch_id;
    } else if (userType === 'GUEST') {
      responseData.address = user.address;
      responseData.dateOfBirth = user.date_of_birth;
      responseData.idNumber = user.id_number;
      responseData.nationality = user.nationality;
    }

    return NextResponse.json({
      success: true,
      user: responseData
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
