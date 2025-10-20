// app/api/staff/payments/send-invoice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { SkyNestPDFGenerator } from '@/lib/pdfGenerator';
import { sendPaymentReceipt } from '@/lib/emailService';

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

/**
 * POST - Send invoice via email
 */
export async function POST(request: NextRequest) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { booking_id, payment_id } = body;

    if (!booking_id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Fetch complete booking and payment details
    const bookingResult = await pool.query(
      `SELECT 
        b.id,
        b.booking_reference,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.total_amount,
        g.first_name || ' ' || g.last_name as guest_name,
        g.email as guest_email,
        g.phone as guest_phone,
        r.room_number,
        rt.name as room_type,
        br.name as branch_name,
        br.address as branch_address
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      WHERE b.id = $1`,
      [booking_id]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = bookingResult.rows[0];

    if (!booking.guest_email) {
      return NextResponse.json({ error: 'Guest email not found' }, { status: 400 });
    }

    // Fetch all payments for this booking
    const paymentsResult = await pool.query(
      `SELECT 
        payment_reference,
        amount,
        payment_method,
        payment_status,
        payment_date,
        notes
      FROM payments
      WHERE booking_id = $1
      ORDER BY payment_date DESC`,
      [booking_id]
    );

    const payments = paymentsResult.rows;
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const balance = parseFloat(booking.total_amount) - totalPaid;

    // Fetch service charges if any
    const servicesResult = await pool.query(
      `SELECT 
        sc.name as service_name,
        sr.quantity,
        sc.price,
        (sr.quantity * sc.price) as total
      FROM service_requests sr
      JOIN service_catalog sc ON sr.service_id = sc.id
      WHERE sr.booking_id = $1`,
      [booking_id]
    );

    const services = servicesResult.rows;
    const serviceCharges = services.reduce((sum, s) => sum + parseFloat(s.total), 0);

    // Calculate nights
    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Prepare invoice items
    const items = [];
    
    // Room charges
    const roomRate = parseFloat(booking.total_amount) / nights;
    items.push({
      description: `${booking.room_type} - Room ${booking.room_number}`,
      quantity: nights,
      rate: roomRate,
      amount: `LKR ${parseFloat(booking.total_amount).toLocaleString()}`
    });

    // Service charges
    services.forEach(service => {
      items.push({
        description: service.service_name,
        quantity: service.quantity,
        rate: parseFloat(service.price),
        amount: `LKR ${parseFloat(service.total).toLocaleString()}`
      });
    });

    const grandTotal = parseFloat(booking.total_amount) + serviceCharges;

    // Generate PDF invoice
    const pdfGenerator = new SkyNestPDFGenerator();
    pdfGenerator.generateBill({
      billNumber: booking.booking_reference,
      guestName: booking.guest_name,
      guestEmail: booking.guest_email,
      guestPhone: booking.guest_phone,
      checkIn: new Date(booking.check_in_date).toLocaleDateString(),
      checkOut: new Date(booking.check_out_date).toLocaleDateString(),
      roomNumber: booking.room_number,
      roomType: booking.room_type,
      items: items,
      subtotal: `LKR ${grandTotal.toLocaleString()}`,
      total: `LKR ${grandTotal.toLocaleString()}`,
      paidAmount: `LKR ${totalPaid.toLocaleString()}`,
      balance: `LKR ${balance.toLocaleString()}`
    });

    const pdfBuffer = Buffer.from(pdfGenerator.getBlob().arrayBuffer() as any);

    // Get latest payment for receipt email
    const latestPayment = payments[0] || {
      payment_reference: booking.booking_reference,
      amount: '0',
      payment_method: 'Pending',
      payment_date: new Date()
    };

    // Send email with PDF
    await sendPaymentReceipt(
      booking.guest_email,
      {
        guestName: booking.guest_name,
        bookingReference: booking.booking_reference,
        paymentReference: latestPayment.payment_reference,
        amount: `LKR ${parseFloat(latestPayment.amount || '0').toLocaleString()}`,
        paymentMethod: latestPayment.payment_method,
        paymentDate: latestPayment.payment_date,
        remainingBalance: `LKR ${balance.toLocaleString()}`
      },
      pdfBuffer
    );

    return NextResponse.json({
      success: true,
      message: 'Invoice sent successfully',
      data: {
        email: booking.guest_email,
        booking_reference: booking.booking_reference
      }
    });

  } catch (error) {
    console.error('[SEND INVOICE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice', details: (error as Error).message },
      { status: 500 }
    );
  }
}
