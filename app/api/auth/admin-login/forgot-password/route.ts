import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db';
import { sendPasswordResetEmail } from '../../../../../lib/email';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    console.log('[ADMIN FORGOT PASSWORD] Request for email:', email);
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();

    // Find the admin user in the admins table (V2 Schema)
    const userRes = await pool.query(
      "SELECT id, first_name, last_name, email FROM admins WHERE email = $1", 
      [normalizedEmail]
    );
    
    console.log('[ADMIN FORGOT PASSWORD] Found admin:', userRes.rowCount);
    
    // Only proceed if an admin user with that email was found.
    if (userRes.rowCount && userRes.rowCount > 0) {
      const user = userRes.rows[0];
      
      // Generate reset token (64 character hex string)
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Token is valid for 1 hour.

      console.log('[ADMIN FORGOT PASSWORD] Generated reset token for:', user.email);

      // Delete old unused tokens for this admin
      await pool.query(
        'DELETE FROM password_reset_tokens WHERE user_email = $1 AND user_type = $2',
        [user.email, 'ADMIN']
      );

      // Insert the token into the database (V2 Schema)
      await pool.query(
        'INSERT INTO password_reset_tokens (user_email, user_type, reset_token, expires_at, used) VALUES ($1, $2, $3, $4, $5)', 
        [user.email, 'ADMIN', resetToken, expiresAt, false]
      );
      
      console.log('[ADMIN FORGOT PASSWORD] Token saved to database');
      
      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/admin-login/reset-password?token=${resetToken}`;
      const fullName = `${user.first_name} ${user.last_name}`;
      
      // Send the email.
      try {
        await sendPasswordResetEmail(fullName, user.email, resetLink);
        console.log('[ADMIN FORGOT PASSWORD] Reset email sent successfully');
      } catch (emailError) {
        console.error('[ADMIN FORGOT PASSWORD] Failed to send email:', emailError);
        // Don't fail the request if email fails - token is still valid
      }
    }

    // IMPORTANT: Always return a generic success message to prevent attackers
    // from guessing which emails are registered in your system.
    return NextResponse.json({ 
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.' 
    });

  } catch (err) {
    console.error('[ADMIN FORGOT PASSWORD API ERROR]:', err);
    return NextResponse.json({ 
      error: 'An internal server error occurred.',
      details: (err as Error).message 
    }, { status: 500 });
  }
}

