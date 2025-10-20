import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// Admin Rooms List API - Get all room instances with their details
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const status = searchParams.get('status');
    const roomTypeId = searchParams.get('roomTypeId');

    let query = `
      SELECT 
        r.id,
        r.room_number,
        r.status,
        r.branch_id,
        b.name as branch_name,
        b.location as branch_location,
        rt.id as room_type_id,
        rt.name as room_type_name,
        rt.base_price,
        rt.capacity,
        rt.bed_type,
        rt.size_sqm
      FROM rooms r
      JOIN branches b ON r.branch_id = b.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (branchId && branchId !== 'all') {
      query += ` AND r.branch_id = $${paramCount}`;
      params.push(parseInt(branchId));
      paramCount++;
    }

    if (status && status !== 'all') {
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (roomTypeId && roomTypeId !== 'all') {
      query += ` AND r.room_type_id = $${paramCount}`;
      params.push(parseInt(roomTypeId));
      paramCount++;
    }

    query += ` ORDER BY r.branch_id, r.room_number`;

    const result = await pool.query(query, params);

    // Check if room_instance_amenities table exists and fetch amenities for each room
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'room_instance_amenities'
      );
    `);

    const rooms = result.rows;
    
    if (tableCheck.rows[0].exists) {
      // Fetch amenities for all rooms in one query
      const amenitiesResult = await pool.query(`
        SELECT ria.room_id, a.id, a.name, a.icon_name
        FROM room_instance_amenities ria
        JOIN amenities a ON ria.amenity_id = a.id
        ORDER BY ria.room_id, a.name
      `);

      // Group amenities by room_id
      const amenitiesByRoom: { [key: number]: any[] } = {};
      amenitiesResult.rows.forEach(row => {
        if (!amenitiesByRoom[row.room_id]) {
          amenitiesByRoom[row.room_id] = [];
        }
        amenitiesByRoom[row.room_id].push({
          id: row.id,
          name: row.name,
          icon_name: row.icon_name
        });
      });

      // Add amenities to each room
      rooms.forEach(room => {
        room.amenities = amenitiesByRoom[room.id] || [];
      });
    }

    // Get summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_rooms,
        COUNT(CASE WHEN status = 'Available' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'Occupied' THEN 1 END) as occupied,
        COUNT(CASE WHEN status = 'Maintenance' THEN 1 END) as maintenance,
        COUNT(CASE WHEN status = 'Cleaning' THEN 1 END) as cleaning
      FROM rooms
      ${branchId && branchId !== 'all' ? `WHERE branch_id = $1` : ''}
    `;

    const statsResult = await pool.query(
      statsQuery,
      branchId && branchId !== 'all' ? [parseInt(branchId)] : []
    );

    return NextResponse.json({
      rooms,
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Get rooms list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Create new room
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { room_number, room_type_id, branch_id, floor_number, status, notes, amenities } = body;

    console.log('Creating room with data:', body);

    // Validation
    if (!room_number || !room_type_id || !branch_id) {
      return NextResponse.json(
        { error: 'Room number, room type, and branch are required' },
        { status: 400 }
      );
    }

    // Check for duplicate room number
    const existingRoom = await pool.query(
      'SELECT id FROM rooms WHERE room_number = $1',
      [room_number]
    );

    if (existingRoom.rows.length > 0) {
      return NextResponse.json(
        { error: 'A room with this number already exists' },
        { status: 400 }
      );
    }

    // Verify room type exists
    const roomTypeCheck = await pool.query(
      'SELECT id FROM room_types WHERE id = $1',
      [room_type_id]
    );

    if (roomTypeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid room type' },
        { status: 400 }
      );
    }

    // Verify branch exists
    const branchCheck = await pool.query(
      'SELECT id FROM branches WHERE id = $1',
      [branch_id]
    );

    if (branchCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid branch' },
        { status: 400 }
      );
    }

    // Start transaction for room + amenities
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert new room
      const roomResult = await client.query(
        `INSERT INTO rooms (room_number, room_type_id, branch_id, floor_number, status, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::room_status_enum, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          room_number,
          room_type_id,
          branch_id,
          floor_number || null,
          status || 'Available',
          notes || null
        ]
      );

      const newRoom = roomResult.rows[0];

      // Insert amenities if provided
      if (amenities && Array.isArray(amenities) && amenities.length > 0) {
        // First, check if the table exists
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'room_instance_amenities'
          );
        `);

        if (tableCheck.rows[0].exists) {
          // Insert amenities for this room
          for (const amenityId of amenities) {
            await client.query(
              `INSERT INTO room_instance_amenities (room_id, amenity_id, created_at)
               VALUES ($1, $2, CURRENT_TIMESTAMP)
               ON CONFLICT (room_id, amenity_id) DO NOTHING`,
              [newRoom.id, amenityId]
            );
          }
        } else {
          console.log('room_instance_amenities table does not exist yet. Skipping amenity insertion.');
        }
      }

      await client.query('COMMIT');
      
      console.log('Room created successfully with amenities:', newRoom);

      return NextResponse.json({ 
        room: newRoom,
        message: 'Room created successfully'
      }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Failed to create room', details: error.message },
      { status: 500 }
    );
  }
}
