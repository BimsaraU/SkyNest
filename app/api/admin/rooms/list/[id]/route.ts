import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// GET single room
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const roomId = parseInt(params.id);

    if (isNaN(roomId)) {
      return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT 
        r.id,
        r.room_number,
        r.room_type_id,
        rt.name as room_type_name,
        r.branch_id,
        r.floor_number,
        r.status,
        r.notes,
        r.last_cleaned,
        r.created_at,
        r.updated_at
      FROM rooms r
      LEFT JOIN room_types rt ON r.room_type_id = rt.id
      WHERE r.id = $1`,
      [roomId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const room = result.rows[0];

    // Fetch amenities if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'room_instance_amenities'
      );
    `);

    if (tableCheck.rows[0].exists) {
      const amenitiesResult = await pool.query(
        `SELECT a.id, a.name, a.description, a.icon_name
         FROM room_instance_amenities ria
         JOIN amenities a ON ria.amenity_id = a.id
         WHERE ria.room_id = $1
         ORDER BY a.name`,
        [roomId]
      );
      room.amenities = amenitiesResult.rows;
    } else {
      room.amenities = [];
    }

    return NextResponse.json({ room });
  } catch (error: any) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update room
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const roomId = parseInt(params.id);

    if (isNaN(roomId)) {
      return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
    }

    const body = await request.json();
    const { room_number, room_type_id, branch_id, floor_number, status, notes, amenities } = body;

    // Validation
    if (!room_number || !room_type_id || !branch_id) {
      return NextResponse.json(
        { error: 'Room number, room type, and branch are required' },
        { status: 400 }
      );
    }

    // Check for duplicate room number (exclude current room)
    const existingRoom = await pool.query(
      'SELECT id FROM rooms WHERE room_number = $1 AND id != $2',
      [room_number, roomId]
    );

    if (existingRoom.rows.length > 0) {
      return NextResponse.json(
        { error: 'A room with this number already exists' },
        { status: 400 }
      );
    }

    // Start transaction for room + amenities
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update room
      const roomResult = await client.query(
        `UPDATE rooms 
         SET room_number = $1,
             room_type_id = $2,
             branch_id = $3,
             floor_number = $4,
             status = $5::room_status_enum,
             notes = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [
          room_number,
          room_type_id,
          branch_id,
          floor_number || null,
          status || 'Available',
          notes || null,
          roomId
        ]
      );

      if (roomResult.rows.length === 0) {
        await client.query('ROLLBACK');
        client.release();
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      const updatedRoom = roomResult.rows[0];

      // Update amenities if provided
      if (amenities && Array.isArray(amenities)) {
        // Check if table exists
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'room_instance_amenities'
          );
        `);

        if (tableCheck.rows[0].exists) {
          // Delete existing amenities
          await client.query(
            'DELETE FROM room_instance_amenities WHERE room_id = $1',
            [roomId]
          );

          // Insert new amenities
          for (const amenityId of amenities) {
            await client.query(
              `INSERT INTO room_instance_amenities (room_id, amenity_id, created_at)
               VALUES ($1, $2, CURRENT_TIMESTAMP)`,
              [roomId, amenityId]
            );
          }
        }
      }

      await client.query('COMMIT');
      
      console.log('Room updated successfully with amenities:', updatedRoom);

      return NextResponse.json({ 
        room: updatedRoom,
        message: 'Room updated successfully'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Failed to update room', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete room
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const roomId = parseInt(params.id);

    if (isNaN(roomId)) {
      return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
    }

    // Check if room has bookings
    const bookingsCheck = await pool.query(
      'SELECT COUNT(*) as count FROM bookings WHERE room_id = $1',
      [roomId]
    );

    const bookingCount = parseInt(bookingsCheck.rows[0].count);

    if (bookingCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete room with ${bookingCount} bookings. This room has booking history.` },
        { status: 400 }
      );
    }

    // Delete room
    const result = await pool.query(
      'DELETE FROM rooms WHERE id = $1 RETURNING *',
      [roomId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    console.log('Room deleted successfully:', roomId);

    return NextResponse.json({ 
      message: 'Room deleted successfully',
      room: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error deleting room:', error);
    return NextResponse.json(
      { error: 'Failed to delete room', details: error.message },
      { status: 500 }
    );
  }
}
