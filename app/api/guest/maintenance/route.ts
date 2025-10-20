import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

// Helper to verify guest token
async function verifyGuest(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role?.toString().toLowerCase() !== 'guest') {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

// GET - Get maintenance requests for guest's current bookings
export async function GET(request: NextRequest) {
  try {
    const guest = await verifyGuest(request);
    if (!guest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guestId = guest.userId as number;

    // Get maintenance requests for rooms where guest has active bookings
    const result = await pool.query(
      `SELECT 
        ml.id,
        ml.log_reference,
        ml.issue_description,
        ml.priority,
        ml.status,
        ml.assigned_to_staff_id,
        ml.resolved_at,
        ml.created_at,
        ml.updated_at,
        r.room_number,
        rt.name as room_type,
        br.name as branch_name,
        b.booking_reference,
        b.check_in_date,
        b.check_out_date,
        assigned_staff.first_name || ' ' || assigned_staff.last_name as assigned_to_name
      FROM maintenance_logs ml
      JOIN rooms r ON ml.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      JOIN bookings b ON b.room_id = r.id
      LEFT JOIN staff assigned_staff ON ml.assigned_to_staff_id = assigned_staff.id
      WHERE b.guest_id = $1 
        AND b.status IN ('Confirmed', 'CheckedIn')
        AND b.check_in_date <= CURRENT_DATE
        AND b.check_out_date >= CURRENT_DATE
      ORDER BY 
        CASE ml.priority
          WHEN 'Urgent' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Normal' THEN 3
          WHEN 'Low' THEN 4
        END,
        ml.created_at DESC`,
      [guestId]
    );

    return NextResponse.json({ 
      success: true,
      maintenance_requests: result.rows 
    });
  } catch (error) {
    console.error('[MAINTENANCE API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance requests', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Create a new maintenance request
export async function POST(request: NextRequest) {
  try {
    const guest = await verifyGuest(request);
    if (!guest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guestId = guest.userId as number;
    const body = await request.json();
    const { booking_id, issue_description, priority = 'Normal' } = body;

    // Validate required fields
    if (!booking_id || !issue_description) {
      return NextResponse.json(
        { error: 'Booking ID and issue description are required' },
        { status: 400 }
      );
    }

    // Verify the booking belongs to the guest and is active
    const bookingCheck = await pool.query(
      `SELECT b.id, b.room_id, b.status, b.booking_reference,
        r.room_number, rt.name as room_type
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE b.id = $1 AND b.guest_id = $2 
        AND b.status IN ('Confirmed', 'CheckedIn')`,
      [booking_id, guestId]
    );

    if (bookingCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid booking or booking not active' },
        { status: 400 }
      );
    }

    const booking = bookingCheck.rows[0];

    // Validate priority enum
    const validPriorities = ['Low', 'Normal', 'High', 'Urgent'];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be: Low, Normal, High, or Urgent' },
        { status: 400 }
      );
    }

    // Create maintenance request
    const result = await pool.query(
      `INSERT INTO maintenance_logs 
        (room_id, issue_description, priority, status, reported_by_guest_id, notes)
      VALUES ($1, $2, $3::request_priority_enum, 'Pending', $4, $5)
      RETURNING id, log_reference, issue_description, priority, status, created_at`,
      [
        booking.room_id,
        issue_description,
        priority,
        guestId,
        `Reported by guest for booking ${booking.booking_reference}`
      ]
    );

    const maintenanceLog = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Maintenance request submitted successfully',
      maintenance_request: {
        ...maintenanceLog,
        room_number: booking.room_number,
        room_type: booking.room_type,
        booking_reference: booking.booking_reference
      }
    }, { status: 201 });
  } catch (error) {
    console.error('[MAINTENANCE API] POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to create maintenance request', details: (error as Error).message },
      { status: 500 }
    );
  }
}
