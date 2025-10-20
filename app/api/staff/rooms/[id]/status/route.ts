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

// PUT - Update room status (Staff only - their branch)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await request.json();
    const roomId = parseInt(params.id);
    const staffId = staff.userId as number;

    // Validate status
    const validStatuses = ['Available', 'Occupied', 'Maintenance', 'Cleaning'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 });
    }

    // Get staff's branch
    const staffResult = await pool.query(
      'SELECT branch_id, first_name, last_name FROM staff WHERE id = $1',
      [staffId]
    );

    if (staffResult.rows.length === 0) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    const staffBranchId = staffResult.rows[0].branch_id;
    const staffName = `${staffResult.rows[0].first_name} ${staffResult.rows[0].last_name}`;

    // Verify room belongs to staff's branch
    const roomCheck = await pool.query(
      'SELECT branch_id, room_number FROM rooms WHERE id = $1',
      [roomId]
    );

    if (roomCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (roomCheck.rows[0].branch_id !== staffBranchId) {
      return NextResponse.json({ 
        error: 'You can only update rooms in your assigned branch' 
      }, { status: 403 });
    }

    // Update room status
    const result = await pool.query(
      `UPDATE rooms 
       SET status = $1, 
           updated_at = CURRENT_TIMESTAMP,
           last_cleaned = CASE WHEN $1 = 'Available' THEN CURRENT_TIMESTAMP ELSE last_cleaned END
       WHERE id = $2
       RETURNING id, room_number, status, updated_at`,
      [status, roomId]
    );

    console.log(`[STAFF] Room ${result.rows[0].room_number} status updated to ${status} by staff ${staffName}`);

    return NextResponse.json({
      message: 'Room status updated successfully',
      room: result.rows[0]
    });
  } catch (error) {
    console.error('[STAFF] Update room status error:', error);
    return NextResponse.json(
      { error: 'Failed to update room status', details: (error as Error).message },
      { status: 500 }
    );
  }
}
