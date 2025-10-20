import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// GET - Get user's bookings (V2 Schema - uses guest_id)
export async function GET(request: NextRequest) {
  try {
    // Support both 'token' and 'session' cookie names
    const token = request.cookies.get('token')?.value || request.cookies.get('session')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const guestId = payload.userId as number;
    const userType = payload.userType as string;
    const role = (payload.role as string)?.toUpperCase();

    // Only guests can view their bookings through this endpoint
    if (userType !== 'GUEST' && role !== 'GUEST') {
      return NextResponse.json(
        { error: 'Only guests can access this endpoint' },
        { status: 403 }
      );
    }

    // Get bookings using V2 schema structure
    const result = await pool.query(
      `SELECT 
        b.id,
        b.booking_reference,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.total_amount,
        b.status,
        b.special_requests,
        b.checked_in_at,
        b.checked_out_at,
        b.created_at,
        r.id as room_id,
        r.room_number,
        r.floor_number,
        rt.id as room_type_id,
        rt.name as room_type,
        rt.base_price,
        rt.capacity,
        rt.description as room_description,
        rt.images as room_images,
        br.id as branch_id,
        br.name as branch_name,
        br.location as branch_location,
        br.address as branch_address,
        (
          SELECT COALESCE(SUM(amount), 0) 
          FROM payments 
          WHERE booking_id = b.id 
          AND payment_status = 'Completed'
        ) as paid_amount,
        (
          SELECT ARRAY_AGG(
            json_build_object(
              'id', p.id,
              'amount', p.amount,
              'payment_method', p.payment_method,
              'payment_status', p.payment_status,
              'paid_at', p.paid_at,
              'payment_reference', p.payment_reference
            )
            ORDER BY p.created_at DESC
          )
          FROM payments p
          WHERE p.booking_id = b.id
        ) as payments
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN room_types rt ON r.room_type_id = rt.id
       JOIN branches br ON r.branch_id = br.id
       WHERE b.guest_id = $1
       ORDER BY b.created_at DESC`,
      [guestId]
    );

    // Calculate outstanding amount for each booking
    const bookings = result.rows.map(booking => ({
      ...booking,
      outstanding_amount: parseFloat(booking.total_amount) - parseFloat(booking.paid_amount || 0),
      room_image: booking.room_images && booking.room_images.length > 0 ? booking.room_images[0] : null
    }));

    return NextResponse.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Create new booking (V2 Schema - uses guest_id)
export async function POST(request: NextRequest) {
  try {
    console.log('[BOOKING API] Starting booking creation...');
    
    // Support both 'token' and 'session' cookie names
    const token = request.cookies.get('token')?.value || request.cookies.get('session')?.value;

    if (!token) {
      console.error('[BOOKING API] No authentication token found');
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const guestId = payload.userId as number;
    const userType = payload.userType as string;
    const role = (payload.role as string)?.toUpperCase();

    console.log('[BOOKING API] User authenticated:', { guestId, userType, role });

    // Only guests can create bookings
    if (userType !== 'GUEST' && role !== 'GUEST') {
      console.error('[BOOKING API] User is not a guest');
      return NextResponse.json(
        { error: 'Only guests can create bookings' },
        { status: 403 }
      );
    }

    const {
      roomId,
      room_type_id,
      branch_id,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      specialRequests
    } = await request.json();

    console.log('[BOOKING API] Booking request data:', {
      roomId,
      room_type_id,
      branch_id,
      checkInDate,
      checkOutDate,
      numberOfGuests,
      specialRequests
    });

    // Validation - need either roomId OR (room_type_id + branch_id)
    if (!checkInDate || !checkOutDate || !numberOfGuests) {
      return NextResponse.json(
        { error: 'Missing required fields: checkInDate, checkOutDate, numberOfGuests' },
        { status: 400 }
      );
    }

    if (!roomId && (!room_type_id || !branch_id)) {
      return NextResponse.json(
        { error: 'Must provide either roomId or (room_type_id + branch_id)' },
        { status: 400 }
      );
    }

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      return NextResponse.json(
        { error: 'Check-in date cannot be in the past' },
        { status: 400 }
      );
    }

    if (checkOut <= checkIn) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    let finalRoomId = roomId;

    // If room_type_id and branch_id provided, find available room
    if (!roomId && room_type_id && branch_id) {
      console.log('[BOOKING API] Finding available room for:', { room_type_id, branch_id, checkInDate, checkOutDate });
      
      const availabilityQuery = await pool.query(`
        SELECT r.id
        FROM rooms r
        WHERE r.room_type_id = $1 
          AND r.branch_id = $2
          AND r.status = 'Available'
          AND r.id NOT IN (
            SELECT room_id 
            FROM bookings 
            WHERE status IN ('Confirmed', 'CheckedIn')
              AND check_out_date > $3
              AND check_in_date < $4
          )
        LIMIT 1
      `, [room_type_id, branch_id, checkInDate, checkOutDate]);

      console.log('[BOOKING API] Available rooms found:', availabilityQuery.rows.length);

      if (availabilityQuery.rows.length === 0) {
        console.error('[BOOKING API] No available rooms');
        return NextResponse.json({ 
          error: 'No rooms available for selected dates',
          details: 'Please try different dates or another room type'
        }, { status: 400 });
      }

      finalRoomId = availabilityQuery.rows[0].id;
      console.log('[BOOKING API] Selected room ID:', finalRoomId);
    }

    console.log('[BOOKING API] Creating booking with room ID:', finalRoomId);

    // Create booking directly with INSERT instead of procedure
    // Calculate total amount based on room type price and number of nights
    const nightsQuery = await pool.query(`
      SELECT 
        rt.base_price,
        ($1::date - $2::date) as nights
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE r.id = $3
    `, [checkOutDate, checkInDate, finalRoomId]);

    console.log('[BOOKING API] Nights calculation:', nightsQuery.rows[0]);

    if (nightsQuery.rows.length === 0) {
      return NextResponse.json({ 
        error: 'Room not found' 
      }, { status: 404 });
    }

    const { base_price, nights } = nightsQuery.rows[0];
    const totalAmount = parseFloat(base_price) * parseInt(nights);

    console.log('[BOOKING API] Calculated total:', { base_price, nights, totalAmount });

    // Insert booking directly
    console.log('[BOOKING API] Inserting booking...');
    const bookingInsert = await pool.query(
      `INSERT INTO bookings (
        guest_id, room_id, check_in_date, check_out_date, 
        number_of_guests, total_amount, special_requests, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending')
      RETURNING id, booking_reference, total_amount`,
      [
        guestId,
        finalRoomId,
        checkInDate,
        checkOutDate,
        numberOfGuests,
        totalAmount,
        specialRequests || null
      ]
    );

    const newBooking = bookingInsert.rows[0];
    console.log('[BOOKING API] Booking inserted:', newBooking);

    // Get the full booking details with room and branch info
    const bookingResult = await pool.query(
      `SELECT 
        b.*,
        r.room_number,
        rt.name as room_type,
        br.name as branch_name
       FROM bookings b
       JOIN rooms r ON b.room_id = r.id
       JOIN room_types rt ON r.room_type_id = rt.id
       JOIN branches br ON r.branch_id = br.id
       WHERE b.id = $1`,
      [newBooking.id]
    );

    const booking = bookingResult.rows[0];

    console.log('[BOOKING API] Booking created successfully:', booking.booking_reference);

    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        id: booking.id,
        booking_reference: booking.booking_reference,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        total_amount: booking.total_amount,
        status: booking.status,
        room_number: booking.room_number,
        room_type: booking.room_type,
        branch_name: booking.branch_name
      }
    }, { status: 201 });
  } catch (error) {
    console.error('[BOOKING API] Error creating booking:', error);
    console.error('[BOOKING API] Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack
    });
    const errorMessage = (error as Error).message;
    
    // Handle specific database errors
    if (errorMessage.includes('already booked')) {
      return NextResponse.json(
        { error: 'Room is already booked for the selected dates' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create booking', details: errorMessage },
      { status: 500 }
    );
  }
}
