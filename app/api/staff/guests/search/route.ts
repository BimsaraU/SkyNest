import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

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

// GET - Search guests by name, email, or phone
export async function GET(request: NextRequest) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        error: 'Search query must be at least 2 characters' 
      }, { status: 400 });
    }

    // Search guests with their booking history
    const result = await pool.query(
      `SELECT DISTINCT
        g.id,
        g.first_name,
        g.last_name,
        g.email,
        g.phone,
        g.address,
        g.loyalty_points,
        g.created_at,
        (
          SELECT COUNT(*) 
          FROM bookings 
          WHERE guest_id = g.id
        ) AS total_bookings,
        (
          SELECT COUNT(*) 
          FROM bookings 
          WHERE guest_id = g.id AND status = 'CheckedIn'
        ) AS active_bookings,
        (
          SELECT json_agg(
            json_build_object(
              'id', b.id,
              'booking_reference', b.booking_reference,
              'check_in_date', b.check_in_date,
              'check_out_date', b.check_out_date,
              'status', b.status,
              'total_amount', b.total_amount,
              'room_number', r.room_number,
              'room_type', rt.name
            ) ORDER BY b.check_in_date DESC
          )
          FROM bookings b
          JOIN rooms r ON b.room_id = r.id
          JOIN room_types rt ON r.room_type_id = rt.id
          WHERE b.guest_id = g.id
          LIMIT 5
        ) AS recent_bookings
      FROM guests g
      WHERE 
        LOWER(g.first_name || ' ' || g.last_name) LIKE LOWER($1)
        OR LOWER(g.email) LIKE LOWER($1)
        OR g.phone LIKE $1
      ORDER BY g.last_name, g.first_name
      LIMIT 20`,
      [`%${query}%`]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('[STAFF GUESTS SEARCH] Error searching guests:', error);
    return NextResponse.json(
      { error: 'Failed to search guests', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
