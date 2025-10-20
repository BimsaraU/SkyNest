import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

// Helper to verify staff token
async function verifyStaff(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role?.toString().toLowerCase() !== 'staff') {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

// GET - Get bookings for staff (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get staff member's branch_id
    const staffData = await pool.query(
      'SELECT branch_id FROM staff WHERE id = $1',
      [staff.userId]
    );

    if (staffData.rows.length === 0) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const staffBranchId = staffData.rows[0].branch_id;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = `
      SELECT 
        b.id,
        b.booking_reference,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.status,
        b.total_amount,
        b.special_requests,
        b.created_at,
        b.checked_in_at,
        b.checked_out_at,
        g.first_name || ' ' || g.last_name AS guest_name,
        g.email AS guest_email,
        g.phone AS guest_phone,
        r.room_number,
        rt.name AS room_type,
        br.name AS branch_name,
        COALESCE(
          (SELECT SUM(amount) FROM payments WHERE booking_id = b.id AND payment_status = 'Completed'),
          0
        ) AS paid_amount
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      WHERE r.branch_id = $1
    `;
    
    const params: any[] = [staffBranchId];
    let paramIndex = 2;

    // Filter by date (check-in or check-out)
    if (date) {
      query += ` AND (b.check_in_date = $${paramIndex} OR b.check_out_date = $${paramIndex})`;
      params.push(date);
      paramIndex++;
    }

    // Filter by status
    if (status && status !== 'all') {
      query += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Search by guest name, email, or booking reference
    if (search) {
      query += ` AND (
        LOWER(g.first_name || ' ' || g.last_name) LIKE LOWER($${paramIndex}) 
        OR LOWER(g.email) LIKE LOWER($${paramIndex})
        OR LOWER(b.booking_reference) LIKE LOWER($${paramIndex})
        OR r.room_number LIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY b.check_in_date DESC, b.created_at DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('[STAFF BOOKINGS] Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
