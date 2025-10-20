// lib/emailService.ts
import nodemailer from 'nodemailer';

/**
 * Email Service for Sky Nest Hotels
 * Handles all email communications including booking confirmations, receipts, etc.
 */

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@skynest.lk';
const FROM_NAME = process.env.FROM_NAME || 'Sky Nest Hotels';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 */
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Send email with optional PDF attachment
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}) {
  try {
    const transport = getTransporter();
    
    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      attachments: options.attachments || [],
    };
    
    const info = await transport.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Generate booking confirmation email HTML
 */
export function generateBookingConfirmationEmail(data: {
  guestName: string;
  bookingReference: string;
  roomType: string;
  roomNumber?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalAmount: string;
  specialRequests?: string;
  branchName: string;
  branchAddress?: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      padding: 30px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .header p {
      margin: 5px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 30px;
    }
    .booking-ref {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .booking-ref strong {
      color: #d97706;
      font-size: 18px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .details-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .details-table td:first-child {
      font-weight: 600;
      color: #6b7280;
      width: 40%;
    }
    .details-table td:last-child {
      color: #1f2937;
    }
    .highlight {
      background: #f9fafb;
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .total {
      background: #1f2937;
      color: white;
      padding: 15px;
      border-radius: 6px;
      text-align: center;
      margin: 20px 0;
    }
    .total .amount {
      font-size: 28px;
      font-weight: bold;
      color: #fbbf24;
    }
    .cta-button {
      display: inline-block;
      background: #f59e0b;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .footer {
      background: #f9fafb;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #f59e0b;
      text-decoration: none;
    }
    .icon {
      display: inline-block;
      margin-right: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏨 Booking Confirmed!</h1>
      <p>Sky Nest Hotels - Premium Accommodation</p>
    </div>
    
    <div class="content">
      <p>Dear ${data.guestName},</p>
      
      <p>Thank you for choosing Sky Nest Hotels! We're delighted to confirm your reservation.</p>
      
      <div class="booking-ref">
        <strong>Booking Reference: ${data.bookingReference}</strong>
        <p style="margin: 5px 0 0 0; font-size: 13px; color: #6b7280;">Please keep this reference for your records</p>
      </div>
      
      <h3 style="color: #1f2937; margin-top: 30px;">Reservation Details</h3>
      
      <table class="details-table">
        <tr>
          <td><span class="icon">🏨</span>Property</td>
          <td>${data.branchName}</td>
        </tr>
        <tr>
          <td><span class="icon">🛏️</span>Room Type</td>
          <td>${data.roomType}${data.roomNumber ? ` - Room ${data.roomNumber}` : ''}</td>
        </tr>
        <tr>
          <td><span class="icon">📅</span>Check-in</td>
          <td>${new Date(data.checkIn).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        <tr>
          <td><span class="icon">📅</span>Check-out</td>
          <td>${new Date(data.checkOut).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
        <tr>
          <td><span class="icon">🌙</span>Duration</td>
          <td>${data.nights} ${data.nights === 1 ? 'night' : 'nights'}</td>
        </tr>
        <tr>
          <td><span class="icon">👥</span>Guests</td>
          <td>${data.guests} ${data.guests === 1 ? 'guest' : 'guests'}</td>
        </tr>
      </table>
      
      ${data.specialRequests ? `
      <div class="highlight">
        <strong style="color: #1f2937;">Special Requests:</strong>
        <p style="margin: 8px 0 0 0; color: #6b7280;">${data.specialRequests}</p>
      </div>
      ` : ''}
      
      <div class="total">
        <p style="margin: 0; font-size: 14px; opacity: 0.9;">Total Amount</p>
        <div class="amount">${data.totalAmount}</div>
        <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.8;">Payment on arrival • Cash, Card, or Transfer</p>
      </div>
      
      <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <strong style="color: #059669;">✓ Important Information</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #047857;">
          <li>Check-in time: 2:00 PM</li>
          <li>Check-out time: 12:00 PM</li>
          <li>Free cancellation up to 48 hours before arrival</li>
          <li>Valid ID required at check-in</li>
        </ul>
      </div>
      
      <p style="text-align: center;">
        <a href="https://skynest.lk/guest/bookings" class="cta-button">View My Bookings</a>
      </p>
      
      <p>If you have any questions or need to modify your booking, please don't hesitate to contact us.</p>
      
      <p style="margin-top: 30px;">We look forward to welcoming you!</p>
      
      <p style="margin-top: 20px;">
        Best regards,<br>
        <strong>Sky Nest Hotels Team</strong>
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Sky Nest Hotels</strong></p>
      <p>${data.branchAddress || 'Colombo, Sri Lanka'}</p>
      <p>
        <a href="mailto:info@skynest.lk">info@skynest.lk</a> • 
        <a href="tel:+94112345678">+94 11 234 5678</a>
      </p>
      <p style="margin-top: 15px;">
        <a href="https://skynest.lk">Website</a> • 
        <a href="https://skynest.lk/terms">Terms & Conditions</a> • 
        <a href="https://skynest.lk/privacy">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate payment receipt email HTML
 */
export function generatePaymentReceiptEmail(data: {
  guestName: string;
  bookingReference: string;
  paymentReference: string;
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  remainingBalance: string;
}) {
  const isPaid = parseFloat(data.remainingBalance.replace(/[^0-9.-]/g, '')) === 0;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      padding: 30px;
      text-align: center;
      color: white;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .content {
      padding: 30px;
    }
    .payment-box {
      background: #ecfdf5;
      border: 2px solid #10b981;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      text-align: center;
    }
    .payment-box .amount {
      font-size: 32px;
      font-weight: bold;
      color: #059669;
      margin: 10px 0;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .details-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .details-table td:first-child {
      font-weight: 600;
      color: #6b7280;
      width: 45%;
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    .footer {
      background: #f9fafb;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Payment Received</h1>
      <p>Sky Nest Hotels - Payment Receipt</p>
    </div>
    
    <div class="content">
      <p>Dear ${data.guestName},</p>
      
      <p>Thank you for your payment. This email confirms your transaction has been successfully processed.</p>
      
      <div class="payment-box">
        <p style="margin: 0; color: #059669; font-weight: 600;">PAYMENT AMOUNT</p>
        <div class="amount">${data.amount}</div>
        <span class="badge badge-success">✓ PAID</span>
      </div>
      
      <table class="details-table">
        <tr>
          <td>Payment Reference</td>
          <td><strong>${data.paymentReference}</strong></td>
        </tr>
        <tr>
          <td>Booking Reference</td>
          <td><strong>${data.bookingReference}</strong></td>
        </tr>
        <tr>
          <td>Payment Method</td>
          <td>${data.paymentMethod}</td>
        </tr>
        <tr>
          <td>Payment Date</td>
          <td>${new Date(data.paymentDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
        </tr>
        <tr style="background: #f9fafb;">
          <td><strong>Remaining Balance</strong></td>
          <td>
            <strong style="color: ${isPaid ? '#059669' : '#dc2626'};">${data.remainingBalance}</strong>
            ${isPaid ? '<span class="badge badge-success" style="margin-left: 10px;">FULLY PAID</span>' : '<span class="badge badge-warning" style="margin-left: 10px;">PARTIAL PAYMENT</span>'}
          </td>
        </tr>
      </table>
      
      ${!isPaid ? `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <strong style="color: #92400e;">Note:</strong>
        <p style="margin: 8px 0 0 0; color: #78350f;">You have an outstanding balance of ${data.remainingBalance}. This can be paid at check-in or during your stay.</p>
      </div>
      ` : ''}
      
      <p style="margin-top: 30px;">A detailed invoice has been attached to this email for your records.</p>
      
      <p style="background: #f0fdf4; border: 1px solid #86efac; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <strong style="color: #166534;">Need a receipt?</strong><br>
        <span style="color: #15803d;">Please find the attached PDF invoice which serves as your official receipt.</span>
      </p>
      
      <p>If you have any questions about this payment or your booking, please contact us.</p>
      
      <p style="margin-top: 30px;">
        Thank you for choosing Sky Nest Hotels!<br>
        <strong>The Sky Nest Team</strong>
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Sky Nest Hotels</strong></p>
      <p>For support, contact: <a href="mailto:info@skynest.lk" style="color: #10b981;">info@skynest.lk</a></p>
      <p>This is an automated email. Please do not reply directly.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send booking confirmation email with PDF
 */
export async function sendBookingConfirmation(
  guestEmail: string,
  bookingData: Parameters<typeof generateBookingConfirmationEmail>[0],
  pdfBuffer?: Buffer
) {
  const html = generateBookingConfirmationEmail(bookingData);
  
  const attachments = pdfBuffer ? [{
    filename: `booking-${bookingData.bookingReference}.pdf`,
    content: pdfBuffer,
    contentType: 'application/pdf',
  }] : [];
  
  return sendEmail({
    to: guestEmail,
    subject: `Booking Confirmation - ${bookingData.bookingReference} | Sky Nest Hotels`,
    html,
    attachments,
  });
}

/**
 * Send payment receipt email with PDF
 */
export async function sendPaymentReceipt(
  guestEmail: string,
  paymentData: Parameters<typeof generatePaymentReceiptEmail>[0],
  pdfBuffer: Buffer
) {
  const html = generatePaymentReceiptEmail(paymentData);
  
  return sendEmail({
    to: guestEmail,
    subject: `Payment Receipt - ${paymentData.paymentReference} | Sky Nest Hotels`,
    html,
    attachments: [{
      filename: `receipt-${paymentData.paymentReference}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });
}
