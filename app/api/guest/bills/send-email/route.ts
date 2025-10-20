import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { sendEmail } from '@/lib/email';

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

// POST - Send invoice via email
export async function POST(request: NextRequest) {
  try {
    const guest = await verifyGuest(request);
    if (!guest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const guestId = guest.userId as number;
    const { billId } = await request.json();

    if (!billId) {
      return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
    }

    // Fetch bill details
    const billQuery = `
      SELECT 
        b.id,
        b.booking_reference,
        b.check_in_date,
        b.check_out_date,
        b.total_amount,
        b.payment_status,
        b.payment_method,
        b.paid_at,
        g.first_name || ' ' || g.last_name as guest_name,
        g.email as guest_email,
        g.phone as guest_phone,
        r.room_number,
        rt.name as room_type,
        rt.base_price,
        br.name as branch_name,
        br.location as branch_location,
        br.phone as branch_phone,
        br.email as branch_email
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      WHERE b.id = $1 AND b.guest_id = $2
    `;

    const billResult = await pool.query(billQuery, [billId, guestId]);

    if (billResult.rows.length === 0) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    const bill = billResult.rows[0];
    const nights = Math.ceil(
      (new Date(bill.check_out_date).getTime() - new Date(bill.check_in_date).getTime()) / 
      (1000 * 60 * 60 * 24)
    );

    // Fetch services for this booking
    const servicesQuery = `
      SELECT 
        s.name,
        s.description,
        bs.price,
        bs.status
      FROM booking_services bs
      JOIN services s ON bs.service_id = s.id
      WHERE bs.booking_id = $1
    `;
    const servicesResult = await pool.query(servicesQuery, [billId]);

    // Calculate bill breakdown
    const roomCharges = bill.base_price * nights;
    const serviceCharges = servicesResult.rows.reduce((sum, svc) => sum + parseFloat(svc.price), 0);
    const subtotal = roomCharges + serviceCharges;
    const serviceCharge = subtotal * 0.10; // 10%
    const vat = subtotal * 0.12; // 12%
    const total = subtotal + serviceCharge + vat;

    // Create email HTML content
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
    .invoice-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .table th { background: #f3f4f6; font-weight: 600; }
    .total-row { background: #fef3c7; font-weight: bold; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Sky Nest Hotels</h1>
      <p style="margin: 10px 0 0 0;">Invoice</p>
    </div>
    
    <div class="content">
      <div class="invoice-details">
        <h2 style="margin-top: 0;">Invoice Details</h2>
        <p><strong>Invoice Reference:</strong> ${bill.booking_reference}</p>
        <p><strong>Guest Name:</strong> ${bill.guest_name}</p>
        <p><strong>Email:</strong> ${bill.guest_email}</p>
        <p><strong>Phone:</strong> ${bill.guest_phone}</p>
        <p><strong>Branch:</strong> ${bill.branch_name} - ${bill.branch_location}</p>
        <p><strong>Payment Status:</strong> <span class="status-badge ${bill.payment_status === 'Completed' ? 'status-paid' : 'status-pending'}">${bill.payment_status}</span></p>
      </div>

      <h3>Booking Information</h3>
      <table class="table">
        <tr>
          <td><strong>Room Type:</strong></td>
          <td>${bill.room_type} (Room ${bill.room_number})</td>
        </tr>
        <tr>
          <td><strong>Check-in Date:</strong></td>
          <td>${new Date(bill.check_in_date).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td><strong>Check-out Date:</strong></td>
          <td>${new Date(bill.check_out_date).toLocaleDateString()}</td>
        </tr>
        <tr>
          <td><strong>Number of Nights:</strong></td>
          <td>${nights}</td>
        </tr>
      </table>

      <h3>Billing Breakdown</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Room Charges (${nights} nights @ LKR ${bill.base_price.toLocaleString()})</td>
            <td style="text-align: right;">LKR ${roomCharges.toLocaleString()}</td>
          </tr>
          ${servicesResult.rows.map(svc => `
          <tr>
            <td>${svc.name} - ${svc.description}</td>
            <td style="text-align: right;">LKR ${parseFloat(svc.price).toLocaleString()}</td>
          </tr>
          `).join('')}
          <tr>
            <td><strong>Subtotal</strong></td>
            <td style="text-align: right;"><strong>LKR ${subtotal.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td>Service Charge (10%)</td>
            <td style="text-align: right;">LKR ${serviceCharge.toLocaleString()}</td>
          </tr>
          <tr>
            <td>VAT (12%)</td>
            <td style="text-align: right;">LKR ${vat.toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td><strong>TOTAL AMOUNT</strong></td>
            <td style="text-align: right;"><strong>LKR ${total.toLocaleString()}</strong></td>
          </tr>
        </tbody>
      </table>

      ${bill.paid_at ? `
      <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <p style="margin: 0; color: #065f46;"><strong>✓ Payment Received</strong></p>
        <p style="margin: 5px 0 0 0; color: #065f46;">Paid on: ${new Date(bill.paid_at).toLocaleDateString()} via ${bill.payment_method || 'N/A'}</p>
      </div>
      ` : `
      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-top: 20px;">
        <p style="margin: 0; color: #92400e;"><strong>⚠ Payment Pending</strong></p>
        <p style="margin: 5px 0 0 0; color: #92400e;">Please complete payment at your earliest convenience.</p>
      </div>
      `}

      <div class="footer">
        <p><strong>${bill.branch_name}</strong></p>
        <p>${bill.branch_location}</p>
        <p>Phone: ${bill.branch_phone} | Email: ${bill.branch_email}</p>
        <p style="margin-top: 20px;">Thank you for choosing Sky Nest Hotels!</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // Send email using lib/email
    await sendEmail(
      bill.guest_email,
      `Invoice - ${bill.booking_reference} - Sky Nest Hotels`,
      emailHTML
    );

    return NextResponse.json({
      success: true,
      message: 'Invoice sent successfully',
      email: bill.guest_email
    });

  } catch (error) {
    console.error('[SEND EMAIL API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: (error as Error).message },
      { status: 500 }
    );
  }
}
