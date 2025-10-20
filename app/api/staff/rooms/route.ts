// app/api/staff/rooms/route.ts
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

// GET - Get all rooms
export async function GET(request: NextRequest) {
  try {
    const staff = await verifyStaff(request);
    if (!staff) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = `
      SELECT 
        r.id,
        r.room_number,
        r.status,
        rt.name as room_type,
        br.name as branch_name,
        br.location as branch_location
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches br ON r.branch_id = br.id
      ORDER BY br.name, rt.name, r.room_number
    `;

    const result = await pool.query(query);

    return NextResponse.json({
      success: true,
      rooms: result.rows
    });
  } catch (error) {
    console.error('[STAFF ROOMS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms', details: (error as Error).message },
      { status: 500 }
    );
  }
}
