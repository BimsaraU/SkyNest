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

// GET - Get guest's bills with detailed breakdown
export async function GET(request: NextRequest) {
  try {
    const guest = await verifyGuest(request);
    if (!guest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guestId = guest.userId as number;

    // Fetch bookings with all billing details
    const bookingsResult = await pool.query(
      `SELECT 
        b.id,
        b.booking_reference,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.status,
        b.total_amount,
        b.created_at,
        r.room_number,
        rt.name as room_type,
        rt.base_price,
        br.name as branch_name,
        br.location as branch_location,
        br.phone as branch_phone,
        br.email as branch_email,
        g.first_name,
        g.last_name,
        g.email as guest_email,
        g.phone as guest_phone,
        p.id as payment_id,
        p.payment_status,
        p.payment_method,
        p.amount as payment_amount,
        p.paid_at
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      JOIN guests g ON b.guest_id = g.id
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.guest_id = $1
      ORDER BY b.created_at DESC`,
      [guestId]
    );

    // For each booking, get service requests
    const bills = await Promise.all(
      bookingsResult.rows.map(async (booking) => {
        // Calculate nights
        const checkIn = new Date(booking.check_in_date);
        const checkOut = new Date(booking.check_out_date);
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

        // Get service requests for this booking
        const servicesResult = await pool.query(
          `SELECT 
            sr.id,
            sr.request_type,
            sr.description,
            sr.status,
            sr.created_at,
            sc.name as service_name,
            sc.price as service_price
          FROM service_requests sr
          LEFT JOIN service_catalog sc ON sr.service_id = sc.id
          WHERE sr.booking_id = $1`,
          [booking.id]
        );

        // Calculate room charges
        const basePrice = parseFloat(booking.base_price) || 0;
        const roomCharges = basePrice * nights;

        // Calculate service charges
        const serviceCharges = servicesResult.rows.reduce((sum, service) => {
          return sum + (parseFloat(service.service_price) || 0);
        }, 0);

        // Calculate taxes
        const subtotal = roomCharges + serviceCharges;
        const serviceCharge = subtotal * 0.10; // 10% service charge
        const vat = subtotal * 0.12; // 12% VAT
        const totalAmount = subtotal + serviceCharge + vat;

        return {
          id: booking.id,
          booking_reference: booking.booking_reference,
          check_in_date: booking.check_in_date,
          check_out_date: booking.check_out_date,
          nights,
          room_number: booking.room_number,
          room_type: booking.room_type,
          branch_name: booking.branch_name,
          branch_location: booking.branch_location,
          branch_phone: booking.branch_phone,
          branch_email: booking.branch_email,
          guest_name: `${booking.first_name} ${booking.last_name}`,
          guest_email: booking.guest_email,
          guest_phone: booking.guest_phone,
          status: booking.status,
          payment_status: booking.payment_status,
          payment_method: booking.payment_method,
          paid_at: booking.paid_at,
          breakdown: {
            room_charges: parseFloat(roomCharges.toFixed(2)),
            base_price: parseFloat(basePrice.toFixed(2)),
            nights,
            services: servicesResult.rows.map(s => ({
              name: s.service_name || s.request_type,
              description: s.description,
              price: parseFloat((parseFloat(s.service_price) || 0).toFixed(2)),
              status: s.status
            })),
            service_charges_total: parseFloat(serviceCharges.toFixed(2)),
            subtotal: parseFloat(subtotal.toFixed(2)),
            service_charge: parseFloat(serviceCharge.toFixed(2)),
            vat: parseFloat(vat.toFixed(2)),
            total: parseFloat(totalAmount.toFixed(2))
          }
        };
      })
    );

    // Calculate overall statistics
    const totalPending = bills
      .filter(b => b.payment_status === 'Pending')
      .reduce((sum, b) => sum + b.breakdown.total, 0);

    const totalPaid = bills
      .filter(b => b.payment_status === 'Completed')
      .reduce((sum, b) => sum + b.breakdown.total, 0);

    return NextResponse.json({
      bills,
      summary: {
        total_bills: bills.length,
        total_pending: parseFloat(totalPending.toFixed(2)),
        total_paid: parseFloat(totalPaid.toFixed(2)),
        pending_count: bills.filter(b => b.payment_status === 'Pending').length,
        paid_count: bills.filter(b => b.payment_status === 'Completed').length
      }
    });
  } catch (error) {
    console.error('[GUEST BILLS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bills', details: (error as Error).message },
      { status: 500 }
    );
  }
}
