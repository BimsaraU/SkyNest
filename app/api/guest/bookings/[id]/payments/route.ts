// app/api/guest/bookings/[id]/payments/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

// Helper to verify guest token
async function verifyGuest(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role?.toString().toLowerCase() !== 'guest') {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

// GET - Get all payments for a booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guest = await verifyGuest(request);
    if (!guest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const bookingId = parseInt(resolvedParams.id);
    const guestId = guest.userId as number;

    // Verify booking belongs to guest
    const bookingCheck = await pool.query(
      `SELECT 
        b.id, 
        b.guest_id, 
        b.booking_reference,
        b.base_amount,
        b.services_amount,
        b.total_amount,
        b.paid_amount,
        b.outstanding_amount,
        b.status
       FROM bookings b
       WHERE b.id = $1`,
      [bookingId]
    );

    if (bookingCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookingCheck.rows[0];

    if (booking.guest_id !== guestId) {
      return NextResponse.json({ error: 'Unauthorized - Not your booking' }, { status: 403 });
    }

    // Get all payments for this booking
    const paymentsResult = await pool.query(
      `SELECT 
        id,
        payment_reference,
        amount,
        payment_method,
        payment_status,
        payment_type,
        transaction_id,
        paid_at,
        notes,
        created_at
       FROM payments
       WHERE booking_id = $1
       ORDER BY created_at DESC`,
      [bookingId]
    );

    // Calculate payment summary
    const completedPayments = paymentsResult.rows.filter(p => p.payment_status === 'Completed');
    const totalPaid = completedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const pendingPayments = paymentsResult.rows.filter(p => p.payment_status === 'Pending');
    const totalPending = pendingPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    return NextResponse.json({
      booking: {
        id: booking.id,
        booking_reference: booking.booking_reference,
        base_amount: parseFloat(booking.base_amount),
        services_amount: parseFloat(booking.services_amount),
        total_amount: parseFloat(booking.total_amount),
        paid_amount: parseFloat(booking.paid_amount),
        outstanding_amount: parseFloat(booking.outstanding_amount),
        status: booking.status
      },
      payments: paymentsResult.rows.map(p => ({
        ...p,
        amount: parseFloat(p.amount)
      })),
      payment_summary: {
        total_payments: paymentsResult.rows.length,
        completed_payments: completedPayments.length,
        pending_payments: pendingPayments.length,
        total_paid: totalPaid,
        total_pending: totalPending
      }
    });

  } catch (error) {
    console.error('[GET BOOKING PAYMENTS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment history', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Make an additional payment for a booking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guest = await verifyGuest(request);
    if (!guest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const bookingId = parseInt(resolvedParams.id);
    const guestId = guest.userId as number;

    const body = await request.json();
    const { amount, payment_method, payment_type, notes } = body;

    // Validation
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount: must be greater than 0' },
        { status: 400 }
      );
    }

    if (!payment_method) {
      return NextResponse.json(
        { error: 'Missing payment_method' },
        { status: 400 }
      );
    }

    // Verify booking belongs to guest
    const bookingCheck = await pool.query(
      `SELECT 
        b.id, 
        b.guest_id, 
        b.booking_reference,
        b.base_amount,
        b.services_amount,
        b.total_amount,
        b.paid_amount,
        b.outstanding_amount,
        b.status
       FROM bookings b
       WHERE b.id = $1`,
      [bookingId]
    );

    if (bookingCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookingCheck.rows[0];

    if (booking.guest_id !== guestId) {
      return NextResponse.json({ error: 'Unauthorized - Not your booking' }, { status: 403 });
    }

    // Check if booking is in a state where payments can be made
    if (['Cancelled', 'NoShow', 'CheckedOut'].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot make payment for ${booking.status} booking` },
        { status: 400 }
      );
    }

    // Check if payment amount exceeds outstanding amount
    const outstandingAmount = parseFloat(booking.outstanding_amount);
    if (amount > outstandingAmount) {
      return NextResponse.json(
        { 
          error: 'Payment amount exceeds outstanding balance',
          outstanding_amount: outstandingAmount
        },
        { status: 400 }
      );
    }

    // Create payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments 
        (booking_id, amount, payment_method, payment_status, payment_type, paid_at, notes)
       VALUES ($1, $2, $3::payment_method_enum, 'Completed', $4, CURRENT_TIMESTAMP, $5)
       RETURNING *`,
      [
        bookingId,
        amount,
        payment_method,
        payment_type || 'partial',
        notes || `Additional payment for booking ${booking.booking_reference}`
      ]
    );

    const payment = paymentResult.rows[0];

    // Get updated booking totals (trigger will auto-calculate)
    const updatedBookingResult = await pool.query(
      `SELECT 
        base_amount, 
        services_amount, 
        total_amount, 
        paid_amount, 
        outstanding_amount,
        status
       FROM bookings 
       WHERE id = $1`,
      [bookingId]
    );

    const updatedBooking = updatedBookingResult.rows[0];

    // Update booking status to Confirmed if fully paid and was Pending
    if (parseFloat(updatedBooking.outstanding_amount) === 0 && booking.status === 'Pending') {
      await pool.query(
        `UPDATE bookings SET status = 'Confirmed' WHERE id = $1`,
        [bookingId]
      );
      updatedBooking.status = 'Confirmed';
    }

    return NextResponse.json({
      success: true,
      message: parseFloat(updatedBooking.outstanding_amount) === 0 
        ? 'Payment completed successfully. Booking is now fully paid!'
        : 'Payment processed successfully.',
      payment: {
        id: payment.id,
        payment_reference: payment.payment_reference,
        amount: parseFloat(payment.amount),
        payment_method: payment.payment_method,
        payment_type: payment.payment_type,
        payment_status: payment.payment_status,
        paid_at: payment.paid_at
      },
      updated_booking: {
        booking_reference: booking.booking_reference,
        base_amount: parseFloat(updatedBooking.base_amount),
        services_amount: parseFloat(updatedBooking.services_amount),
        total_amount: parseFloat(updatedBooking.total_amount),
        paid_amount: parseFloat(updatedBooking.paid_amount),
        outstanding_amount: parseFloat(updatedBooking.outstanding_amount),
        status: updatedBooking.status,
        fully_paid: parseFloat(updatedBooking.outstanding_amount) === 0
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[MAKE BOOKING PAYMENT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment', details: (error as Error).message },
      { status: 500 }
    );
  }
}
