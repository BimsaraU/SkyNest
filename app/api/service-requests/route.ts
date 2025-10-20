import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// POST - Request a service
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);

    const {
      bookingId,
      serviceId,
      quantity,
      instructions
    } = await request.json();

    // Validation
    if (!bookingId || !serviceId) {
      return NextResponse.json(
        { error: 'Booking ID and Service ID are required' },
        { status: 400 }
      );
    }

    // If guest, verify they own the booking
    if (payload.role === 'Guest') {
      const bookingCheck = await pool.query(
        'SELECT user_id FROM bookings WHERE id = $1',
        [bookingId]
      );

      if (bookingCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      if (bookingCheck.rows[0].user_id !== payload.userId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Call request_service procedure
    const result = await pool.query(
      `CALL request_service(
        $1, $2,
        NULL, NULL, NULL,
        $3, $4
      )`,
      [bookingId, serviceId, quantity || 1, instructions || null]
    );

    const serviceRequest = result.rows[0];

    if (!serviceRequest.p_success) {
      return NextResponse.json(
        { error: serviceRequest.p_message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: serviceRequest.p_message,
      request: {
        id: serviceRequest.p_request_id
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Request service error:', error);
    return NextResponse.json(
      { error: 'Failed to request service' },
      { status: 500 }
    );
  }
}

// GET - Get service requests for a booking
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const searchParams = request.nextUrl.searchParams;
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // If guest, verify they own the booking
    if (payload.role === 'Guest') {
      const bookingCheck = await pool.query(
        'SELECT user_id FROM bookings WHERE id = $1',
        [bookingId]
      );

      if (bookingCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      if (bookingCheck.rows[0].user_id !== payload.userId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    const result = await pool.query(
      `SELECT 
        sr.id,
        sr.request_reference,
        sr.quantity,
        sr.total_price,
        sr.status,
        sr.special_instructions,
        sr.fulfilled_at,
        sr.created_at,
        sc.name as service_name,
        sc.category as service_category
       FROM service_requests sr
       JOIN service_catalog sc ON sr.service_id = sc.id
       WHERE sr.booking_id = $1
       ORDER BY sr.created_at DESC`,
      [bookingId]
    );

    return NextResponse.json({
      requests: result.rows
    });
  } catch (error) {
    console.error('Get service requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service requests' },
      { status: 500 }
    );
  }
}
