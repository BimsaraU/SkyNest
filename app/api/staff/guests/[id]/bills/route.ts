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

// GET - Get detailed bills for a specific guest
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get guest info
    const guestResult = await pool.query(
      `SELECT 
        id, 
        first_name, 
        last_name, 
        email, 
        phone,
        loyalty_points
      FROM guests 
      WHERE id = $1`,
      [id]
    );

    if (guestResult.rows.length === 0) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    const guest = guestResult.rows[0];

    // Get all bookings with billing details
    const bookingsResult = await pool.query(
      `SELECT 
        b.id,
        b.booking_reference,
        b.check_in_date,
        b.check_out_date,
        b.status,
        b.total_amount AS room_charges,
        b.special_requests,
        r.room_number,
        rt.name AS room_type,
        br.name AS branch_name,
        br.location AS branch_location,
        -- Service charges
        COALESCE(
          (
            SELECT SUM(sr.quantity * sc.price)
            FROM service_requests sr
            JOIN service_catalog sc ON sr.service_id = sc.id
            WHERE sr.booking_id = b.id AND sr.status = 'Completed'
          ),
          0
        ) AS service_charges,
        -- Payments made
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', p.id,
                'payment_reference', p.payment_reference,
                'amount', p.amount,
                'payment_method', p.payment_method,
                'payment_date', p.payment_date,
                'payment_status', p.payment_status,
                'notes', p.notes
              ) ORDER BY p.payment_date DESC
            )
            FROM payments p
            WHERE p.booking_id = b.id
          ),
          '[]'::json
        ) AS payments,
        COALESCE(
          (
            SELECT SUM(p.amount)
            FROM payments p
            WHERE p.booking_id = b.id AND p.payment_status = 'Completed'
          ),
          0
        ) AS total_paid,
        -- Service details
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'service_name', sc.name,
                'quantity', sr.quantity,
                'price', sc.price,
                'total', sr.quantity * sc.price,
                'status', sr.status,
                'requested_at', sr.requested_at
              ) ORDER BY sr.requested_at DESC
            )
            FROM service_requests sr
            JOIN service_catalog sc ON sr.service_id = sc.id
            WHERE sr.booking_id = b.id
          ),
          '[]'::json
        ) AS services
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      WHERE b.guest_id = $1
      ORDER BY b.check_in_date DESC`,
      [id]
    );

    // Calculate totals for each booking
    const bills = bookingsResult.rows.map(booking => {
      const roomCharges = parseFloat(booking.room_charges) || 0;
      const serviceCharges = parseFloat(booking.service_charges) || 0;
      const totalPaid = parseFloat(booking.total_paid) || 0;
      const totalAmount = roomCharges + serviceCharges;
      const outstandingBalance = totalAmount - totalPaid;

      return {
        ...booking,
        room_charges: roomCharges,
        service_charges: serviceCharges,
        total_amount: totalAmount,
        total_paid: totalPaid,
        outstanding_balance: outstandingBalance,
        payment_status: outstandingBalance <= 0 ? 'Fully Paid' : outstandingBalance < totalAmount ? 'Partially Paid' : 'Unpaid'
      };
    });

    // Calculate summary
    const summary = {
      total_room_charges: bills.reduce((sum, b) => sum + b.room_charges, 0),
      total_service_charges: bills.reduce((sum, b) => sum + b.service_charges, 0),
      total_amount: bills.reduce((sum, b) => sum + b.total_amount, 0),
      total_paid: bills.reduce((sum, b) => sum + b.total_paid, 0),
      total_outstanding: bills.reduce((sum, b) => sum + b.outstanding_balance, 0),
      total_bookings: bills.length,
      unpaid_bookings: bills.filter(b => b.outstanding_balance > 0).length
    };

    return NextResponse.json({
      success: true,
      guest,
      bills,
      summary
    });

  } catch (error) {
    console.error('[STAFF GUEST BILLS] Error fetching bills:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guest bills', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
