import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// GET - Get booking details (V2 Schema)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const bookingId = parseInt(params.id);

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

    // Get single booking
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
       WHERE b.id = $1 AND b.guest_id = $2`,
      [bookingId, guestId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = result.rows[0];
    
    // Calculate outstanding amount
    const outstanding_amount = parseFloat(booking.total_amount) - parseFloat(booking.paid_amount || 0);

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        outstanding_amount,
        room_image: booking.room_images && booking.room_images.length > 0 ? booking.room_images[0] : null
      }
    });
  } catch (error) {
    console.error('Get booking details error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking details' },
      { status: 500 }
    );
  }
}

// PATCH - Update booking (check-in, check-out, cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('session')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const { id } = await params;
    const { action, reason } = await request.json();

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'checkin':
        // Only staff/admin can check in
        if (payload.role !== 'Admin' && payload.role !== 'Staff') {
          return NextResponse.json(
            { error: 'Only staff can check in guests' },
            { status: 403 }
          );
        }

        result = await pool.query(
          'CALL process_checkin($1, NULL, NULL)',
          [id]
        );
        break;

      case 'checkout':
        // Only staff/admin can check out
        if (payload.role !== 'Admin' && payload.role !== 'Staff') {
          return NextResponse.json(
            { error: 'Only staff can check out guests' },
            { status: 403 }
          );
        }

        result = await pool.query(
          'CALL process_checkout($1, NULL, NULL, NULL)',
          [id]
        );
        break;

      case 'cancel':
        result = await pool.query(
          'CALL cancel_booking($1, NULL, NULL, NULL, $2)',
          [id, reason || null]
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const output = result.rows[0];

    if (!output.p_success) {
      return NextResponse.json(
        { error: output.p_message },
        { status: 400 }
      );
    }

    const response: any = {
      success: true,
      message: output.p_message
    };

    if (action === 'checkout' && output.p_outstanding) {
      response.outstanding = output.p_outstanding;
    }

    if (action === 'cancel' && output.p_refund_amount) {
      response.refundAmount = output.p_refund_amount;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}
