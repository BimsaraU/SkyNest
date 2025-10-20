import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// POST - Record payment
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || request.cookies.get('session')?.value;
    //add
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const guestId = payload.userId as number;

    const {
      booking_id,
      bookingId,
      amount,
      payment_method,
      method,
      transactionId,
      notes
    } = await request.json();

    const finalBookingId = booking_id || bookingId;
    const finalMethod = payment_method || method;

    // Validation
    if (!finalBookingId || !amount) {
      return NextResponse.json(
        { error: 'Booking ID and amount are required' },
        { status: 400 }
      );
    }

    // Validate payment method
  // Align with payment_method_enum in DB: ('CreditCard','DebitCard','Cash','BankTransfer','Online')
  const validMethods = ['Cash', 'CreditCard', 'DebitCard', 'BankTransfer', 'Online'];
    if (finalMethod && !validMethods.includes(finalMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 }
      );
    }

    // Get booking details - verify ownership
    const bookingCheck = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND guest_id = $2',
      [finalBookingId, guestId]
    );

    if (bookingCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingCheck.rows[0];

    // Check outstanding amount
    const paymentsResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as paid_amount
       FROM payments 
       WHERE booking_id = $1 AND payment_status = 'Completed'`,
      [finalBookingId]
    );

    const paidAmount = parseFloat(paymentsResult.rows[0].paid_amount);
    const totalAmount = parseFloat(booking.total_amount);
    const outstanding = totalAmount - paidAmount;

    if (amount > outstanding) {
      return NextResponse.json({ 
        error: 'Payment amount exceeds outstanding balance',
        outstanding: outstanding
      }, { status: 400 });
    }

    // Generate payment reference
    const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Insert payment record
    console.log('[PAYMENT API] Creating payment:', {
      booking_id: finalBookingId,
      amount,
      method: finalMethod || 'CreditCard',
      reference: paymentReference
    });

    const paymentResult = await pool.query(
      `INSERT INTO payments (
        booking_id, 
        amount, 
        payment_method, 
        payment_status,
        transaction_id,
        paid_at
      ) VALUES ($1, $2, $3, 'Completed', $4, CURRENT_TIMESTAMP)
      RETURNING id, payment_reference`,
      [finalBookingId, amount, finalMethod || 'CreditCard', transactionId || null]
    );

    const payment = paymentResult.rows[0];
    console.log('[PAYMENT API] Payment created:', payment);

    // Check if booking is now fully paid
    const newPaidAmount = paidAmount + parseFloat(amount);
    if (newPaidAmount >= totalAmount && booking.status === 'Pending') {
      await pool.query(
        'UPDATE bookings SET status = $1 WHERE id = $2',
        ['Confirmed', finalBookingId]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      payment: {
        id: payment.id,
        payment_reference: payment.payment_reference,
        amount: amount,
        outstanding: outstanding - parseFloat(amount)
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Record payment error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}

// GET - Get payments for a booking
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
    if (typeof payload.role === 'string' && payload.role.toLowerCase() === 'guest') {
      const bookingCheck = await pool.query(
        'SELECT guest_id FROM bookings WHERE id = $1',
        [bookingId]
      );

      if (bookingCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      if (bookingCheck.rows[0].guest_id !== payload.userId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    const result = await pool.query(
      `SELECT 
        id,
        payment_reference,
        amount,
        payment_method,
        transaction_id,
        payment_status,
        notes,
        created_at
       FROM payments
       WHERE booking_id = $1
       ORDER BY created_at DESC`,
      [bookingId]
    );

    return NextResponse.json({
      payments: result.rows.map((p) => ({
        ...p,
        amount: parseFloat(p.amount)
      }))
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
