import nodemailer from 'nodemailer';
import path from 'path';

// Read environment variables - Using same variables as emailService for consistency
const SMTP_EMAIL = process.env.SMTP_EMAIL || process.env.SMTP_USER || 'your-email@example.com';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || 'your-email-password';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Nodemailer Transporter Setup with connection pooling and timeouts
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_EMAIL,
    pass: SMTP_PASSWORD,
  },
  pool: true, // Use pooled connections
  maxConnections: 5, // Max simultaneous connections
  maxMessages: 100, // Max messages per connection
  rateDelta: 1000, // Time window for rate limiting (1 second)
  rateLimit: 5, // Max messages per rateDelta
  connectionTimeout: 10000, // 10 seconds connection timeout
  greetingTimeout: 10000, // 10 seconds greeting timeout
  socketTimeout: 10000, // 10 seconds socket timeout
});

// --- TEMPLATES ---

// Template for the OTP (Two-Factor Authentication) email.
function createOtpEmailTemplate(otp: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
      <div style="background-color: #10141c; padding: 20px; text-align: center;">
        <img src="cid:skynestlogo" alt="Sky Nest Logo" style="max-width: 200px;">
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #10141c;">Two-Factor Authentication Code</h2>
        <p>Your verification code is below. This code is valid for 10 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <p style="background-color: #f5f5f5; border-radius: 5px; display: inline-block; padding: 15px 25px; font-size: 32px; letter-spacing: 0.5em; font-weight: bold;">${otp}</p>
        </div>
      </div>
    </div>
  `;
}

// Template for the Password Reset email.
function createPasswordResetEmailTemplate(name: string, resetLink: string): string {
  const firstName = name.split(' ')[0];
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
      <div style="background-color: #10141c; padding: 20px; text-align: center;">
        <img src="cid:skynestlogo" alt="Sky Nest Logo" style="max-width: 200px;">
      </div>
      <div style="padding: 30px;">
        <h2 style="color: #10141c; text-align: center;">Password Reset Request</h2>
        <p style="text-align: center;">Hi ${firstName},</p>
        <p style="text-align: center;">Click the button below to set a new password. This link is valid for 1 hour.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #f59e0b; color: #10141c; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
      </div>
    </div>
  `;
}

// --- SENDING FUNCTIONS ---

// Function to send the OTP email.
export async function sendOtpEmail(email: string, otp: string) {
  try {
    const mailOptions = {
      from: `"Sky Nest Security" <${SMTP_EMAIL}>`,
      to: email,
      subject: 'Your Sky Nest Admin Verification Code',
      html: createOtpEmailTemplate(otp),
      attachments: [{
        filename: 'SNC.png',
        path: path.join(process.cwd(), 'public', 'SNC.png'),
        cid: 'skynestlogo'
      }]
    };
    await transporter.sendMail(mailOptions);
    console.log(`✓ OTP email sent successfully to ${email}`);
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    throw new Error('Failed to send OTP email. Please try again.');
  }
}

// Function to send the Password Reset email.
export async function sendPasswordResetEmail(name: string, email: string, resetLink: string) {
  try {
    const mailOptions = {
      from: `"Sky Nest Security" <${SMTP_EMAIL}>`,
      to: email,
      subject: 'Your Sky Nest Password Reset Link',
      html: createPasswordResetEmailTemplate(name, resetLink),
      attachments: [{
        filename: 'SNC.png',
        path: path.join(process.cwd(), 'public', 'SNC.png'),
        cid: 'skynestlogo'
      }]
    };
    await transporter.sendMail(mailOptions);
    console.log(`✓ Password reset email sent successfully to ${email}`);
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw new Error('Failed to send password reset email. Please try again.');
  }
}

// Generic function to send any email
export async function sendEmail(
  to: string, 
  subject: string, 
  html: string, 
  attachments?: Array<{
    filename: string;
    content: string;
    encoding: string;
    contentType: string;
  }>
) {
  try {
    const mailOptions: any = {
      from: `"Sky Nest Hotel" <${SMTP_EMAIL}>`,
      to: to,
      subject: subject,
      html: html,
    };
    
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }
    
    await transporter.sendMail(mailOptions);
    console.log(`✓ Email sent successfully to ${to}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw new Error('Failed to send email. Please try again.');
  }
}
