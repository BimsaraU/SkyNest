// app/api/payments/mock/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/db';
import nodemailer from 'nodemailer';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Generate mock transaction ID
function generateTransactionId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `TXN-${timestamp}-${random}`;
}

// Generate payment reference
function generatePaymentReference(bookingRef: string) {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PAY-${bookingRef}-${random}`;
}

// Mock email sending (using existing SMTP config)
async function sendPaymentReceipt(booking: any, payment: any, sendTo: string) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const checkInDate = new Date(booking.check_in_date).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const checkOutDate = new Date(booking.check_out_date).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .label { font-weight: bold; color: #6b7280; }
          .value { color: #111827; }
          .total { background: #fef3c7; padding: 15px; margin: 20px 0; border-radius: 6px; font-size: 18px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .success { background: #d1fae5; color: #065f46; padding: 15px; border-radius: 6px; margin-bottom: 20px; text-align: center; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏨 Sky Nest Hotels</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Payment Receipt</p>
          </div>
          <div class="content">
            <div class="success">
              ✓ Payment Successful
            </div>
            
            <h2 style="color: #d97706; margin-bottom: 20px;">Booking Confirmation</h2>
            
            <div class="info-row">
              <span class="label">Booking Reference:</span>
              <span class="value">${booking.booking_reference}</span>
            </div>
            <div class="info-row">
              <span class="label">Payment Reference:</span>
              <span class="value">${payment.payment_reference}</span>
            </div>
            <div class="info-row">
              <span class="label">Transaction ID:</span>
              <span class="value">${payment.transaction_id}</span>
            </div>
            <div class="info-row">
              <span class="label">Guest Name:</span>
              <span class="value">${booking.guest_name}</span>
            </div>
            <div class="info-row">
              <span class="label">Room Type:</span>
              <span class="value">${booking.room_type} - Room ${booking.room_number}</span>
            </div>
            <div class="info-row">
              <span class="label">Branch:</span>
              <span class="value">${booking.branch_name}, ${booking.branch_location}</span>
            </div>
            <div class="info-row">
              <span class="label">Check-in:</span>
              <span class="value">${checkInDate}</span>
            </div>
            <div class="info-row">
              <span class="label">Check-out:</span>
              <span class="value">${checkOutDate}</span>
            </div>
            <div class="info-row">
              <span class="label">Guests:</span>
              <span class="value">${booking.number_of_guests}</span>
            </div>
            <div class="info-row">
              <span class="label">Nights:</span>
              <span class="value">${booking.nights}</span>
            </div>
            
            <div class="total">
              <div class="info-row" style="border: none; margin: 0;">
                <span>Total Amount Paid:</span>
                <span>$${parseFloat(payment.amount).toFixed(2)} USD</span>
              </div>
              <div class="info-row" style="border: none; margin: 0; font-size: 14px; font-weight: normal;">
                <span>(Approx. LKR ${(parseFloat(payment.amount) * 300).toFixed(2)})</span>
              </div>
            </div>
            
            <div class="info-row">
              <span class="label">Payment Method:</span>
              <span class="value">${payment.payment_method}</span>
            </div>
            <div class="info-row">
              <span class="label">Payment Date:</span>
              <span class="value">${new Date(payment.paid_at).toLocaleString()}</span>
            </div>
            
            <div style="margin-top: 30px; padding: 20px; background: #fff7ed; border-left: 4px solid #d97706; border-radius: 4px;">
              <h3 style="margin-top: 0; color: #d97706;">Important Information</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Please present this confirmation at check-in</li>
                <li>Check-in time: 2:00 PM | Check-out time: 12:00 PM</li>
                <li>For any queries, contact: ${booking.branch_phone || '+1 (555) 123-4567'}</li>
                <li>Email: ${booking.branch_email || 'info@skynesthotels.com'}</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for choosing Sky Nest Hotels</p>
            <p>This is an automatically generated receipt. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"Sky Nest Hotels" <${process.env.SMTP_EMAIL}>`,
      to: sendTo,
      subject: `Payment Receipt - ${booking.booking_reference}`,
      html: emailHtml,
    });

    console.log(`[PAYMENT EMAIL] Receipt sent to ${sendTo}`);
    return true;
  } catch (error) {
    console.error('[PAYMENT EMAIL] Error:', error);
    return false;
  }
}

