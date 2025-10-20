import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

async function verifyGuest(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value || cookieStore.get('session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const guest = await verifyGuest(request);
    if (!guest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const bookingId = parseInt(params.id);
    const guestId = guest.userId as number;

    // Verify booking belongs to guest
    const bookingCheck = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND guest_id = $2',
      [bookingId, guestId]
    );

    if (bookingCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookingCheck.rows[0];

    // Check if booking is confirmed
    if (booking.status !== 'Confirmed') {
      return NextResponse.json({ 
        error: 'Booking must be confirmed to check in' 
      }, { status: 400 });
    }

    // Check if payment is complete
    const paymentCheck = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as paid_amount
       FROM payments 
       WHERE booking_id = $1 AND payment_status = 'Completed'`,
      [bookingId]
    );

    const paidAmount = parseFloat(paymentCheck.rows[0].paid_amount);
    const totalAmount = parseFloat(booking.total_amount);

    if (paidAmount < totalAmount) {
      return NextResponse.json({ 
        error: 'Payment must be completed before check-in',
        outstanding: totalAmount - paidAmount
      }, { status: 400 });
    }

    // Update booking status and check-in timestamp
    await pool.query(
      `UPDATE bookings 
       SET status = 'CheckedIn', checked_in_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [bookingId]
    );

    // Update room status
    await pool.query(
      'UPDATE rooms SET status = $1 WHERE id = $2',
      ['Occupied', booking.room_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Checked in successfully'
    });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: 'Failed to check in', details: (error as Error).message },
      { status: 500 }
    );
  }
}
