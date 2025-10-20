// app/api/guest/rooms/check-availability/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room_id, check_in_date, check_out_date } = body;

    // Validation
    if (!room_id || !check_in_date || !check_out_date) {
      return NextResponse.json(
        { error: 'Missing required fields: room_id, check_in_date, check_out_date' },
        { status: 400 }
      );
    }

    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);

    // Validate dates
    if (checkOut <= checkIn) {
      return NextResponse.json(
        { 
          error: 'Check-out date must be after check-in date',
          available: false
        },
        { status: 400 }
      );
    }

    // Get room details
    const roomResult = await pool.query(
      `SELECT 
        r.id,
        r.room_number,
        r.status as room_status,
        rt.name as room_type,
        rt.base_price,
        br.name as branch_name
       FROM rooms r
       JOIN room_types rt ON r.room_type_id = rt.id
       JOIN branches br ON r.branch_id = br.id
       WHERE r.id = $1`,
      [room_id]
    );

    if (roomResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Room not found', available: false },
        { status: 404 }
      );
    }

    const room = roomResult.rows[0];

    // Check if room is under maintenance
    if (room.room_status === 'Maintenance') {
      return NextResponse.json({
        available: false,
        reason: 'Room is currently under maintenance',
        room: {
          id: room.id,
          room_number: room.room_number,
          room_type: room.room_type,
          branch_name: room.branch_name
        }
      });
    }

    // Check for conflicting bookings
    const availabilityCheck = await pool.query(
      `SELECT 
        b.id,
        b.booking_reference,
        b.check_in_date,
        b.check_out_date,
        b.status
       FROM bookings b
       WHERE b.room_id = $1
       AND b.status IN ('Pending', 'Confirmed', 'CheckedIn')
       AND (
         -- New booking starts during existing booking
         (b.check_in_date <= $2 AND b.check_out_date > $2) OR
         -- New booking ends during existing booking
         (b.check_in_date < $3 AND b.check_out_date >= $3) OR
         -- New booking completely contains existing booking
         (b.check_in_date >= $2 AND b.check_out_date <= $3)
       )
       ORDER BY b.check_in_date ASC`,
      [room_id, check_in_date, check_out_date]
    );

    const conflictingBookings = availabilityCheck.rows;

    if (conflictingBookings.length > 0) {
      return NextResponse.json({
        available: false,
        reason: 'Room is already booked for the selected dates',
        conflicting_bookings: conflictingBookings.map(booking => ({
          booking_reference: booking.booking_reference,
          check_in: booking.check_in_date,
          check_out: booking.check_out_date,
          status: booking.status
        })),
        room: {
          id: room.id,
          room_number: room.room_number,
          room_type: room.room_type,
          branch_name: room.branch_name,
          base_price: room.base_price
        }
      });
    }

    // Calculate pricing
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const baseAmount = parseFloat(room.base_price) * nights;

    // Room is available!
    return NextResponse.json({
      available: true,
      message: 'Room is available for your selected dates',
      room: {
        id: room.id,
        room_number: room.room_number,
        room_type: room.room_type,
        branch_name: room.branch_name,
        base_price: room.base_price
      },
      booking_details: {
        check_in_date,
        check_out_date,
        nights,
        price_per_night: parseFloat(room.base_price),
        base_amount: baseAmount,
        total_amount: baseAmount
      }
    });

  } catch (error) {
    console.error('[CHECK AVAILABILITY] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check room availability', 
        details: (error as Error).message,
        available: false
      },
      { status: 500 }
    );
  }
}

// GET method to check multiple rooms at once
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const check_in_date = searchParams.get('check_in_date');
    const check_out_date = searchParams.get('check_out_date');
    const branch_id = searchParams.get('branch_id');

    if (!check_in_date || !check_out_date) {
      return NextResponse.json(
        { error: 'Missing required parameters: check_in_date, check_out_date' },
        { status: 400 }
      );
    }

    // Build the WHERE clause for branch filter
    let branchFilter = '';
    const queryParams: any[] = [check_in_date, check_out_date];
    
    if (branch_id) {
      branchFilter = 'AND r.branch_id = $3';
      queryParams.push(branch_id);
    }

    // Get all rooms and their availability
    const result = await pool.query(
      `SELECT 
        r.id,
        r.room_number,
        r.status as room_status,
        rt.name as room_type,
        rt.base_price,
        rt.capacity AS max_occupancy,
        rt.images,
        br.id as branch_id,
        br.name as branch_name,
        br.location as branch_location,
        (
          SELECT COUNT(*)
          FROM bookings b
          WHERE b.room_id = r.id
          AND b.status IN ('Pending', 'Confirmed', 'CheckedIn')
          AND (
            (b.check_in_date <= $1 AND b.check_out_date > $1) OR
            (b.check_in_date < $2 AND b.check_out_date >= $2) OR
            (b.check_in_date >= $1 AND b.check_out_date <= $2)
          )
        ) as booking_count
       FROM rooms r
       JOIN room_types rt ON r.room_type_id = rt.id
       JOIN branches br ON r.branch_id = br.id
       WHERE r.status != 'OutOfOrder'
       ${branchFilter}
       ORDER BY br.name, rt.name, r.room_number`,
      queryParams
    );

    const rooms = result.rows.map(room => ({
      ...room,
      available: room.booking_count === 0 && room.room_status !== 'Maintenance',
      availability_status: 
        room.room_status === 'Maintenance' ? 'Under Maintenance' :
        room.booking_count > 0 ? 'Booked' : 'Available'
    }));

    // Use date-only math to avoid timezone shifts
    const ci = check_in_date.slice(0,10);
    const co = check_out_date.slice(0,10);
    const [y1,m1,d1] = ci.split('-').map(x=>parseInt(x,10));
    const [y2,m2,d2] = co.split('-').map(x=>parseInt(x,10));
    const nights = Math.ceil((Date.UTC(y2,(m2||1)-1,d2||1) - Date.UTC(y1,(m1||1)-1,d1||1)) / (1000*60*60*24));

    return NextResponse.json({
      check_in_date,
      check_out_date,
      nights,
      total_rooms: rooms.length,
      available_rooms: rooms.filter(r => r.available).length,
      rooms
    });

  } catch (error) {
    console.error('[CHECK AVAILABILITY - GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check availability', details: (error as Error).message },
      { status: 500 }
    );
  }
}
