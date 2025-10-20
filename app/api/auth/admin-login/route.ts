import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { comparePassword, generateOtp, hashPassword } from '../../../../lib/authUtils';
import { sendOtpEmail } from '../../../../lib/email';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST(request: Request) {
  try {
    const { email, password, twoFactorCode } = await request.json();

    console.log('[ADMIN LOGIN] Request received - Email:', email, 'Has password:', !!password, 'Has OTP:', !!twoFactorCode);

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    // --- Step 2: Verify OTP ---
    if (twoFactorCode) {
        // Trim and clean the OTP code
        const cleanedOtp = String(twoFactorCode).trim().replace(/\s+/g, '');
        
        console.log('[ADMIN LOGIN] Verifying OTP for email:', email, 'Code:', cleanedOtp);
        console.log('[ADMIN LOGIN] Original OTP:', twoFactorCode, 'Cleaned:', cleanedOtp);
        console.log('[ADMIN LOGIN] Provided OTP type:', typeof cleanedOtp, 'Length:', cleanedOtp.length);
        
        const otpRes = await pool.query(
            "SELECT otp_code, expires_at FROM otps WHERE user_email = $1 AND user_type = 'ADMIN' AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
            [email]
        );

        console.log('[ADMIN LOGIN] OTP query result:', otpRes.rowCount, 'rows found');
        
        if (otpRes.rowCount === 0) {
            console.log('[ADMIN LOGIN] No valid OTP found in database');
            
            // Debug: Check if there are ANY OTPs for this user
            const allOtpsRes = await pool.query(
                "SELECT otp_code, expires_at, created_at, expires_at > NOW() as is_valid FROM otps WHERE user_email = $1 AND user_type = 'ADMIN' ORDER BY created_at DESC LIMIT 3",
                [email]
            );
            console.log('[ADMIN LOGIN] All OTPs for user (last 3):', allOtpsRes.rows);
            
            return NextResponse.json({ error: 'Invalid or expired OTP.' }, { status: 400 });
        }
        
        const dbOtp = String(otpRes.rows[0].otp_code).trim();
        console.log('[ADMIN LOGIN] Found OTP in DB:', dbOtp);
        console.log('[ADMIN LOGIN] DB OTP type:', typeof dbOtp, 'Length:', dbOtp.length);
        console.log('[ADMIN LOGIN] Comparing:', `'${dbOtp}'`, 'vs', `'${cleanedOtp}'`);
        
        if (dbOtp !== cleanedOtp) {
            console.log('[ADMIN LOGIN] OTP mismatch - DB:', dbOtp, 'Provided:', cleanedOtp);
            console.log('[ADMIN LOGIN] Character codes - DB:', Array.from(dbOtp).map(c => c.charCodeAt(0)));
            console.log('[ADMIN LOGIN] Character codes - Provided:', Array.from(cleanedOtp).map(c => c.charCodeAt(0)));
            return NextResponse.json({ error: 'Invalid two-factor authentication code.' }, { status: 400 });
        }

        // OTP is correct, delete it so it can't be reused
        await pool.query("DELETE FROM otps WHERE otp_code = $1", [dbOtp]);
        
        console.log('[ADMIN LOGIN] OTP verified and deleted successfully');

        // Fetch complete admin information for JWT
        const adminRes = await pool.query(
            "SELECT id, email, first_name, last_name, phone, is_verified, branch_id FROM admins WHERE email = $1",
            [email]
        );

        if (adminRes.rowCount === 0) {
            return NextResponse.json({ error: 'Admin not found.' }, { status: 404 });
        }

        const admin = adminRes.rows[0];

        // Create JWT token
        console.log('[ADMIN LOGIN] Creating JWT token for admin:', admin.id);
        console.log('[ADMIN LOGIN] JWT_SECRET exists:', !!JWT_SECRET);
        
        const token = await new SignJWT({
            userId: admin.id,
            email: admin.email,
            role: 'ADMIN',
            userType: 'ADMIN',
            name: `${admin.first_name} ${admin.last_name}`,
            branchId: admin.branch_id
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(JWT_SECRET);

        console.log('[ADMIN LOGIN] JWT token created successfully');

        // Set cookie and return user data
        const response = NextResponse.json({
            success: true,
            message: 'Login successful',
            user: {
                id: admin.id,
                email: admin.email,
                name: `${admin.first_name} ${admin.last_name}`,
                phone: admin.phone,
                role: 'ADMIN',
                isVerified: admin.is_verified
            }
        });

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/'
        });

        console.log('[ADMIN LOGIN] Token cookie set for admin:', admin.id);

        return response;
    }

    // --- Step 1: Verify Email and Password ---
    if (password) {
        const adminRes = await pool.query("SELECT id, password_hash FROM admins WHERE email = $1", [email]);

        if (adminRes.rowCount === 0) {
            return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
        }

        const admin = adminRes.rows[0];
        const passwordMatch = await comparePassword(password, admin.password_hash);

        if (!passwordMatch) {
            return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
        }

        // Password is correct, generate and send OTP
        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        console.log('[ADMIN LOGIN] Generated OTP type:', typeof otp, 'Value:', otp);
        console.log('[ADMIN LOGIN] Inserting OTP for admin:', email, 'OTP:', otp);
        
        // Insert OTP into database first
        const insertResult = await pool.query(
          "INSERT INTO otps (user_email, user_type, otp_code, expires_at) VALUES ($1, $2, $3, $4) RETURNING id", 
          [email, 'ADMIN', otp, expiresAt]
        );
        
        console.log('[ADMIN LOGIN] OTP inserted successfully, ID:', insertResult.rows[0].id);
        
        // Send email asynchronously (don't wait for it)
        sendOtpEmail(email, otp).then(() => {
          console.log('[ADMIN LOGIN] OTP email sent successfully');
        }).catch(err => {
          console.error('[ADMIN LOGIN] Failed to send OTP email:', err);
        });

        return NextResponse.json({ success: true, requires2FA: true });
    }
    
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });

  } catch (err) {
    console.error('[ADMIN LOGIN API ERROR]:', err);
    console.error('[ADMIN LOGIN ERROR STACK]:', err instanceof Error ? err.stack : 'No stack trace');
    console.error('[ADMIN LOGIN ERROR MESSAGE]:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ 
      error: 'An internal server error occurred.',
      details: process.env.NODE_ENV === 'development' ? (err instanceof Error ? err.message : String(err)) : undefined
    }, { status: 500 });
  }
}

