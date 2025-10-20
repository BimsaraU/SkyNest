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

// GET - Get guest dashboard data
export async function GET(request: NextRequest) {
  try {
    const guest = await verifyGuest(request);
    if (!guest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guestId = guest.userId as number;

    // Get upcoming booking
    const upcomingBookingResult = await pool.query(
      `SELECT 
        b.id,
        b.booking_reference,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.status,
        b.total_amount,
        r.room_number,
        rt.name as room_type,
        br.name as branch_name,
        br.location as branch_location
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      WHERE b.guest_id = $1 
        AND b.check_in_date >= CURRENT_DATE
        AND b.status IN ('Pending', 'Confirmed')
      ORDER BY b.check_in_date ASC
      LIMIT 1`,
      [guestId]
    );

    // Get recent service requests
    const recentServicesResult = await pool.query(
      `SELECT 
        sr.id,
        sr.request_type,
        sr.status,
        sr.created_at,
        sc.name as service_name,
        b.booking_reference
      FROM service_requests sr
      LEFT JOIN service_catalog sc ON sr.service_id = sc.id
      LEFT JOIN bookings b ON sr.booking_id = b.id
      WHERE sr.guest_id = $1
      ORDER BY sr.created_at DESC
      LIMIT 5`,
      [guestId]
    );

    // Get booking statistics
    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'Confirmed' OR status = 'CheckedIn' THEN 1 END) as active_bookings,
        COUNT(CASE WHEN status = 'CheckedOut' THEN 1 END) as completed_bookings,
        COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled_bookings,
        COALESCE(SUM(total_amount), 0) as total_spent
      FROM bookings
      WHERE guest_id = $1`,
      [guestId]
    );

    // Get outstanding amounts
    const outstandingResult = await pool.query(
      `SELECT 
        COUNT(CASE WHEN b.total_amount > COALESCE(paid.amount, 0) THEN 1 END) as pending_count,
        COALESCE(SUM(b.total_amount - COALESCE(paid.amount, 0)), 0) as pending_amount
      FROM bookings b
      LEFT JOIN (
        SELECT booking_id, SUM(amount) as amount
        FROM payments
        WHERE payment_status = 'Completed'
        GROUP BY booking_id
      ) paid ON b.id = paid.booking_id
      WHERE b.guest_id = $1 AND b.status IN ('Pending', 'Confirmed', 'CheckedIn')`,
      [guestId]
    );

    console.log('[GUEST DASHBOARD] Successfully fetched data for guest:', guestId);

    return NextResponse.json({
      upcoming_booking: upcomingBookingResult.rows[0] || null,
      recent_services: recentServicesResult.rows.map(service => ({
        name: service.service_name || service.request_type,
        date: new Date(service.created_at).toLocaleDateString(),
        status: service.status,
        booking_reference: service.booking_reference
      })),
      statistics: {
        total_bookings: parseInt(statsResult.rows[0].total_bookings) || 0,
        active_bookings: parseInt(statsResult.rows[0].active_bookings) || 0,
        completed_bookings: parseInt(statsResult.rows[0].completed_bookings) || 0,
        cancelled_bookings: parseInt(statsResult.rows[0].cancelled_bookings) || 0,
        total_spent: parseFloat(statsResult.rows[0].total_spent) || 0,
        pending_payments: parseInt(outstandingResult.rows[0].pending_count) || 0,
        pending_amount: parseFloat(outstandingResult.rows[0].pending_amount) || 0
      }
    });
  } catch (error) {
    console.error('[GUEST DASHBOARD] Error:', error);
    console.error('[GUEST DASHBOARD] Error stack:', (error as Error).stack);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
