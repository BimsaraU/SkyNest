import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// PUT - Update room status (Admin only)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    console.log('[ADMIN ROOMS API] PUT request received for room:', params.id);
    
    const admin = await verifyAdmin(request);
    if (!admin) {
      console.log('[ADMIN ROOMS API] Unauthorized - no admin token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[ADMIN ROOMS API] Admin verified:', admin.email);

    const { status } = await request.json();
    const roomId = parseInt(params.id);

    console.log('[ADMIN ROOMS API] Update request - Room ID:', roomId, 'New Status:', status);

    // Validate status
    const validStatuses = ['Available', 'Occupied', 'Maintenance', 'Cleaning'];
    if (!validStatuses.includes(status)) {
      console.log('[ADMIN ROOMS API] Invalid status:', status);
      return NextResponse.json({ 
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 });
    }

    // Update room status - cast to enum type explicitly
    const result = await pool.query(
      `UPDATE rooms 
       SET status = $1::room_status_enum, 
           updated_at = CURRENT_TIMESTAMP,
           last_cleaned = CASE WHEN $1 = 'Available' THEN CURRENT_TIMESTAMP ELSE last_cleaned END
       WHERE id = $2
       RETURNING id, room_number, status, updated_at`,
      [status, roomId]
    );

    if (result.rows.length === 0) {
      console.log('[ADMIN ROOMS API] Room not found:', roomId);
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    console.log(`[ADMIN ROOMS API] ✅ Success - Room ${result.rows[0].room_number} status updated to ${status} by admin ${admin.email}`);

    return NextResponse.json({
      message: 'Room status updated successfully',
      room: result.rows[0]
    });
  } catch (error) {
    console.error('[ADMIN ROOMS API] ❌ Error updating room status:', error);
    console.error('[ADMIN ROOMS API] Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    return NextResponse.json(
      { error: 'Failed to update room status', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// GET - Get single room details (Admin only)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roomId = parseInt(params.id);

    const result = await pool.query(
      `SELECT 
        r.*,
        rt.name as room_type_name,
        rt.base_price,
        rt.capacity,
        rt.bed_type,
        rt.size_sqm,
        b.name as branch_name,
        b.location as branch_location
       FROM rooms r
       JOIN room_types rt ON r.room_type_id = rt.id
       JOIN branches b ON r.branch_id = b.id
       WHERE r.id = $1`,
      [roomId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({ room: result.rows[0] });
  } catch (error) {
    console.error('[ADMIN] Get room error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room', details: (error as Error).message },
      { status: 500 }
    );
  }
}
