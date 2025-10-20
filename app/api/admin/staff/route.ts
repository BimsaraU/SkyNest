// app/api/admin/staff/route.ts
import { NextResponse, NextRequest } from 'next/server';
import pool from '@/lib/db';
import { verifyAdmin } from '@/lib/adminAuth';

// GET - Get all staff members
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = `
      SELECT 
        s.id,
        s.first_name || ' ' || s.last_name as name,
        s.first_name,
        s.last_name,
        s.position as role,
        s.email,
        s.phone as phone_number,
        br.name as branch_name,
        s.department,
        s.employee_id
      FROM staff s
      LEFT JOIN branches br ON s.branch_id = br.id
      WHERE s.is_active = true
      ORDER BY s.position, s.first_name
    `;

    const result = await pool.query(query);

    return NextResponse.json({
      success: true,
      staff: result.rows
    });
  } catch (error) {
    console.error('[ADMIN STAFF API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff', details: (error as Error).message },
      { status: 500 }
    );
  }
}
