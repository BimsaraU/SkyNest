import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifyStaffOrAdmin } from '@/lib/adminAuth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
  const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyStaffOrAdmin(request)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const branchId = searchParams.get('branchId')
    const roomTypeId = searchParams.get('roomTypeId')
    const status = searchParams.get('status')
    const floor = searchParams.get('floor')

    const conditions: string[] = []
    const values: any[] = []

    if (branchId) { values.push(branchId); conditions.push(`r.branch_id = $${values.length}`) }
    if (roomTypeId) { values.push(roomTypeId); conditions.push(`r.room_type_id = $${values.length}`) }
    if (status) { values.push(status); conditions.push(`r.status = $${values.length}`) }
    if (floor) { values.push(parseInt(floor)); conditions.push(`r.floor_number = $${values.length}`) }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows } = await pool.query(
      `SELECT 
         r.id,
         r.room_number,
         r.status,
         r.floor_number,
         rt.id AS room_type_id,
         rt.name AS room_type_name,
         rt.base_price,
         rt.bed_type,
         rt.capacity AS max_occupancy,
         b.id AS branch_id,
         b.name AS branch_name,
         b.location AS branch_location
       FROM rooms r
       JOIN room_types rt ON r.room_type_id = rt.id
       JOIN branches b ON r.branch_id = b.id
       ${whereClause}
       ORDER BY r.floor_number ASC NULLS LAST, r.room_number ASC`,
      values
    )

    // Normalize numeric types
    const data = rows.map((r: any) => ({
      ...r,
      base_price: r.base_price != null ? Number(r.base_price) : null,
    }))

    return NextResponse.json({ success: true, count: data.length, data }, { status: 200 })
  } catch (error) {
    console.error('Error fetching room instances:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room instances' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = await verifyStaffOrAdmin(request)
    if (!decoded || String(decoded.role).toLowerCase() !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

  const body = await request.json()
  const { roomNumber, floor, roomTypeId, branchId, notes } = body

    // Validation
    if (!roomNumber || !floor || !roomTypeId || !branchId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if room number already exists in branch
    const exists = await pool.query(
      `SELECT 1 FROM rooms WHERE room_number = $1 AND branch_id = $2 LIMIT 1`,
      [roomNumber, branchId]
    )

    if (exists.rowCount && exists.rowCount > 0) {
      return NextResponse.json(
        { error: 'Room number already exists in this branch' },
        { status: 400 }
      )
    }

    // Create room
    const insert = await pool.query(
      `INSERT INTO rooms (room_number, floor_number, room_type_id, branch_id, notes, status)
       VALUES ($1, $2, $3, $4, $5, 'Available')
       RETURNING id, room_number, floor_number, room_type_id, branch_id, status, notes`,
      [roomNumber, parseInt(floor.toString()), roomTypeId, branchId, notes || null]
    )

    const room = insert.rows[0]
    return NextResponse.json({ success: true, message: 'Room created successfully', data: room }, { status: 201 })
  } catch (error) {
    console.error('Error creating room:', error)
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    )
  }
}