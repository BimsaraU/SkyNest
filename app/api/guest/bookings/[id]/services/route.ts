// app/api/guest/bookings/[id]/services/route.ts
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

// GET - Get all services for a booking
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
      `SELECT id, guest_id, booking_reference, status FROM bookings WHERE id = $1`,
      [bookingId]
    );

    if (bookingCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (bookingCheck.rows[0].guest_id !== guestId) {
      return NextResponse.json({ error: 'Unauthorized - Not your booking' }, { status: 403 });
    }

    // Get all services added to this booking
    const servicesResult = await pool.query(
      `SELECT 
        su.id,
        su.quantity,
        su.price_at_time,
        su.service_date,
        su.notes,
        su.created_at,
        sc.name as service_name,
        sc.description as service_description,
        sc.category as service_category,
        sc.current_price,
        (su.quantity * su.price_at_time) as total_cost
       FROM service_usage su
       JOIN service_catalog sc ON su.service_id = sc.id
       WHERE su.booking_id = $1
       ORDER BY su.service_date DESC, su.created_at DESC`,
      [bookingId]
    );

    // Calculate totals
    const totalServicesAmount = servicesResult.rows.reduce(
      (sum, service) => sum + parseFloat(service.total_cost), 
      0
    );

    return NextResponse.json({
      booking_id: bookingId,
      booking_reference: bookingCheck.rows[0].booking_reference,
      services: servicesResult.rows,
      total_services: servicesResult.rows.length,
      total_services_amount: totalServicesAmount
    });

  } catch (error) {
    console.error('[GET BOOKING SERVICES] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking services', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Add a service to a booking
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
    const { service_id, quantity, notes } = body;

    // Validation
    if (!service_id || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid fields: service_id, quantity (must be > 0)' },
        { status: 400 }
      );
    }

    // Verify booking belongs to guest and is active
    const bookingCheck = await pool.query(
      `SELECT 
        b.id, 
        b.guest_id, 
        b.booking_reference, 
        b.status,
        b.check_in_date,
        b.check_out_date
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

    // Can only add services to active bookings
    if (!['Pending', 'Confirmed', 'CheckedIn'].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot add services to ${booking.status} booking` },
        { status: 400 }
      );
    }

    // Get service details and current price
    const serviceResult = await pool.query(
      `SELECT id, name, description, category, current_price, is_available 
       FROM service_catalog 
       WHERE id = $1`,
      [service_id]
    );

    if (serviceResult.rows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const service = serviceResult.rows[0];

    if (!service.is_available) {
      return NextResponse.json(
        { error: 'Service is currently not available' },
        { status: 400 }
      );
    }

    // Add service to booking
    const serviceUsageResult = await pool.query(
      `INSERT INTO service_usage 
        (booking_id, service_id, quantity, price_at_time, service_date, notes)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)
       RETURNING *`,
      [bookingId, service_id, quantity, service.current_price, notes || null]
    );

    const serviceUsage = serviceUsageResult.rows[0];

    // Get updated booking with new totals (triggers will auto-calculate)
    const updatedBookingResult = await pool.query(
      `SELECT 
        base_amount, 
        services_amount, 
        total_amount, 
        paid_amount, 
        outstanding_amount 
       FROM bookings 
       WHERE id = $1`,
      [bookingId]
    );

    const updatedBooking = updatedBookingResult.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Service added to booking successfully',
      service_usage: {
        id: serviceUsage.id,
        service_name: service.name,
        service_category: service.category,
        quantity: serviceUsage.quantity,
        price_per_unit: parseFloat(serviceUsage.price_at_time),
        total_cost: parseFloat(serviceUsage.price_at_time) * serviceUsage.quantity,
        service_date: serviceUsage.service_date
      },
      updated_booking_totals: {
        base_amount: parseFloat(updatedBooking.base_amount),
        services_amount: parseFloat(updatedBooking.services_amount),
        total_amount: parseFloat(updatedBooking.total_amount),
        paid_amount: parseFloat(updatedBooking.paid_amount),
        outstanding_amount: parseFloat(updatedBooking.outstanding_amount)
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[ADD BOOKING SERVICE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add service to booking', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE - Remove a service from a booking
export async function DELETE(
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

    const searchParams = request.nextUrl.searchParams;
    const serviceUsageId = searchParams.get('service_usage_id');

    if (!serviceUsageId) {
      return NextResponse.json(
        { error: 'Missing service_usage_id parameter' },
        { status: 400 }
      );
    }

    // Verify the service usage belongs to this booking and guest
    const checkResult = await pool.query(
      `SELECT su.id, su.booking_id, b.guest_id, b.status
       FROM service_usage su
       JOIN bookings b ON su.booking_id = b.id
       WHERE su.id = $1 AND su.booking_id = $2`,
      [serviceUsageId, bookingId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Service usage not found' }, { status: 404 });
    }

    const serviceUsage = checkResult.rows[0];

    if (serviceUsage.guest_id !== guestId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Can only remove services from active bookings
    if (!['Pending', 'Confirmed', 'CheckedIn'].includes(serviceUsage.status)) {
      return NextResponse.json(
        { error: `Cannot remove services from ${serviceUsage.status} booking` },
        { status: 400 }
      );
    }

    // Delete the service usage
    await pool.query(
      `DELETE FROM service_usage WHERE id = $1`,
      [serviceUsageId]
    );

    // Get updated booking totals
    const updatedBookingResult = await pool.query(
      `SELECT 
        base_amount, 
        services_amount, 
        total_amount, 
        paid_amount, 
        outstanding_amount 
       FROM bookings 
       WHERE id = $1`,
      [bookingId]
    );

    const updatedBooking = updatedBookingResult.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Service removed from booking',
      updated_booking_totals: {
        base_amount: parseFloat(updatedBooking.base_amount),
        services_amount: parseFloat(updatedBooking.services_amount),
        total_amount: parseFloat(updatedBooking.total_amount),
        paid_amount: parseFloat(updatedBooking.paid_amount),
        outstanding_amount: parseFloat(updatedBooking.outstanding_amount)
      }
    });

  } catch (error) {
    console.error('[DELETE BOOKING SERVICE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove service', details: (error as Error).message },
      { status: 500 }
    );
  }
}
