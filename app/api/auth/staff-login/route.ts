import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { comparePassword } from '../../../../lib/authUtils';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(request: Request) {
  try {
    const { employeeId, password, branch } = await request.json();

    console.log('[STAFF LOGIN] Request received - EmployeeId:', employeeId, 'Branch:', branch);

    if (!employeeId || !password || !branch) {
      return NextResponse.json({ error: 'Employee ID, password, and branch are required.' }, { status: 400 });
    }

    // Query for staff user with matching employee ID
    const staffRes = await pool.query(
      `SELECT 
        id, 
        employee_id,
        email, 
        password_hash, 
        first_name, 
        last_name, 
        phone, 
        branch_id,
        position,
        is_active 
      FROM staff 
      WHERE employee_id = $1`,
      [employeeId]
    );

    if (staffRes.rowCount === 0) {
      console.log('[STAFF LOGIN] No staff found with employee ID:', employeeId);
      return NextResponse.json({ error: 'Invalid employee ID or password.' }, { status: 401 });
    }

    const staff = staffRes.rows[0];

    // Verify password
    const passwordMatch = await comparePassword(password, staff.password_hash);

    if (!passwordMatch) {
      console.log('[STAFF LOGIN] Password mismatch for employee:', employeeId);
      return NextResponse.json({ error: 'Invalid employee ID or password.' }, { status: 401 });
    }

    console.log('[STAFF LOGIN] Authentication successful for:', employeeId);

    // Create JWT token
    const token = await new SignJWT({
      userId: staff.id,
      employeeId: staff.employee_id,
      email: staff.email,
      role: 'STAFF',
      userType: 'STAFF',
      name: `${staff.first_name} ${staff.last_name}`,
      branchId: staff.branch_id,
      position: staff.position
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    console.log('[STAFF LOGIN] JWT token created successfully');

    // Set cookie and return user data
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: staff.id,
        employeeId: staff.employee_id,
        email: staff.email,
        name: `${staff.first_name} ${staff.last_name}`,
        phone: staff.phone,
        role: 'STAFF',
        branchId: staff.branch_id,
        position: staff.position
      }
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    console.log('[STAFF LOGIN] Token cookie set for staff:', staff.id);

    return response;

  } catch (err) {
    console.error('[STAFF LOGIN API ERROR]:', err);
    console.error('[STAFF LOGIN ERROR STACK]:', err instanceof Error ? err.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'An internal server error occurred.',
      details: process.env.NODE_ENV === 'development' ? (err instanceof Error ? err.message : String(err)) : undefined
    }, { status: 500 });
  }
}