// POST - Process mock payment
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value || request.cookies.get('session')?.value;

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
      payment_method, // 'Credit Card', 'Debit Card', 'PayPal', 'Bank Transfer'
      card_holder_name,
      card_number,
      card_expiry,
      card_cvv,
      send_email_to, // 'self' or email address
    } = await request.json();

    // Validation
    if (!booking_id || !payment_method) {
      return NextResponse.json(
        { error: 'Missing required fields: booking_id, payment_method' },
        { status: 400 }
      );
    }

    // Get booking details
    const bookingQuery = await pool.query(`
      SELECT 
        b.id,
        b.booking_reference,
        b.check_in_date,
        b.check_out_date,
        b.number_of_guests,
        b.total_amount,
        b.status,
        r.room_number,
        rt.name as room_type,
        br.name as branch_name,
        br.location as branch_location,
        br.phone as branch_phone,
        br.email as branch_email,
        g.first_name || ' ' || g.last_name as guest_name,
        g.email as guest_email
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      JOIN guests g ON b.guest_id = g.id
      WHERE b.id = $1 AND b.guest_id = $2
    `, [booking_id, guestId]);

    if (bookingQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingQuery.rows[0];

    if (booking.status === 'Cancelled') {
      return NextResponse.json(
        { error: 'Cannot process payment for cancelled booking' },
        { status: 400 }
      );
    }

    // Check if already paid
    const paidCheck = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as paid
       FROM payments
       WHERE booking_id = $1 AND payment_status = 'Completed'`,
      [booking_id]
    );

    const paidAmount = parseFloat(paidCheck.rows[0].paid);
    const totalAmount = parseFloat(booking.total_amount);
    const remainingAmount = totalAmount - paidAmount;

    if (remainingAmount <= 0) {
      return NextResponse.json(
        { error: 'Booking is already fully paid' },
        { status: 400 }
      );
    }

    // Mock payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate mock transaction details
    const transactionId = generateTransactionId();
    const paymentReference = generatePaymentReference(booking.booking_reference);

    // Insert payment record
    await pool.query(`
      INSERT INTO payments (
        payment_reference,
        booking_id,
        amount,
        payment_method,
        payment_status,
        transaction_id,
        paid_at,
        notes,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, CURRENT_TIMESTAMP)
    `, [
      paymentReference,
      booking_id,
      remainingAmount,
      payment_method,
      'Completed',
      transactionId,
      `Mock payment processed. Card: ${card_number ? '****' + card_number.slice(-4) : 'N/A'}`
    ]);

    console.log('[MOCK PAYMENT] Payment processed:', {
      bookingId: booking_id,
      amount: remainingAmount,
      transactionId
    });

    // Calculate nights for email
    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const paymentDetails = {
      payment_reference: paymentReference,
      transaction_id: transactionId,
      amount: remainingAmount,
      payment_method,
      paid_at: new Date().toISOString()
    };

    // Send email
    let emailSent = false;
    const emailAddress = send_email_to === 'self' ? booking.guest_email : send_email_to;
    
    if (emailAddress) {
      emailSent = await sendPaymentReceipt(
        { ...booking, nights },
        paymentDetails,
        emailAddress
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      payment: {
        payment_reference: paymentReference,
        transaction_id: transactionId,
        amount: remainingAmount,
        payment_method,
        paid_at: new Date().toISOString(),
        booking_reference: booking.booking_reference,
        email_sent: emailSent,
        email_address: emailSent ? emailAddress : null
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[MOCK PAYMENT] Error:', error);
    return NextResponse.json(
      { error: 'Payment processing failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
