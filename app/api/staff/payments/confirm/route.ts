import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');

// Helper to verify staff token
async function verifyStaff(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role?.toString().toLowerCase() !== 'staff') {
      return null;
    }
    return payload;
  } catch (error) {
    return null;
  }
}

// POST - Confirm payment received (cash/card at front desk)
export async function POST(request: NextRequest) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { booking_id, amount, payment_method, notes } = body;

    // Validate required fields
    if (!booking_id || !amount || !payment_method) {
      return NextResponse.json({ 
        error: 'Missing required fields: booking_id, amount, payment_method' 
      }, { status: 400 });
    }

    // Validate payment method
    const validMethods = ['Cash', 'CreditCard', 'DebitCard', 'BankTransfer'];
    if (!validMethods.includes(payment_method)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    // Check if booking exists
    const bookingCheck = await pool.query(
      'SELECT id, total_amount FROM bookings WHERE id = $1',
      [booking_id]
    );

    if (bookingCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Generate payment reference
    const paymentReference = `PY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create payment record
    const insertResult = await pool.query(
      `INSERT INTO payments (
        booking_id, 
        payment_reference,
        amount, 
        payment_method, 
        payment_status,
        payment_date,
        notes,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, CURRENT_TIMESTAMP)
      RETURNING *`,
      [booking_id, paymentReference, amount, payment_method, 'Completed', notes || null]
    );

    // Check if booking is fully paid
    const paymentsResult = await pool.query(
      `SELECT 
        b.total_amount,
        COALESCE(SUM(p.amount), 0) AS total_paid
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id AND p.payment_status = 'Completed'
      WHERE b.id = $1
      GROUP BY b.total_amount`,
      [booking_id]
    );

    const { total_amount, total_paid } = paymentsResult.rows[0];
    const isFullyPaid = parseFloat(total_paid) >= parseFloat(total_amount);

    // Update booking status if fully paid
    if (isFullyPaid) {
      await pool.query(
        `UPDATE bookings SET status = 'Confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'Pending'`,
        [booking_id]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: {
        payment: insertResult.rows[0],
        total_amount: parseFloat(total_amount),
        total_paid: parseFloat(total_paid) + parseFloat(amount),
        remaining_balance: parseFloat(total_amount) - (parseFloat(total_paid) + parseFloat(amount)),
        is_fully_paid: isFullyPaid
      }
    });

  } catch (error) {
    console.error('[STAFF PAYMENT] Error confirming payment:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
