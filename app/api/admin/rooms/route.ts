// app/api/admin/rooms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// GET - List all rooms with branch and type info for Admin UI
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    const params: any[] = [];
    let where = '';
    if (branchId) {
      params.push(parseInt(branchId));
      where = `WHERE r.branch_id = $${params.length}`;
    }

    const query = `
      SELECT 
        r.id,
        r.room_number,
        r.status,
        rt.name AS room_type,
        b.id AS branch_id,
        b.name AS branch_name,
        b.location AS branch_location
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      JOIN branches b ON r.branch_id = b.id
      ${where}
      ORDER BY b.name, rt.name, r.room_number
    `;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      rooms: result.rows,
    });
  } catch (error) {
    console.error('[ADMIN ROOMS API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms', details: (error as Error).message },
      { status: 500 }
    );
  }
}
