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

// PATCH - Update booking status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ['Pending', 'Confirmed', 'CheckedIn', 'CheckedOut', 'Cancelled', 'NoShow'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Build update query based on status
    let updateQuery = '';
    let updateParams: any[] = [];

    if (status === 'CheckedIn') {
      updateQuery = `
        UPDATE bookings 
        SET status = $1, checked_in_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      updateParams = [status, id];

      // Also update room status to Occupied
      await pool.query(
        `UPDATE rooms SET status = 'Occupied' WHERE id = (SELECT room_id FROM bookings WHERE id = $1)`,
        [id]
      );
    } else if (status === 'CheckedOut') {
      updateQuery = `
        UPDATE bookings 
        SET status = $1, checked_out_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      updateParams = [status, id];

      // Update room status to Cleaning (ready for housekeeping)
      await pool.query(
        `UPDATE rooms SET status = 'Cleaning' WHERE id = (SELECT room_id FROM bookings WHERE id = $1)`,
        [id]
      );
    } else {
      updateQuery = `
        UPDATE bookings 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      updateParams = [status, id];
    }

    const result = await pool.query(updateQuery, updateParams);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Fetch complete booking details with guest and room info
    const detailsResult = await pool.query(
      `SELECT 
        b.*,
        g.first_name || ' ' || g.last_name AS guest_name,
        g.email AS guest_email,
        g.phone AS guest_phone,
        r.room_number,
        rt.name AS room_type
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE b.id = $1`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: `Booking status updated to ${status}`,
      data: detailsResult.rows[0]
    });

  } catch (error) {
    console.error('[STAFF BOOKING STATUS] Error updating status:', error);
    return NextResponse.json(
      { error: 'Failed to update booking status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
